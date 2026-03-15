import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { sites } from '../../config/sites.js';
import * as logger from '../utils/logger.js';

dotenv.config();

const SERVICE_ACCOUNT_PATH = process.env.GSC_SERVICE_ACCOUNT_PATH || './config/gsc-service-account.json';

// IndexNow key (generated once, reused)
const INDEXNOW_KEY = crypto.createHash('md5').update('seo-automation-indexnow').digest('hex');

/**
 * Request Google to index a URL via the Indexing API.
 */
async function googleIndexUrl(url: string): Promise<boolean> {
  try {
    const auth = new GoogleAuth({
      keyFile: path.resolve(SERVICE_ACCOUNT_PATH),
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    const indexing = google.indexing({ version: 'v3', auth });
    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: 'URL_UPDATED',
      },
    });

    logger.success(`Google Indexing API: ${url} → ${res.status}`);
    return res.status === 200;
  } catch (e) {
    const msg = (e as Error).message;
    // 403 = not authorized for this URL type (expected for non-JobPosting)
    if (msg.includes('403')) {
      logger.warn(`Google Indexing API 403 for ${url} (normal for non-JobPosting pages)`);
    } else {
      logger.error(`Google Indexing API error: ${msg}`);
    }
    return false;
  }
}

/**
 * Submit URL to IndexNow (Bing, Yandex instant indexing).
 */
async function indexNowSubmit(url: string, siteKey: string): Promise<boolean> {
  const site = sites[siteKey];
  if (!site) return false;

  const host = new URL(site.domain).hostname;

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${site.domain}/${INDEXNOW_KEY}.txt`,
        urlList: [url],
      }),
    });

    logger.success(`IndexNow: ${url} → ${res.status}`);
    return res.status === 200 || res.status === 202;
  } catch (e) {
    logger.error(`IndexNow error: ${(e as Error).message}`);
    return false;
  }
}

/**
 * Request instant indexation for a single URL via all available methods.
 */
export async function requestIndexation(siteKey: string, slug: string): Promise<{
  google: boolean;
  indexNow: boolean;
  sitemapPing: boolean;
}> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  const url = `${site.domain}/${slug}`;

  // Run all 3 methods in parallel
  const [googleOk, indexNowOk, sitemapOk] = await Promise.all([
    googleIndexUrl(url),
    indexNowSubmit(url, siteKey),
    pingSitemapForUrl(siteKey),
  ]);

  return { google: googleOk, indexNow: indexNowOk, sitemapPing: sitemapOk };
}

/**
 * Request indexation for multiple URLs at once.
 */
export async function requestBulkIndexation(siteKey: string, slugs: string[]): Promise<{
  total: number;
  google: number;
  indexNow: number;
}> {
  const site = sites[siteKey];
  if (!site) throw new Error(`Unknown site: ${siteKey}`);

  let googleCount = 0;
  let indexNowCount = 0;

  // IndexNow supports bulk (up to 10000 URLs)
  const host = new URL(site.domain).hostname;
  const urls = slugs.map(s => `${site.domain}/${s}`);

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${site.domain}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    if (res.status === 200 || res.status === 202) {
      indexNowCount = slugs.length;
    }
    logger.success(`IndexNow bulk: ${slugs.length} URLs → ${res.status}`);
  } catch (e) {
    logger.error(`IndexNow bulk error: ${(e as Error).message}`);
  }

  // Google Indexing API: one by one with rate limiting
  for (const url of urls.slice(0, 20)) { // Max 20 per day
    const ok = await googleIndexUrl(url);
    if (ok) googleCount++;
    await new Promise(r => setTimeout(r, 500));
  }

  // Ping sitemap once
  await pingSitemapForUrl(siteKey);

  return { total: slugs.length, google: googleCount, indexNow: indexNowCount };
}

async function pingSitemapForUrl(siteKey: string): Promise<boolean> {
  const site = sites[siteKey];
  if (!site) return false;

  const sitemapUrl = `${site.domain}/sitemap.xml`;
  try {
    const res = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Get the IndexNow key (needs to be served as a text file on each site) */
export function getIndexNowKey(): string {
  return INDEXNOW_KEY;
}
