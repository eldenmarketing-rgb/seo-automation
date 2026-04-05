import { generatePageImages } from './src/images/image-generator.js';
import { sites } from './config/sites.js';
import type { UniversalPage, SiteModeConfig } from './config/site-modes.js';
import { existsSync, statSync } from 'fs';

const OUTPUT_DIR = '/home/ubuntu/sites/Site_Garage/public/images/generated';
const FALLBACK_SIZE = 111954; // size of vidange-perpignan.webp (the fallback source)
const FALLBACK_SIZE2 = 91656; // size of perpignan.webp

const modeConfig: SiteModeConfig = {
  mode: 'local',
  brand: { tone: '', personality: '', wordsToUse: [], wordsToAvoid: [], ctaStyle: '', uniqueSellingPoints: [], experienceProof: '' },
  enabledIntents: ['service', 'city_hub'],
  content: { minWordCount: 800, maxWordCount: 1500, seoSectionCount: 5, faqCount: 6, language: 'fr', includeUpdatedDate: true },
  cocooning: { pillarPages: [], clusterDepth: 1, maxInternalLinks: 5 },
};

// All pages that need images - check which ones are still fallbacks
const pages: Array<{ slug: string; type: 'service' | 'city'; service?: string; city?: string }> = [
  { slug: 'entretien-voiture-perpignan', type: 'service', service: 'Entretien et révision voiture', city: 'Perpignan' },
  { slug: 'freins-plaquettes-perpignan', type: 'service', service: 'Freins et plaquettes', city: 'Perpignan' },
  { slug: 'cabestany', type: 'city', city: 'Cabestany' },
  { slug: 'saint-esteve', type: 'city', city: 'Saint-Estève' },
  { slug: 'saint-cyprien', type: 'city', city: 'Saint-Cyprien' },
  { slug: 'canet-en-roussillon', type: 'city', city: 'Canet-en-Roussillon' },
];

async function main() {
  const site = sites.garage;
  let success = 0;

  for (const p of pages) {
    // Check if it's a fallback (same size as source)
    const imgPath = `${OUTPUT_DIR}/${p.slug}.webp`;
    if (existsSync(imgPath)) {
      const size = statSync(imgPath).size;
      if (size !== FALLBACK_SIZE && size !== FALLBACK_SIZE2) {
        console.log(`[SKIP] ${p.slug} — already unique (${size} bytes)`);
        continue;
      }
    }

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

    console.log(`\n[${success + 1}/6] ${p.slug}...`);
    const result = await generatePageImages(universalPage, OUTPUT_DIR, { heroImage: true, contentImages: 0 });

    if (result.hero) {
      success++;
      console.log(`  OK ${result.hero.filename} (${result.hero.sizeKb} KB)`);
    } else {
      console.log(`  FAILED`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nGenerated ${success}/6 missing images`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
