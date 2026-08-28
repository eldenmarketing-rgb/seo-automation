import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const sc = google.searchconsole({ version: "v1", auth });

const PROPS = [
  "sc-domain:livraison-alcool-nuit-perpignan.com",
  "https://livraison-alcool-nuit-perpignan.com/",
];

const fmt = (d: Date) => d.toISOString().slice(0, 10);

async function globalForRange(prop: string, start: Date, end: Date) {
  const r = await sc.searchanalytics.query({
    siteUrl: prop,
    requestBody: { startDate: fmt(start), endDate: fmt(end), rowLimit: 1 },
  });
  return r.data.rows?.[0];
}

async function byDate(prop: string, start: Date, end: Date) {
  const r = await sc.searchanalytics.query({
    siteUrl: prop,
    requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions: ["date"], rowLimit: 200 },
  });
  return r.data.rows || [];
}

async function topQueries(prop: string, start: Date, end: Date, n = 30) {
  const r = await sc.searchanalytics.query({
    siteUrl: prop,
    requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions: ["query"], rowLimit: n },
  });
  return r.data.rows || [];
}

async function topPages(prop: string, start: Date, end: Date, n = 30) {
  const r = await sc.searchanalytics.query({
    siteUrl: prop,
    requestBody: { startDate: fmt(start), endDate: fmt(end), dimensions: ["page"], rowLimit: n },
  });
  return r.data.rows || [];
}

async function run(prop: string) {
  console.log(`\n=== ${prop} ===`);

  try {
    const smap = await sc.sitemaps.list({ siteUrl: prop });
    console.log("Sitemaps:");
    (smap.data.sitemap || []).forEach((s) =>
      console.log(
        `  ${s.path} — last ${s.lastSubmitted?.slice(0, 10)} · submitted ${s.contents?.[0]?.submitted} · indexed ${s.contents?.[0]?.indexed} · errors ${s.errors} · warnings ${s.warnings}`,
      ),
    );
  } catch (e: any) {
    console.log("sitemaps err:", e.message);
    return false;
  }

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() - 3);

  const w1End = end;
  const w1Start = new Date(end);
  w1Start.setDate(w1Start.getDate() - 27);

  const w2End = new Date(w1Start);
  w2End.setDate(w2End.getDate() - 1);
  const w2Start = new Date(w2End);
  w2Start.setDate(w2Start.getDate() - 27);

  const w3End = new Date(w2Start);
  w3End.setDate(w3End.getDate() - 1);
  const w3Start = new Date(w3End);
  w3Start.setDate(w3Start.getDate() - 27);

  console.log("\nÉvolution par tranche 28 jours (clics · impr · CTR · pos):");
  for (const [label, s, e] of [
    ["D-87 → D-60", w3Start, w3End],
    ["D-59 → D-31", w2Start, w2End],
    ["D-30 → D-3 ", w1Start, w1End],
  ] as const) {
    const row = await globalForRange(prop, s, e);
    if (!row) { console.log(`  ${label} | no data`); continue; }
    console.log(
      `  ${label} (${fmt(s)} → ${fmt(e)}) | clics ${row.clicks || 0} · impr ${row.impressions || 0} · CTR ${((row.ctr || 0) * 100).toFixed(1)}% · pos ${row.position?.toFixed(1)}`,
    );
  }

  console.log("\nTimeline hebdo (7j) derniers 84 jours:");
  const longStart = new Date(end);
  longStart.setDate(longStart.getDate() - 83);
  const daily = await byDate(prop, longStart, end);
  const byWeek: Record<string, { c: number; i: number; p: number; n: number }> = {};
  daily.forEach((r) => {
    const d = r.keys?.[0] || "";
    const dt = new Date(d);
    const weekStart = new Date(dt);
    weekStart.setDate(dt.getDate() - dt.getDay());
    const k = fmt(weekStart);
    byWeek[k] = byWeek[k] || { c: 0, i: 0, p: 0, n: 0 };
    byWeek[k].c += r.clicks || 0;
    byWeek[k].i += r.impressions || 0;
    byWeek[k].p += r.position || 0;
    byWeek[k].n += 1;
  });
  Object.keys(byWeek)
    .sort()
    .forEach((k) => {
      const w = byWeek[k];
      console.log(`  semaine ${k} | clics ${w.c} · impr ${w.i} · pos moy ${(w.p / Math.max(w.n, 1)).toFixed(1)} · jours ${w.n}`);
    });

  console.log("\nTop 20 queries (D-30 → D-3):");
  const q = await topQueries(prop, w1Start, w1End, 20);
  q.forEach((r) =>
    console.log(
      `  "${r.keys?.[0]}" pos ${r.position?.toFixed(1)} · imp ${r.impressions} · clics ${r.clicks} · CTR ${((r.ctr || 0) * 100).toFixed(1)}%`,
    ),
  );

  console.log("\nComparaison queries D-59 → D-31 vs D-30 → D-3 (top 30 par impr récentes):");
  const recent = await topQueries(prop, w1Start, w1End, 30);
  const older = await topQueries(prop, w2Start, w2End, 100);
  const oldMap = new Map<string, { pos?: number; imp?: number; clicks?: number }>();
  older.forEach((r) => oldMap.set(r.keys?.[0] || "", { pos: r.position, imp: r.impressions, clicks: r.clicks }));
  recent.forEach((r) => {
    const k = r.keys?.[0] || "";
    const o = oldMap.get(k);
    const oldPos = o?.pos?.toFixed(1) || "—";
    const newPos = r.position?.toFixed(1) || "—";
    const delta =
      o?.pos && r.position ? (r.position - o.pos).toFixed(1) : "—";
    const oldImp = o?.imp || 0;
    console.log(
      `  "${k}" pos ${oldPos} → ${newPos} (Δ ${delta}) · impr ${oldImp} → ${r.impressions} · clics ${o?.clicks || 0} → ${r.clicks}`,
    );
  });

  console.log("\nTop 20 pages (D-30 → D-3):");
  const p = await topPages(prop, w1Start, w1End, 20);
  p.forEach((r) => console.log(`  ${r.keys?.[0]} imp ${r.impressions} · clics ${r.clicks} · pos ${r.position?.toFixed(1)}`));

  return true;
}

(async () => {
  for (const p of PROPS) {
    try {
      if (await run(p)) return;
    } catch (e: any) {
      console.log(`skipped ${p}: ${e.message}`);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
