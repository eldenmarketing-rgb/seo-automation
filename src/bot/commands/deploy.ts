import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { triggerDeploy } from '../../deployers/vercel-deploy.js';

export function registerDeployCommand(bot: Bot<BotContext>) {
  bot.command('deploy', async (ctx) => {
    const siteArg = ctx.match?.trim();

    if (!siteArg) {
      const keyboard = new InlineKeyboard();
      for (const key of Object.keys(sites)) {
        const hookEnv = sites[key].vercelHookEnv;
        const hasHook = !!process.env[hookEnv];
        keyboard.text(`${hasHook ? '' : '⛔ '}${sites[key].name}`, `deploy:${key}`).row();
      }
      await ctx.reply('Quel site redéployer ?', { reply_markup: keyboard });
      return;
    }

    if (!sites[siteArg]) {
      await ctx.reply(`Site inconnu: ${siteArg}\nDisponibles: ${Object.keys(sites).join(', ')}`);
      return;
    }

    await doDeploy(ctx, siteArg);
  });

  bot.callbackQuery(/^deploy:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Déploiement lancé pour: <b>${sites[siteKey]?.name}</b>`, { parse_mode: 'HTML' });
    await doDeploy(ctx, siteKey);
  });
}

async function doDeploy(ctx: BotContext, siteKey: string) {
  const site = sites[siteKey];
  const hookEnv = site.vercelHookEnv;

  if (!process.env[hookEnv]) {
    await ctx.reply(`⛔ Pas de deploy hook configuré pour <b>${site.name}</b>\n\nAjoute <code>${hookEnv}</code> dans .env`, { parse_mode: 'HTML' });
    return;
  }

  await ctx.reply(`Déploiement de <b>${site.name}</b> en cours...`, { parse_mode: 'HTML' });
  const ok = await triggerDeploy(siteKey);

  if (ok) {
    await ctx.reply(`✅ <b>${site.name}</b> — déploiement lancé sur Vercel`, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ <b>${site.name}</b> — échec du déploiement`, { parse_mode: 'HTML' });
  }
}
