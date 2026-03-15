import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { checkUptime } from '../../monitoring/uptime.js';
import { sites } from '../../../config/sites.js';

export function registerMonitorCommand(bot: Bot<BotContext>) {
  bot.command('monitor', async (ctx) => {
    await ctx.reply('Vérification des sites...');

    try {
      const results = await checkUptime();

      const lines = ['<b>Monitoring Uptime</b>\n'];
      for (const [siteKey, isUp] of Object.entries(results)) {
        const site = sites[siteKey];
        lines.push(`  ${isUp ? '✅' : '🔴'} <b>${site.name}</b> — ${site.domain}`);
      }

      const allUp = Object.values(results).every(Boolean);
      lines.push(`\n${allUp ? 'Tous les sites sont en ligne.' : '⚠️ Un ou plusieurs sites sont down !'}`);

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`Erreur monitoring: ${(e as Error).message}`);
    }
  });
}
