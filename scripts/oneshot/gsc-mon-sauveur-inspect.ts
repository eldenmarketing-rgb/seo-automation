import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";
import fs from "fs";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters"],
});
const sc = google.searchconsole({ version: "v1", auth });

const PROP = "sc-domain:livraison-alcool-nuit-perpignan.com";
const BASE = "https://livraison-alcool-nuit-perpignan.com";

const CITIES = [
  "perpignan", "cabestany", "canet-en-roussillon", "rivesaltes", "bompas",
  "saint-esteve", "elne", "thuir", "saint-cyprien", "argeles-sur-mer",
  "le-barcares", "sainte-marie-la-mer", "torreilles", "villeneuve-de-la-raho",
  "leucate", "pia", "claira", "le-soler", "toulouges",
];

const CATEGORIES = ["bieres", "champagnes", "packs", "soft-snacks", "spiritueux"];

const THEMATIC = [
  "apero-perpignan",
  "epicerie-de-nuit-perpignan",
  "livraison-alcool-pas-cher-perpignan",
  "livraison-champagne-perpignan",
  "livraison-whisky-perpignan",
  "livraison-vodka-perpignan",
  "livraison-biere-perpignan",
  "livraison-vin-perpignan",
  "livraison-alcool-anniversaire-perpignan",
  "livraison-alcool-soiree-perpignan",
  "livraison-alcool-mariage-perpignan",
  "livraison-alcool-evjf-perpignan",
  "livraison-alcool-evg-perpignan",
  "alcool-derniere-minute-perpignan",
];

function loadProducts(): string[] {
  const txt = fs.readFileSync("/home/ubuntu/sites/Mon-Sauveur/data/catalogue.ts", "utf-8");
  const slugs: string[] = [];
  const re = /slug:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(txt)) !== null) slugs.push(m[1]);
  return slugs;
}

function loadBlog(): string[] {
  const txt = fs.readFileSync("/home/ubuntu/sites/Mon-Sauveur/data/blog.ts", "utf-8");
  const slugs: string[] = [];
  const re = /slug:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(txt)) !== null) slugs.push(m[1]);
  return slugs;
}

async function inspect(url: string) {
  try {
    const r = await sc.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl: PROP },
    });
    const i = r.data.inspectionResult?.indexStatusResult;
    return {
      url,
      verdict: i?.verdict || "—",
      coverage: i?.coverageState || "—",
      lastCrawl: i?.lastCrawlTime?.slice(0, 10) || "—",
      indexingState: i?.indexingState || "—",
      pageFetchState: i?.pageFetchState || "—",
      googleCanonical: i?.googleCanonical || "—",
    };
  } catch (e: any) {
    return { url, verdict: "ERR", coverage: e.message, lastCrawl: "—", indexingState: "—", pageFetchState: "—", googleCanonical: "—" };
  }
}

(async () => {
  const urls: { type: string; url: string }[] = [
    { type: "home", url: `${BASE}/` },
    ...CITIES.map((c) => ({ type: "ville", url: `${BASE}/livraison-alcool-nuit-${c}` })),
    ...THEMATIC.map((s) => ({ type: "thematique", url: `${BASE}/${s}` })),
    ...CATEGORIES.map((c) => ({ type: "categ", url: `${BASE}/categorie/${c}` })),
    ...loadProducts().map((s) => ({ type: "produit", url: `${BASE}/produit/${s}` })),
    ...loadBlog().map((s) => ({ type: "blog", url: `${BASE}/blog/${s}` })),
    { type: "blog-idx", url: `${BASE}/blog` },
  ];

  console.log(`\nInspection de ${urls.length} URLs (PROP=${PROP})\n`);

  const results: any[] = [];
  for (let i = 0; i < urls.length; i++) {
    const { type, url } = urls[i];
    process.stderr.write(`[${i + 1}/${urls.length}] ${url} ... `);
    const r = await inspect(url);
    results.push({ type, ...r });
    process.stderr.write(`${r.verdict} · ${r.coverage}\n`);
    await new Promise((res) => setTimeout(res, 300));
  }

  // Group by status
  const grouped: Record<string, any[]> = {};
  results.forEach((r) => {
    const k = `${r.verdict} — ${r.coverage}`;
    (grouped[k] = grouped[k] || []).push(r);
  });

  console.log("\n=== RÉSUMÉ PAR STATUT ===");
  Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([k, arr]) => console.log(`  ${arr.length}  ${k}`));

  console.log("\n=== DÉTAIL PAR TYPE ===");
  const byType: Record<string, any[]> = {};
  results.forEach((r) => (byType[r.type] = byType[r.type] || []).push(r));
  Object.entries(byType).forEach(([t, arr]) => {
    const pass = arr.filter((r) => r.verdict === "PASS").length;
    console.log(`\n  ${t} : ${pass}/${arr.length} PASS`);
    arr.forEach((r) => {
      const flag = r.verdict === "PASS" ? "OK " : r.verdict === "NEUTRAL" ? "?? " : "KO ";
      const short = r.url.replace(BASE, "");
      console.log(`    ${flag} ${short.padEnd(60)} ${r.coverage} · crawl ${r.lastCrawl}`);
    });
  });

  fs.writeFileSync("/home/ubuntu/sites/seo-automation/reports/mon-sauveur-indexation.json", JSON.stringify(results, null, 2));
  console.log("\nSaved: reports/mon-sauveur-indexation.json");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
