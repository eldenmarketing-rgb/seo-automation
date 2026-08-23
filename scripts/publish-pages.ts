/**
 * Publication complète d'une ou plusieurs pages SEO — le dernier maillon.
 *
 * Le dashboard marquait les pages « published » en base et déclenchait un
 * deploy Vercel… sur un dépôt inchangé : la page n'existait nulle part.
 * Ce script fait le vrai travail :
 *
 *   1. injectPages()  → écrit la page dans les fichiers data du site
 *   2. git commit + push (branche courante du dépôt du site)
 *   3. deploy hook Vercel
 *   4. marque seo_pages.status = published + deployed_at
 *
 * Usage : npx tsx scripts/publish-pages.ts <pageId> [pageId...] [--dry-run]
 * Sortie : une seule ligne JSON (consommée par /api/pages/publish du dashboard).
 *
 * --dry-run : injecte et montre le diff, sans commit/push/deploy.
 */
import dotenv from 'dotenv';
dotenv.config();

import { execFileSync } from 'child_process';
import { getSupabase } from '../src/db/supabase.js';
import { sites } from '../config/sites.js';
import { injectPages } from '../src/deployers/inject-pages.js';
import type { SeoPageRow } from '../src/db/supabase.js';

interface SiteResult {
  site_key: string;
  injected: string[];
  skipped: string[];
  committed: boolean;
  pushed: boolean;
  deployed: boolean;
  commit?: string;
  error?: string;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const pageIds = args.filter((a) => !a.startsWith('--'));

function git(cwd: string, ...cmd: string[]): string {
  return execFileSync('git', cmd, { cwd, encoding: 'utf-8', timeout: 120_000 }).trim();
}

async function run() {
  if (pageIds.length === 0) {
    console.log(JSON.stringify({ error: 'Aucun page id fourni' }));
    process.exit(1);
  }

  const db = getSupabase();
  const { data: pages, error } = await db.from('seo_pages').select('*').in('id', pageIds);
  if (error) {
    console.log(JSON.stringify({ error: `Supabase: ${error.message}` }));
    process.exit(1);
  }
  if (!pages?.length) {
    console.log(JSON.stringify({ error: 'Pages introuvables' }));
    process.exit(1);
  }

  // A3 : la branche sur laquelle chaque site doit être publié. Sans ça, le push
  // partait sur la branche courante du dépôt, quelle qu'elle soit.
  const { data: profiles } = await db
    .from('site_profiles')
    .select('site_key, production_branch');
  const prodBranch = new Map<string, string>(
    (profiles || []).map((p) => [p.site_key as string, (p.production_branch as string) || 'main'])
  );

  const bySite = new Map<string, SeoPageRow[]>();
  for (const p of pages as SeoPageRow[]) {
    if (!bySite.has(p.site_key)) bySite.set(p.site_key, []);
    bySite.get(p.site_key)!.push(p);
  }

  const results: SiteResult[] = [];

  for (const [siteKey, sitePages] of bySite) {
    const result: SiteResult = {
      site_key: siteKey,
      injected: [],
      skipped: [],
      committed: false,
      pushed: false,
      deployed: false,
    };

    const site = sites[siteKey];
    if (!site) {
      result.error = `Site "${siteKey}" absent du registre (site_profiles) ou désactivé — publication impossible`;
      result.skipped = sitePages.map((p) => p.slug);
      results.push(result);
      continue;
    }

    // ── 0bis. La branche doit être celle de production ──────────
    // W0 a trouvé Site_Garage posé sur une branche de docs : une publication à
    // ce moment-là aurait poussé le contenu au mauvais endroit. Une mauvaise
    // branche n'est jamais poussée, même en forçant.
    const expectedBranch = prodBranch.get(siteKey) || 'main';
    try {
      const currentBranch = git(site.projectPath, 'rev-parse', '--abbrev-ref', 'HEAD');
      if (currentBranch !== expectedBranch) {
        result.error = `Dépôt sur la branche "${currentBranch}", la production est "${expectedBranch}" — publication bloquée`;
        result.skipped = sitePages.map((p) => p.slug);
        results.push(result);
        continue;
      }
    } catch (e) {
      result.error = `Branche du dépôt illisible : ${(e as Error).message.slice(0, 200)}`;
      results.push(result);
      continue;
    }

    // ── 0. Le dépôt doit être propre ────────────────────────────
    // `git add -A` emporterait sinon du travail en cours sans rapport avec
    // la publication (et le dry-run ne saurait pas quoi restaurer).
    let dirtyBefore: string;
    try {
      dirtyBefore = git(site.projectPath, 'status', '--porcelain');
    } catch (e) {
      result.error = `Dépôt du site illisible : ${(e as Error).message.slice(0, 200)}`;
      results.push(result);
      continue;
    }
    if (dirtyBefore) {
      result.error =
        `Le dépôt ${site.projectPath} a des modifications non commitées — publication annulée ` +
        `pour ne pas les emporter dans le commit. Committer ou annuler ces changements d'abord :\n${dirtyBefore.slice(0, 300)}`;
      result.skipped = sitePages.map((p) => p.slug);
      results.push(result);
      continue;
    }

    // ── 1. Injection dans les fichiers du site ──────────────────
    try {
      result.injected = await injectPages(siteKey, sitePages);
    } catch (e) {
      result.error = `Injection échouée : ${(e as Error).message}`;
      results.push(result);
      continue;
    }

    result.skipped = sitePages.map((p) => p.slug).filter((s) => !result.injected.includes(s));

    if (result.injected.length === 0) {
      result.error = 'Aucune page injectée (déjà présente ou type de page non géré)';
      results.push(result);
      continue;
    }

    // ── 2. git commit + push ────────────────────────────────────
    const cwd = site.projectPath;
    try {
      const changed = git(cwd, 'status', '--porcelain');
      if (!changed) {
        result.error = 'Fichiers inchangés après injection — rien à committer';
        results.push(result);
        continue;
      }

      if (dryRun) {
        const diffStat = git(cwd, 'diff', '--stat');
        // Le dépôt était propre avant : tout ce qui bouge vient de l'injection,
        // on peut restaurer à l'identique.
        git(cwd, 'checkout', '--', '.');
        git(cwd, 'clean', '-fd');
        result.error = `ESSAI À BLANC — aucune modification conservée. Ce qui aurait été écrit :\n${diffStat || changed}`;
        results.push(result);
        continue;
      }

      git(cwd, 'add', '-A');
      const message = `feat(seo): publication ${result.injected.join(', ')}\n\nPublié depuis le SEO Dashboard.\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>`;
      git(cwd, 'commit', '-m', message);
      result.committed = true;
      result.commit = git(cwd, 'rev-parse', '--short', 'HEAD');

      git(cwd, 'push', 'origin', expectedBranch);
      result.pushed = true;
    } catch (e) {
      result.error = `Git : ${(e as Error).message.slice(0, 300)}`;
      results.push(result);
      continue;
    }

    // ── 3. Deploy Vercel ────────────────────────────────────────
    // Le push suffit quand Vercel est branché sur GitHub ; le hook force
    // le build pour les sites qui n'ont pas l'intégration Git.
    const hookUrl = process.env[site.vercelHookEnv];
    if (hookUrl) {
      try {
        const res = await fetch(hookUrl, { method: 'POST' });
        result.deployed = res.ok;
        if (!res.ok) result.error = `Deploy hook : HTTP ${res.status}`;
      } catch (e) {
        result.error = `Deploy hook : ${(e as Error).message}`;
      }
    } else {
      // Pas de hook : le push déclenche le build si l'intégration Git existe
      result.deployed = result.pushed;
    }

    // ── 4. Statut en base ───────────────────────────────────────
    const publishedIds = sitePages.filter((p) => result.injected.includes(p.slug)).map((p) => p.id);
    if (publishedIds.length) {
      await db
        .from('seo_pages')
        .update({ status: 'published', deployed_at: new Date().toISOString() })
        .in('id', publishedIds);
      await db
        .from('keyword_clusters')
        .update({ status: 'published' })
        .in('suggested_slug', result.injected)
        .eq('status', 'generated');
    }

    results.push(result);
  }

  console.log(JSON.stringify({ ok: results.some((r) => r.injected.length > 0), dry_run: dryRun, results }));
}

run().catch((e) => {
  console.log(JSON.stringify({ error: (e as Error).message }));
  process.exit(1);
});
