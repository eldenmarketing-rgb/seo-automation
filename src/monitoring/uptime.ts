import dotenv from 'dotenv';
dotenv.config();

import { sites } from '../../config/sites.js';
import { sendTelegram } from '../notifications/telegram.js';
import * as logger from '../utils/logger.js';

const CHECK_INTERVAL = parseInt(process.env.UPTIME_CHECK_INTERVAL || '300000', 10); // 5 min default
const TIMEOUT = 10000; // 10s timeout per site

// Track consecutive failures to avoid spam
const failureCounts: Record<string, number> = {};
const wasDown: Record<string, boolean> = {};

export async function checkUptime(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const [siteKey, site] of Object.entries(sites)) {
    // Skip sites without a deploy hook (not yet deployed)
    const hookEnv = site.vercelHookEnv;
    if (hookEnv && !process.env[hookEnv]) {
      results[siteKey] = true; // Consider not-deployed as OK (no alert)
      continue;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT);

      const res = await fetch(site.domain, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeout);

      const isUp = res.status >= 200 && res.status < 400;
      results[siteKey] = isUp;

      if (!isUp) {
        failureCounts[siteKey] = (failureCounts[siteKey] || 0) + 1;
        logger.warn(`${siteKey} returned ${res.status}`);
      } else {
        // Site came back up
        if (wasDown[siteKey]) {
          await sendTelegram(
            `<b>✅ Site rétabli</b>\n\n` +
            `<b>${site.name}</b> (${site.domain}) est de nouveau en ligne.`,
            siteKey
          );
          logger.success(`${siteKey} is back up`);
        }
        failureCounts[siteKey] = 0;
        wasDown[siteKey] = false;
      }
    } catch (e) {
      results[siteKey] = false;
      failureCounts[siteKey] = (failureCounts[siteKey] || 0) + 1;
      logger.error(`${siteKey} unreachable: ${(e as Error).message}`);
    }

    // Alert after 2 consecutive failures (to avoid false positives)
    if (failureCounts[siteKey] >= 2 && !wasDown[siteKey]) {
      wasDown[siteKey] = true;
      await sendTelegram(
        `<b>🚨 Site DOWN</b>\n\n` +
        `<b>${site.name}</b>\n` +
        `URL: ${site.domain}\n` +
        `Échecs consécutifs: ${failureCounts[siteKey]}\n` +
        `Heure: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        siteKey
      );
    }
  }

  return results;
}

// Run as loop if executed directly
const isDirectRun = process.argv[1]?.includes('uptime');
if (isDirectRun) {
  logger.info(`Starting uptime monitor (interval: ${CHECK_INTERVAL / 1000}s)`);

  async function loop() {
    await checkUptime();
    setTimeout(loop, CHECK_INTERVAL);
  }

  loop();
}
