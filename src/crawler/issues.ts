/**
 * Anomalies déterministes. Zéro IA, zéro heuristique floue : chaque code
 * correspond à un fait vérifiable en ouvrant la page.
 *
 * Les règles dépendent de l'état ATTENDU de l'URL. Une page redirigée n'est pas
 * une page non indexée : elle a été supprimée exprès, et le seul reproche qu'on
 * puisse lui faire est de mal rediriger ou de traîner encore au sitemap.
 */
import type { CrawlRow } from './types.js';
import { normalizeUrl } from './types.js';
import { gscStage } from './funnel.js';

/** En dessous, la page n'a pas de quoi répondre à une intention de recherche. */
const THIN_WORDS = 300;

export interface IssueContext {
  /** content_hash → nombre d'URL du site qui servent ce contenu. */
  hashCounts: Map<string, number>;
}

export function detectIssues(row: CrawlRow, ctx: IssueContext): string[] {
  const issues: string[] = [];

  if (row.expected_state === 'out_of_scope') return issues;

  // ─── Page supprimée / redirigée ──────────────────────────────────────────
  if (row.expected_state === 'redirected') {
    if (row.http_status === 200 && row.redirect_chain.length === 0) issues.push('REDIRECT_MISSING');
    if (row.redirect_chain.length > 1) issues.push('REDIRECT_CHAIN');
    if (row.redirect_chain.length > 0 && row.http_status !== 200) issues.push('REDIRECT_BROKEN');
    if (row.in_sitemap) issues.push('SITEMAP_STALE');
    // Une URL supprimée qui reçoit encore des liens éditoriaux fait passer les
    // visiteurs et le jus de lien par un 301 pour rien.
    if ((row.links_in ?? 0) > 0) issues.push('LINKED_TO_REDIRECT');
    return issues;
  }

  // ─── Brouillon ───────────────────────────────────────────────────────────
  if (row.expected_state === 'draft') {
    if (row.http_status === 200) issues.push('DRAFT_LIVE');
    return issues;
  }

  // ─── Page censée être indexée ────────────────────────────────────────────
  if (row.http_status === 0) return ['UNREACHABLE'];
  if (row.http_status && row.http_status >= 400) {
    // Distinguer les deux : une 404 directe et une 301 qui atterrit sur une 404
    // ne se corrigent pas au même endroit.
    return row.redirect_chain.length > 0 ? ['REDIRECT_BROKEN'] : ['BROKEN'];
  }

  if (row.redirect_chain.length > 0) {
    issues.push('REDIRECT_UNEXPECTED');
    if (row.redirect_chain.length > 1) issues.push('REDIRECT_CHAIN');
  }

  if (row.robots_txt_allowed === false) issues.push('ROBOTS_BLOCKED');
  if (row.meta_robots && /\bnoindex\b/i.test(row.meta_robots)) issues.push('NOINDEX');

  const self = normalizeUrl(row.final_url || row.url);
  if (row.canonical && normalizeUrl(row.canonical) !== self) issues.push('CANONICAL_CONFLICT');
  else if (row.gsc_google_canonical && normalizeUrl(row.gsc_google_canonical) !== self) {
    // Google a choisi une autre canonique que celle déclarée : c'est le signal
    // le plus fréquent d'un contenu jugé dupliqué.
    issues.push('CANONICAL_IGNORED');
  }

  if (row.in_sitemap === false) issues.push('NOT_IN_SITEMAP');
  if ((row.links_in ?? 0) === 0 && row.click_depth !== 0) issues.push('ORPHAN');

  if (!row.title) issues.push('MISSING_TITLE');
  if (!row.meta_description) issues.push('MISSING_META');
  if (row.h1_count === 0) issues.push('MISSING_H1');
  else if ((row.h1_count ?? 0) > 1) issues.push('MULTIPLE_H1');
  if (row.structured_data.length === 0) issues.push('NO_STRUCTURED_DATA');

  if ((row.word_count ?? 0) < THIN_WORDS) issues.push('THIN');
  // Une URL qui a redirigé sert le contenu de sa cible : la compter comme
  // doublon accuserait la cible d'être en double avec elle-même.
  if (
    row.redirect_chain.length === 0 &&
    row.content_hash &&
    (ctx.hashCounts.get(row.content_hash) ?? 0) > 1
  ) {
    issues.push('DUPLICATE_CONTENT');
  }

  // ─── Funnel ──────────────────────────────────────────────────────────────
  const stage = gscStage(row);
  if (stage === 'NONE') issues.push('UNKNOWN_TO_GOOGLE');
  else if (stage === 'DISCOVERED') issues.push('DISCOVERED_NOT_INDEXED');
  else if (stage === 'CRAWLED') issues.push('CRAWLED_NOT_INDEXED');
  else if (stage === 'INDEXED' && row.impressions28 === 0) issues.push('INDEXED_NO_IMPRESSIONS');

  return issues;
}

/** Regroupement lisible pour le rapport console. */
export const ISSUE_LABELS: Record<string, string> = {
  UNREACHABLE: 'URL injoignable',
  BROKEN: 'réponse 4xx/5xx',
  REDIRECT_UNEXPECTED: 'redirige alors qu’elle devrait répondre',
  REDIRECT_CHAIN: 'chaîne de redirections',
  REDIRECT_MISSING: 'supprimée mais répond encore 200',
  REDIRECT_BROKEN: 'redirige vers une cible cassée',
  LINKED_TO_REDIRECT: 'supprimée mais encore liée depuis le contenu',
  SITEMAP_STALE: 'redirigée mais encore au sitemap',
  DRAFT_LIVE: 'brouillon accessible en ligne',
  ROBOTS_BLOCKED: 'bloquée par robots.txt',
  NOINDEX: 'balise noindex',
  CANONICAL_CONFLICT: 'canonical pointe ailleurs',
  CANONICAL_IGNORED: 'Google a choisi une autre canonique',
  NOT_IN_SITEMAP: 'absente du sitemap',
  ORPHAN: 'orpheline (aucun lien éditorial entrant)',
  MISSING_TITLE: 'title absent',
  MISSING_META: 'meta description absente',
  MISSING_H1: 'H1 absent',
  MULTIPLE_H1: 'plusieurs H1',
  NO_STRUCTURED_DATA: 'aucune donnée structurée',
  THIN: `contenu court (< ${THIN_WORDS} mots)`,
  DUPLICATE_CONTENT: 'contenu identique à une autre URL',
  UNKNOWN_TO_GOOGLE: 'inconnue de Google',
  DISCOVERED_NOT_INDEXED: 'découverte, jamais crawlée',
  CRAWLED_NOT_INDEXED: 'crawlée, non indexée',
  INDEXED_NO_IMPRESSIONS: 'indexée, aucune impression sur 28 j',
};
