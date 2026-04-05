/**
 * 1. ALTER discovered_keywords to add volume/cpc/competition columns
 * 2. Fetch 6446 keywords from DataForSEO (keywords_for_keywords)
 * 3. Score each keyword 0-100
 * 4. Match against existing garage pages → mark covered vs opportunity
 * 5. Store in Supabase
 * 6. Show top 30 opportunities
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabase } from './src/db/supabase.js';
import * as logger from './src/utils/logger.js';

const API_BASE = 'https://api.dataforseo.com/v3';
const projectRef = process.env.SUPABASE_URL!.replace('https://', '').split('.')[0];
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');
}

// ─── Step 1: Migrate table ─────────────────────────────────

async function migrateTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS discovered_keywords (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_key TEXT NOT NULL,
      keyword TEXT NOT NULL,
      score INT NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'google_suggest',
      suggested_page TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(site_key, keyword)
    );

    -- Add new columns if they don't exist
    DO $$ BEGIN
      ALTER TABLE discovered_keywords ADD COLUMN IF NOT EXISTS volume INT DEFAULT 0;
      ALTER TABLE discovered_keywords ADD COLUMN IF NOT EXISTS cpc REAL;
      ALTER TABLE discovered_keywords ADD COLUMN IF NOT EXISTS competition TEXT;
    EXCEPTION WHEN others THEN NULL;
    END $$;

    -- Drop old constraint if exists and recreate with expanded statuses
    ALTER TABLE discovered_keywords DROP CONSTRAINT IF EXISTS discovered_keywords_status_check;
    ALTER TABLE discovered_keywords ADD CONSTRAINT discovered_keywords_status_check
      CHECK (status IN ('new', 'opportunity', 'covered', 'approved', 'rejected'));

    CREATE INDEX IF NOT EXISTS idx_discovered_kw_site_status ON discovered_keywords(site_key, status);
    CREATE INDEX IF NOT EXISTS idx_discovered_kw_score ON discovered_keywords(score DESC);
  `;

  logger.info('Migrating discovered_keywords table...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    logger.success('Table migrated');
  } else {
    const body = await res.text();
    throw new Error(`Migration failed ${res.status}: ${body.slice(0, 300)}`);
  }

  await new Promise(r => setTimeout(r, 2000));
}

// ─── Step 2: Fetch keywords from DataForSEO ────────────────

async function fetchKeywords(): Promise<any[]> {
  logger.info('Fetching keywords from DataForSEO...');

  const response = await fetch(`${API_BASE}/keywords_data/google_ads/keywords_for_keywords/live`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: [
        "vidange voiture", "entretien auto", "garage mécanique",
        "réparation freins", "diagnostic auto", "climatisation voiture"
      ],
      location_code: 2250,
      language_code: "fr",
      sort_by: "search_volume",
      search_partners: false,
    }]),
  });

  const data = await response.json() as any;
  const items = data.tasks?.[0]?.result || [];
  const cost = data.cost || 0;
  logger.success(`Fetched ${items.length} keywords (cost: $${cost.toFixed(4)})`);
  return items;
}

// ─── Step 3: Score keywords ─────────────────────────────────

function scoreKeyword(kw: string, volume: number, cpc: number | null, competition: string | null): number {
  let score = 0;

  // Volume (0-40 points)
  if (volume >= 33000) score += 40;
  else if (volume >= 10000) score += 35;
  else if (volume >= 5000) score += 30;
  else if (volume >= 1000) score += 20;
  else if (volume >= 100) score += 10;
  else if (volume > 0) score += 5;

  // CPC = valeur commerciale (0-25 points)
  if (cpc !== null) {
    if (cpc >= 2) score += 25;
    else if (cpc >= 1) score += 15;
    else if (cpc >= 0.5) score += 10;
    else score += 3;
  }

  // Concurrence inversée (0-20 points)
  if (competition === 'LOW') score += 20;
  else if (competition === 'MEDIUM') score += 12;
  else if (competition === 'HIGH') score += 5;

  // Bonus intention transactionnelle (0-15 points)
  const lower = kw.toLowerCase();
  if (/prix|tarif|devis|pas cher|combien|co[uû]t/.test(lower)) score += 15;
  else if (/urgent|nuit|dimanche|24h|d[eé]pannage/.test(lower)) score += 15;
  else if (/avis|meilleur|recommand|top|comparati/.test(lower)) score += 10;

  return Math.min(score, 100);
}

// ─── Step 4: Match against existing garage pages ────────────

function buildCoverageMap(): { slugs: string[]; keywords: Map<string, string> } {
  // All existing garage service slugs and their target keywords
  const services: Array<{ slug: string; keywords: string[] }> = [
    { slug: 'vidange-perpignan', keywords: ['vidange', 'huile moteur', 'vidange voiture', 'vidange auto'] },
    { slug: 'entretien-voiture-perpignan', keywords: ['entretien voiture', 'révision automobile', 'entretien auto', 'revision voiture', 'révision voiture'] },
    { slug: 'controle-technique-perpignan', keywords: ['contrôle technique', 'pré-contrôle', 'controle technique', 'ct'] },
    { slug: 'freins-plaquettes-perpignan', keywords: ['freins', 'plaquettes de frein', 'disque de frein', 'frein voiture', 'plaquette frein'] },
    { slug: 'courroie-distribution-perpignan', keywords: ['courroie distribution', 'kit distribution', 'courroie'] },
    { slug: 'embrayage-perpignan', keywords: ['embrayage', 'kit embrayage', 'volant moteur'] },
    { slug: 'reparation-automobile-perpignan', keywords: ['réparation auto', 'reparation auto', 'panne voiture', 'mécanique', 'mecanique', 'réparation voiture'] },
    { slug: 'amortisseurs-perpignan', keywords: ['amortisseurs', 'amortisseur', 'suspension', 'ressorts'] },
    { slug: 'echappement-perpignan', keywords: ['échappement', 'echappement', 'pot échappement', 'ligne échappement'] },
    { slug: 'diagnostic-auto-perpignan', keywords: ['diagnostic auto', 'diagnostic électronique', 'voyant moteur', 'diag auto', 'diagnostic voiture'] },
    { slug: 'climatisation-auto-perpignan', keywords: ['climatisation auto', 'recharge clim', 'clim voiture', 'climatisation voiture', 'recharge clim voiture'] },
    { slug: 'pneus-perpignan', keywords: ['pneus', 'pneu', 'géométrie', 'parallélisme', 'montage pneu'] },
    { slug: 'fap-perpignan', keywords: ['filtre à particules', 'fap', 'nettoyage fap', 'filtre particules'] },
    { slug: 'vanne-egr-perpignan', keywords: ['vanne egr', 'nettoyage egr', 'egr'] },
    { slug: 'decalaminage-perpignan', keywords: ['décalaminage', 'decalaminage', 'décalaminage moteur'] },
    { slug: 'turbo-perpignan', keywords: ['turbo', 'turbocompresseur', 'réparation turbo'] },
    { slug: 'injecteurs-perpignan', keywords: ['injecteurs', 'injecteur', 'nettoyage injecteurs'] },
    { slug: 'boite-vitesse-perpignan', keywords: ['boîte de vitesse', 'boite vitesse', 'boîte auto', 'boîte manuelle', 'boite de vitesse'] },
  ];

  // City pages
  const cities = [
    'garage-cabestany', 'garage-rivesaltes', 'garage-saint-esteve', 'garage-thuir',
    'garage-pia', 'garage-toulouges', 'garage-pollestres', 'garage-elne', 'garage-le-soler',
    'cabestany', 'saint-cyprien', 'saint-esteve', 'canet-en-roussillon', 'perpignan',
  ];

  const kwToSlug = new Map<string, string>();
  for (const svc of services) {
    for (const kw of svc.keywords) {
      kwToSlug.set(kw.toLowerCase(), svc.slug);
    }
  }

  return { slugs: [...services.map(s => s.slug), ...cities], keywords: kwToSlug };
}

function matchKeywordToPage(keyword: string, coverageMap: Map<string, string>): string | null {
  const lower = keyword.toLowerCase();

  // Exact match
  if (coverageMap.has(lower)) return coverageMap.get(lower)!;

  // Fuzzy: check if any coverage keyword is contained in this keyword
  for (const [covKw, slug] of coverageMap) {
    if (lower.includes(covKw) || covKw.includes(lower)) return slug;
  }

  return null;
}

function suggestPage(keyword: string): string {
  const lower = keyword.toLowerCase();

  // Try to map to a slug
  if (/vidange/.test(lower)) return 'vidange-[ville]';
  if (/r[eé]vision|entretien/.test(lower)) return 'entretien-[ville]';
  if (/frein|plaquette|disque/.test(lower)) return 'freins-[ville]';
  if (/embrayage/.test(lower)) return 'embrayage-[ville]';
  if (/amortisseur|suspension/.test(lower)) return 'amortisseurs-[ville]';
  if (/diagnostic|diag|voyant/.test(lower)) return 'diagnostic-[ville]';
  if (/clim/.test(lower)) return 'climatisation-[ville]';
  if (/pneu|g[eé]om[eé]trie|parall/.test(lower)) return 'pneus-[ville]';
  if (/fap|particule/.test(lower)) return 'fap-[ville]';
  if (/egr/.test(lower)) return 'vanne-egr-[ville]';
  if (/d[eé]calaminage/.test(lower)) return 'decalaminage-[ville]';
  if (/turbo/.test(lower)) return 'turbo-[ville]';
  if (/injecteur/.test(lower)) return 'injecteurs-[ville]';
  if (/bo[iî]te.*vitesse|bvm|bva/.test(lower)) return 'boite-vitesse-[ville]';
  if (/courroie/.test(lower)) return 'courroie-[ville]';
  if (/[eé]chappement/.test(lower)) return 'echappement-[ville]';
  if (/garage|m[eé]cani|atelier/.test(lower)) return 'garage-[ville]';
  if (/carrosserie|bosselage|rayure/.test(lower)) return 'NEW: carrosserie-[ville]';
  if (/d[eé]marreur|batterie|alternateur/.test(lower)) return 'NEW: electricite-auto-[ville]';
  if (/lavage|nettoyage.*voiture|lustrage/.test(lower)) return 'NEW: nettoyage-auto-[ville]';
  if (/d[eé]pannage|remorquage/.test(lower)) return 'NEW: depannage-auto-[ville]';
  if (/contr[oô]le technique/.test(lower)) return 'controle-technique-[ville]';
  if (/prix|tarif|co[uû]t/.test(lower)) return 'NEW: page-prix-thematique';

  return 'NEW: ' + lower.replace(/\s+/g, '-').slice(0, 40);
}

// ─── Step 5: Store in Supabase ──────────────────────────────

async function storeKeywords(rows: Array<{
  keyword: string; volume: number; cpc: number | null;
  competition: string | null; score: number; status: string;
  suggested_page: string | null;
}>) {
  const db = getSupabase();

  // Batch upsert in chunks of 500
  const CHUNK = 500;
  let stored = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(r => ({
      site_key: 'garage',
      keyword: r.keyword,
      volume: r.volume,
      cpc: r.cpc,
      competition: r.competition,
      score: r.score,
      source: 'dataforseo',
      suggested_page: r.suggested_page,
      status: r.status,
    }));

    const { error } = await db
      .from('discovered_keywords')
      .upsert(chunk, { onConflict: 'site_key,keyword' });

    if (error) {
      logger.error(`Upsert chunk ${i / CHUNK + 1} failed: ${error.message}`);
    } else {
      stored += chunk.length;
    }
  }

  return stored;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  // 1. Migrate
  await migrateTable();

  // 2. Fetch
  const items = await fetchKeywords();

  // 3. Build coverage map
  const { keywords: coverageMap } = buildCoverageMap();

  // 4. Score + match
  const rows: Array<{
    keyword: string; volume: number; cpc: number | null;
    competition: string | null; score: number; status: string;
    suggested_page: string | null;
  }> = [];

  const opportunities: typeof rows = [];

  for (const item of items) {
    const kw = item.keyword || '';
    if (!kw) continue;

    const volume = item.search_volume || 0;
    const cpc = item.cpc || null;
    const competition = item.competition || null;
    const score = scoreKeyword(kw, volume, cpc, competition);

    const matchedPage = matchKeywordToPage(kw, coverageMap);
    const status = matchedPage ? 'covered' : 'opportunity';
    const suggested = matchedPage || suggestPage(kw);

    const row = { keyword: kw, volume, cpc, competition, score, status, suggested_page: suggested };
    rows.push(row);

    if (!matchedPage && volume > 0) {
      opportunities.push(row);
    }
  }

  logger.info(`Scored ${rows.length} keywords: ${rows.filter(r => r.status === 'covered').length} covered, ${opportunities.length} opportunities`);

  // 5. Store
  const stored = await storeKeywords(rows);
  logger.success(`Stored ${stored} keywords in Supabase`);

  // 6. Top 30 opportunities
  opportunities.sort((a, b) => b.score - a.score || b.volume - a.volume);

  console.log('\n' + '═'.repeat(110));
  console.log('TOP 30 OPPORTUNITÉS MANQUANTES — garage-perpignan.fr');
  console.log('═'.repeat(110));
  console.log(`${'#'.padStart(3)} | ${'Mot-clé'.padEnd(45)} | ${'Volume'.padStart(8)} | ${'CPC'.padStart(7)} | ${'Score'.padStart(5)} | Page suggérée`);
  console.log('-'.repeat(110));

  for (let i = 0; i < Math.min(30, opportunities.length); i++) {
    const r = opportunities[i];
    const cpc = r.cpc ? `${r.cpc.toFixed(2)}€` : 'n/a';
    console.log(
      `${String(i + 1).padStart(3)} | ${r.keyword.padEnd(45)} | ${String(r.volume).padStart(8)} | ${cpc.padStart(7)} | ${String(r.score).padStart(5)} | ${r.suggested_page}`
    );
  }

  console.log('═'.repeat(110));
  console.log(`\nTotal keywords: ${rows.length} | Covered: ${rows.filter(r => r.status === 'covered').length} | Opportunities: ${opportunities.length}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
