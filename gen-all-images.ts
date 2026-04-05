import { generatePageImages } from './src/images/image-generator.js';
import { sites } from './config/sites.js';
import type { UniversalPage, SiteModeConfig } from './config/site-modes.js';

const OUTPUT_DIR = '/home/ubuntu/sites/Site_Garage/public/images/generated';

const modeConfig: SiteModeConfig = {
  mode: 'local',
  brand: {
    tone: 'professionnel et rassurant',
    personality: 'Garage de proximité expert',
    wordsToUse: [], wordsToAvoid: [],
    ctaStyle: 'appel direct',
    uniqueSellingPoints: [],
    experienceProof: '',
  },
  enabledIntents: ['service', 'city_hub'],
  content: { minWordCount: 800, maxWordCount: 1500, seoSectionCount: 5, faqCount: 6, language: 'fr', includeUpdatedDate: true },
  cocooning: { pillarPages: [], clusterDepth: 1, maxInternalLinks: 5 },
};

const pages: Array<{ slug: string; type: 'service' | 'city'; service?: string; city?: string }> = [
  // Services (5 - vidange already done)
  { slug: 'entretien-voiture-perpignan', type: 'service', service: 'Entretien voiture', city: 'Perpignan' },
  { slug: 'freins-plaquettes-perpignan', type: 'service', service: 'Freins et plaquettes', city: 'Perpignan' },
  { slug: 'diagnostic-auto-perpignan', type: 'service', service: 'Diagnostic auto', city: 'Perpignan' },
  { slug: 'climatisation-auto-perpignan', type: 'service', service: 'Climatisation auto', city: 'Perpignan' },
  // Cities (5)
  { slug: 'perpignan', type: 'city', city: 'Perpignan' },
  { slug: 'cabestany', type: 'city', city: 'Cabestany' },
  { slug: 'saint-esteve', type: 'city', city: 'Saint-Estève' },
  { slug: 'saint-cyprien', type: 'city', city: 'Saint-Cyprien' },
  { slug: 'canet-en-roussillon', type: 'city', city: 'Canet-en-Roussillon' },
];

async function main() {
  const site = sites.garage;
  let success = 0;

  for (const p of pages) {
    const universalPage: UniversalPage = {
      siteKey: 'garage',
      slug: p.slug,
      pageType: p.type === 'city' ? 'city' : 'city_service',
      intent: p.type === 'city' ? 'city_hub' : 'service',
      city: p.city ? { name: p.city, slug: p.slug, postalCode: '66000', distanceFromBase: '0 km' } : undefined,
      service: p.service ? { name: p.service, slug: p.slug, keywords: [] } : undefined,
      site,
      modeConfig,
    };

    console.log(`\n[${success + 1}/${pages.length}] ${p.slug}...`);
    const result = await generatePageImages(universalPage, OUTPUT_DIR, { heroImage: true, contentImages: 0 });

    if (result.hero) {
      success++;
      console.log(`  ✅ ${result.hero.filename} (${result.hero.sizeKb} KB)`);
    } else {
      console.log(`  ❌ Failed`);
    }

    // Small delay between API calls
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Generated ${success}/${pages.length} images`);
  console.log(`Output: ${OUTPUT_DIR}/`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
