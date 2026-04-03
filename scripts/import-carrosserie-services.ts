import dotenv from 'dotenv';
dotenv.config();

import { upsertSeoPage, SeoPageRow } from '../src/db/supabase.js';

const serviceSlugs = [
  'covering-wrapping-perpignan',
  'customisation-automobile-perpignan',
  'vehicule-accidente-perpignan',
  'carrosserie/perpignan',
  'carrosserie-grele/perpignan',
  'carrosserie-pas-cher/perpignan',
  'carrosserie-toutes-marques/perpignan',
  'debosselage/perpignan',
  'devis-carrosserie/perpignan',
  'lustrage/perpignan',
  'pare-brise/perpignan',
  'peinture-auto/perpignan',
  'peinture-jante/perpignan',
  'redressage-chassis/perpignan',
  'renovation-optique/perpignan',
  'reparation-carrosserie/perpignan',
  'vehicule-courtoisie/perpignan',
];

function slugToTitle(slug: string): string {
  const base = slug.replace('/perpignan', '').replace(/-/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

async function main() {
  let ok = 0;
  for (const slug of serviceSlugs) {
    const title = slugToTitle(slug);
    const row: SeoPageRow = {
      site_key: 'carrosserie',
      slug,
      page_type: 'service',
      city: 'Perpignan',
      service: slug.replace('/perpignan', ''),
      meta_title: `${title} Perpignan | Carrossier Pro`,
      meta_description: `${title} à Perpignan — devis gratuit, intervention rapide. Carrossier Pro, votre expert carrosserie.`,
      h1: `${title} à Perpignan`,
      content: {},
      status: 'published',
    };
    try {
      await upsertSeoPage(row);
      console.log(`✅ ${slug}`);
      ok++;
    } catch (e) {
      console.log(`❌ ${slug}: ${(e as Error).message}`);
    }
  }
  console.log(`\nImported: ${ok}/${serviceSlugs.length}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
