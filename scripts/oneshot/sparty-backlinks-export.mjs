/**
 * Export complet de TOUS les domaines analysés (réplicables + autre + spam),
 * triés par rank, dans un markdown facile à consulter.
 */
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('reports/sparty-backlinks.json', 'utf8'));
const all = data.allDomains || [];

let out = `# Backlinks concurrents s-party.fr — liste complète\n\n`;
out += `Date : ${data.date.slice(0, 10)}\n`;
out += `Concurrents : ${data.competitors.join(', ')}\n`;
out += `Total domaines uniques : ${all.length}\n`;
out += `Réplicables catégorisés : ${data.replicable.length} · Toxiques : ${data.toxic.length} · Autre : ${all.length - data.replicable.length - data.toxic.length}\n\n`;

// 1. TOUS LES RÉPLICABLES (triés rank desc)
out += `## ✅ Réplicables (${data.replicable.length}) — triés par rank\n\n`;
out += `| # | Rank | Cat | Domaine | BL | Sources |\n|---|------|-----|---------|----|---------|\n`;
[...data.replicable]
  .sort((a, b) => b.rank - a.rank)
  .forEach((d, i) => {
    out += `| ${i + 1} | ${d.rank} | ${d.category} | ${d.domain} | ${d.backlinks} | ${d.sources.join(',')} |\n`;
  });

// 2. "AUTRE" (non catégorisés — potentiellement plein d'opportunités) — triés par rank
const autre = all.filter((d) => d.category === 'autre').sort((a, b) => b.rank - a.rank);
out += `\n\n## ❓ Catégorie "autre" (${autre.length}) — à filtrer manuellement, triés par rank\n\n`;
out += `| # | Rank | Domaine | BL | Sources |\n|---|------|---------|----|---------|\n`;
autre.forEach((d, i) => {
  out += `| ${i + 1} | ${d.rank} | ${d.domain} | ${d.backlinks} | ${d.sources.join(',')} |\n`;
});

// 3. TOXIQUES
out += `\n\n## ⚠️ Toxiques (${data.toxic.length}) — à éviter\n\n`;
data.toxic.forEach((d) => {
  out += `- ${d.domain} (rank ${d.rank})\n`;
});

writeFileSync('reports/sparty-backlinks-full.md', out);
console.log(`✓ Export complet : reports/sparty-backlinks-full.md`);
console.log(`  ${data.replicable.length} réplicables · ${autre.length} "autre" · ${data.toxic.length} toxiques`);
