import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { findLowCtrPages, optimizeCtrForPage } from '../../gsc/ctr-optimizer.js';
import { triggerDeploy } from '../../deployers/vercel-deploy.js';

export function registerCtrCommand(bot: Bot<BotContext>) {
  bot.command('ctr', async (ctx) => {
    const siteArg = ctx.match?.trim();

    if (!siteArg) {
      const keyboard = new InlineKeyboard();
      for (const key of Object.keys(sites)) {
        keyboard.text(sites[key].name, `ctr:${key}`).row();
      }
      await ctx.reply('Optimiser le CTR de quel site ?', { reply_markup: keyboard });
      return;
    }

    if (!sites[siteArg]) {
      await ctx.reply(`Site inconnu: ${siteArg}`);
      return;
    }

    await showCtrReport(ctx, siteArg);
  });

  bot.callbackQuery(/^ctr:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('Analyse CTR en cours...');
    await showCtrReport(ctx, siteKey);
  });

  bot.callbackQuery(/^ctr_fix:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Optimisation CTR de <b>${sites[siteKey]?.name}</b> en cours...`, { parse_mode: 'HTML' });

    try {
      const pages = await findLowCtrPages(siteKey);
      let optimized = 0;

      for (const page of pages.slice(0, 5)) {
        const result = await optimizeCtrForPage(siteKey, page);
        if (result) {
          optimized++;
          const slug = page.page_url.split('/').pop() || '';
          await ctx.reply(
            `<code>${slug}</code>\n` +
            `Ancien: ${page.ctr}% CTR\n` +
            `Nouveau titre: <i>${result.metaTitle}</i>`,
            { parse_mode: 'HTML' }
          );
        }
        await new Promise(r => setTimeout(r, 1000)); // Rate limit
      }

      if (optimized > 0) {
        const ok = await triggerDeploy(siteKey);
        await ctx.reply(
          `<b>CTR optimisé: ${optimized} pages</b>\n` +
          `Deploy: ${ok ? 'OK' : 'ECHEC'}`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply('Aucune page à optimiser.');
      }
    } catch (e) {
      await ctx.reply(`Erreur: ${(e as Error).message}`);
    }
  });
}

async function showCtrReport(ctx: BotContext, siteKey: string) {
  try {
    const pages = await findLowCtrPages(siteKey);

    if (pages.length === 0) {
      await ctx.reply(`<b>${sites[siteKey].name}</b> — Aucune page avec CTR faible en top 10.\n\nSoit le CTR est bon, soit il n'y a pas assez de données.`, { parse_mode: 'HTML' });
      return;
    }

    let msg = `<b>Pages CTR faible — ${sites[siteKey].name}</b>\n\n`;
    msg += `<i>Pages en top 10 avec CTR < 3%</i>\n\n`;

    for (const page of pages.slice(0, 8)) {
      const slug = page.page_url.split('/').pop() || page.page_url;
      msg += `<code>${slug}</code>\n`;
      msg += `  #${page.avg_position} | ${page.ctr}% CTR | ${page.impressions} imp | ${page.clicks} clics\n`;
      msg += `  Requêtes: ${page.top_queries.slice(0, 3).map(q => `"${q}"`).join(', ')}\n\n`;
    }

    const keyboard = new InlineKeyboard();
    keyboard.text(`Optimiser les titres (${Math.min(pages.length, 5)} pages)`, `ctr_fix:${siteKey}`).row();

    await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply(`Erreur: ${(e as Error).message}`);
  }
}
