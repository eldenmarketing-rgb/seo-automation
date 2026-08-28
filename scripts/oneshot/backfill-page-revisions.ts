/**
 * A3 — révision initiale pour les pages antérieures au versionnement.
 *
 * Le trigger `trg_seo_pages_revision` capture tout ce qui s'écrit à partir de
 * maintenant, mais les pages déjà en base n'ont aucun historique : sans ce
 * backfill, leur première révision serait leur prochaine modification, et l'état
 * d'avant serait perdu au moment précis où on voudrait y revenir.
 *
 * Idempotent : une page qui a déjà au moins une révision est laissée telle
 * quelle. Non destructif : n'écrit que dans seo_page_revisions.
 *
 * Usage : npx tsx scripts/backfill-page-revisions.ts [--dry]
 */

import 'dotenv/config';
import { getSupabase } from '../src/db/supabase.js';

const DRY = process.argv.includes('--dry');
const REASON = 'backfill A3';

async function main() {
  const db = getSupabase();

  const { data: pages, error } = await db
    .from('seo_pages')
    .select('id, site_key, slug, version, meta_title, meta_description, h1, content, schema_org, status')
    .order('created_at');
  if (error) throw new Error(`Lecture seo_pages : ${error.message}`);

  const { data: existing, error: revErr } = await db
    .from('seo_page_revisions')
    .select('page_id');
  if (revErr) throw new Error(`Lecture seo_page_revisions : ${revErr.message}`);

  const withHistory = new Set((existing || []).map((r) => r.page_id as string));
  const todo = (pages || []).filter((p) => !withHistory.has(p.id));

  console.log(`${pages?.length ?? 0} page(s), ${withHistory.size} avec historique, ${todo.length} à reprendre.`);
  if (todo.length === 0) {
    console.log('Rien à faire.');
    return;
  }
  if (DRY) {
    for (const p of todo.slice(0, 10)) console.log(`  [dry] ${p.site_key}/${p.slug} → révision 1`);
    if (todo.length > 10) console.log(`  [dry] … et ${todo.length - 10} autres`);
    return;
  }

  // Par lots : le backfill touche ~150 lignes, inutile d'ouvrir 150 requêtes.
  const rows = todo.map((p) => ({
    page_id: p.id,
    revision_number: 1,
    page_version: p.version,
    site_key: p.site_key,
    slug: p.slug,
    meta_title: p.meta_title,
    meta_description: p.meta_description,
    h1: p.h1,
    content: p.content,
    schema_org: p.schema_org,
    status: p.status,
    change_reason: REASON,
    change_author: 'system',
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error: insErr } = await db.from('seo_page_revisions').insert(batch);
    if (insErr) throw new Error(`Insertion (lot ${i / 50 + 1}) : ${insErr.message}`);
    console.log(`  ${Math.min(i + 50, rows.length)}/${rows.length}`);
  }

  // Une page publiée sert forcément son état courant : c'est la révision qu'on
  // vient de créer. Sans ça, `deployed_revision_id` resterait vide sur tout
  // l'existant et le premier rollback n'aurait aucune référence.
  const { data: created } = await db
    .from('seo_page_revisions')
    .select('id, page_id')
    .eq('change_reason', REASON);
  const byPage = new Map((created || []).map((r) => [r.page_id as string, r.id as string]));

  let deployed = 0;
  for (const p of todo) {
    if (p.status !== 'published') continue;
    const revId = byPage.get(p.id);
    if (!revId) continue;
    const { error: upErr } = await db
      .from('seo_pages')
      .update({ deployed_revision_id: revId })
      .eq('id', p.id)
      .is('deployed_revision_id', null);
    if (upErr) throw new Error(`deployed_revision_id ${p.slug} : ${upErr.message}`);
    deployed++;
  }

  console.log(`\n${rows.length} révision(s) créée(s), ${deployed} page(s) publiée(s) rattachée(s) à leur révision en ligne.`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
