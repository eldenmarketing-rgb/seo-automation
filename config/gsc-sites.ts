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
  'elayarituel.fr': 'elayarituel',

  // ── Mappés mais SANS propriété accessible (vérifié le 2026-08-23) ──
  // Le résolveur src/gsc/property.ts émet un WARN explicite pour chacun.
  'okaz-autos66.com': 'okaz',   // propriété non partagée + site non servi (109.234.166.67 renvoie une page d'erreur)

  // ── Pas de propriété possible : site non déployé (vérifié le 2026-08-23) ──
  // 'retraitebienetre.fr': 'retraite',            // DNS sur parking OVH 213.186.33.5, port 443 fermé
  // 'massage-domicile-perpignan.fr': 'massage',   // domaine non résolu (aucun DNS)
  // '<domaine-reprog>': 'reprog',                 // aucun domaine renseigné dans le registre
  // '<domaine-beaudouin>': 'beaudouin',
  // '<domaine-noia>': 'noia',
};
