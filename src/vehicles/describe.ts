import { runClaudeCli } from '../ai/claude-cli.js';
import type { SiteConfig } from '../../config/site-types.js';
import type { CarRecord } from './types.js';

/**
 * Description d'une fiche véhicule, rédigée par le Claude CLI à partir des
 * seuls faits connus, puis **validée par le vendeur** avant publication.
 *
 * Pourquoi : le 2026-09-03, 13 fiches Ideo Car sur 13 étaient « explorée, non
 * indexée » — toutes portaient le même gabarit de 150 caractères que le bot
 * produisait avec « auto ». Google n'indexe pas des fiches interchangeables.
 * Une description propre au véhicule (150 à 250 mots, trois paragraphes) est
 * la condition d'entrée dans l'index, pas un plus.
 *
 * Règle d'or : rien qui ne soit dans les faits. Les arguments du site sont
 * ceux vérifiés sur le site en ligne, pas ceux du profil marketing.
 */

interface SiteFacts {
  /** Ce que le site affirme déjà en ligne sur chaque fiche — vérifié, réutilisable. */
  arguments: string[];
  /** Où et comment voir la voiture. */
  visite: string;
  /** Ancrages géographiques utiles au texte (villes, axes, usages locaux). */
  territoire: string;
}

const SITE_FACTS: Record<string, SiteFacts> = {
  voitures: {
    arguments: [
      'véhicule contrôlé avant mise en vente',
      'essai sur rendez-vous',
      'reprise de votre ancien véhicule possible',
      'service mandataire pour trouver un modèle précis',
    ],
    visite: 'visible chez Ideo Car à Cabestany, à 10 minutes de Perpignan',
    territoire:
      'Cabestany, Perpignan et sa périphérie (Canet, Saint-Cyprien, Argelès), la plaine du Roussillon, les Pyrénées catalanes',
  },
  okaz: {
    arguments: [
      'visite sur rendez-vous',
      'reprise possible',
      'dépôt-vente proposé',
      'carte grise faite en agence',
    ],
    visite: 'visible chez Okaz Autos 66 à Saleilles, à 10 minutes de Perpignan',
    territoire:
      'Saleilles, Perpignan et sa périphérie, la plaine du Roussillon, le littoral et les Pyrénées catalanes',
  },
};

function factsFor(site: SiteConfig): SiteFacts {
  return (
    SITE_FACTS[site.key] ?? {
      arguments: [],
      visite: `visible chez ${site.name}${site.city ? ` à ${site.city}` : ''}`,
      territoire: site.city || 'Pyrénées-Orientales',
    }
  );
}

/** Nombre à la française avec une espace normale (toLocaleString pose une espace fine que Telegram et les tests lisent mal). */
const fr = (n: number): string => n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');

function carFactLines(car: CarRecord): string {
  const lines = [
    `Marque : ${car.marque}`,
    `Modèle : ${car.modele}`,
    `Année : ${car.annee}`,
    `Prix : ${fr(car.prix)} €`,
    `Kilométrage : ${fr(car.kilometrage)} km`,
    `Carburant : ${car.carburant}`,
    `Boîte : ${car.boiteVitesse}`,
  ];
  if (car.couleur) lines.push(`Couleur : ${car.couleur}`);
  if (car.chevaux) lines.push(`Motorisation / puissance : ${car.chevaux}`);
  if (car.portes) lines.push(`Portes : ${car.portes}`);
  if (car.equipements.length) lines.push(`Équipements : ${car.equipements.join(', ')}`);
  return lines.join('\n');
}

export interface DescribeInput {
  site: SiteConfig;
  car: CarRecord;
  /** Ce que le vendeur a dit de la voiture (entretien, historique, points forts). Vide = rien. */
  notes: string;
  /** Fiche vendue : le texte passe au passé et renvoie vers le parc disponible. */
  sold: boolean;
  /** Motif de refus du jet précédent, pour le second essai. */
  retryReason?: string;
}

export function buildDescriptionPrompt(input: DescribeInput): string {
  const { site, car, notes, sold } = input;
  const facts = factsFor(site);
  const nom = `${car.marque} ${car.modele} ${car.annee}`;

  const consignes = sold
    ? [
        `Ce véhicule a été VENDU par ${site.name}. Écris au passé : il « a été vendu », « était proposé à ».`,
        "Paragraphe 1 : la voiture telle qu'elle était (caractéristiques, équipements), au passé.",
        `Paragraphe 2 : pourquoi ce modèle est recherché dans le secteur (${facts.territoire}), en restant général.`,
        `Paragraphe 3 : dire clairement que ce véhicule n'est plus disponible, inviter à consulter les véhicules disponibles ou à appeler ${site.name} pour être prévenu d'un modèle équivalent. ${facts.arguments.length ? `Arguments réutilisables : ${facts.arguments.join(' ; ')}.` : ''}`,
      ]
    : [
        'Paragraphe 1 : la voiture elle-même — motorisation, boîte, couleur, kilométrage, prix, ce qui la distingue dans ses équipements.',
        `Paragraphe 2 : pourquoi ce modèle a du sens pour un acheteur du secteur (${facts.territoire}) : usage, consommation, fiabilité connue du modèle, habitabilité — sans chiffre inventé.`,
        `Paragraphe 3 : comment la voir — ${facts.visite}. ${facts.arguments.length ? `Arguments réutilisables (uniquement ceux-ci) : ${facts.arguments.join(' ; ')}.` : ''}`,
      ];

  return [
    `Rédige la description de la fiche « ${nom} » pour le site du vendeur ${site.name}.`,
    '',
    'FAITS SUR LE VÉHICULE (seule source autorisée) :',
    carFactLines(car),
    '',
    "CE QUE LE VENDEUR AJOUTE (à reprendre tel quel s'il y a quelque chose, sinon rien à inventer) :",
    notes.trim() || '(rien)',
    '',
    'CONSIGNES :',
    ...consignes.map((c) => `- ${c}`),
    "- 150 à 250 mots, en 3 paragraphes séparés par une ligne vide. Pas de titre, pas de liste, pas de gras, pas d'emoji.",
    "- Aucun fait absent de la liste : pas de garantie, contrôle technique, carnet d'entretien, première main, non-fumeur, révision, pneus, distribution, historique… sauf si le vendeur l'a écrit ci-dessus.",
    '- Pas de « pas cher », « affaire », « à saisir », « urgent », « dernier prix », « occasion en or ».',
    "- Ton direct et honnête, celui d'un vendeur qui décrit ce qu'il a sous les yeux. Pas de superlatifs.",
    `- Nomme le véhicule « ${nom} » dans la première phrase.`,
    '- Rends uniquement le texte de la description.',
    input.retryReason ? `\nLE JET PRÉCÉDENT A ÉTÉ REFUSÉ : ${input.retryReason}. Corrige ce point.` : '',
  ].join('\n');
}

/** Affirmations qui n'ont le droit d'apparaître que si le vendeur les a données. */
const CLAIMS: Array<{ label: string; re: RegExp }> = [
  { label: 'garantie', re: /garanti/i },
  { label: 'contrôle technique', re: /contr[ôo]le technique|\bCT\b/i },
  { label: "carnet d'entretien", re: /carnet/i },
  { label: 'première main', re: /premi[èe]re main/i },
  { label: 'non-fumeur', re: /non[- ]fumeur/i },
  { label: 'révision', re: /r[ée]vis/i },
  { label: 'pneus', re: /pneu/i },
  { label: 'distribution', re: /distribution/i },
  { label: 'embrayage', re: /embrayage/i },
  { label: 'historique', re: /historique/i },
  { label: 'accident', re: /accident/i },
  { label: 'facture', re: /facture/i },
];

const BANNED = /pas cher|affaire|à saisir|urgent|dernier prix|occasion en or/i;

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Vérifie un texte rendu par le CLI ; rend le motif de refus, ou null s'il passe. */
export function checkDescription(text: string, input: Pick<DescribeInput, 'car' | 'notes'>): string | null {
  const words = countWords(text);
  if (words < 120) return `trop court (${words} mots, minimum 150)`;
  if (words > 320) return `trop long (${words} mots, maximum 250)`;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length < 2) return 'un seul paragraphe, il en faut trois séparés par une ligne vide';
  if (/^\s*(#|[-*•]\s|\d+\.\s)/m.test(text)) return 'contient un titre ou une liste';
  if (/\*\*|__/.test(text)) return 'contient du gras markdown';
  const banned = text.match(BANNED);
  if (banned) return `expression interdite : « ${banned[0]} »`;
  const allowed = `${input.notes} ${input.car.equipements.join(' ')}`;
  for (const claim of CLAIMS) {
    if (claim.re.test(text) && !claim.re.test(allowed)) {
      return `affirmation non fournie par le vendeur : « ${claim.label} »`;
    }
  }
  return null;
}

/**
 * Rédige la description via le CLI, avec un second essai si le premier jet
 * viole une règle. Lève une erreur si les deux jets sont refusés ou si le CLI
 * ne répond pas : l'appelant propose alors la saisie manuelle.
 */
export async function generateDescription(input: DescribeInput): Promise<string> {
  let reason: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = (await runClaudeCli(buildDescriptionPrompt({ ...input, retryReason: reason })))
      .replace(/\r\n/g, '\n')
      .trim();
    reason = checkDescription(text, input) ?? undefined;
    if (!reason) return text;
  }
  throw new Error(`description refusée deux fois : ${reason}`);
}
