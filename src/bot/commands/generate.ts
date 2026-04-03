import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { dailyGenerate } from '../../jobs/daily-generate.js';
import { generateApprovedForSite } from '../../jobs/generate-approved.js';
import { getPendingPages } from '../../db/supabase.js';
import * as logger from '../../utils/logger.js';

// Track if a generation is already running
let isRunning = false;

export function registerGenerateCommand(bot: Bot<BotContext>) {
  // /generate — score pages (approval mode)
  // /generate garage — score for specific site
  // /generate garage 10 — score specific site + count
  bot.command('generate', async (ctx) => {
    if (isRunning) {
      await ctx.reply('Un scoring/génération est déjà en cours. Patiente...');
      return;
    }

    const args = ctx.match?.trim().split(/\s+/) || [];
    const siteArg = args[0];
    const countArg = args[1] ? parseInt(args[1], 10) : undefined;

    // If no site specified, show selection keyboard
    if (!siteArg) {
      // Show pending pages count if any
      const pending = await getPendingPages(undefined, 'pending_approval');
      const approved = await getPendingPages(undefined, 'approved');

      const keyboard = new InlineKeyboard();
      for (const key of Object.keys(sites)) {
        keyboard.text(sites[key].name, `gen:${key}`).row();
      }
      keyboard.text('Tous les sites', 'gen:all').row();

      let statusLine = '';
      if (pending.length > 0 || approved.length > 0) {
        statusLine = `\n\n📋 En attente: ${pending.length} | ✅ Approuvées: ${approved.length}\nTape /approve pour gérer les pages en attente.`;
      }

      await ctx.reply(
        `Quel site scorer ?${statusLine}\n\n<i>Le scoring propose des pages, tu approuves via /approve, puis on génère.</i>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
      return;
    }

    // Validate site key
    if (siteArg !== 'all' && !sites[siteArg]) {
      await ctx.reply(
        `Site inconnu: <b>${siteArg}</b>\n\nSites disponibles: ${Object.keys(sites).join(', ')}`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    await runScoring(ctx, siteArg, countArg);
  });

  // Handle inline keyboard callbacks
  bot.callbackQuery(/^gen:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Scoring lancé pour: <b>${siteKey}</b>`, { parse_mode: 'HTML' });
    await runScoring(ctx, siteKey);
  });
}

async function runScoring(ctx: BotContext, siteKey: string, count?: number) {
  isRunning = true;
  const pagesPerRun = count || parseInt(process.env.PAGES_PER_RUN || '5', 10);

  try {
    await ctx.reply(
      `⏳ Scoring de ${pagesPerRun} pages/site pour <b>${siteKey === 'all' ? 'tous les sites' : siteKey}</b>...\n\n` +
      `<i>Les pages scorées apparaîtront avec des boutons d'approbation.</i>`,
      { parse_mode: 'HTML' }
    );

    const result = await dailyGenerate(pagesPerRun);

    if (result) {
      const lines = [`<b>Scoring terminé</b> (${(result.duration / 1000).toFixed(0)}s)\n`];
      for (const [key, r] of Object.entries(result.sites)) {
        lines.push(`  <b>${key}</b>: ${r.scored} scorées, ${r.pending} en attente, ${r.queued} en file optim`);
      }
      lines.push(`\nTotal en attente: ${result.totalPending} pages`);
      if (result.totalPending > 0) {
        lines.push(`\nTape /approve pour valider les pages proposées.`);
      }
      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
    }
  } catch (e) {
    await ctx.reply(`Erreur: ${(e as Error).message}`);
  } finally {
    isRunning = false;
  }
}
