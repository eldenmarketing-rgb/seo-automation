import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { checkIndexation } from '../../gsc/indexation.js';

export function registerIndexCommand(bot: Bot<BotContext>) {
  bot.command('index', async (ctx) => {
    const siteArg = ctx.match?.trim();

    if (!siteArg) {
      const keyboard = new InlineKeyboard();
      for (const key of Object.keys(sites)) {
        keyboard.text(sites[key].name, `idx:${key}`).row();
      }
      await ctx.reply('Vérifier l\'indexation de quel site ?', { reply_markup: keyboard });
      return;
    }

    if (!sites[siteArg]) {
      await ctx.reply(`Site inconnu: ${siteArg}`);
      return;
    }

    await showIndexation(ctx, siteArg);
  });

  bot.callbackQuery(/^idx:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Vérification de l\'indexation...');
    await showIndexation(ctx, siteKey);
  });
}

async function showIndexation(ctx: BotContext, siteKey: string) {
  try {
    await ctx.reply(`Vérification indexation <b>${sites[siteKey].name}</b>...`, { parse_mode: 'HTML' });
    const report = await checkIndexation(siteKey);

    const pct = report.totalPages > 0 ? Math.round((report.indexedPages / report.totalPages) * 100) : 0;
    const bar = '\u2593'.repeat(Math.round(pct / 5)) + '\u2591'.repeat(20 - Math.round(pct / 5));

    let msg = `<b>Indexation — ${sites[siteKey].name}</b>\n\n`;
    msg += `${bar} ${pct}%\n`;
    msg += `Indexées: <b>${report.indexedPages}</b> / ${report.totalPages}\n\n`;

    if (report.notIndexedPages.length > 0) {
      msg += `<b>Non indexées (${report.notIndexedPages.length}) :</b>\n`;
      for (const slug of report.notIndexedPages.slice(0, 10)) {
        msg += `  - <code>${slug}</code>\n`;
      }
      if (report.notIndexedPages.length > 10) {
        msg += `  <i>... et ${report.notIndexedPages.length - 10} autres</i>\n`;
      }
    }

    if (report.lowImpressionPages.length > 0) {
      msg += `\n<b>Faibles impressions :</b>\n`;
      for (const p of report.lowImpressionPages.slice(0, 5)) {
        msg += `  - <code>${p.slug}</code> (${p.impressions} imp)\n`;
      }
    }

    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch (e) {
    await ctx.reply(`Erreur: ${(e as Error).message}`);
  }
}
