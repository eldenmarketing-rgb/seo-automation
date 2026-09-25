/**
 * Jetable — 2026-09-25 : remplace le mobile 06 23 15 35 04 par le fixe Quicktalk
 * 04 49 39 27 45 dans le profil du site garage et dans le contenu CMS des pages
 * qui le citent en clair. Le trigger `trg_seo_pages_revision` archive chaque
 * page avant écriture ; on étiquette la révision, puis on purge le cache CMS.
 * Usage : npx tsx scripts/oneshot/garage-phone-0449.mts [--apply]
 */
import { getSupabase } from '../../src/db/client.js';

const APPLY = process.argv.includes('--apply');
const OLD = /06[ .]?23[ .]?15[ .]?35[ .]?04|\+33 ?6 ?23 ?15 ?35 ?04|0623153504/g;
const NEW_TEXT = '04 49 39 27 45';
const sb = getSupabase();

const swap = (s: string) =>
  s.replace(OLD, (m) => (m.startsWith('+33') ? '+33 4 49 39 27 45' : m.startsWith('06') && !m.includes(' ') && !m.includes('.') ? '0449392745' : NEW_TEXT));

// 1. Profil
const { data: prof } = await sb.from('site_profiles').select('phone').eq('site_key', 'garage').single();
console.log(`site_profiles.phone : ${prof?.phone} → ${NEW_TEXT}`);
if (APPLY) {
  const { error } = await sb.from('site_profiles').update({ phone: NEW_TEXT }).eq('site_key', 'garage');
  if (error) throw new Error(error.message);
}

// 2. Pages
const { data: pages, error: e1 } = await sb
  .from('seo_pages')
  .select('id, slug, status, content, meta_title, meta_description, h1')
  .eq('site_key', 'garage');
if (e1) throw new Error(e1.message);

const touched: { slug: string; status: string }[] = [];
for (const p of pages ?? []) {
  const before = JSON.stringify(p.content ?? {});
  const fields = { meta_title: p.meta_title ?? '', meta_description: p.meta_description ?? '', h1: p.h1 ?? '' };
  const nContent = (before.match(OLD) || []).length;
  const nFields = Object.values(fields).join('\n').match(OLD)?.length ?? 0;
  if (!nContent && !nFields) continue;
  console.log(`${p.slug} (${p.status}) : ${nContent} dans le contenu, ${nFields} dans title/meta/h1`);
  touched.push({ slug: p.slug, status: p.status });
  if (!APPLY) continue;
  const patch: Record<string, unknown> = {};
  if (nContent) patch.content = JSON.parse(swap(before));
  for (const [k, v] of Object.entries(fields)) if (OLD.test(v)) patch[k] = swap(v);
  const { error } = await sb.from('seo_pages').update(patch).eq('id', p.id);
  if (error) throw new Error(`${p.slug}: ${error.message}`);
  const { data: rev } = await sb
    .from('seo_page_revisions')
    .select('id, revision_number')
    .eq('page_id', p.id)
    .is('change_reason', null)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (rev) {
    await sb
      .from('seo_page_revisions')
      .update({ change_reason: 'numéro : mobile 06 23 15 35 04 → fixe Quicktalk 04 49 39 27 45', change_author: 'claude' })
      .eq('id', rev.id);
    console.log(`   révision v${rev.revision_number} étiquetée`);
  } else console.log('   (aucune révision créée par le trigger ?)');
}
console.log(`${touched.length} pages ${APPLY ? 'mises à jour' : 'à mettre à jour'}`);

// 3. Purge du cache CMS (mêmes tags/paths que revalidateCms du dashboard)
const slugs = touched.filter((t) => t.status === 'published').map((t) => t.slug);
if (APPLY && slugs.length) {
  const { data: d } = await sb.from('site_profiles').select('revalidate_url, revalidate_secret').eq('site_key', 'garage').single();
  const res = await fetch(d!.revalidate_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(d!.revalidate_secret ? { Authorization: `Bearer ${d!.revalidate_secret}` } : {}) },
    body: JSON.stringify({ tags: [...slugs.map((s) => `page:garage:${s}`), 'pages:garage'], paths: slugs.map((s) => `/${s}`) }),
    signal: AbortSignal.timeout(20_000),
  });
  console.log(`revalidate HTTP ${res.status} : ${(await res.text()).slice(0, 200)}`);
}
