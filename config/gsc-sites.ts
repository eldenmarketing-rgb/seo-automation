/**
 * Registre GSC léger : domaine (nu, sans protocole ni www) → site_key.
 * Utilisé par src/jobs/gsc-sync.ts pour mapper les propriétés GSC accessibles
 * (auto-découvertes via sites.list) vers les site_key du système.
 *
 * Découplé de config/sites.ts : la sync n'a pas besoin de services/téléphone/etc.
 * Pour activer un nouveau site : ajouter le service account
 * seo-automation@seo-automatisation-478810.iam.gserviceaccount.com dans sa
 * Search Console, puis ajouter la ligne domaine → site_key ici.
 */
export const gscSites: Record<string, string> = {
  'garage-perpignan.fr': 'garage',
  'carrossier-pro.fr': 'carrosserie',
  'ideal-transport.fr': 'vtc',
  'ideo-car.fr': 'voitures',
  'livraison-alcool-nuit-perpignan.com': 'restaurant', // Mon-Sauveur
  's-party.fr': 'silent-party',
  'debarrashabitat.fr': 'debarras',
  'okaz-autos66.com': 'okaz',
  'elayarituel.fr': 'elayarituel',
  // À compléter quand la propriété GSC sera partagée avec le service account :
  // 'massage-domicile-perpignan.fr': 'massage',
  // '<domaine-luvala>': 'luvala',
  // '<domaine-beaudouin>': 'beaudouin',
  // '<domaine-noia>': 'noia',
};
