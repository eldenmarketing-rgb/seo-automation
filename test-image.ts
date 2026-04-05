import { generatePageImages } from './src/images/image-generator.js';
import { sites } from './config/sites.js';
import type { UniversalPage, SiteModeConfig } from './config/site-modes.js';

async function main() {
  const site = sites.garage;

  // Build a minimal UniversalPage for vidange-perpignan
  const page: UniversalPage = {
    siteKey: 'garage',
    slug: 'vidange-perpignan',
    pageType: 'city_service',
    intent: 'service',
    city: {
      name: 'Perpignan',
      slug: 'perpignan',
      postalCode: '66000',
      distanceFromBase: '0 km',
    },
    service: {
      name: 'Vidange',
      slug: 'vidange',
      keywords: ['vidange', 'huile moteur', 'vidange voiture'],
    },
    site: site,
    modeConfig: {
      mode: 'local',
      brand: {
        tone: 'professionnel et rassurant',
        personality: 'Garage de proximité expert',
        wordsToUse: ['expertise', 'confiance', 'proximité'],
        wordsToAvoid: ['pas cher', 'discount'],
        ctaStyle: 'appel direct',
        uniqueSellingPoints: ['20 ans d\'expérience', 'Toutes marques', 'Sans rendez-vous'],
        experienceProof: 'Plus de 20 ans d\'expérience en mécanique automobile',
      },
      enabledIntents: ['service', 'city_hub'],
      content: {
        minWordCount: 800,
        maxWordCount: 1500,
        seoSectionCount: 5,
        faqCount: 6,
        language: 'fr',
        includeUpdatedDate: true,
      },
      cocooning: {
        pillarPages: ['vidange-perpignan'],
        clusterDepth: 1,
        maxInternalLinks: 5,
      },
    },
  };

  const outputDir = '/home/ubuntu/sites/Site_Garage/public/images/generated';

  console.log('Generating hero image for vidange-perpignan...\n');

  const result = await generatePageImages(page, outputDir, {
    heroImage: true,
    contentImages: 0,  // Only hero for this test
  });

  if (result.hero) {
    console.log('\n=== RESULT ===');
    console.log(`File:   ${result.hero.filepath}`);
    console.log(`Alt:    ${result.hero.alt}`);
    console.log(`Size:   ${result.hero.sizeKb} KB`);
    console.log(`Dims:   ${result.hero.width}x${result.hero.height}`);
    console.log(`Model:  ${result.hero.model}`);
    console.log(`Prompt: ${result.hero.prompt.slice(0, 150)}...`);
    console.log(`\nSaved to: ${outputDir}/${result.hero.filename}`);
  } else {
    console.log('No image generated.');
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
