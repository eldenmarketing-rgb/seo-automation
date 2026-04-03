/**
 * Generate unique SEO content for all restaurant pages via Claude API.
 * Replaces the template-based thin content with rich, unique pages.
 * Also adds new thematic pages based on GSC data.
 */
import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../config/sites.js';
import { cities66 } from '../config/cities-66.js';
import { generatePageContent, generateBatch } from '../src/generators/page-generator.js';
import { PageToGenerate } from '../src/generators/city-service-matrix.js';
import { getSupabase, SeoPageRow } from '../src/db/supabase.js';
import { injectPages } from '../src/deployers/inject-pages.js';
import { triggerDeploy } from '../src/deployers/vercel-deploy.js';
import * as logger from '../src/utils/logger.js';

const site = sites.restaurant;
const SITE_KEY = 'restaurant';

// Cities that already have pages on the site
const existingCitySlugs = [
  'perpignan', 'cabestany', 'canet-en-roussillon', 'rivesaltes', 'bompas',
  'saint-esteve', 'elne', 'thuir', 'saint-cyprien', 'argeles-sur-mer',
  'le-barcares', 'sainte-marie-la-mer', 'torreilles', 'villeneuve-de-la-raho',
  'leucate', 'pia', 'claira', 'le-soler', 'toulouges',
];

// New thematic pages based on GSC data (high impression queries with no dedicated page)
const thematicPages: PageToGenerate[] = [
  {
    siteKey: SITE_KEY,
    site,
    pageType: 'city_service',
    slug: 'livraison-champagne-perpignan',
    service: { slug: 'livraison-champagne', name: 'Livraison champagne', emoji: '🥂', category: 'livraison', keywords: ['livraison champagne perpignan', 'champagne à domicile', 'champagne nuit perpignan', 'livraison champagne nuit'] },
    city: cities66.find(c => c.slug === 'perpignan')!,
  },
  {
    siteKey: SITE_KEY,
    site,
    pageType: 'city_service',
    slug: 'livraison-bieres-perpignan',
    service: { slug: 'livraison-bieres', name: 'Livraison bières', emoji: '🍺', category: 'livraison', keywords: ['livraison bières perpignan', 'bière à domicile perpignan', 'pack bières livraison nuit'] },
    city: cities66.find(c => c.slug === 'perpignan')!,
  },
  {
    siteKey: SITE_KEY,
    site,
    pageType: 'city_service',
    slug: 'livraison-whisky-perpignan',
    service: { slug: 'livraison-spiritueux', name: 'Livraison whisky et spiritueux', emoji: '🥃', category: 'livraison', keywords: ['livraison whisky perpignan', 'livraison spiritueux perpignan', 'whisky à domicile nuit', 'vodka livraison perpignan'] },
    city: cities66.find(c => c.slug === 'perpignan')!,
  },
];

async function main() {
  logger.info('=== GENERATION RESTAURANT - Contenu unique via Claude API ===');

  // 1. Build city pages to generate
  const cityPages: PageToGenerate[] = existingCitySlugs.map(citySlug => {
    const city = cities66.find(c => c.slug === citySlug);
    if (!city) {
      logger.warn(`City not found: ${citySlug}`);
      return null;
    }
    return {
      siteKey: SITE_KEY,
      site,
      pageType: 'city' as const,
      slug: `livraison-alcool-nuit-${citySlug}`,
      city,
    };
  }).filter((p): p is PageToGenerate => p !== null);

  const allPages = [...cityPages, ...thematicPages];
  logger.info(`Pages à générer : ${allPages.length} (${cityPages.length} villes + ${thematicPages.length} thématiques)`);

  // 2. Generate in batches of 2 (rate limit friendly)
  const { success, errors } = await generateBatch(allPages, 2);

  logger.info(`\nRésultat : ${success.length} OK, ${errors.length} erreurs`);
  if (errors.length > 0) {
    errors.forEach(e => logger.error(`  ${e}`));
  }

  if (success.length === 0) {
    logger.error('Aucune page générée, abandon.');
    return;
  }

  // 3. Store in Supabase
  const db = getSupabase();
  let stored = 0;
  for (const page of success) {
    const { error } = await db.from('seo_pages').upsert({
      site_key: page.site_key,
      slug: page.slug,
      page_type: page.page_type,
      city: page.city,
      service: page.service,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      h1: page.h1,
      content: page.content,
      schema_org: page.schema_org,
      status: 'published',
    }, { onConflict: 'site_key,slug' });

    if (error) {
      logger.error(`Supabase error for ${page.slug}: ${error.message}`);
    } else {
      stored++;
    }
  }
  logger.success(`${stored} pages stockées dans Supabase`);

  // 4. Inject into site files
  logger.info('Injection dans Mon-Sauveur/data/seo-pages.ts...');
  const injected = await injectPages(SITE_KEY, success);
  logger.success(`${injected.length} pages injectées`);

  // 5. Deploy
  logger.info('Déploiement Vercel...');
  try {
    await triggerDeploy(SITE_KEY);
    logger.success('Deploy Vercel lancé !');
  } catch (e) {
    logger.error(`Deploy error: ${(e as Error).message}`);
  }

  logger.info('\n=== TERMINÉ ===');
  logger.info(`${success.length} pages avec contenu unique généré`);
  logger.info('Prochaine étape : attendre le build Vercel puis /ping restaurant all');
}

main().catch(e => {
  logger.error(`Fatal: ${e.message}`);
  process.exit(1);
});
