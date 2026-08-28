/**
 * API GSC URL Inspection — l'état d'indexation d'une URL, dit par Google.
 *
 * C'est le seul capteur qui répond « cette page est-elle indexée ? » sans
 * déduction. `gsc_positions` ne contient que les pages ayant déjà des
 * impressions : une page inconnue de Google y est indiscernable d'une page qui
 * n'existe pas.
 *
 * Deux pièges, tous deux vérifiés le 2026-08-23 :
 *  - le scope. `src/gsc/auth.ts` est en `webmasters.readonly`, ce qui suffit
 *    pour les rapports mais renvoie 403 sur urlInspection. On crée donc un
 *    client dédié en `webmasters` plutôt que d'élargir le scope partagé par
 *    tous les jobs de lecture ;
 *  - la propriété. Elle doit être au format `sc-domain:` — d'où le passage
 *    obligatoire par `resolveProperty()`.
 *
 * Permission `siteFullUser` suffisante (`siteOwner` non requis).
 * Quota : 2000 URL/jour et 600/minute par propriété — très large pour ~25 URL
 * par site, mais la cadence reste bridée ici pour ne pas déclencher de 429.
 */
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import * as logger from '../utils/logger.js';
import { env } from '../config/env.js';

const SERVICE_ACCOUNT_PATH = env.GSC_SERVICE_ACCOUNT_PATH;

/** Délai entre deux inspections (600/min autorisées, on reste très en dessous). */
const THROTTLE_MS = 150;

export interface InspectionResult {
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  robotsTxtState: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  lastCrawlTime: string | null;
}

let client: ReturnType<typeof google.searchconsole> | null = null;

function getClient() {
  if (!client) {
    const auth = new GoogleAuth({
      keyFile: path.resolve(SERVICE_ACCOUNT_PATH),
      // 'webmasters' et NON 'webmasters.readonly' : urlInspection l'exige.
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });
    client = google.searchconsole({ version: 'v1', auth });
  }
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * État d'indexation d'une URL, ou `null` si Google n'a pas répondu (quota,
 * permission, panne). `null` n'est jamais interprété comme « non indexée » :
 * l'absence de réponse n'est pas une réponse.
 */
export async function inspectUrl(
  property: string,
  url: string,
  attempt = 0,
): Promise<InspectionResult | null> {
  try {
    const res = await getClient().urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl: property },
    });

    const r = res.data.inspectionResult?.indexStatusResult;
    if (!r) return null;

    return {
      verdict: r.verdict ?? null,
      coverageState: r.coverageState ?? null,
      indexingState: r.indexingState ?? null,
      pageFetchState: r.pageFetchState ?? null,
      robotsTxtState: r.robotsTxtState ?? null,
      googleCanonical: r.googleCanonical ?? null,
      userCanonical: r.userCanonical ?? null,
      lastCrawlTime: r.lastCrawlTime ?? null,
    };
  } catch (e: any) {
    const status = e?.code ?? e?.response?.status;

    // 429 : on lève le pied et on retente deux fois. Au-delà, on rend null —
    // mieux vaut une colonne vide qu'un faux « inconnue de Google ».
    if (status === 429 && attempt < 2) {
      await sleep(2000 * (attempt + 1));
      return inspectUrl(property, url, attempt + 1);
    }

    logger.warn(`URL Inspection ${url} : ${status || ''} ${e?.message || e}`);
    return null;
  }
}

/** Inspecte une liste d'URL d'une même propriété, en série et à cadence bridée. */
export async function inspectUrls(
  property: string,
  urls: string[],
  onResult?: (url: string, result: InspectionResult | null) => void,
): Promise<Map<string, InspectionResult>> {
  const out = new Map<string, InspectionResult>();

  for (const url of urls) {
    const result = await inspectUrl(property, url);
    if (result) out.set(url, result);
    onResult?.(url, result);
    await sleep(THROTTLE_MS);
  }

  return out;
}
