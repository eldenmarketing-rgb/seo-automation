/**
 * Ce qu'une page concurrente contient — avec le parseur du crawler, pour que
 * « 919 mots chez nous, 638 chez SBN » soit mesuré de la même façon des deux
 * côtés. Seulement les URL qui rankent devant nous : on ne crawle pas un site
 * concurrent, on lit les pages qui nous battent.
 */
import { fetchUrl } from '../crawler/fetch.js';
import { parsePage } from '../crawler/parse.js';
import type { PageFactsLite } from './types.js';

export async function fetchPageFacts(url: string): Promise<PageFactsLite> {
  const res = await fetchUrl(url);
  if (res.status !== 200 || !res.html) {
    return { status: res.status, words: 0, h1: '', h2_count: 0, faq_count: 0, schema_types: [] };
  }
  const facts = parsePage(res.html, res.finalUrl || url);
  return {
    status: res.status,
    words: facts.wordCount,
    h1: facts.h1.slice(0, 200),
    h2_count: facts.h2Count,
    faq_count: facts.rendered.faq.length,
    schema_types: facts.structuredData,
  };
}
