/**
 * Accès base — point d'entrée unique, découpé par domaine.
 *
 * Ce fichier ne contient plus de code : il ré-exporte les modules de `src/db/`
 * pour que les imports existants (`from '../db/supabase.js'`) restent valables.
 * Nouveau code : importer directement le module concerné.
 *
 *   client.ts        → getSupabase()
 *   pages.ts         → seo_pages (types, slugs, comptages)
 *   gsc.ts           → gsc_positions
 *   optimization.ts  → optimization_queue
 *   logs.ts          → automation_logs
 *
 * Les accès aux autres tables (crawl_results, site_profiles, keyword_clusters…)
 * se font au plus près de leur domaine (`src/crawler`, `src/sites`, `src/jobs`).
 */
export { getSupabase } from './client.js';
export { type PageType, type SeoPageRow, getExistingSlugs, countPagesByStatus } from './pages.js';
export { type GscPositionRow, insertGscPositions, getLatestGscDate } from './gsc.js';
export { type OptimizationQueueRow, addToOptimizationQueue } from './optimization.js';
export { type LogStatus, log } from './logs.js';
