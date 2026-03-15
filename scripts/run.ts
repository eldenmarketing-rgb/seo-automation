import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../config/sites.js';
import { getMatrixStats } from '../src/generators/city-service-matrix.js';
import * as logger from '../src/utils/logger.js';

/**
 * Main entry point — displays system status and matrix stats.
 * Usage: npx tsx scripts/run.ts [command]
 *
 * Commands:
 *   status   - Show configuration and matrix stats (default)
 *   generate - Run daily generation
 *   audit    - Run GSC audit
 *   optimize - Run content optimization
 */

const command = process.argv[2] || 'status';

async function main() {
  switch (command) {
    case 'status':
      showStatus();
      break;

    case 'generate':
      logger.info('Launching daily generation...');
      await import('../src/jobs/daily-generate.js');
      break;

    case 'audit':
      logger.info('Launching GSC audit...');
      await import('../src/jobs/weekly-gsc-audit.js');
      break;

    case 'optimize':
      logger.info('Launching optimization...');
      await import('../src/jobs/monthly-optimize.js');
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available: status, generate, audit, optimize');
      process.exit(1);
  }
}

function showStatus() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         SEO AUTOMATION SYSTEM                ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Sites config
  console.log('📋 Sites configurés:');
  console.log('─'.repeat(60));
  for (const [key, site] of Object.entries(sites)) {
    const hookConfigured = !!process.env[site.vercelHookEnv];
    console.log(`  ${key.padEnd(15)} ${site.name.padEnd(25)} ${hookConfigured ? '✅' : '❌'} Deploy hook`);
    console.log(`  ${''.padEnd(15)} ${site.domain}`);
  }

  // Matrix stats
  console.log('');
  console.log('📊 Matrice ville × service:');
  console.log('─'.repeat(60));
  const stats = getMatrixStats();
  let grandTotal = 0;
  for (const [key, s] of Object.entries(stats)) {
    console.log(`  ${key.padEnd(15)} ${s.cities} villes × ${s.services} services`);
    console.log(`  ${''.padEnd(15)} ${s.cityPages} pages ville + ${s.comboPages} pages combo = ${s.total} total`);
    grandTotal += s.total;
  }
  console.log('─'.repeat(60));
  console.log(`  TOTAL: ${grandTotal} pages SEO à générer`);

  // Env check
  console.log('');
  console.log('🔑 Variables d\'environnement:');
  console.log('─'.repeat(60));
  const envVars = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_KEY',
    'ANTHROPIC_API_KEY',
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
    'GSC_CLIENT_ID', 'GSC_CLIENT_SECRET', 'GSC_REFRESH_TOKEN',
    'VERCEL_HOOK_GARAGE', 'VERCEL_HOOK_CARROSSERIE', 'VERCEL_HOOK_MASSAGE', 'VERCEL_HOOK_VTC',
  ];
  for (const v of envVars) {
    const set = !!process.env[v];
    console.log(`  ${set ? '✅' : '❌'} ${v}`);
  }

  console.log('');
  console.log('📅 Cron jobs:');
  console.log('─'.repeat(60));
  console.log('  0 6 * * *    Génération quotidienne (5 pages/site)');
  console.log('  0 8 * * 1    Audit GSC hebdomadaire');
  console.log('  0 10 1 * *   Optimisation mensuelle');
  console.log('');
  console.log('🚀 Commandes:');
  console.log('  npx tsx scripts/run.ts generate   Lancer la génération');
  console.log('  npx tsx scripts/run.ts audit       Lancer l\'audit GSC');
  console.log('  npx tsx scripts/run.ts optimize    Lancer l\'optimisation');
  console.log('  npx tsx scripts/setup-db.ts        Setup base de données');
  console.log('  bash scripts/setup-crons.sh        Installer les cron jobs');
  console.log('');
}

main().catch(e => {
  logger.error(`Error: ${e.message}`);
  process.exit(1);
});
