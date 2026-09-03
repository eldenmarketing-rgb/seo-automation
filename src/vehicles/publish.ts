import { execFileSync } from 'child_process';
import type { SiteConfig } from '../../config/site-types.js';
import { readEnvByName } from '../config/env.js';
import { triggerDeploy } from '../deployers/vercel-deploy.js';
import * as logger from '../utils/logger.js';

/**
 * Mise en ligne d'un changement d'inventaire : commit, push, déploiement.
 *
 * Avant, un push raté n'était qu'une ligne de log : le bot répondait « ajouté »
 * et lançait le hook Vercel, qui reconstruisait le site **sans** la voiture.
 * Ici l'échec remonte au vendeur. Et un site sans hook mais relié à GitHub
 * (Okaz Autos) se déploie par le push lui-même — ce n'est plus signalé comme
 * un déploiement « à lancer manuellement ».
 */

export interface PublishResult {
  committed: boolean;
  pushed: boolean;
  /** `hook` = hook Vercel déclenché ; `git` = déploiement par le push GitHub ; `none` = rien n'est parti. */
  deploy: 'hook' | 'git' | 'none';
  error?: string;
}

function git(cwd: string, args: string[], timeout = 30_000): string {
  return execFileSync('git', args, { cwd, stdio: 'pipe', timeout, encoding: 'utf-8' });
}

export async function publishSiteChange(site: SiteConfig, message: string): Promise<PublishResult> {
  const cwd = site.projectPath;
  const result: PublishResult = { committed: false, pushed: false, deploy: 'none' };

  try {
    git(cwd, ['add', '-A']);
    if (git(cwd, ['status', '--porcelain']).trim() === '') {
      result.error = 'aucun changement à publier';
      return result;
    }
    git(cwd, ['commit', '-m', message]);
    result.committed = true;
    git(cwd, ['push', 'origin', 'main'], 60_000);
    result.pushed = true;
  } catch (e) {
    const msg = (e as Error).message.split('\n')[0];
    logger.error(`Publication ${site.key} : ${msg}`);
    result.error = result.committed ? `push GitHub refusé : ${msg}` : `commit impossible : ${msg}`;
    return result;
  }

  if (readEnvByName(site.vercelHookEnv)) {
    result.deploy = (await triggerDeploy(site.key)) ? 'hook' : 'none';
    if (result.deploy === 'none') result.error = 'hook Vercel en échec';
  } else {
    result.deploy = 'git';
  }
  return result;
}

/** Phrase de statut pour le vendeur. */
export function describePublish(r: PublishResult): string {
  if (!r.pushed) return `⚠️ Pas en ligne : ${r.error ?? 'échec inconnu'}. Préviens l'administrateur.`;
  if (r.deploy === 'none') return `⚠️ Poussé sur GitHub mais ${r.error ?? 'déploiement non lancé'}.`;
  return '🚀 Déploiement lancé — en ligne dans 1 à 2 minutes.';
}

/**
 * Preuve de mise en ligne : on relit l'URL réelle jusqu'à y voir le changement.
 *
 * Un hook Vercel qui répond 200 ne prouve rien (le build peut échouer, le CDN
 * peut servir l'ancienne page quelques minutes — cf. la revalidation partielle
 * observée sur les sites CMS). Deux lectures consécutives conformes, espacées,
 * avant de dire au vendeur « c'est en ligne ».
 */
export interface LiveCheck {
  url: string;
  /** Vrai quand la page servie reflète le changement. `text` = HTML avec entités et espaces normalisés. */
  expect: (text: string, status: number) => boolean;
}

/** Décode ce qu'il faut pour comparer un prix, un nom ou un début de description au HTML rendu. */
export function normalizeHtml(html: string): string {
  return html
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/[\u202f\u00a0]/g, ' ');
}

export async function waitForLive(
  check: LiveCheck,
  opts: { timeoutMs?: number; intervalMs?: number; confirmations?: number } = {},
): Promise<{ ok: boolean; elapsedMs: number; lastStatus: number | null }> {
  const timeoutMs = opts.timeoutMs ?? 240_000;
  const intervalMs = opts.intervalMs ?? 15_000;
  const needed = opts.confirmations ?? 2;
  const started = Date.now();
  let streak = 0;
  let lastStatus: number | null = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(check.url, { headers: { 'Cache-Control': 'no-cache' }, redirect: 'follow' });
      lastStatus = res.status;
      const ok = check.expect(normalizeHtml(await res.text()), res.status);
      streak = ok ? streak + 1 : 0;
      if (streak >= needed) return { ok: true, elapsedMs: Date.now() - started, lastStatus };
    } catch {
      streak = 0;
    }
    await new Promise((r) => setTimeout(r, streak > 0 ? Math.min(intervalMs, 8_000) : intervalMs));
  }
  return { ok: false, elapsedMs: Date.now() - started, lastStatus };
}
