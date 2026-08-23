/**
 * Graphe de maillage interne.
 *
 * Deux mesures, volontairement séparées :
 *  - `linksIn` ne compte que les liens du corps rédactionnel. Un lien de menu
 *    présent sur les 60 pages ne dit rien du maillage : s'il comptait, aucune
 *    page ne serait jamais orpheline et la détection serait inutile.
 *  - `depth` se calcule sur TOUS les liens, menu compris, parce que c'est ce
 *    que Google suit réellement pour découvrir une URL.
 */
import { normalizeUrl } from './types.js';

export interface GraphInput {
  url: string;
  /** Liens du corps rédactionnel. */
  contextual: string[];
  /** Tous les liens internes, nav et pied de page compris. */
  all: string[];
}

export interface GraphResult {
  linksIn: Map<string, number>;
  depth: Map<string, number>;
}

export function buildGraph(pages: GraphInput[], homeUrl: string): GraphResult {
  const known = new Set(pages.map((p) => normalizeUrl(p.url)));

  const linksIn = new Map<string, number>();
  for (const key of known) linksIn.set(key, 0);

  const outgoing = new Map<string, string[]>();

  for (const page of pages) {
    const from = normalizeUrl(page.url);

    for (const target of new Set(page.contextual.map(normalizeUrl))) {
      if (target === from || !known.has(target)) continue;
      linksIn.set(target, (linksIn.get(target) || 0) + 1);
    }

    outgoing.set(
      from,
      [...new Set(page.all.map(normalizeUrl))].filter((t) => t !== from && known.has(t))
    );
  }

  // Profondeur de clic depuis l'accueil. Une URL absente de la table finale n'a
  // pas de profondeur : `null` côté base, ce qui se lit « jamais atteinte en
  // suivant les liens » — un fait, pas une estimation.
  const depth = new Map<string, number>();
  const home = normalizeUrl(homeUrl);
  if (known.has(home)) {
    depth.set(home, 0);
    const queue = [home];
    while (queue.length) {
      const current = queue.shift()!;
      const next = (depth.get(current) || 0) + 1;
      for (const target of outgoing.get(current) || []) {
        if (depth.has(target)) continue;
        depth.set(target, next);
        queue.push(target);
      }
    }
  }

  return { linksIn, depth };
}
