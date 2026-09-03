import { getSupabase } from '../db/client.js';
import type { SiteConfig } from '../../config/site-types.js';
import * as logger from '../utils/logger.js';

/**
 * Inscription d'une fiche véhicule dans `seo_pages`, le jour même.
 *
 * Sans ça, une fiche ajoutée par le bot n'entrait à l'inventaire qu'au prochain
 * `import-inventaire`, lancé à la main : l'écran Indexation et le backlog ne la
 * voyaient pas pendant des jours. Même règle que l'import : la ligne est en
 * `external` (le code du site rend la page, pas le CMS) et on n'écrit **que ce
 * que la page servie affiche** — titre, H1, meta description lus sur l'URL
 * réelle, jamais recopiés depuis le brouillon. D'où l'appel après la preuve de
 * mise en ligne, pas avant.
 *
 * Une fiche supprimée n'est pas effacée de la base (l'historique des révisions
 * l'interdit, ON DELETE RESTRICT) : on le note dans `content.imported.removedAt`
 * et le crawl du lundi constatera le 404 — c'est à l'administrateur de décider
 * d'une redirection, le bot ne l'invente pas.
 */

interface PageFacts {
  h1: string;
  title: string;
  description: string;
  wordCount: number;
}

function normalizeText(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|\u00a0|\u202f/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function first(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? normalizeText(m[1]) : '';
}

/** Ce que la page sert — même lecture que `scripts/import-inventaire.ts`. */
export function readPageFacts(html: string): PageFacts {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  return {
    h1: first(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i),
    title: first(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: first(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
    wordCount: normalizeText(body).split(' ').filter(Boolean).length,
  };
}

const AUTHOR = 'bot-voiture';

export type RegisterOutcome = 'inserted' | 'updated' | 'noted_removed' | 'skipped';

/**
 * Inscrit ou met à jour la ligne `seo_pages` de la fiche `vehicules/<slug>`
 * à partir de la page réellement servie. `removed` = la fiche vient d'être
 * supprimée du site.
 */
export async function registerCarPage(
  site: SiteConfig,
  slug: string,
  opts: { removed?: boolean } = {},
): Promise<RegisterOutcome> {
  const db = getSupabase();
  const pageSlug = `vehicules/${slug}`;
  const url = `${site.domain}/${pageSlug}`;
  const now = new Date().toISOString();

  const { data: existing, error: readErr } = await db
    .from('seo_pages')
    .select('id, status, content')
    .eq('site_key', site.key)
    .eq('slug', pageSlug)
    .maybeSingle();
  if (readErr) throw new Error(`seo_pages illisible : ${readErr.message}`);

  if (opts.removed) {
    if (!existing || existing.status !== 'external') return 'skipped';
    const content = (existing.content as Record<string, unknown>) || {};
    const imported = (content.imported as Record<string, unknown>) || {};
    const { error } = await db
      .from('seo_pages')
      .update({ content: { ...content, imported: { ...imported, removedAt: now, removedBy: AUTHOR } } })
      .eq('id', existing.id);
    if (error) throw new Error(`seo_pages : ${error.message}`);
    return 'noted_removed';
  }

  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (res.status !== 200) {
    logger.warn(`Fiche ${pageSlug} non inscrite : HTTP ${res.status}`);
    return 'skipped';
  }
  const facts = readPageFacts(await res.text());
  const imported = { source: AUTHOR, url, at: now, wordCount: facts.wordCount };

  if (existing) {
    // Une page que le CMS gère n'est jamais touchée par le bot.
    if (existing.status !== 'external') return 'skipped';
    const content = (existing.content as Record<string, unknown>) || {};
    const { error } = await db
      .from('seo_pages')
      .update({
        h1: facts.h1,
        meta_title: facts.title,
        meta_description: facts.description,
        content: { ...content, imported: { ...((content.imported as object) || {}), ...imported } },
        deployed_at: now,
      })
      .eq('id', existing.id);
    if (error) throw new Error(`seo_pages : ${error.message}`);
    await labelRevision(existing.id);
    return 'updated';
  }

  const { data: parent } = await db
    .from('seo_pages')
    .select('id')
    .eq('site_key', site.key)
    .eq('slug', 'vehicules')
    .maybeSingle();

  const { data: inserted, error } = await db
    .from('seo_pages')
    .insert({
      site_key: site.key,
      slug: pageSlug,
      page_type: 'product',
      parent_id: parent?.id ?? null,
      h1: facts.h1,
      meta_title: facts.title,
      meta_description: facts.description,
      content: { imported },
      status: 'external',
      deployed_at: now,
    })
    .select('id')
    .single();
  if (error) throw new Error(`seo_pages : ${error.message}`);
  await labelRevision(inserted.id);
  return 'inserted';
}

/** Le trigger d'historique crée une révision sans motif : on l'étiquette. */
async function labelRevision(pageId: string): Promise<void> {
  await getSupabase()
    .from('seo_page_revisions')
    .update({ change_reason: 'fiche véhicule via Telegram', change_author: AUTHOR })
    .eq('page_id', pageId)
    .is('change_reason', null);
}
