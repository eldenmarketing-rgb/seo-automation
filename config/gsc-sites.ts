/**
 * Registre GSC : domaine de propriété (nu, sans protocole ni www) → site_key.
 *
 * A1 : dérivé de la colonne `site_profiles.gsc_domain` — ce fichier n'est plus
 * une liste à maintenir à la main. Pour activer un nouveau site : ajouter le
 * service account seo-automation@seo-automatisation-478810.iam.gserviceaccount.com
 * dans sa Search Console, puis renseigner « Domaine GSC » sur la page /sites.
 *
 * Les sites désactivés restent mappés : une propriété accessible non mappée
 * déclencherait un WARN inutile dans src/gsc/property.ts.
 */

import { loadGscMap } from '../src/sites/registry.js';

export const gscSites: Record<string, string> = await loadGscMap();
