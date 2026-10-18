/**
 * Point de vue de la recherche Maps : le centre de la ville du site, zoom 12
 * (≈ l'agglomération). DataForSEO attend « lat,lon,zoom ». Perpignan par défaut :
 * c'est le réseau d'aujourd'hui ; une ville absente ici retombe dessus en le disant.
 */
const CITIES: Record<string, [number, number]> = {
  perpignan: [42.6887, 2.8948],
  narbonne: [43.1839, 3.0042],
  beziers: [43.3442, 3.2158],
  carcassonne: [43.213, 2.3491],
  montpellier: [43.6108, 3.8767],
  toulouse: [43.6047, 1.4442],
  marseille: [43.2965, 5.3698],
};

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function locationCoordinate(city: string | null | undefined): { coord: string; known: boolean } {
  const key = strip(city || 'perpignan');
  const hit = CITIES[key] ?? CITIES[Object.keys(CITIES).find((k) => key.startsWith(k)) ?? ''];
  if (!hit) return { coord: `${CITIES.perpignan[0]},${CITIES.perpignan[1]},12`, known: false };
  return { coord: `${hit[0]},${hit[1]},12`, known: true };
}
