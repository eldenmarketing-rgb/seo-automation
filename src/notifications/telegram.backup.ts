import dotenv from 'dotenv';
import * as logger from '../utils/logger.js';
import { sites } from '../../config/sites.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Send a message to a specific Telegram chat.
 */
async function sendToChat(chatId: string, message: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    logger.warn('Telegram not configured (missing BOT_TOKEN)');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error(`Telegram API error (chat ${chatId}): ${err}`);
      return false;
    }

    return true;
  } catch (e) {
    logger.error(`Telegram send failed (chat ${chatId}): ${(e as Error).message}`);
    return false;
  }
}

/**
 * Send a message to both the site's group and the admin.
 * If the site has no dedicated group, sends only to admin.
 * If siteKey is not provided, sends only to admin.
 */
export async function sendTelegram(message: string, siteKey?: string): Promise<boolean> {
  if (!ADMIN_CHAT_ID) {
    logger.warn('Telegram not configured (missing CHAT_ID)');
    return false;
  }

  const chatIds: string[] = [];

  // Get site-specific chat ID if available
  if (siteKey) {
    const site = sites[siteKey];
    const siteChatId = site?.telegramChatEnv ? process.env[site.telegramChatEnv] : undefined;
    if (siteChatId) {
      chatIds.push(siteChatId);
    }
  }

  // Always send to admin
  if (!chatIds.includes(ADMIN_CHAT_ID)) {
    chatIds.push(ADMIN_CHAT_ID);
  }

  const results = await Promise.all(chatIds.map(id => sendToChat(id, message)));
  const allOk = results.every(Boolean);

  if (allOk) {
    logger.success(`Telegram notification sent to ${chatIds.length} chat(s)`);
  }

  return allOk;
}

// Notification templates

export async function notifyGeneration(siteKey: string, pagesCount: number, slugs: string[]) {
  const slugList = slugs.slice(0, 10).map(s => `  • ${s}`).join('\n');
  const more = slugs.length > 10 ? `\n  ... et ${slugs.length - 10} autres` : '';
  await sendTelegram(
    `<b>SEO Auto - Génération</b>\n\n` +
    `Site: <b>${siteKey}</b>\n` +
    `Pages générées: <b>${pagesCount}</b>\n\n` +
    `${slugList}${more}`,
    siteKey
  );
}

export async function notifyDeploy(siteKey: string, success: boolean) {
  const icon = success ? '✅' : '❌';
  await sendTelegram(
    `${icon} <b>Deploy ${siteKey}</b>\n\n` +
    `Status: ${success ? 'Succès' : 'Échec'}\n` +
    `Heure: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    siteKey
  );
}

export async function notifyGscAudit(results: { site: string; candidates: number; topPage?: string }[]) {
  const lines = results.map(r =>
    `  • <b>${r.site}</b>: ${r.candidates} pages #5-#15${r.topPage ? ` (top: ${r.topPage})` : ''}`
  );
  // GSC audit is a global report — send only to admin
  await sendTelegram(
    `<b>📊 Audit GSC hebdomadaire</b>\n\n` +
    lines.join('\n') + '\n\n' +
    `Total: ${results.reduce((s, r) => s + r.candidates, 0)} pages à optimiser`
  );
}

export async function notifyOptimization(siteKey: string, optimizedCount: number, failedCount: number) {
  await sendTelegram(
    `<b>🔄 Optimisation SEO</b>\n\n` +
    `Site: <b>${siteKey}</b>\n` +
    `Optimisées: ${optimizedCount}\n` +
    `Échouées: ${failedCount}`,
    siteKey
  );
}

export async function notifyError(jobName: string, error: string, siteKey?: string) {
  await sendTelegram(
    `<b>🚨 Erreur SEO Auto</b>\n\n` +
    `Job: <b>${jobName}</b>\n` +
    `Erreur: ${error}\n` +
    `Heure: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    siteKey
  );
}

// Test if run directly
if (process.argv[1]?.includes('telegram')) {
  sendTelegram('🤖 <b>SEO Automation</b> - Test notification OK!')
    .then(ok => console.log(ok ? 'Sent!' : 'Failed'))
    .catch(console.error);
}
