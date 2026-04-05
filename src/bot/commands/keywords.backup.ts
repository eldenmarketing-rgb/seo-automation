import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { researchKeywords, formatKeywordsForTelegram, suggestPages } from '../../keywords/research.js';

export function registerKeywordsCommand(bot: Bot<BotContext>) {
  // /keywords taxi
  // /keywords taxi perpignan
  bot.command('keywords', async (ctx) => {
    const args = ctx.match?.trim();

    if (!args) {
      await ctx.reply(
        `<b>Usage :</b>\n` +
        `/keywords [sujet]\n` +
        `/keywords [sujet] [ville]\n\n` +
        `<b>Exemples :</b>\n` +
        `/keywords taxi\n` +
        `/keywords garage perpignan\n` +
        `/keywords massage domicile canet`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Parse: last word could be a city
    const parts = args.split(/\s+/);
    let topic: string;
    let location: string;

    // If 1 word, default to perpignan
    if (parts.length === 1) {
      topic = parts[0];
      location = 'perpignan';
    } else {
      // Last word is location, rest is topic
      location = parts[parts.length - 1];
      topic = parts.slice(0, -1).join(' ');
    }

    await ctx.reply(`🔍 Recherche de mots-clés pour "<b>${topic}</b>" à <b>${location}</b>...`, { parse_mode: 'HTML' });

    try {
      const keywords = await researchKeywords(topic, location);

      if (keywords.length === 0) {
        await ctx.reply('Aucun mot-clé trouvé. Essaie un autre sujet.');
        return;
      }

      // Send keyword report
      const report = formatKeywordsForTelegram(keywords, `${topic} ${location}`);
      await ctx.reply(report, { parse_mode: 'HTML' });

      // Suggest pages
      const pageSuggestions = suggestPages(keywords, topic, location);

      if (pageSuggestions.length > 0) {
        let pageMsg = `\n<b>📄 Pages suggérées :</b>\n\n`;

        pageSuggestions.forEach((page, i) => {
          const icon = page.type === 'service' ? '🔧' : page.type === 'blog' ? '📝' : '❓';
          pageMsg += `${icon} <b>${page.title}</b>\n`;
          pageMsg += `   Mots-clés ciblés :\n`;
          page.targetKeywords.slice(0, 5).forEach(kw => {
            pageMsg += `   • ${kw}\n`;
          });
          pageMsg += '\n';
        });

        // Store suggestions in session for follow-up
        ctx.session.awaitingInput = 'keywords_confirm';
        ctx.session.context = {
          topic,
          location,
          keywords: keywords.map(k => k.keyword),
          pageSuggestions: pageSuggestions.map(p => ({ title: p.title, targetKeywords: p.targetKeywords, type: p.type })),
        };

        const keyboard = new InlineKeyboard();
        pageSuggestions.forEach((page, i) => {
          keyboard.text(`Créer: ${page.title.slice(0, 30)}...`, `kw_create:${i}`).row();
        });
        keyboard.text('Créer toutes les pages', 'kw_create:all').row();
        keyboard.text('Annuler', 'kw_create:cancel').row();

        await ctx.reply(pageMsg, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    } catch (e) {
      await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
    }
  });

  // Handle page creation from keyword suggestions
  bot.callbackQuery(/^kw_create:(.+)$/, async (ctx) => {
    const choice = ctx.match![1];
    await ctx.answerCallbackQuery();

    if (choice === 'cancel') {
      ctx.session.awaitingInput = undefined;
      ctx.session.context = undefined;
      await ctx.editMessageText('Annulé.');
      return;
    }

    const sessionCtx = ctx.session.context as {
      topic: string;
      location: string;
      keywords: string[];
      pageSuggestions: Array<{ title: string; targetKeywords: string[]; type: string }>;
    } | undefined;

    if (!sessionCtx?.pageSuggestions) {
      await ctx.editMessageText('Session expirée. Relance /keywords.');
      return;
    }

    ctx.session.awaitingInput = undefined;

    if (choice === 'all') {
      await ctx.editMessageText(`Création de ${sessionCtx.pageSuggestions.length} pages en cours...`);

      for (const page of sessionCtx.pageSuggestions) {
        await ctx.reply(
          `📄 <b>${page.title}</b>\n` +
          `Type: ${page.type}\n` +
          `Mots-clés: ${page.targetKeywords.slice(0, 5).join(', ')}\n\n` +
          `→ Utilise <code>/blog [site] ${page.title}</code> pour générer le contenu`,
          { parse_mode: 'HTML' }
        );
      }
    } else {
      const idx = parseInt(choice, 10);
      const page = sessionCtx.pageSuggestions[idx];
      if (!page) {
        await ctx.editMessageText('Page non trouvée.');
        return;
      }

      await ctx.editMessageText(
        `📄 <b>${page.title}</b>\n\n` +
        `Mots-clés ciblés :\n` +
        page.targetKeywords.map(k => `  • ${k}`).join('\n') +
        `\n\n→ Utilise <code>/blog [site] ${page.title}</code> pour générer le contenu`,
        { parse_mode: 'HTML' }
      );
    }

    ctx.session.context = undefined;
  });
}
