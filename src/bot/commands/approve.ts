import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import {
  getPendingPages,
  updatePendingPageStatus,
  updatePendingPagesBulk,
  updateAllPendingPagesBulk,
  PendingPageRow,
} from '../../db/supabase.js';
import { generateApprovedForSite, generateAllApproved } from '../../jobs/generate-approved.js';
import * as logger from '../../utils/logger.js';

let isGenerating = false;

export function registerApproveCommand(bot: Bot<BotContext>) {

  // ─── /approve command ──────────────────────────────────────────

  bot.command('approve', async (ctx) => {
    const args = ctx.match?.trim().split(/\s+/) || [];
    const subcommand = args[0]?.toLowerCase();

    // /approve go [site] — generate approved pages
    if (subcommand === 'go') {
      if (isGenerating) {
        await ctx.reply('Une génération est déjà en cours...');
        return;
      }
      const siteArg = args[1];
      isGenerating = true;
      try {
        if (siteArg && sites[siteArg]) {
          await ctx.reply(`🚀 Génération des pages approuvées pour <b>${siteArg}</b>...`, { parse_mode: 'HTML' });
          const result = await generateApprovedForSite(siteArg);
          await ctx.reply(
            `<b>✅ Génération terminée — ${siteArg}</b>\n\n` +
            `Générées: ${result.generated}\n` +
            `Déployées: ${result.deployed}\n` +
            `Erreurs: ${result.errors}`,
            { parse_mode: 'HTML' }
          );
        } else {
          await ctx.reply('🚀 Génération des pages approuvées pour <b>tous les sites</b>...', { parse_mode: 'HTML' });
          const results = await generateAllApproved();
          const lines = Object.entries(results).map(([key, r]) =>
            `  <b>${key}</b>: ${r.generated} générées, ${r.deployed} déployées, ${r.errors} erreurs`
          );
          const total = Object.values(results).reduce((s, r) => s + r.generated, 0);
          await ctx.reply(
            `<b>✅ Génération terminée</b>\n\n` +
            (lines.length > 0 ? lines.join('\n') + `\n\nTotal: ${total} pages` : 'Aucune page approuvée à générer.'),
            { parse_mode: 'HTML' }
          );
        }
      } catch (e) {
        await ctx.reply(`Erreur: ${(e as Error).message}`);
      } finally {
        isGenerating = false;
      }
      return;
    }

    // /approve [site] — show pending pages
    const siteFilter = subcommand && sites[subcommand] ? subcommand : undefined;
    await showPendingPages(ctx, siteFilter);
  });

  // ─── Callback: noop (already processed) ────────────────────────

  bot.callbackQuery(/^noop:/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: 'Déjà traité' });
  });

  // ─── Callback: approve single page ────────────────────────────

  bot.callbackQuery(/^pa:(.+)$/, async (ctx) => {
    const pageId = ctx.match![1];
    try {
      await updatePendingPageStatus(pageId, 'approved');
      await ctx.answerCallbackQuery({ text: '✅ Page approuvée' });
      // Update the button text
      await updateButtonInMessage(ctx, pageId, '✅');
    } catch (e) {
      await ctx.answerCallbackQuery({ text: `Erreur: ${(e as Error).message}` });
    }
  });

  // ─── Callback: reject single page ─────────────────────────────

  bot.callbackQuery(/^pr:(.+)$/, async (ctx) => {
    const pageId = ctx.match![1];
    try {
      await updatePendingPageStatus(pageId, 'rejected');
      await ctx.answerCallbackQuery({ text: '❌ Page rejetée' });
      await updateButtonInMessage(ctx, pageId, '❌');
    } catch (e) {
      await ctx.answerCallbackQuery({ text: `Erreur: ${(e as Error).message}` });
    }
  });

  // ─── Callback: approve all for site ───────────────────────────

  bot.callbackQuery(/^paa:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    try {
      let count: number;
      if (siteKey === '__all__') {
        count = await updateAllPendingPagesBulk('pending_approval', 'approved');
      } else {
        count = await updatePendingPagesBulk(siteKey, 'pending_approval', 'approved');
      }
      await ctx.answerCallbackQuery({ text: `✅ ${count} pages approuvées` });

      // Replace keyboard with confirmation + generate button
      const goKey = siteKey === '__all__' ? 'all' : siteKey;
      const keyboard = new InlineKeyboard()
        .text(`🚀 Générer les ${count} pages`, `pgo:${goKey}`);

      await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    } catch (e) {
      await ctx.answerCallbackQuery({ text: `Erreur: ${(e as Error).message}` });
    }
  });

  // ─── Callback: reject all for site ────────────────────────────

  bot.callbackQuery(/^pra:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    try {
      const count = await updatePendingPagesBulk(siteKey, 'pending_approval', 'rejected');
      await ctx.answerCallbackQuery({ text: `❌ ${count} pages rejetées` });

      // Remove keyboard
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch (e) {
      await ctx.answerCallbackQuery({ text: `Erreur: ${(e as Error).message}` });
    }
  });

  // ─── Callback: generate approved for site ─────────────────────

  bot.callbackQuery(/^pgo:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];

    if (isGenerating) {
      await ctx.answerCallbackQuery({ text: 'Génération déjà en cours...' });
      return;
    }

    await ctx.answerCallbackQuery({ text: '🚀 Génération lancée...' });

    // Remove keyboard to prevent double-clicks
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});

    isGenerating = true;
    try {
      if (siteKey === 'all') {
        await ctx.editMessageText(
          (ctx.callbackQuery.message?.text || '') + '\n\n⏳ <i>Génération en cours pour tous les sites...</i>',
          { parse_mode: 'HTML' }
        ).catch(() => {});

        const results = await generateAllApproved();
        const total = Object.values(results).reduce((s, r) => s + r.generated, 0);
        const lines = Object.entries(results).map(([key, r]) =>
          `  <b>${key}</b>: ${r.generated} générées, ${r.deployed} déployées`
        );

        await ctx.reply(
          `<b>✅ Génération terminée</b>\n\n` +
          (lines.length > 0 ? lines.join('\n') + `\n\nTotal: ${total} pages` : 'Aucune page à générer.'),
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.editMessageText(
          (ctx.callbackQuery.message?.text || '') + `\n\n⏳ <i>Génération en cours pour ${siteKey}...</i>`,
          { parse_mode: 'HTML' }
        ).catch(() => {});

        const result = await generateApprovedForSite(siteKey);

        await ctx.reply(
          `<b>✅ Génération terminée — ${siteKey}</b>\n\n` +
          `Générées: ${result.generated}\n` +
          `Déployées: ${result.deployed}\n` +
          `Erreurs: ${result.errors}`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (e) {
      await ctx.reply(`Erreur génération: ${(e as Error).message}`);
    } finally {
      isGenerating = false;
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────

async function showPendingPages(ctx: BotContext, siteKey?: string) {
  const pending = await getPendingPages(siteKey, 'pending_approval');
  const approved = await getPendingPages(siteKey, 'approved');

  if (pending.length === 0 && approved.length === 0) {
    await ctx.reply(
      siteKey
        ? `Aucune page en attente pour <b>${siteKey}</b>.`
        : 'Aucune page en attente d\'approbation.',
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Group by site
  const bySite = new Map<string, { pending: PendingPageRow[]; approved: PendingPageRow[] }>();
  for (const p of pending) {
    const entry = bySite.get(p.site_key) || { pending: [], approved: [] };
    entry.pending.push(p);
    bySite.set(p.site_key, entry);
  }
  for (const p of approved) {
    const entry = bySite.get(p.site_key) || { pending: [], approved: [] };
    entry.approved.push(p);
    bySite.set(p.site_key, entry);
  }

  for (const [sk, data] of bySite) {
    const siteName = sites[sk]?.name || sk;
    const lines: string[] = [];

    if (data.pending.length > 0) {
      lines.push(`<b>⏳ En attente (${data.pending.length})</b>`);
      for (const p of data.pending.slice(0, 10)) {
        lines.push(`  • <code>${p.slug}</code> — score ${p.score}`);
      }
      if (data.pending.length > 10) {
        lines.push(`  <i>... et ${data.pending.length - 10} autres</i>`);
      }
    }

    if (data.approved.length > 0) {
      lines.push(`\n<b>✅ Approuvées (${data.approved.length})</b>`);
      for (const p of data.approved.slice(0, 5)) {
        lines.push(`  • <code>${p.slug}</code> — score ${p.score}`);
      }
      if (data.approved.length > 5) {
        lines.push(`  <i>... et ${data.approved.length - 5} autres</i>`);
      }
    }

    const keyboard = new InlineKeyboard();

    if (data.pending.length > 0) {
      // Individual buttons for top 5 pending
      for (const p of data.pending.slice(0, 5)) {
        if (p.id) {
          keyboard
            .text(`✅ ${p.slug.slice(0, 22)}`, `pa:${p.id}`)
            .text('❌', `pr:${p.id}`)
            .row();
        }
      }
      keyboard
        .text(`✅ Tout valider (${data.pending.length})`, `paa:${sk}`)
        .text('❌ Tout rejeter', `pra:${sk}`)
        .row();
    }

    if (data.approved.length > 0 || data.pending.length > 0) {
      keyboard.text(`🚀 Générer les approuvées`, `pgo:${sk}`).row();
    }

    await ctx.reply(
      `<b>📋 ${siteName}</b>\n\n${lines.join('\n')}`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }

  // If multiple sites, add a global generate button
  if (bySite.size > 1) {
    const totalApproved = approved.length;
    const totalPending = pending.length;
    const keyboard = new InlineKeyboard();
    if (totalPending > 0) {
      keyboard.text(`✅ Tout valider partout (${totalPending})`, 'paa:__all__').row();
    }
    if (totalApproved > 0 || totalPending > 0) {
      keyboard.text('🚀 Générer tout', 'pgo:all').row();
    }
    await ctx.reply(
      `<b>Résumé global</b>\n` +
      `En attente: ${totalPending} | Approuvées: ${totalApproved}`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  }
}

/**
 * Update a button in an existing message after approve/reject.
 * Replaces the button pair for the given pageId with a status indicator.
 */
async function updateButtonInMessage(ctx: BotContext, pageId: string, status: string) {
  try {
    const msg = ctx.callbackQuery?.message;
    if (!msg || !('reply_markup' in msg) || !msg.reply_markup) return;

    const newKeyboard = msg.reply_markup.inline_keyboard.map(row => {
      // If this row contains a button with our pageId, replace it
      const hasPage = row.some(btn => 'callback_data' in btn && (btn.callback_data === `pa:${pageId}` || btn.callback_data === `pr:${pageId}`));
      if (hasPage) {
        // Find the approve button to get the label
        const approveBtn = row.find(btn => 'callback_data' in btn && btn.callback_data === `pa:${pageId}`);
        const label = approveBtn && 'text' in approveBtn ? approveBtn.text.replace('✅ ', '') : '?';
        return [{ text: `${status} ${label}`, callback_data: `noop:${pageId}` }];
      }
      return row;
    });

    await ctx.editMessageReplyMarkup({
      reply_markup: { inline_keyboard: newKeyboard },
    });
  } catch {
    // Ignore edit failures (message too old, etc.)
  }
}
