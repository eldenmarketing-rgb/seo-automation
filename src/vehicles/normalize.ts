/**
 * Normalisation de ce que le vendeur tape dans Telegram.
 *
 * L'historique des sites montre ce que donne la saisie brute : « Nissan X-Trail
 * X-Trail 2012 », « Mini cooper Mini 2014 », « Nissan x trail T31 », trois
 * slugs voisins pour le même modèle. Titre, H1, JSON-LD et URL sortent de ces
 * champs : on les remet d'équerre ici, une fois, avant d'écrire quoi que ce soit.
 */

/** Marques telles qu'elles doivent s'écrire ; la clé de gauche est la forme repliée (sans accent, minuscule). */
const BRANDS: Record<string, string> = {};
for (const name of [
  'Abarth',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Chevrolet',
  'Citroën',
  'Cupra',
  'Dacia',
  'DS',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Isuzu',
  'Jaguar',
  'Jeep',
  'Kia',
  'Lancia',
  'Land Rover',
  'Lexus',
  'Mazda',
  'Mercedes-Benz',
  'MG',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Peugeot',
  'Porsche',
  'Renault',
  'Seat',
  'Skoda',
  'Smart',
  'SsangYong',
  'Subaru',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
]) {
  BRANDS[fold(name)] = name;
}
Object.assign(BRANDS, {
  mercedes: 'Mercedes-Benz',
  'mercedes benz': 'Mercedes-Benz',
  vw: 'Volkswagen',
  'land-rover': 'Land Rover',
  'alfa-romeo': 'Alfa Romeo',
  alfa: 'Alfa Romeo',
  'mini cooper': 'Mini',
});

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1);
}

export function normalizeBrand(raw: string): string {
  const key = fold(raw);
  if (BRANDS[key]) return BRANDS[key];
  return raw
    .trim()
    .split(/\s+/)
    .map((t) => (t === t.toLowerCase() ? capitalizeFirst(t) : t))
    .join(' ');
}

/**
 * Modèle : retire la marque si le vendeur l'a retapée, supprime un mot doublé
 * (« X-Trail X-Trail »), met une capitale aux mots tout en minuscules sans
 * toucher à ceux qui portent déjà une casse (« HDi », « GT », « e-2008 »).
 */
export function normalizeModel(brand: string, raw: string): string {
  let tokens = raw.trim().split(/\s+/).filter(Boolean);
  // « mercedes benz classe a » avec la marque « Mercedes-Benz » : on compare sans tirets ni espaces.
  const alnum = (s: string) => fold(s).replace(/[^a-z0-9]/g, '');
  const brandKey = alnum(brand);
  for (let k = 1; k < tokens.length; k++) {
    if (alnum(tokens.slice(0, k).join('')) === brandKey) {
      tokens = tokens.slice(k);
      break;
    }
  }
  const deduped: string[] = [];
  for (const t of tokens) {
    if (deduped.length && fold(deduped[deduped.length - 1]) === fold(t)) continue;
    deduped.push(t);
  }
  return deduped
    .map((t) => (t === t.toLowerCase() && !/^[a-z]-\d/.test(t) ? capitalizeFirst(t) : t))
    .join(' ');
}

/** Raccourcis courants → libellé propre. Clé = forme repliée. */
const EQUIPEMENTS: Record<string, string> = {
  clim: 'Climatisation',
  climatisation: 'Climatisation',
  'clim auto': 'Climatisation automatique',
  'clim automatique': 'Climatisation automatique',
  'climatisation auto': 'Climatisation automatique',
  gps: 'GPS',
  navigation: 'GPS',
  'camera de recul': 'Caméra de recul',
  camera: 'Caméra de recul',
  'camera 360': 'Caméra 360°',
  'radar de recul': 'Radars de stationnement',
  'radars de recul': 'Radars de stationnement',
  'radar de stationnement': 'Radars de stationnement',
  regulateur: 'Régulateur de vitesse',
  'regulateur de vitesse': 'Régulateur de vitesse',
  'regulateur adaptatif': 'Régulateur adaptatif',
  bluetooth: 'Bluetooth',
  carplay: 'Apple CarPlay / Android Auto',
  'apple carplay': 'Apple CarPlay / Android Auto',
  'android auto': 'Apple CarPlay / Android Auto',
  'carplay android auto': 'Apple CarPlay / Android Auto',
  'jantes alu': 'Jantes alliage',
  'jantes alliage': 'Jantes alliage',
  jantes: 'Jantes alliage',
  'sieges chauffants': 'Sièges chauffants',
  'siege chauffant': 'Sièges chauffants',
  'sieges cuir': 'Sellerie cuir',
  cuir: 'Sellerie cuir',
  'toit ouvrant': 'Toit ouvrant',
  'toit pano': 'Toit panoramique',
  'toit panoramique': 'Toit panoramique',
  attelage: 'Attelage',
  'vitres electriques': 'Vitres électriques',
  'vitre electrique': 'Vitres électriques',
  'fermeture centralisee': 'Fermeture centralisée',
  'aide au stationnement': 'Aide au stationnement',
  'aide a la conduite': 'Aides à la conduite',
  'aides a la conduite': 'Aides à la conduite',
  'demarrage sans cle': 'Démarrage sans clé',
  keyless: 'Démarrage sans clé',
  'ecran tactile': 'Écran tactile',
  'feux led': 'Feux LED',
  led: 'Feux LED',
  'barres de toit': 'Barres de toit',
  'volant multifonction': 'Volant multifonction',
  'start and stop': 'Start & Stop',
  'start & stop': 'Start & Stop',
  'start stop': 'Start & Stop',
  '4x4': 'Transmission 4x4',
  abs: 'ABS',
  esp: 'ESP',
  airbags: 'Airbags',
  airbag: 'Airbags',
};

export function normalizeEquipements(raw: string[]): string[] {
  const out: string[] = [];
  for (const item of raw) {
    const trimmed = item.trim().replace(/\s+/g, ' ');
    if (!trimmed) continue;
    const label = EQUIPEMENTS[fold(trimmed)] ?? capitalizeFirst(trimmed);
    if (!out.some((e) => fold(e) === fold(label))) out.push(label);
  }
  return out;
}

export function slugify(text: string): string {
  return fold(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Slug de fiche : marque-modèle-année, suffixé s'il existe déjà (deux fiches identiques ne s'écrasent plus). */
export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Impossible de trouver un slug libre pour ${base}`);
}
