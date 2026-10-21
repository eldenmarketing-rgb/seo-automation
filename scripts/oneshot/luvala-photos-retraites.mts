// Oneshot 2026-10-21 — pose un hero + des photos de section (public/images du site Luvala) sur les 7 pages
// /retraites/<slug> publiées le même jour, puis purge le cache CMS et relit chaque URL. `--apply` écrit.
import sharp from 'sharp';
import { getSupabase } from '../../src/db/client.ts';
const APPLY = process.argv.includes('--apply');
const ROOT = '/home/ubuntu/sites/luvala/public';
const ALT: Record<string, string> = {
  'paysages/alberes-cretes-garrigue': 'Crêtes des Albères couvertes de garrigue sous un ciel dégagé',
  'paysages/alberes-vignes-pins-tour-madeloc': 'Vignes et pins des Albères avec la tour de la Madeloc au loin',
  'paysages/massif-canigou-foret': 'Massif du Canigou vu depuis la forêt, Pyrénées-Orientales',
  'paysages/panorama-cote-vermeille-collioure': 'Panorama de la côte Vermeille vers Collioure',
  'paysages/plage-galets-alberes-mediterranee': 'Plage de galets au pied des Albères, face à la Méditerranée',
  'lieu/retraite-mas-pierre-argeles-alberes': 'Mas en pierre à Argelès-sur-Mer, au pied des Albères',
  'lieu/retraite-mas-rustique-mediterranee': 'Mas rustique méditerranéen, terrasse ombragée',
  'lieu/retraite-maison-pierre-fleurs-sud-france': 'Maison en pierre fleurie dans le sud de la France',
  'lieu/cote-vermeille-collioure-pyrenees-orientales': 'Côte Vermeille et Collioure, Pyrénées-Orientales',
  'pratique/retraite-yoga-plein-air-mediterranee': 'Séance de yoga en plein air face à la Méditerranée',
  'pratique/retraite-salle-pratique-lumiere-naturelle': 'Salle de pratique du mas, tapis et lumière naturelle',
  'pratique/retraite-yoga-studio-bois-intimiste': 'Studio de yoga en bois, ambiance intimiste',
  'cuisine/retraite-cuisine-bio-vegetarienne': 'Cuisine bio et végétarienne servie pendant la retraite',
  'introspective/retraite-meditation-groupe-nature': 'Groupe en méditation assise dans la nature',
  'introspective/retraite-meditation-introspective-plein-air': 'Méditation introspective en plein air',
};
// slug → { hero, sections: { index 0-based: image } }
// Conteneurs hero et section en 16/9 avec recadrage : seules les 8 photos en paysage sont utilisées.
const PLAN: Record<string, { hero: string; sections: Record<number, string> }> = {
  'retraites/stage-yoga': { hero: 'pratique/retraite-yoga-studio-bois-intimiste', sections: { 1: 'paysages/alberes-vignes-pins-tour-madeloc', 3: 'pratique/retraite-salle-pratique-lumiere-naturelle', 7: 'introspective/retraite-meditation-groupe-nature' } },
  'retraites/week-end-bien-etre-amoureux': { hero: 'paysages/plage-galets-alberes-mediterranee', sections: { 3: 'paysages/alberes-cretes-garrigue', 7: 'paysages/panorama-cote-vermeille-collioure' } },
  'retraites/retraite-vipassana': { hero: 'introspective/retraite-meditation-groupe-nature', sections: { 2: 'pratique/retraite-salle-pratique-lumiere-naturelle', 4: 'paysages/massif-canigou-foret' } },
  'retraites/sejour-detente': { hero: 'paysages/panorama-cote-vermeille-collioure', sections: { 1: 'paysages/alberes-vignes-pins-tour-madeloc', 5: 'pratique/retraite-yoga-studio-bois-intimiste', 6: 'paysages/plage-galets-alberes-mediterranee', 7: 'introspective/retraite-meditation-groupe-nature' } },
  'retraites/stage-yoga-randonnee': { hero: 'paysages/alberes-vignes-pins-tour-madeloc', sections: { 4: 'paysages/alberes-cretes-garrigue', 6: 'pratique/retraite-salle-pratique-lumiere-naturelle', 10: 'paysages/massif-canigou-foret', 11: 'paysages/panorama-cote-vermeille-collioure', 13: 'introspective/retraite-meditation-groupe-nature' } },
  'retraites/retraite-yoga-debutant': { hero: 'pratique/retraite-yoga-studio-bois-intimiste', sections: { 2: 'pratique/retraite-salle-pratique-lumiere-naturelle', 5: 'paysages/plage-galets-alberes-mediterranee' } },
  'retraites/retraite-yoga-pyrenees': { hero: 'paysages/massif-canigou-foret', sections: { 1: 'pratique/retraite-salle-pratique-lumiere-naturelle', 2: 'paysages/alberes-cretes-garrigue' } },
};
const dims = new Map<string, { width: number; height: number }>();
async function img(key: string) {
  if (!dims.has(key)) { const m = await sharp(`${ROOT}/images/${key}.jpg`).metadata(); dims.set(key, { width: m.width!, height: m.height! }); }
  return { src: `/images/${key}.jpg`, alt: ALT[key], ...dims.get(key)! };
}
const sb = getSupabase();
for (const [slug, plan] of Object.entries(PLAN)) {
  const { data, error } = await sb.from('seo_pages').select('id,content').eq('site_key','retraite').eq('slug', slug).single();
  if (error || !data) throw error ?? new Error(slug);
  const content = data.content as { heroImage?: unknown; seoSections: { title: string; image?: unknown }[] };
  const hero = await img(plan.hero);
  const sections = [...content.seoSections];
  for (const [i, key] of Object.entries(plan.sections)) { const n = Number(i); if (!sections[n]) throw new Error(`${slug} §${n} absent`); sections[n] = { ...sections[n], image: await img(key) }; }
  console.log(`== ${slug}\n   hero ← ${hero.src} (${hero.width}×${hero.height})`);
  for (const [i, key] of Object.entries(plan.sections)) console.log(`   §${Number(i)+1} ${sections[Number(i)].title.slice(0,50)} ← ${key}`);
  if (!APPLY) continue;
  const { error: up } = await sb.from('seo_pages').update({ content: { ...content, heroImage: hero, seoSections: sections }, updated_at: new Date().toISOString() }).eq('id', data.id);
  if (up) throw up;
}
if (!APPLY) { console.log('\n(simulation — relancer avec --apply)'); process.exit(0); }
const { data: sp } = await sb.from('site_profiles').select('revalidate_url, revalidate_secret').eq('site_key','retraite').single();
const slugs = Object.keys(PLAN);
const res = await fetch(sp!.revalidate_url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(sp!.revalidate_secret ? { Authorization: `Bearer ${sp!.revalidate_secret}` } : {}) }, body: JSON.stringify({ tags: [...slugs.map(s => `page:retraite:${s}`), 'pages:retraite'], paths: slugs.map(s => `/${s}`) }), signal: AbortSignal.timeout(20_000) });
console.log(`revalidate HTTP ${res.status} : ${(await res.text()).slice(0, 160)}`);
await new Promise(r => setTimeout(r, 4000));
for (const s of slugs) {
  const html = await (await fetch(`https://retraitebienetre.fr/${s}`, { cache: 'no-store' })).text();
  const n = (html.match(/\/images\/(paysages|lieu|pratique|cuisine|introspective)\//g) ?? []).length;
  console.log(`en ligne /${s} : ${n} référence(s) d'image, attendu ≥ ${1 + Object.keys(PLAN[s].sections).length}`);
}
