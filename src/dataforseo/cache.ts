/**
 * Cache DataForSEO — une requête achetée n'est pas rachetée (W0.3).
 *
 * Point d'entrée unique : `withDfsCache(endpoint, body, fetcher)`.
 * Le cache est best-effort : toute erreur Supabase laisse passer l'appel live,
 * jamais d'échec de pipeline à cause du cache.
 */
import crypto from 'crypto';
import { getSupabase } from '../db/supabase.js';
import * as logger from '../utils/logger.js';

/** TTL par famille d'endpoint, en jours. */
const TTL_DAYS: Array<[RegExp, number]> = [
  [/^\/serp\//, 7], // SERP : structure stable à l'échelle de la semaine
  [/^\/keywords_data\//, 30], // volumes : mis à jour mensuellement par Google
  [/^\/dataforseo_labs\//, 30], // idées/KD : même cadence
  [/^\/backlinks\//, 14], // profil de liens : évolution lente
];
const DEFAULT_TTL_DAYS = 7;

function ttlDaysFor(endpoint: string): number {
  return TTL_DAYS.find(([re]) => re.test(endpoint))?.[1] ?? DEFAULT_TTL_DAYS;
}

/** Clé stable : les clés d'objet sont triées pour que l'ordre n'invalide pas le cache. */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}

export function cacheKey(endpoint: string, body: unknown): string {
  return crypto
    .createHash('sha256')
    .update(`${endpoint}|${stableStringify(body)}`)
    .digest('hex');
}

export interface DfsCacheOptions {
  /** Coût estimé de l'appel en $, sert au compteur d'économies. */
  cost?: number;
  /** Forcer un TTL spécifique (jours). */
  ttlDays?: number;
  /** Ignorer le cache en lecture et le rafraîchir. */
  force?: boolean;
}

interface DfsEnvelope {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{ status_code?: number; status_message?: string }>;
}

/** Vrai si l'enveloppe DataForSEO et chacune de ses tâches sont en 20000 (ou si ce n'est pas une enveloppe). */
function isSuccessful(response: unknown): boolean {
  const env = response as DfsEnvelope | null;
  if (!env || typeof env !== 'object') return true;
  if (typeof env.status_code === 'number' && env.status_code !== 20000) return false;
  if (Array.isArray(env.tasks)) return env.tasks.every((t) => t?.status_code === 20000);
  return true;
}

function describeFailure(response: unknown): string {
  const env = response as DfsEnvelope | null;
  const task = env?.tasks?.find((t) => t?.status_code !== 20000);
  return task
    ? `${task.status_code} ${task.status_message ?? ''}`.trim()
    : `${env?.status_code} ${env?.status_message ?? ''}`.trim();
}

/**
 * Sert la réponse depuis le cache si elle est fraîche, sinon appelle `fetcher`
 * et stocke le résultat.
 */
export async function withDfsCache<T>(
  endpoint: string,
  body: unknown,
  fetcher: () => Promise<T>,
  opts: DfsCacheOptions = {},
): Promise<T> {
  const key = cacheKey(endpoint, body);
  const cost = opts.cost ?? 0;

  if (!opts.force) {
    try {
      const db = getSupabase();
      const { data } = await db
        .from('dataforseo_cache')
        .select('response, hits, saved_cost, cost, expires_at')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (data) {
        logger.info(`DataForSEO: HIT cache ${endpoint} (économie ~$${(data.cost ?? cost).toFixed(3)})`);
        // await volontaire : en fire-and-forget le compteur était perdu dès que
        // le process se terminait juste après (scripts CLI, routes serverless).
        await db
          .from('dataforseo_cache')
          .update({
            hits: (data.hits ?? 0) + 1,
            saved_cost: Number(data.saved_cost ?? 0) + Number(data.cost ?? cost),
          })
          .eq('cache_key', key);
        return data.response as T;
      }
    } catch (e) {
      logger.warn(`DataForSEO: lecture cache impossible (${(e as Error).message}) — appel live`);
    }
  }

  const response = await fetcher();

  // Une réponse en erreur ne se met pas en cache : le 30/08 une tâche SERP en
  // `40101 Internal SE Server Error` a été servie pendant 7 jours à chaque
  // nouvel essai, et le brief partait sans SERP sans qu'on sache pourquoi.
  if (!isSuccessful(response)) {
    logger.warn(
      `DataForSEO: réponse en erreur pour ${endpoint} — non mise en cache (${describeFailure(response)})`,
    );
    return response;
  }

  // DataForSEO renvoie le coût réel de l'appel dans `cost` — plus fiable qu'une estimation.
  const realCost =
    typeof (response as { cost?: unknown })?.cost === 'number' ? (response as { cost: number }).cost : cost;

  try {
    const db = getSupabase();
    const ttl = opts.ttlDays ?? ttlDaysFor(endpoint);
    await db.from('dataforseo_cache').upsert({
      cache_key: key,
      endpoint,
      request: body as object,
      response: response as object,
      cost: realCost,
      expires_at: new Date(Date.now() + ttl * 86400_000).toISOString(),
    });
    logger.info(`DataForSEO: MISS ${endpoint} — mis en cache ${ttl}j ($${realCost.toFixed(3)})`);
  } catch (e) {
    logger.warn(`DataForSEO: écriture cache impossible (${(e as Error).message})`);
  }

  return response;
}

/** Compteur de dépenses : appels payants et économies réalisées. */
export async function cacheStats(): Promise<{ entries: number; spent: number; saved: number; hits: number }> {
  const db = getSupabase();
  const { data } = await db.from('dataforseo_cache').select('cost, saved_cost, hits');
  const rows = data || [];
  return {
    entries: rows.length,
    spent: rows.reduce((s, r) => s + Number(r.cost || 0), 0),
    saved: rows.reduce((s, r) => s + Number(r.saved_cost || 0), 0),
    hits: rows.reduce((s, r) => s + Number(r.hits || 0), 0),
  };
}
