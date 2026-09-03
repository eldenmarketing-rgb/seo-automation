import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import type { SiteConfig } from '../../config/site-types.js';
import type { SeoPageRow } from '../db/pages.js';
import { todayIso } from '../vehicles/types.js';
import * as logger from '../utils/logger.js';

/**
 * Écrivain « Conseils » — un article validé dans le dashboard devient une
 * entrée de `data/articles.ts` sur un site en mode fichiers (Ideo Car).
 *
 * Le dashboard produit un JSON (intro, sections en markdown, FAQ) ; la rubrique
 * du site attend un objet `Article` : titre-question, description, date,
 * catégorie de véhicules rattachée, image de couverture, corps markdown, FAQ.
 * On assemble le corps (`## section` + contenu), on garde les liens dont la
 * cible existe, et on **met à jour** un article dont le slug est déjà là
 * (`dateMaj`) plutôt que d'en créer un doublon — c'est la règle écrite en tête
 * du fichier du site.
 *
 * Champs que le JSON n'a pas : `content.article.categorie` (4x4, petit-prix,
 * sport, sinon `standard` = « Nos véhicules ») et `content.article.image`,
 * posés depuis l'éditeur du dashboard (bloc « Article — rubrique Conseils »).
 */

const ARTICLES_FILE = 'data/articles.ts';
const CATEGORIES = ['4x4', 'petit-prix', 'sport', 'standard'] as const;
type Category = (typeof CATEGORIES)[number];

export interface ArticleEntry {
  slug: string;
  title: string;
  metaTitle?: string;
  description: string;
  datePublication: string;
  dateMaj?: string;
  categorie: Category;
  image?: string;
  body: string;
  faq?: Array<{ question: string; answer: string }>;
}

interface Section {
  title?: string;
  content?: string;
}

export function hasArticlesSection(site: SiteConfig): boolean {
  return existsSync(join(site.projectPath, ARTICLES_FILE));
}

/** Le littéral de tableau après `export const articles = [`, évalué tel quel. */
export function parseArticlesFile(content: string): ArticleEntry[] {
  const decl = content.match(/export\s+const\s+articles\s*(?::\s*Article\[\])?\s*=\s*\[/);
  if (!decl || decl.index === undefined) {
    throw new Error(`${ARTICLES_FILE} : déclaration \`export const articles\` introuvable`);
  }
  const start = decl.index + decl[0].length - 1;
  const end = content.lastIndexOf('];');
  if (end < start) throw new Error(`${ARTICLES_FILE} : fin du tableau introuvable`);
  const value = vm.runInNewContext(`(${content.slice(start, end + 1)})`, {}, { timeout: 1000 }) as unknown;
  if (!Array.isArray(value)) throw new Error(`${ARTICLES_FILE} : le tableau ne s'évalue pas en liste`);
  return value as ArticleEntry[];
}

/** `[ancre](/chemin)` dont la cible n'est servie par aucune route → texte nu, avec avertissement. */
export function filtrerLiensMarkdown(body: string, routes: Set<string>, contexte: string): string {
  return body.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (_m, texte: string, href: string) => {
    const cible = href.replace(/^\/+|\/+$/g, '').split(/[#?]/)[0];
    if (cible === '' || routes.has(cible)) return `[${texte}](${href})`;
    logger.warn(`Lien mort retiré (${contexte}) : ${href} n'est servi par aucune route`);
    return texte;
  });
}

/** Corps markdown : intro, puis chaque section sous un `##`. */
export function assembleBody(content: Record<string, unknown>): string {
  const parts: string[] = [];
  const intro = typeof content.intro === 'string' ? content.intro.trim() : '';
  if (intro) parts.push(intro);
  const sections = Array.isArray(content.seoSections) ? (content.seoSections as Section[]) : [];
  for (const s of sections) {
    const title = (s.title || '').trim().replace(/^#+\s*/, '');
    const text = (s.content || '').trim();
    if (!title && !text) continue;
    parts.push(title ? `## ${title}\n\n${text}` : text);
  }
  return parts.join('\n\n').replace(/\n{3,}/g, '\n\n');
}

function stripSiteSuffix(title: string, siteName: string): string {
  return title
    .replace(new RegExp(`\\s*[|–—-]\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '')
    .trim();
}

/** L'entrée `Article` d'une page du dashboard. `existing` = l'article déjà en ligne sous ce slug. */
export function buildArticleEntry(
  page: SeoPageRow,
  site: SiteConfig,
  routes: Set<string>,
  existing?: ArticleEntry,
  today = todayIso(),
): ArticleEntry {
  const content = page.content || {};
  const meta = (content.article as { categorie?: string; image?: string } | undefined) || {};
  const categorie = (CATEGORIES as readonly string[]).includes(meta.categorie || '')
    ? (meta.categorie as Category)
    : 'standard';
  const title = page.h1.trim();
  const metaTitle = stripSiteSuffix(page.meta_title || '', site.name);
  const faq = Array.isArray(content.faq)
    ? (content.faq as Array<{ question?: string; answer?: string }>)
        .filter((f) => f.question && f.answer)
        .map((f) => ({ question: String(f.question).trim(), answer: String(f.answer).trim() }))
    : [];

  return {
    slug: page.slug.replace(/^conseils\//, ''),
    title,
    ...(metaTitle && metaTitle !== title ? { metaTitle } : {}),
    description: page.meta_description.trim(),
    datePublication: existing?.datePublication ?? today,
    ...(existing ? { dateMaj: today } : {}),
    categorie,
    ...(meta.image ? { image: meta.image } : {}),
    body: filtrerLiensMarkdown(assembleBody(content), routes, page.slug),
    ...(faq.length ? { faq } : {}),
  };
}

const q = (s: string): string => JSON.stringify(s);

export function serializeArticle(a: ArticleEntry): string {
  const lines = [`    slug: ${q(a.slug)},`, `    title: ${q(a.title)},`];
  if (a.metaTitle) lines.push(`    metaTitle: ${q(a.metaTitle)},`);
  lines.push(`    description: ${q(a.description)},`, `    datePublication: ${q(a.datePublication)},`);
  if (a.dateMaj) lines.push(`    dateMaj: ${q(a.dateMaj)},`);
  lines.push(`    categorie: ${q(a.categorie)},`);
  if (a.image) lines.push(`    image: ${q(a.image)},`);
  lines.push(`    body: ${q(a.body)},`);
  if (a.faq?.length) {
    lines.push(`    faq: [`);
    for (const f of a.faq) lines.push(`      { question: ${q(f.question)}, answer: ${q(f.answer)} },`);
    lines.push(`    ],`);
  }
  return `  {\n${lines.join('\n')}\n  },`;
}

function findBlock(content: string, slug: string): { start: number; end: number } | null {
  const needle = new RegExp(`^\\s*slug:\\s*${q(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,`, 'm');
  for (const m of content.matchAll(/^ {2}\{\n[\s\S]*?^ {2}\},?[ \t]*$/gm)) {
    if (m.index !== undefined && needle.test(m[0])) return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** Ajoute l'article, ou remplace le bloc de même slug. */
export function upsertArticle(content: string, entry: ArticleEntry): string {
  const block = findBlock(content, entry.slug);
  if (block) return content.slice(0, block.start) + serializeArticle(entry) + content.slice(block.end);
  const end = content.lastIndexOf('];');
  if (end === -1) throw new Error(`${ARTICLES_FILE} : fin du tableau introuvable`);
  const before = content.slice(0, end).replace(/\s+$/, '');
  return `${before}\n${serializeArticle(entry)}\n${content.slice(end)}`;
}

/**
 * Écrit les pages `article` du dashboard dans `data/articles.ts` du site.
 * Rend les slugs écrits. `routes` = ce que le site sert (pour les liens).
 */
export function injectArticles(site: SiteConfig, pages: SeoPageRow[], routes: Set<string>): string[] {
  if (!hasArticlesSection(site)) {
    throw new Error(`Le site "${site.key}" n'a pas de rubrique Conseils (${ARTICLES_FILE} absent)`);
  }
  const path = join(site.projectPath, ARTICLES_FILE);
  let content = readFileSync(path, 'utf-8');
  const existing = new Map(parseArticlesFile(content).map((a) => [a.slug, a]));
  for (const a of existing.keys()) routes.add(`conseils/${a}`);

  const injected: string[] = [];
  for (const page of pages) {
    if (!page.slug.startsWith('conseils/')) {
      logger.warn(`Article ${page.slug} ignoré : un article vit sous /conseils/<slug>`);
      continue;
    }
    if (!page.h1?.trim() || !page.meta_description?.trim()) {
      logger.warn(`Article ${page.slug} ignoré : H1 ou meta description vide`);
      continue;
    }
    const entry = buildArticleEntry(page, site, routes, existing.get(page.slug.replace(/^conseils\//, '')));
    content = upsertArticle(content, entry);
    injected.push(page.slug);
  }
  if (injected.length) {
    parseArticlesFile(content); // le fichier doit rester évaluable, sinon le build du site casse
    writeFileSync(path, content, 'utf-8');
  }
  return injected;
}
