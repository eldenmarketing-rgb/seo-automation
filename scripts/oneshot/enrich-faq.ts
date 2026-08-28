/**
 * enrich-faq.ts — GSC FAQ Enrichment Script
 *
 * Queries GSC data for question-like search queries, then uses Claude
 * to generate new FAQ items for pages that don't already cover those questions.
 *
 * Usage:
 *   npx tsx scripts/enrich-faq.ts [--site garage|carrosserie] [--dry-run]
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { getSupabase, SeoPageRow } from '../src/db/supabase.js';
import * as logger from '../src/utils/logger.js';

dotenv.config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALLOWED_SITES = ['garage', 'carrosserie'];
const MAX_NEW_FAQS_PER_PAGE = 3;

/** Words that indicate a question intent in French queries */
const QUESTION_MARKERS = [
  'comment',
  'quand',
  'pourquoi',
  'combien',
  'quel',
  'quelle',
  'où',
  'est-ce',
  'faut-il',
  'peut-on',
];

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(): { sites: string[]; dryRun: boolean } {
  const args = process.argv.slice(2);
  let sites = [...ALLOWED_SITES];
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--site' && args[i + 1]) {
      const val = args[i + 1];
      if (!ALLOWED_SITES.includes(val)) {
        logger.error(`Invalid site "${val}". Allowed: ${ALLOWED_SITES.join(', ')}`);
        process.exit(1);
      }
      sites = [val];
      i++;
    }
    if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { sites, dryRun };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FaqItem {
  question: string;
  answer: string;
}

interface QuestionQuery {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
}

function isQuestionQuery(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (lower.endsWith('?')) return true;
  for (const marker of QUESTION_MARKERS) {
    // Check if the query starts with the marker or contains it as a separate word
    if (lower.startsWith(marker + ' ') || lower.includes(' ' + marker + ' ')) {
      return true;
    }
  }
  return false;
}

/**
 * Check whether an existing FAQ item already covers a given query.
 * Uses simple token overlap — if >50% of query words appear in the question, it's covered.
 */
function isCoveredByFaq(query: string, existingFaq: FaqItem[]): boolean {
  const queryTokens = query.toLowerCase().replace(/[?']/g, ' ').split(/\s+/).filter(t => t.length > 2);
  if (queryTokens.length === 0) return true; // nothing meaningful to match

  for (const faq of existingFaq) {
    const faqText = (faq.question + ' ' + faq.answer).toLowerCase();
    const matched = queryTokens.filter(t => faqText.includes(t));
    if (matched.length / queryTokens.length >= 0.5) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// GSC question queries from Supabase
// ---------------------------------------------------------------------------

async function getQuestionQueriesByPage(siteKey: string): Promise<Map<string, QuestionQuery[]>> {
  const db = getSupabase();

  // Fetch last 28 days of GSC data for this site
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 28);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const { data, error } = await db
    .from('gsc_positions')
    .select('query, page_url, impressions, clicks, position')
    .eq('site_key', siteKey)
    .gte('date', cutoff)
    .order('impressions', { ascending: false });

  if (error) {
    throw new Error(`getQuestionQueriesByPage: ${error.message}`);
  }
  if (!data || data.length === 0) return new Map();

  // Aggregate by page_url + query (sum impressions/clicks, avg position)
  const agg = new Map<string, Map<string, { impressions: number; clicks: number; positions: number[] }>>();

  for (const row of data) {
    if (!isQuestionQuery(row.query)) continue;

    let pageMap = agg.get(row.page_url);
    if (!pageMap) {
      pageMap = new Map();
      agg.set(row.page_url, pageMap);
    }
    const existing = pageMap.get(row.query) || { impressions: 0, clicks: 0, positions: [] };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.positions.push(row.position);
    pageMap.set(row.query, existing);
  }

  // Build result: page_url -> sorted question queries
  const result = new Map<string, QuestionQuery[]>();
  for (const [pageUrl, queryMap] of agg) {
    const queries: QuestionQuery[] = [];
    for (const [query, stats] of queryMap) {
      queries.push({
        query,
        impressions: stats.impressions,
        clicks: stats.clicks,
        position: stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length,
      });
    }
    queries.sort((a, b) => b.impressions - a.impressions);
    result.set(pageUrl, queries);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Match GSC page URLs to seo_pages slugs
// ---------------------------------------------------------------------------

function urlToSlug(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl);
    // Remove trailing slash and leading slash
    let path = url.pathname.replace(/^\//, '').replace(/\/$/, '');
    // Return the path as slug
    return path || null;
  } catch {
    return null;
  }
}

async function getMatchingPages(siteKey: string, pageUrls: string[]): Promise<Map<string, SeoPageRow>> {
  const db = getSupabase();

  // Get all pages for this site
  const { data, error } = await db
    .from('seo_pages')
    .select('*')
    .eq('site_key', siteKey);

  if (error) throw new Error(`getMatchingPages: ${error.message}`);
  if (!data || data.length === 0) return new Map();

  // Build slug lookup
  const slugMap = new Map<string, SeoPageRow>();
  for (const page of data) {
    slugMap.set(page.slug, page as SeoPageRow);
  }

  // Match page URLs to slugs
  const result = new Map<string, SeoPageRow>();
  for (const pageUrl of pageUrls) {
    const slug = urlToSlug(pageUrl);
    if (slug && slugMap.has(slug)) {
      result.set(pageUrl, slugMap.get(slug)!);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Claude FAQ generation
// ---------------------------------------------------------------------------

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

async function generateNewFaqs(
  existingFaq: FaqItem[],
  newQueries: QuestionQuery[],
  siteKey: string,
  pageSlug: string,
): Promise<FaqItem[]> {
  const anthropic = getAnthropicClient();

  const existingFaqText = existingFaq.length > 0
    ? existingFaq.map((f, i) => `${i + 1}. Q: ${f.question}\n   R: ${f.answer}`).join('\n\n')
    : '(aucune FAQ existante)';

  const queriesText = newQueries
    .slice(0, 10)
    .map(q => `- "${q.query}" (${q.impressions} impressions, position ${q.position.toFixed(1)})`)
    .join('\n');

  const prompt = `Tu es un expert SEO local. Tu enrichis la FAQ d'une page avec de nouvelles questions basées sur les vraies recherches Google (GSC).

SITE : ${siteKey}
PAGE : ${pageSlug}

═══ FAQ EXISTANTE ═══
${existingFaqText}

═══ REQUÊTES GSC NON COUVERTES (questions réelles des internautes) ═══
${queriesText}

═══ MISSION ═══
Génère exactement ${Math.min(newQueries.length, MAX_NEW_FAQS_PER_PAGE)} nouvelles entrées FAQ basées sur les requêtes GSC ci-dessus.

═══ RÈGLES ═══
- Chaque question doit reprendre naturellement l'intention de la requête GSC correspondante
- Chaque réponse doit faire entre 60 et 120 mots
- Les réponses doivent être professionnelles, informatives et localisées (Pyrénées-Orientales / 66)
- Ne PAS dupliquer les FAQ existantes
- Ne PAS inventer de prix ou statistiques
- Intégrer un CTA téléphonique naturel dans au moins une réponse
- Retourner UNIQUEMENT un tableau JSON valide, sans markdown, sans backticks

FORMAT DE SORTIE (JSON array) :
[
  { "question": "...", "answer": "..." },
  { "question": "...", "answer": "..." }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // Parse JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as FaqItem[];

  // Validate structure
  const valid = parsed.filter(
    item => typeof item.question === 'string' && typeof item.answer === 'string'
      && item.question.length > 10 && item.answer.length > 50,
  );

  return valid.slice(0, MAX_NEW_FAQS_PER_PAGE);
}

// ---------------------------------------------------------------------------
// Build updated schema_org with new FAQs
// ---------------------------------------------------------------------------

function rebuildSchemaOrg(page: SeoPageRow, allFaq: FaqItem[]): Record<string, unknown> {
  const existing = (page.schema_org || {}) as Record<string, unknown>;
  const schemas = (existing.schemas as Record<string, unknown>[]) || [];

  // Remove old FAQPage schema
  const nonFaqSchemas = schemas.filter(s => s['@type'] !== 'FAQPage');

  // Build new FAQPage schema
  if (allFaq.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allFaq.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    };
    nonFaqSchemas.push(faqSchema);
  }

  return { schemas: nonFaqSchemas };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { sites, dryRun } = parseArgs();

  logger.info(`FAQ Enrichment — sites: ${sites.join(', ')} — dry-run: ${dryRun}`);

  const db = getSupabase();
  let totalEnriched = 0;
  let totalNewFaqs = 0;

  for (const siteKey of sites) {
    logger.info(`\n========== ${siteKey.toUpperCase()} ==========`);

    // 1. Get question queries from GSC data
    const questionsByPage = await getQuestionQueriesByPage(siteKey);
    if (questionsByPage.size === 0) {
      logger.warn(`No question queries found in GSC for ${siteKey}`);
      continue;
    }
    logger.info(`Found question queries for ${questionsByPage.size} pages`);

    // 2. Match GSC page URLs to seo_pages
    const pageUrls = [...questionsByPage.keys()];
    const matchedPages = await getMatchingPages(siteKey, pageUrls);
    if (matchedPages.size === 0) {
      logger.warn(`No matching seo_pages found for ${siteKey}`);
      continue;
    }
    logger.info(`Matched ${matchedPages.size} pages in seo_pages`);

    // 3. Process each matched page
    for (const [pageUrl, seoPage] of matchedPages) {
      const questions = questionsByPage.get(pageUrl) || [];
      if (questions.length === 0) continue;

      // Get existing FAQ
      const content = (seoPage.content || {}) as Record<string, unknown>;
      const existingFaq = (content.faq || []) as FaqItem[];

      // Filter out questions already covered by existing FAQ
      const uncoveredQueries = questions.filter(q => !isCoveredByFaq(q.query, existingFaq));

      if (uncoveredQueries.length === 0) {
        logger.info(`  ${seoPage.slug} — all ${questions.length} questions already covered`);
        continue;
      }

      logger.info(`  ${seoPage.slug} — ${uncoveredQueries.length} uncovered question(s) (${existingFaq.length} existing FAQ)`);

      if (dryRun) {
        for (const q of uncoveredQueries.slice(0, MAX_NEW_FAQS_PER_PAGE)) {
          logger.info(`    [DRY-RUN] Would add FAQ for: "${q.query}" (${q.impressions} imp, pos ${q.position.toFixed(1)})`);
        }
        continue;
      }

      // 4. Generate new FAQ items via Claude
      try {
        const newFaqs = await generateNewFaqs(
          existingFaq,
          uncoveredQueries.slice(0, MAX_NEW_FAQS_PER_PAGE),
          siteKey,
          seoPage.slug,
        );

        if (newFaqs.length === 0) {
          logger.warn(`  ${seoPage.slug} — Claude returned no valid FAQ items`);
          continue;
        }

        // 5. Append new FAQs to content
        const allFaq = [...existingFaq, ...newFaqs];
        const updatedContent = { ...content, faq: allFaq };

        // 6. Rebuild schema_org
        const updatedSchema = rebuildSchemaOrg(seoPage, allFaq);

        // 7. Update in Supabase
        const { error } = await db
          .from('seo_pages')
          .update({
            content: updatedContent,
            schema_org: updatedSchema,
            updated_at: new Date().toISOString(),
          })
          .eq('site_key', siteKey)
          .eq('slug', seoPage.slug);

        if (error) {
          logger.error(`  ${seoPage.slug} — Supabase update failed: ${error.message}`);
          continue;
        }

        totalEnriched++;
        totalNewFaqs += newFaqs.length;

        for (const faq of newFaqs) {
          logger.success(`  + "${faq.question}"`);
        }

        // Rate limit between Claude calls
        await new Promise(r => setTimeout(r, 1000));

      } catch (e) {
        logger.error(`  ${seoPage.slug} — FAQ generation failed: ${(e as Error).message}`);
      }
    }
  }

  // Summary
  logger.info('\n========== SUMMARY ==========');
  if (dryRun) {
    logger.info('DRY-RUN mode — no changes were made');
  } else {
    logger.success(`Enriched ${totalEnriched} pages with ${totalNewFaqs} new FAQ items`);
  }

  // Log to automation_logs
  if (!dryRun && totalEnriched > 0) {
    try {
      await db.from('automation_logs').insert({
        job_name: 'enrich-faq',
        action: 'faq_enrichment',
        status: 'success',
        details: {
          sites,
          pages_enriched: totalEnriched,
          new_faqs: totalNewFaqs,
        },
      });
    } catch (e) {
      logger.warn(`Failed to log to automation_logs: ${(e as Error).message}`);
    }
  }
}

main().catch((e) => {
  logger.error(`Fatal: ${e.message}`);
  process.exit(1);
});
