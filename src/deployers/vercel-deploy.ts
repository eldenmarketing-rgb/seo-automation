import dotenv from 'dotenv';
import { sites } from '../../config/sites.js';
import { pingSitemap } from './sitemap-ping.js';
import * as logger from '../utils/logger.js';

dotenv.config();

/**
 * Trigger a Vercel deployment via deploy hook.
 * Each site has its own deploy hook URL stored in env vars.
 */
export async function triggerDeploy(siteKey: string): Promise<boolean> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const hookUrl = process.env[site.vercelHookEnv];
  if (!hookUrl) {
    logger.warn(`No Vercel deploy hook for ${siteKey} (env: ${site.vercelHookEnv})`);
    return false;
  }

  try {
    logger.info(`Triggering Vercel deploy for ${siteKey}...`);

    const res = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`Vercel deploy hook failed for ${siteKey}: ${res.status} ${text}`);
      return false;
    }

    const data = await res.json() as { job?: { id?: string } };
    logger.success(`Vercel deploy triggered for ${siteKey} — job: ${data?.job?.id || 'unknown'}`);

    // Ping Google sitemap after successful deploy
    await pingSitemap(siteKey);

    return true;
  } catch (e) {
    logger.error(`Vercel deploy error for ${siteKey}: ${(e as Error).message}`);
    return false;
  }
}

/**
 * Trigger deployment for all sites that have hooks configured.
 */
export async function triggerDeployAll(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  for (const key of Object.keys(sites)) {
    results[key] = await triggerDeploy(key);
  }
  return results;
}
