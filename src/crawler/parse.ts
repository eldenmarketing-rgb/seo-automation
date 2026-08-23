/**
 * Extraction des faits d'une page HTML servie.
 *
 * Tout ce qui sort d'ici est vérifiable en ouvrant la page : aucun jugement,
 * aucun score. L'interprétation est le travail de `issues.ts`.
 */
import { load } from 'cheerio';
import { createHash } from 'crypto';

export interface PageFacts {
  title: string;
  metaDescription: string;
  metaRobots: string;
  canonical: string;
  h1: string;
  h1Count: number;
  h2Count: number;
  structuredData: string[];
  wordCount: number;
  contentHash: string;
  /** Liens internes sortants du corps rédactionnel — le maillage qui compte. */
  internalLinks: string[];
  /** Tous les liens internes, nav et pied de page compris — ce que suit Google. */
  allInternalLinks: string[];
  externalLinks: number;
  noindex: boolean;
}

/** Types JSON-LD présents, `@graph` compris. */
function collectTypes(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  if (typeof type === 'string') out.add(type);
  else if (Array.isArray(type)) for (const t of type) if (typeof t === 'string') out.add(t);

  if (obj['@graph']) collectTypes(obj['@graph'], out);
}

/**
 * @param html   le HTML servi
 * @param url    l'URL finale (sert à absolutiser les liens)
 * @param xRobotsTag l'en-tête HTTP, qui fait autorité au même titre que la meta
 */
export function parsePage(html: string, url: string, xRobotsTag = ''): PageFacts {
  const $ = load(html);

  const metaRobots = ($('meta[name="robots"]').attr('content') || '').trim();
  const googlebot = ($('meta[name="googlebot"]').attr('content') || '').trim();
  const robotsSignals = [metaRobots, googlebot, xRobotsTag].join(' ').toLowerCase();

  // Le corps rédactionnel : ce qui reste une fois retirés le chrome et les
  // scripts. Les liens de nav et de pied de page sont identiques sur toutes les
  // pages, les compter reviendrait à dire que le site est parfaitement maillé.
  const $body = $('body').clone();
  $body.find('script, style, noscript, nav, header, footer, svg').remove();

  const origin = new URL(url).origin;
  let external = 0;

  const linksOf = (scope: ReturnType<typeof $>, countExternal = false): string[] => {
    const internal = new Set<string>();
    scope.find('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').trim();
      if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
      let abs: URL;
      try {
        abs = new URL(href, url);
      } catch {
        return;
      }
      if (abs.origin !== origin) {
        if (countExternal) external++;
        return;
      }
      abs.hash = '';
      internal.add(abs.toString());
    });
    return [...internal];
  };

  // Deux mesures distinctes : le maillage éditorial (corps seul) sert à repérer
  // les orphelines ; la totalité des liens sert à reproduire le parcours de
  // Google et à calculer la profondeur de clic.
  const internal = linksOf($body, true);
  const allInternal = linksOf($('body'));

  const structured = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      collectTypes(JSON.parse($(el).contents().text()), structured);
    } catch {
      // Un JSON-LD invalide n'est pas du JSON-LD : on n'en tire rien, et la
      // page se retrouvera sans données structurées — ce qui est la vérité.
    }
  });

  const text = $body.text().replace(/\s+/g, ' ').trim();

  return {
    title: $('title').first().text().trim(),
    metaDescription: ($('meta[name="description"]').attr('content') || '').trim(),
    metaRobots: [metaRobots, googlebot && `googlebot:${googlebot}`, xRobotsTag && `x-robots:${xRobotsTag}`]
      .filter(Boolean)
      .join(' | '),
    canonical: ($('link[rel="canonical"]').attr('href') || '').trim(),
    h1: $('h1').first().text().replace(/\s+/g, ' ').trim(),
    h1Count: $('h1').length,
    h2Count: $('h2').length,
    structuredData: [...structured].sort(),
    wordCount: text ? text.split(' ').length : 0,
    contentHash: createHash('sha1').update(text).digest('hex'),
    internalLinks: internal,
    allInternalLinks: allInternal,
    externalLinks: external,
    noindex: /\bnoindex\b/.test(robotsSignals),
  };
}
