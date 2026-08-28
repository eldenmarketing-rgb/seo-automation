/**
 * Affiche TOUS les domaines de l'analyse (pas juste les réplicables) à partir du JSON brut.
 * Trié par rank DataForSEO, regroupé par catégorie.
 */
import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('reports/sparty-backlinks.json', 'utf8'));

// On charge aussi le détail brut depuis l'API pour avoir TOUS les domaines (pas juste réplicables)
// Mais comme le script précédent ne sauve que `replicable` + `toxic`, on a besoin de relire
// les referring_domains complets. Comme alternative : on relit ce qui est dans le JSON.

console.log(`# Liste complète backlinks réplicables — s-party.fr\n`);
console.log(`Date : ${data.date.slice(0, 10)}\n`);
console.log(`Total domaines uniques analysés : ${data.totalUniqueRds}\n`);
console.log(`Domaines réplicables (catégorisés) : ${data.replicable.length}\n`);

// Top par rank toutes catégories confondues
console.log(`\n## TOUS LES RÉPLICABLES (${data.replicable.length}) — triés par rank\n`);
console.log('| # | Rank | Catégorie | Domaine | BL |');
console.log('|---|------|-----------|---------|-----|');
data.replicable
  .sort((a, b) => b.rank - a.rank)
  .forEach((d, i) => {
    console.log(`| ${i + 1} | ${d.rank} | ${d.category} | ${d.domain} | ${d.backlinks} |`);
  });

// Toxiques complets
console.log(`\n\n## TOXIQUES (${data.toxic.length}) — à éviter\n`);
data.toxic.forEach((d) => console.log(`- ${d.domain} (rank ${d.rank})`));
