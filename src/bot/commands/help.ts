import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { isAdmin, getSiteForChat } from '../permissions.js';
import { sites } from '../../../config/sites.js';
import { BOT_COMMANDS } from './index.js';

/** `/help` et `/start` — l'aide admin est dérivée du registre `BOT_COMMANDS`, jamais recopiée. */
export function registerHelpCommand(bot: Bot<BotContext>) {
  bot.command('help', async (ctx) => {
    const chatId = ctx.chat?.id?.toString() || '';

    // Groupe client — seulement les commandes de son site
    if (!isAdmin(chatId)) {
      const siteKey = getSiteForChat(chatId);
      if (siteKey === 'voitures' || siteKey === 'okaz') {
        await ctx.reply(
          `<b>Gestion ${sites[siteKey]?.name ?? siteKey}</b>\n\n` +
            `/voiture add — Ajouter un véhicule\n` +
            `/voiture list — Véhicules en vente\n` +
            `/voiture vendu — Archiver (vendu)\n` +
            `/voiture dispo — Remettre en vente\n` +
            `/voiture prix — Modifier le prix\n` +
            `/voiture suppr — Supprimer un véhicule\n` +
            `/voiture archives — Véhicules vendus\n` +
            `/voiture deploy — Redéployer le site\n` +
            `/help — Cette aide`,
          { parse_mode: 'HTML' },
        );
      } else if (siteKey === 'restaurant') {
        await ctx.reply(
          `<b>Gestion Mon Sauveur</b>\n\n` +
            `/produit add — Ajouter un produit\n` +
            `/produit list — Voir le catalogue\n` +
            `/produit suppr — Supprimer un produit\n` +
            `/produit dispo — Remettre disponible\n` +
            `/produit prix — Modifier un prix\n` +
            `/produit deploy — Redéployer le site\n` +
            `/help — Cette aide`,
          { parse_mode: 'HTML' },
        );
      } else {
        await ctx.reply(
          `<b>Bot SEO</b>\n\n` +
            `Vous avez accès au site : <b>${siteKey || 'aucun'}</b>\n` +
            `Contactez l'administrateur pour plus d'informations.`,
          { parse_mode: 'HTML' },
        );
      }
      return;
    }

    // Admin — aide complète, générée depuis le registre
    const groupCmds = BOT_COMMANDS.filter((c) => c.access === 'group').map((c) => c.usage);
    const adminCmds = BOT_COMMANDS.filter((c) => c.access === 'admin').map((c) => c.usage);
    const siteKeys = Object.keys(sites).join(', ');

    await ctx.reply(
      `<b>SEO Automation Bot</b>\n\n` +
        `<b>🚗🍾 Clients (groupes)</b>\n${groupCmds.join('\n')}\n\n` +
        `<b>🛠 Exploitation (admin)</b>\n${adminCmds.join('\n')}\n\n` +
        `<b>Sites :</b> ${siteKeys}\n\n` +
        `<b>🤖 Automatique</b>\n` +
        `• Sync GSC tous les jours à 6h30, crawl le lundi 6h45\n` +
        `• Monitoring uptime toutes les 5 min, alerte si site DOWN\n\n` +
        `La gestion SEO (mots-clés, pages, publication) se fait sur le dashboard.`,
      { parse_mode: 'HTML' },
    );
  });

  bot.command('start', async (ctx) => {
    const chatId = ctx.chat?.id?.toString() || '';
    const siteKey = getSiteForChat(chatId);

    if (!isAdmin(chatId) && siteKey) {
      await ctx.reply(
        `Bienvenue ! Ce groupe est lié au site <b>${siteKey}</b>.\n\nTape /help pour voir les commandes disponibles.`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    await ctx.reply(
      `Salut ! Je suis ton bot SEO Automation.\n\n` +
        `Tape /status pour voir l'état de tes sites, ou /help pour la liste des commandes.`,
    );
  });
}
