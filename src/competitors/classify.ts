/**
 * Classification des domaines — deux usages :
 *
 * 1. Les domaines référents (backlinks) : compter les liens « propres » et
 *    repérer ce qui est réplicable (annuaire, presse, institution). Grille
 *    héritée de `scripts/oneshot/vtc-backlinks-competitors.mjs` et de la preuve
 *    Carrosserie du 2026-08-28 (54 `.com` de rang 0, ancres « Premium PBN »).
 * 2. Les domaines qui rankent sur nos requêtes : lesquels proposer comme
 *    concurrents, et sous quelle étiquette. Un annuaire dont les fiches rankent
 *    (zecarrossery, pagesjaunes) n'est pas un concurrent à dépasser, c'est une
 *    citation à obtenir ; une enseigne nationale (Norauto, Speedy) ne se
 *    dépasse pas avec un site local — on la montre, on ne la compare pas.
 */
import type { CompetitorKind } from './types.js';

export type DomainCategory =
  'spam-pbn' | 'social' | 'annuaire' | 'plateforme' | 'presse' | 'institution' | 'forum' | 'blog' | 'autre';

const RULES: Array<[DomainCategory, RegExp]> = [
  [
    'social',
    /(^|\.)(facebook|instagram|linkedin|twitter|x|youtube|tiktok|pinterest|snapchat|google|wikipedia|bing|qwant)\.(com|fr|org|net)$/,
  ],
  [
    'spam-pbn',
    /expireddomain|getwebsiteworth|dr\d+-links|pbn|backlink|directory\.(shop|pro)|wallpapers|kompromat|seodirectory|powerlink|betwinner|mirror|ahrefs-links|example\d|casino|bet\d+|xn--|guestpost|guest-post|sponsored|linkbuilding/,
  ],
  [
    'annuaire',
    /annuaire|pagesjaunes|118712|118000|hoodspot|cylex|justacote|infobel|kompass|societe\.com|pappers|infogreffe|horaires|petitfute|yelp|mappy|autour-de-moi|infonet|guide-|dechiffre|vunet|garagiste-france|mavilleenpoche|ciaovie|referencement|zecarrossery|allogarage|idgarages|vroomly|allovoisins|trustpilot|indeed|europages|nosavis|avis-verifies/,
  ],
  [
    'plateforme',
    /planity|fresha|doctolib|treatwell|tripadvisor|thefork|lafourchette|ubereats|deliveroo|carbu\.com|zagaz|leboncoin|lacentrale|autoscout24|paruvendu|aramisauto|booking|airbnb|amazon|cdiscount|shopify|wixsite|jimdosite|allocab|montransport|taxiproxi|itaxis|groupito|blablacar|kiwitaxi|taxi2airport|mytaxi|freenow/,
  ],
  [
    'presse',
    /lindependant|midilibre|ladepeche|francebleu|france3|francetvinfo|ouest-france|lefigaro|lemonde|20minutes|actu\.fr|journal|presse|gazette|news|magazine/,
  ],
  [
    'institution',
    /\.gouv\.fr$|mairie|ville-|\.cci\.|chambre|\.edu$|\.ac-|\.org$|aeroport|airport|tourisme|tourism|office-de|\.sncf$|garesetconnexions/,
  ],
  ['forum', /forum|reddit|quora|commentcamarche|jeuxvideo/],
  ['blog', /blog|wordpress|blogspot|over-blog|medium\.com|canalblog|jimdo|wix\.com/],
];

/** Enseignes et réseaux nationaux : visibles dans la SERP, hors comparaison. */
const RESEAUX =
  /(^|\.)(norauto|speedy|midas|feuvert|point-s|points|euromaster|vulco|carglass|mondialparebrise|franceparebrise|motrio|eurorepar|boschcarservice|ad\.fr|autodistribution|renault|peugeot|citroen|dacia|toyota|ford|volkswagen|bmw|mercedes-benz|audi|kia|hyundai|nissan|opel|fiat|seat|skoda|mcdonalds|dominos|pizzahut|kfc|burgerking|uber|bolt|heetch|g7|totalenergies|leclerc|carrefour|intermarche|auchan|super-u|lidl|nicolas|v-and-b|cavavin|carter-cash|firststop|first-stop|allopneus|re-fap|autosur|dekra|securitest|autovision|roady|siligom|profil-plus|1001pneus|123pneus|oscaro|mister-auto|yakarouler|autobacs|maxauto)\.(com|fr)$/;

export function classifyDomain(domain: string): DomainCategory {
  const d = domain.toLowerCase();
  for (const [category, re] of RULES) if (re.test(d)) return category;
  return 'autre';
}

/** Catégories qui comptent comme des liens « propres ». */
const CLEAN = new Set<DomainCategory>([
  'annuaire',
  'plateforme',
  'presse',
  'institution',
  'forum',
  'blog',
  'autre',
]);

/** Un lien propre : catégorie non toxique ET rang > 0 (un domaine de rang 0 n'a jamais été vu par personne). */
export function isCleanReferring(category: DomainCategory, rank: number): boolean {
  return CLEAN.has(category) && rank > 0;
}

/**
 * Comment traiter un domaine qui ranke sur nos requêtes :
 * `null` = ne pas proposer (réseau social, Google, Wikipédia),
 * sinon l'étiquette sous laquelle le proposer.
 */
export function serpDomainKind(domain: string): CompetitorKind | null {
  const d = domain.toLowerCase();
  if (RESEAUX.test(d)) return 'reseau';
  const category = classifyDomain(d);
  if (
    category === 'social' ||
    /(^|\.)(indeed|hellowork|welcometothejungle|pole-emploi|francetravail)\./.test(d)
  )
    return null;
  if (['annuaire', 'plateforme', 'forum', 'institution', 'presse'].includes(category)) return 'annuaire';
  return 'direct';
}

/** `https://www.Exemple.fr/page` → `exemple.fr`. */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split(':')[0];
}

/** Même domaine, sous-domaines compris (`blog.exemple.fr` appartient à `exemple.fr`). */
export function sameDomain(candidate: string, root: string): boolean {
  const c = normalizeDomain(candidate);
  const r = normalizeDomain(root);
  return c === r || c.endsWith(`.${r}`);
}
