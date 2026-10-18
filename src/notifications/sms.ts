import * as logger from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Envoi d'un SMS par Twilio — un seul usage aujourd'hui : la demande d'avis
 * Google après une livraison (`/avis` du bot). Le numéro expéditeur est un 09
 * du compte avec la capacité SMS (`TWILIO_SMS_FROM`) ; les 09 73 des sites sont
 * voix seulement et ne peuvent pas servir ici.
 *
 * Aucune file, aucun retry : un SMS raté se voit tout de suite dans Telegram
 * et se renvoie à la main. Le texte est fourni par l'appelant, jamais composé
 * ici, pour que ce module reste muet sur le contenu.
 */

const API = 'https://api.twilio.com/2010-04-01';

export interface SmsResult {
  sid: string;
  status: string;
  /** Nombre de segments facturés tel que Twilio le calcule (un SMS GSM-7 ≤ 160 car. = 1). */
  segments: number;
}

export function smsConfigured(): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_SMS_FROM);
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    throw new Error(
      'Twilio SMS non configuré : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_SMS_FROM requis',
    );
  }
  if (!/^\+\d{8,15}$/.test(to)) throw new Error(`Destinataire invalide (E.164 attendu) : ${to}`);

  const res = await fetch(`${API}/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const json = (await res.json()) as {
    sid?: string;
    status?: string;
    num_segments?: string;
    message?: string;
    code?: number;
  };
  if (!res.ok || !json.sid) {
    throw new Error(
      `Twilio ${res.status}${json.code ? ` (${json.code})` : ''} : ${json.message ?? 'envoi refusé'}`,
    );
  }
  logger.info(
    `SMS ${json.sid} → ${to.slice(0, 6)}… (${json.status}, ${json.num_segments ?? '?'} segment(s))`,
  );
  return { sid: json.sid, status: json.status ?? 'queued', segments: Number(json.num_segments ?? 1) };
}

/**
 * Vrai si ce destinataire a répondu « STOP » à notre numéro expéditeur. Lu dans
 * le journal Twilio au moment d'envoyer : pas de webhook à héberger, et un
 * refus reste respecté même si la base l'ignore.
 */
export async function hasOptedOut(to: string): Promise<boolean> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) return false;
  const url = new URL(`${API}/Accounts/${sid}/Messages.json`);
  url.searchParams.set('From', to);
  url.searchParams.set('To', from);
  url.searchParams.set('PageSize', '20');
  const res = await fetch(url, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { messages?: Array<{ body?: string }> };
  return (json.messages ?? []).some((m) => /^\s*stop\b/i.test(m.body ?? ''));
}
