/**
 * Jetable — 2026-09-25 : le diagnostic du garage n'est PAS gratuit. Retire la promesse
 * « diagnostic gratuit » du profil (USP + mot interdit) et des pages CMS garage : phrases
 * réécrites à la main (FAQ, sections) + règles génériques sur les formules courtes.
 * Le devis, lui, reste gratuit. Le trigger archive chaque page ; on étiquette la révision
 * et on purge le cache CMS. Corrige aussi l'ancien numéro resté dans `schema_org`.
 * Usage : npx tsx scripts/oneshot/garage-sans-diagnostic-gratuit.mts [--apply]
 */
import { getSupabase } from '../../src/db/client.js';

const APPLY = process.argv.includes('--apply');
const sb = getSupabase();

// Phrases entières, par page → chemin (avant → après). Vérifiées une à une.
const EXACT: [string, string][] = [
  ['Le diagnostic est gratuit et le parking l\'est aussi, sur place.', 'Le parking est gratuit sur place.'],
  ['Chaque pièce figure sur sa propre ligne, gratuitement et sans engagement.', 'Chaque pièce figure sur sa propre ligne, sur un devis gratuit et sans engagement.'],
  ['Diagnostic visuel gratuit pour une réponse précise.', 'Passez à l\'atelier pour une réponse précise.'],
  ['et le diagnostic est gratuit : vous saurez immédiatement', 'et la lecture se fait dès l\'arrivée : vous saurez immédiatement'],
  ['Ce diagnostic est gratuit et vous repartez en sachant.', 'Vous repartez en sachant à quoi vous en tenir.'],
  ['Ce diagnostic est réalisé gratuitement avant toute intervention, pour', 'Ce diagnostic est réalisé avant toute intervention, pour'],
  ['Le diagnostic est-il vraiment gratuit, même si je ne fais pas réparer chez vous ?', 'Suis-je obligé de faire réparer chez vous après le diagnostic ?'],
  ['Oui. Le diagnostic est réalisé gratuitement avant toute intervention, et il ne vous engage à rien.', 'Non. Le diagnostic est réalisé avant toute intervention et ne vous engage à rien.'],
  ['Non, le diagnostic est gratuit, y compris lorsqu\'il conclut que vos injecteurs ne sont pas en cause. Il est suivi', 'Le diagnostic est une prestation à part entière, dont le montant vous est annoncé avant de commencer. Il est suivi'],
  ['vous repartez avec votre voiture sans rien payer pour le diagnostic.', 'vous repartez avec votre voiture et le résultat du diagnostic.'],
  ['Le diagnostic est gratuit. Nous vous indiquons', 'Nous vous indiquons'],
  ['Nous contrôlons cet ensemble gratuitement, puis nous chiffrons.', 'Nous contrôlons cet ensemble à l\'atelier, puis nous chiffrons.'],
  ['Ce diagnostic est gratuit, et il est indispensable :', 'Ce diagnostic est indispensable :'],
  ['Diagnostic gratuit avant toute intervention : la compatibilité', 'Compatibilité vérifiée avant toute intervention : la compatibilité'],
  ['Le diagnostic préalable est gratuit et sert à écarter', 'Le diagnostic préalable sert à écarter'],
  ['Ce premier temps est gratuit et ne vous engage à rien.', 'Ce premier temps ne vous engage à rien.'],
  [' Ce contrôle est gratuit chez nous.', ''],
  ['Diagnostic sonore et visuel gratuit avant toute intervention.', 'Diagnostic sonore et visuel avant toute intervention.'],
  ['pièce défaillante. Gratuit et sans engagement.', 'pièce défaillante. Sans engagement.'],
  ['Nous effectuons ce diagnostic gratuitement.', 'Nous effectuons ce diagnostic à l\'atelier.'],
  ['Cette étape est gratuite et elle change', 'Cette étape change'],
  ['[contrôles électroniques réalisés gratuitement avant intervention]', '[contrôles électroniques réalisés avant intervention]'],
  ['une proposition de vérification gratuite de l\'échéance', 'une proposition de vérification de l\'échéance'],
  ['Un contrôle gratuit permet de décider', 'Un contrôle à l\'atelier permet de décider'],
  ['Un diagnostic préalable annoncé comme gratuit, avec', 'Un diagnostic préalable annoncé clairement, avec'],
  ['Un diagnostic gratuit et clairement expliqué', 'Un diagnostic clairement expliqué'],
  ['Craquements, passages difficiles ? Diagnostic gratuit.', 'Craquements, passages difficiles ? Diagnostic à l\'atelier, devis gratuit.'],
  ['Diagnostic gratuit, toutes marques', 'Diagnostic à l\'atelier, toutes marques'],
];

// Valeurs entières des « signaux de confiance » sous le libellé Diagnostic.
const WHOLE: Record<string, string> = {
  'Gratuit avant toute intervention': 'Systématique avant toute intervention',
  'Gratuit et sans engagement avant toute intervention': 'Systématique et sans engagement avant toute intervention',
};

// Règles génériques (ordre important). Le devis reste gratuit, le diagnostic ne l'est plus.
const RULES: [RegExp, string][] = [
  [/Ce diagnostic reste gratuit, y compris lorsqu'il[^.]*\.\s?/g, ''],
  [/([Dd])iagnostic et devis (détaillé )?gratuits/g, '$1iagnostic, devis $2gratuit'],
  [/([Dd])iagnostic et devis gratuit\b/g, '$1iagnostic, puis devis gratuit'],
  [/(: |\? )([Dd])iagnostic gratuit$/g, '$1$2iagnostic, devis gratuit'],
  [/([Dd])iagnostic (freinage |électronique |visuel |préalable )?gratuit(e)?\b/g, (_m: string, d: string, q?: string) => `${d}iagnostic ${q ?? ''}`.trimEnd()],
  [/([Ll]e |[Cc]e |[Nn]otre )diagnostic est gratuit\b/g, '$1diagnostic est réalisé avant toute intervention'],
  [/diagnostic (est )?réalisé gratuitement/g, 'diagnostic réalisé'],
  [/06 23 15 35 04/g, '04 49 39 27 45'],
  [/\+33623153504/g, '+33449392745'],
];

const rewrite = (s: string): string => {
  if (WHOLE[s]) return WHOLE[s];
  let out = s;
  for (const [a, b] of EXACT) out = out.split(a).join(b);
  for (const [re, rep] of RULES) out = out.replace(re, rep as string);
  return out.replace(/  +/g, ' ');
};

// Reste suspect : une phrase où « gratuit » ne qualifie ni le devis, ni le parking, ni l'estimation au téléphone.
const suspect = (t: string) => t.split(/(?<=[.!?])\s+|\n/).filter((x) => /gratuit|offert/i.test(x) && !/devis|parking|estimation/i.test(x));
const changes: string[] = [];
const leftovers: string[] = [];
const walk = (v: unknown, path: string): unknown => {
  if (typeof v === 'string') {
    if (path.includes('brief.serp')) return v; // faits concurrents, pas notre texte
    const n = rewrite(v);
    if (n !== v) changes.push(`${path}\n   − ${v.replace(/\s+/g, ' ').slice(0, 220)}\n   + ${n.replace(/\s+/g, ' ').slice(0, 220)}`);
    for (const x of suspect(n)) leftovers.push(`${path}: ${x.trim().replace(/\s+/g, ' ').slice(0, 300)}`);
    return n;
  }
  if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}[${i}]`));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, path ? `${path}.${k}` : k)]));
  return v;
};

// 1. Profil
const { data: prof } = await sb.from('site_profiles').select('brand').eq('site_key', 'garage').single();
const brand = prof!.brand as { uniqueSellingPoints: string[]; wordsToAvoid: string[] };
const usp = brand.uniqueSellingPoints.filter((u) => !/diagnostic gratuit/i.test(u));
const avoid = brand.wordsToAvoid.includes('diagnostic gratuit') ? brand.wordsToAvoid : [...brand.wordsToAvoid, 'diagnostic gratuit', 'diagnostic offert'];
console.log(`profil : USP ${brand.uniqueSellingPoints.length} → ${usp.length} ; wordsToAvoid + « diagnostic gratuit », « diagnostic offert »`);
if (APPLY) {
  const { error } = await sb.from('site_profiles').update({ brand: { ...brand, uniqueSellingPoints: usp, wordsToAvoid: avoid } }).eq('site_key', 'garage');
  if (error) throw new Error(error.message);
}

// 2. Pages
const { data: pages, error } = await sb.from('seo_pages').select('id, slug, status, meta_title, meta_description, h1, content, schema_org').eq('site_key', 'garage').neq('status', 'redirected');
if (error) throw new Error(error.message);
const touched: { slug: string; status: string }[] = [];
for (const p of pages ?? []) {
  const before = changes.length;
  const patch = walk({ meta_title: p.meta_title, meta_description: p.meta_description, h1: p.h1, content: p.content, schema_org: p.schema_org }, '') as Record<string, unknown>;
  const mine = changes.splice(before).map((c) => `   ${c}`);
  if (!mine.length) continue;
  touched.push({ slug: p.slug, status: p.status });
  console.log(`\n=== ${p.slug} (${p.status}) — ${mine.length} champ(s)`);
  mine.forEach((c) => console.log(c));
  if (!APPLY) continue;
  const { error: e2 } = await sb.from('seo_pages').update(patch).eq('id', p.id);
  if (e2) throw new Error(`${p.slug}: ${e2.message}`);
  const { data: rev } = await sb.from('seo_page_revisions').select('id, revision_number').eq('page_id', p.id).is('change_reason', null).order('revision_number', { ascending: false }).limit(1).maybeSingle();
  if (rev) await sb.from('seo_page_revisions').update({ change_reason: 'le diagnostic n’est pas gratuit : promesse retirée, le devis reste gratuit', change_author: 'claude' }).eq('id', rev.id);
  console.log(`   → écrit${rev ? `, révision v${rev.revision_number}` : ''}`);
}
console.log(`\n${touched.length} pages ${APPLY ? 'mises à jour' : 'à mettre à jour'}`);
if (leftovers.length) { console.log('\nRESTE À REGARDER :'); leftovers.forEach((l) => console.log('  ' + l)); }

// 3. Purge
const slugs = touched.filter((t) => t.status === 'published').map((t) => t.slug);
if (APPLY && slugs.length) {
  const { data: d } = await sb.from('site_profiles').select('revalidate_url, revalidate_secret').eq('site_key', 'garage').single();
  const res = await fetch(d!.revalidate_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(d!.revalidate_secret ? { Authorization: `Bearer ${d!.revalidate_secret}` } : {}) },
    body: JSON.stringify({ tags: [...slugs.map((s) => `page:garage:${s}`), 'pages:garage'], paths: slugs.map((s) => `/${s}`) }),
    signal: AbortSignal.timeout(20_000),
  });
  console.log(`revalidate HTTP ${res.status} : ${(await res.text()).slice(0, 160)}`);
}
