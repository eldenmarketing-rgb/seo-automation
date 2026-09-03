/**
 * Bot Telegram (Grammy) — point d'entrée du process pm2 `seo-bot`.
 *
 * Rôle : `/voiture` et `/produit` pour les groupes clients, quelques commandes
 * d'exploitation pour l'admin, et la boucle de monitoring uptime. La liste des
 * commandes vit dans `./commands/index.ts`.
 */
import { env, requireEnv } from '../config/env.js';
import { Bot, Context, session, SessionFlavor } from 'grammy';
import * as logger from '../utils/logger.js';
import { registerAllCommands, ADMIN_ONLY_COMMANDS, BOT_COMMANDS } from './commands/index.js';
import { checkUptime } from '../monitoring/uptime.js';
import { isAuthorized, isAdmin } from './permissions.js';

export interface SessionData {
  awaitingInput?: string;
  context?: Record<string, unknown>;
  /** Site sélectionné par l'admin pour /voiture (les groupes clients sont liés à leur site). */
  carSiteKey?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<BotContext>(requireEnv('TELEGRAM_BOT_TOKEN'));

// Session middleware
bot.use(session({ initial: (): SessionData => ({}) }));

// Auth middleware — admin + groupes configurés, tout le reste est ignoré en silence
bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId || !isAuthorized(chatId)) {
    logger.warn(`Unauthorized access from chat ${chatId}`);
    return;
  }
  await next();
});

// Garde admin — les groupes n'ont que les commandes `access: 'group'`
bot.use(async (ctx, next) => {
  if (ctx.message?.text?.startsWith('/')) {
    const cmd = ctx.message.text.split(/[\s@]/)[0].slice(1).toLowerCase();
    const chatId = ctx.chat?.id?.toString() || '';
    if (ADMIN_ONLY_COMMANDS.has(cmd) && !isAdmin(chatId)) {
      await ctx.reply("⛔ Cette commande est réservée à l'administrateur.");
      return;
    }
  }
  await next();
});

registerAllCommands(bot);

// Messages texte hors commande : raccourcis pratiques, sinon renvoi vers /help
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();

  // Une commande en cours attend une saisie : elle gère le message elle-même
  if (ctx.session.awaitingInput) return;

  if (text === 'status' || text === 'état' || text === 'etat') {
    await ctx.reply('Tape /status');
    return;
  }
  if (text === 'aide' || text === 'help') {
    await ctx.reply('Tape /help');
    return;
  }
  if (text === 'monitor' || text === 'sites') {
    await ctx.reply('Tape /monitor');
    return;
  }

  await ctx.reply('Commande inconnue. Tape /help pour voir les commandes disponibles.');
});

bot.catch((err) => {
  logger.error(`Bot error: ${err.message}`);
});

// Boucle de monitoring uptime (toutes les 5 min par défaut)
const UPTIME_INTERVAL = env.UPTIME_CHECK_INTERVAL;
async function uptimeLoop() {
  try {
    await checkUptime();
  } catch (e) {
    logger.error(`Uptime check failed: ${(e as Error).message}`);
  }
  setTimeout(uptimeLoop, UPTIME_INTERVAL);
}

/**
 * Menu « / » de Telegram : les groupes clients ne voient que leurs commandes,
 * l'admin les voit toutes. Les descriptions viennent du registre, jamais de
 * BotFather (qui ne connaît pas les sous-commandes et se désynchronise).
 */
async function publishCommandMenu(): Promise<void> {
  const toMenu = (c: (typeof BOT_COMMANDS)[number]) => ({
    command: c.name,
    description: c.usage.split(' — ')[1]?.slice(0, 256) || c.name,
  });
  try {
    await bot.api.setMyCommands(BOT_COMMANDS.filter((c) => c.access === 'group').map(toMenu), {
      scope: { type: 'all_group_chats' },
    });
    const adminChat = env.TELEGRAM_CHAT_ID;
    if (adminChat) {
      await bot.api.setMyCommands(BOT_COMMANDS.map(toMenu), {
        scope: { type: 'chat', chat_id: Number(adminChat) },
      });
    }
  } catch (e) {
    logger.warn(`Menu des commandes non publié : ${(e as Error).message}`);
  }
}

logger.info('Starting Telegram bot...');
bot.start({
  onStart: () => {
    logger.success('Telegram bot is running!');
    void publishCommandMenu();
    logger.info(`Uptime monitoring active (every ${UPTIME_INTERVAL / 1000}s)`);
    uptimeLoop();
  },
});
