/**
 * Config de génération par site : mode, voix de marque, intents, cocon.
 *
 * A1 : les valeurs viennent de `site_profiles` (colonnes `mode`, `brand`,
 * `enabled_intents`, `content_rules`, `cocooning`, `thematic`, `product_config`)
 * et surchargent les règles génériques de `config/mode-defaults.ts`, qui restent
 * en TypeScript. L'ancien registre littéral est archivé dans
 * `config/site-mode-registry.legacy.ts`.
 *
 * Éditer un site : page /sites du dashboard. Éditer une règle de mode : mode-defaults.ts.
 */

import { SiteModeConfig } from './site-modes.js';
import { loadModeRegistry } from '../src/sites/registry.js';
import { MODE_DEFAULTS, DEFAULT_BRAND } from './mode-defaults.js';

const registry: Record<string, SiteModeConfig> = await loadModeRegistry();

/**
 * Config de mode d'un site. Retombe sur les défauts LOCAL si le site est inconnu
 * du registre (site jamais créé dans site_profiles).
 */
export function getSiteModeConfig(siteKey: string): SiteModeConfig {
  const config = registry[siteKey];
  if (config) return config;

  console.warn(`Aucun profil pour "${siteKey}" dans site_profiles — défauts LOCAL appliqués`);
  return {
    mode: 'local',
    brand: DEFAULT_BRAND,
    ...MODE_DEFAULTS.local,
  };
}

/**
 * Surcharge en mémoire, pour la durée du process (tests, prévisualisation).
 * Ne persiste rien : la source de vérité est `site_profiles`.
 */
export function registerSiteModeConfig(siteKey: string, config: SiteModeConfig): void {
  registry[siteKey] = config;
}

export function listRegisteredSites(): Array<{ key: string; mode: string; intents: string[] }> {
  return Object.entries(registry).map(([key, config]) => ({
    key,
    mode: config.mode,
    intents: config.enabledIntents,
  }));
}
