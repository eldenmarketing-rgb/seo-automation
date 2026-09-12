/**
 * Jetable — enregistre une version condensée (v7) comme révision proposée, puis
 * l'applique par la chaîne officielle du dashboard (/api/pages/[id]/rollback :
 * revalidation CMS + vérification en ligne).
 * Usage : npx tsx scripts/oneshot/apply-garage-v7.mts <slug> [--propose-only]
 */
import { readFileSync } from 'fs';
import { getSupabase } from '../../src/db/client.js';

const S = '/tmp/claude-1000/-home-ubuntu-sites-seo-automation/895e2515-e732-4241-8028-a3591712d85c/scratchpad';
const slug = process.argv[2];
const proposeOnly = process.argv.includes('--propose-only');
if (!slug) throw new Error('slug ?');
const v7 = JSON.parse(readFileSync(`${S}/${slug}-v7.json`, 'utf8'));
const sb = getSupabase();

const { data: page } = await sb.from('seo_pages').select('id, version, status, schema_org, content').eq('site_key', 'garage').eq('slug', slug).single();
if (!page) throw new Error('page ?');
const { data: v6 } = await sb.from('seo_page_revisions').select('id, revision_number, content').eq('site_key', 'garage').eq('slug', slug).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();
const base = (v6?.content ?? page.content) as Record<string, unknown>;

const content = {
  ...base,
  intro: v7.intro,
  seoSections: v7.seoSections,
  faq: v7.faq,
  process: v7.process,
  educationalTitle: v7.educationalTitle,
  educationalContent: v7.educationalContent,
  heroSubtitle: v7.heroSubtitle,
  ctaTitle: v7.ctaTitle,
  schemaService: v7.schemaService,
  internalLinks: v7.internalLinks ?? base.internalLinks,
  updatedDate: new Date().toISOString().slice(0, 10),
};

const { data: last } = await sb.from('seo_page_revisions').select('revision_number').eq('page_id', page.id).order('revision_number', { ascending: false }).limit(1).maybeSingle();
const { data: rev, error } = await sb.from('seo_page_revisions').insert({
  page_id: page.id,
  revision_number: (last?.revision_number ?? 0) + 1,
  page_version: page.version,
  site_key: 'garage',
  slug,
  meta_title: v7.metaTitle,
  meta_description: v7.metaDescription,
  h1: v7.h1,
  content,
  schema_org: page.schema_org,
  status: 'pending',
  change_reason: `condensation v7 — recette FAP : 5 sections, blocs du gabarit, géo maîtrisée${v6 ? ` (remplace la v${v6.revision_number})` : ''}`,
  change_author: 'claude',
}).select('id, revision_number').single();
if (error) throw new Error(error.message);
console.log(`révision v${rev.revision_number} proposée (${rev.id})`);
if (v6) {
  await sb.from('seo_page_revisions').update({ status: 'superseded' }).eq('id', v6.id);
  console.log(`v${v6.revision_number} (v6) → superseded`);
}
if (proposeOnly) process.exit(0);

const env = readFileSync('/home/ubuntu/sites/seo-dashboard/.env.local', 'utf8');
const get = (k: string) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
const auth = 'Basic ' + Buffer.from(`${get('DASHBOARD_USER')}:${get('DASHBOARD_PASSWORD')}`).toString('base64');
const t0 = Date.now();
const res = await fetch(`http://localhost:3000/api/pages/${page.id}/rollback`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: auth },
  body: JSON.stringify({ revision_id: rev.id }),
});
const body = await res.json();
console.log(`rollback HTTP ${res.status} en ${Math.round((Date.now() - t0) / 1000)} s :`, JSON.stringify(body));
