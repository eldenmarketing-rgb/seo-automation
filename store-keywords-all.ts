/**
 * Multi-site DataForSEO keyword research
 * Fetches keywords_for_keywords for 7 sites, scores, matches, stores in discovered_keywords
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabase } from './src/db/supabase.js';
import * as logger from './src/utils/logger.js';

const API_BASE = 'https://api.dataforseo.com/v3';

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');
}

// ─── Site Definitions ────────────────────────────────────────

interface SiteResearch {
  siteKey: string;
  label: string;
  seeds: string[];
  coverageKeywords: Map<string, string>; // keyword → existing slug
  suggestPage: (kw: string) => string;
}

const SITES: SiteResearch[] = [
  // 1. Carrosserie
  {
    siteKey: 'carrosserie',
    label: 'CarrosserPro.fr',
    seeds: ["carrosserie auto", "peinture voiture", "débosselage", "réparation pare-brise", "carrossier"],
    coverageKeywords: buildCoverageMap({
      'carrosserie-perpignan': ['carrosserie', 'carrossier', 'carrosserie auto'],
      'peinture-voiture-perpignan': ['peinture voiture', 'peinture auto', 'peinture carrosserie'],
      'debosselage-perpignan': ['débosselage', 'debosselage', 'débosselage sans peinture', 'dsp'],
      'reparation-pare-brise-perpignan': ['réparation pare-brise', 'pare-brise', 'pare brise', 'remplacement pare-brise'],
      'rayure-carrosserie-perpignan': ['rayure', 'rayure carrosserie', 'polish'],
      'redressage-chassis-perpignan': ['redressage', 'châssis', 'marbre'],
    }),
    suggestPage: (kw: string) => {
      const l = kw.toLowerCase();
      if (/carrosseri|carrossier/.test(l)) return 'carrosserie-[ville]';
      if (/peinture|vernis|laqu/.test(l)) return 'peinture-[ville]';
      if (/d[eé]boss|pdr|sans peinture/.test(l)) return 'debosselage-[ville]';
      if (/pare.?brise|vitr|lunette/.test(l)) return 'pare-brise-[ville]';
      if (/rayure|polish|lustrage/.test(l)) return 'rayure-[ville]';
      if (/redress|ch[aâ]ssis|marbre/.test(l)) return 'redressage-[ville]';
      if (/assurance|sinistre|expertise/.test(l)) return 'NEW: assurance-sinistre';
      if (/grêle/.test(l)) return 'NEW: reparation-grele';
      if (/covering|wrapping|film/.test(l)) return 'NEW: covering-auto';
      if (/r[eé]tro|phare|optique/.test(l)) return 'NEW: renovation-optiques';
      if (/prix|tarif|co[uû]t|devis/.test(l)) return 'NEW: tarifs-carrosserie';
      if (/avis|meilleur|recommand/.test(l)) return 'NEW: avis-carrossier';
      return 'NEW: ' + l.replace(/\s+/g, '-').slice(0, 40);
    },
  },

  // 2. VTC
  {
    siteKey: 'vtc',
    label: 'ideal-transport.fr',
    seeds: ["taxi", "vtc aéroport", "chauffeur privé", "transfert gare", "taxi perpignan", "navette aéroport"],
    coverageKeywords: buildCoverageMap({
      'vtc-perpignan': ['vtc perpignan', 'vtc', 'chauffeur privé perpignan'],
      'taxi-perpignan': ['taxi perpignan', 'taxi', 'course taxi'],
      'transfert-aeroport-perpignan': ['transfert aéroport', 'navette aéroport', 'aéroport perpignan'],
      'transfert-gare-perpignan': ['transfert gare', 'gare perpignan', 'navette gare'],
    }),
    suggestPage: (kw: string) => {
      const l = kw.toLowerCase();
      if (/vtc|chauffeur priv/.test(l)) return 'vtc-[ville]';
      if (/taxi/.test(l)) return 'taxi-[ville]';
      if (/a[eé]roport|transfert.*a[eé]ro/.test(l)) return 'transfert-aeroport-[ville]';
      if (/gare|transfert.*gare|sncf/.test(l)) return 'transfert-gare-[ville]';
      if (/navette/.test(l)) return 'navette-[ville]';
      if (/mariage|[eé]v[eé]nement|soir[eé]e/.test(l)) return 'NEW: vtc-evenement';
      if (/longue distance|interurbain/.test(l)) return 'NEW: vtc-longue-distance';
      if (/prix|tarif|co[uû]t/.test(l)) return 'NEW: tarifs-vtc';
      if (/m[eé]dical|h[oô]pital|clinique/.test(l)) return 'NEW: transport-medical';
      if (/nuit|24h|urgent/.test(l)) return 'NEW: vtc-nuit';
      return 'NEW: ' + l.replace(/\s+/g, '-').slice(0, 40);
    },
  },

  // 3. Massage
  {
    siteKey: 'massage',
    label: 'Site Massage',
    seeds: ["massage à domicile", "massage relaxant", "massage sportif", "bien-être", "masseur"],
    coverageKeywords: buildCoverageMap({
      'massage-domicile-perpignan': ['massage à domicile', 'massage domicile', 'masseur à domicile'],
      'massage-relaxant-perpignan': ['massage relaxant', 'massage détente', 'massage bien-être'],
      'massage-sportif-perpignan': ['massage sportif', 'massage sport', 'récupération musculaire'],
    }),
    suggestPage: (kw: string) => {
      const l = kw.toLowerCase();
      if (/domicile/.test(l)) return 'massage-domicile-[ville]';
      if (/relaxant|d[eé]tente|bien.[eê]tre/.test(l)) return 'massage-relaxant-[ville]';
      if (/sportif|sport|muscul|r[eé]cup/.test(l)) return 'massage-sportif-[ville]';
      if (/californien/.test(l)) return 'NEW: massage-californien';
      if (/su[eé]dois/.test(l)) return 'NEW: massage-suedois';
      if (/tha[iï]|thai/.test(l)) return 'NEW: massage-thai';
      if (/shiatsu/.test(l)) return 'NEW: massage-shiatsu';
      if (/pierres chaudes/.test(l)) return 'NEW: massage-pierres-chaudes';
      if (/femme enceinte|pr[eé]natal/.test(l)) return 'NEW: massage-prenatal';
      if (/couple/.test(l)) return 'NEW: massage-couple';
      if (/prix|tarif|co[uû]t/.test(l)) return 'NEW: tarifs-massage';
      if (/masseur|masseuse|kin[eé]/.test(l)) return 'masseur-[ville]';
      return 'NEW: ' + l.replace(/\s+/g, '-').slice(0, 40);
    },
  },

  // 4. Livraison alcool → restaurant site_key
  {
    siteKey: 'restaurant',
    label: 'Site Livraison Alcool',
    seeds: ["livraison alcool", "livraison alcool nuit", "livraison bière", "livraison vin", "alcool à domicile", "livraison whisky"],
    coverageKeywords: buildCoverageMap({}),
    suggestPage: (kw: string) => {
      const l = kw.toLowerCase();
      if (/bi[eè]re/.test(l)) return 'NEW: livraison-biere-[ville]';
      if (/vin/.test(l)) return 'NEW: livraison-vin-[ville]';
      if (/whisky|whiskey/.test(l)) return 'NEW: livraison-whisky-[ville]';
      if (/vodka/.test(l)) return 'NEW: livraison-vodka-[ville]';
      if (/champagne|mousseux/.test(l)) return 'NEW: livraison-champagne-[ville]';
      if (/rhum/.test(l)) return 'NEW: livraison-rhum-[ville]';
      if (/nuit|tard|soir|24h|apr[eè]s/.test(l)) return 'NEW: livraison-alcool-nuit-[ville]';
      if (/domicile/.test(l)) return 'livraison-alcool-domicile-[ville]';
      if (/prix|tarif|pas cher/.test(l)) return 'NEW: tarifs-livraison-alcool';
      if (/livraison alcool/.test(l)) return 'livraison-alcool-[ville]';
      return 'NEW: ' + l.replace(/\s+/g, '-').slice(0, 40);
    },
  },

  // 5. Retraite bien-être
  {
    siteKey: 'retraite',
    label: 'Site Retraite Bien-être',
    seeds: ["retraite bien-être", "retraite yoga", "séjour bien-être", "retraite méditation", "stage yoga", "cure bien-être"],
    coverageKeywords: buildCoverageMap({}),
    suggestPage: (kw: string) => {
      const l = kw.toLowerCase();
      if (/yoga/.test(l) && /retraite|stage/.test(l)) return 'NEW: retraite-yoga';
      if (/yoga/.test(l)) return 'NEW: stage-yoga';
      if (/m[eé]ditation/.test(l)) return 'NEW: retraite-meditation';
      if (/jeu[nû]e|d[eé]tox|je[uû]ne/.test(l)) return 'NEW: retraite-jeune-detox';
      if (/silence/.test(l)) return 'NEW: retraite-silence';
      if (/cure/.test(l)) return 'NEW: cure-bien-etre';
      if (/s[eé]jour/.test(l)) return 'NEW: sejour-bien-etre';
      if (/week.?end/.test(l)) return 'NEW: weekend-bien-etre';
      if (/pyr[eé]n[eé]es|montagne/.test(l)) return 'NEW: retraite-pyrenees';
      if (/prix|tarif|co[uû]t/.test(l)) return 'NEW: tarifs-retraite';
      if (/retraite.*bien/.test(l)) return 'NEW: retraite-bien-etre';
      if (/retraite/.test(l)) return 'NEW: retraite-bien-etre';
      return 'NEW: ' + l.replace(/\s+/g, '-').slice(0, 40);
    },
  },

  // 6. Formation reprog
  {
    siteKey: 'reprog',
    label: 'Site Formation Reprog',
    seeds: ["reprogrammation moteur", "formation reprogrammation", "stage reprog", "gain puissance moteur", "reprogrammation stage 1", "cartographie moteur"],
    coverageKeywords: buildCoverageMap({}),
    suggestPage: (kw: string) => {
      const l = kw.toLowerCase();
      if (/formation|stage/.test(l) && /reprog/.test(l)) return 'NEW: formation-reprogrammation';
      if (/stage\s*1/.test(l)) return 'NEW: reprogrammation-stage-1';
      if (/stage\s*2/.test(l)) return 'NEW: reprogrammation-stage-2';
      if (/e85|[eé]thanol|flex.?fuel/.test(l)) return 'NEW: reprogrammation-e85';
      if (/cartograph/.test(l)) return 'NEW: cartographie-moteur';
      if (/gain.*puissance|puissance/.test(l)) return 'NEW: gain-puissance-moteur';
      if (/diesel/.test(l)) return 'NEW: reprogrammation-diesel';
      if (/essence/.test(l)) return 'NEW: reprogrammation-essence';
      if (/turbo/.test(l)) return 'NEW: reprogrammation-turbo';
      if (/fap|egr|adblue/.test(l)) return 'NEW: suppression-fap-egr';
      if (/prix|tarif|co[uû]t/.test(l)) return 'NEW: tarifs-reprogrammation';
      if (/reprog|reprogramm/.test(l)) return 'NEW: reprogrammation-moteur';
      if (/banc.*puissance|dyno/.test(l)) return 'NEW: passage-banc-puissance';
      return 'NEW: ' + l.replace(/\s+/g, '-').slice(0, 40);
    },
  },

  // 7. Ideo Car (voitures occasion)
  {
    siteKey: 'voitures',
    label: 'Ideo Car',
    seeds: ["voiture occasion", "achat voiture occasion", "véhicule occasion", "reprise voiture", "voiture pas cher", "occasion garantie"],
    coverageKeywords: buildCoverageMap({
      'voitures-occasion-perpignan': ['voiture occasion perpignan', 'voiture occasion', 'véhicule occasion'],
    }),
    suggestPage: (kw: string) => {
      const l = kw.toLowerCase();
      if (/reprise/.test(l)) return 'NEW: reprise-voiture';
      if (/garantie/.test(l)) return 'NEW: occasion-garantie';
      if (/financement|cr[eé]dit|leasing|loa/.test(l)) return 'NEW: financement-voiture';
      if (/pas cher|petit prix|budget/.test(l)) return 'NEW: voiture-pas-cher';
      if (/citadine/.test(l)) return 'NEW: citadine-occasion';
      if (/suv|4x4/.test(l)) return 'NEW: suv-occasion';
      if (/berline/.test(l)) return 'NEW: berline-occasion';
      if (/utilitaire|camionnette/.test(l)) return 'NEW: utilitaire-occasion';
      if (/diesel/.test(l)) return 'NEW: voiture-diesel-occasion';
      if (/[eé]lectrique|hybride/.test(l)) return 'NEW: voiture-electrique-occasion';
      if (/renault|peugeot|citroen|dacia/.test(l)) return `NEW: ${l.match(/renault|peugeot|citroen|dacia/)?.[0]}-occasion`;
      if (/volkswagen|vw|audi|bmw|mercedes/.test(l)) return `NEW: ${(l.match(/volkswagen|vw|audi|bmw|mercedes/)?.[0] || '').replace('vw','volkswagen')}-occasion`;
      if (/prix|tarif/.test(l)) return 'NEW: prix-voiture-occasion';
      if (/occasion/.test(l)) return 'voiture-occasion-[ville]';
      return 'NEW: ' + l.replace(/\s+/g, '-').slice(0, 40);
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────

function buildCoverageMap(slugKeywords: Record<string, string[]>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [slug, keywords] of Object.entries(slugKeywords)) {
    for (const kw of keywords) {
      map.set(kw.toLowerCase(), slug);
    }
  }
  return map;
}

function scoreKeyword(kw: string, volume: number, cpc: number | null, competition: string | null): number {
  let score = 0;

  // Volume (0-40 points)
  if (volume >= 33000) score += 40;
  else if (volume >= 10000) score += 35;
  else if (volume >= 5000) score += 30;
  else if (volume >= 1000) score += 20;
  else if (volume >= 100) score += 10;
  else if (volume > 0) score += 5;

  // CPC = commercial value (0-25 points)
  if (cpc !== null) {
    if (cpc >= 2) score += 25;
    else if (cpc >= 1) score += 15;
    else if (cpc >= 0.5) score += 10;
    else score += 3;
  }

  // Inverse competition (0-20 points)
  if (competition === 'LOW') score += 20;
  else if (competition === 'MEDIUM') score += 12;
  else if (competition === 'HIGH') score += 5;

  // Transactional intent bonus (0-15 points)
  const lower = kw.toLowerCase();
  if (/prix|tarif|devis|pas cher|combien|co[uû]t/.test(lower)) score += 15;
  else if (/urgent|nuit|dimanche|24h|d[eé]pannage/.test(lower)) score += 15;
  else if (/avis|meilleur|recommand|top|comparati/.test(lower)) score += 10;

  return Math.min(score, 100);
}

function matchKeywordToPage(keyword: string, coverageMap: Map<string, string>): string | null {
  const lower = keyword.toLowerCase();
  if (coverageMap.has(lower)) return coverageMap.get(lower)!;
  for (const [covKw, slug] of Array.from(coverageMap.entries())) {
    if (lower.includes(covKw) || covKw.includes(lower)) return slug;
  }
  return null;
}

// ─── DataForSEO fetch ────────────────────────────────────────

async function fetchKeywordsForSite(seeds: string[]): Promise<any[]> {
  const response = await fetch(`${API_BASE}/keywords_data/google_ads/keywords_for_keywords/live`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: seeds,
      location_code: 2250,
      language_code: "fr",
      sort_by: "search_volume",
      search_partners: false,
    }]),
  });

  const data = await response.json() as any;

  if (data.status_code !== 20000) {
    throw new Error(`API error: ${data.status_message || JSON.stringify(data).slice(0, 200)}`);
  }

  const items = data.tasks?.[0]?.result || [];
  const cost = data.cost || 0;
  return items;
}

// ─── Store in Supabase ───────────────────────────────────────

async function storeKeywords(siteKey: string, rows: Array<{
  keyword: string; volume: number; cpc: number | null;
  competition: string | null; score: number; status: string;
  suggested_page: string | null;
}>) {
  const db = getSupabase();
  const CHUNK = 500;
  let stored = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(r => ({
      site_key: siteKey,
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
      logger.error(`  Upsert chunk ${Math.floor(i / CHUNK) + 1} failed for ${siteKey}: ${error.message}`);
    } else {
      stored += chunk.length;
    }
  }

  return stored;
}

// ─── Main ────────────────────────────────────────────────────

interface SiteResult {
  siteKey: string;
  label: string;
  total: number;
  covered: number;
  opportunities: number;
  stored: number;
  topOpportunities: Array<{ keyword: string; volume: number; cpc: number | null; score: number; suggested_page: string | null }>;
  cost: number;
}

async function main() {
  logger.info('=== Multi-Site DataForSEO Keyword Research ===\n');

  // Check credentials
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    throw new Error('Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD in .env');
  }

  // Check balance first
  try {
    const balRes = await fetch(`${API_BASE}/appendix/user_data`, {
      headers: { 'Authorization': getAuthHeader() },
    });
    const balData = await balRes.json() as any;
    const balance = balData.tasks?.[0]?.result?.[0]?.money?.balance;
    if (balance !== undefined) {
      logger.info(`DataForSEO balance: $${balance.toFixed(2)}\n`);
    }
  } catch { /* ignore */ }

  const results: SiteResult[] = [];
  let totalCost = 0;

  for (const site of SITES) {
    logger.info(`\n${'─'.repeat(60)}`);
    logger.info(`Processing: ${site.label} (${site.siteKey})`);
    logger.info(`Seeds: ${site.seeds.join(', ')}`);

    try {
      // Fetch from DataForSEO
      const fetchStart = Date.now();
      const items = await fetchKeywordsForSite(site.seeds);
      const fetchDuration = Date.now() - fetchStart;
      logger.info(`  Fetched ${items.length} keywords (${(fetchDuration / 1000).toFixed(1)}s)`);

      // Score + match
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

        const matchedPage = matchKeywordToPage(kw, site.coverageKeywords);
        const status = matchedPage ? 'covered' : 'opportunity';
        const suggested = matchedPage || site.suggestPage(kw);

        const row = { keyword: kw, volume, cpc, competition, score, status, suggested_page: suggested };
        rows.push(row);

        if (!matchedPage && volume > 0) {
          opportunities.push(row);
        }
      }

      const covered = rows.filter(r => r.status === 'covered').length;
      logger.info(`  Scored: ${rows.length} total | ${covered} covered | ${opportunities.length} opportunities`);

      // Store
      const stored = await storeKeywords(site.siteKey, rows);
      logger.success(`  Stored ${stored} keywords`);

      // Top 5 opportunities
      opportunities.sort((a, b) => b.score - a.score || b.volume - a.volume);
      const top5 = opportunities.slice(0, 5);

      results.push({
        siteKey: site.siteKey,
        label: site.label,
        total: rows.length,
        covered,
        opportunities: opportunities.length,
        stored,
        topOpportunities: top5.map(r => ({
          keyword: r.keyword,
          volume: r.volume,
          cpc: r.cpc,
          score: r.score,
          suggested_page: r.suggested_page,
        })),
        cost: 0,
      });

      // Rate limit: wait between API calls
      await new Promise(r => setTimeout(r, 1000));

    } catch (e) {
      logger.error(`  FAILED: ${(e as Error).message}`);
      results.push({
        siteKey: site.siteKey,
        label: site.label,
        total: 0,
        covered: 0,
        opportunities: 0,
        stored: 0,
        topOpportunities: [],
        cost: 0,
      });
    }
  }

  // ─── Final Summary ───────────────────────────────────────────

  console.log('\n\n' + '═'.repeat(120));
  console.log('RÉSUMÉ — RECHERCHE MOTS-CLÉS MULTI-SITES');
  console.log('═'.repeat(120));

  let grandTotal = 0;
  let grandOpportunities = 0;
  let grandStored = 0;

  for (const r of results) {
    grandTotal += r.total;
    grandOpportunities += r.opportunities;
    grandStored += r.stored;

    console.log(`\n${'─'.repeat(90)}`);
    console.log(`  ${r.label} (${r.siteKey})`);
    console.log(`  Keywords: ${r.total} | Covered: ${r.covered} | Opportunities: ${r.opportunities} | Stored: ${r.stored}`);

    if (r.topOpportunities.length > 0) {
      console.log(`\n  TOP 5 OPPORTUNITÉS:`);
      console.log(`  ${'#'.padStart(3)} | ${'Mot-clé'.padEnd(45)} | ${'Volume'.padStart(8)} | ${'CPC'.padStart(7)} | ${'Score'.padStart(5)} | Page suggérée`);
      console.log(`  ${'-'.repeat(105)}`);

      for (let i = 0; i < r.topOpportunities.length; i++) {
        const o = r.topOpportunities[i];
        const cpcStr = o.cpc ? `${o.cpc.toFixed(2)}€` : 'n/a';
        console.log(
          `  ${String(i + 1).padStart(3)} | ${o.keyword.padEnd(45)} | ${String(o.volume).padStart(8)} | ${cpcStr.padStart(7)} | ${String(o.score).padStart(5)} | ${o.suggested_page}`
        );
      }
    } else {
      console.log(`  (aucune opportunité trouvée)`);
    }
  }

  console.log(`\n${'═'.repeat(120)}`);
  console.log(`TOTAL: ${grandTotal} keywords | ${grandOpportunities} opportunities | ${grandStored} stored`);
  console.log('═'.repeat(120));

  // Check final balance
  try {
    const balRes = await fetch(`${API_BASE}/appendix/user_data`, {
      headers: { 'Authorization': getAuthHeader() },
    });
    const balData = await balRes.json() as any;
    const balance = balData.tasks?.[0]?.result?.[0]?.money?.balance;
    if (balance !== undefined) {
      console.log(`\nDataForSEO balance remaining: $${balance.toFixed(2)}`);
    }
  } catch { /* ignore */ }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
