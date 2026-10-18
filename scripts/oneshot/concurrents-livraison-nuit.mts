/**
 * Oneshot 2026-10-18 — qui est devant sur la livraison d'alcool / épicerie de nuit à Perpignan,
 * et avec quoi. Sert à construire le 2e site (livraison-de-nuit.fr) : SERP mobile localisée
 * Perpignan sur les requêtes du marché, puis faits des sites qui rankent (liens propres,
 * sitemap, pages qui rankent : mots, H1, FAQ, schéma, téléphone, commande en ligne, horaires).
 *
 * Lancer : npx tsx scripts/oneshot/concurrents-livraison-nuit.mts [--no-facts]
 * Écrit : <scratch>/concurrents-livraison-nuit.json
 */
import { writeFileSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { fetchSerp } from '../../src/competitors/serp.js';
import { backlinkSummary, referringDomains } from '../../src/competitors/backlinks.js';
import { fetchSitemap } from '../../src/competitors/sitemap.js';
import { isCleanReferring, serpDomainKind, normalizeDomain } from '../../src/competitors/classify.js';
import { fetchUrl } from '../../src/crawler/fetch.js';
import { parsePage } from '../../src/crawler/parse.js';

const OURS = 'livraison-alcool-nuit-perpignan.com';
const OUT = process.env.OUT ?? '/tmp/concurrents-livraison-nuit.json';
const NO_FACTS = process.argv.includes('--no-facts');

const QUERIES = [
  'livraison alcool perpignan',
  'livraison alcool nuit perpignan',
  'livraison alcool',
  'alcool perpignan',
  'epicerie de nuit perpignan',
  'epicerie de nuit',
  'apero de nuit perpignan',
  'apero de nuit',
  'livraison apero perpignan',
  'livraison apero nuit',
  'livraison alcool 66',
  'livraison de nuit perpignan',
  'livraison alcool 24h/24 perpignan',
  'livraison alcool domicile perpignan',
  'livraison boisson nuit perpignan',
  'livraison champagne perpignan',
  'livraison biere perpignan',
  'ou acheter alcool la nuit perpignan',
  'alcool nuit perpignan',
  'livraison alcool canet en roussillon',
  'livraison alcool cabestany',
  'livraison alcool saint cyprien',
];

interface DomainAgg {
  domain: string;
  kind: string | null;
  top3: number;
  top10: number;
  pack: number;
  packRating: number | null;
  packVotes: number | null;
  positions: number[];
  urls: Record<string, number>; // url → nb requêtes
  queries: string[];
}

const agg = new Map<string, DomainAgg>();
const serps: Record<string, { organic: string[]; pack: string[]; cost: number }> = {};
let cost = 0;

for (const q of QUERIES) {
  const s = await fetchSerp(q, { local: true });
  cost += s.cost;
  const organic = s.items.filter((i) => i.type === 'organic').slice(0, 10);
  const pack = s.items.filter((i) => i.type === 'local_pack');
  serps[q] = {
    organic: organic.map((i) => `${i.position}. ${i.domain} ${i.url}`),
    pack: pack.map((i) => `${i.domain || i.title} ${i.rating ?? '-'}/${i.votes ?? '-'}`),
    cost: s.cost,
  };
  organic.forEach((i, idx) => {
    const a = agg.get(i.domain) ?? {
      domain: i.domain, kind: serpDomainKind(i.domain), top3: 0, top10: 0, pack: 0, packRating: null, packVotes: null, positions: [], urls: {}, queries: [],
    };
    const rank = idx + 1;
    if (rank <= 3) a.top3++;
    a.top10++;
    a.positions.push(rank);
    a.urls[i.url] = (a.urls[i.url] ?? 0) + 1;
    a.queries.push(q);
    agg.set(i.domain, a);
  });
  for (const p of pack) {
    const d = p.domain || normalizeDomain(p.title);
    if (!d) continue;
    const a = agg.get(d) ?? {
      domain: d, kind: serpDomainKind(d), top3: 0, top10: 0, pack: 0, packRating: null, packVotes: null, positions: [], urls: {}, queries: [],
    };
    a.pack++;
    a.packRating = p.rating ?? a.packRating;
    a.packVotes = p.votes ?? a.packVotes;
    agg.set(d, a);
  }
  console.log(`SERP ${q} — organique: ${organic.slice(0, 3).map((i) => i.domain).join(', ')} | pack: ${pack.map((i) => i.title).join(' / ') || '—'}`);
}

const ranked = [...agg.values()].sort((a, b) => b.top10 - a.top10 || b.top3 - a.top3);
console.log('\n== Domaines récurrents (top 10 organique sur', QUERIES.length, 'requêtes) ==');
for (const a of ranked.filter((x) => x.top10 > 0).slice(0, 25)) {
  const avg = a.positions.length ? (a.positions.reduce((s, p) => s + p, 0) / a.positions.length).toFixed(1) : '-';
  console.log(`${a.domain.padEnd(40)} top10=${a.top10} top3=${a.top3} pos moy=${avg} pack=${a.pack} [${a.kind}]`);
}

// Concurrents directs à instruire : direct, ≥ 2 requêtes en top 10, ou nommé par le user (apéro de nuit), ou nous.
const direct = ranked.filter(
  (a) => a.domain === OURS || /apero/.test(a.domain) || (a.kind === 'direct' && a.top10 >= 2),
).slice(0, 10);

interface Facts {
  domain: string;
  links: { rank: number; rd: number; rdClean: number; first_seen: string | null } | null;
  sitemap: { reached: boolean; urls: number; sample: string[] };
  pages: Array<Record<string, unknown>>;
}
const facts: Facts[] = [];

function extraFacts(html: string) {
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ');
  const tels = new Set<string>();
  $('a[href^="tel:"]').each((_, el) => tels.add(($(el).attr('href') || '').replace('tel:', '')));
  const phonesInText = (text.match(/0[1-9](?:[ .]?\d{2}){4}/g) || []).slice(0, 3);
  return {
    tel_links: [...tels].slice(0, 3),
    phones_text: phonesInText,
    whatsapp: /wa\.me|whatsapp/i.test(html),
    online_order: /ajouter au panier|add to cart|panier|commander en ligne|checkout|woocommerce|shopify/i.test(html),
    form: $('form').length,
    hours: (text.match(/\b(?:[01]?\d|2[0-4])\s?h(?:\s?[0-5]\d)?\s?(?:-|à|au|jusqu'à|→)\s?(?:[01]?\d|2[0-4])\s?h(?:\s?[0-5]\d)?/gi) || []).slice(0, 3),
    h24: /24\s?h\s?\/\s?24|24h24|24\/24|7j\s?\/\s?7|7\/7/i.test(text),
    prices: (text.match(/\d+(?:[,.]\d{2})?\s?€/g) || []).length,
    minutes: (text.match(/\b\d{2}\s?(?:min|minutes)\b/gi) || []).slice(0, 3),
    images: $('img').length,
    reviews_mention: /avis (?:clients?|google)|⭐|★/i.test(text),
    cities: (text.match(/\b(Canet|Cabestany|Saint-Est[eè]ve|Rivesaltes|Bompas|Toulouges|Saint-Cyprien|Argel[eè]s|Thuir|Elne|Barcar[eè]s|Pia|Saleilles|Villeneuve)/gi) || []).map((c) => c.toLowerCase()).filter((v, i, arr) => arr.indexOf(v) === i).length,
  };
}

if (!NO_FACTS) {
  for (const a of direct) {
    console.log(`\n== Faits ${a.domain} ==`);
    const f: Facts = { domain: a.domain, links: null, sitemap: { reached: false, urls: 0, sample: [] }, pages: [] };
    const { summary, cost: c1 } = await backlinkSummary(a.domain);
    const { domains, cost: c2 } = await referringDomains(a.domain, 250);
    cost += c1 + c2;
    if (summary) {
      f.links = {
        rank: summary.rank,
        rd: summary.referring_domains,
        rdClean: domains.filter((d) => isCleanReferring(d.category, d.rank)).length,
        first_seen: summary.first_seen,
      };
    }
    const sm = await fetchSitemap(a.domain).catch(() => ({ reached: false, urls: [] as string[] }));
    f.sitemap = { reached: sm.reached, urls: sm.urls.length, sample: sm.urls.slice(0, 40) };
    const urls = Object.entries(a.urls).sort((x, y) => y[1] - x[1]).map(([u]) => u).slice(0, 3);
    if (urls.length === 0) urls.push(`https://${a.domain}/`);
    for (const u of urls) {
      try {
        const res = await fetchUrl(u);
        if (res.status !== 200 || !res.html) {
          f.pages.push({ url: u, status: res.status });
          continue;
        }
        const p = parsePage(res.html, res.finalUrl || u);
        f.pages.push({
          url: u,
          status: 200,
          title: p.title,
          meta: p.metaDescription.slice(0, 200),
          h1: p.h1,
          words: p.wordCount,
          h2: p.h2Count,
          faq: p.rendered.faq.length,
          schema: p.structuredData,
          internal_links: p.allInternalLinks.length,
          ...extraFacts(res.html),
        });
      } catch (e) {
        f.pages.push({ url: u, error: (e as Error).message });
      }
    }
    console.log(JSON.stringify(f, null, 1).slice(0, 3000));
    facts.push(f);
  }
}

writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), queries: QUERIES, cost, serps, domains: ranked, facts }, null, 2));
console.log(`\nCoût DataForSEO : ${cost.toFixed(3)} $ — écrit ${OUT}`);
