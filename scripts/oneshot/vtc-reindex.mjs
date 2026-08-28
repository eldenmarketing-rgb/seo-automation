#!/usr/bin/env node
// Force la réindexation Google/Bing après les fixes SEO du 2026-04-21.
// 1. IndexNow (Bing + moteurs compatibles) — batch
// 2. Google Indexing API (limité à JobPosting/BroadcastEvent, mais
//    on tente pour déclencher le crawl — 403 = normal, non bloquant)
// 3. Ping sitemap Google (endpoint public)

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const SITE = "https://ideal-transport.fr";
const INDEXNOW_KEY = "765e6c9a564ba559db7c19352979e9d9";
const INDEXNOW_HOST = "ideal-transport.fr";

// URLs prioritaires à réindexer (basé sur GSC deep audit)
const URLS = [
  "/",
  "/destinations",
  "/reservation",
  "/services",
  "/zone-intervention",
  "/avis-clients",
  "/contact",
  // Top pages avec impressions mais pas indexées / mal classées
  "/taxi-vtc-aeroport-perpignan",
  "/taxi-vtc-aeroport-beziers",
  "/taxi-vtc-aeroport-girona",
  "/taxi-vtc-gare-perpignan",
  "/taxi-vtc-gare-narbonne",
  "/taxi-vtc-canet",
  "/taxi-vtc-argeles-sur-mer",
  "/taxi-vtc-saint-cyprien",
  "/taxi-vtc-collioure",
  "/taxi-vtc-port-vendres",
  "/taxi-vtc-banyuls-sur-mer",
  "/taxi-vtc-cerbere",
  "/taxi-vtc-le-barcares",
  "/taxi-vtc-leucate",
  "/taxi-vtc-vernet-les-bains",
  "/taxi-vtc-amelie-les-bains",
  "/taxi-vtc-thuir",
  "/taxi-vtc-ille-sur-tet",
  "/taxi-vtc-prades",
  "/taxi-vtc-torreilles",
  "/taxi-vtc-sainte-marie-la-mer",
  "/taxi-vtc-elne",
  "/taxi-vtc-cabestany",
  "/taxi-vtc-rivesaltes",
  "/taxi-vtc-saint-esteve",
  "/taxi-vtc-saint-laurent-de-la-salanque",
  "/taxi-vtc-ceret",
  "/taxi-vtc-font-romeu",
].map(u => SITE + u);

// ─── 1. IndexNow ──────────────────────────────────────────
async function indexNow() {
  console.log(`\n[IndexNow] Soumission de ${URLS.length} URLs...`);
  const body = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
    urlList: URLS,
  };
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(`[IndexNow] HTTP ${r.status} — ${r.status === 200 || r.status === 202 ? "OK" : "ERREUR"}`);
  if (r.status !== 200 && r.status !== 202) {
    console.log(`  Body: ${await r.text()}`);
  }
}

// ─── 2. Google Indexing API (tentative, 403 attendu) ──────
async function googleIndexingApi() {
  const keyFile = path.resolve("./config/gsc-service-account.json");
  if (!fs.existsSync(keyFile)) {
    console.log("\n[Google Indexing] Service account absent, skip.");
    return;
  }
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  const client = await auth.getClient();
  const { google } = await import("googleapis");
  const indexing = google.indexing({ version: "v3", auth: client });

  console.log(`\n[Google Indexing API] Tentative sur ${URLS.length} URLs (403 = attendu pour non-JobPosting)...`);
  let ok = 0, ko = 0;
  for (const url of URLS) {
    try {
      await indexing.urlNotifications.publish({
        requestBody: { url, type: "URL_UPDATED" },
      });
      ok++;
    } catch (e) {
      ko++;
      if (ko <= 2) {
        console.log(`  ${url}: ${e.message.slice(0, 120)}`);
      }
    }
  }
  console.log(`[Google Indexing API] ${ok} acceptées, ${ko} rejetées (normal si 403 Permission)`);
}

// ─── 3. Ping sitemap (legacy, mais parfois Google crawle) ─
async function pingSitemap() {
  console.log(`\n[Sitemap ping] ...`);
  const urls = [
    `https://www.google.com/ping?sitemap=${SITE}/sitemap.xml`,
    `https://www.bing.com/ping?sitemap=${SITE}/sitemap.xml`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      console.log(`  ${u.split("?")[0]} → ${r.status}`);
    } catch (e) {
      console.log(`  ${u} → err ${e.message}`);
    }
  }
}

(async () => {
  await indexNow();
  await googleIndexingApi();
  await pingSitemap();
  console.log("\n✅ Réindexation déclenchée. Compter 24-72h pour voir l'effet dans GSC.");
})().catch(e => { console.error(e); process.exit(1); });
