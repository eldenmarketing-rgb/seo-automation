import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { getSupabase } from '../../db/supabase.js';
import { escapeHtml } from '../html.js';
import { canAccessSite, getSiteForChat, isAdmin } from '../permissions.js';
import { hasOptedOut, sendSms, smsConfigured } from '../../notifications/sms.js';

/**
 * `/avis` — demander un avis Google par SMS, juste après la livraison.
 *
 * Le pack local se gagne aux avis (Livraison de Nuit : 14 contre 245 pour le
 * leader, constat du 2026-10-18). Le livreur a le numéro du client sous les
 * yeux : il tape `/avis 06 12 34 56 78` dans le groupe du site, le client reçoit
 * un SMS avec le lien court `https://<domaine>/avis/google` (302 du site vers le
 * formulaire d'avis de la fiche) et la demande est journalisée.
 *
 * Garde-fous : mobiles français seulement, un seul SMS par numéro et par site
 * tous les 60 jours, « STOP » reçu sur le numéro expéditeur = plus jamais, et
 * le site doit réellement servir son lien d'avis avant qu'on l'envoie.
 */

export const REQUEST_COOLDOWN_DAYS = 60;

/** « 06 12 34 56 78 », « +33 6 12…», « 0033612… » → `+33612345678` ; mobiles seulement (SMS). */
export function normalizeFrMobile(raw: string): string | null {
  const digits = raw.replace(/[\s.\-()]/g, '');
  let national: string | null = null;
  if (/^\+33[67]\d{8}$/.test(digits)) national = '0' + digits.slice(3);
  else if (/^0033[67]\d{8}$/.test(digits)) national = '0' + digits.slice(4);
  else if (/^0[67]\d{8}$/.test(digits)) national = digits;
  if (!national) return null;
  return '+33' + national.slice(1);
}

/** Affichage « 06 12 34 56 78 » d'un E.164 français. */
export function formatFr(e164: string): string {
  const n = '0' + e164.slice(3);
  return n.replace(/(\d{2})(?=\d)/g, '$1 ');
}

/**
 * Le texte du SMS. Sans accent circonflexe ni tiret long : tout reste dans
 * l'alphabet GSM-7, donc un seul segment facturé tant qu'on tient en 160.
 */
export function buildReviewSms(siteName: string, domain: string): string {
  return (
    `${siteName} : merci pour votre commande ! Un avis Google en 10 s nous aide beaucoup : ` +
    `https://${domain}/avis/google (STOP = plus de SMS)`
  );
}

export function cooldownBlocks(lastSentAt: string | null | undefined, now = new Date()): boolean {
  if (!lastSentAt) return false;
  const elapsed = now.getTime() - new Date(lastSentAt).getTime();
  return elapsed < REQUEST_COOLDOWN_DAYS * 86_400_000;
}

/** Le lien court existe-t-il vraiment sur le site ? (302 vers Google attendu, 200 toléré.) */
async function reviewLinkServed(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/avis/google`, { method: 'HEAD', redirect: 'manual' });
    return res.status === 200 || (res.status >= 301 && res.status <= 308);
  } catch {
    return false;
  }
}

/** `/avis 06… nuit` ou `/avis nuit: 06…` → { phone, siteKey }. */
export function parseAvisArgs(
  raw: string,
  knownKeys: string[],
): { phoneRaw: string; siteKey: string | null } {
  const text = raw.trim();
  const prefixed = text.match(/^([a-z0-9_-]+)\s*:\s*(.+)$/i);
  if (prefixed && knownKeys.includes(prefixed[1].toLowerCase())) {
    return { phoneRaw: prefixed[2].trim(), siteKey: prefixed[1].toLowerCase() };
  }
  const parts = text.split(/\s+/);
  const last = parts[parts.length - 1]?.toLowerCase();
  if (parts.length > 1 && knownKeys.includes(last)) {
    return { phoneRaw: parts.slice(0, -1).join(' '), siteKey: last };
  }
  return { phoneRaw: text, siteKey: null };
}

export function registerAvisCommand(bot: Bot<BotContext>) {
  bot.command('avis', async (ctx) => {
    const raw = ctx.match?.trim() || '';
    const chatId = String(ctx.chat.id);
    const db = getSupabase();
    const knownKeys = Object.keys(sites);
    const groupSite = getSiteForChat(chatId);

    // `/avis` seul : les dernières demandes, pour savoir où on en est.
    if (!raw) {
      let q = db
        .from('review_requests')
        .select('site_key, phone_e164, status, sent_at')
        .order('sent_at', { ascending: false })
        .limit(10);
      if (groupSite) q = q.eq('site_key', groupSite);
      const { data, error } = await q;
      if (error) {
        await ctx.reply(`Lecture impossible : ${error.message}`);
        return;
      }
      if (!data?.length) {
        await ctx.reply('Aucune demande d’avis envoyée.\n\nUsage : /avis 06 12 34 56 78 [site]');
        return;
      }
      const lines = [`<b>Dernières demandes d’avis (${data.length})</b>\n`];
      for (const r of data) {
        const site = sites[r.site_key]?.name || r.site_key;
        const when = new Date(r.sent_at).toLocaleDateString('fr-FR');
        lines.push(`${when} — ${escapeHtml(site)} — ${formatFr(r.phone_e164)} <i>${r.status}</i>`);
      }
      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
      return;
    }

    const { phoneRaw, siteKey: givenSite } = parseAvisArgs(raw, knownKeys);
    const siteKey = givenSite ?? groupSite ?? null;
    if (!siteKey) {
      await ctx.reply('Précise le site : /avis 06 12 34 56 78 nuit');
      return;
    }
    const site = sites[siteKey];
    if (!site) {
      await ctx.reply(`Site inconnu : ${escapeHtml(siteKey)}`);
      return;
    }
    if (!isAdmin(chatId) && !canAccessSite(chatId, siteKey)) {
      await ctx.reply('Ce groupe ne gère pas ce site.');
      return;
    }
    const phone = normalizeFrMobile(phoneRaw);
    if (!phone) {
      await ctx.reply(`Numéro non reconnu : ${escapeHtml(phoneRaw)}\nIl faut un mobile français (06 ou 07).`);
      return;
    }
    if (!smsConfigured()) {
      await ctx.reply('Envoi SMS non configuré sur le serveur (TWILIO_SMS_FROM).');
      return;
    }

    // Déjà sollicité récemment ?
    const { data: last } = await db
      .from('review_requests')
      .select('sent_at, status')
      .eq('site_key', siteKey)
      .eq('phone_e164', phone)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.status === 'opted_out') {
      await ctx.reply(`⛔ ${formatFr(phone)} a demandé à ne plus recevoir de SMS.`);
      return;
    }
    if (cooldownBlocks(last?.sent_at)) {
      const when = new Date(last!.sent_at).toLocaleDateString('fr-FR');
      await ctx.reply(
        `⛔ Déjà sollicité le ${when} — pas de nouveau SMS avant ${REQUEST_COOLDOWN_DAYS} jours.`,
      );
      return;
    }
    if (await hasOptedOut(phone)) {
      await db.from('review_requests').insert({
        site_key: siteKey,
        phone_e164: phone,
        channel: 'sms',
        status: 'opted_out',
        requested_by: chatId,
      });
      await ctx.reply(`⛔ ${formatFr(phone)} a répondu STOP : aucun SMS envoyé.`);
      return;
    }

    const domain = site.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!(await reviewLinkServed(domain))) {
      await ctx.reply(
        `Le site ${escapeHtml(domain)} ne sert pas encore son lien d’avis (/avis/google) : rien envoyé.`,
      );
      return;
    }

    try {
      const sent = await sendSms(phone, buildReviewSms(site.name, domain));
      const { error } = await db.from('review_requests').insert({
        site_key: siteKey,
        phone_e164: phone,
        channel: 'sms',
        status: 'sent',
        twilio_sid: sent.sid,
        segments: sent.segments,
        requested_by: chatId,
      });
      if (error) {
        await ctx.reply(`SMS parti mais non journalisé : ${error.message}`);
        return;
      }
      await ctx.reply(
        `✅ SMS envoyé à ${formatFr(phone)} — <i>${escapeHtml(site.name)}</i> (${sent.segments} segment${sent.segments > 1 ? 's' : ''})`,
        { parse_mode: 'HTML' },
      );
    } catch (e) {
      await ctx.reply(`SMS non envoyé : ${escapeHtml((e as Error).message)}`);
    }
  });
}
