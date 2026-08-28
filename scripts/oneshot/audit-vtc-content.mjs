import { readFileSync } from "fs";
import path from "path";

const file = readFileSync("/home/ubuntu/sites/ideal-transport/lib/cities.tsx", "utf8");

// Split by city objects — naive but works: split on "slug:"
const chunks = file.split(/\n  \{\n    slug:/).slice(1);

const cities = chunks.map((chunk) => {
  const slugMatch = chunk.match(/^\s*["']([^"']+)["']/);
  const nameMatch = chunk.match(/name:\s*["']([^"']+)["']/);
  const intro = chunk.match(/intro:\s*\n?\s*["']([^"']+)["']/)?.[1] || "";
  const routesCount = (chunk.match(/{ label:/g) || []).length;
  const highlightsCount = (chunk.match(/highlights:\s*\[([\s\S]*?)\]/)?.[1].match(/"/g) || []).length / 2;
  const nearbyCount = (chunk.match(/nearbyPlaces:\s*\[([\s\S]*?)\]/)?.[1].match(/"/g) || []).length / 2;
  const seoSectionsCount = (chunk.match(/seoSections:\s*\[/) ? (chunk.match(/^\s+title:/gm) || []).length : 0);
  const faqCount = (chunk.match(/faq:\s*\[/) ? (chunk.match(/question:/g) || []).length : 0);
  const hasSeoComponent = /seoTextComponent/.test(chunk);
  const totalChars = chunk.length;
  // count words in all content fields together (rough)
  const allText = chunk.replace(/[{}[\]"',:]/g, " ");
  const words = allText.split(/\s+/).filter(w => w.length > 2).length;

  return {
    slug: slugMatch?.[1],
    name: nameMatch?.[1],
    introWords: intro.split(/\s+/).filter(Boolean).length,
    routes: routesCount,
    highlights: highlightsCount,
    nearby: nearbyCount,
    seoSections: seoSectionsCount,
    faq: faqCount,
    hasComponent: hasSeoComponent,
    approxWords: words,
  };
});

// GSC data (from previous run, baked in for cross-ref)
const gsc = {
  "taxi-vtc-perpignan": { imp: 292, clicks: 1, pos: 37.3 },
  "taxi-vtc-aeroport-beziers": { imp: 274, clicks: 0, pos: 32.8 },
  "taxi-vtc-gare-perpignan": { imp: 206, clicks: 2, pos: 19.6 },
  "taxi-vtc-leucate": { imp: 111, clicks: 0, pos: 12.5 },
  "taxi-vtc-vernet-les-bains": { imp: 88, clicks: 0, pos: 19.4 },
  "taxi-vtc-sainte-marie-la-mer": { imp: 51, clicks: 0, pos: 34.0 },
  "taxi-vtc-argeles-sur-mer": { imp: 40, clicks: 0, pos: 10.2 },
  "taxi-vtc-saint-laurent-de-la-salanque": { imp: 16, clicks: 1, pos: 8.9 },
  "taxi-vtc-font-romeu": { imp: 13, clicks: 0, pos: 13.4 },
  "taxi-vtc-ceret": { imp: 6, clicks: 0, pos: 7.3 },
  "taxi-vtc-cabestany": { imp: 4, clicks: 0, pos: 17.3 },
  "taxi-vtc-rivesaltes": { imp: 1, clicks: 0, pos: 7.0 },
  "taxi-vtc-elne": { imp: 1, clicks: 0, pos: 10.0 },
  "taxi-vtc-saint-esteve": { imp: 1, clicks: 0, pos: 9.0 },
};

console.log("\n=== Audit contenu pages villes ideal-transport.fr ===\n");
console.log(
  "NAME".padEnd(28),
  "intro".padStart(5),
  "rt".padStart(3),
  "hl".padStart(3),
  "nb".padStart(3),
  "seo".padStart(4),
  "faq".padStart(3),
  "cmp".padStart(3),
  "~words".padStart(7),
  "  ".padEnd(3),
  "IMP".padStart(5),
  "POS".padStart(6),
);
console.log("-".repeat(90));

cities.sort((a, b) => (gsc[b.slug]?.imp || 0) - (gsc[a.slug]?.imp || 0));

for (const c of cities) {
  const g = gsc[c.slug] || { imp: 0, pos: null };
  console.log(
    (c.name || c.slug).padEnd(28),
    String(c.introWords).padStart(5),
    String(c.routes).padStart(3),
    String(c.highlights).padStart(3),
    String(c.nearby).padStart(3),
    String(c.seoSections).padStart(4),
    String(c.faq).padStart(3),
    (c.hasComponent ? "Y" : "·").padStart(3),
    String(c.approxWords).padStart(7),
    "  ",
    String(g.imp).padStart(5),
    (g.pos ? g.pos.toFixed(1) : "—").padStart(6),
  );
}

console.log("\nLégende : intro=mots intro · rt=routes · hl=highlights · nb=nearby · seo=seoSections · faq=questions · cmp=seoTextComponent");

// Identify thin
console.log("\n→ Pages les plus pauvres (faible volume mots) :");
[...cities].sort((a, b) => a.approxWords - b.approxWords).slice(0, 10).forEach(c => {
  const g = gsc[c.slug];
  console.log(`  ${c.name.padEnd(28)} ~${c.approxWords}w · seoSections=${c.seoSections} · faq=${c.faq} · imp90j=${g?.imp || 0}`);
});
