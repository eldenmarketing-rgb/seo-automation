import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { getGscSummary } from '../../gsc/client.js';

export function registerSeoCommand(bot: Bot<BotContext>) {
  bot.command('seo', async (ctx) => {
    const siteArg = ctx.match?.trim();

    if (!siteArg) {
      const keyboard = new InlineKeyboard();
      for (const key of Object.keys(sites)) {
        keyboard.text(sites[key].name, `seo:${key}`).row();
      }
      keyboard.text('Tous les sites', 'seo:all').row();
      await ctx.reply('Rapport SEO de quel site ?', { reply_markup: keyboard });
      return;
    }

    if (siteArg === 'all') {
      await showAllSeo(ctx);
    } else if (sites[siteArg]) {
      await showSiteSeo(ctx, siteArg);
    } else {
      await ctx.reply(`Site inconnu: ${siteArg}\nDisponibles: ${Object.keys(sites).join(', ')}`);
    }
  });

  bot.callbackQuery(/^seo:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Chargement des données GSC...');

    if (siteKey === 'all') {
      await showAllSeo(ctx);
    } else {
      await showSiteSeo(ctx, siteKey);
    }
  });
}

async function showSiteSeo(ctx: BotContext, siteKey: string) {
  const site = sites[siteKey];

  try {
    await ctx.reply(`📊 Analyse GSC de <b>${site.name}</b>...`, { parse_mode: 'HTML' });
    const summary = await getGscSummary(siteKey);

    if (summary.totalImpressions === 0) {
      await ctx.reply(
        `<b>${site.name}</b> — Aucune donnée GSC\n\n` +
        `Vérifie que le site est bien ajouté dans Search Console et que le service account a accès.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    const posBar = (n: number) => '▓'.repeat(Math.min(n, 20)) + '░'.repeat(Math.max(20 - n, 0));

    let msg = `<b>📊 ${site.name} — Rapport SEO (28j)</b>\n\n`;
    msg += `Impressions: <b>${summary.totalImpressions.toLocaleString('fr-FR')}</b>\n`;
    msg += `Clics: <b>${summary.totalClicks.toLocaleString('fr-FR')}</b>\n`;
    msg += `Position moyenne: <b>${summary.avgPosition.toFixed(1)}</b>\n\n`;

    msg += `<b>Pages par position :</b>\n`;
    msg += `  Top 3:  ${posBar(summary.pagesInTop3)} ${summary.pagesInTop3}\n`;
    msg += `  Top 10: ${posBar(summary.pagesInTop10)} ${summary.pagesInTop10}\n`;
    msg += `  #5-#15: ${posBar(summary.pages5to15)} ${summary.pages5to15} ← à optimiser\n\n`;

    msg += `<b>Top requêtes :</b>\n`;
    for (const q of summary.topQueries.slice(0, 10)) {
      const pos = q.position <= 3 ? `🟢 #${q.position}` :
                  q.position <= 10 ? `🟡 #${q.position}` :
                  `🔴 #${q.position}`;
      msg += `  ${pos} "${q.query}" (${q.impressions} imp, ${q.clicks} clics)\n`;
    }

    if (summary.pages5to15 > 0) {
      msg += `\n💡 <b>${summary.pages5to15} pages</b> entre #5-#15 peuvent être optimisées.\n`;
      msg += `Lance /optimize ${siteKey} pour les améliorer.`;
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch (e) {
    await ctx.reply(`❌ Erreur GSC pour ${site.name}: ${(e as Error).message}`);
  }
}

async function showAllSeo(ctx: BotContext) {
  await ctx.reply('📊 Chargement des données GSC pour tous les sites...');

  let msg = '<b>📊 Rapport SEO — Tous les sites (28j)</b>\n\n';

  for (const [siteKey, site] of Object.entries(sites)) {
    try {
      const summary = await getGscSummary(siteKey);

      if (summary.totalImpressions === 0) {
        msg += `<b>${site.name}</b>: pas de données\n\n`;
        continue;
      }

      msg += `<b>${site.name}</b>\n`;
      msg += `  ${summary.totalImpressions.toLocaleString('fr-FR')} imp | ${summary.totalClicks.toLocaleString('fr-FR')} clics | pos moy: ${summary.avgPosition.toFixed(1)}\n`;
      msg += `  Top 3: ${summary.pagesInTop3} | Top 10: ${summary.pagesInTop10} | À optimiser: ${summary.pages5to15}\n\n`;
    } catch (e) {
      msg += `<b>${site.name}</b>: ❌ ${(e as Error).message.slice(0, 50)}\n\n`;
    }
  }

  await ctx.reply(msg, { parse_mode: 'HTML' });
}
