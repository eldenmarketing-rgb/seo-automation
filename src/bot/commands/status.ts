import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { countPagesByStatus } from '../../db/supabase.js';
import { env, readEnvByName } from '../../config/env.js';

/**
 * `/status` — un coup d'œil par site : combien de pages dans chaque statut
 * (`seo_pages`), et si le hook de déploiement Vercel est configuré.
 * Le détail (backlog, indexation, GSC) est sur le dashboard.
 */
export function registerStatusCommand(bot: Bot<BotContext>) {
  bot.command('status', async (ctx) => {
    await ctx.reply('Chargement du status...');

    try {
      const lines: string[] = ['<b>SEO Automation — Status</b>\n'];

      for (const [siteKey, site] of Object.entries(sites)) {
        const counts = await countPagesByStatus(siteKey);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const hasHook = !!readEnvByName(site.vercelHookEnv);
        const detail = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([status, n]) => `${status} ${n}`)
          .join(' · ');

        lines.push(
          `<b>${site.name}</b>${hasHook ? '' : ' (pas de deploy hook)'}\n` +
            `  ${total} page${total > 1 ? 's' : ''}${detail ? ` — ${detail}` : ''}\n`,
        );
      }

      const envChecks = [
        ['Supabase', !!env.SUPABASE_URL],
        ['GSC (service account)', !!env.GSC_SERVICE_ACCOUNT_PATH],
        ['DataForSEO', !!env.DATAFORSEO_LOGIN],
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
