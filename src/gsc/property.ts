/**
 * Résolution site_key → propriété Search Console.
 *
 * Les propriétés du service account sont toutes au format `sc-domain:`.
 * `config/sites.ts` stocke des domaines `https://…` : les interroger tels quels
 * renvoie systématiquement un 403 (cause de l'échec silencieux du cron
 * weekly-gsc-audit). Toute lecture GSC doit passer par ce résolveur.
 */
import { getSearchConsole } from './auth.js';
import { gscSites } from '../../config/gsc-sites.js';
import * as logger from '../utils/logger.js';

let cache: Map<string, string> | null = null;

function normalize(url: string): string {
  return url
    .replace(/^sc-domain:/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

/** Propriétés réellement accessibles, mappées vers leur site_key. */
export async function discoverProperties(force = false): Promise<Map<string, string>> {
  if (cache && !force) return cache;

  const searchconsole = getSearchConsole();
  const res = await searchconsole.sites.list();
  const found = new Map<string, string>();

  for (const entry of res.data.siteEntry || []) {
    const url = entry.siteUrl || '';
    const siteKey = gscSites[normalize(url)];
    if (siteKey) found.set(siteKey, url);
    else logger.warn(`GSC: propriété accessible non mappée dans config/gsc-sites.ts : ${url}`);
  }

  for (const [domain, siteKey] of Object.entries(gscSites)) {
    if (!found.has(siteKey)) {
      logger.warn(
        `GSC: aucune propriété accessible pour ${siteKey} (${domain}) — partager le service account dans sa Search Console`,
      );
    }
  }

  cache = found;
  return found;
}

/** Propriété GSC d'un site, ou null si elle n'est pas accessible. */
export async function resolveProperty(siteKey: string): Promise<string | null> {
  return (await discoverProperties()).get(siteKey) ?? null;
}
