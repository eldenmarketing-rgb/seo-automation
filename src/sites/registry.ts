/**
 * Registre des sites — chargeur unique depuis Supabase `site_profiles`.
 *
 * A1 : `site_profiles` est la source unique de vérité. Ce module lit la table
 * une seule fois par process et reconstruit les objets attendus par le code
 * existant (`SiteConfig`, la map GSC, `SiteModeConfig`), de sorte que les ~50
 * consommateurs de `config/sites.ts` n'ont pas eu à bouger.
 *
 * Les règles génériques par mode restent en TypeScript (`config/mode-defaults.ts`) ;
 * la base ne porte que ce qui est propre à un site et vient les surcharger.
 */

import { getSupabase } from '../db/supabase.js';
import type { SiteConfig, ServiceDef } from '../../config/site-types.js';
import type { SiteModeConfig, SiteMode, PageIntent } from '../../config/site-modes.js';
import { MODE_DEFAULTS, DEFAULT_BRAND, isSiteMode } from '../../config/mode-defaults.js';

export interface SiteProfileRow {
  site_key: string;
  name: string | null;
  label: string | null;
  color: string | null;
  is_active: boolean;
  scope: string | null;
  mode: string | null;
  niche: string | null;
  geo_target: string | null;
  business: string | null;
  business_model: string | null;
  target_audience: string | null;
  relevant_topics: string[] | null;
  reject_topics: string[] | null;
  triage_instructions: string | null;
  domain: string | null;
  gsc_domain: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  schema_type: string | null;
  project_path: string | null;
  data_strategy: string | null;
  service_data_file: string | null;
  city_data_file: string | null;
  slug_page_file: string | null;
  vercel_hook_env: string | null;
  telegram_chat_env: string | null;
  delivery_mode: string | null;
  revalidate_url: string | null;
  services: ServiceDef[] | null;
  seo_keyword_patterns: string[] | null;
  brand: SiteModeConfig['brand'] | null;
  enabled_intents: string[] | null;
  content_rules: Partial<SiteModeConfig['content']> | null;
  cocooning: Partial<SiteModeConfig['cocooning']> | null;
  thematic: SiteModeConfig['thematic'] | null;
  product_config: SiteModeConfig['product'] | null;
}

/** Toutes les colonnes sauf `revalidate_secret` : un secret n'a rien à faire en mémoire ici. */
const COLUMNS = `site_key, name, label, color, is_active, scope, mode, niche, geo_target,
  business, business_model, target_audience, relevant_topics, reject_topics, triage_instructions,
  domain, gsc_domain, phone, email, address, postal_code, city, schema_type,
  project_path, data_strategy, service_data_file, city_data_file, slug_page_file,
  vercel_hook_env, telegram_chat_env, delivery_mode, revalidate_url,
  services, seo_keyword_patterns, brand, enabled_intents, content_rules, cocooning,
  thematic, product_config`;

let rowsPromise: Promise<SiteProfileRow[]> | null = null;

/** Charge les profils une seule fois par process (jobs, bot, scripts sont courts). */
export function loadSiteProfiles(): Promise<SiteProfileRow[]> {
  if (!rowsPromise) {
    rowsPromise = (async () => {
      const { data, error } = await getSupabase()
        .from('site_profiles')
        .select(COLUMNS)
        .order('site_key');
      if (error) {
        rowsPromise = null; // ne pas figer un échec réseau pour tout le process
        throw new Error(`Registre des sites illisible (site_profiles) : ${error.message}`);
      }
      return (data || []) as unknown as SiteProfileRow[];
    })();
  }
  return rowsPromise;
}

/** Vide le cache mémoire — utilisé par les scripts qui viennent d'écrire en base. */
export function resetSiteRegistryCache(): void {
  rowsPromise = null;
}

const str = (v: string | null | undefined, fallback = ''): string => v ?? fallback;

export function rowToSiteConfig(row: SiteProfileRow): SiteConfig {
  return {
    key: row.site_key,
    name: str(row.name, row.site_key),
    domain: str(row.domain),
    business: str(row.business, str(row.niche)),
    phone: str(row.phone),
    email: str(row.email),
    address: str(row.address),
    postalCode: str(row.postal_code),
    city: str(row.city),
    schemaType: str(row.schema_type, 'LocalBusiness'),
    projectPath: str(row.project_path),
    dataStrategy: (row.data_strategy as SiteConfig['dataStrategy']) || 'data-files',
    serviceDataFile: str(row.service_data_file),
    cityDataFile: str(row.city_data_file),
    slugPageFile: str(row.slug_page_file),
    vercelHookEnv: str(row.vercel_hook_env),
    telegramChatEnv: row.telegram_chat_env || undefined,
    services: row.services || [],
    seoKeywordPatterns: row.seo_keyword_patterns || [],
  };
}

/** Les sites actifs, indexés par site_key — remplace le littéral de config/sites.ts. */
export async function loadSiteRegistry(): Promise<Record<string, SiteConfig>> {
  const rows = await loadSiteProfiles();
  const out: Record<string, SiteConfig> = {};
  for (const row of rows) {
    if (row.is_active === false) continue;
    out[row.site_key] = rowToSiteConfig(row);
  }
  return out;
}

/**
 * Domaine GSC nu → site_key. Les sites inactifs restent mappés : une propriété
 * accessible non mappée déclenche un WARN dans le résolveur, autant l'éviter.
 */
export async function loadGscMap(): Promise<Record<string, string>> {
  const rows = await loadSiteProfiles();
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.gsc_domain) out[row.gsc_domain.trim().toLowerCase()] = row.site_key;
  }
  return out;
}

/** Défauts du mode (TypeScript) surchargés par ce que le site déclare en base. */
export function rowToModeConfig(row: SiteProfileRow): SiteModeConfig {
  const mode: SiteMode = isSiteMode(row.mode) ? row.mode : 'local';
  const defaults = MODE_DEFAULTS[mode];

  const intents = (row.enabled_intents || []).filter(Boolean) as PageIntent[];

  return {
    mode,
    brand: row.brand || DEFAULT_BRAND,
    enabledIntents: intents.length ? intents : defaults.enabledIntents,
    content: { ...defaults.content, ...(row.content_rules || {}) },
    cocooning: { ...defaults.cocooning, ...(row.cocooning || {}) },
    ...(row.thematic ? { thematic: row.thematic } : {}),
    ...(row.product_config ? { product: row.product_config } : {}),
  };
}

export async function loadModeRegistry(): Promise<Record<string, SiteModeConfig>> {
  const rows = await loadSiteProfiles();
  const out: Record<string, SiteModeConfig> = {};
  for (const row of rows) out[row.site_key] = rowToModeConfig(row);
  return out;
}
