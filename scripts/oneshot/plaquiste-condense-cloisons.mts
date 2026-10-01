/**
 * Plaquiste Perpignan (site_key plaquiste) — deux révisions PROPOSÉES (`pending`),
 * à relire et appliquer depuis l'historique de `/pages/[id]` du dashboard :
 *
 *  1. `prestations/cloison-placo-perpignan` condensée : la version publiée le
 *     2026-10-01 faisait 15 sections (4 300 mots) et aucune FAQ ; celle-ci suit la
 *     recette validée sur le garage (6 sections de 200-250 mots, intertitre + liste,
 *     Perpignan hors des H2 et de la 1re phrase) et retrouve une FAQ de 6 questions.
 *     Toute la matière vient de la page publiée : aucun prix, délai, garantie ni
 *     ancienneté ajoutés. Le site n'affichant pas de numéro, les « appelez-nous »
 *     deviennent « contactez-nous ».
 *  2. `prestations/isolation-interieure-perpignan` : même contenu, FAQ de 6
 *     questions ajoutée (la page n'en avait pas).
 *
 * Rien n'est écrit dans `seo_pages` : la page en ligne ne bouge pas tant que la
 * révision n'est pas appliquée. Simulation par défaut.
 *
 *   npx tsx scripts/oneshot/plaquiste-condense-cloisons.mts            # contrôle les règles
 *   npx tsx scripts/oneshot/plaquiste-condense-cloisons.mts --propose  # crée les révisions
 */
import { getSupabase } from '../../src/db/client.js';

const SITE = 'plaquiste';
const PROPOSE = process.argv.includes('--propose');

const L = {
  bandes: '/prestations/bandes-enduit-placo-perpignan',
  isolation: '/prestations/isolation-interieure-perpignan',
  plafond: '/prestations/faux-plafond-perpignan',
};

/* ── 1. Cloisons : version condensée ─────────────────────────────────────── */

const cloisons = {
  slug: 'prestations/cloison-placo-perpignan',
  h1: 'Cloisons placo à Perpignan : créer une pièce sans gros œuvre',
  metaTitle: 'Cloisons placo à Perpignan : pose et devis écrit',
  metaDescription:
    "Pose de cloisons placo à Perpignan et alentours : chambre, bureau, salle d'eau. Plaque adaptée, isolant, joints traités. Visite, métré et devis écrit.",
  intro: [
    "Une chambre qui manque, un bureau à fermer, un séjour trop grand à séparer : la cloison en plaques de plâtre crée une pièce sans toucher à la structure du logement. Nous posons des cloisons placo chez les particuliers à Perpignan et dans l'agglomération : ossature métallique, plaque adaptée à chaque pièce, isolant, joints traités. La cloison vous est rendue lisse, prête à peindre.",
    "Avant tout chantier, nous venons mesurer sur place et vous recevez un devis écrit. Décrivez-nous la pièce et ce que vous voulez en faire : nous convenons d'une visite.",
  ].join('\n\n'),
  seoSections: [
    {
      title: "Ce que comprend la pose d'une cloison sur ossature métallique",
      content: [
        "Une cloison sèche est un système complet : une ossature fixée au sol et au plafond, un isolant entre les montants, des plaques vissées des deux côtés, puis des joints traités. Chaque étape conditionne la suivante : un rail mal aligné se voit encore après la peinture.",
        "### Les gestes, dans l'ordre",
        [
          "1. **Le traçage** : l'emplacement est reporté au sol, puis au plafond, parfaitement à l'aplomb, au laser.",
          '2. **Les rails** : ces profilés en U sont fixés au sol et au plafond, sur une bande résiliente qui limite la transmission des vibrations.',
          '3. **Les montants** : emboîtés dans les rails tous les 60 cm, resserrés à 40 cm quand la cloison est haute ou doit recevoir du carrelage.',
          '4. **Les renforts** : posés avant de fermer, autour de la porte et là où vous accrocherez une charge.',
          "5. **L'isolant** : de la laine minérale glissée entre les montants, pour que la cloison ne résonne pas.",
          "6. **Les plaques** : des BA13 vissées sur chaque face, joints décalés d'un côté à l'autre, vis enfoncées juste sous le carton sans le déchirer.",
        ].join('\n'),
        '### La finition, comprise dans la pose',
        `Bandes, enduit en plusieurs passes, séchage, ponçage : la cloison n'est terminée qu'une fois ses joints invisibles. Nous réalisons nous-mêmes cette étape, détaillée sur notre page [bandes et enduit placo](${L.bandes}). Il vous reste la sous-couche et la peinture.`,
      ].join('\n\n'),
    },
    {
      title: 'Standard, hydrofuge, haute dureté, phonique : quelle plaque pour quelle pièce ?',
      content: [
        "La plaque se choisit d'après la pièce qu'elle ferme, et une même cloison peut en combiner deux : une face hydrofuge côté salle d'eau, une face standard côté chambre.",
        [
          '- **Plaque standard** : pour les pièces sèches et peu exposées aux chocs. Chambre, séjour, bureau, dressing.',
          "- **Plaque hydrofuge** : reconnaissable à sa couleur verte, elle résiste à l'humidité ambiante d'une salle de bains, d'une buanderie ou d'une cuisine.",
          "- **Plaque haute dureté** : plus dense, elle encaisse les coups de meuble, de jouet ou d'aspirateur. Elle se justifie dans un couloir, une entrée, une chambre d'enfant.",
          '- **Plaque phonique** : sa composition freine davantage le son. Nous la réservons aux cloisons entre deux chambres, ou entre un bureau et une pièce de vie.',
        ].join('\n'),
        '### La plaque ne fait pas tout',
        "Une plaque phonique vissée sur une ossature vide donnera un résultat décevant. Le confort acoustique vient de l'ensemble : isolant entre les montants, bande résiliente sous les rails, jonctions soignées avec les murs et le plafond, prises décalées d'une face à l'autre plutôt que dos à dos.",
        `De même, la plaque hydrofuge ne remplace pas l'étanchéité d'une douche : derrière le carrelage d'une zone arrosée, il faut un système d'étanchéité à part. Et quand la nouvelle cloison longe une façade froide, c'est un doublage isolant qu'il faut prévoir : voir notre page [isolation intérieure](${L.isolation}).`,
        "À la visite, nous regardons l'usage réel de chaque pièce. Le type de plaque retenu est écrit sur le devis.",
      ].join('\n\n'),
    },
    {
      title: 'Porte, prises, charges lourdes : ce qui se décide avant de fermer',
      content: [
        "Une cloison sèche est creuse. C'est ce qui la rend légère et rapide à monter, et c'est ce qui oblige à prévoir son usage avant la pose des plaques. Ajouter une prise ou un renfort après coup oblige à rouvrir, puis à reprendre les joints.",
        '### Trois décisions à prendre à la visite',
        [
          "- **La porte** : sa largeur, son sens d'ouverture et son type se fixent avant le montage. L'ouverture est encadrée par des montants renforcés ; sans eux, le bâti travaille à chaque fermeture et une fissure part du coin. Une porte à galandage se prévoit elle aussi dès le départ.",
          "- **L'électricité** : prises, interrupteurs et points lumineux passent par des gaines glissées entre les montants, et les boîtiers sont encastrés dans les plaques. Nous laissons les passages et les réservations ; le raccordement relève de votre électricien.",
          '- **Les charges** : une plaque seule porte des cadres et des objets légers avec des chevilles adaptées. Pour un meuble haut, un lave-mains ou un écran mural, nous plaçons un renfort dans la cloison, à la bonne hauteur.',
        ].join('\n'),
        "### Ce qu'une cloison placo ne fait pas",
        "Elle ne porte rien et ne remplace ni un mur porteur ni une paroi extérieure : ouvrir un mur porteur relève d'un bureau d'études et d'un maçon. Sur un plancher bois ancien, elle reste possible, avec une fixation adaptée aux mouvements du support. Si la cloison n'est pas la bonne réponse, nous vous le disons à la visite.",
      ].join('\n\n'),
    },
    {
      title: 'Combien coûte une cloison placo ? Ce qui fait varier le devis',
      content: [
        "Nous ne publions pas de prix au mètre carré : deux cloisons de même longueur peuvent demander un travail très différent. Un chiffre trouvé sur internet ignore votre hauteur sous plafond, l'état du sol ou la porte à intégrer. Le montant juste sort du métré.",
        '### Ce qui pèse sur le prix',
        [
          '- **La surface** : longueur par hauteur. Une grande hauteur demande plus de matériaux et parfois un échafaudage roulant.',
          "- **Le type de plaque** : hydrofuge, haute dureté et phonique coûtent plus qu'une plaque standard.",
          "- **L'isolant** : du matériau et du temps de pose en plus.",
          '- **La porte** : ouverture, renforts et pose du bloc-porte forment un poste à part.',
          '- **Les renforts et les passages** : charges lourdes, gaines, angles et retours.',
          "- **Le support** : un sol irrégulier ou un plafond qui n'est pas de niveau demande des ajustements.",
          "- **L'accès** : étage sans ascenseur, rue étroite, stationnement difficile pour décharger.",
        ].join('\n'),
        "### Ce qu'un devis sérieux détaille",
        "Un devis qui tient en une ligne, « fourniture et pose cloison », laisse trop de place à l'interprétation. Le nôtre reprend les surfaces mesurées, l'ossature, le type de plaque de chaque face, l'isolant, la porte et les renforts, la finition des joints, la protection du chantier et le nettoyage. Vous pouvez ainsi comparer plusieurs propositions sur une base claire. Si une ligne vous semble floue, demandez-nous de la reformuler avant de signer.",
      ].join('\n\n'),
    },
    {
      title: 'De la visite à la livraison : le déroulé du chantier',
      content: [
        'Rien ne commence avant que vous ayez accepté le devis. Le chantier suit toujours le même ordre :',
        [
          '1. **Le premier contact** : vous décrivez la pièce, ce que vous voulez créer, la longueur approximative et votre commune.',
          "2. **La visite et le métré** : nous mesurons, nous regardons le sol, les murs, le plafond et l'accès.",
          '3. **Le devis écrit** : chaque poste y figure. Vous prenez le temps de le lire.',
          '4. **La protection** : sols, meubles proches et passage des plaques sont couverts avant tout perçage.',
          '5. **La pose** : ossature, renforts, isolant, plaques.',
          '6. **Les joints** : bandes, enduit, séchage entre les passes, ponçage.',
          '7. **La livraison** : chutes évacuées, poussière aspirée, cloison prête à peindre.',
        ].join('\n'),
        '### Dans un logement occupé',
        'La plupart des cloisons se posent dans des logements habités. Il suffit de libérer la zone de travail et un passage pour les plaques ; nous vous indiquons à la visite quels meubles déplacer. La poussière vient surtout du ponçage : promettre un chantier sans poussière serait mentir, mais un chantier protégé et nettoyé chaque jour reste vivable.',
        '### Ce qui rythme la durée',
        `L'ossature et les plaques se montent vite. La finition suit le séchage de l'enduit, qui varie avec la température et l'humidité de la pièce : un enduit poncé trop tôt se creuse, puis fissure. Quand le projet demande aussi de refermer le volume par le haut, le [faux plafond](${L.plafond}) se chiffre dans le même devis.`,
      ].join('\n\n'),
    },
    {
      title: 'Fissures, cloison qui sonne creux : ce qui fait une pose durable',
      content: [
        "Une fissure qui apparaît des mois après la pose vient presque toujours de l'ossature ou des raccords, rarement de l'enduit seul.",
        '### Les zones sensibles, et ce que nous y faisons',
        [
          "- **Les angles de porte** : nous renforçons l'encadrement et nous décalons les joints de plaques, pour qu'aucun ne parte exactement du coin de l'ouverture.",
          '- **La jonction avec le plafond** : un plancher bois ou un plafond ancien bouge avec les saisons. Le raccord doit garder une légère liberté de mouvement.',
          '- **La jonction avec un mur existant** : plâtre et maçonnerie ne travaillent pas de la même façon, le traitement du joint en tient compte.',
          '- **Les grandes longueurs** : une cloison très longue se dilate ; elle demande parfois un joint de fractionnement.',
          '- **Le vide entre les plaques** : sans isolant, la cloison fait caisse de résonance. La laine minérale est le geste le plus efficace entre deux chambres.',
        ].join('\n'),
        '### Les contrôles à faire à la livraison',
        "Une malfaçon se repère mieux avant la peinture qu'après. Ces vérifications se font sans outil :",
        [
          "- éclairez la cloison en lumière rasante : bosses, creux et surépaisseurs d'enduit apparaissent aussitôt ;",
          '- cherchez les têtes de vis : elles doivent être invisibles ;',
          '- passez la main à plat sur les joints : aucune marche entre la bande et la plaque ;',
          '- frappez à plusieurs hauteurs : le son doit être homogène ;',
          '- ouvrez et fermez la porte : elle ne doit ni frotter ni faire vibrer la cloison.',
        ].join('\n'),
      ].join('\n\n'),
    },
  ],
  highlights: [
    'Visite sur place avec métré, puis devis écrit avant tout chantier',
    'Plaque choisie pièce par pièce : standard, hydrofuge, haute dureté, phonique',
    'Chantier protégé pendant les travaux et nettoyé à la fin',
    "Cloison livrée prête à peindre, à Perpignan et dans l'agglomération",
  ],
  faq: [
    {
      question: 'Combien coûte une cloison en placo ?',
      answer:
        "Le prix dépend de la surface, de la hauteur sous plafond, du type de plaque, de l'isolant, de la présence d'une porte, des renforts et de l'accès au chantier. Nous ne donnons pas de prix sans avoir vu les lieux : nous mesurons sur place, et le devis écrit détaille chaque poste avant tout chantier.",
    },
    {
      question: 'Combien de temps faut-il pour poser une cloison ?',
      answer:
        "Le montage de l'ossature et des plaques va vite. Ce sont les passes d'enduit et leur séchage qui rythment le chantier, et ce séchage dépend de la température et de l'humidité de la pièce. La durée prévue pour votre cloison est indiquée avec le devis, après la visite.",
    },
    {
      question: 'Intervenez-vous pour une seule cloison ?',
      answer:
        "Oui. Une cloison seule suit le même parcours qu'un chantier plus étendu : visite, métré, devis écrit, pose et finition. Elle demande même plus de soin qu'on ne le croit : elle se voit en entier, souvent en lumière rasante, et se raccorde à des murs et à un plafond existants rarement droits.",
    },
    {
      question: 'Peut-on fixer un meuble lourd ou une télévision sur une cloison placo ?',
      answer:
        "Oui, à condition de le prévoir. Nous posons un renfort dans l'ossature aux endroits que vous nous indiquez à la visite : meuble haut, lave-mains, écran mural. Sur une cloison déjà fermée, des chevilles adaptées aux plaques conviennent pour des cadres et des charges légères.",
    },
    {
      question: 'Une cloison placo isole-t-elle du bruit ?',
      answer:
        "Elle améliore nettement le confort entre deux pièces d'un même logement si elle est conçue pour cela : isolant entre les montants, plaque phonique, jonctions soignées. Elle ne supprime pas tous les bruits : le son passe aussi par le plafond, le sol, les portes et les gaines. Si la gêne vient d'un voisin, le traitement est plus complet et s'étudie sur place.",
    },
    {
      question: 'Faut-il une autorisation pour créer une cloison ?',
      answer:
        "Une cloison intérieure ne touche ni à la structure ni à la façade : en règle générale, elle ne demande pas d'autorisation d'urbanisme. En copropriété, relisez votre règlement, qui peut prévoir d'informer le syndic. Si vous êtes locataire, l'accord écrit du propriétaire est nécessaire.",
    },
  ],
  internalLinks: [
    { url: L.bandes, anchor: 'Bandes et enduit placo', context: 'Joints, bandes, enduit, ponçage : des murs lisses, prêts à peindre.' },
    { url: L.isolation, anchor: 'Isolation intérieure', context: 'Doublage des murs, pour le confort thermique et phonique.' },
    { url: L.plafond, anchor: 'Faux plafonds', context: 'Plafond suspendu, rampant ou décaissé, livré prêt à peindre.' },
  ],
};

/* ── 2. Isolation : la FAQ qui manquait ──────────────────────────────────── */

const isolationFaq = [
  {
    question: "Combien coûte une isolation des murs par l'intérieur ?",
    answer:
      "Le prix dépend de l'état du mur, de la technique (complexe collé ou ossature métallique), de l'épaisseur d'isolant, du nombre de fenêtres à habiller, des radiateurs et des prises à déplacer et du type de plaque. Nous ne publions pas de prix au mètre carré : le devis écrit, remis après la visite et le métré, détaille chaque poste.",
  },
  {
    question: "Combien d'épaisseur perd-on en isolant un mur par l'intérieur ?",
    answer:
      "Le mur avance de l'épaisseur de l'isolant, de l'ossature éventuelle et de la plaque. Un complexe collé prend moins de place qu'un doublage sur ossature, mais il demande un mur sain et assez plan. Nous mesurons à la visite la surface qui restera, pièce par pièce, avant de vous proposer une solution.",
  },
  {
    question: 'Doublage collé ou sur ossature métallique : lequel choisir ?',
    answer:
      "Le complexe collé convient à un mur sec, sain et assez plan ; il est plus mince. L'ossature métallique rattrape un mur irrégulier et laisse passer les gaines électriques, au prix d'un peu plus d'épaisseur. C'est l'état du support, vu sur place, qui décide.",
  },
  {
    question: "Peut-on isoler par l'intérieur un mur humide ?",
    answer:
      "Pas avant d'avoir traité la cause. Enfermer derrière un isolant un mur qui remonte de l'humidité ou subit une infiltration cache le problème et l'aggrave : l'isolant se mouille et des moisissures peuvent se développer derrière la plaque. Nous vous orientons d'abord vers le bon corps de métier, et nous revenons ensuite.",
  },
  {
    question: "Un doublage isolant protège-t-il de la chaleur l'été ?",
    answer:
      "Il freine la chaleur qui traverse les murs exposés au sud et à l'ouest. Mais la chaleur entre aussi par la toiture, les fenêtres et les fuites d'air : un mur doublé ne rafraîchit pas une maison à lui seul. Sous toiture, c'est souvent le plafond qu'il faut traiter en premier, avec des volets fermés aux heures chaudes et une ventilation la nuit.",
  },
  {
    question: 'Peut-on rester dans le logement pendant les travaux ?',
    answer:
      "Souvent oui, quand les pièces sont traitées l'une après l'autre. La pièce concernée doit être vidée, ou ses meubles regroupés au centre. Les sols sont protégés, le chantier est nettoyé, et le mur vous est rendu prêt à peindre. Nous organisons l'ordre des pièces avec vous à la visite.",
  },
];

/* ── Règles (recette garage du 2026-09-12, adaptée au gabarit générique) ── */

const w = (s: string) => s.split(/\s+/).filter(Boolean).length;
const perp = (s: string) => (s.replace(/\]\([^)]*\)/g, ']').match(/perpignan/gi) ?? []).length;
const ko: string[] = [];
const chk = (ok: boolean, msg: string) => {
  if (!ok) ko.push(msg);
};

chk(perp(cloisons.h1) === 1, 'h1 : Perpignan doit y être une fois');
chk(cloisons.metaTitle.length <= 60, `metaTitle ${cloisons.metaTitle.length} > 60`);
chk(cloisons.metaDescription.length <= 155, `metaDescription ${cloisons.metaDescription.length} > 155`);
chk(!/perpignan/i.test(cloisons.intro.split(/(?<=[.!?:])\s/)[0]), 'intro : Perpignan dans la 1re phrase');
chk(perp(cloisons.intro) <= 1, `intro : Perpignan ×${perp(cloisons.intro)}`);
chk(cloisons.seoSections.length >= 5 && cloisons.seoSections.length <= 6, `sections ${cloisons.seoSections.length}`);
let body = w(cloisons.intro);
for (const s of cloisons.seoSections) {
  const n = w(s.content);
  body += n;
  chk(n >= 190 && n <= 270, `section « ${s.title} » : ${n} mots hors 190-270`);
  chk(perp(s.title) === 0, `H2 avec Perpignan : ${s.title}`);
  chk(w(s.title) <= 12, `H2 ${w(s.title)} mots : ${s.title}`);
  chk(perp(s.content) <= 1, `section « ${s.title} » : Perpignan ×${perp(s.content)}`);
  chk(/^###\s/m.test(s.content), `section « ${s.title} » sans intertitre`);
  chk(/^(-|\d+\.)\s/m.test(s.content), `section « ${s.title} » sans liste`);
}
chk(body >= 1250 && body <= 1550, `corps ${body} mots hors 1 250-1 550`);
for (const [label, faq] of [
  ['cloisons', cloisons.faq],
  ['isolation', isolationFaq],
] as const) {
  chk(faq.length === 6, `FAQ ${label} : ${faq.length} questions`);
  for (const f of faq) chk(w(f.answer) >= 35 && w(f.answer) <= 75, `FAQ ${label} « ${f.question} » : ${w(f.answer)} mots`);
}
const all = JSON.stringify({ cloisons, isolationFaq });
chk(!/\d+\s?(€|euros?)/i.test(all), 'prix chiffré');
chk(!/\bans d.exp/i.test(all), 'ancienneté');
chk(!/\b(sous|en)\s\d+\s?(h|min|heures?|minutes?|jours?)\b/i.test(all), 'délai chiffré');
chk(!/appele[zr]|téléphone|gratuit|décennale|\bRGE\b|Qualibat|MaPrimeRénov|\bprime\b|\bavis\b/i.test(all), 'mot interdit (appel, gratuit, décennale, RGE, prime, avis…)');
chk(!all.includes('—'), 'tiret cadratin');
for (const l of cloisons.internalLinks) chk(all.includes(`](${l.url})`), `lien du bas absent du corps : ${l.url}`);

const sb = getSupabase();
const { data: published } = await sb.from('seo_pages').select('slug').eq('site_key', SITE).eq('status', 'published');
const live = new Set((published ?? []).map((p) => `/${p.slug}`));
for (const url of all.match(/\/prestations\/[a-z0-9-]+/g) ?? []) chk(live.has(url), `lien vers une page non publiée : ${url}`);

const faqWords = (faq: { question: string; answer: string }[]) => faq.reduce((n, f) => n + w(f.question) + w(f.answer), 0);
console.log(
  `cloisons : corps ${body} mots · ${cloisons.seoSections.length} sections (${cloisons.seoSections.map((s) => w(s.content)).join('/')}) · FAQ ${cloisons.faq.length} (${faqWords(cloisons.faq)} mots) · title ${cloisons.metaTitle.length} · meta ${cloisons.metaDescription.length}`,
);
console.log(`isolation : FAQ ${isolationFaq.length} questions (${faqWords(isolationFaq)} mots)`);
if (ko.length) {
  console.log(`KO :\n - ${ko.join('\n - ')}`);
  process.exit(1);
}
console.log('OK — toutes les règles passent');
if (!PROPOSE) {
  console.log('Simulation — relancer avec --propose pour créer les révisions.');
  process.exit(0);
}

/* ── Révisions proposées ─────────────────────────────────────────────────── */

async function propose(
  slug: string,
  reason: string,
  build: (page: { h1: string; meta_title: string; meta_description: string; content: Record<string, unknown> }) => {
    h1: string;
    meta_title: string;
    meta_description: string;
    content: Record<string, unknown>;
  },
) {
  const { data: page, error } = await sb
    .from('seo_pages')
    .select('id, version, h1, meta_title, meta_description, content, schema_org')
    .eq('site_key', SITE)
    .eq('slug', slug)
    .single();
  if (error || !page) throw new Error(`${slug} : ${error?.message ?? 'page introuvable'}`);

  const { data: open } = await sb.from('seo_page_revisions').select('id, revision_number').eq('page_id', page.id).eq('status', 'pending');
  const { data: last } = await sb
    .from('seo_page_revisions')
    .select('revision_number')
    .eq('page_id', page.id)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = build(page as never);
  const { data: rev, error: e } = await sb
    .from('seo_page_revisions')
    .insert({
      page_id: page.id,
      revision_number: (last?.revision_number ?? 0) + 1,
      page_version: page.version,
      site_key: SITE,
      slug,
      ...next,
      schema_org: page.schema_org,
      status: 'pending',
      change_reason: reason,
      change_author: 'claude',
    })
    .select('id, revision_number')
    .single();
  if (e) throw new Error(`${slug} : ${e.message}`);
  for (const o of open ?? []) await sb.from('seo_page_revisions').update({ status: 'superseded' }).eq('id', o.id);
  console.log(`${slug} : révision v${rev.revision_number} proposée (page ${page.id})${open?.length ? `, ${open.length} ancienne(s) proposition(s) remplacée(s)` : ''}`);
}

const today = new Date().toISOString().slice(0, 10);

await propose(cloisons.slug, 'condensation : 15 sections → 6 (recette garage), FAQ de 6 questions rétablie, 3 liens internes', (page) => ({
  h1: cloisons.h1,
  meta_title: cloisons.metaTitle,
  meta_description: cloisons.metaDescription,
  content: {
    ...page.content,
    intro: cloisons.intro,
    seoSections: cloisons.seoSections,
    highlights: cloisons.highlights,
    faq: cloisons.faq,
    internalLinks: cloisons.internalLinks,
    updatedDate: today,
  },
}));

await propose('prestations/isolation-interieure-perpignan', 'FAQ de 6 questions ajoutée (la page n’en avait pas), corps inchangé', (page) => ({
  h1: page.h1,
  meta_title: page.meta_title,
  meta_description: page.meta_description,
  content: { ...page.content, faq: isolationFaq, updatedDate: today },
}));
