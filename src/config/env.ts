/**
 * Environnement — le seul module qui lit `process.env`.
 *
 * Pourquoi : avant, 78 fichiers appelaient `dotenv.config()` et 51 endroits
 * lisaient `process.env.X` avec chacun sa valeur par défaut. Personne ne savait
 * quelles variables existaient ni lesquelles étaient obligatoires. Ici :
 *  - `.env` est chargé une fois, et **prime sur le shell** (`override: true`) — le
 *    VPS traîne un `SUPABASE_ACCESS_TOKEN` périmé dans son profil qui masquait
 *    celui du fichier ;
 *  - chaque variable est déclarée avec son statut (obligatoire / optionnelle),
 *    sa valeur par défaut et son type ;
 *  - une variable obligatoire absente lève une erreur **claire** à la première
 *    lecture, pas un `undefined` qui se propage jusqu'à un appel réseau.
 *
 * Règle ESLint : `process.env` est interdit hors de ce fichier.
 * Ajouter une variable = une ligne dans `SPEC` + une ligne dans `.env.example`.
 */
import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true } as dotenv.DotenvConfigOptions);

type Spec = { required: boolean; default?: string; doc: string };

const SPEC = {
  // Supabase — obligatoire partout (registre des sites, logs, données)
  SUPABASE_URL: { required: true, doc: 'URL du projet Supabase' },
  SUPABASE_SERVICE_KEY: { required: true, doc: 'Clé service_role (jamais côté client)' },
  SUPABASE_ACCESS_TOKEN: { required: false, doc: 'Token Management API — migrations SQL seulement' },

  // Telegram — obligatoire pour le bot et les notifications, pas pour le crawl
  TELEGRAM_BOT_TOKEN: { required: false, doc: 'Token du bot (BotFather)' },
  TELEGRAM_CHAT_ID: { required: false, doc: 'Chat admin (alertes, /status)' },
  TELEGRAM_GROUP_SITES: { required: false, doc: 'Groupes clients : "chatId:siteKey,chatId:siteKey"' },

  // Google Search Console — service account (recommandé) ou OAuth (scripts/gsc-auth.ts)
  GSC_SERVICE_ACCOUNT_PATH: {
    required: false,
    default: './config/gsc-service-account.json',
    doc: 'Fichier JSON du service account (ignoré par git)',
  },
  GSC_CLIENT_ID: { required: false, doc: 'OAuth2 — historique, scripts/gsc-auth.ts' },
  GSC_CLIENT_SECRET: { required: false, doc: 'OAuth2 — historique' },
  GSC_REFRESH_TOKEN: { required: false, doc: 'OAuth2 — historique' },

  // DataForSEO — recherche de mots-clés, SERP, backlinks
  DATAFORSEO_LOGIN: { required: false, doc: 'Identifiant API DataForSEO' },
  DATAFORSEO_PASSWORD: { required: false, doc: 'Mot de passe API DataForSEO' },

  // Anthropic — plus utilisé par les jobs (human-in-the-loop via CLI/dashboard), gardé pour les scripts
  ANTHROPIC_API_KEY: { required: false, doc: 'Clé API Claude (optionnelle)' },

  // Bot — boucle de monitoring
  UPTIME_CHECK_INTERVAL: { required: false, default: '300000', doc: 'Intervalle uptime en ms (5 min)' },

  // Logs
  LOG_LEVEL: { required: false, default: 'info', doc: 'debug | info | warn | error' },
} as const satisfies Record<string, Spec>;

type Name = keyof typeof SPEC;

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Variable d'environnement manquante : ${name} — voir .env.example`);
    this.name = 'MissingEnvError';
  }
}

function read(name: Name): string | undefined {
  const raw = process.env[name];
  const value = raw !== undefined && raw !== '' ? raw : (SPEC[name] as Spec).default;
  if (value === undefined && SPEC[name].required) throw new MissingEnvError(name);
  return value;
}

/** Lecture typée : obligatoire → `string`, optionnelle sans défaut → `string | undefined`. */
export const env = {
  get SUPABASE_URL(): string {
    return read('SUPABASE_URL') as string;
  },
  get SUPABASE_SERVICE_KEY(): string {
    return read('SUPABASE_SERVICE_KEY') as string;
  },
  get SUPABASE_ACCESS_TOKEN(): string | undefined {
    return read('SUPABASE_ACCESS_TOKEN');
  },
  get TELEGRAM_BOT_TOKEN(): string | undefined {
    return read('TELEGRAM_BOT_TOKEN');
  },
  get TELEGRAM_CHAT_ID(): string | undefined {
    return read('TELEGRAM_CHAT_ID');
  },
  get TELEGRAM_GROUP_SITES(): string | undefined {
    return read('TELEGRAM_GROUP_SITES');
  },
  get GSC_SERVICE_ACCOUNT_PATH(): string {
    return read('GSC_SERVICE_ACCOUNT_PATH') as string;
  },
  get GSC_CLIENT_ID(): string | undefined {
    return read('GSC_CLIENT_ID');
  },
  get GSC_CLIENT_SECRET(): string | undefined {
    return read('GSC_CLIENT_SECRET');
  },
  get GSC_REFRESH_TOKEN(): string | undefined {
    return read('GSC_REFRESH_TOKEN');
  },
  get DATAFORSEO_LOGIN(): string | undefined {
    return read('DATAFORSEO_LOGIN');
  },
  get DATAFORSEO_PASSWORD(): string | undefined {
    return read('DATAFORSEO_PASSWORD');
  },
  get ANTHROPIC_API_KEY(): string | undefined {
    return read('ANTHROPIC_API_KEY');
  },
  get LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error' {
    const v = (read('LOG_LEVEL') as string).toLowerCase();
    return v === 'debug' || v === 'warn' || v === 'error' ? v : 'info';
  },
  get UPTIME_CHECK_INTERVAL(): number {
    const n = parseInt(read('UPTIME_CHECK_INTERVAL') as string, 10);
    return Number.isFinite(n) && n > 0 ? n : 300_000;
  },
};

/**
 * Exige une variable optionnelle à un point d'entrée précis (le bot sans token
 * n'a aucun sens, un crawl sans token en a un). Lève `MissingEnvError`.
 */
export function requireEnv(name: Name): string {
  const value = read(name);
  if (value === undefined) throw new MissingEnvError(name);
  return value;
}

/**
 * Variables nommées **par site** dans `site_profiles` (`vercel_hook_env`,
 * `telegram_chat_env`) : le nom n'est connu qu'à l'exécution, on ne peut pas le
 * déclarer dans `SPEC`. Seule lecture dynamique autorisée.
 */
export function readEnvByName(name: string | undefined | null): string | undefined {
  if (!name) return undefined;
  const raw = process.env[name];
  return raw !== undefined && raw !== '' ? raw : undefined;
}

/**
 * Environnement d'un sous-processus Claude CLI : l'env courant sans les clés
 * Anthropic (la clé API épuisée prendrait le pas sur le login claude.ai du
 * forfait Max) et avec le HOME du user qui porte ce login.
 */
export function childEnvForClaudeCli(): NodeJS.ProcessEnv {
  const child: NodeJS.ProcessEnv = { ...process.env, HOME: '/home/ubuntu' };
  delete child.ANTHROPIC_API_KEY;
  delete child.ANTHROPIC_AUTH_TOKEN;
  return child;
}

/** Inventaire pour `scripts/run.ts` et le diagnostic : jamais les valeurs, seulement présent/absent. */
export function describeEnv(): Array<{ name: Name; required: boolean; set: boolean; doc: string }> {
  return (Object.keys(SPEC) as Name[]).map((name) => ({
    name,
    required: SPEC[name].required,
    set: process.env[name] !== undefined && process.env[name] !== '',
    doc: SPEC[name].doc,
  }));
}
