/**
 * 6 articles de la rubrique Conseils du site Noïa Event (site_key noia), slug
 * `conseils/…`, page_type `article`, statut `draft`. Le site liste sur /conseils
 * toute page CMS dont le slug commence par `conseils/` (app/conseils/page.tsx) ;
 * l'article est rendu par CmsArticle (hero + sommaire + sections markdown + points
 * clés + FAQ + liens), éditable par la cliente dans /admin.
 *
 * Sujets choisis le 2026-10-09 sur DataForSEO (France) + lecture des SERP :
 * requêtes où des wedding planners indépendantes rankent (prix, rétroplanning,
 * budget), sujets locaux (lieux de mariage autour de Perpignan, team building
 * dans le 66) et tendances 2027. Ordre de publication = ordre du tableau.
 *
 * Faits : règles du profil `site_profiles.noia` — on parle en « nous » (Kalya et
 * Nassim), jamais de tarif Noïa (tout est « sur devis », premier rendez-vous et
 * devis gratuits), aucune preuve chiffrée inventée. Les fourchettes de prix sont
 * des ordres de grandeur du marché français, présentées comme telles — à valider
 * par Kalya avant publication, ainsi que les lieux cités.
 *
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-noia-conseils.mts            # écrit
 *   npx tsx scripts/oneshot/seed-noia-conseils.mts --check    # longueurs seulement
 */
import { getSupabase } from "../../src/db/client";

const SITE = "noia";
const CONTACT = {
  url: "/contact",
  anchor: "Parler de votre projet",
  context: "Premier rendez-vous et devis gratuits, par téléphone, WhatsApp ou email.",
};
const L = {
  mariage: {
    url: "/prestations/organisation-mariage-perpignan",
    anchor: "Organisation de mariage à Perpignan",
    context: "Clé en main, accompagnement partiel ou coordination jour J : trois formules, un devis.",
  },
  jourJ: {
    url: "/prestations/coordination-jour-j-perpignan",
    anchor: "Coordination jour J",
    context: "Vous avez tout préparé, on orchestre la journée minute par minute.",
  },
  deco: {
    url: "/prestations/wedding-designer-decoration-mariage-perpignan",
    anchor: "Décoration & scénographie de mariage",
    context: "Une direction artistique cohérente, du faire-part au dessert.",
  },
  pro: {
    url: "/prestations/evenementiel-professionnel-perpignan",
    anchor: "Événementiel professionnel à Perpignan",
    context: "Séminaires, soirées d'entreprise, team building, inaugurations.",
  },
  prive: {
    url: "/prestations/evenements-prives-perpignan",
    anchor: "Événements privés",
    context: "Anniversaires, EVJF, baptêmes, fiançailles : vous restez du côté des invités.",
  },
  partenaires: {
    url: "/partenaires",
    anchor: "Nos partenaires",
    context: "Robe, traiteur, pâtisserie, coiffure, lieux et véhicules : le réseau avec lequel on travaille.",
  },
};
const A = {
  prix: { url: "/conseils/prix-wedding-planner", anchor: "Prix d'un wedding planner : formules et tarifs", context: "Ce que coûte un accompagnement, formule par formule, et ce qui fait varier le devis." },
  lieux: { url: "/conseils/lieux-de-mariage-perpignan", anchor: "Les lieux de mariage autour de Perpignan", context: "Mas, domaines viticoles, bord de mer, salles : comment choisir dans les Pyrénées-Orientales." },
  tendances: { url: "/conseils/tendances-mariage-2027", anchor: "Tendances mariage 2027", context: "Thèmes, couleurs, formats et déco : ce que l'on voit arriver." },
  retro: { url: "/conseils/retroplanning-mariage", anchor: "Rétroplanning de mariage : les 12 mois avant le jour J", context: "Quoi réserver quand, mois par mois, pour ne rien subir." },
  budget: { url: "/conseils/budget-mariage", anchor: "Budget mariage : combien coûte un mariage et comment le répartir", context: "Les ordres de grandeur, la répartition par poste et les arbitrages qui comptent." },
  team: { url: "/conseils/team-building-pyrenees-orientales", anchor: "Team building dans les Pyrénées-Orientales", context: "Mer, vignes, montagne, ville : des idées qui tiennent la route pour une équipe." },
};

type Img = { src: string; alt: string; width: number; height: number };
const hero = (file: string, alt: string): Img => ({ src: `/images/conseils/${file}.jpg`, alt, width: 1600, height: 1200 });
const wide = (file: string, alt: string): Img => ({ src: `/images/conseils/${file}.jpg`, alt, width: 1280, height: 720 });

type Section = { title: string; content: string; image?: Img };
type Article = {
  order: number;
  slug: string;
  heroImage: Img;
  h1: string;
  meta_title: string;
  meta_description: string;
  main_keyword: string;
  secondary_keywords: string[];
  card: { title: string; tagline: string; description: string; badges: string[]; featured: boolean };
  intro: string;
  sections: Section[];
  highlights: string[];
  faq: { question: string; answer: string }[];
  links: { url: string; anchor: string; context?: string }[];
};

const articles: Article[] = [
  // ───────────────────────────── 1. Prix d'un wedding planner ─────────────────────────────
  {
    order: 1,
    slug: "conseils/prix-wedding-planner",
    heroImage: hero("prix-wedding-planner-papeterie", "Faire-part, alliances et accessoires de mariage posés à plat sur une table claire"),
    h1: "Prix d'un wedding planner : formules, tarifs et ce qui fait varier le devis",
    meta_title: "Prix d'un wedding planner : tarifs et formules | Noïa Event",
    meta_description:
      "Coordination jour J, accompagnement partiel ou organisation complète : les ordres de grandeur du marché, ce qui est compris et ce qui fait varier le prix.",
    main_keyword: "prix wedding planner",
    secondary_keywords: ["tarif wedding planner", "combien coûte un wedding planner", "wedding planner prix", "coordinateur jour j mariage"],
    card: {
      title: "Prix d'un wedding planner",
      tagline: "Trois formules, trois niveaux de budget : ce que chacune comprend",
      description: "Les ordres de grandeur du marché français formule par formule, ce qui est compris dans le prix, ce qui le fait monter, et comment lire un devis.",
      badges: [],
      featured: false,
    },
    intro:
      "« Combien coûte un wedding planner ? » est la première question que l'on nous pose, souvent avant même « que faites-vous exactement ? ». Et la réponse honnête commence par une autre question : de quel accompagnement avez-vous besoin ? Une coordination du jour J et une organisation complète sur dix-huit mois n'ont ni le même contenu, ni le même prix.\n\nCet article donne les ordres de grandeur pratiqués en France, formule par formule, et détaille ce qui fait varier un devis. Chez Noïa Event, nos prestations sont chiffrées sur devis, après un premier rendez-vous gratuit : les chiffres ci-dessous sont ceux du marché, pas une grille tarifaire.",
    sections: [
      {
        title: "Trois formules, trois niveaux d'accompagnement",
        content:
          "La quasi-totalité des wedding planners en France proposent trois niveaux d'intervention, parfois sous des noms différents. C'est la première chose à clarifier, parce que c'est elle qui détermine l'essentiel du prix.\n\n- **La coordination jour J** : vous avez tout organisé vous-même, le wedding planner reprend le dossier dans les dernières semaines, vérifie les contrats, rédige la feuille de route et orchestre la journée. C'est la formule la plus accessible.\n- **L'accompagnement partiel** : vous avancez seuls, mais avec un cadrage du budget et du rétroplanning, des recommandations de prestataires et des points réguliers. La coordination du jour J est en général incluse.\n- **L'organisation complète, dite clé en main** : de la première idée au dernier invité. Concept, budget détaillé, recherche du lieu et des prestataires, contrats, direction artistique, coordination complète.\n\nChez nous, ce sont exactement [ces trois formules](/prestations/organisation-mariage-perpignan). Choisir la bonne, c'est répondre à une question simple : qu'est-ce que vous voulez porter vous-mêmes, et qu'est-ce que vous voulez déléguer ?",
      },
      {
        title: "Les ordres de grandeur du marché français",
        content:
          "Les fourchettes ci-dessous rassemblent ce que l'on observe chez les professionnels en France. Elles sont volontairement larges : une agence parisienne et un duo indépendant du Sud n'ont ni les mêmes charges, ni les mêmes mariages. Elles ne sont pas nos tarifs.\n\n| Formule | Ordre de grandeur (marché) | Ce que cela recouvre |\n| --- | --- | --- |\n| Coordination jour J | 800 à 2 000 € | Points de calage, feuille de route, régie du jour, gestion des imprévus |\n| Accompagnement partiel | 1 500 à 4 000 € | Cadrage, budget, rétroplanning, prestataires ciblés, jour J inclus |\n| Organisation complète | 3 000 à 8 000 € et au-delà | Tout, du concept à la coordination ; parfois un pourcentage du budget |\n\nDeux modes de facturation coexistent pour l'organisation complète : le forfait, fixé au devis, et le pourcentage du budget global, souvent entre 10 et 15 %. Le forfait a un avantage net pour vous : il ne grandit pas quand votre budget grandit. Nous travaillons au forfait, établi sur devis, avec un budget suivi en toute transparence et sans commission cachée.",
        image: wide("prix-wedding-planner-programme", "Mains tenant un programme de cérémonie de mariage imprimé sur papier épais"),
      },
      {
        title: "Ce qui fait monter ou baisser le prix",
        content:
          "À formule égale, le devis bouge selon quelques variables que l'on peut nommer.\n\n- **Le nombre d'invités** : 60 ou 180 personnes, ce n'est pas le même nombre de prestataires, de navettes, de tables, ni le même temps de coordination.\n- **Le nombre de temps forts** : une cérémonie laïque, un cocktail, un dîner, une soirée et un brunch le lendemain font cinq séquences à orchestrer, pas une.\n- **Le lieu** : un domaine qui fournit tout et une propriété familiale où tout doit être apporté, de la vaisselle aux sanitaires, ne demandent pas le même travail.\n- **Le délai** : un mariage à préparer en quatre mois concentre le même travail sur moins de temps.\n- **La décoration** : si la scénographie est conçue et installée par le wedding planner, elle est chiffrée à part ou intégrée à la formule, mais elle compte.\n- **Les déplacements** : un mariage à deux heures de route implique des visites et des repérages supplémentaires.\n\nUn bon devis nomme ces variables. Un devis flou sur ce qu'il comprend finira par coûter plus cher, en suppléments ou en déception.",
      },
      {
        title: "Ce qui est compris, et ce qui ne l'est jamais",
        content:
          "Le prix d'un wedding planner rémunère un travail : du temps, un réseau, une méthode. Il ne comprend pas les prestations elles-mêmes. C'est une confusion fréquente, et elle fausse toutes les comparaisons.\n\n**Compris dans l'accompagnement**, selon la formule : les rendez-vous, la conception, la recherche et la mise en concurrence des prestataires, la gestion des contrats, le suivi du budget, la feuille de route, la présence le jour J.\n\n**Jamais compris** : le lieu, le traiteur, le photographe, la robe, les fleurs, le DJ, la location de mobilier. Ce sont des factures distinctes, réglées aux prestataires. Le wedding planner les négocie, les coordonne et les suit, il ne les absorbe pas.\n\nUne question à poser dès le premier rendez-vous : « touchez-vous des commissions des prestataires que vous recommandez ? ». Chez nous, la réponse est non. Les remises que nos partenaires accordent aux couples qui passent par nous leur reviennent, c'est écrit sur [notre page partenaires](/partenaires).",
      },
      {
        title: "Est-ce que ça vaut le prix ? Les trois cas où oui",
        content:
          "Un wedding planner n'est pas indispensable à tous les mariages. Il devient rentable, au sens propre, dans trois situations.\n\n1. **Vous vous mariez loin de chez vous.** Chercher un mas dans les Albères depuis Lyon ou Paris, visiter, comparer des traiteurs, suivre un chantier déco à distance : sans quelqu'un sur place, c'est des week-ends et des trajets qui coûtent cher.\n2. **Vous avez un budget à tenir.** La connaissance des prix réels, la mise en concurrence et la négociation permettent souvent de compenser une partie des honoraires. On n'ose pas promettre un chiffre, mais c'est le cas sur la plupart des dossiers.\n3. **Vous voulez vivre votre journée.** Un mariage organisé par le couple se termine souvent par le couple qui gère : le retard du traiteur, le plan de table, les clés de la salle. [La coordination du jour J](/prestations/coordination-jour-j-perpignan) existe exactement pour ça.\n\nSi vous avez le temps, le réseau et l'envie de tout faire, et que quelqu'un de confiance tiendra la régie le jour J, vous pouvez vous passer de nous. On préfère le dire.",
      },
      {
        title: "Comment lire un devis de wedding planner",
        content:
          "Un devis se compare sur son contenu, pas sur son total. Avant de signer, vérifiez qu'il précise :\n\n- la formule et la liste de ce qu'elle comprend, point par point ;\n- le nombre de rendez-vous et de visites, et ce qui se passe au-delà ;\n- la présence le jour J : qui, de quelle heure à quelle heure, à combien de personnes ;\n- les frais de déplacement et leur mode de calcul ;\n- le calendrier de paiement, en général un acompte à la signature puis le solde avant ou après le mariage ;\n- les conditions d'annulation ou de report, dans les deux sens.\n\nNotre fonctionnement : un premier rendez-vous découverte, gratuit, pour comprendre votre projet ; un devis détaillé et sans engagement ; puis, si l'on se choisit, un contrat clair. Le reste se construit ensemble.",
      },
    ],
    highlights: [
      "Trois formules sur le marché : coordination jour J, accompagnement partiel, organisation complète.",
      "Les honoraires rémunèrent le travail du planner, jamais les prestations elles-mêmes.",
      "Forfait ou pourcentage du budget : le forfait ne grandit pas avec vos dépenses.",
      "Un devis se compare sur ce qu'il comprend, pas sur son total.",
      "Chez Noïa Event : premier rendez-vous et devis gratuits, aucune commission sur les prestataires.",
    ],
    faq: [
      { question: "Combien coûte une coordination jour J ?", answer: "Sur le marché français, le plus souvent entre 800 et 2 000 € selon l'ampleur du mariage et le nombre de temps forts. Elle comprend les points de calage des dernières semaines, la feuille de route et la régie de la journée. Chez nous, elle est chiffrée sur devis après un premier échange gratuit." },
      { question: "Le wedding planner est-il payé en pourcentage du budget ?", answer: "Certains le sont, entre 10 et 15 % du budget global en général. D'autres, dont nous, travaillent au forfait fixé au devis. Le forfait a l'avantage de ne pas augmenter si votre budget augmente en cours de route." },
      { question: "Les honoraires comprennent-ils le lieu, le traiteur ou le photographe ?", answer: "Non, jamais. Ce sont des prestations distinctes, facturées par chaque prestataire. Le wedding planner les sélectionne, les négocie et les coordonne ; il ne les revend pas." },
      { question: "Un wedding planner permet-il vraiment d'économiser ?", answer: "Souvent, oui, grâce à la connaissance des prix réels et à la négociation avec les prestataires. Mais ce n'est pas une promesse chiffrable à l'avance : cela dépend de votre projet et de ce que vous auriez négocié vous-mêmes." },
      { question: "Faut-il payer le premier rendez-vous ?", answer: "Chez Noïa Event, non. Le rendez-vous découverte et le devis sont gratuits et sans engagement. C'est le moment de poser toutes les questions de cet article, et les vôtres." },
      { question: "Peut-on commencer par une petite formule et agrandir ensuite ?", answer: "Oui. Beaucoup de couples démarrent par une coordination jour J ou un accompagnement partiel, puis élargissent quand ils mesurent la charge. Le devis est alors revu, sans repartir de zéro." },
    ],
    links: [L.mariage, L.jourJ, L.partenaires, A.budget, CONTACT],
  },
  // ───────────────────────────── 2. Lieux de mariage autour de Perpignan ─────────────────────────────
  {
    order: 2,
    slug: "conseils/lieux-de-mariage-perpignan",
    heroImage: hero("lieux-mariage-vignes", "Couple de mariés marchant main dans la main entre deux rangs de vigne, par un après-midi ensoleillé"),
    h1: "Lieux de mariage autour de Perpignan : mas, domaines, bord de mer, salles",
    meta_title: "Lieux de mariage à Perpignan et dans le 66 : comment choisir",
    meta_description:
      "Mas, domaines viticoles, Côte Vermeille, châteaux, salles : choisir un lieu de réception autour de Perpignan, et les questions à poser avant de réserver.",
    main_keyword: "salle de mariage perpignan",
    secondary_keywords: ["domaine mariage perpignan", "salle de réception perpignan", "lieu mariage perpignan", "lieu de mariage pyrénées orientales", "mas mariage perpignan"],
    card: {
      title: "Lieux de mariage autour de Perpignan",
      tagline: "Mas, domaines, Côte Vermeille, châteaux, salles : choisir dans le 66",
      description: "Les grandes familles de lieux de réception des Pyrénées-Orientales, ce que chacune impose, et les douze questions à poser avant de verser un acompte.",
      badges: [],
      featured: false,
    },
    intro:
      "Le lieu est la première décision d'un mariage, et celle qui conditionne toutes les autres : la date, le nombre d'invités, le traiteur, la décoration, le budget. Dans les Pyrénées-Orientales, le choix est large et contrasté, entre un mas dans les Aspres, un domaine viticole face au Canigou, une terrasse sur la Côte Vermeille ou une salle en plaine du Roussillon.\n\nNous visitons et réservons des lieux pour les couples que nous accompagnons, et nous en voyons passer beaucoup. Voici comment nous les classons, ce que chaque famille implique concrètement, et les questions qu'il faut poser avant de signer. Aucun nom de lieu ici : les disponibilités et les conditions changent chaque saison, et c'est en rendez-vous qu'on vous ouvre notre sélection.",
    sections: [
      {
        title: "Les mas et bastides : la carte postale catalane",
        content:
          "Le mas est le lieu que l'on nous demande le plus. Pierre apparente, cour intérieure, platanes ou oliviers, vue sur les Albères ou le Canigou : il porte seul l'ambiance, et la décoration peut rester légère.\n\nCe qu'il faut savoir avant de rêver :\n\n- **Beaucoup de mas sont des locations « sèches »** : vous louez les murs et le terrain, parfois une cuisine de réchauffe, et tout le reste s'apporte : mobilier, vaisselle, sonorisation, éclairage, parfois sanitaires. Le prix d'appel est séduisant, le budget total l'est moins.\n- **La capacité réelle** se mesure à l'intérieur, pas sous les arbres. Si le temps tourne, où dînent 120 personnes ?\n- **L'accès et le stationnement** : un chemin de terre et dix places de parking se gèrent avec des navettes, pas avec de la bonne volonté.\n- **Le voisinage et les horaires** : un mas au milieu d'un hameau peut imposer une fin de musique à 2 h. Demandez l'heure exacte, écrite.\n\nUn mas bien choisi est un mariage dont on se souvient. Un mas choisi sur photo est un mariage que l'on gère.",
      },
      {
        title: "Les domaines viticoles : vignes, chais et grands espaces",
        content:
          "Les Pyrénées-Orientales sont une terre de vin, et de plus en plus de domaines ouvrent leurs chais et leurs terrasses aux mariages. Entre les Aspres, l'Agly, le Roussillon et la côte autour de Banyuls, les paysages sont très différents d'un domaine à l'autre.\n\nLeurs atouts : des volumes généreux pour le dîner et la soirée, souvent un espace couvert et un extérieur, des photos de couple dans les vignes à toute heure, et un vin du domaine qui s'impose naturellement au cocktail.\n\nLeurs contraintes :\n\n- **La vendange** : de fin août à début octobre, certains domaines ne reçoivent pas ou limitent les espaces. Si vous visez septembre, posez la question dès la première visite.\n- **Le vin** : beaucoup imposent le leur, parfois avec un droit de bouchon si vous en apportez d'autres. Ce n'est pas forcément un problème, c'est un poste à chiffrer.\n- **Le traiteur** : certains travaillent avec une liste fermée de traiteurs, d'autres laissent libre. Vérifiez avant de tomber amoureux d'un chef.\n\nUn domaine viticole se marie très bien avec une décoration sobre, des matières naturelles et une longue table. Nous en parlons dans [notre page dédiée à la scénographie](/prestations/wedding-designer-decoration-mariage-perpignan).",
        image: wide("lieux-mariage-ceremonie-jardin", "Chaises en bois alignées dans un jardin pour une cérémonie de mariage en plein air"),
      },
      {
        title: "Le bord de mer : Côte Vermeille et littoral sableux",
        content:
          "Se marier face à la Méditerranée fait partie des demandes les plus fréquentes, et le département offre deux littoraux très différents. Au sud, la Côte Vermeille, de Collioure à Cerbère : criques, vignes en terrasses, villages colorés, lumière de fin de journée. Au nord, le littoral sableux, de Canet à Le Barcarès : plages larges, paillotes, lagunes, horizon plat.\n\nCe que le bord de mer impose :\n\n- **Le vent**. La tramontane souffle fort et souvent. Une cérémonie sur la plage se prévoit avec un plan B abrité et une décoration lestée, et l'on évite les voiles, les menus volants et les coiffures fragiles.\n- **La cérémonie sur le sable** est en général une cérémonie laïque, avec autorisation à demander à la commune. La mairie, elle, reste la mairie.\n- **La saison** : en juillet et août, plages et restaurants sont pleins, et les prix suivent. Mai, juin et septembre offrent la même lumière avec plus de calme.\n- **La logistique** : accès des prestataires, électricité, sanitaires, stationnement d'une centaine de voitures dans un village balnéaire en été. Tout se résout, rien ne s'improvise.\n\nSur la côte, une réception dans un restaurant ou un hôtel avec terrasse privatisée évite la plupart de ces contraintes, au prix d'un cadre moins « à vous ».",
      },
      {
        title: "Châteaux, salles et lieux atypiques",
        content:
          "Le département compte aussi des châteaux et demeures du XVIIIe ou du XIXe, en plaine et sur les contreforts, qui offrent ce que les mas n'ont pas toujours : de grandes salles intérieures, des chambres sur place, un parc. Leur contrainte principale est le prix d'entrée et, parfois, des règles strictes sur la décoration, les bougies, la sonorisation ou les horaires.\n\nLes **salles de réception** proprement dites, en périphérie de Perpignan ou dans les villages, sont la solution la plus simple à exploiter : capacité connue, cuisine, sanitaires, parking, sonorisation, pas de voisins. Leur défaut est d'être neutres, voire froides : c'est la scénographie qui fait le lieu, et il faut la budgéter en conséquence. C'est souvent, au total, l'option la plus économique pour un grand nombre d'invités.\n\nRestent les **lieux atypiques** : un restaurant privatisé, un hôtel, un centre d'art, un jardin familial, une salle des fêtes communale réaménagée. Ils demandent plus d'imagination et de logistique, et donnent souvent les mariages les plus personnels.",
      },
      {
        title: "Douze questions à poser avant de verser un acompte",
        content:
          "Un lieu se visite deux fois : une fois pour l'émotion, une fois avec la liste. La voici.\n\n1. Quelle est la capacité assise, à l'intérieur, en cas de pluie ?\n2. Qu'est-ce qui est fourni : tables, chaises, vaisselle, nappage, sonorisation, éclairage ?\n3. Avez-vous une liste de traiteurs imposés ? Un droit de bouchon ?\n4. À quelle heure la musique doit-elle s'arrêter ? Et la fête ?\n5. Le lieu est-il privatisé, ou partagé avec d'autres clients ou des hôtes ?\n6. Combien de voitures peuvent stationner ? Y a-t-il un accès pour les navettes et les camions des prestataires ?\n7. Y a-t-il des chambres sur place, et à quel tarif ?\n8. Que se passe-t-il la veille et le lendemain : installation, démontage, brunch ?\n9. Qui est présent le jour J côté lieu, et jusqu'à quelle heure ?\n10. Que comprend le prix, et que coûte chaque option : chauffage, ménage, personnel, heures supplémentaires ?\n11. Quelles sont les conditions d'annulation ou de report, et l'acompte est-il remboursable ?\n12. Le lieu a-t-il une assurance et un plan d'évacuation ? Demandez-vous une attestation de responsabilité civile ?\n\nLes réponses s'écrivent dans le contrat. Ce qui n'y est pas n'existe pas le jour J.",
      },
      {
        title: "Comment nous cherchons un lieu pour vous",
        content:
          "La recherche de lieu fait partie de [notre organisation complète](/prestations/organisation-mariage-perpignan) et de notre accompagnement partiel, et nous la proposons aussi seule. Elle commence par trois questions : le nombre d'invités réaliste, la saison, et le type d'ambiance que vous voulez, en photos plutôt qu'en mots.\n\nEnsuite, nous présélectionnons trois à cinq lieux cohérents avec le budget global, nous organisons les visites, nous posons les douze questions ci-dessus et nous comparons sur une grille unique. Vous choisissez, nous négocions et nous relisons le contrat. Si le lieu est une location sèche, nous chiffrons tout de suite ce qu'il faudra apporter, pour que le prix affiché devienne un prix réel.\n\nEt parce qu'un lieu loin de tout impose des trajets, nous gérons aussi la voiture des mariés et les navettes des invités. Le lieu parfait est souvent celui où personne n'a besoin de reprendre le volant.",
      },
    ],
    highlights: [
      "Mas, domaines viticoles, bord de mer, châteaux, salles : cinq familles, cinq logistiques différentes.",
      "Une location sèche a un prix d'appel bas et un budget total élevé : tout s'apporte.",
      "Sur la côte, la tramontane impose un plan B abrité et une décoration lestée.",
      "La capacité qui compte est la capacité assise à l'intérieur, en cas de pluie.",
      "Douze questions à poser, douze réponses à écrire dans le contrat.",
    ],
    faq: [
      { question: "Quel est le meilleur mois pour se marier dans les Pyrénées-Orientales ?", answer: "Mai, juin et septembre réunissent la lumière, des températures agréables et moins de monde sur la côte qu'en plein été. Juillet et août sont très demandés et très chauds ; octobre reste souvent doux. Attention à la vendange dans les domaines viticoles, de fin août à début octobre." },
      { question: "Combien de temps à l'avance réserver un lieu ?", answer: "Pour un samedi de mai à septembre, les lieux les plus demandés se réservent douze à dix-huit mois à l'avance. Hors saison ou en semaine, quelques mois peuvent suffire. C'est la première chose que nous sécurisons dans une organisation complète." },
      { question: "Peut-on se marier sur la plage ?", answer: "Pour une cérémonie laïque, oui, sous réserve d'une autorisation de la commune et d'une bonne gestion du vent et de la logistique. Le mariage civil, lui, a lieu à la mairie, sauf dérogation exceptionnelle du maire." },
      { question: "Un mas est-il plus cher qu'une salle ?", answer: "Pas forcément à la location, mais souvent au total : un mas en location sèche demande d'apporter mobilier, vaisselle, sonorisation, parfois sanitaires. Une salle équipée coûte plus à l'entrée et moins en logistique. Il faut comparer les budgets complets, pas les tarifs de location." },
      { question: "Faut-il choisir le lieu avant le traiteur ?", answer: "Oui, dans la plupart des cas : beaucoup de lieux imposent ou limitent les traiteurs, et le traiteur a besoin de connaître la cuisine et les accès. L'ordre habituel est lieu, puis traiteur, puis les autres prestataires." },
      { question: "Nous habitons loin : comment visiter ?", answer: "C'est l'une des raisons pour lesquelles on nous appelle. Nous présélectionnons, nous visitons, nous filmons si besoin, et nous organisons une journée de visites groupées quand vous venez. Vous ne faites le trajet qu'une fois." },
    ],
    links: [L.mariage, L.deco, L.partenaires, A.budget, A.retro, CONTACT],
  },
  // ───────────────────────────── 3. Tendances mariage 2027 ─────────────────────────────
  {
    order: 3,
    slug: "conseils/tendances-mariage-2027",
    heroImage: hero("tendances-2027-tables", "Tables de réception de mariage dressées avec nappes claires, bougies et compositions florales"),
    h1: "Tendances mariage 2027 : thèmes, couleurs, formats et déco que l'on voit arriver",
    meta_title: "Tendances mariage 2027 : thèmes, couleurs, déco | Noïa Event",
    meta_description:
      "Deux jours, longues tables, palettes terre et vin, matières brutes, papeterie imprimée : ce que les couples demandent pour 2027, sans copier Pinterest.",
    main_keyword: "tendance mariage 2027",
    secondary_keywords: ["thème mariage 2027", "couleur mariage 2027", "tendances mariage", "thème mariage", "décoration mariage"],
    card: {
      title: "Tendances mariage 2027",
      tagline: "Ce que les couples nous demandent, et ce que l'on en pense",
      description: "Formats, palettes, matières, papeterie, animation : les tendances qui s'installent pour 2027, et la manière de les adapter à un mariage dans le Sud sans copier Pinterest.",
      badges: [],
      featured: false,
    },
    intro:
      "Une tendance de mariage, c'est ce que les couples nous décrivent en premier rendez-vous, avant même d'avoir un lieu. Les demandes pour 2027 sont déjà là, et elles ont un point commun : moins de spectaculaire, plus de vécu. Des mariages qui durent, qui se mangent, qui se touchent, où les invités font quelque chose plutôt que de regarder.\n\nVoici ce que nous voyons arriver, thème par thème, avec notre avis de wedding designer : ce qui marche vraiment dans un mas des Aspres ou sur la Côte Vermeille, et ce qui ne survit pas à la tramontane. Rien ici n'est obligatoire. Une tendance se prend quand elle vous ressemble, pas parce qu'elle est à la mode.",
    sections: [
      {
        title: "Le format : plus long, plus lent, plus petit",
        content:
          "La première tendance n'est pas une couleur, c'est une durée. Le mariage sur deux jours, parfois trois, s'impose : un dîner la veille pour les proches, le mariage lui-même, un brunch ou une journée plage le lendemain. On le voit d'autant plus dans le Sud que les invités viennent de loin et que le lieu s'y prête.\n\nDans le même mouvement :\n\n- **Les listes d'invités se resserrent.** 60 à 90 personnes plutôt que 150, et un budget par invité qui augmente d'autant : on reçoit mieux, moins de monde.\n- **Le mariage en semaine** progresse, surtout en juin et septembre : lieux plus disponibles, parfois moins chers, invités qui prennent un vrai week-end prolongé.\n- **La cérémonie laïque** devient le cœur de la journée, écrite par le couple, souvent avec des proches qui prennent la parole.\n\nNotre avis : le format long est la meilleure tendance de ces dernières années, à une condition. Il faut une régie pour chaque temps, pas seulement pour le samedi. C'est précisément pour cela que [nos coordinations jour J](/prestations/coordination-jour-j-perpignan) se pensent par journée.",
      },
      {
        title: "Les couleurs : terre, vin, et un seul accent",
        content:
          "Après plusieurs saisons de blanc, de sauge et de beige, les palettes se réchauffent. Ce que l'on nous demande pour 2027 :\n\n- **Les tons terre** : terracotta, ocre, brun chaud, sable. Ils fonctionnent naturellement avec la pierre des mas et le paysage catalan.\n- **Les rouges profonds** : bordeaux, cerise noire, grenat. Plutôt pour les mariages d'automne et les dîners aux bougies.\n- **Le bleu nuit et le vert forêt** en teinte principale, avec un blanc cassé pour respirer.\n- **Un accent inattendu** : un jaune moutarde, un rose vif, un cuivre, utilisé avec parcimonie sur la papeterie, les rubans, un cocktail.\n\nLa règle que nous appliquons : trois couleurs maximum, dont une dominante, une secondaire et un accent. Au-delà, le regard ne se pose nulle part. Et une palette se teste sur place, à l'heure de la réception : une terracotta magnifique en boutique peut virer à l'orange sous un soleil de 17 h en juillet.",
        image: wide("tendances-2027-table-noir-blanc", "Table de mariage dressée en noir et blanc avec verres en cristal et serviettes pliées"),
      },
      {
        title: "La décoration : matières brutes, longues tables, moins d'objets",
        content:
          "La décoration de 2027 enlève plutôt qu'elle n'ajoute. Ce qui s'installe :\n\n- **La longue table** unique ou en U, pour 60 à 100 convives, plutôt que des tables rondes de dix. Elle change l'ambiance du dîner et simplifie le plan de table, au prix d'une salle assez longue.\n- **Les matières brutes** : lin froissé, bois non traité, céramique artisanale, grès, verre fumé. Une table qui se touche.\n- **Les fleurs locales et de saison**, en grandes masses plutôt qu'en petits bouquets : branches d'olivier, graminées, fleurs de jardin, parfois des fruits. Moins de roses importées, plus de ce qui pousse à trente kilomètres.\n- **La lumière** comme décor principal : bougies en nombre, guirlandes basses, lanternes, et surtout pas d'éclairage blanc de salle.\n- **Les arches en déclin**, remplacées par des installations au sol, des rideaux de tissu ou simplement le paysage.\n\nCe qui disparaît : les lettres géantes, les murs de fleurs artificielles, les néons à message, les photobooths à accessoires. Ils ont eu leur décennie.\n\nNotre conseil pour le Sud : tout ce qui est léger s'envole. Les nappes se lestent, les menus se posent dans l'assiette, les compositions hautes se fixent. Une tendance ne vaut rien si elle finit dans la vigne.",
      },
      {
        title: "La papeterie et les détails qui restent",
        content:
          "La papeterie revient au papier. Après des années de faire-part numériques, les couples veulent de nouveau quelque chose que l'on garde : un faire-part imprimé sur papier épais, un programme de cérémonie, un menu calligraphié, un plan de table dessiné à la main.\n\nLes tendances que l'on voit :\n\n- **La typographie en vedette** : un seul caractère, souvent une serif classique, et très peu d'ornement.\n- **L'illustration sur mesure** : le lieu dessiné, un monogramme, une carte du département pour les invités qui viennent de loin.\n- **Le site de mariage** reste, mais pour la logistique : hébergements, navettes, programme, liste. Le faire-part, lui, redevient un objet.\n- **Les cadeaux d'invités utiles et locaux** : une huile d'olive, un vin du domaine, une céramique, un sachet de sel de la côte. Plus de dragées oubliées sur la table.\n\nLa papeterie est aussi le meilleur endroit pour placer la couleur d'accent de la palette : elle apparaît sur le faire-part, revient sur le menu, et boucle la journée.",
      },
      {
        title: "L'animation : les invités font plutôt qu'ils ne regardent",
        content:
          "La dernière tendance est la plus nette : les invités veulent participer. Les longues soirées de discours et de diaporamas laissent la place à des moments où l'on fait quelque chose ensemble.\n\n- **Les ateliers pendant le cocktail** : un bar à cocktails où l'on compose le sien, une table de dégustation de vins du Roussillon, un stand de tapas, un atelier de couronnes de fleurs.\n- **La musique live** en petite formation, puis un DJ pour la nuit. Le groupe de reprises de six musiciens recule, le duo guitare-voix ou le trio jazz avance.\n- **Les jeux à l'ancienne** en extérieur : pétanque, molkky, jeux en bois, parfois un tournoi avec des équipes mélangées.\n- **Le feu d'artifice en recul**, pour des raisons de sécurité et d'interdictions estivales dans le département, remplacé par des cierges magiques, des lanternes ou un simple dernier verre au bord de l'eau.\n- **Le lendemain** comme vrai temps fort : brunch long, plage, sieste, et pas de programme imposé.\n\nUne animation réussie se choisit selon les invités, pas selon la tendance. Une famille de quatre générations et une bande de trentenaires ne dansent pas sur la même musique, et il faut prévoir les deux.",
      },
      {
        title: "Suivre une tendance sans copier Pinterest",
        content:
          "Le risque de cet article, c'est de produire mille fois le même mariage terracotta à longue table sous les oliviers. La parade tient en trois règles que nous appliquons sur chaque dossier.\n\n1. **Partir de vous, pas du moodboard.** Votre histoire, un lieu qui compte, un plat, une chanson, un objet de famille. La tendance vient ensuite, comme un cadre, pas comme un sujet.\n2. **Choisir une tendance, pas cinq.** Deux jours, ou longue table, ou palette vin : une idée forte tient tout le mariage. Trois idées fortes se contredisent.\n3. **Adapter au lieu et au climat.** Le vent, la chaleur, la pierre, la vigne : le Roussillon impose ses règles, et c'est tant mieux, elles font des mariages qu'on ne peut pas confondre avec un autre.\n\nC'est le travail que nous appelons [scénographie](/prestations/wedding-designer-decoration-mariage-perpignan) : traduire vos inspirations en une direction artistique cohérente et réalisable dans votre budget. On récupère vos moodboards, et on en fait un mariage qui n'existe qu'une fois.",
      },
    ],
    highlights: [
      "Le format gagne sur la déco : deux jours, moins d'invités, une cérémonie laïque au centre.",
      "Palettes terre et vin, trois couleurs maximum dont un accent.",
      "Longues tables, matières brutes, fleurs locales en masses, lumière de bougies.",
      "La papeterie redevient un objet imprimé ; le site de mariage sert à la logistique.",
      "Les invités participent : ateliers, jeux, musique live en petite formation.",
    ],
    faq: [
      { question: "Quelle est la couleur tendance pour un mariage en 2027 ?", answer: "Les tons terre, terracotta et ocre en tête, et les rouges profonds comme le bordeaux. Mais une couleur tendance ne vaut que si elle fonctionne avec votre lieu et la lumière du jour : on la teste toujours sur place avant de décider." },
      { question: "Le thème champêtre est-il dépassé ?", answer: "Le mot, peut-être ; l'esprit, non. Les matières naturelles, les fleurs de saison et les tables en extérieur restent au cœur de 2027. Ce qui disparaît, c'est l'accumulation d'objets rustiques : les bocaux, la toile de jute, les palettes." },
      { question: "Un mariage sur deux jours coûte-t-il beaucoup plus cher ?", answer: "Il ajoute un repas et parfois une nuit d'hébergement, mais souvent avec moins d'invités et un format simple la veille, comme un dîner ou des tapas. Le surcoût dépend surtout du nombre de personnes présentes aux temps supplémentaires." },
      { question: "Les arches de cérémonie sont-elles encore à la mode ?", answer: "Elles reculent au profit d'installations au sol, de rideaux de tissu ou du paysage seul. Dans le 66, un arbre, un mur de pierre ou la mer font souvent un meilleur décor qu'une structure apportée, et ils ne craignent pas le vent." },
      { question: "Peut-on faire un feu d'artifice pour un mariage dans les Pyrénées-Orientales ?", answer: "Cela dépend de la commune, de la période et des arrêtés préfectoraux liés au risque d'incendie, fréquents l'été. Il faut une autorisation et un artificier professionnel. Beaucoup de couples préfèrent désormais une alternative : cierges, lanternes, dernier verre au bord de l'eau." },
      { question: "Comment éviter que notre mariage ressemble à tous les autres ?", answer: "En partant de votre histoire plutôt que d'un moodboard, en choisissant une seule idée forte, et en l'adaptant au lieu. C'est exactement le rôle de la scénographie : vos inspirations deviennent une direction artistique qui n'existe qu'une fois." },
    ],
    links: [L.deco, L.mariage, A.lieux, A.retro, CONTACT],
  },
  // ───────────────────────────── 4. Rétroplanning mariage ─────────────────────────────
  {
    order: 4,
    slug: "conseils/retroplanning-mariage",
    heroImage: hero("retroplanning-agenda", "Agenda ouvert sur une table, avec un feuillage et une bougie, vu de dessus"),
    h1: "Rétroplanning de mariage : les 12 mois avant le jour J, étape par étape",
    meta_title: "Rétroplanning mariage : quoi faire mois par mois | Noïa",
    meta_description:
      "De J-12 mois au lendemain : l'ordre réel des décisions, ce qui se réserve en premier, ce qui attend, et les semaines où tout se joue.",
    main_keyword: "rétroplanning mariage",
    secondary_keywords: ["retroplanning mariage 12 mois", "organiser son mariage", "planning organisation mariage", "checklist mariage", "organisation mariage étapes"],
    card: {
      title: "Rétroplanning de mariage",
      tagline: "Les 12 mois avant le jour J, dans le bon ordre",
      description: "Ce qui se réserve en premier, ce qui peut attendre, les semaines où tout se décide et les oublis classiques : le rétroplanning que nous appliquons, mois par mois.",
      badges: [],
      featured: false,
    },
    intro:
      "Un rétroplanning, c'est un calendrier à l'envers : on part de la date du mariage et l'on remonte, en plaçant chaque décision au moment où elle doit être prise, ni avant, ni après. C'est l'outil central de notre métier, et celui qui manque le plus aux couples qui organisent seuls. Non pas parce qu'ils oublient des choses, mais parce qu'ils les font dans le désordre : une décoration choisie avant le lieu, un traiteur signé avant de connaître la cuisine.\n\nVoici le rétroplanning sur douze mois tel que nous le pratiquons, étape par étape. Il se compresse sans problème sur six ou huit mois, à condition de respecter l'ordre. Et il s'applique aussi à un mariage que vous organisez vous-mêmes, avec ou sans coordination du jour J.",
    sections: [
      {
        title: "J-12 à J-10 mois : les fondations",
        content:
          "Tout ce qui se décide ici conditionne la suite. Dans l'ordre :\n\n1. **La liste d'invités, en vrai.** Pas « environ cent », mais une liste nominative avec trois cercles : les indispensables, les probables, les possibles. Elle fixe le lieu et le budget.\n2. **Le budget global**, et sa répartition par grands postes. On en parle dans [notre article sur le budget mariage](/conseils/budget-mariage). Sans ce chiffre, chaque devis sera une surprise.\n3. **La date**, ou plutôt deux ou trois dates possibles. Une seule date ferme les portes des lieux les plus demandés.\n4. **Le lieu.** Visites, questions, contrat, acompte. Dans les Pyrénées-Orientales, les samedis de mai à septembre partent douze à dix-huit mois à l'avance.\n5. **La mairie** : prise de contact pour les créneaux, surtout si vous vous mariez dans une commune touristique en été.\n\nSi vous faites appel à un wedding planner, c'est aussi le moment : plus tôt il arrive, plus il peut agir sur le budget et le lieu, qui sont les deux postes qui pèsent.",
      },
      {
        title: "J-10 à J-8 mois : les prestataires qui se réservent en premier",
        content:
          "Certains prestataires n'ont qu'une date par week-end et sont réservés très tôt. Ce sont ceux-là que l'on signe maintenant :\n\n- **Le traiteur**, une fois le lieu connu et sa cuisine comprise. Dégustation avant signature.\n- **Le photographe** et, si vous en voulez un, le vidéaste. Un bon photographe de mariage refuse plus de dates qu'il n'en accepte.\n- **Le DJ ou les musiciens**, pour la cérémonie, le cocktail et la soirée. Souvent deux prestataires différents.\n- **L'officiant** si vous prévoyez une cérémonie laïque avec un professionnel.\n\nEt un geste souvent oublié : **les hébergements**. Si vos invités viennent de loin, bloquez des chambres dans deux ou trois adresses proches du lieu, et prévenez-les tôt. En été, sur la côte, c'est le poste qui crée le plus de stress chez les invités.\n\nC'est aussi le moment de dire « nous nous marions le … » à tout le monde, par un save-the-date simple. Le faire-part officiel viendra plus tard.",
        image: wide("retroplanning-invitation", "Gros plan sur un faire-part de mariage imprimé avec un motif floral, posé à la lumière du jour"),
      },
      {
        title: "J-8 à J-5 mois : la tenue, la déco, le cadre",
        content:
          "Le squelette est en place, on habille.\n\n- **La robe et le costume.** La robe se commande six à huit mois avant pour laisser le temps des retouches ; le costume, trois à quatre mois. Nos mariées bénéficient d'une remise chez notre partenaire robe de mariée, c'est écrit sur [la page partenaires](/partenaires).\n- **La direction artistique** : palette, matières, ambiance. C'est maintenant que la scénographie se conçoit, parce que les commandes de fleurs, de mobilier et de papeterie en dépendent. Si la décoration nous est confiée, nous présentons un dossier complet à ce stade.\n- **Le fleuriste**, briefé sur la palette et le lieu, avec un budget clair.\n- **La location de mobilier et de vaisselle** si le lieu est une location sèche : tables, chaises, nappage, verrerie, éclairage.\n- **Les alliances**, à commander ou à faire faire : comptez deux à trois mois.\n- **Le voyage de noces**, si vous partez juste après : c'est le moment des bonnes conditions.\n\nUn piège fréquent à cette étape : acheter de la décoration en ligne « parce que c'est joli », avant la direction artistique. Les cartons s'empilent et ne servent pas.",
      },
      {
        title: "J-5 à J-3 mois : la papeterie, les formalités, le programme",
        content:
          "Le mariage devient concret pour les invités et pour l'administration.\n\n- **Les faire-part** partent à J-4 mois environ, avec une date limite de réponse à J-2 mois. Le site de mariage, s'il y en a un, est en ligne avec les informations pratiques : lieu, horaires, hébergements, navettes, liste.\n- **Le dossier de mariage à la mairie** : il se dépose en général un à trois mois avant, avec les pièces d'état civil récentes. Vérifiez les délais de votre commune, ils varient.\n- **La cérémonie laïque** s'écrit : déroulé, intervenants, textes, musique. Donnez un cadre à ceux qui prennent la parole : une durée, un ton.\n- **Le programme de la journée** se dessine, heure par heure, des préparatifs au dernier verre. C'est le brouillon de la feuille de route du jour J.\n- **Les essais** : coiffure et maquillage, avec le voile ou l'accessoire prévu. Nos mariées font l'essai avec notre partenaire coiffure en amont, pour arriver sereines le jour J.\n- **La pâtisserie** : wedding cake, pièce montée ou buffet de douceurs, à commander maintenant avec une dégustation.\n\nSi vous avez prévu une coordination du jour J, c'est le bon moment pour la réserver : nous limitons le nombre de mariages par week-end.",
      },
      {
        title: "J-3 mois à J-2 semaines : on verrouille",
        content:
          "Plus rien ne se décide, tout se confirme.\n\n- **Les réponses des invités** sont closes à J-2 mois. On relance les retardataires, on arrête le nombre définitif, on le transmet au traiteur et au lieu.\n- **Le plan de table** se fait à J-1 mois, pas avant : il bouge jusqu'au bout.\n- **Les derniers paiements** : la plupart des prestataires demandent le solde entre J-1 mois et J-1 semaine. On les note dans un calendrier, avec les montants.\n- **La feuille de route** : un document unique avec les horaires, les contacts de chaque prestataire, les adresses, les livraisons, les plans. C'est la pièce maîtresse du jour J, et c'est elle que nous reprenons quand nous arrivons en coordination.\n- **La confirmation de tous les prestataires**, un par un, deux semaines avant : horaire d'arrivée, accès, besoins techniques, nom du contact sur place.\n- **Les navettes et les véhicules**, avec les horaires et les points de rendez-vous communiqués aux invités.\n- **Le plan B météo**, écrit et partagé : où se tient la cérémonie s'il pleut, qui décide, à quelle heure.\n\nÀ ce stade, chaque imprévu se règle en un appel si tout est écrit, en une crise si rien ne l'est.",
      },
      {
        title: "La dernière semaine, le jour J, et le lendemain",
        content:
          "**La dernière semaine** est faite de petites choses : récupérer la robe et le costume, préparer les alliances, les cadeaux des témoins, le discours, une trousse d'urgence (épingles, pansements, fil, chargeurs, en-cas). Puis dormir.\n\n**La veille**, l'installation : décoration, mobilier, signalétique, mise en place de la cérémonie. C'est le moment où il faut quelqu'un qui ne soit ni le marié, ni la mariée, ni leurs parents.\n\n**Le jour J**, la règle est simple : vous ne gérez rien. Les prestataires ont un seul contact, qui n'est pas vous. Les imprévus se règlent en coulisses, et il y en aura : un retard, une livraison manquante, une pluie à 16 h. C'est précisément le travail de [la coordination du jour J](/prestations/coordination-jour-j-perpignan), que vous ayez tout organisé vous-mêmes ou non.\n\n**Le lendemain** : le démontage, la restitution du lieu, les objets oubliés, les photos de téléphone à rassembler. Et dans les semaines qui suivent, les remerciements et les derniers règlements.\n\nCe rétroplanning tient sur une page. Si vous voulez le nôtre, avec les dates déjà calculées pour votre mariage, c'est ce que nous construisons dès le premier rendez-vous, et il est gratuit.",
      },
    ],
    highlights: [
      "L'ordre compte plus que la liste : invités, budget, date, lieu, puis le reste.",
      "Traiteur, photographe, DJ et hébergements se réservent dès J-10 mois.",
      "La direction artistique se conçoit avant toute commande de déco.",
      "Faire-part à J-4 mois, réponses closes à J-2 mois, plan de table à J-1 mois.",
      "Une feuille de route écrite, un seul contact le jour J, et vous ne gérez rien.",
    ],
    faq: [
      { question: "Peut-on organiser un mariage en six mois ?", answer: "Oui, en gardant le même ordre et en acceptant moins de choix sur le lieu et les prestataires les plus demandés. Un mariage en semaine ou hors saison facilite beaucoup. Nous organisons régulièrement des mariages en quelques mois." },
      { question: "Dans quel ordre choisir le lieu et le traiteur ?", answer: "Le lieu d'abord, presque toujours : il fixe la date, la capacité et souvent la liste des traiteurs autorisés. Le traiteur vient ensuite, avec une dégustation avant signature." },
      { question: "Quand envoyer les faire-part ?", answer: "Environ quatre mois avant, avec une date limite de réponse deux mois avant le mariage. Un save-the-date plus tôt, dès que la date et le lieu sont fixés, aide les invités qui viennent de loin." },
      { question: "Quand déposer le dossier de mariage à la mairie ?", answer: "En général entre un et trois mois avant la date, avec des pièces d'état civil récentes. Les délais et les créneaux varient selon la commune : contactez la mairie dès que la date est fixée, surtout en été dans une commune touristique." },
      { question: "À quel moment faire appel à une coordination jour J ?", answer: "L'idéal est de réserver trois à quatre mois avant, voire plus pour les dates de haute saison. La préparation active démarre environ un mois avant le mariage, quand nous reprenons tous les contrats et rédigeons la feuille de route." },
      { question: "Que mettre dans la feuille de route du jour J ?", answer: "Les horaires minute par minute, les contacts de chaque prestataire, les adresses et accès, les livraisons, les plans de salle et de cérémonie, le plan B météo et le nom de la personne qui décide. Tout ce qu'un prestataire pourrait demander par téléphone le jour J." },
    ],
    links: [L.mariage, L.jourJ, L.deco, A.budget, A.lieux, CONTACT],
  },
  // ───────────────────────────── 5. Budget mariage ─────────────────────────────
  {
    order: 5,
    slug: "conseils/budget-mariage",
    heroImage: hero("budget-mariage-table-bougies", "Table de mariage dressée le soir, éclairée par des bougies, avec des compositions florales blanches"),
    h1: "Budget mariage : combien coûte un mariage et comment le répartir poste par poste",
    meta_title: "Budget mariage : combien ça coûte et comment le répartir",
    meta_description:
      "Les ordres de grandeur d'un mariage en France, la répartition par poste, les trois arbitrages qui changent tout et comment tenir le budget.",
    main_keyword: "budget mariage",
    secondary_keywords: ["combien coûte un mariage", "prix moyen mariage", "budget mariage 100 personnes", "budget mariage 50 personnes", "répartition budget mariage"],
    card: {
      title: "Budget mariage : combien ça coûte",
      tagline: "Les ordres de grandeur, la répartition par poste, les arbitrages",
      description: "Ce que coûte un mariage en France selon le nombre d'invités, comment se répartit le budget entre le lieu, le traiteur, la photo, la déco et le reste, et comment le tenir.",
      badges: [],
      featured: false,
    },
    intro:
      "Il n'existe pas de prix d'un mariage, il existe un prix par invité, multiplié par un nombre d'invités, plus quelques postes fixes. C'est la première chose que nous expliquons en rendez-vous, parce qu'elle change la manière de réfléchir : un mariage de 60 personnes avec un très bon traiteur et un mariage de 150 personnes en buffet simple peuvent coûter la même chose.\n\nCet article donne les ordres de grandeur que l'on observe en France, la répartition habituelle du budget poste par poste, et les trois arbitrages qui pèsent vraiment. Les chiffres sont ceux du marché, larges par honnêteté ; votre budget, lui, se construit sur devis, et c'est ce que nous faisons dès le premier rendez-vous, gratuitement.",
    sections: [
      {
        title: "Les ordres de grandeur, selon le nombre d'invités",
        content:
          "Les enquêtes et les professionnels convergent sur un ordre de grandeur en France : un mariage avec réception coûte le plus souvent entre 10 000 et 25 000 € pour 80 à 100 invités, et le coût par invité se situe en général entre 120 et 250 €, tout compris, de la location du lieu au dernier verre. Au-dessus et en dessous, tout existe.\n\n| Invités | Fourchette courante (marché) | Ce qui pèse le plus |\n| --- | --- | --- |\n| 30 à 50 | 6 000 à 12 000 € | Les postes fixes (photo, tenue, musique) pèsent proportionnellement plus |\n| 80 à 100 | 12 000 à 25 000 € | Lieu et traiteur font environ la moitié |\n| 120 à 150 | 18 000 à 35 000 € | Traiteur, boissons, navettes, mobilier |\n| 200 et plus | 30 000 € et au-delà | Tout ce qui se multiplie par invité |\n\nCes fourchettes ne sont pas nos tarifs ni un objectif : certains couples se marient très bien pour moins, d'autres choisissent de dépenser beaucoup plus sur un poste qui compte pour eux. Elles servent à une chose : savoir si votre liste d'invités et votre enveloppe sont compatibles avant de visiter un seul lieu.",
      },
      {
        title: "La répartition par poste",
        content:
          "Une fois l'enveloppe fixée, elle se répartit. Voici la répartition que l'on retrouve sur la plupart des mariages, en pourcentage du budget total. Elle sert de point de départ, pas de règle.\n\n| Poste | Part habituelle | Remarques |\n| --- | --- | --- |\n| Lieu de réception | 15 à 25 % | Très variable : location sèche ou lieu équipé |\n| Traiteur et boissons | 30 à 40 % | Le poste n°1, proportionnel aux invités |\n| Photo et vidéo | 8 à 12 % | Poste fixe, peu lié au nombre d'invités |\n| Décoration et fleurs | 8 à 15 % | Dépend surtout du lieu et de la scénographie |\n| Tenues et beauté | 8 à 12 % | Robe, costume, coiffure, maquillage, alliances |\n| Musique et animation | 5 à 10 % | DJ, musiciens, sono, éclairage |\n| Papeterie et cadeaux d'invités | 2 à 4 % | |\n| Transport et hébergement | 2 à 6 % | Navettes, voiture des mariés, chambres des mariés |\n| Imprévus | 5 à 10 % | À réserver dès le départ, jamais après |\n\nLes honoraires d'un wedding planner, lorsqu'il y en a un, s'ajoutent et se chiffrent à part : nous en parlons dans [notre article sur le prix d'un wedding planner](/conseils/prix-wedding-planner).",
        image: wide("budget-mariage-service-vin", "Vin rouge versé dans des verres sur une table de dîner dressée, en lumière chaude"),
      },
      {
        title: "Les trois arbitrages qui changent tout",
        content:
          "Sur un budget de mariage, trois décisions pèsent plus que toutes les autres réunies. Les prendre tôt, en connaissance de cause, évite de rogner ensuite sur tout le reste.\n\n1. **Le nombre d'invités.** C'est le multiplicateur. Dix invités de moins, c'est un repas, des boissons, une place de navette, une part de mobilier et de vaisselle en moins, soit souvent plus de 1 500 € sur un mariage de 100 personnes. La question n'est pas « qui inviter », c'est « qui voulons-nous vraiment avoir à table ».\n2. **Le format du repas.** Un dîner assis servi à table, un buffet, un cocktail dînatoire, une paella géante ou un food truck n'ont pas le même coût par personne, ni la même ambiance. Le cocktail dînatoire long, avec des stands, est souvent la solution la plus festive et la plus économique pour un grand nombre.\n3. **Le lieu, et ce qu'il fournit.** Un lieu équipé coûte plus cher à la location et moins au total ; une location sèche semble économique jusqu'à ce que l'on chiffre les tentes, le mobilier, la vaisselle, la sonorisation et les sanitaires. Nous détaillons ce point dans [notre article sur les lieux de mariage autour de Perpignan](/conseils/lieux-de-mariage-perpignan).\n\nTout le reste, la papeterie, les cadeaux d'invités, les petites décorations, se discute à la marge. Ce sont des postes où l'on économise cent euros avec beaucoup d'efforts.",
      },
      {
        title: "Les postes que l'on oublie",
        content:
          "Un budget de mariage dérape rarement sur les grands postes, que tout le monde surveille. Il dérape sur ce que personne n'a inscrit. La liste de ce que nous voyons le plus souvent oublié :\n\n- **Les boissons hors forfait** : le vin au-delà du nombre de bouteilles prévu, le champagne du toast, le bar de nuit, les softs pour les enfants.\n- **Le repas des prestataires** : photographe, vidéaste, DJ, coordinateurs dînent, et le traiteur les facture.\n- **Les heures supplémentaires** : du lieu, du DJ, du personnel de service, lorsque la soirée se prolonge.\n- **Le droit de bouchon** si vous apportez votre vin, et le service des boissons si le traiteur ne le comprend pas.\n- **Les frais de livraison et de reprise** du mobilier, de la vaisselle, des fleurs.\n- **Le ménage et la remise en état** du lieu, parfois facturés à part.\n- **Les assurances** : responsabilité civile demandée par certains lieux, assurance annulation.\n- **Les retouches** de la robe et du costume, les essais coiffure et maquillage.\n- **Les cadeaux** aux témoins, aux parents, aux enfants d'honneur.\n- **La veille et le lendemain** : dîner des proches, brunch, hébergement des mariés.\n\nC'est pour cela que la ligne « imprévus » se réserve au départ, entre 5 et 10 % de l'enveloppe. Si elle n'est pas dépensée, elle finance le voyage de noces.",
      },
      {
        title: "Comment tenir le budget jusqu'au dernier règlement",
        content:
          "Tenir un budget de mariage ne demande pas un tableur compliqué, mais une discipline simple, que nous appliquons sur chaque dossier.\n\n- **Un seul document**, avec pour chaque poste : le budget prévu, le devis signé, les acomptes versés, le solde et sa date. Il se met à jour à chaque signature, pas à la fin.\n- **Le prix par invité** calculé et affiché en haut du document. C'est l'indicateur qui parle : quand il monte, on sait pourquoi.\n- **Des devis comparables** : même nombre de personnes, même contenu, mêmes options. Deux traiteurs ne se comparent pas sur le total, mais sur le détail.\n- **Les décisions dans l'ordre** du rétroplanning : les gros postes d'abord, parce qu'ils fixent ce qui reste pour les autres.\n- **Un calendrier des paiements** : la plupart des soldes tombent dans le dernier mois, tous en même temps. Le savoir en janvier évite la surprise en juin.\n\nQuand [nous accompagnons un mariage](/prestations/organisation-mariage-perpignan), le budget est suivi en temps réel et partagé avec le couple, sans commission cachée : vous savez à tout moment où va chaque euro. Un bon accompagnement se mesure aussi à ça.",
      },
      {
        title: "Où économiser sans que cela se voie, et où ne pas le faire",
        content:
          "Toutes les économies ne se valent pas. Certaines sont invisibles pour les invités, d'autres se voient toute la soirée.\n\n**Les économies invisibles** :\n\n- un mariage en semaine, un vendredi ou hors saison, souvent moins cher sur le lieu et les prestataires ;\n- un cocktail dînatoire plutôt qu'un dîner assis à trois services ;\n- des fleurs de saison et locales, en masses, plutôt que des variétés importées ;\n- une papeterie sobre et bien imprimée plutôt qu'une papeterie à options ;\n- un DJ pour la nuit et un seul musicien pour la cérémonie, plutôt qu'un groupe complet toute la journée.\n\n**Les économies qui se voient** :\n\n- le photographe : les photos sont ce qui reste, et un amateur, aussi doué soit-il, ne gère pas une journée entière ;\n- la quantité et la qualité des boissons, surtout en été ;\n- le service en salle : un dîner qui traîne faute de serveurs casse la soirée ;\n- la sonorisation de la cérémonie : des vœux que personne n'entend.\n\nLa bonne question, pour chaque poste, est celle-ci : est-ce que les invités le vivront, ou est-ce que nous le regarderons sur une photo ? Ce qui se vit se protège ; ce qui se regarde se négocie.",
      },
    ],
    highlights: [
      "Un mariage se chiffre par invité : le nombre de convives est le premier multiplicateur.",
      "Lieu et traiteur font environ la moitié du budget, la photo est un poste fixe.",
      "Trois arbitrages pèsent plus que tout : les invités, le format du repas, le lieu et ce qu'il fournit.",
      "5 à 10 % d'imprévus se réservent au départ, jamais après.",
      "Protégez ce que les invités vivent, négociez ce qui se regarde en photo.",
    ],
    faq: [
      { question: "Quel est le prix moyen d'un mariage en France ?", answer: "Les enquêtes situent le plus souvent un mariage avec réception entre 10 000 et 25 000 € pour 80 à 100 invités, soit un coût par invité de 120 à 250 € tout compris. Il s'agit d'ordres de grandeur du marché : chaque mariage se construit sur devis selon le lieu, le repas et les choix du couple." },
      { question: "Quel budget pour un mariage de 50 personnes ?", answer: "Souvent entre 6 000 et 12 000 € sur le marché français. À ce nombre d'invités, les postes fixes comme la photo, la tenue ou la musique pèsent proportionnellement plus que le traiteur, et le choix d'un lieu équipé ou d'un restaurant privatisé simplifie beaucoup la logistique." },
      { question: "Quel budget pour un mariage de 100 personnes ?", answer: "Le plus souvent entre 12 000 et 25 000 €, le lieu et le traiteur représentant environ la moitié. Le format du repas et ce que le lieu fournit sont les deux variables qui font passer d'un bout à l'autre de la fourchette." },
      { question: "Quel pourcentage du budget pour le traiteur ?", answer: "Entre 30 et 40 % du budget total, boissons comprises, sur la plupart des mariages. C'est le poste le plus directement lié au nombre d'invités, et donc celui sur lequel la liste d'invités agit le plus." },
      { question: "Un wedding planner entre-t-il dans ces fourchettes ?", answer: "Non, ses honoraires s'ajoutent et se chiffrent à part. En contrepartie, la connaissance des prix et la négociation permettent souvent d'en compenser une partie, sans que ce soit une promesse chiffrable à l'avance. Nous détaillons les ordres de grandeur dans notre article sur le prix d'un wedding planner." },
      { question: "Comment réduire le budget sans gâcher le mariage ?", answer: "En agissant sur les trois gros arbitrages : moins d'invités, un format de repas plus simple comme le cocktail dînatoire, un lieu équipé. Puis en choisissant un jour de semaine ou une date hors saison. Les économies sur la photo, les boissons et le service se voient toute la soirée : ce ne sont pas celles à faire." },
    ],
    links: [L.mariage, A.prix, A.lieux, A.retro, CONTACT],
  },
  // ───────────────────────────── 6. Team building dans les Pyrénées-Orientales ─────────────────────────────
  {
    order: 6,
    slug: "conseils/team-building-pyrenees-orientales",
    heroImage: hero("team-building-plein-air", "Groupe de collègues participant à une activité de cohésion en plein air, dans une prairie"),
    h1: "Team building dans les Pyrénées-Orientales : des idées qui tiennent la route pour une équipe",
    meta_title: "Team building Pyrénées-Orientales : mer, vignes, montagne",
    meta_description:
      "Mer, vignes, montagne, ville : les formats de team building autour de Perpignan, ce qui marche selon l'équipe et l'objectif, et comment l'organiser.",
    main_keyword: "team building perpignan",
    secondary_keywords: ["team building pyrénées orientales", "idée team building", "activité team building", "organiser un team building", "séminaire perpignan"],
    card: {
      title: "Team building dans les Pyrénées-Orientales",
      tagline: "Mer, vignes, montagne, ville : les formats qui marchent vraiment",
      description: "Les idées de team building possibles autour de Perpignan, classées par terrain et par objectif, avec ce qu'elles demandent en logistique et en budget.",
      badges: [],
      featured: false,
    },
    intro:
      "Un team building réussi se reconnaît à une chose : le lendemain, au bureau, les gens en parlent encore, et pas pour se plaindre du trajet. Pour cela, il faut un terrain, une activité adaptée à l'équipe, et une logistique qui ne se voit pas. Les Pyrénées-Orientales ont le premier en abondance, entre la Méditerranée, les vignes et la montagne à moins d'une heure de Perpignan. Les deux autres sont notre travail.\n\nVoici les formats que nous proposons et organisons aux entreprises du département et à celles qui y viennent en séminaire, classés par terrain, avec ce que chacun demande en durée, en logistique et en budget. Aucune idée ici n'est une animation sur catalogue : chaque journée se construit sur devis, à partir de votre équipe et de votre objectif.",
    sections: [
      {
        title: "Commencer par l'objectif, pas par l'activité",
        content:
          "La plupart des team buildings ratés le sont dès le brief : « on veut faire quelque chose de sympa ». Sympa pour qui ? Une équipe de dix commerciaux qui se connaissent, une direction de quarante personnes qui vient de fusionner, et un service de cent salariés qui se croise en open space n'ont pas besoin de la même journée.\n\nLes objectifs que l'on nous confie le plus souvent, et le format qui leur répond :\n\n- **Souder une équipe qui se connaît peu** : une activité où l'on dépend des autres, en petits groupes mélangés, avec un résultat collectif. Un défi en mer ou un rallye le font bien.\n- **Fêter un résultat ou une étape** : un format plaisir, sans compétition, autour de la table et du paysage. La vigne et la côte s'y prêtent.\n- **Faire travailler les gens autrement** : un atelier créatif ou culinaire, où les hiérarchies s'effacent parce que personne n'est expert.\n- **Intégrer de nouveaux arrivants** : une journée longue avec plusieurs temps, où chacun croise tout le monde.\n\nUne fois l'objectif posé, la taille de l'équipe, le budget par personne et la saison réduisent naturellement la liste. C'est le premier rendez-vous, et il est gratuit.",
      },
      {
        title: "Côté mer : Côte Vermeille et littoral",
        content:
          "La Méditerranée est à vingt minutes de Perpignan, et elle offre les team buildings les plus mémorables du département, à condition de respecter la saison et le vent.\n\n- **Défi nautique à Collioure, Argelès ou Canet** : paddle, kayak de mer, voile en flotte, en équipes qui s'affrontent sur un parcours. Fort pour la cohésion, accessible à presque tous les niveaux, de mai à octobre.\n- **Olympiades sur la plage** : relais, beach-volley, épreuves d'adresse, un format qui fonctionne jusqu'à une centaine de personnes, suivi d'un déjeuner les pieds dans le sable.\n- **Sortie en mer** en bateau privatisé, avec dégustation ou simple apéritif au coucher du soleil. Plutôt pour fêter que pour souder, et pour des groupes de taille moyenne.\n- **Randonnée du littoral** sur le sentier de la Côte Vermeille, entre criques et vignes en terrasses, avec un déjeuner dans un village : du sport doux et des conversations longues.\n\nCe qu'il faut prévoir : un plan B si la tramontane se lève, des créneaux hors juillet-août si vous voulez des plages calmes, et des navettes, parce qu'un parking de village balnéaire ne se gère pas à quarante voitures.",
        image: wide("team-building-tir-arc", "Adultes pratiquant le tir à l'arc en extérieur, sur un terrain herbeux bordé d'arbres"),
      },
      {
        title: "Côté vignes : les domaines du Roussillon",
        content:
          "Les domaines viticoles sont le terrain de team building le plus sous-estimé du département. Ils ont de l'espace, de l'ombre, des chais pour se replier, et un sujet qui rassemble tout le monde : le vin, que l'on en boive ou non.\n\n- **Atelier d'assemblage** : chaque équipe compose sa cuvée à partir de vins de base, la défend devant un jury, repart avec sa bouteille étiquetée. Créatif, collaboratif, et il reste une trace.\n- **Vendanges d'équipe** en septembre, suivies d'un repas au domaine : du travail physique et simple, dans un cadre qui remet tout le monde au même niveau.\n- **Rallye dans les vignes** à pied ou à vélo électrique, avec des énigmes sur le terroir et une dégustation à chaque étape.\n- **Dîner au chai** en clôture de séminaire, avec un accord mets et vins commenté, pour une soirée qui n'a rien d'un restaurant.\n\nLes domaines sont souvent à moins de trente minutes de Perpignan, dans les Aspres, l'Agly ou vers Banyuls, ce qui permet une demi-journée efficace. Prévoyez des alternatives sans alcool, et un retour organisé.",
      },
      {
        title: "Côté montagne : Canigou, Albères, Conflent",
        content:
          "En une heure de route, on passe de la mer à la moyenne montagne, et le registre change : effort, air frais, paysages qui coupent les conversations.\n\n- **Randonnée encadrée** dans les Albères ou au pied du Canigou, avec un objectif collectif et un pique-nique préparé. Le format le plus simple et l'un des plus efficaces pour les équipes de bureau.\n- **Parcours aventure ou via ferrata** pour les équipes qui aiment le défi, en petits groupes avec des professionnels diplômés.\n- **Course d'orientation** en forêt, par équipes, avec carte et balises : une métaphore du travail d'équipe que personne n'a besoin d'expliquer.\n- **Journée en Conflent ou en Cerdagne** avec le train, des activités au grand air et un repas de pays, pour un séminaire qui veut sortir de la ville.\n\nLa montagne demande une préparation sérieuse : encadrement qualifié, équipement, météo vérifiée la veille, et un niveau d'effort adapté à la personne la moins sportive du groupe, pas à la plus. Un team building où trois personnes abandonnent a fait l'inverse de ce qu'on attendait.",
      },
      {
        title: "Côté ville et ateliers : Perpignan et ses alentours",
        content:
          "Tout le monde n'a pas une journée, ni envie de transpirer. Les formats en ville ou en intérieur sont souvent les plus faciles à caler sur une demi-journée, et ils marchent très bien.\n\n- **Rallye urbain dans le centre de Perpignan** : du Castillet au Palais des rois de Majorque, des énigmes, des photos à prendre, un classement. Deux à trois heures, jusqu'à quatre-vingts personnes.\n- **Atelier de cuisine catalane** par équipes, avec un chef, suivi du repas que l'on a préparé : boles de picolat, crème catalane, rousquilles. Le format qui fait le plus parler.\n- **Escape game, murder party ou jeu de piste** sur mesure, dans un lieu privatisé, pour des groupes de dix à cinquante.\n- **Atelier créatif** : céramique, cocktail, photographie, dessin. Personne n'est expert, tout le monde produit quelque chose.\n- **Soirée privatisée** en clôture, dans un restaurant ou une salle, avec une animation légère.\n\nL'avantage de la ville est la logistique : pas de navettes, un repli en cas de pluie, des horaires maîtrisés. L'inconvénient est le décor : il faut une activité forte pour compenser un cadre banal. C'est là que la conception d'une journée fait la différence.",
      },
      {
        title: "Ce qu'une journée réussie demande en coulisses",
        content:
          "Une activité ne fait pas un team building. Ce qui le fait, c'est tout ce qui se passe autour, et que les participants ne doivent jamais voir.\n\n- **Un déroulé minuté**, avec des marges : les retards d'un car, d'un repas ou d'une activité s'additionnent.\n- **Les transports** : navettes depuis l'entreprise ou l'hôtel, points de rendez-vous, retours échelonnés si la soirée se prolonge.\n- **Les repas** adaptés à l'activité et aux régimes, au bon moment ; un déjeuner trop long tue l'après-midi.\n- **Les prestataires** briefés, assurés, avec un seul interlocuteur sur place.\n- **Le plan B météo**, décidé la veille, communiqué le matin.\n- **Un budget par personne** clair, tout compris, sans supplément découvert à la facture.\n\nC'est ce que nous faisons pour [les entreprises](/prestations/evenementiel-professionnel-perpignan), de la conception à la régie du jour, avec la même méthode que pour un mariage : un brief, un devis gratuit, un déroulé, et une équipe en coulisses pour que la vôtre n'ait qu'à profiter. Et si vous avez déjà tout prévu, nous pouvons n'intervenir que sur la logistique du jour.",
      },
    ],
    highlights: [
      "L'objectif d'abord : souder, fêter, faire travailler autrement, intégrer.",
      "Mer, vignes, montagne, ville : quatre terrains à moins d'une heure de Perpignan.",
      "Le niveau d'effort se cale sur la personne la moins sportive, pas la plus.",
      "Plan B météo, navettes, repas et déroulé minuté : la réussite est en coulisses.",
      "Chaque journée se construit sur devis, après un premier rendez-vous gratuit.",
    ],
    faq: [
      { question: "Quel budget prévoir pour un team building ?", answer: "Il se raisonne par personne et dépend du format : une demi-journée en ville sans repas et une journée en mer avec déjeuner et navettes n'ont rien à voir. Nous établissons un devis gratuit, tout compris, après un premier échange sur votre équipe et votre objectif." },
      { question: "Combien de personnes pouvez-vous accueillir ?", answer: "De dix à plus d'une centaine selon le format. Les olympiades, les rallyes et les ateliers par équipes fonctionnent bien pour les grands groupes ; les activités nautiques et la montagne se font par petits groupes encadrés, en rotation." },
      { question: "Quelle est la meilleure saison pour un team building dans les Pyrénées-Orientales ?", answer: "D'avril à juin et de septembre à octobre pour les activités de plein air : températures agréables, plages et domaines plus calmes qu'en plein été. L'hiver reste doux en plaine et convient aux formats en ville, en atelier et au chai." },
      { question: "Que se passe-t-il s'il pleut ou si la tramontane souffle ?", answer: "Un plan B est prévu dès la conception et décidé la veille : activité de repli en intérieur, horaire décalé ou terrain changé. C'est l'une des raisons de confier l'organisation à quelqu'un qui connaît le département." },
      { question: "Organisez-vous aussi le séminaire autour du team building ?", answer: "Oui. Nous prenons en charge l'événement d'entreprise dans son ensemble : lieu de séminaire, salles, hébergement, repas, soirée, et le team building comme temps fort. Ou seulement une partie, selon ce que vous avez déjà prévu." },
      { question: "Pouvez-vous n'assurer que la logistique le jour même ?", answer: "Oui, comme une coordination jour J : vous avez conçu la journée, nous reprenons le déroulé, confirmons les prestataires et gérons la régie sur place pour que vous participiez avec votre équipe au lieu de la surveiller." },
    ],
    links: [L.pro, L.prive, A.lieux, CONTACT],
  },
];

// ─── Contrôles ────────────────────────────────────────────────────────
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
function report(a: Article) {
  const body = [a.intro, ...a.sections.map((s) => s.content)].join("\n");
  const faq = a.faq.map((f) => f.question + " " + f.answer).join(" ");
  const slugs = new Set(articles.map((x) => "/" + x.slug));
  const links = [...body.matchAll(/\]\((\/[^)]+)\)/g)].map((m) => m[1]);
  const known = new Set([...Object.values(L).map((l) => l.url), "/contact", ...slugs]);
  const bad = links.filter((l) => !known.has(l));
  console.log(
    `${a.order}. ${a.slug}\n   title ${a.meta_title.length} car · meta ${a.meta_description.length} car · corps ${words(body)} mots · FAQ ${words(faq)} mots · ${a.sections.length} sections · ${a.faq.length} questions` +
      (bad.length ? `\n   LIENS INCONNUS : ${bad.join(", ")}` : ""),
  );
  if (a.meta_title.length > 60) console.log("   !! titre > 60");
  if (a.meta_description.length > 155) console.log("   !! meta > 155");
}

for (const a of articles) report(a);
if (process.argv.includes("--check")) process.exit(0);

// ─── Écriture ─────────────────────────────────────────────────────────
const sb = getSupabase();
for (const a of articles) {
  const { data: existing } = await sb
    .from("seo_pages")
    .select("id, status")
    .eq("site_key", SITE)
    .eq("slug", a.slug)
    .maybeSingle();
  if (existing && existing.status === "published") {
    console.log(`skip (published) ${a.slug}`);
    continue;
  }
  const row = {
    site_key: SITE,
    slug: a.slug,
    city: "Perpignan",
    service: null,
    page_type: "article",
    intent: "informational",
    h1: a.h1,
    meta_title: a.meta_title,
    meta_description: a.meta_description,
    status: "draft",
    content: {
      intro: a.intro,
      heroImage: a.heroImage,
      seoSections: a.sections,
      highlights: a.highlights,
      faq: a.faq,
      internalLinks: a.links,
      card: a.card,
      brief: {
        source: "seed:noia-conseils",
        main_keyword: a.main_keyword,
        secondary_keywords: a.secondary_keywords,
        publish_order: a.order,
        note:
          "Article rédigé le 2026-10-09 sur requête nationale ou locale (DataForSEO + SERP). Fourchettes de prix = ordres de grandeur du marché, jamais les tarifs Noïa (sur devis). Aucun lieu nommé. À faire valider par Kalya avant publication.",
      },
    },
  };
  const q = existing ? sb.from("seo_pages").update(row).eq("id", existing.id) : sb.from("seo_pages").insert(row);
  const { error } = await q;
  console.log(error ? `ERREUR ${a.slug}: ${error.message}` : `${existing ? "màj" : "créé"} ${a.slug}`);
}
