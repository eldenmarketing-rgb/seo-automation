/**
 * État du système en une commande : sites actifs, hooks de déploiement,
 * variables d'environnement, crons. Aucune écriture.
 *
 * Usage : npm run status   (= npx tsx scripts/run.ts)
 */
import { env, describeEnv, readEnvByName } from '../src/config/env.js';
import { sites } from '../config/sites.js';

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║         SEO AUTOMATION SYSTEM                ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

console.log('📋 Sites actifs (site_profiles) :');
console.log('─'.repeat(60));
for (const [key, site] of Object.entries(sites)) {
  const hookConfigured = !!readEnvByName(site.vercelHookEnv);
  console.log(`  ${key.padEnd(15)} ${site.name.padEnd(25)} ${hookConfigured ? '✅' : '❌'} Deploy hook`);
  console.log(`  ${''.padEnd(15)} ${site.domain}`);
}

console.log('');
console.log("🔑 Variables d'environnement :");
console.log('─'.repeat(60));
for (const { name, set, required } of describeEnv()) {
  console.log(`  ${set ? '✅' : required ? '❌' : '➖'} ${name}${required ? '' : ' (optionnel)'}`);
}

console.log('');
console.log('📅 Crons installés (bash scripts/setup-crons.sh) :');
console.log('─'.repeat(60));
console.log('  30 6 * * *   Sync GSC quotidienne         src/jobs/gsc-sync.ts');
console.log('  45 6 * * 1   Crawl + funnel indexation    scripts/crawl.ts --apply');
console.log('  30 7 * * 1   Scan backlog (dashboard)     POST /api/backlog/scan');
console.log('  0  8 * * 1   Audit GSC hebdo              src/jobs/weekly-gsc-audit.ts');
console.log('  0 22 * * 0   Clustering mots-clés         src/jobs/weekly-clustering.ts');
console.log('');
console.log(`  Supabase : ${env.SUPABASE_URL}`);
console.log('');
