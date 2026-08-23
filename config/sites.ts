/**
 * Registre des sites — chargé depuis Supabase `site_profiles`.
 *
 * A1 (2026-08-23) : la liste des sites ne vit plus en TypeScript. Elle est lue
 * une fois par process, au chargement du module, via un top-level await. Les
 * consommateurs (`src/gsc/*`, `src/jobs/*`, `src/deployers/*`, `src/bot/*`,
 * `scripts/*`) importent `sites` exactement comme avant.
 *
 * Conséquence : importer ce module suppose Supabase joignable. C'est déjà le cas
 * de tous ses consommateurs, qui écrivent en base juste après.
 *
 * Pour modifier un site : page `/sites` du dashboard, ou directement la table.
 * Les données d'origine sont archivées dans `config/sites.legacy.ts` (A2 les
 * supprimera) ; les règles génériques par mode sont dans `config/mode-defaults.ts`.
 */

import { loadSiteRegistry } from '../src/sites/registry.js';

export type { SiteConfig, ServiceDef } from './site-types.js';

/** Sites actifs, indexés par `site_key`. Un site désactivé n'apparaît pas ici. */
export const sites = await loadSiteRegistry();
