/**
 * Universal Page Generator (v2)
 * 
 * Drop-in replacement for the existing page-generator.ts.
 * Uses the universal prompt builder instead of per-site templates.
 * 
 * MIGRATION:
 * 1. Backup: cp src/generators/page-generator.ts src/generators/page-generator.backup.ts
 * 2. Replace: cp page-generator-v2.ts src/generators/page-generator.ts
 * 3. The old template imports (garage.ts, carrosserie.ts, etc.) are no longer needed
 *    but can stay in the codebase — they just won't be imported anymore.
 * 
 * WHAT CHANGED:
 * - Removed all per-site template imports (garage, carrosserie, massage, vtc, voitures, restaurant)
 * - Uses buildPrompt() from universal-prompt.ts instead
 * - Uses buildUniversalSchemaOrg() from universal-schema.ts instead of buildSchemaOrg()
 * - Added system prompt support (messages[0] = system role)
 * - Supports all 3 modes: local, thematic, product
 * - Supports all intent types: service, prix, urgence, avis, faq, guide, formation, etc.
 * 
 * WHAT DIDN'T CHANGE:
 * - generateBatch() signature and behavior
 * - generateOptimizedContent() signature and behavior
 * - SeoPageRow output format
 * - Rate limiting, error handling, JSON parsing
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { UniversalPage } from '../../config/site-modes.js';
import { buildPrompt, buildOptimizationPrompt } from './universal-prompt.js';
import { buildUniversalSchemaOrg } from './universal-schema.js';
import { getSiteModeConfig } from '../../config/site-mode-registry.js';
import { computeCocoonLinks } from '../linking/cocooning.js';
import { enrichedKeywordSuggestions } from '../keywords/research-v2.js';
import { SeoPageRow } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

// Backward compatibility — re-export PageToGenerate as UniversalPage
export type PageToGenerate = UniversalPage;

dotenv.config();

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// ─── Extra Context Builders ──────────────────────────────────

async function buildCocooningContext(page: UniversalPage): Promise<string> {
  try {
    const { promptBlock } = await computeCocoonLinks(page);
    return promptBlock;
  } catch (e) {
    logger.warn(`Cocooning failed for ${page.slug}: ${(e as Error).message}`);
    return '';
  }
}

async function buildKeywordsContext(page: UniversalPage): Promise<string> {
  try {
    let seed: string;

    if (page.service && page.city) {
      seed = `${page.service.name} ${page.city.name}`;
    } else if (page.city) {
      seed = `${page.site.business || page.site.name} ${page.city.name}`;
    } else if (page.topic) {
      seed = page.topic.name;
    } else if (page.product) {
      seed = page.product.name;
    } else {
      return '';
    }

    const location = page.city?.name || '';
    const dept = page.city?.department || '66';
    const keywords = await enrichedKeywordSuggestions(seed, location, dept, 15);
    const longTail = keywords.filter(k => k.type === 'long').slice(0, 12);

    if (longTail.length === 0) return '';

    // Si on a des volumes DataForSEO, les inclure dans le prompt
    const hasVolumes = longTail.some(k => k.volume && k.volume > 0);

    if (hasVolumes) {
      const lines = longTail.map(k => {
        const vol = k.volume ? ` (${k.volume}/mois)` : '';
        const cpc = k.cpc ? ` [CPC: ${k.cpc.toFixed(2)}€]` : '';
        return `- "${k.keyword}"${vol}${cpc}`;
      });
      return `MOTS-CLÉS LONGUE TRAÎNE AVEC VOLUMES RÉELS (priorise ceux à fort volume, intègre-les naturellement) :\n${lines.join('\n')}`;
    }

    // Fallback sans volumes
    return `MOTS-CLÉS LONGUE TRAÎNE (intègre-les naturellement dans le contenu) :\n${longTail.map(k => `- "${k.keyword}"`).join('\n')}`;
  } catch (e) {
    logger.warn(`Keyword suggestions failed for ${page.slug}: ${(e as Error).message}`);
    return '';
  }
}

// ─── Main Generator ──────────────────────────────────────────

/** Generate content for a single page using Claude API */
export async function generatePageContent(page: UniversalPage): Promise<SeoPageRow> {
  const anthropic = getClient();

  // 1. Build extra context (cocooning + keywords)
  const cocooningContext = await buildCocooningContext(page);
  const keywordsContext = await buildKeywordsContext(page);

  const extraParts: string[] = [];
  if (cocooningContext) extraParts.push(cocooningContext);
  if (keywordsContext) extraParts.push(keywordsContext);
  const extraContext = extraParts.length > 0 ? extraParts.join('\n\n') : undefined;

  // 2. Build universal prompt
  const { system, user } = buildPrompt(page, extraContext);

  logger.info(`Generating: ${page.slug} [${page.modeConfig.mode}/${page.intent}] (${page.siteKey})`);

  // 3. Call Claude API with system prompt
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system,  // System prompt — stable role definition, better adherence
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // 4. Parse JSON response
  let parsed: Record<string, unknown>;
  try {
    // Remove markdown fences if present
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Find the outermost JSON object by matching balanced braces
    const startIdx = cleaned.indexOf('{');
    if (startIdx === -1) throw new Error('No JSON found in response');
    
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx === -1) throw new Error('Unbalanced JSON braces');
    
    parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
  } catch (e) {
    logger.error(`Failed to parse JSON for ${page.slug}: ${(e as Error).message}`);
    logger.error(`Raw response (first 500 chars): ${text.slice(0, 500)}`);
    throw new Error(`JSON parse failed for ${page.slug}`);
  }

  // 5. Add freshness date
  if (parsed && typeof parsed === 'object') {
    parsed.updatedDate = new Date().toISOString().split('T')[0];
  }

  // 6. Build schema.org
  const schemaOrg = buildUniversalSchemaOrg(page, parsed);

  // 7. Return SeoPageRow
  return {
    site_key: page.siteKey,
    page_type: page.pageType,
    slug: page.slug,
    city: page.city?.name,
    service: page.service?.name || page.topic?.name || page.product?.name,
    meta_title: (parsed.metaTitle as string) || '',
    meta_description: (parsed.metaDescription as string) || '',
    h1: (parsed.h1 as string) || '',
    content: parsed as Record<string, unknown>,
    schema_org: schemaOrg,
    status: 'draft',
    // Extra fields for the new system
    intent: page.intent,
    mode: page.modeConfig.mode,
  };
}

/** Generate multiple pages with rate limiting */
export async function generateBatch(
  pages: UniversalPage[],
  concurrency = 2
): Promise<{ success: SeoPageRow[]; errors: string[] }> {
  const results: SeoPageRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < pages.length; i += concurrency) {
    const chunk = pages.slice(i, i + concurrency);
    const promises = chunk.map(async (page) => {
      try {
        const result = await generatePageContent(page);
        results.push(result);
        logger.success(`Generated: ${page.slug} [${page.intent}]`);
      } catch (e) {
        const msg = `${page.slug}: ${(e as Error).message}`;
        errors.push(msg);
        logger.error(`Failed: ${msg}`);
      }
    });

    await Promise.all(promises);

    // Rate limit between chunks
    if (i + concurrency < pages.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { success: results, errors };
}

/** Generate optimized content for pages position 5-15 */
export async function generateOptimizedContent(
  currentContent: Record<string, unknown>,
  topQueries: Array<{ query: string; position: number; impressions: number }>,
  siteKey: string,
  pageUrl: string,
): Promise<Record<string, unknown>> {
  const anthropic = getClient();
  const modeConfig = getSiteModeConfig(siteKey);

  const { system, user } = buildOptimizationPrompt(
    currentContent,
    topQueries,
    siteKey,
    pageUrl,
    modeConfig.brand,
  );

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const cleanedOpt = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const startOpt = cleanedOpt.indexOf('{');
  if (startOpt === -1) throw new Error('No JSON in optimization response');
  let depthOpt = 0;
  let endOpt = -1;
  for (let i = startOpt; i < cleanedOpt.length; i++) {
    if (cleanedOpt[i] === '{') depthOpt++;
    else if (cleanedOpt[i] === '}') { depthOpt--; if (depthOpt === 0) { endOpt = i; break; } }
  }
  if (endOpt === -1) throw new Error('Unbalanced JSON in optimization response');
  const optimized = JSON.parse(cleanedOpt.slice(startOpt, endOpt + 1)) as Record<string, unknown>;

  optimized.updatedDate = new Date().toISOString().split('T')[0];

  return optimized;
}
