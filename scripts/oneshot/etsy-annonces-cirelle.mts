/**
 * Réécriture des 19 annonces Etsy de Maison Cirelle (boutique 55596155) — 2026-10-28.
 *
 * Les annonces portaient l'ancien concept (« glacé », virgules en série, 10-11 tags
 * sur 13, aucune matière, une seule section). Ici : titre, 13 tags, matières,
 * description et section construits depuis les FAITS du site (attributs produit +
 * intro de la fiche `produit/<slug>`, relue le 28/10), mêmes mots-clés que le site.
 * Rien d'inventé : pas de durée pour les gourmandes, pas de mèche citée hors des
 * bougies parfumées (mèche en bois visible sur les photos), pas de prix, pas de lien.
 *
 *   npx tsx scripts/oneshot/etsy-annonces-cirelle.mts <relecture.md>          # génère, n'envoie rien
 *   npx tsx scripts/oneshot/etsy-annonces-cirelle.mts <relecture.md> --apply  # publie sur Etsy
 */
import { writeFileSync } from 'fs';
import { getSupabase } from '../../src/db/client';
import { ETSY_SHOP_ID, etsy } from '../../src/etsy/client';

const OUT = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!OUT) throw new Error('chemin du fichier de relecture attendu');

type Kind = 'bougie' | 'gourmande' | 'coffret' | 'snapbar';
type Scent = 'Floral' | 'Fresh' | 'Herbal' | 'Woody' | 'Musk' | 'Fruity';
type Spec = { kind: Kind; parfum: string; tags: string[]; title?: string; scent?: Scent };

const SPECS: Record<string, Spec> = {
  'bougie-adoucissant-linge-propre': { kind: 'bougie', parfum: 'Adoucissant, linge propre', tags: ['bougie linge propre', 'odeur linge propre'], scent: 'Fresh' },
  'bougie-cachemire-et-soie': { kind: 'bougie', parfum: 'Cachemire et soie', tags: ['bougie cachemire', 'bougie poudrée'], scent: 'Musk' },
  'bougie-eucalyptus': { kind: 'bougie', parfum: 'Eucalyptus', tags: ['bougie eucalyptus', 'bougie fraîche'], scent: 'Herbal' },
  'bougie-jasmin': { kind: 'bougie', parfum: 'Jasmin', tags: ['bougie jasmin', 'bougie florale'], scent: 'Floral' },
  'bougie-monoi': { kind: 'bougie', parfum: 'Monoï', tags: ['bougie monoï', 'bougie exotique'], scent: 'Floral' },
  'bougie-milkshake-cerise': { kind: 'gourmande', parfum: 'Cerise', tags: ['bougie milkshake', 'bougie cerise', 'bougie faux glaçons'], title: 'Bougie gourmande milkshake Cerise', scent: 'Fruity' },
  'bougie-milkshake-peche': { kind: 'gourmande', parfum: 'Pêche', tags: ['bougie milkshake', 'bougie pêche', 'bougie faux glaçons'], title: 'Bougie gourmande milkshake Pêche', scent: 'Fruity' },
  'bougie-smoothie-myrtille': { kind: 'gourmande', parfum: 'Myrtille', tags: ['bougie smoothie', 'bougie myrtille', 'bougie faux glaçons'], title: 'Bougie gourmande smoothie Myrtille', scent: 'Fruity' },
  'bougie-cookie-chocolat': { kind: 'gourmande', parfum: 'Cookie, chocolat et latte', tags: ['bougie cookie', 'bougie chocolat', 'bougie latte'], title: 'Bougie gourmande Cookie chocolat latte' },
  'bougie-tasse-cerise': { kind: 'gourmande', parfum: 'Cerise', tags: ['bougie tasse', 'bougie cerise', 'bougie en tasse'], title: 'Bougie tasse dessert Cerise', scent: 'Fruity' },
  'bougie-tasse-fleur-de-coton': { kind: 'gourmande', parfum: 'Fleur de coton', tags: ['bougie tasse', 'bougie fleur coton', 'bougie en tasse'], title: 'Bougie tasse dessert Fleur de coton', scent: 'Fresh' },
  'coffret-fondants-ambre-gris-santal': { kind: 'coffret', parfum: 'Ambre gris et bois de santal', tags: ['fondant ambre', 'fondant santal', 'parfum boisé'], scent: 'Woody' },
  'coffret-fondants-eucalyptus-patchouli': { kind: 'coffret', parfum: 'Eucalyptus et patchouli', tags: ['fondant eucalyptus', 'fondant patchouli', 'parfum frais'], scent: 'Herbal' },
  'coffret-fondants-fleur-de-coton-jasmin': { kind: 'coffret', parfum: 'Fleur de coton et jasmin', tags: ['fondant jasmin', 'fondant fleur coton', 'parfum floral'], scent: 'Floral' },
  'coffret-fondants-lavande-rose': { kind: 'coffret', parfum: 'Lavande et rose ancienne', tags: ['fondant lavande', 'fondant rose', 'parfum floral'], scent: 'Floral' },
  'coffret-fondants-linge-propre-poudre-de-riz': { kind: 'coffret', parfum: 'Linge propre et poudre de riz', tags: ['fondant linge propre', 'fondant poudré', 'odeur de propre'], scent: 'Fresh' },
  'coffret-fondants-monoi': { kind: 'coffret', parfum: 'Monoï', tags: ['fondant monoï', 'parfum exotique', 'parfum vacances'], scent: 'Floral' },
  'fondant-parfume-snapbar': { kind: 'snapbar', parfum: '12 parfums au choix', tags: [] },
};

const COMMON: Record<Kind, string[]> = {
  bougie: ['bougie parfumée', 'bougie cire de soja', 'bougie artisanale', 'bougie fait main', 'parfum de grasse', 'bougie naturelle', 'bougie mèche bois', 'bougie vegan', 'idée cadeau femme', 'cadeau noël', 'déco maison'],
  gourmande: ['bougie gourmande', 'bougie dessert', 'bougie fantaisie', 'bougie originale', 'bougie cire de soja', 'parfum de grasse', 'bougie fait main', 'cadeau original', 'déco gourmande', 'idée cadeau noël'],
  coffret: ['fondant parfumé', 'fondants parfumés', 'coffret fondants', 'wax melt', 'cire parfumée', 'brûle parfum', 'fondant cire soja', 'parfum de grasse', 'coffret cadeau', 'fait main'],
  snapbar: ['fondant parfumé', 'fondants parfumés', 'snapbar', 'wax melt', 'cire parfumée', 'brûle parfum', 'fondant cire soja', 'parfum de grasse', 'fondant sécable', 'tablette fondant', 'fait main', 'petit cadeau', 'cadeau collègue'],
};
const MATERIALS: Record<Kind, string[]> = {
  bougie: ['cire de soja', 'parfum de Grasse', 'mèche en bois'],
  gourmande: ['cire de soja', 'gel pour bougie', 'parfum de Grasse'],
  coffret: ['cire de soja', 'parfum de Grasse'],
  snapbar: ['cire de soja', 'parfum de Grasse'],
};
const SECTION: Record<Kind, string> = {
  bougie: 'Bougies parfumées',
  gourmande: 'Bougies gourmandes',
  coffret: 'Fondants parfumés',
  snapbar: 'Fondants parfumés',
};
const USAGE: Record<Kind, string[]> = {
  bougie: [
    'Au premier allumage, laissez-la brûler jusqu’à ce que toute la surface soit fondue, pour éviter qu’elle ne creuse.',
    'Coupez la mèche à 5 mm avant chaque utilisation.',
    'Ne laissez jamais une bougie allumée sans surveillance.',
  ],
  gourmande: [
    'Au premier allumage, laissez la surface fondre jusqu’aux bords.',
    'Coupez la mèche à 5 mm avant chaque utilisation.',
    'Posez-la sur une surface stable et ne la laissez jamais allumée sans surveillance. Elle fait aussi une jolie déco éteinte.',
  ],
  coffret: [
    'Posez un fondant dans la coupelle sèche d’un brûle-parfum, sans eau.',
    'Allumez une bougie chauffe-plat dessous : la cire fond et parfume la pièce.',
    'Quand le parfum faiblit, laissez la cire refroidir et retirez-la d’un bloc.',
  ],
  snapbar: [
    'Cassez un segment et posez-le dans la coupelle sèche d’un brûle-parfum, sans eau.',
    'Un segment pour une petite pièce, deux ou trois pour un salon.',
    'Quand le parfum faiblit, laissez la cire refroidir et retirez-la d’un bloc.',
  ],
};

// Titres courts et lisibles (consigne Etsy depuis 2023, ~15 mots au plus) : les mots-clés
// longue traîne sont portés par les 13 tags et les attributs, lus avec le titre.
function titleFor(kind: Kind, s: Spec, format?: string): string {
  const f = format ? ` ${format}` : '';
  switch (kind) {
    case 'bougie':
      return `Bougie parfumée ${s.parfum} – cire de soja, parfum de Grasse, fait main`;
    case 'gourmande':
      return s.title!.includes('tasse')
        ? `${s.title} – bougie gourmande en cire de soja, parfum de Grasse`
        : `${s.title}${f} – bougie dessert en cire de soja, parfum de Grasse`;
    case 'coffret':
      return `Coffret de 8 fondants parfumés ${s.parfum} – cire de soja, parfum de Grasse`;
    case 'snapbar':
      return 'Fondant parfumé Snapbar sécable – cire de soja, 12 parfums de Grasse';
  }
}

const sb = getSupabase();
const { data: products } = await sb
  .from('products')
  .select('slug, name, attributes, product_variants(sku, name)')
  .eq('site_key', 'poopy');
const { data: pages } = await sb.from('seo_pages').select('slug, content').eq('site_key', 'poopy').like('slug', 'produit/%');
const intro = new Map((pages ?? []).map((p) => [p.slug.slice('produit/'.length), String((p.content as { intro?: string }).intro ?? '')]));

// Attributs Etsy (nom de propriété → valeurs) : traités comme des tags en plus, et filtres de recherche.
type Draft = { listing: string; slug: string; kind: Kind; title: string; tags: string[]; materials: string[]; section: string; description: string; props: Record<string, string[]> };
function propsFor(kind: Kind, scent?: Scent): Record<string, string[]> {
  const p: Record<string, string[]> = { 'Material features': ['Vegan'], Holiday: ['Christmas'], Occasion: ['Birthday'] };
  if (scent) p.Scent = [scent];
  if (kind === 'bougie') Object.assign(p, { 'Wick material': ['Wood'], 'Number of wicks': ['1'] });
  if (kind === 'bougie' || kind === 'gourmande') p.Room = ['Living room', 'Bedroom'];
  return p;
}
const drafts: Draft[] = [];
for (const p of products ?? []) {
  const spec = SPECS[p.slug];
  if (!spec) throw new Error(`pas de spec pour ${p.slug}`);
  const attrs = p.attributes as Record<string, string>;
  const byListing = new Map<string, string>();
  for (const v of (p as unknown as { product_variants: { sku: string; name: string }[] }).product_variants)
    byListing.set(v.sku.split('-')[1], v.name);
  for (const [listing, variantName] of byListing) {
    const format = byListing.size > 1 ? variantName : undefined;
    const facts = Object.entries(attrs)
      .filter(([k]) => k !== 'Usage')
      .map(([k, v]) => `• ${k} : ${format && k === 'Poids' ? format : v}`);
    const text = intro.get(p.slug)?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '') ?? '';
    const description = [
      text,
      '',
      '✦ EN BREF',
      ...facts,
      '',
      '✦ UTILISATION',
      ...USAGE[spec.kind].map((u) => `• ${u}`),
      '',
      '✦ FAIT MAIN',
      'Coulé à la main par petites séries, en cire de soja naturelle, avec des parfums de Grasse.',
      '',
      '✦ LIVRAISON',
      'En point relais Mondial Relay, en France et dans 8 pays d’Europe. Commande préparée sous 1 à 2 jours ouvrés, numéro de suivi envoyé à l’expédition.',
    ].join('\n');
    const tags = [...COMMON[spec.kind], ...spec.tags];
    drafts.push({ listing, slug: p.slug, kind: spec.kind, title: titleFor(spec.kind, spec, format), tags, materials: MATERIALS[spec.kind], section: SECTION[spec.kind], description, props: propsFor(spec.kind, spec.scent) });
  }
}

// Contrôles Etsy : titre ≤ 140, 13 tags uniques ≤ 20 caractères, rien d'interdit.
const FORBIDDEN = /€|\d+[,.]\d\d|crémeux|bijou|huiles? essentielles?|http|www\./i;
// « glacé » reste dans les descriptions (caractéristique exacte du site), pas dans les titres (0 recherche).
const FORBIDDEN_TITLE = /glacé/i;
let bad = 0;
for (const d of drafts) {
  const errs = [
    d.title.length > 140 && `titre ${d.title.length} car.`,
    d.tags.length !== 13 && `${d.tags.length} tags`,
    new Set(d.tags).size !== d.tags.length && 'tag en double',
    ...d.tags.filter((t) => t.length > 20).map((t) => `tag trop long « ${t} »`),
    FORBIDDEN.test(d.title + d.description) && `interdit : ${(d.title + d.description).match(FORBIDDEN)![0]}`,
    FORBIDDEN_TITLE.test(d.title) && 'titre : glacé',
  ].filter(Boolean);
  if (errs.length) {
    bad++;
    console.error(d.slug, d.listing, errs.join(' · '));
  }
}
drafts.sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title));
writeFileSync(
  OUT,
  drafts
    .map((d) => `## ${d.title}\nAnnonce ${d.listing} · section « ${d.section} » · ${d.title.length} car.\n\nTags : ${d.tags.join(' · ')}\nMatières : ${d.materials.join(', ')}\nAttributs : ${Object.entries(d.props).map(([k, v]) => `${k}=${v.join('/')}`).join(' ; ')}\n\n${d.description}\n`)
    .join('\n---\n\n'),
);
console.log(`${drafts.length} annonces générées, ${bad} en erreur → ${OUT}`);
if (bad || !APPLY) process.exit(bad ? 1 : 0);

// ── Publication ─────────────────────────────────────────────────────
const sections = await etsy<{ results: { shop_section_id: number; title: string }[] }>(`/shops/${ETSY_SHOP_ID}/sections`);
const sectionId = new Map(sections.results.map((s) => [s.title, s.shop_section_id]));
// L'unique section existante « Bougie Artisanale » devient « Bougies parfumées ».
const legacy = sectionId.get('Bougie Artisanale');
if (legacy && !sectionId.has('Bougies parfumées')) {
  await etsy(`/shops/${ETSY_SHOP_ID}/sections/${legacy}`, { method: 'PUT', form: { title: 'Bougies parfumées' } });
  sectionId.set('Bougies parfumées', legacy);
}
for (const title of new Set(drafts.map((d) => d.section)))
  if (!sectionId.has(title)) {
    const s = await etsy<{ shop_section_id: number }>(`/shops/${ETSY_SHOP_ID}/sections`, { method: 'POST', form: { title } });
    sectionId.set(title, s.shop_section_id);
  }
for (const d of drafts) {
  try {
    await etsy(`/shops/${ETSY_SHOP_ID}/listings/${d.listing}`, {
      method: 'PATCH',
      form: {
        title: d.title,
        description: d.description,
        tags: d.tags.join(','),
        materials: d.materials.join(','),
        shop_section_id: String(sectionId.get(d.section)),
      },
    });
    const listing = await etsy<{ taxonomy_id: number }>(`/listings/${d.listing}`);
    const props = await etsy<{ results: { property_id: number; name: string; possible_values: { value_id: number; name: string }[] }[] }>(
      `/seller-taxonomy/nodes/${listing.taxonomy_id}/properties`,
    );
    const skipped: string[] = [];
    for (const [name, values] of Object.entries(d.props)) {
      const prop = props.results.find((x) => x.name === name);
      const ids = values.map((v) => prop?.possible_values.find((pv) => pv.name === v)?.value_id);
      if (!prop || ids.some((id) => id === undefined)) {
        skipped.push(name);
        continue;
      }
      await etsy(`/shops/${ETSY_SHOP_ID}/listings/${d.listing}/properties/${prop.property_id}`, {
        method: 'PUT',
        form: { value_ids: ids.join(','), values: values.join(',') },
      });
    }
    console.log('ok', d.listing, d.title.slice(0, 60), skipped.length ? `(attributs absents de la catégorie : ${skipped.join(', ')})` : '');
  } catch (e) {
    console.error('ERREUR', d.listing, (e as Error).message.slice(0, 200));
  }
}
