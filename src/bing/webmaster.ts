/**
 * Client minimal de l'API Bing Webmaster Tools (JSON).
 * Les sites ont été importés depuis Search Console le 2026-10-31 : la propriété est
 * prouvée côté Bing, donc la soumission d'URL n'exige aucun fichier de clé sur les sites
 * (contrairement à IndexNow). Quota : 100 URL / jour / site au 2026-10-31.
 */
import { env } from '../config/env.js';

const API = 'https://ssl.bing.com/webmaster/api.svc/json/';

export class BingError extends Error {}

function apiKey(): string {
  const key = env.BING_WEBMASTER_API_KEY;
  if (!key) throw new BingError('BING_WEBMASTER_API_KEY absente du .env');
  return key;
}

async function call<T>(method: string, params: Record<string, string> = {}, body?: unknown): Promise<T> {
  const qs = new URLSearchParams({ ...params, apikey: apiKey() });
  const res = await fetch(`${API}${method}?${qs}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json; charset=utf-8' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new BingError(`${method} → HTTP ${res.status} : ${text.slice(0, 300)}`);
  return (JSON.parse(text) as { d: T }).d;
}

/** Hôte sans www : Bing enregistre parfois l'apex alors que le site sert www. */
export const bareHost = (u: string): string => new URL(u).hostname.replace(/^www\./, '');

export async function listBingSites(): Promise<Array<{ url: string; verified: boolean }>> {
  const d = await call<Array<{ Url: string; IsVerified: boolean }>>('GetUserSites');
  return d.map((s) => ({ url: s.Url, verified: s.IsVerified }));
}

export async function urlSubmissionQuota(siteUrl: string): Promise<{ daily: number; monthly: number }> {
  const d = await call<{ DailyQuota: number; MonthlyQuota: number }>('GetUrlSubmissionQuota', { siteUrl });
  return { daily: d.DailyQuota, monthly: d.MonthlyQuota };
}

export async function submitUrlBatch(siteUrl: string, urlList: string[]): Promise<void> {
  if (urlList.length === 0) return;
  await call('SubmitUrlBatch', {}, { siteUrl, urlList });
}
