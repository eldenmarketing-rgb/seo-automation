/**
 * Points de vue de la recherche Maps. Le pack local dépend d'où l'on cherche :
 * une fiche première au centre-ville peut être absente depuis le littoral.
 * Trois points par ville — le centre et deux bords de la zone desservie —,
 * zoom 12 (≈ l'agglomération). DataForSEO attend « lat,lon,zoom ».
 * Perpignan par défaut : c'est le réseau d'aujourd'hui ; une ville absente
 * ici retombe dessus en le disant.
 */
export interface Vantage {
  key: string;
  label: string;
  coord: string;
}

const CITIES: Record<string, Vantage[]> = {
  perpignan: [
    { key: 'centre', label: 'Perpignan centre', coord: '42.6887,2.8948,12' },
    { key: 'littoral', label: 'Canet-en-Roussillon', coord: '42.7050,3.0330,12' },
    { key: 'sud', label: 'Elne', coord: '42.6000,2.9710,12' },
  ],
  narbonne: [
    { key: 'centre', label: 'Narbonne centre', coord: '43.1839,3.0042,12' },
    { key: 'littoral', label: 'Narbonne-Plage', coord: '43.1600,3.1700,12' },
    { key: 'sud', label: 'Sigean', coord: '43.0280,2.9790,12' },
  ],
  beziers: [{ key: 'centre', label: 'Béziers centre', coord: '43.3442,3.2158,12' }],
  carcassonne: [{ key: 'centre', label: 'Carcassonne centre', coord: '43.2130,2.3491,12' }],
  montpellier: [{ key: 'centre', label: 'Montpellier centre', coord: '43.6108,3.8767,12' }],
  toulouse: [{ key: 'centre', label: 'Toulouse centre', coord: '43.6047,1.4442,12' }],
  marseille: [{ key: 'centre', label: 'Marseille centre', coord: '43.2965,5.3698,12' }],
};

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function vantagesFor(city: string | null | undefined): { vantages: Vantage[]; known: boolean } {
  const key = strip(city || 'perpignan');
  const hit = CITIES[key] ?? CITIES[Object.keys(CITIES).find((k) => key.startsWith(k)) ?? ''];
  if (!hit) return { vantages: CITIES.perpignan, known: false };
  return { vantages: hit, known: true };
}

/** Le centre seul (découverte, doublons). */
export function locationCoordinate(city: string | null | undefined): { coord: string; known: boolean } {
  const { vantages, known } = vantagesFor(city);
  return { coord: vantages[0].coord, known };
}
