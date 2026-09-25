// Bascule CMS de Noïa Event : les cinq prestations (piliers typés) et les cinq
// pages structurelles (blocs édités par l'espace client) entrent dans
// `seo_pages` en `published`, à partir des fichiers du repo qui font foi.
//
// Les lignes existent déjà (inventaire importé en `external` le 2026-09-10,
// avec le title, le H1 et la meta lus sur la page servie) : on ne touche qu'au
// `content` et au `status`. Idempotent. Simulation par défaut.
//
//   env -u SUPABASE_ACCESS_TOKEN npx tsx --tsconfig /home/ubuntu/sites/Noia-Event/tsconfig.json scripts/oneshot/import-noia-cms.mts [--apply]
// (le tsconfig du site résout l’alias `@/` de ses fichiers de contenu)
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '../../src/config/env.js';

const SITE = 'noia';
const PROJECT = '/home/ubuntu/sites/Noia-Event';
const apply = process.argv.includes('--apply');

const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_KEY'));

type Pillar = Record<string, unknown> & {
  slug: string;
  lead: string[];
  faq: { q: string; a: string }[];
  heroImage?: { src: string; alt: string };
};

async function main() {
  const { pillars } = (await import(`${PROJECT}/lib/content/index.ts`)) as { pillars: Record<string, Pillar> };
  const blocks = (await import(`${PROJECT}/lib/site-content.ts`)) as {
    BLOCK_DEFAULTS: Record<string, Record<string, unknown>>;
  };

  const updates: { slug: string; patch: Record<string, unknown>; status: string; page_type?: string }[] = [];

  for (const [slug, pillar] of Object.entries(pillars)) {
    updates.push({
      slug: `prestations/${slug}`,
      page_type: 'service',
      status: 'published',
      patch: {
        pillar,
        intro: pillar.lead.join('\n\n'),
        faq: pillar.faq.map((f) => ({ question: f.q, answer: f.a })),
        ...(pillar.heroImage ? { heroImage: pillar.heroImage } : {}),
        seoSections: [],
        highlights: [],
        internalLinks: [],
        gallery: [],
        updatedDate: new Date().toISOString().slice(0, 10),
      },
    });
  }

  for (const [slug, defaults] of Object.entries(blocks.BLOCK_DEFAULTS)) {
    // L'accueil est stocké avec un slug vide (convention de l'inventaire).
    updates.push({ slug: slug === 'home' ? '' : slug, status: 'published', patch: { blocks: defaults } });
  }

  const { data: rows, error } = await db
    .from('seo_pages')
    .select('id, slug, status, page_type, content')
    .eq('site_key', SITE)
    .in(
      'slug',
      updates.map((u) => u.slug),
    );
  if (error) throw error;
  const bySlug = new Map((rows ?? []).map((r) => [r.slug as string, r]));

  for (const u of updates) {
    const row = bySlug.get(u.slug);
    if (!row) {
      console.log(`✗ ${u.slug} : aucune ligne en base — à importer d'abord (import-inventaire)`);
      continue;
    }
    const content = { ...((row.content as Record<string, unknown>) ?? {}), ...u.patch };
    const line = `${row.status} → ${u.status}${u.page_type && u.page_type !== row.page_type ? `, ${row.page_type} → ${u.page_type}` : ''}`;
    if (!apply) {
      console.log(`· ${u.slug} : ${line} (${Object.keys(u.patch).join(', ')})`);
      continue;
    }
    const { error: e } = await db
      .from('seo_pages')
      .update({
        content,
        status: u.status,
        ...(u.page_type ? { page_type: u.page_type } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (e) {
      console.log(`✗ ${u.slug} : ${e.message}`);
      continue;
    }
    // Étiquette la révision créée par le trigger.
    const { data: pending } = await db
      .from('seo_page_revisions')
      .select('id')
      .eq('page_id', row.id)
      .is('change_reason', null)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pending) {
      await db
        .from('seo_page_revisions')
        .update({ change_reason: 'Bascule CMS : import du contenu du repo', change_author: 'elden' })
        .eq('id', pending.id);
    }
    console.log(`✓ ${u.slug} : ${line}`);
  }
  if (!apply) console.log('\nSimulation. Relancer avec --apply pour écrire.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
