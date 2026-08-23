/**
 * Types du registre de sites.
 *
 * Isolés de `config/sites.ts` depuis A1 : ce dernier charge désormais les sites
 * depuis Supabase avec un top-level await, et un import circulaire avec un
 * top-level await se solderait par un deadlock. Tout module qui n'a besoin que
 * des types doit importer ici.
 */

export interface SiteConfig {
  key: string;
  name: string;
  domain: string;
  business: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  schemaType: string;
  projectPath: string;
  /**
   * Comment le moteur écrit le contenu dans le dépôt du site.
   * `null` = le contenu du site n'est pas piloté par le moteur (il vit en dur
   * dans son code). Ce n'est pas une valeur manquante à remplacer par un défaut :
   * c'est l'information qu'on ne sait pas publier là.
   */
  dataStrategy: 'data-files' | 'config-only' | 'create-dynamic' | null;
  serviceDataFile: string;
  cityDataFile: string;
  slugPageFile: string;
  vercelHookEnv: string;
  telegramChatEnv?: string;
  services: ServiceDef[];
  seoKeywordPatterns: string[];
}

export interface ServiceDef {
  slug: string;
  name: string;
  emoji: string;
  category: string;
  keywords: string[];
}
