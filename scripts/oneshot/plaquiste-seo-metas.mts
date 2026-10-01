/**
 * Plaquiste Perpignan (site_key plaquiste) — titres et metas des 5 brouillons de
 * prestation ramenés aux invariants (title ≤ 60, meta ≤ 155) avant mise en ligne,
 * et le mot « jointeur » posé sur la page finitions (requête mesurée le
 * 2026-10-01 : « jointeur placo » 590/mois en France, présent dans les titres
 * des plaquistes qui rankent à Perpignan).
 *
 * Ne touche que des pages en `draft` : une page publiée se corrige dans le
 * dashboard. Idempotent. Simulation par défaut.
 *
 *   npx tsx scripts/oneshot/plaquiste-seo-metas.mts            # affiche
 *   npx tsx scripts/oneshot/plaquiste-seo-metas.mts --apply    # écrit
 */
import { getSupabase } from '../../src/db/client.js';

const SITE = 'plaquiste';
const APPLY = process.argv.includes('--apply');

const METAS: Record<string, { title: string; description: string }> = {
  'prestations/cloison-placo-perpignan': {
    title: 'Cloison placo Perpignan : pose et création de pièce',
    description:
      'Pose de cloisons en plaques de plâtre à Perpignan : chambre, bureau, salle de bain, cloison isolée ou phonique. Visite, métré et devis écrit.',
  },
  'prestations/faux-plafond-perpignan': {
    title: 'Faux plafond Perpignan : plafond suspendu en placo',
    description:
      'Pose de faux plafond à Perpignan et alentours : plafond suspendu, rampant, décaissé, spots intégrés, isolation. Visite, métré et devis écrit.',
  },
  'prestations/isolation-interieure-perpignan': {
    title: 'Isolation intérieure Perpignan : doublage des murs',
    description:
      "Isolation par l'intérieur à Perpignan : doublage des murs collé ou sur ossature, isolation thermique et phonique. Visite, métré et devis écrit.",
  },
  'prestations/amenagement-combles-perpignan': {
    title: 'Aménagement de combles Perpignan : isolation et placo',
    description:
      'Aménagement de combles à Perpignan : isolation des rampants, plafonds et cloisons en plaques de plâtre, trappes, rangements. Visite, métré et devis écrit.',
  },
  'prestations/bandes-enduit-placo-perpignan': {
    title: 'Jointeur placo Perpignan : bandes, enduit, ponçage',
    description:
      'Jointeur à Perpignan : bandes à joints, enduit et ponçage des plaques de plâtre, reprise de fissures et de joints visibles. Finition prête à peindre.',
  },
};

/** Phrase ajoutée à la fin du 1er paragraphe de l'intro de la page finitions. */
const JOINTEUR_SLUG = 'prestations/bandes-enduit-placo-perpignan';
const JOINTEUR_SENTENCE = "C'est le métier du jointeur.";

type Content = {
  intro?: string;
  seoSections?: { title?: string; content?: string }[];
  faq?: { question?: string; answer?: string }[];
  highlights?: string[];
};

const count = (s: string) => s.split(/\s+/).filter(Boolean).length;

function words(c: Content): { body: number; faq: number } {
  const body =
    count(c.intro ?? '') +
    (c.seoSections ?? []).reduce((n, s) => n + count(`${s.title ?? ''} ${s.content ?? ''}`), 0) +
    (c.highlights ?? []).reduce((n, h) => n + count(h), 0);
  const faq = (c.faq ?? []).reduce((n, f) => n + count(`${f.question ?? ''} ${f.answer ?? ''}`), 0);
  return { body, faq };
}

for (const [slug, m] of Object.entries(METAS)) {
  if (m.title.length > 60) throw new Error(`${slug} : title ${m.title.length} > 60`);
  if (m.description.length > 155) throw new Error(`${slug} : meta ${m.description.length} > 155`);
}

const sb = getSupabase();
const { data, error } = await sb
  .from('seo_pages')
  .select('id, slug, status, meta_title, meta_description, content')
  .eq('site_key', SITE)
  .in('slug', Object.keys(METAS));
if (error) throw new Error(error.message);

for (const page of data ?? []) {
  const m = METAS[page.slug];
  const content = (page.content ?? {}) as Content;
  const w = words(content);
  console.log(`\n${page.slug} [${page.status}] — ${w.body} mots + ${w.faq} de FAQ = ${w.body + w.faq}`);
  console.log(`  title ${String(page.meta_title ?? '').length} → ${m.title.length} : ${m.title}`);
  console.log(`  meta  ${String(page.meta_description ?? '').length} → ${m.description.length}`);

  if (page.status !== 'draft') {
    console.log('  ignorée : la page n’est plus un brouillon');
    continue;
  }

  const patch: Record<string, unknown> = { meta_title: m.title, meta_description: m.description };
  if (page.slug === JOINTEUR_SLUG && content.intro && !/jointeur/i.test(content.intro)) {
    const [first, ...rest] = content.intro.split(/\n{2,}/);
    patch.content = { ...page.content, intro: [`${first} ${JOINTEUR_SENTENCE}`, ...rest].join('\n\n') };
    console.log(`  intro : phrase « jointeur » ajoutée au 1er paragraphe\n    ${first} ${JOINTEUR_SENTENCE}`);
  }

  if (!APPLY) continue;
  const { error: e } = await sb.from('seo_pages').update(patch).eq('id', page.id).eq('status', 'draft');
  if (e) throw new Error(`${page.slug} : ${e.message}`);
  console.log('  écrit');
}

if (!APPLY) console.log('\nSimulation — relancer avec --apply pour écrire.');
