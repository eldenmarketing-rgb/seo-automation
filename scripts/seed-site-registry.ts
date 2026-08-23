/**
 * A1 — migration des registres TypeScript vers `site_profiles` (idempotent).
 *
 * Lit les snapshots `config/sites.legacy.ts` et `config/site-mode-registry.legacy.ts`
 * (+ les tables de correspondance GSC et dashboard, reproduites ici puisque leurs
 * fichiers d'origine deviennent dérivés) et remplit les colonnes ajoutées par
 * `src/db/migration-site-registry.sql`.
 *
 * Règle : on ne réécrit JAMAIS une valeur déjà décidée en base. Une colonne n'est
 * remplie que si elle est nulle / vide. Rejouable sans effet de bord.
 *
 * Usage : npx tsx scripts/seed-site-registry.ts [--dry]
 */

import 'dotenv/config';
import { getSupabase } from '../src/db/supabase.js';
import { sites as legacySites } from '../config/sites.legacy.js';
import { legacyModeRegistry } from '../config/site-mode-registry.legacy.js';

const DRY = process.argv.includes('--dry');

/** ex-config/gsc-sites.ts — domaine de propriété GSC (nu) → site_key */
const GSC_DOMAINS: Record<string, string> = {
  garage: 'garage-perpignan.fr',
  carrosserie: 'carrossier-pro.fr',
  vtc: 'ideal-transport.fr',
  voitures: 'ideo-car.fr',
  restaurant: 'livraison-alcool-nuit-perpignan.com',
  'silent-party': 's-party.fr',
  debarras: 'debarrashabitat.fr',
  elayarituel: 'elayarituel.fr',
  okaz: 'okaz-autos66.com',
};

/** ex-seo-dashboard/src/lib/sites.ts — libellé, couleur, domaine public */
const DASHBOARD_META: Record<string, { label: string; color: string; domain: string }> = {
  garage: { label: 'Garage', color: 'bg-blue-500', domain: 'https://garage-perpignan.fr' },
  carrosserie: { label: 'Carrosserie', color: 'bg-orange-500', domain: 'https://carrossier-pro.fr' },
  massage: { label: 'Massage', color: 'bg-pink-500', domain: 'https://massage-domicile-perpignan.fr' },
  vtc: { label: 'VTC', color: 'bg-green-500', domain: 'https://ideal-transport.fr' },
  voitures: { label: 'Voitures', color: 'bg-purple-500', domain: 'https://www.ideo-car.fr' },
  restaurant: { label: 'Restaurant', color: 'bg-red-500', domain: 'https://livraison-alcool-nuit-perpignan.com' },
  reprog: { label: 'Reprog', color: 'bg-cyan-500', domain: '' },
  retraite: { label: 'Retraite', color: 'bg-amber-500', domain: '' },
  'silent-party': { label: 'Silent Party', color: 'bg-violet-500', domain: 'https://s-party.fr' },
  debarras: { label: 'Débarras', color: 'bg-lime-500', domain: 'https://debarrashabitat.fr' },
  elayarituel: { label: 'Elaya Rituel', color: 'bg-rose-500', domain: 'https://elayarituel.fr' },
  okaz: { label: 'Okaz Autos', color: 'bg-teal-500', domain: 'https://www.okaz-autos66.com' },
};

/**
 * `massage` était l'entrée historique d'Elaya Rituel : elle porte l'identité réelle
 * (email, chemin projet, services, voix de marque) alors que la ligne `elayarituel`,
 * créée en W0, est quasi vide. On rapatrie donc cette config sur `elayarituel`, qui
 * est le site réellement en ligne ; `massage` reste comme archive désactivée.
 */
const LEGACY_ALIAS: Record<string, string> = { elayarituel: 'massage' };

/** Sites sans domaine servi : désactivés au premier seed uniquement. */
const INACTIVE_ON_FIRST_SEED = ['massage', 'reprog'];

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

async function main() {
  const db = getSupabase();
  const { data: rows, error } = await db.from('site_profiles').select('*');
  if (error) throw new Error(`Lecture site_profiles : ${error.message}`);

  const existing = new Map((rows || []).map((r) => [r.site_key as string, r]));
  const keys = [...new Set([...existing.keys(), ...Object.keys(legacySites), ...Object.keys(DASHBOARD_META)])].sort();

  let touched = 0;

  for (const key of keys) {
    const row = existing.get(key);
    if (!row) {
      console.warn(`⚠️  ${key} : absent de site_profiles — ignoré (à créer via /sites ou une migration)`);
      continue;
    }

    const legacy = legacySites[key] || legacySites[LEGACY_ALIAS[key]];
    const modeCfg = legacyModeRegistry[key] || legacyModeRegistry[LEGACY_ALIAS[key]];
    const meta = DASHBOARD_META[key];

    // Colonne → valeur candidate issue des registres TypeScript.
    const candidates: Record<string, unknown> = {
      label: meta?.label,
      color: meta?.color,
      domain: meta?.domain || legacy?.domain || undefined,
      gsc_domain: GSC_DOMAINS[key],
      business: legacy?.business,
      phone: legacy?.phone,
      email: legacy?.email,
      address: legacy?.address,
      postal_code: legacy?.postalCode,
      city: legacy?.city,
      schema_type: legacy?.schemaType,
      project_path: legacy?.projectPath,
      data_strategy: legacy?.dataStrategy,
      service_data_file: legacy?.serviceDataFile,
      city_data_file: legacy?.cityDataFile,
      slug_page_file: legacy?.slugPageFile,
      vercel_hook_env: legacy?.vercelHookEnv,
      telegram_chat_env: legacy?.telegramChatEnv,
      services: legacy?.services,
      seo_keyword_patterns: legacy?.seoKeywordPatterns,
      brand: modeCfg?.brand,
      enabled_intents: modeCfg?.enabledIntents,
      content_rules: modeCfg?.content,
      cocooning: modeCfg?.cocooning,
      thematic: modeCfg?.thematic,
      product_config: modeCfg?.product,
    };

    const updates: Record<string, unknown> = {};
    for (const [col, value] of Object.entries(candidates)) {
      if (isEmpty(value)) continue;          // rien à proposer
      if (!isEmpty(row[col])) continue;      // déjà décidé en base : on ne touche pas
      updates[col] = value;
    }

    // `label` n'est jamais posé ailleurs que par ce seed : il sert de marqueur de
    // premier passage, pour ne pas réactiver un site que l'utilisateur a désactivé.
    const firstSeed = isEmpty(row.label);
    if (firstSeed && INACTIVE_ON_FIRST_SEED.includes(key)) updates.is_active = false;

    if (Object.keys(updates).length === 0) {
      console.log(`   ${key} : à jour`);
      continue;
    }

    console.log(`✏️  ${key} : ${Object.keys(updates).join(', ')}`);
    touched++;
    if (DRY) continue;

    updates.updated_at = new Date().toISOString();
    const { error: upErr } = await db.from('site_profiles').update(updates).eq('site_key', key);
    if (upErr) throw new Error(`Update ${key} : ${upErr.message}`);
  }

  console.log(`\n${DRY ? '[dry] ' : ''}${touched} site(s) mis à jour sur ${keys.length}.`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
