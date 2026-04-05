import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { getMatrixStats } from '../../generators/city-service-matrix.js';
import { getExistingSlugs } from '../../db/supabase.js';
import { getExistingSlugsFromFiles } from '../../deployers/inject-pages.js';

export function registerStatusCommand(bot: Bot<BotContext>) {
  bot.command('status', async (ctx) => {
    await ctx.reply('Chargement du status...');

    try {
      const stats = getMatrixStats();
      const lines: string[] = ['<b>SEO Automation — Status</b>\n'];

      let totalMatrix = 0;
      let totalExisting = 0;
      let totalRemaining = 0;

      for (const [siteKey, site] of Object.entries(sites)) {
        const stat = stats[siteKey];
        const supabaseSlugs = await getExistingSlugs(siteKey);
        const fileSlugs = getExistingSlugsFromFiles(siteKey);
        const existing = [...new Set([...supabaseSlugs, ...fileSlugs])].length;
        const remaining = stat.total - existing;

        totalMatrix += stat.total;
        totalExisting += existing;
        totalRemaining += remaining;

        const pct = stat.total > 0 ? Math.round((existing / stat.total) * 100) : 0;
        const bar = progressBar(pct);

        const hookEnv = site.vercelHookEnv;
        const hasHook = !!process.env[hookEnv];

        lines.push(
          `<b>${site.name}</b>` +
          `${hasHook ? '' : ' (pas de deploy hook)'}\n` +
          `  ${bar} ${pct}%\n` +
          `  ${existing}/${stat.total} pages (reste ${remaining})\n` +
          `  ${stat.cities} villes × ${stat.services} services\n`
        );
      }

      const totalPct = totalMatrix > 0 ? Math.round((totalExisting / totalMatrix) * 100) : 0;

      lines.push(
        `<b>TOTAL</b>\n` +
        `  ${progressBar(totalPct)} ${totalPct}%\n` +
        `  ${totalExisting}/${totalMatrix} pages (reste ${totalRemaining})\n`
      );

      // Environment status
      const envChecks = [
        ['Supabase', !!process.env.SUPABASE_URL],
        ['Claude API', !!process.env.ANTHROPIC_API_KEY],
        ['GSC', !!process.env.GSC_CLIENT_ID],
      ] as const;

      lines.push('<b>Services</b>');
      for (const [name, ok] of envChecks) {
        lines.push(`  ${ok ? '✅' : '❌'} ${name}`);
      }

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`Erreur: ${(e as Error).message}`);
    }
  });
}

function progressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}
