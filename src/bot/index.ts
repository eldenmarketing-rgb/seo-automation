import dotenv from 'dotenv';
dotenv.config();

import { Bot, Context, session, SessionFlavor } from 'grammy';
import * as logger from '../utils/logger.js';
import { registerStatusCommand } from './commands/status.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerPhoneCommand } from './commands/phone.js';
import { registerBlogCommand } from './commands/blog.js';
import { registerHelpCommand } from './commands/help.js';
import { registerMonitorCommand } from './commands/monitor.js';
import { registerDeployCommand } from './commands/deploy.js';
import { registerSeoCommand } from './commands/seo.js';
import { registerKeywordsCommand } from './commands/keywords.js';
import { registerEditCommand } from './commands/edit.js';
import { registerIndexCommand } from './commands/index-check.js';
import { registerCtrCommand } from './commands/ctr.js';
import { registerPingCommand } from './commands/ping.js';
import { registerVoitureCommand } from './commands/voiture.js';
import { registerProduitCommand } from './commands/produit.js';
import { registerClaudeCommand } from './commands/claude.js';
import { checkUptime } from '../monitoring/uptime.js';
import { isAuthorized, isAdmin, getSiteForChat } from './permissions.js';

export interface SessionData {
  awaitingInput?: string;
  context?: Record<string, unknown>;
}

export type BotContext = Context & SessionFlavor<SessionData>;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

const bot = new Bot<BotContext>(BOT_TOKEN);

// Session middleware
bot.use(session({ initial: (): SessionData => ({}) }));

// Auth middleware — admin + configured group chats
bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId || !isAuthorized(chatId)) {
    logger.warn(`Unauthorized access from chat ${chatId}`);
    return;
  }
  await next();
});

// Admin-only command guard — groups can only use /voiture, /help
const ADMIN_ONLY_COMMANDS = ['status', 'generate', 'phone', 'blog', 'monitor', 'deploy', 'seo', 'keywords', 'edit', 'index', 'ctr', 'ping', 'claude'];
bot.use(async (ctx, next) => {
  if (ctx.message?.text?.startsWith('/')) {
    const cmd = ctx.message.text.split(/[\s@]/)[0].slice(1).toLowerCase();
    const chatId = ctx.chat?.id?.toString() || '';
    if (ADMIN_ONLY_COMMANDS.includes(cmd) && !isAdmin(chatId)) {
      await ctx.reply('⛔ Cette commande est réservée à l\'administrateur.');
      return;
    }
  }
  await next();
});

// Register commands
registerHelpCommand(bot);
registerStatusCommand(bot);
registerGenerateCommand(bot);
registerPhoneCommand(bot);
registerBlogCommand(bot);
registerMonitorCommand(bot);
registerDeployCommand(bot);
registerSeoCommand(bot);
registerKeywordsCommand(bot);
registerEditCommand(bot);
registerIndexCommand(bot);
registerCtrCommand(bot);
registerPingCommand(bot);
registerVoitureCommand(bot);
registerProduitCommand(bot);
registerClaudeCommand(bot);

// Catch-all for unknown messages
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();

  // Session-based input handling (e.g., blog topic)
  if (ctx.session.awaitingInput) {
    return; // Handled by the command that set awaitingInput
  }

  // Text shortcuts — execute commands directly (handy while driving)
  if (text === 'status' || text === 'état' || text === 'etat') {
    await ctx.reply('Chargement...');
    return ctx.api.raw.sendMessage({ chat_id: ctx.chat!.id, text: '/status' }).catch(() => {});
  }

  if (text === 'aide' || text === 'help') {
    await ctx.reply('Tape /help');
    return;
  }

  if (text === 'monitor' || text === 'sites') {
    await ctx.reply('Tape /monitor');
    return;
  }

  // "genere garage" or "genere garage 10"
  const genMatch = text.match(/^g[eé]n[eè]re?\s+(\w+)(?:\s+(\d+))?$/);
  if (genMatch) {
    const site = genMatch[1];
    const count = genMatch[2] || '';
    await ctx.reply(`Tape /generate ${site} ${count}`.trim());
    return;
  }

  await ctx.reply(
    `Commande inconnue. Tape /help pour voir les commandes disponibles.`
  );
});

// Error handler
bot.catch((err) => {
  logger.error(`Bot error: ${err.message}`);
});

// Start uptime monitoring loop (every 5 min)
const UPTIME_INTERVAL = parseInt(process.env.UPTIME_CHECK_INTERVAL || '300000', 10);
async function uptimeLoop() {
  try {
    await checkUptime();
  } catch (e) {
    logger.error(`Uptime check failed: ${(e as Error).message}`);
  }
  setTimeout(uptimeLoop, UPTIME_INTERVAL);
}

// Start
logger.info('Starting Telegram bot...');
bot.start({
  onStart: () => {
    logger.success('Telegram bot is running!');
    logger.info(`Uptime monitoring active (every ${UPTIME_INTERVAL / 1000}s)`);
    uptimeLoop();
  },
});
