/**
 * Client Etsy Open API v3 — boutique Maison Cirelle.
 *
 * Le jeton OAuth (PKCE, obtenu une fois par `Poopy/scripts/etsy-auth.mts`) vit
 * dans `ETSY_TOKEN_FILE` : accès 1 h, refresh 90 jours **renouvelé à chaque
 * échange**. Le job de synchro le rafraîchit à chaque passage qui le trouve
 * périmé : tant qu'il tourne, l'accès ne meurt jamais. S'il échoue (refresh
 * expiré ou révoqué), il faut refaire `etsy-auth.mts start` — le job le dit.
 */
import { readFileSync, writeFileSync } from 'fs';
import { env } from '../config/env.js';

export const ETSY_SHOP_ID = 55596155;
export const ETSY_SITE_KEY = 'poopy';

interface StoredToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  obtained_at: string;
  [k: string]: unknown;
}

function apiKey(): string {
  if (!env.ETSY_API_KEY || !env.ETSY_SHARED_SECRET)
    throw new Error('ETSY_API_KEY / ETSY_SHARED_SECRET absents de .env');
  return `${env.ETSY_API_KEY}:${env.ETSY_SHARED_SECRET}`;
}

const readToken = (): StoredToken => JSON.parse(readFileSync(env.ETSY_TOKEN_FILE, 'utf8')) as StoredToken;

/** Jeton d'accès valide, rafraîchi s'il expire dans moins de 5 minutes. */
async function accessToken(): Promise<string> {
  const t = readToken();
  const expiresAt = Date.parse(t.obtained_at) + (t.expires_in - 300) * 1000;
  if (Date.now() < expiresAt) return t.access_token;
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.ETSY_API_KEY ?? '',
      refresh_token: t.refresh_token,
    }),
  });
  const j = (await res.json()) as Partial<StoredToken> & { error?: string; error_description?: string };
  if (!res.ok || !j.access_token)
    throw new Error(
      `Jeton Etsy non renouvelé (${j.error ?? res.status} ${j.error_description ?? ''}) — relancer Poopy/scripts/etsy-auth.mts start`.trim(),
    );
  writeFileSync(
    env.ETSY_TOKEN_FILE,
    JSON.stringify({ ...t, ...j, obtained_at: new Date().toISOString() }, null, 2),
    { mode: 0o600 },
  );
  return j.access_token;
}

/** Appel authentifié ; `body` objet = formulaire, tableau/objet JSON via `json`. */
export async function etsy<T = unknown>(
  path: string,
  init: { method?: string; form?: Record<string, string>; json?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'x-api-key': apiKey(),
    authorization: `Bearer ${await accessToken()}`,
  };
  let body: string | undefined;
  if (init.form) {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(init.form).toString();
  } else if (init.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  // 5 requêtes / seconde au plus : on espace un peu chaque appel.
  await new Promise((r) => setTimeout(r, 250));
  const res = await fetch(`https://api.etsy.com/v3/application${path}`, {
    method: init.method ?? 'GET',
    headers,
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Etsy ${init.method ?? 'GET'} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}
