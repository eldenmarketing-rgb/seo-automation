import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { requestIndexation, requestBulkIndexation } from '../../deployers/indexing.js';
import { getExistingSlugsFromFiles } from '../../deployers/inject-pages.js';
import { getExistingSlugs } from '../../db/supabase.js';

export function registerPingCommand(bot: Bot<BotContext>) {
  // /ping site slug — index a single page
  // /ping site all — index all pages
  bot.command('ping', async (ctx) => {
    const args = ctx.match?.trim().split(/\s+/) || [];

    if (args.length < 2) {
      await ctx.reply(
        `<b>Indexation instantanée</b>\n\n` +
          `<b>Usage :</b>\n` +
          `/ping [site] [slug] — Indexer une page\n` +
          `/ping [site] all — Indexer toutes les pages\n\n` +
          `<b>Exemple :</b>\n` +
          `/ping garage vidange-perpignan\n` +
          `/ping vtc all`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    const [siteKey, target] = args;

    if (!sites[siteKey]) {
      await ctx.reply(`Site inconnu: ${siteKey}\nDisponibles: ${Object.keys(sites).join(', ')}`);
      return;
    }

    if (target === 'all') {
      await pingAll(ctx, siteKey);
    } else {
      await pingOne(ctx, siteKey, target);
    }
  });
}

async function pingOne(ctx: BotContext, siteKey: string, slug: string) {
  const site = sites[siteKey];
  await ctx.reply(`🔔 Demande d'indexation: <code>${slug}</code>...`, { parse_mode: 'HTML' });

  try {
    const result = await requestIndexation(siteKey, slug);

    let msg = `<b>📡 Indexation — ${slug}</b>\n\n`;
    msg += `URL: ${site.domain}/${slug}\n\n`;
    msg += `Google Indexing API: ${result.google ? '✅' : '⚠️ 403 (normal)'}\n`;
    msg += `IndexNow (Bing): ${result.indexNow ? '✅' : '❌'}\n`;
    msg += `Sitemap ping: ${result.sitemapPing ? '✅' : '❌'}\n`;

    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch (e) {
    await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
  }
}

async function pingAll(ctx: BotContext, siteKey: string) {
  const site = sites[siteKey];

  // Get all slugs
  const dbSlugs = await getExistingSlugs(siteKey);
  const fileSlugs = getExistingSlugsFromFiles(siteKey);
  const allSlugs = [...new Set([...dbSlugs, ...fileSlugs])];

  if (allSlugs.length === 0) {
    await ctx.reply(`Aucune page trouvée pour ${site.name}`);
    return;
  }

  await ctx.reply(
    `🔔 Indexation de <b>${allSlugs.length} pages</b> pour ${site.name}...\n` +
      `<i>Google: max 20/jour | IndexNow: toutes</i>`,
    { parse_mode: 'HTML' },
  );

  try {
    const result = await requestBulkIndexation(siteKey, allSlugs);

    let msg = `<b>📡 Indexation bulk — ${site.name}</b>\n\n`;
    msg += `Total pages: ${result.total}\n`;
    msg += `Google Indexing API: ${result.google}/${Math.min(result.total, 20)}\n`;
    msg += `IndexNow (Bing/Yandex): ${result.indexNow > 0 ? '✅' : '❌'} ${result.indexNow} pages\n`;
    msg += `Sitemap ping: ✅\n`;

    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch (e) {
    await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
  }
}
