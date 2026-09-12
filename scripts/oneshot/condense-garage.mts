/**
 * Jetable — condense une révision v6 du garage à la recette FAP :
 * 5-6 sections courtes, blocs du gabarit (3 étapes, bloc pédagogique, CTA), géo maîtrisée.
 * Usage : npx tsx scripts/oneshot/condense-garage.mts <slug>   → écrit <scratch>/<slug>-v7.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { runClaudeCli } from '../../src/ai/claude-cli.js';
import { getSupabase } from '../../src/db/client.js';

const S = '/tmp/claude-1000/-home-ubuntu-sites-seo-automation/895e2515-e732-4241-8028-a3591712d85c/scratchpad';

const PLANS: Record<string, { h1: string; plan: string[] }> = {
  'entretien-voiture-perpignan': {
    h1: "Nomme l'entretien, la révision et la vidange.",
    plan: [
      'La révision constructeur chez un indépendant : garantie préservée, carnet tamponné, ce qu\'une révision contrôle et remplace.',
      'La vidange : huile conforme, filtre à huile, rythme selon carnet et usage, signes qu\'elle est en retard.',
      'Le pré-contrôle technique : nous préparons la voiture, le contrôle officiel se fait uniquement en centre agréé ; défauts fréquents ; « un vrai service ou un prétexte ? ».',
      'Quelle intervention selon votre échéance et vos repères (kilométrage, durée, voyants, trajets courts) — fusion des sections 4 et 5 de la matière.',
      'Comment ça se passe chez nous et comment juger un garage — fusion des sections 6 et 7.',
    ],
  },
  'amortisseurs-perpignan': {
    h1: 'Nomme les amortisseurs et le diagnostic gratuit.',
    plan: [
      'Les symptômes d\'amortisseurs usés (rebonds, roulis, bruit sourd, freinage allongé, usure des pneus).',
      'Pourquoi on remplace par paire sur un même essieu, et les pièces associées (coupelles, butées, ressorts, silentblocs).',
      'Notre diagnostic (essai routier, fuites, jeu des rotules) et ce que regarde le contrôle technique — fusion des sections 3 et 4.',
      'Quand s\'en soucier selon kilométrage, routes et charge, et jusqu\'où rouler en attendant — fusion des sections 5 et 6.',
      'Chez nous : diagnostic gratuit, de quoi dépend le devis, géométrie, gestes d\'un montage soigné — fusion des sections 7, 8 et 9.',
    ],
  },
  'freins-plaquettes-perpignan': {
    h1: 'Nomme les freins et les plaquettes.',
    plan: [
      'Les signes qui alertent et lesquels imposent de s\'arrêter (urgences acceptées sans rendez-vous).',
      'Plaquettes seules ou plaquettes et disques : sur quels critères trancher.',
      'Le liquide de frein : pourquoi il vieillit, la purge.',
      'Freinage et contrôle technique, et le devis freinage : ce qu\'il détaille — fusion des sections 4 et 5.',
      'Chez nous : du diagnostic gratuit au rodage, et les gestes d\'un freinage durable — fusion des sections 6 et 7.',
    ],
  },
  'embrayage-perpignan': {
    h1: 'Nomme l\'embrayage et le devis avant démontage.',
    plan: [
      'Reconnaître un embrayage en fin de vie, et peut-on encore rouler jusqu\'à l\'atelier — fusion des sections 1 et 2.',
      'Ce que contient un kit, le volant moteur bi-masse et la commande hydraulique — fusion des sections 3 et 4.',
      'Comment nous confirmons que l\'embrayage est en cause (essai sur route, test de patinage).',
      'Ce qui use un embrayage plus vite (ville, remorque, pied posé sur la pédale).',
      'Chez nous : devis écrit avant démontage, véhicule de prêt, et les signes d\'un embrayage bien remplacé — fusion des sections 6, 8 et 9.',
    ],
  },
  'courroie-distribution-perpignan': {
    h1: 'Nomme la courroie de distribution.',
    plan: [
      'Pourquoi la distribution est critique et les signes d\'une courroie fatiguée (bruit, fissures, fuite de la pompe à eau).',
      'Quand la remplacer : le carnet fixe un kilométrage et un nombre d\'années, courroie ou chaîne selon le moteur, usage qui accélère l\'usure.',
      'Le kit complet : courroie, galets, pompe à eau, courroie d\'accessoires — pourquoi tout remplacer ensemble.',
      'Chez nous : vérification de l\'échéance, devis détaillé gratuit, accord, calage, contrôle, véhicule de prêt selon disponibilité.',
      'Si elle casse : conséquences pour le moteur (sans chiffre), et comment juger un devis distribution.',
    ],
  },
  'injecteurs-perpignan': {
    h1: 'Reprend la formulation « réparation injecteur ».',
    plan: [
      'Ce que trahit un injecteur fatigué : les symptômes.',
      'Lequel est en cause : les contrôles avant toute décision.',
      'Nettoyage, reconditionnement ou injecteur neuf : le choix selon l\'état constaté.',
      'Ce qui use l\'injection (gazole, filtre, trajets courts) et les pannes voisines (FAP, EGR, turbo).',
      'Chez nous : diagnostic, devis, accord, et les gestes d\'une intervention bien menée — fusion des sections 5 et 6.',
    ],
  },
};

const slug = process.argv[2];
if (!slug || !PLANS[slug]) throw new Error('slug inconnu : ' + slug);
const P = PLANS[slug];
const sb = getSupabase();
const { data: rev } = await sb.from('seo_page_revisions').select('*').eq('site_key', 'garage').eq('slug', slug).eq('status', 'pending').single();
if (!rev) throw new Error('pas de révision pending pour ' + slug);
const { data: prof } = await sb.from('site_profiles').select('brand, phone').eq('site_key', 'garage').single();
const brand = prof!.brand as Record<string, unknown>;
const c = rev.content;

const sectionsTxt = (c.seoSections as { title: string; content: string }[])
  .map((s, i) => `## Section ${i + 1} — ${s.title}\n\n${s.content}`).join('\n\n');
const faqTxt = (c.faq as { question: string; answer: string }[])
  .map((f) => `Q : ${f.question}\nR : ${f.answer}`).join('\n\n');
const links = JSON.stringify(c.internalLinks);

const prompt = `Tu réécris une page de prestation d'un garage automobile indépendant de Perpignan, pour la rendre plus courte et plus lisible sans perdre ce qu'elle apporte au lecteur.

VOIX : ${brand.tone}. Personnalité : ${brand.personality}. Style d'appel : ${brand.ctaStyle}.
Mots à éviter : ${(brand.wordsToAvoid as string[]).join(', ')}.
Faits utilisables (et seulement ceux-là pour parler du garage) : ${(brand.uniqueSellingPoints as string[]).join(' · ')}. Téléphone : ${prof!.phone}.
INTERDITS ABSOLUS : aucun prix chiffré, aucun délai chiffré, aucun nombre de points de contrôle (pas de « 30 points »), aucune ancienneté, aucune personne nommée, aucun équipement non vérifié, aucune promesse de résultat au contrôle technique. Ne rien inventer qui ne soit pas dans la matière ci-dessous ou dans les faits utilisables.

RÈGLES DE GÉOGRAPHIE (strictes, le site répète déjà la ville dans son gabarit) :
- Le mot « Perpignan » apparaît UNE fois dans le H1, JAMAIS dans les titres de sections, JAMAIS dans la première phrase de l'intro, AU PLUS une fois par section, JAMAIS dans heroSubtitle, educationalTitle et ctaTitle.
- Aucun autre nom de lieu.

FORMAT ATTENDU : un objet JSON, rien d'autre (pas de balise de code, pas de commentaire), avec exactement ces clés :
{
  "h1": "10 mots maximum. ${P.h1} Perpignan une fois.",
  "metaTitle": "60 caractères maximum, contient Perpignan",
  "metaDescription": "155 caractères maximum, bénéfice concret, sans prix ni délai",
  "heroSubtitle": "12 mots maximum, une promesse concrète tirée des faits utilisables",
  "intro": "70 à 90 mots, un seul paragraphe. Première phrase = ce que couvre la page, du point de vue du lecteur. Se termine par une invitation à appeler avec le numéro.",
  "educationalTitle": "question courte (8 mots max) du type « Pourquoi … ? » ou « Quand … ? »",
  "educationalContent": "80 à 120 mots, un seul paragraphe, qui répond à la question avec les faits techniques de la matière",
  "process": [ { "icon": "un emoji", "title": "5 mots max", "description": "20 à 30 mots" }, … exactement 3 étapes : ce qui se passe quand le lecteur vient à l'atelier ],
  "ctaTitle": "10 mots maximum, appel direct",
  "seoSections": [ { "title": "10 mots maximum, sans Perpignan, sous forme de question ou d'affirmation utile", "content": "markdown : 200 à 250 mots, 1 ou 2 intertitres en ### et UNE liste à puces, paragraphes de 40 à 70 mots" }, … exactement 5 sections ],
  "faq": [ { "question": "…", "answer": "60 à 90 mots" }, … exactement 6 entrées ],
  "schemaService": { "name": "nom court de la prestation", "description": "une phrase" }
}

PLAN DES 5 SECTIONS (fusionne la matière, ne la recopie pas) :
${P.plan.map((l, i) => `${i + 1}. ${l}`).join('\n')}
Le corps (intro + 5 sections) fait 1 300 à 1 500 mots au total.
CONSERVE ces 3 liens internes en markdown, chacun dans la section où il est pertinent : ${links}.
FAQ : garde les ${Math.min(c.faq.length, 6)} questions de la matière (réponses resserrées à 60-90 mots)${c.faq.length < 6 ? ` et ajoute ${6 - c.faq.length} questions auxquelles la matière permet de répondre` : ''}.

MATIÈRE (version longue à condenser) :

H1 actuel : ${rev.h1}
Meta title actuel : ${rev.meta_title}
Meta description actuelle : ${rev.meta_description}

# Intro
${c.intro}

${sectionsTxt}

# FAQ
${faqTxt}
`;

writeFileSync(`${S}/${slug}-prompt.txt`, prompt);
console.log(`prompt ${prompt.split(/\s+/).length} mots — CLI en cours…`);
const t0 = Date.now();
const out = await runClaudeCli(prompt, { timeoutMs: 600_000 });
console.log(`CLI terminé en ${Math.round((Date.now() - t0) / 1000)} s`);
writeFileSync(`${S}/${slug}-raw.txt`, out);
const json = out.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
const parsed = JSON.parse(json);
parsed.internalLinks = c.internalLinks;
writeFileSync(`${S}/${slug}-v7.json`, JSON.stringify(parsed, null, 2));
console.log('OK →', `${S}/${slug}-v7.json`);
