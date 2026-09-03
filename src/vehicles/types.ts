/**
 * Une fiche véhicule telle que les sites concessionnaires (Ideo Car, Okaz Autos)
 * la déclarent dans `data/cars.ts` — même forme que leur `types/car.ts`.
 *
 * `dateAjout` et `dateVente` (AAAA-MM-JJ) ne sont pas décoratives : le sitemap
 * d'Ideo Car en tire ses `lastmod`, et une fiche vendue **sans** `dateVente` est
 * considérée vendue depuis longtemps — donc noindex et hors sitemap immédiatement.
 * Le bot doit toujours les poser.
 */
export type FuelType = 'Essence' | 'Diesel' | 'Hybride' | 'Électrique';
export type Transmission = 'Manuelle' | 'Automatique';

export interface CarRecord {
  slug: string;
  marque: string;
  modele: string;
  annee: number;
  prix: number;
  kilometrage: number;
  carburant: FuelType;
  boiteVitesse: Transmission;
  categorie: string[];
  puissanceFiscale?: number;
  chevaux?: number | string;
  couleur?: string;
  portes?: number;
  equipements: string[];
  /** Texte libre, les sauts de ligne doubles séparent les paragraphes. */
  description: string;
  images: string[];
  enVedette: boolean;
  disponible: boolean;
  dateAjout?: string;
  dateVente?: string;
}

/** Date du jour au format des fichiers `cars.ts` (AAAA-MM-JJ, heure de Paris). */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(now);
}
