import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { SiteConfig, ServiceDef } from '../../config/sites.js';
import { City66 } from '../../config/cities-66.js';
import { garagePrompt, garageCityOnlyPrompt } from './templates/garage.js';
import { carrosseriePrompt, carrosserieCityOnlyPrompt } from './templates/carrosserie.js';
import { massagePrompt, massageCityOnlyPrompt } from './templates/massage.js';
import { vtcPrompt, vtcCityOnlyPrompt } from './templates/vtc.js';
import { voituresPrompt, voituresCityOnlyPrompt } from './templates/voitures.js';
import { restaurantPrompt, restaurantCityOnlyPrompt } from './templates/restaurant.js';
import { PageToGenerate } from './city-service-matrix.js';
import { SeoPageRow } from '../db/supabase.js';
import { getLinksForCityPage, getLinksForCityServicePage, formatLinksForPrompt } from '../linking/internal-links.js';
import { quickKeywordSuggestions } from '../keywords/research.js';
import * as logger from '../utils/logger.js';

dotenv.config();

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

type PromptFn = (site: SiteConfig, service: ServiceDef, city: City66) => string;
type CityPromptFn = (site: SiteConfig, city: City66, services: ServiceDef[]) => string;

const cityServicePrompts: Record<string, PromptFn> = {
  garage: garagePrompt,
  carrosserie: carrosseriePrompt,
  massage: massagePrompt,
  vtc: vtcPrompt,
  voitures: voituresPrompt,
  restaurant: restaurantPrompt,
};

const cityOnlyPrompts: Record<string, CityPromptFn> = {
  garage: garageCityOnlyPrompt,
  carrosserie: carrosserieCityOnlyPrompt,
  massage: massageCityOnlyPrompt,
  vtc: vtcCityOnlyPrompt,
  voitures: voituresCityOnlyPrompt,
  restaurant: restaurantCityOnlyPrompt,
};

/** Generate content for a single page using Claude API */
export async function generatePageContent(page: PageToGenerate): Promise<SeoPageRow> {
  const anthropic = getClient();

  let prompt: string;
  let internalLinksContext = '';

  if (page.pageType === 'city' && page.city) {
    const fn = cityOnlyPrompts[page.siteKey];
    if (!fn) throw new Error(`No city template for ${page.siteKey}`);
    prompt = fn(page.site, page.city, page.site.services);
    const links = getLinksForCityPage(page.siteKey, page.city.slug);
    internalLinksContext = formatLinksForPrompt(links, page.site.domain);
  } else if (page.pageType === 'city_service' && page.service && page.city) {
    const fn = cityServicePrompts[page.siteKey];
    if (!fn) throw new Error(`No city_service template for ${page.siteKey}`);
    prompt = fn(page.site, page.service, page.city);
    const links = getLinksForCityServicePage(page.siteKey, page.city.slug, page.service.slug);
    internalLinksContext = formatLinksForPrompt(links, page.site.domain);
  } else {
    throw new Error(`Invalid page config: type=${page.pageType}`);
  }

  // Inject real internal links into prompt
  if (internalLinksContext) {
    prompt += `\n\nLIENS INTERNES EXISTANTS (utilise ces vrais liens dans les internalLinks et mentionne-les naturellement dans le contenu) :\n${internalLinksContext}`;
  }

  // Auto keyword injection: fetch Google Suggest keywords before generation
  if (page.city && (page.service || page.pageType === 'city')) {
    try {
      const seed = page.service ? `${page.service.name} ${page.city.name}` : `${page.site.business} ${page.city.name}`;
      const keywords = await quickKeywordSuggestions(seed, page.city.name, '66');
      const longTailKws = keywords.filter(k => k.type === 'long').slice(0, 10);
      if (longTailKws.length > 0) {
        prompt += `\n\nMOTS-CLÉS LONGUE TRAÎNE (intègre-les naturellement) :\n`;
        prompt += longTailKws.map(k => `- "${k.keyword}"`).join('\n');
      }
    } catch (e) {
      logger.warn(`Keyword suggestion failed for ${page.slug}: ${(e as Error).message}`);
    }
  }

  logger.info(`Generating: ${page.slug} (${page.siteKey}/${page.pageType})`);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  let parsed: Record<string, unknown>;
  try {
    // Try to extract JSON from the response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    logger.error(`Failed to parse JSON for ${page.slug}: ${(e as Error).message}`);
    logger.error(`Raw response: ${text.slice(0, 500)}`);
    throw new Error(`JSON parse failed for ${page.slug}`);
  }

  // Add freshness date
  if (parsed && typeof parsed === 'object') {
    parsed.updatedDate = new Date().toISOString().split('T')[0];
  }

  // Build schema.org
  const schemaOrg = buildSchemaOrg(page, parsed);

  return {
    site_key: page.siteKey,
    page_type: page.pageType,
    slug: page.slug,
    city: page.city?.name,
    service: page.service?.name,
    meta_title: (parsed.metaTitle as string) || '',
    meta_description: (parsed.metaDescription as string) || '',
    h1: (parsed.h1 as string) || '',
    content: parsed as Record<string, unknown>,
    schema_org: schemaOrg,
    status: 'draft',
  };
}

/** Build schema.org JSON-LD for the page */
function buildSchemaOrg(page: PageToGenerate, content: Record<string, unknown>): Record<string, unknown> {
  const site = page.site;

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': site.schemaType,
    name: site.name,
    telephone: site.phone,
    email: site.email,
    url: site.domain,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address,
      addressLocality: site.city,
      postalCode: site.postalCode,
      addressCountry: 'FR',
    },
  };

  if (page.city) {
    base.areaServed = [
      { '@type': 'City', name: site.city },
      { '@type': 'City', name: page.city.name },
    ];
  }

  if (page.service) {
    base.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: page.service.name,
      itemListElement: [{
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: page.service.name,
          description: (content.metaDescription as string) || '',
        },
      }],
    };
  }

  // FAQ schema
  const faq = content.faq as Array<{ question: string; answer: string }>;
  if (faq && faq.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    };
    return { schemas: [base, faqSchema] };
  }

  return { schemas: [base] };
}

/** Generate multiple pages with rate limiting */
export async function generateBatch(pages: PageToGenerate[], concurrency = 2): Promise<{ success: SeoPageRow[]; errors: string[] }> {
  const results: SeoPageRow[] = [];
  const errors: string[] = [];

  // Process in chunks to respect rate limits
  for (let i = 0; i < pages.length; i += concurrency) {
    const chunk = pages.slice(i, i + concurrency);
    const promises = chunk.map(async (page) => {
      try {
        const result = await generatePageContent(page);
        results.push(result);
        logger.success(`Generated: ${page.slug}`);
      } catch (e) {
        const msg = `${page.slug}: ${(e as Error).message}`;
        errors.push(msg);
        logger.error(`Failed: ${msg}`);
      }
    });

    await Promise.all(promises);

    // Rate limit: wait between chunks
    if (i + concurrency < pages.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { success: results, errors };
}

/** Generate optimized content for a page that's between position #5-#15 */
export async function generateOptimizedContent(
  currentContent: Record<string, unknown>,
  topQueries: Array<{ query: string; position: number; impressions: number }>,
  siteKey: string,
  pageUrl: string,
): Promise<Record<string, unknown>> {
  const anthropic = getClient();

  const queriesList = topQueries
    .slice(0, 10)
    .map(q => `- "${q.query}" (position: ${q.position.toFixed(1)}, impressions: ${q.impressions})`)
    .join('\n');

  const prompt = `Tu es un consultant SEO senior spécialisé en optimisation de contenu pour le top 3 Google. Tu analyses les données GSC et tu réécris le contenu pour maximiser le CTR et améliorer les positions.

PAGE : ${pageUrl}
SITE : ${siteKey}

═══ DONNÉES GOOGLE SEARCH CONSOLE ═══
${queriesList}

═══ CONTENU ACTUEL (JSON) ═══
${JSON.stringify(currentContent, null, 2).slice(0, 6000)}

═══ MISSION ═══
Cette page est entre #5 et #15. Tu dois la faire passer en TOP 3.

═══ STRATÉGIE D'OPTIMISATION ═══

1. ANALYSE DES REQUÊTES : Identifie la requête principale (celle avec le plus d'impressions) et les requêtes secondaires. Le contenu doit répondre PARFAITEMENT à l'intention derrière chaque requête.

2. RENFORCEMENT SÉMANTIQUE :
   - Enrichir chaque section avec le champ sémantique complet des requêtes principales
   - Ajouter les entités NLP manquantes (termes techniques, concepts liés, synonymes)
   - Chaque requête GSC doit être couverte naturellement dans le contenu

3. TITLE & META OPTIMISÉS :
   - metaTitle : intégrer la requête #1 en position forte + élément de CTR (chiffre, bénéfice)
   - metaDescription : reformuler pour maximiser le taux de clic (CTA fort, bénéfice clair, urgence douce)

4. SECTIONS SEO :
   - Allonger chaque section à 250-400 mots minimum
   - Ajouter des sections manquantes si les requêtes GSC révèlent des sujets non couverts
   - Chaque H2 doit cibler une requête secondaire ou une question "People Also Ask"

5. FAQ ENRICHIES :
   - Reformuler les FAQ existantes pour mieux matcher les requêtes GSC
   - Ajouter des FAQ basées sur les requêtes informationnelles détectées
   - Viser 6 FAQ minimum avec des réponses de 60-120 mots

6. E-E-A-T :
   - Ajouter ou renforcer les trustSignals (éléments de crédibilité, expérience, expertise)
   - Intégrer des preuves d'expérience dans le contenu ("nous intervenons régulièrement pour...")

7. RÈGLES STRICTES :
   - GARDER la même structure JSON que le contenu actuel
   - Ne JAMAIS réduire le contenu — seulement enrichir et optimiser
   - Ne PAS inventer de prix, chiffres d'affaires ou statistiques
   - Préserver les internalLinks existants, en ajouter si pertinent
   - Ajouter un champ "trustSignals" (array de 4 strings) s'il n'existe pas

RETOURNE le JSON optimisé avec la MÊME structure. Ajoute les champs "trustSignals" et des FAQ supplémentaires.
Retourne UNIQUEMENT le JSON valide, sans markdown, sans backticks.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in optimization response');
  const optimizedParsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  // Update freshness date on optimized content
  optimizedParsed.updatedDate = new Date().toISOString().split('T')[0];

  return optimizedParsed;
}
