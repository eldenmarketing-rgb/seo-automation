import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { isAdmin, getSiteForChat } from '../permissions.js';

export function registerHelpCommand(bot: Bot<BotContext>) {
  bot.command('help', async (ctx) => {
    const chatId = ctx.chat?.id?.toString() || '';

    // Group chat — show only their site's commands
    if (!isAdmin(chatId)) {
      const siteKey = getSiteForChat(chatId);
      if (siteKey === 'voitures') {
        await ctx.reply(
          `<b>Gestion Ideo Car</b>\n\n` +
          `/voiture add — Ajouter un véhicule\n` +
          `/voiture list — Véhicules en vente\n` +
          `/voiture vendu [slug] — Archiver (vendu)\n` +
          `/voiture dispo [slug] — Remettre en vente\n` +
          `/voiture prix [slug] [prix] — Modifier le prix\n` +
          `/voiture archives — Véhicules vendus\n` +
          `/voiture deploy — Redéployer le site\n` +
          `/help — Cette aide`,
          { parse_mode: 'HTML' }
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
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply(
          `<b>Bot SEO</b>\n\n` +
          `Vous avez accès au site : <b>${siteKey || 'aucun'}</b>\n` +
          `Contactez l'administrateur pour plus d'informations.`,
          { parse_mode: 'HTML' }
        );
      }
      return;
    }

    // Admin — full help
    await ctx.reply(
      `<b>SEO Automation Bot</b>\n\n` +
      `<b>📊 Suivi</b>\n` +
      `/status — Résumé de tous les sites\n` +
      `/seo [site] — Rapport SEO (positions, requêtes GSC)\n` +
      `/index [site] — Vérifier l'indexation Google\n` +
      `/ctr [site] — Optimiser le CTR des pages top 10\n` +
      `/monitor — Vérifier si les sites sont en ligne\n\n` +
      `<b>🚀 Génération</b>\n` +
      `/generate [site] — Générer des pages SEO\n` +
      `/generate [site] [nombre] — Générer N pages\n` +
      `/blog [site] [sujet] — Générer un article de blog\n` +
      `/keywords [sujet] [ville] — Recherche de mots-clés\n\n` +
      `<b>🚗 Véhicules</b>\n` +
      `/voiture add — Ajouter un véhicule\n` +
      `/voiture list — Véhicules en vente\n` +
      `/voiture vendu [slug] — Archiver (vendu)\n\n` +
      `<b>🍾 Catalogue Mon Sauveur</b>\n` +
      `/produit add — Ajouter un produit\n` +
      `/produit list — Voir le catalogue\n` +
      `/produit suppr [slug] — Supprimer\n\n` +
      `<b>🤖 Claude Code</b>\n` +
      `/claude [demande] — Demande libre à Claude\n\n` +
      `/edit [site] [slug] — Modifier une page\n` +
      `/ping [site] [slug|all] — Indexation instantanée\n` +
      `/deploy [site] — Forcer un redéploiement Vercel\n` +
      `/phone [site] [numéro] — Changer le téléphone\n` +
      `/help — Cette aide\n\n` +
      `<b>Sites :</b> garage, carrosserie, massage, vtc, voitures, restaurant\n\n` +
      `<b>🤖 Automatique</b>\n` +
      `• Génération quotidienne à 6h (5 pages/site)\n` +
      `• Monitoring uptime toutes les 5 min\n` +
      `• Alertes Telegram si site DOWN`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('start', async (ctx) => {
    const chatId = ctx.chat?.id?.toString() || '';
    const siteKey = getSiteForChat(chatId);

    if (!isAdmin(chatId) && siteKey) {
      await ctx.reply(
        `Bienvenue ! Ce groupe est lié au site <b>${siteKey}</b>.\n\nTape /help pour voir les commandes disponibles.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    await ctx.reply(
      `Salut ! Je suis ton bot SEO Automation.\n\n` +
      `Tape /status pour voir l'état de tes sites, ou /help pour la liste des commandes.`
    );
  });
}
