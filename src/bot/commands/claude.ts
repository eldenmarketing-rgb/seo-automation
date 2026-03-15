import { Bot } from 'grammy';
import { BotContext } from '../index.js';
import { exec } from 'child_process';
import * as logger from '../../utils/logger.js';

const MAX_EXECUTION_TIME = 120_000; // 2 minutes max
const MAX_MESSAGE_LENGTH = 4000; // Telegram limit ~4096

function truncate(text: string): string {
  if (text.length <= MAX_MESSAGE_LENGTH) return text;
  return text.slice(0, MAX_MESSAGE_LENGTH - 20) + '\n\n... (tronqué)';
}

export function registerClaudeCommand(bot: Bot<BotContext>) {
  bot.command('claude', async (ctx) => {
    const prompt = ctx.message?.text?.replace(/^\/claude\s*/, '').trim();

    if (!prompt) {
      await ctx.reply(
        '🤖 *Claude Code (headless)*\n\n' +
        'Usage: `/claude <ta demande>`\n\n' +
        'Exemples:\n' +
        '• `/claude liste les fichiers du projet garage`\n' +
        '• `/claude ajoute une meta description à la page contact de mon-sauveur`\n' +
        '• `/claude analyse le SEO de la homepage vtc`\n\n' +
        '⚠️ Claude a accès en lecture/écriture aux projets.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const statusMsg = await ctx.reply('⏳ Claude travaille dessus...');

    // Sanitize: escape double quotes and dollar signs in prompt
    const safePrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');

    const cmd = `claude -p "${safePrompt}" --allowedTools "Bash(git *),Bash(ls *),Bash(cat *),Bash(head *),Bash(tail *),Bash(npm run *),Bash(npx *),Bash(pm2 *),Read,Write,Edit,Grep,Glob" --max-turns 15 --output-format text 2>&1`;

    logger.info(`Claude command from admin: ${prompt.slice(0, 100)}`);

    const child = exec(cmd, {
      cwd: '/home/ubuntu/sites',
      timeout: MAX_EXECUTION_TIME,
      maxBuffer: 1024 * 1024, // 1MB
      env: { ...process.env, HOME: '/home/ubuntu' },
    }, async (error, stdout, stderr) => {
      try {
        if (error && error.killed) {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            statusMsg.message_id,
            '⏱️ Timeout — Claude a mis trop de temps (>2min). Essaie une demande plus précise.'
          );
          return;
        }

        const output = (stdout || stderr || 'Pas de réponse').trim();

        if (!output || output.length === 0) {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            statusMsg.message_id,
            '🤷 Claude n\'a rien retourné. Reformule ta demande.'
          );
          return;
        }

        await ctx.api.editMessageText(
          ctx.chat!.id,
          statusMsg.message_id,
          `🤖 *Résultat :*\n\n${truncate(output)}`,
          { parse_mode: 'Markdown' }
        ).catch(async () => {
          // If Markdown fails, send as plain text
          await ctx.api.editMessageText(
            ctx.chat!.id,
            statusMsg.message_id,
            `🤖 Résultat :\n\n${truncate(output)}`
          );
        });

        logger.success(`Claude command completed (${output.length} chars)`);
      } catch (e) {
        logger.error(`Claude response error: ${(e as Error).message}`);
        await ctx.api.editMessageText(
          ctx.chat!.id,
          statusMsg.message_id,
          '❌ Erreur lors de l\'envoi de la réponse.'
        ).catch(() => {});
      }
    });
  });
}
