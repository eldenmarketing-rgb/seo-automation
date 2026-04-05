/**
 * Weekly Performance Report + GSC Feedback Loop
 * 
 * Deux fonctions :
 * 1. Rapport hebdo Telegram : impressions, positions, pages montantes/descendantes
 * 2. Auto-optimisation : détecte les pages position 5-15 et les améliore automatiquement
 * 
 * Cron recommandé : dimanche 8h (rapport) + lundi 6h (optimisation)
 */

import { fetchGscData, GscRow } from '../gsc/client.js';
import { getSupabase, upsertSeoPage } from '../db/supabase.js';
import { sites } from '../../config/sites.js';
import { generateOptimizedContent } from '../generators/page-generator-v2.js';
import { sendTelegram } from '../notifications/telegram.js';
import * as logger from '../utils/logger.js';

// ─── Types ───────────────────────────────────────────────────

interface SiteReport {
  siteKey: string;
  siteName: string;
  totalImpressions: number;
  totalClicks: number;
  avgPosition: number;
  avgCtr: number;
  totalPages: number;
  pagesInTop3: number;
  pagesInTop10: number;
  pagesMovedUp: string[];      // Pages qui ont gagné des positions
  pagesMovedDown: string[];    // Pages qui ont perdu des positions
  newPages: string[];          // Pages apparues cette semaine
  optimizationCandidates: Array<{
    url: string;
    query: string;
    position: number;
    impressions: number;
  }>;
}

// ─── Weekly Report ───────────────────────────────────────────

/**
 * Génère le rapport hebdomadaire pour tous les sites.
 * Compare les données de cette semaine avec la semaine précédente.
 */
export async function generateWeeklyReport(): Promise<string> {
  logger.info('=== Weekly Performance Report ===');
  const reports: SiteReport[] = [];

  for (const [siteKey, site] of Object.entries(sites)) {
    try {
      // Données des 7 derniers jours (cette semaine)
      const thisWeek = await fetchGscData(siteKey, 7);

      // Données des 14 derniers jours (pour comparer semaine vs semaine)
      const twoWeeks = await fetchGscData(siteKey, 14);
      // Extraire semaine dernière = tout ce qui est dans twoWeeks mais pas thisWeek
      const thisWeekUrls = new Set(thisWeek.map(r => `${r.page_url}|${r.query}`));
      const lastWeek = twoWeeks.filter(r => !thisWeekUrls.has(`${r.page_url}|${r.query}`));

      if (!thisWeek || thisWeek.length === 0) {
        logger.info(`No GSC data for ${siteKey}`);
        continue;
      }

      // Agréger par page
      const thisWeekByPage = aggregateByPage(thisWeek);
      const lastWeekByPage = aggregateByPage(lastWeek || []);

      // Calculer les métriques
      const totalImpressions = thisWeek.reduce((sum, r) => sum + r.impressions, 0);
      const totalClicks = thisWeek.reduce((sum, r) => sum + r.clicks, 0);
      const avgPosition = thisWeek.reduce((sum, r) => sum + r.position, 0) / thisWeek.length;
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Pages par tranche de position
      const uniquePages = [...new Set(thisWeek.map(r => r.page_url))];
      const pagePositions = new Map<string, number>();
      for (const page of uniquePages) {
        const pageRows = thisWeek.filter(r => r.page_url === page);
        const bestPos = Math.min(...pageRows.map(r => r.position));
        pagePositions.set(page, bestPos);
      }

      const pagesInTop3 = [...pagePositions.values()].filter(p => p <= 3).length;
      const pagesInTop10 = [...pagePositions.values()].filter(p => p <= 10).length;

      // Mouvement des pages
      const pagesMovedUp: string[] = [];
      const pagesMovedDown: string[] = [];
      const newPages: string[] = [];

      for (const [page, pos] of pagePositions) {
        const lastWeekPos = lastWeekByPage.get(page);
        if (!lastWeekPos) {
          newPages.push(page);
        } else if (pos < lastWeekPos - 2) {
          pagesMovedUp.push(page);
        } else if (pos > lastWeekPos + 2) {
          pagesMovedDown.push(page);
        }
      }

      // Candidats à l'optimisation (position 5-15, impressions > 10)
      const optimizationCandidates = thisWeek
        .filter(r => r.position >= 5 && r.position <= 15 && r.impressions >= 10)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 5)
        .map(r => ({
          url: r.page_url,
          query: r.query,
          position: r.position,
          impressions: r.impressions,
        }));

      reports.push({
        siteKey,
        siteName: site.name,
        totalImpressions,
        totalClicks,
        avgPosition: Math.round(avgPosition * 10) / 10,
        avgCtr: Math.round(avgCtr * 100) / 100,
        totalPages: uniquePages.length,
        pagesInTop3,
        pagesInTop10,
        pagesMovedUp,
        pagesMovedDown,
        newPages,
        optimizationCandidates,
      });
    } catch (e) {
      logger.error(`Report failed for ${siteKey}: ${(e as Error).message}`);
    }
  }

  return formatWeeklyReportTelegram(reports);
}

function aggregateByPage(rows: GscRow[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const row of rows) {
    const existing = result.get(row.page_url);
    if (!existing || row.position < existing) {
      result.set(row.page_url, row.position);
    }
  }
  return result;
}

// ─── GSC Feedback Loop ──────────────────────────────────────

/**
 * Détecte les pages position 5-15 et lance l'optimisation automatique.
 * Envoie les propositions sur Telegram pour validation.
 */
export async function runOptimizationLoop(maxPages: number = 3): Promise<void> {
  logger.info('=== GSC Optimization Loop ===');
  
  const supabase = getSupabase();

  for (const [siteKey, site] of Object.entries(sites)) {
    try {
      const gscData = await fetchGscData(siteKey, 14);

      if (!gscData || gscData.length === 0) continue;

      // Trouver les pages entre position 5 et 15
      const candidates = gscData
        .filter(r => r.position >= 5 && r.position <= 15 && r.impressions >= 20)
        .reduce((acc, r) => {
          const existing = acc.find(a => a.pageUrl === r.page_url);
          if (existing) {
            existing.queries.push({ query: r.query, position: r.position, impressions: r.impressions });
          } else {
            acc.push({
              pageUrl: r.page_url,
              queries: [{ query: r.query, position: r.position, impressions: r.impressions }],
            });
          }
          return acc;
        }, [] as Array<{ pageUrl: string; queries: Array<{ query: string; position: number; impressions: number }> }>)
        .sort((a, b) => {
          const aImp = a.queries.reduce((s, q) => s + q.impressions, 0);
          const bImp = b.queries.reduce((s, q) => s + q.impressions, 0);
          return bImp - aImp;
        })
        .slice(0, maxPages);

      if (candidates.length === 0) continue;

      logger.info(`${siteKey}: ${candidates.length} optimization candidates`);

      for (const candidate of candidates) {
        // Extraire le slug depuis l'URL
        const urlPath = new URL(candidate.pageUrl).pathname;
        const slug = urlPath.replace(/^\/|\/$/g, '').split('/').pop() || '';

        // Récupérer le contenu actuel depuis Supabase
        const { data: page } = await supabase
          .from('seo_pages')
          .select('*')
          .eq('site_key', siteKey)
          .eq('slug', slug)
          .single();

        if (!page || !page.content) {
          logger.warn(`No content found for ${slug} in Supabase`);
          continue;
        }

        try {
          // Générer le contenu optimisé
          const optimized = await generateOptimizedContent(
            page.content,
            candidate.queries,
            siteKey,
            candidate.pageUrl
          );

          // Sauvegarder en Supabase avec statut 'optimized'
          await upsertSeoPage({
            ...page,
            content: optimized,
            status: 'optimized',
          });

          // Notifier sur Telegram
          const topQuery = candidate.queries[0];
          const msg = `🔧 <b>Page optimisée : ${slug}</b>\nPosition actuelle : ${topQuery.position.toFixed(1)} pour "${topQuery.query}"\nImpressions : ${candidate.queries.reduce((s, q) => s + q.impressions, 0)}\nObjectif : TOP 3`;
          await sendTelegram(msg, siteKey);

          logger.success(`Optimized: ${slug} (pos ${topQuery.position.toFixed(1)})`);
        } catch (e) {
          logger.error(`Optimization failed for ${slug}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      logger.error(`Optimization loop failed for ${siteKey}: ${(e as Error).message}`);
    }
  }
}

// ─── Telegram Formatting ─────────────────────────────────────

function formatWeeklyReportTelegram(reports: SiteReport[]): string {
  if (reports.length === 0) return '📊 Aucune donnée GSC cette semaine.';

  const lines: string[] = [];
  lines.push('📊 <b>Rapport SEO hebdomadaire</b>');
  lines.push('');

  // Totaux
  const totalImpressions = reports.reduce((s, r) => s + r.totalImpressions, 0);
  const totalClicks = reports.reduce((s, r) => s + r.totalClicks, 0);
  const totalTop10 = reports.reduce((s, r) => s + r.pagesInTop10, 0);
  lines.push(`<b>Tous sites :</b> ${totalImpressions.toLocaleString('fr-FR')} impressions | ${totalClicks} clics | ${totalTop10} pages top 10`);
  lines.push('');

  for (const report of reports) {
    lines.push(`━━━ <b>${report.siteName}</b> ━━━`);
    lines.push(`📈 ${report.totalImpressions.toLocaleString('fr-FR')} imp | ${report.totalClicks} clics | CTR ${report.avgCtr}%`);
    lines.push(`📍 Position moy : ${report.avgPosition} | Top 3 : ${report.pagesInTop3} | Top 10 : ${report.pagesInTop10}`);
    lines.push(`📄 ${report.totalPages} pages indexées`);

    if (report.pagesMovedUp.length > 0) {
      lines.push(`🟢 Montées : ${report.pagesMovedUp.length} pages`);
    }
    if (report.pagesMovedDown.length > 0) {
      lines.push(`🔴 Descentes : ${report.pagesMovedDown.length} pages`);
    }
    if (report.newPages.length > 0) {
      lines.push(`🆕 Nouvelles : ${report.newPages.length} pages`);
    }

    if (report.optimizationCandidates.length > 0) {
      lines.push(`🎯 <b>Candidats optimisation :</b>`);
      for (const c of report.optimizationCandidates.slice(0, 3)) {
        lines.push(`  • pos ${c.position.toFixed(0)} | ${c.impressions} imp | "${c.query}"`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
