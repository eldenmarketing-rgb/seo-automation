/**
 * Search Intent Classifier
 *
 * Classifies keywords by search intent using regex patterns,
 * with Claude API fallback for ambiguous cases.
 *
 * Intent types:
 * - transactional: ready to buy/book (urgent, dépannage, devis)
 * - commercial: comparing options (prix, tarif, avis, meilleur)
 * - informational: learning (comment, pourquoi, guide)
 * - local: location-based (près, horaire, adresse)
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import type { PageIntent } from '../../config/site-modes.js';
import { getSupabase } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

dotenv.config();

// ─── Types ──────────────────────────────────────────────────

export type SearchIntent = 'transactional' | 'commercial' | 'informational' | 'local';

// ─── Regex Patterns (ordered by priority) ───────────────────

const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: SearchIntent }> = [
  { pattern: /urgent|nuit|24h|dimanche|samedi|d[ée]pannage|sos|ouvert/i, intent: 'transactional' },
  { pattern: /prix|tarif|co[uû]t|devis|combien|pas cher|gratuit/i, intent: 'commercial' },
  { pattern: /avis|meilleur|comparatif|vs\b|quel\b|recommand|top\b/i, intent: 'commercial' },
  { pattern: /comment|quand|pourquoi|est-ce|diff[ée]rence|sympt[oô]me|guide|tuto|c.?est quoi|faut-il/i, intent: 'informational' },
  { pattern: /pr[eè]s|proche|horaire|adresse|itin[ée]raire|quartier|zone/i, intent: 'local' },
];

// ─── Function 1: classifyIntent (regex-only) ────────────────

export function classifyIntent(keyword: string): SearchIntent {
  const kw = keyword.toLowerCase();
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(kw)) return intent;
  }
  return 'transactional'; // default for service-oriented keywords
}

/**
 * Returns true if the intent was matched by a regex pattern (not default).
 */
function hasRegexMatch(keyword: string): boolean {
  const kw = keyword.toLowerCase();
  return INTENT_PATTERNS.some(({ pattern }) => pattern.test(kw));
}

// ─── Function 2: classifyIntentsBatch (regex + Claude fallback) ─

/**
 * Classify keywords by intent. Priority: DataForSEO → regex → Claude fallback.
 * @param keywords - list of keywords to classify
 * @param dataforseoIntents - optional map of keyword→intent from DataForSEO API
 */
export async function classifyIntentsBatch(
  keywords: string[],
  dataforseoIntents?: Map<string, string>,
): Promise<Map<string, SearchIntent>> {
  const result = new Map<string, SearchIntent>();
  const needsClaude: string[] = [];
  const validIntents = new Set<string>(['transactional', 'commercial', 'informational', 'local']);

  // DataForSEO uses "navigational" — map it to "local" for our use case
  const normalizeDataForSEOIntent = (raw: string): SearchIntent | null => {
    const lower = raw.toLowerCase();
    if (validIntents.has(lower)) return lower as SearchIntent;
    if (lower === 'navigational') return 'local';
    return null;
  };

  let fromDfs = 0, fromRegex = 0;

  for (const kw of keywords) {
    // Step 1: DataForSEO intent (most reliable — based on real Google data)
    const dfsIntent = dataforseoIntents?.get(kw.toLowerCase());
    if (dfsIntent) {
      const normalized = normalizeDataForSEOIntent(dfsIntent);
      if (normalized) {
        result.set(kw, normalized);
        fromDfs++;
        continue;
      }
    }

    // Step 2: Regex classification
    if (hasRegexMatch(kw)) {
      result.set(kw, classifyIntent(kw));
      fromRegex++;
    } else {
      needsClaude.push(kw);
    }
  }

  // Step 3: Claude fallback for ambiguous keywords (batches of 50)
  if (needsClaude.length > 0) {
    logger.info(`Intent classifier: ${fromDfs} DataForSEO, ${fromRegex} regex, ${needsClaude.length} need Claude`);

    const BATCH_SIZE = 50;
    for (let i = 0; i < needsClaude.length; i += BATCH_SIZE) {
      const batch = needsClaude.slice(i, i + BATCH_SIZE);
      try {
        const claudeResults = await classifyWithClaude(batch);
        for (const [kw, intent] of claudeResults) {
          result.set(kw, intent);
        }
      } catch (e) {
        logger.warn(`Claude intent classification failed for batch ${i}: ${(e as Error).message}`);
        // Fallback: mark all as transactional
        for (const kw of batch) {
          result.set(kw, 'transactional');
        }
      }
    }
  }

  return result;
}

async function classifyWithClaude(keywords: string[]): Promise<Map<string, SearchIntent>> {
  const client = new Anthropic();
  const result = new Map<string, SearchIntent>();

  const prompt = `Classifie chaque mot-clé par intention de recherche.
Catégories possibles : transactional, commercial, informational, local

Réponds UNIQUEMENT en JSON, format : {"keyword": "intent", ...}

Mots-clés :
${keywords.map(k => `- ${k}`).join('\n')}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error('No JSON');

    const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1)) as Record<string, string>;
    const validIntents = new Set<string>(['transactional', 'commercial', 'informational', 'local']);

    for (const [kw, intent] of Object.entries(parsed)) {
      const matched = keywords.find(k => k.toLowerCase() === kw.toLowerCase()) || kw;
      result.set(matched, validIntents.has(intent) ? intent as SearchIntent : 'transactional');
    }
  } catch (e) {
    logger.warn(`Failed to parse Claude intent response: ${(e as Error).message}`);
    // Fallback
    for (const kw of keywords) {
      result.set(kw, 'transactional');
    }
  }

  return result;
}

// ─── Function 3: intentToPageIntent ─────────────────────────

export function intentToPageIntent(intent: SearchIntent, keyword: string): PageIntent {
  const kw = keyword.toLowerCase();

  switch (intent) {
    case 'transactional':
      if (/urgent|nuit|24h|d[ée]pannage|sos/.test(kw)) return 'urgence';
      return 'service';

    case 'commercial':
      if (/avis|meilleur|comparatif|recommand|top\b/.test(kw)) return 'avis';
      return 'prix';

    case 'informational':
      if (/comment|est-ce|c'est quoi|faut-il|\?/.test(kw)) return 'faq';
      return 'guide';

    case 'local':
      return 'city_hub';

    default:
      return 'service';
  }
}

// ─── Function 4: backfillIntents ────────────────────────────

export async function backfillIntents(siteKey?: string): Promise<number> {
  const db = getSupabase();
  let updated = 0;

  // Query keywords with no intent_type
  let query = db
    .from('discovered_keywords')
    .select('id, keyword, intent_type')
    .is('intent_type', null)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (siteKey) {
    query = query.eq('site_key', siteKey);
  }

  const { data, error } = await query;
  if (error) {
    // Column might not exist yet
    if (error.message.includes('intent_type')) {
      logger.error('Column intent_type does not exist. Run migration first: src/db/migration-intent-type.sql');
      return -1;
    }
    throw new Error(`backfillIntents query: ${error.message}`);
  }

  if (!data || data.length === 0) {
    logger.info('No keywords need intent backfill');
    return 0;
  }

  logger.info(`Backfilling intents for ${data.length} keywords...`);

  // Build DataForSEO intent map from keywords that already have volume data (came from DFS)
  const dataforseoIntents = new Map<string, string>();
  try {
    const { getSearchVolume } = await import('./dataforseo.js');
    const kwList = data.map(r => r.keyword);
    // Only call DFS for batches — it returns intent from search_intent_info
    const volumeData = await getSearchVolume(kwList);
    for (const [kw, kwData] of volumeData) {
      if (kwData.intent) dataforseoIntents.set(kw, kwData.intent);
    }
    logger.info(`  DataForSEO returned intents for ${dataforseoIntents.size}/${data.length} keywords`);
  } catch (e) {
    logger.warn(`  DataForSEO intent fetch failed, falling back to regex+Claude: ${(e as Error).message}`);
  }

  // Classify all keywords (DFS → regex → Claude)
  const keywords = data.map(r => r.keyword);
  const intents = await classifyIntentsBatch(keywords, dataforseoIntents);

  // Update in batches of 500
  const BATCH_SIZE = 500;
  const rows = data.map(r => ({
    id: r.id,
    intent_type: intents.get(r.keyword) || 'transactional',
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    // Supabase doesn't support batch update by different values easily,
    // so we update one by one (still fast with connection pooling)
    for (const row of batch) {
      const { error: updateErr } = await db
        .from('discovered_keywords')
        .update({ intent_type: row.intent_type })
        .eq('id', row.id);

      if (updateErr) {
        logger.warn(`Failed to update intent for ${row.id}: ${updateErr.message}`);
      } else {
        updated++;
      }
    }

    logger.info(`  Updated ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  logger.success(`Backfill complete: ${updated}/${data.length} keywords classified`);
  return updated;
}

// ─── Function 5: getIntentPromptModifier ────────────────────

export function getIntentPromptModifier(intent: SearchIntent): string {
  switch (intent) {
    case 'transactional':
      return [
        '═══ INTENTION TRANSACTIONNELLE ═══',
        'L\'utilisateur est PRÊT À AGIR. Adapte le contenu en conséquence :',
        '- CTA fort et visible (numéro de téléphone click-to-call)',
        '- Trust signals : années d\'expérience, nombre de clients, certifications',
        '- Sections courtes et orientées action',
        '- Avantages concrets (délai, garantie, proximité)',
        '- Urgence : disponibilité immédiate, intervention rapide',
      ].join('\n');

    case 'commercial':
      return [
        '═══ INTENTION COMMERCIALE ═══',
        'L\'utilisateur COMPARE les options. Adapte le contenu :',
        '- Tableau comparatif ou grille tarifaire si pertinent',
        '- Critères de choix clairement expliqués',
        '- FAQ détaillée (8+ questions) sur les prix, délais, garanties',
        '- Preuve sociale : avis, témoignages, nombre de clients',
        '- Positionnement prix clair (rapport qualité/prix)',
      ].join('\n');

    case 'informational':
      return [
        '═══ INTENTION INFORMATIONNELLE ═══',
        'L\'utilisateur CHERCHE À COMPRENDRE. Adapte le contenu :',
        '- Guide long et structuré (1500+ mots)',
        '- FAQ riche (8+ questions, 80-120 mots par réponse)',
        '- Explications pédagogiques avec exemples concrets',
        '- Sous-titres H2/H3 informatifs (pas clickbait)',
        '- CTA subtil en fin de page (pas agressif)',
        '- Signaux E-E-A-T : expertise, sources, mise à jour',
      ].join('\n');

    case 'local':
      return [
        '═══ INTENTION LOCALE ═══',
        'L\'utilisateur cherche un SERVICE LOCAL. Adapte le contenu :',
        '- NAP (Nom, Adresse, Téléphone) visible et cohérent',
        '- Horaires d\'ouverture',
        '- Itinéraire / accès / parking',
        '- Mentions des quartiers et zones desservies',
        '- Avis locaux et ancrage territorial',
        '- Schema.org LocalBusiness complet',
      ].join('\n');

    default:
      return '';
  }
}

// ─── Helper: Get intent distribution for a site ─────────────

export async function getIntentDistribution(siteKey: string): Promise<Record<SearchIntent, number>> {
  const db = getSupabase();
  const { data, error } = await db
    .from('discovered_keywords')
    .select('intent_type')
    .eq('site_key', siteKey)
    .not('intent_type', 'is', null);

  const dist: Record<SearchIntent, number> = {
    transactional: 0,
    commercial: 0,
    informational: 0,
    local: 0,
  };

  if (error || !data) return dist;

  for (const row of data) {
    const intent = row.intent_type as SearchIntent;
    if (intent in dist) dist[intent]++;
  }

  return dist;
}
