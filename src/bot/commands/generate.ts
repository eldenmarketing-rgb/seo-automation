import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { dailyGenerate } from '../../jobs/daily-generate.js';
import { generateMatrix } from '../../generators/city-service-matrix.js';
import { getExistingSlugs } from '../../db/supabase.js';
import { getExistingSlugsFromFiles } from '../../deployers/inject-pages.js';
import { generateBatch } from '../../generators/page-generator.js';
import { upsertSeoPage } from '../../db/supabase.js';
import { injectPages } from '../../deployers/inject-pages.js';
import { triggerDeploy } from '../../deployers/vercel-deploy.js';
import * as logger from '../../utils/logger.js';

// Track if a generation is already running
let isGenerating = false;

export function registerGenerateCommand(bot: Bot<BotContext>) {
  // /generate — all sites
  // /generate garage — specific site
  // /generate garage 10 — specific site + count
  bot.command('generate', async (ctx) => {
    if (isGenerating) {
      await ctx.reply('Une génération est déjà en cours. Patiente...');
      return;
    }

    const args = ctx.match?.trim().split(/\s+/) || [];
    const siteArg = args[0];
    const countArg = args[1] ? parseInt(args[1], 10) : undefined;

    // If no site specified, show selection keyboard
    if (!siteArg) {
      const keyboard = new InlineKeyboard();
      for (const key of Object.keys(sites)) {
        keyboard.text(sites[key].name, `gen:${key}`).row();
      }
      keyboard.text('Tous les sites', 'gen:all').row();

      await ctx.reply('Quel site ?', { reply_markup: keyboard });
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

    await runGeneration(ctx, siteArg, countArg);
  });

  // Handle inline keyboard callbacks
  bot.callbackQuery(/^gen:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Génération lancée pour: <b>${siteKey}</b>`, { parse_mode: 'HTML' });
    await runGeneration(ctx, siteKey);
  });
}

async function runGeneration(ctx: BotContext, siteKey: string, count?: number) {
  isGenerating = true;
  const pagesPerRun = count || parseInt(process.env.PAGES_PER_RUN || '5', 10);

  try {
    if (siteKey === 'all') {
      await ctx.reply(`Génération de ${pagesPerRun} pages/site pour tous les sites...`);
      const result = await dailyGenerate(pagesPerRun);
      if (result) {
        const lines = [`<b>Génération terminée</b> (${(result.duration / 1000).toFixed(0)}s)\n`];
        for (const [key, r] of Object.entries(result.sites)) {
          lines.push(`  <b>${key}</b>: ${r.generated} générées, ${r.deployed} déployées, ${r.errors} erreurs`);
        }
        lines.push(`\nTotal: ${result.totalGenerated} pages`);
        await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
      }
    } else {
      await generateForSite(ctx, siteKey, pagesPerRun);
    }
  } catch (e) {
    await ctx.reply(`Erreur: ${(e as Error).message}`);
  } finally {
    isGenerating = false;
  }
}

async function generateForSite(ctx: BotContext, siteKey: string, pagesPerRun: number) {
  const site = sites[siteKey];

  // Get remaining pages
  const matrix = generateMatrix(siteKey);
  const supabaseSlugs = await getExistingSlugs(siteKey);
  const fileSlugs = getExistingSlugsFromFiles(siteKey);
  const existingSlugs = [...new Set([...supabaseSlugs, ...fileSlugs])];
  const newPages = matrix.filter(p => !existingSlugs.includes(p.slug));

  if (newPages.length === 0) {
    await ctx.reply(`<b>${site.name}</b>: Toutes les pages sont déjà générées !`, { parse_mode: 'HTML' });
    return;
  }

  // Prioritize city pages first
  const prioritized = [
    ...newPages.filter(p => p.pageType === 'city'),
    ...newPages.filter(p => p.pageType === 'city_service'),
  ];

  const batch = prioritized.slice(0, pagesPerRun);

  await ctx.reply(
    `<b>${site.name}</b>\n` +
    `Reste ${newPages.length} pages à générer\n` +
    `Génération de ${batch.length} pages en cours...`,
    { parse_mode: 'HTML' }
  );

  const startTime = Date.now();
  const { success: generated, errors } = await generateBatch(batch, 2);

  // Store in Supabase
  for (const page of generated) {
    await upsertSeoPage(page);
  }

  // Inject into site files
  const injectedSlugs = await injectPages(siteKey, generated);

  // Deploy
  let deployOk = false;
  if (injectedSlugs.length > 0) {
    deployOk = await triggerDeploy(siteKey);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(0);
  const slugList = generated.slice(0, 10).map(p => `  • <code>${p.slug}</code>`).join('\n');
  const more = generated.length > 10 ? `\n  ... et ${generated.length - 10} autres` : '';

  await ctx.reply(
    `<b>${site.name} — Terminé</b> (${duration}s)\n\n` +
    `Générées: ${generated.length}\n` +
    `Injectées: ${injectedSlugs.length}\n` +
    `Deploy: ${deployOk ? '✅' : '❌'}\n` +
    `Erreurs: ${errors.length}\n\n` +
    `${slugList}${more}`,
    { parse_mode: 'HTML' }
  );
}
