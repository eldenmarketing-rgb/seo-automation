/**
 * 6 articles de la rubrique Conseils de debarrashabitat.fr (site_key debarras),
 * slug `conseils/…`, page_type `article`, statut `draft`. Le site liste sur
 * /conseils toute page CMS publiée dont le slug commence par `conseils/`
 * (app/conseils/page.tsx, livré le 2026-10-19) ; l'article est rendu par
 * CmsArticle (hero + sommaire + sections markdown + points clés + FAQ + liens).
 *
 * Sujets choisis le 2026-10-19 — GSC 90 j + DataForSEO (France, suggestions +
 * SERP vérifiées, cache 30 j / 7 j) : ① encombrants à Perpignan (480/mois local,
 * SERP sans page mairie) ② prix d'un débarras au m³ (≈ 1 900/mois cumulés)
 * ③ vider une maison après un décès (≈ 1 800) ④ qui peut vider une maison
 * gratuitement (≈ 1 400, GSC déjà pos 6 sur la page débarras gratuit)
 * ⑤ syndrome de Diogène (≈ 900) ⑥ organiser un vide-maison (≈ 3 000, intention
 * vente entre particuliers). Ordre de publication = ordre du tableau.
 *
 * Faits : règles du profil `site_profiles.debarras` — on parle en « nous »,
 * jamais de personne mise en scène, aucune preuve chiffrée (ni avis, ni
 * ancienneté), aucun délai chiffré, le déroulé réel = appel → visite gratuite →
 * devis sans engagement ; le débarras gratuit est POSSIBLE quand la valeur des
 * biens couvre l'intervention, jamais promis. Les faits locaux de l'article ①
 * ont été lus le 2026-10-19 sur perpignanmediterraneemetropole.fr (badge,
 * 1 200 kg/trimestre, liste des déchèteries) et mairie-perpignan.fr /
 * carte-encombrants.com (rendez-vous Allô Propreté 0800 22 00 00, 1 m³ par
 * adresse, collecte par secteur). Les fourchettes de prix sont des ordres de
 * grandeur du marché français, présentées comme telles — À VALIDER par le user
 * avant publication, comme les mentions juridiques (succession, vente au
 * déballage), à faire confirmer par le notaire / la mairie dans le texte.
 *
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-debarras-conseils.mts            # écrit
 *   npx tsx scripts/oneshot/seed-debarras-conseils.mts --check    # contrôles seulement
 */
import { getSupabase } from "../../src/db/client";

const SITE = "debarras";
const PHONE = "07 87 18 06 18";
const CONTACT = {
  url: "/contact",
  anchor: "Demander un devis gratuit",
  context: "Un appel, une visite gratuite sur place, un devis clair et sans engagement.",
};
const L = {
  vide: {
    url: "/prestations/vide-maison-perpignan",
    anchor: "Vide maison à Perpignan",
    context: "La maison entière, du grenier à la cave, rendue vide et propre.",
  },
  succession: {
    url: "/prestations/debarras-succession-perpignan",
    anchor: "Débarras après succession",
    context: "Tri des papiers et des souvenirs, discrétion, lien avec le notaire si besoin.",
  },
  gratuit: {
    url: "/prestations/debarras-gratuit-perpignan",
    anchor: "Débarras gratuit à Perpignan",
    context: "Quand la valeur des biens récupérés couvre l'intervention. Évalué à la visite, jamais promis au téléphone.",
  },
  cave: {
    url: "/prestations/debarras-cave-grenier-garage-perpignan",
    anchor: "Débarras cave, grenier et garage",
    context: "Encombrants, vieux meubles et bric-à-brac, même en accès étroit ou en étage.",
  },
  appartement: {
    url: "/prestations/debarras-appartement-perpignan",
    anchor: "Débarras d'appartement",
    context: "Du studio au T4, avec ou sans ascenseur, prêt pour l'état des lieux.",
  },
  diogene: {
    url: "/prestations/nettoyage-diogene-perpignan",
    anchor: "Nettoyage Diogène à Perpignan",
    context: "Débarras, désinfection et remise en état d'un logement très encombré, avec discrétion.",
  },
};
const A = {
  encombrants: {
    url: "/conseils/encombrants-perpignan",
    anchor: "Encombrants à Perpignan : collecte, déchèteries, enlèvement",
    context: "Le rendez-vous gratuit de la ville, les déchèteries de la Métropole, et quand faire appel à une entreprise.",
  },
  prix: {
    url: "/conseils/prix-debarras-maison",
    anchor: "Prix d'un débarras de maison : tarifs au m³ et exemple de devis",
    context: "Les ordres de grandeur, ce qui fait varier le prix, comment lire un devis.",
  },
  deces: {
    url: "/conseils/vider-une-maison-apres-un-deces",
    anchor: "Vider une maison après un décès : étapes et délais",
    context: "Ce qu'il faut faire avant de toucher aux meubles, les délais à connaître, l'ordre des opérations.",
  },
  gratuit: {
    url: "/conseils/qui-peut-vider-une-maison-gratuitement",
    anchor: "Qui peut vider une maison gratuitement ?",
    context: "Associations, Emmaüs, acheteurs de meubles, débarras gratuit : ce que chacun prend, et ce qu'il laisse.",
  },
  diogene: {
    url: "/conseils/syndrome-de-diogene-vider-nettoyer-logement",
    anchor: "Syndrome de Diogène : vider et nettoyer le logement",
    context: "Par où commencer, les précautions, les étapes et les prix pratiqués.",
  },
  videMaison: {
    url: "/conseils/organiser-un-vide-maison",
    anchor: "Organiser un vide-maison : règles, déclaration et conseils",
    context: "La déclaration en mairie, la limite de deux ventes par an, l'annonce, et quoi faire de ce qui reste.",
  },
};

type Img = { src: string; alt: string; width: number; height: number };
const img = (file: string, alt: string, height = 853): Img => ({ src: `/images/${file}.webp`, alt, width: 1280, height });

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
  /** Mots du profil tolérés dans cet article (ex. « brocanteur » quand on compare les solutions). */
  allowWords?: string[];
};

const articles: Article[] = [
  // ───────────────────────────── 1. Encombrants à Perpignan ─────────────────────────
  {
    order: 1,
    slug: "conseils/encombrants-perpignan",
    heroImage: img("garage-encombre", "Garage encombré de meubles, de cartons et d'objets avant un débarras"),
    h1: "Encombrants à Perpignan : collecte sur rendez-vous, déchèteries et enlèvement à domicile",
    meta_title: "Encombrants à Perpignan : collecte, déchèteries, enlèvement",
    meta_description:
      "Rendez-vous gratuit avec la ville, déchèteries de la Métropole et badge, et quand faire enlever vos encombrants par une entreprise. Le guide pratique.",
    main_keyword: "encombrants perpignan",
    secondary_keywords: [
      "enlèvement encombrants perpignan",
      "déchetterie perpignan",
      "ramassage encombrants perpignan",
      "enlèvement meuble à domicile gratuit perpignan",
    ],
    card: {
      title: "Encombrants à Perpignan",
      tagline: "Collecte sur rendez-vous, déchèteries, enlèvement à domicile : les trois solutions",
      description:
        "Comment fonctionne le ramassage gratuit de la ville, ce que les déchèteries de la Métropole acceptent, et dans quels cas une entreprise de débarras est la bonne réponse.",
      badges: [],
      featured: true,
    },
    intro:
      "Un canapé qui ne rentre pas dans la voiture, un matelas, une armoire démontée, un vieux frigo : à Perpignan, se débarrasser d'un encombrant n'a rien de compliqué, à condition de savoir à qui s'adresser. Trois solutions coexistent et ne servent pas les mêmes besoins : la collecte sur rendez-vous organisée par la ville, les déchèteries de Perpignan Méditerranée Métropole, et l'enlèvement à domicile par une entreprise de débarras.\n\nNous faisons le point sur chacune, avec les règles telles qu'elles sont publiées au moment où nous écrivons. Elles évoluent : avant de sortir quoi que ce soit sur le trottoir, un coup de fil au service propreté reste la meilleure vérification.",
    sections: [
      {
        title: "Ce qu'on appelle un encombrant, et ce qui n'en est pas un",
        content:
          "Un encombrant est un déchet ménager trop volumineux ou trop lourd pour la poubelle : meubles, literie, électroménager, sanitaires, vélos, ferrailles, grands cartons. C'est ce que la ville ramasse sur rendez-vous et ce que les déchèteries accueillent dans leurs bennes dédiées.\n\nNe sont pas des encombrants au sens du service de collecte :\n\n- les **déchets de chantier et gravats** (carrelage, plâtre, briques), refusés au ramassage, à apporter en déchèterie ;\n- les **déchets dangereux** (peintures, solvants, bouteilles de gaz, amiante), qui suivent des filières spécifiques ;\n- les **déchets verts**, qui ont leur propre demande d'enlèvement à Perpignan ;\n- et bien sûr tout ce qui est déposé sur la voie publique sans rendez-vous : la Métropole le rappelle noir sur blanc, un encombrant ne se dépose pas sur le trottoir. Le dépôt sauvage est verbalisable, et c'est souvent lui qui gâche une rue entière.\n\nLa quantité compte aussi. Un service public est dimensionné pour un ou deux objets par foyer, pas pour une maison entière : c'est la limite que nous détaillons plus bas.",
      },
      {
        title: "La collecte sur rendez-vous de la ville de Perpignan",
        content:
          "Sur la commune de Perpignan, l'enlèvement des encombrants est **gratuit et se fait sur rendez-vous**. On réserve auprès d'Allô Propreté au **0800 22 00 00** (appel gratuit depuis un poste fixe) ou par la démarche en ligne accessible depuis la page « Déchets verts et encombrants » du site de la mairie. Le service confirme ensuite un jour de passage, qui dépend de votre secteur : la collecte tourne du lundi au vendredi par quartier, avec un nombre d'adresses limité par jour.\n\nLes règles à respecter, telles que publiées :\n\n- **1 m³ maximum par adresse** et par rendez-vous — grosso modo un canapé deux places, ou un matelas et une commode ;\n- on sort **uniquement les objets déclarés** lors de la réservation ;\n- on les dépose **la veille au soir** du jour confirmé, sur le trottoir devant chez soi, sans gêner le passage ;\n- pas de gravats, pas de déchets dangereux, pas de dépôt hors rendez-vous.\n\nC'est la solution idéale quand vous avez un ou deux objets à évacuer et quelques jours devant vous. Hors de la commune de Perpignan (Canet, Cabestany, Saint-Estève, Rivesaltes…), chaque mairie fixe ses propres modalités : la Métropole renvoie vers la mairie ou l'annexe de votre commune pour connaître les jours et les conditions.",
      },
      {
        title: "Les déchèteries de Perpignan Méditerranée Métropole : badge, horaires, quantités",
        content:
          "Si vous pouvez transporter vos encombrants, la déchèterie est la voie que la Métropole recommande, parce que c'est là que les déchets sont le mieux triés et valorisés. Le territoire compte **dix déchèteries communautaires et deux éco-sites**. La plus grande est celle de Perpignan, **5001F avenue Louis de Broglie**, ouverte du lundi au samedi de 8 h à 19 h et les dimanches et jours fériés de 8 h à 18 h. Les autres (Canet-en-Roussillon, Canohès, Le Barcarès, Le Soler, Rivesaltes, Saint-Estève, Saint-Hippolyte, Torreilles, Villeneuve-de-la-Raho) ouvrent en général du lundi au samedi, 8 h 30 – 12 h et 14 h – 17 h 30, avec des ouvertures le dimanche matin sur certains sites.\n\nTrois choses à savoir avant d'y aller :\n\n- **Il faut un badge.** L'accès se fait avec un badge magnétique personnel, délivré gratuitement sur demande aux particuliers, en ligne, à l'accueil de la Métropole (11 boulevard Saint-Assiscle, Perpignan) ou en mairie. Il est valable sans limite de durée et dans toutes les déchèteries du territoire.\n- **Les apports sont pesés.** Un particulier peut déposer **jusqu'à 1 200 kg par trimestre gratuitement** ; au-delà, c'est payant. Les professionnels sont facturés dès le premier kilo.\n- **Tout n'est pas accepté partout.** Les éco-sites n'acceptent que certains flux, et les pneus sont limités à quatre par an et par badge sur trois sites. Le règlement est téléchargeable sur le site de la Métropole.\n\nPour un garage ou une cave, 1 200 kg partent vite : une armoire ancienne pèse 80 à 120 kg, un canapé convertible autant, un lave-linge 70 kg. Le plafond trimestriel est fait pour l'entretien d'un foyer, pas pour vider une maison.",
        image: img("camion-evacuation", "Camion de débarras portes ouvertes, chargé de meubles et de cartons"),
      },
      {
        title: "Quand le service public ne suffit plus : l'enlèvement à domicile",
        content:
          "Il y a des situations où ni le rendez-vous de la ville ni la déchèterie ne répondent au besoin :\n\n- **le volume** dépasse de loin 1 m³ — un appartement entier, une cave pleine, un garage où l'on ne rentre plus ;\n- **le portage** est impossible : étage sans ascenseur, personne âgée, meuble trop lourd pour deux ;\n- **le délai** est contraint : un état des lieux, une signature chez le notaire, un locataire qui arrive ;\n- **le tri** est à faire : on ne sait pas ce qui se donne, ce qui se recycle, ce qui part à la benne.\n\nC'est exactement le travail d'une entreprise de débarras. Nous venons sur place, nous évaluons le volume réel et les accès, et nous remettons un devis sans engagement. Le jour venu, l'équipe démonte, porte, charge et trie : réemploi et dons aux associations locales d'abord, recyclage ensuite, déchèterie en dernier. Et si les meubles et objets récupérés ont de la valeur, elle vient en déduction du prix — c'est le principe du [débarras gratuit](/prestations/debarras-gratuit-perpignan), possible dans certains cas, jamais promis à l'avance.\n\nPour une cave, un grenier ou un garage, voyez notre page [débarras cave, grenier et garage](/prestations/debarras-cave-grenier-garage-perpignan) ; pour un logement complet, [vide maison](/prestations/vide-maison-perpignan) ou [débarras d'appartement](/prestations/debarras-appartement-perpignan). Et si la question est d'abord le prix, nous avons détaillé les ordres de grandeur dans [notre article sur le prix d'un débarras](/conseils/prix-debarras-maison).",
      },
      {
        title: "Quelle solution pour quel cas : le résumé",
        content:
          "| Votre situation | La bonne solution |\n|---|---|\n| Un ou deux meubles, quelques jours devant vous, à Perpignan | Rendez-vous gratuit Allô Propreté (1 m³ max) |\n| Un coffre de voiture ou une remorque, un badge, moins de 1 200 kg sur le trimestre | Déchèterie de la Métropole |\n| Un seul objet lourd en étage | Entreprise de débarras, ou rendez-vous ville si vous pouvez le descendre |\n| Une pièce, une cave, un garage | Entreprise de débarras |\n| Un logement entier, une date butoir | Entreprise de débarras |\n| Meubles en bon état que vous voulez donner | Association ou ressourcerie d'abord (voir [qui peut vider une maison gratuitement](/conseils/qui-peut-vider-une-maison-gratuitement)) |\n\nUn dernier conseil, valable dans tous les cas : ne laissez jamais un encombrant sur le trottoir « en attendant ». Entre la verbalisation, les récupérateurs qui éventrent le canapé pour le métal et les voisins, ça finit toujours plus mal que prévu. Un appel au 0800 22 00 00 ou au 07 87 18 06 18 règle la question en deux minutes.",
      },
    ],
    highlights: [
      "À Perpignan, la ville enlève les encombrants gratuitement sur rendez-vous : Allô Propreté 0800 22 00 00, 1 m³ par adresse, objets sortis la veille au soir.",
      "Dix déchèteries et deux éco-sites dans la Métropole, accessibles avec un badge gratuit ; 1 200 kg gratuits par trimestre pour un particulier.",
      "Gravats, déchets dangereux et dépôts hors rendez-vous ne sont jamais pris : direction la déchèterie ou une filière spécialisée.",
      "Au-delà d'un ou deux objets, ou dès qu'il y a du portage et une date butoir, l'enlèvement à domicile par une entreprise devient la solution rationnelle.",
      "Les règles publiées changent : vérifiez auprès du service propreté avant de sortir quoi que ce soit.",
    ],
    faq: [
      {
        question: "Comment prendre rendez-vous pour les encombrants à Perpignan ?",
        answer:
          "Par téléphone auprès d'Allô Propreté au 0800 22 00 00 (gratuit depuis un poste fixe) ou en ligne via la démarche « Demande de ramassage d'encombrants » du site de la mairie. Le service vous confirme un jour de passage selon votre secteur ; vous sortez les objets déclarés la veille au soir.",
      },
      {
        question: "Combien d'encombrants la ville ramasse-t-elle par rendez-vous ?",
        answer:
          "Au moment où nous écrivons, la limite publiée est de 1 m³ par adresse et par collecte, uniquement pour les objets déclarés à la réservation. Pour un volume supérieur, il faut plusieurs rendez-vous, la déchèterie ou une entreprise de débarras.",
      },
      {
        question: "Faut-il un badge pour aller à la déchèterie de Perpignan ?",
        answer:
          "Oui. Les déchèteries de Perpignan Méditerranée Métropole fonctionnent avec un badge magnétique personnel, gratuit pour les particuliers, à demander en ligne, à l'accueil de la Métropole ou en mairie. Il ouvre l'accès à toutes les déchèteries du territoire, sans limite de durée.",
      },
      {
        question: "La déchèterie est-elle gratuite pour les particuliers ?",
        answer:
          "Gratuite jusqu'à 1 200 kg de dépôts par trimestre et par badge ; au-delà, les apports sont facturés. Les véhicules sont pesés à l'entrée et à la sortie sur les sites équipés d'un pont-bascule. Les professionnels paient dès le premier kilo.",
      },
      {
        question: "J'habite Canet, Cabestany ou Saint-Estève : qui ramasse mes encombrants ?",
        answer:
          "Chaque commune de la Métropole organise son propre enlèvement. La Métropole renvoie vers la mairie ou l'annexe de votre commune pour les jours et les conditions. Les déchèteries, elles, sont communes à tout le territoire avec le même badge.",
      },
      {
        question: "Une entreprise de débarras peut-elle enlever un seul meuble ?",
        answer:
          "Oui, surtout s'il est lourd, en étage ou pressé. Nous nous déplaçons pour évaluer et remettons un devis sans engagement ; appelez-nous au 07 87 18 06 18 pour en parler. Pour un objet léger et sans urgence, le rendez-vous gratuit de la ville reste la solution la plus simple.",
      },
    ],
    links: [L.cave, L.vide, A.prix, CONTACT],
  },

  // ───────────────────────────── 2. Prix d'un débarras ─────────────────────────────
  {
    order: 2,
    slug: "conseils/prix-debarras-maison",
    heroImage: img("cartons-logement", "Cartons fermés empilés dans un logement avant un débarras", 848),
    h1: "Prix d'un débarras de maison : tarifs au m³, exemple de devis et ce qui fait varier la facture",
    meta_title: "Prix d'un débarras de maison : tarifs au m³ et devis",
    meta_description:
      "Combien coûte un débarras de maison ou d'appartement ? Prix au m³ pratiqués, exemple de devis, ce qui fait varier la facture et le cas du débarras gratuit.",
    main_keyword: "prix débarras maison",
    secondary_keywords: [
      "prix débarras m3",
      "débarras maison tarif",
      "exemple devis débarras maison",
      "tarif pour débarrasser une maison",
      "prix débarras appartement",
    ],
    card: {
      title: "Prix d'un débarras de maison",
      tagline: "Le tarif au m³, un exemple de devis, et ce qui fait varier le prix",
      description:
        "Les ordres de grandeur pratiqués en France, la façon dont un devis se construit, les cinq facteurs qui font monter ou baisser la facture, et pourquoi un débarras peut parfois être gratuit.",
      badges: [],
      featured: true,
    },
    intro:
      "« Combien ça coûte ? » est la première question qu'on nous pose au téléphone, et la seule à laquelle nous refusons de répondre à l'aveugle. Non par cachotterie : parce qu'un débarras se chiffre sur trois choses que personne ne connaît avant d'avoir vu le logement — le volume réel, les accès, et la valeur de ce qui s'y trouve.\n\nCet article donne tout ce qu'il est honnête de donner avant la visite : les tarifs au m³ que pratique le marché, un exemple de devis poste par poste, les facteurs qui font bouger le prix, et le mécanisme du débarras gratuit. Les fourchettes sont des ordres de grandeur observés en France ; votre devis, lui, sera écrit après être venus voir.",
    sections: [
      {
        title: "L'unité qui compte : le mètre cube",
        content:
          "Un débarras se facture au **volume évacué**, pas à la surface du logement. La surface donne une idée, mais un T3 de 65 m² habité quarante ans et un T3 de 65 m² meublé IKEA n'ont pas le même nombre de camions à la sortie. C'est pourquoi tout devis sérieux commence par une estimation en m³, faite sur place.\n\nQuelques repères pour vous situer :\n\n- une **cave ou un garage** encombrés : 5 à 15 m³ ;\n- un **studio ou un T1** meublé : 10 à 15 m³ ;\n- un **T2 / T3** : 15 à 30 m³ ;\n- une **maison de 90 à 120 m²** avec grenier et dépendances : 40 à 80 m³, parfois bien plus quand on accumule depuis des décennies.\n\nUn camion de débarras standard emporte de l'ordre de 15 à 20 m³ par rotation. Compter les rotations, c'est déjà comprendre une bonne part du devis.",
      },
      {
        title: "Les tarifs au m³ pratiqués par le marché",
        content:
          "En France, le **prix d'un débarras se situe le plus souvent entre 25 et 60 € par m³ TTC**, main-d'œuvre, transport et traitement des déchets compris. Les tarifs bas correspondent à un rez-de-chaussée accessible avec des objets légers ; les tarifs hauts à des étages sans ascenseur, des charges lourdes ou des déchets à trier finement.\n\nTraduit en budget, cela donne des ordres de grandeur que l'on retrouve d'un professionnel à l'autre :\n\n| Logement | Volume courant | Fourchette observée |\n|---|---|---|\n| Cave, garage, grenier | 5 – 15 m³ | 150 – 600 € |\n| Studio, T1 | 10 – 15 m³ | 300 – 700 € |\n| T2, T3 | 15 – 30 m³ | 500 – 1 500 € |\n| Maison 90 – 120 m² | 40 – 80 m³ | 1 200 – 3 500 € |\n\nCes montants s'entendent **avant déduction de la valeur des biens récupérés** (voir plus bas), et hors prestations annexes : nettoyage approfondi, dépose de moquette ou de cuisine, désinfection d'un logement insalubre. Ils sont donnés pour situer une offre, pas pour remplacer un devis. Le nôtre est gratuit, établi après visite, sans engagement.",
        image: img("piece-vide", "Pièce entièrement vidée et balayée, parquet et grandes fenêtres"),
      },
      {
        title: "Exemple de devis : un T3 au 2e étage sans ascenseur",
        content:
          "Pour rendre les choses concrètes, voici comment se lit un devis de débarras — les chiffres sont une illustration, pas une grille.\n\n| Poste | Détail | Montant |\n|---|---|---|\n| Volume à évacuer | 22 m³ estimés à la visite | 22 × 40 € = 880 € |\n| Portage en étage | 2e étage sans ascenseur | compris dans le tarif au m³ |\n| Électroménager | Réfrigérateur, lave-linge, four | compris (filière DEEE) |\n| Nettoyage de fin | Balayage, logement rendu propre | compris |\n| Reprise de biens | Buffet, table, vaisselle ancienne | − 180 € |\n| **Total** | | **700 € TTC** |\n\nTrois lignes méritent une lecture attentive sur n'importe quel devis : **ce qui est compris** (le portage, les déchets, le nettoyage de base), **ce qui est déduit** (la valeur des objets repris) et **ce qui pourrait s'ajouter** (une cave oubliée, un grenier non visité). Un devis écrit après visite ne doit pas bouger le jour J, sauf si vous ajoutez une pièce. C'est notre règle : pas de supplément découvert sur place.",
      },
      {
        title: "Les cinq facteurs qui font monter ou baisser le prix",
        content:
          "À volume égal, voici ce qui explique qu'un devis soit à 500 € et l'autre à 900 €.\n\n1. **L'accès.** Étage sans ascenseur, escalier étroit, cour intérieure, stationnement impossible devant la porte : chaque contrainte ajoute du temps de portage, donc de la main-d'œuvre.\n2. **La nature des déchets.** Du mobilier démontable coûte moins à traiter que des gravats, des pots de peinture, un vieux chauffe-eau ou de l'amiante — certains déchets suivent des filières payantes.\n3. **Le tri à faire.** Un logement où tout part à la benne va vite. Un logement où il faut mettre de côté papiers, photos, bijoux et souvenirs demande du soin, et donc du temps — c'est le cas de presque tous les [débarras après succession](/prestations/debarras-succession-perpignan).\n4. **L'état du logement.** Un logement très encombré ou insalubre se traite autrement : protections, désinfection, parfois plusieurs passages. Nous en parlons dans [notre article sur le syndrome de Diogène](/conseils/syndrome-de-diogene-vider-nettoyer-logement).\n5. **La valeur de ce qui reste.** C'est le facteur qui joue dans l'autre sens : meubles en bon état, électroménager récent, objets anciens, métaux. Leur valeur de réemploi vient en déduction.\n\nLa distance joue aussi, à la marge : nous intervenons sur Perpignan, l'agglomération et l'ensemble des Pyrénées-Orientales sans surcoût de principe ; au-delà, on en parle au téléphone.",
      },
      {
        title: "Le débarras gratuit : quand et pourquoi c'est possible",
        content:
          "Un débarras n'est jamais gratuit par magie. Il le devient **lorsque la valeur des biens récupérés couvre le coût de l'intervention** : main-d'œuvre, transport, traitement. Un appartement avec un mobilier de qualité, de l'électroménager fonctionnel et quelques objets recherchés peut être vidé sans frais ; une cave pleine de cartons humides, non.\n\nEntre les deux, le cas le plus fréquent est le **débarras partiellement compensé** : la reprise des biens réduit la facture sans l'annuler. C'est ce que montre l'exemple de devis plus haut.\n\nCe que cela implique pour vous :\n\n- personne ne peut vous promettre un débarras gratuit **par téléphone**, sans avoir vu le logement ;\n- méfiez-vous des annonces « toujours gratuit » : ou bien elles ne prennent que ce qui a de la valeur et vous laissent le reste, ou bien le prix se rattrape ailleurs ;\n- un professionnel honnête vous dit après la visite dans quel cas vous êtes : gratuit, partiellement compensé, ou chiffré.\n\nC'est exactement la promesse de notre page [débarras gratuit à Perpignan](/prestations/debarras-gratuit-perpignan). Et si vous hésitez entre donner, vendre et faire débarrasser, nous avons comparé les solutions dans [qui peut vider une maison gratuitement](/conseils/qui-peut-vider-une-maison-gratuitement).",
      },
      {
        title: "Comment obtenir un prix fiable, étape par étape",
        content:
          "1. **Appelez-nous** au 07 87 18 06 18 et décrivez la situation : type de logement, étage, ce qu'il contient, votre date butoir s'il y en a une. Nous vous donnons un premier ordre d'idée, sans engagement.\n2. **Visite gratuite sur place.** Nous mesurons le volume réel, repérons les accès et ce qui a de la valeur. Comptez une demi-heure.\n3. **Devis écrit**, poste par poste, avec ce qui est compris, ce qui est déduit, et la date proposée.\n4. **Intervention.** La plupart des débarras se traitent en une journée ; le logement est rendu vide et propre, les papiers et objets personnels mis de côté vous sont remis.\n\nUn conseil pour comparer deux devis : ramenez-les au m³ et vérifiez que les deux comprennent le portage, le traitement des déchets et le nettoyage de base. Un prix très bas qui exclut l'un des trois n'est pas un prix bas.",
      },
    ],
    highlights: [
      "Un débarras se facture au volume évacué, le plus souvent entre 25 et 60 € par m³ TTC tout compris — jamais à la surface du logement.",
      "Repères : 150 à 600 € pour une cave ou un garage, 500 à 1 500 € pour un T2-T3, 1 200 à 3 500 € pour une maison. Ordres de grandeur du marché, à confirmer par un devis.",
      "Accès, nature des déchets, tri à faire et état du logement font monter le prix ; la valeur des biens récupérés le fait baisser.",
      "Le débarras gratuit existe quand la reprise couvre l'intervention. Il se constate à la visite, jamais au téléphone.",
      "Un devis sérieux est écrit après visite et ne bouge pas le jour J.",
    ],
    faq: [
      {
        question: "Quel est le prix moyen d'un débarras de maison ?",
        answer:
          "Pour une maison de 90 à 120 m² avec ses dépendances, les devis observés en France se situent le plus souvent entre 1 200 et 3 500 € TTC avant déduction des biens repris, pour 40 à 80 m³ évacués. Le chiffre exact dépend du volume réel, des accès et de ce que contient la maison : c'est l'objet de la visite gratuite.",
      },
      {
        question: "Combien coûte un débarras au m³ ?",
        answer:
          "Entre 25 et 60 € par m³ TTC dans la plupart des cas, main-d'œuvre, transport et traitement des déchets compris. Le bas de la fourchette correspond à un accès facile et des objets légers, le haut aux étages sans ascenseur, aux charges lourdes et aux déchets à filière spécifique.",
      },
      {
        question: "Le devis est-il payant ?",
        answer:
          "Non. Nous nous déplaçons gratuitement à Perpignan et dans les Pyrénées-Orientales pour évaluer le volume, les accès et la valeur des biens, puis nous remettons un devis écrit sans engagement.",
      },
      {
        question: "Pourquoi deux entreprises proposent-elles des prix si différents ?",
        answer:
          "Souvent parce que les devis ne comprennent pas la même chose : portage en étage, traitement des déchets, nettoyage de fin, reprise des biens. Ramenez les deux au m³ et vérifiez ligne par ligne ce qui est inclus. Un prix bas qui exclut les déchets ou le portage n'est pas un prix bas.",
      },
      {
        question: "Les objets de valeur sont-ils déduits du prix ?",
        answer:
          "Oui. Meubles en bon état, électroménager fonctionnel, objets anciens ou métaux ont une valeur de réemploi que nous évaluons à la visite et déduisons du devis. Quand cette valeur couvre toute l'intervention, le débarras devient gratuit.",
      },
      {
        question: "Y a-t-il un surcoût pour un appartement en étage sans ascenseur ?",
        answer:
          "Le portage en étage est pris en compte dans le tarif au m³ que nous vous annonçons après visite : il n'apparaît pas comme un supplément découvert le jour J. C'est l'une des raisons pour lesquelles nous venons voir le logement avant de chiffrer.",
      },
    ],
    links: [L.gratuit, L.vide, L.appartement, CONTACT],
  },

  // ───────────────────────────── 3. Vider une maison après un décès ────────────────
  {
    order: 3,
    slug: "conseils/vider-une-maison-apres-un-deces",
    heroImage: img("succession", "Chambre ancienne avec meubles et papier peint d'époque, à vider après une succession", 852),
    h1: "Vider une maison après un décès : les étapes, les délais et les erreurs à éviter",
    meta_title: "Vider une maison après un décès : étapes et délais",
    meta_description:
      "Peut-on vider la maison avant la succession ? Quels délais, que garder, qui décide ? Les étapes dans l'ordre, de l'inventaire au logement rendu propre.",
    main_keyword: "vider une maison après un décès",
    secondary_keywords: [
      "vide maison après décès",
      "peut on vider une maison avant la succession",
      "délai pour vider une maison après un décès",
      "débarras succession",
      "vider un appartement après un décès",
    ],
    card: {
      title: "Vider une maison après un décès",
      tagline: "Avant ou après la succession ? Quels délais ? Dans quel ordre ?",
      description:
        "Ce qu'il faut faire avant de toucher aux meubles, les délais selon que le logement est loué ou en propriété, le tri des papiers et des souvenirs, et le moment où l'on fait appel à une entreprise.",
      badges: [],
      featured: false,
    },
    intro:
      "Vider la maison d'un parent est une tâche que personne n'a envie de faire et que tout le monde finit par faire, souvent dans la précipitation : un bailleur qui réclame les clés, une agence qui attend pour vendre, des frères et sœurs dispersés. Et au milieu, des questions auxquelles personne n'a répondu clairement — peut-on commencer avant que le notaire ait fini ? qui décide de ce qu'on garde ? y a-t-il un délai ?\n\nNous accompagnons des familles dans cette situation à Perpignan et dans les Pyrénées-Orientales. Voici l'ordre des opérations que nous conseillons, les points juridiques à vérifier avec votre notaire, et ce qu'il vaut mieux ne pas faire.",
    sections: [
      {
        title: "Avant de toucher à quoi que ce soit : les précautions",
        content:
          "Juridiquement, les meubles et objets d'un logement font partie de la succession. Tant qu'elle n'est pas réglée, ils appartiennent à l'ensemble des héritiers. Deux conséquences pratiques :\n\n- **Vendre ou donner des biens de valeur avant le règlement peut valoir acceptation de la succession.** En droit, disposer des biens du défunt est un acte qui engage ; un héritier qui hésitait à renoncer (par exemple à cause de dettes) ne pourrait plus le faire. Les gestes de simple conservation — vider le réfrigérateur, sécuriser le logement, mettre les papiers à l'abri — ne posent pas ce problème. Avant de vendre quoi que ce soit, demandez l'accord du notaire.\n- **Tous les héritiers doivent être d'accord** sur ce qui est gardé, donné, vendu ou jeté. Un tri fait seul par l'un d'eux est la source classique des conflits de famille, parfois des années après.\n\nConcrètement, avant le premier carton :\n\n1. Faites le tour du logement **avec des photos** de chaque pièce, armoires ouvertes.\n2. Rassemblez **tous les papiers** : titres de propriété, contrats, relevés, factures, courriers récents. Le notaire en aura besoin, et des documents importants se cachent dans des endroits improbables.\n3. Mettez de côté **bijoux, argent liquide, objets de valeur** et confiez-les à une personne désignée par tous.\n4. Faites une **liste partagée** de ce que chacun souhaite garder.\n\nSi le patrimoine le justifie, le notaire peut faire dresser un inventaire par un commissaire de justice : il fixe la valeur réelle du mobilier à la place du forfait de 5 % appliqué par défaut dans le calcul des droits, ce qui peut compter. Posez-lui la question.",
      },
      {
        title: "Les délais : logement loué, logement en propriété",
        content:
          "Il n'existe pas de délai légal unique pour vider une maison après un décès. Le délai réel vient de la situation du logement.\n\n**Le logement était loué.** Le décès du locataire met fin au bail, sauf transfert au conjoint ou à certains proches qui y vivaient. Jusqu'à la remise des clés, les loyers ou une indemnité d'occupation restent dus à la succession, et le bailleur attend légitimement que le logement soit libéré. En pratique, les familles disposent de quelques semaines à quelques mois ; chaque mois gagné est un loyer de moins. C'est le cas où l'on fait appel le plus vite à un [débarras d'appartement](/prestations/debarras-appartement-perpignan), avec l'état des lieux de sortie comme ligne d'arrivée.\n\n**Le logement appartenait au défunt.** Aucun délai imposé, mais une maison vide coûte : taxes, assurance, chauffage minimal, entretien, et un risque de dégradation ou de squat si elle reste inoccupée longtemps. Si la maison doit être vendue, les agences conseillent en général de la présenter vide ou presque ; si elle doit être louée, le débarras précède les travaux. La plupart des familles tranchent dans les six mois.\n\n**Le logement était en maison de retraite ou en EHPAD.** Les établissements demandent de libérer la chambre rapidement, souvent en quelques jours. Le volume est faible, mais le moment est le pire : n'hésitez pas à vous faire aider pour ce premier geste.",
      },
      {
        title: "Trier : ce qui se garde, ce qui se donne, ce qui part",
        content:
          "Le tri est l'étape longue, et celle qui use le plus. Une méthode qui fonctionne, pièce par pièce, en quatre tas :\n\n- **À garder** : ce que les héritiers ont choisi, les papiers, les photos, les objets de mémoire. Prévoyez des cartons dédiés, étiquetés au nom de chacun.\n- **À faire estimer** : meubles anciens, tableaux, argenterie, montres, collections. Ne jetez rien de ce qui vous semble « vieux » avant d'avoir demandé un avis ; inversement, ne surestimez pas le mobilier des années 70 à 90, qui n'a le plus souvent qu'une valeur de réemploi.\n- **À donner** : vêtements, vaisselle, linge, petit mobilier en bon état. Associations, ressourceries et communautés Emmaüs les reprennent — nous détaillons qui prend quoi dans [qui peut vider une maison gratuitement](/conseils/qui-peut-vider-une-maison-gratuitement).\n- **À évacuer** : tout le reste, en séparant ce qui se recycle (métaux, électroménager, bois) de ce qui part en déchèterie.\n\nDeux conseils d'expérience. D'abord, **vérifiez les poches, les livres, les doublures et les boîtes** : c'est là que se trouvent les billets, les bijoux et les lettres. Ensuite, **fixez-vous des demi-journées**, pas des week-ends entiers : le tri d'une vie est émotionnellement lourd, et c'est quand on est épuisé qu'on jette ce qu'on regrettera.",
      },
      {
        title: "Faire soi-même ou faire appel à une entreprise ?",
        content:
          "Faire soi-même convient quand le logement est petit, proche, que la famille est disponible et que le temps n'est pas compté. Il faut un véhicule, un badge de déchèterie, des bras, et accepter plusieurs semaines d'allers-retours — avec la limite de 1 200 kg par trimestre en déchèterie dans la Métropole, qu'une maison entière dépasse vite (voir [notre guide des encombrants à Perpignan](/conseils/encombrants-perpignan)).\n\nFaire appel à une entreprise de débarras s'impose quand :\n\n- la maison est **pleine** — grenier, cave, dépendances, décennies d'accumulation ;\n- les héritiers sont **loin** ou ne peuvent pas porter ;\n- il y a une **date butoir** : état des lieux, compromis de vente, remise des clés ;\n- le tri demande **du soin** : papiers, souvenirs, objets à mettre de côté.\n\nNotre façon de faire sur un [débarras après succession](/prestations/debarras-succession-perpignan) : visite gratuite avec la personne qui représente la famille, devis écrit, puis intervention en une journée dans la plupart des cas. Papiers, bijoux et objets personnels trouvés pendant le débarras sont **systématiquement mis de côté et remis** ; les biens en bon état partent en réemploi et en don avant le recyclage ; leur valeur vient en déduction du prix. Le logement est rendu vide et propre, prêt pour l'état des lieux, les visites ou la signature. Si le notaire a besoin d'un justificatif ou d'une attestation de libération des lieux, nous nous en chargeons.",
      },
      {
        title: "Les erreurs que nous voyons le plus souvent",
        content:
          "- **Jeter avant de chercher.** Les papiers importants, les carnets d'épargne, les bijoux sont rarement dans le tiroir prévu pour ça.\n- **Vendre « pour avancer » avant l'accord du notaire**, et bloquer une renonciation ou créer un litige entre héritiers.\n- **Laisser une personne tout décider.** Même quand les autres disent « fais comme tu veux », faites-les valider la liste de ce qui est gardé.\n- **Sous-estimer le volume.** Une maison de 100 m² habitée quarante ans, c'est souvent 50 à 80 m³. Prévoyez-le, ou faites-le chiffrer (voir [prix d'un débarras](/conseils/prix-debarras-maison)).\n- **Laisser le logement ouvert et plein** pendant des mois. Une maison inoccupée mais meublée attire les problèmes.\n- **S'imposer de tout faire soi-même** par devoir. Confier le portage et l'évacuation n'enlève rien au soin que vous mettez dans le tri.\n\nSi vous ne savez pas par où commencer, appelez-nous au 07 87 18 06 18 : nous vous dirons franchement ce qui relève de vous, du notaire, et de nous.",
      },
    ],
    highlights: [
      "Les meubles font partie de la succession : vendre ou donner des biens de valeur avant le règlement peut valoir acceptation. Les gestes de conservation, eux, sont libres.",
      "Pas de délai légal unique : un logement loué se libère au rythme des loyers dus, un logement en propriété coûte chaque mois qu'il reste plein.",
      "Photos de chaque pièce, papiers rassemblés, objets de valeur confiés à une personne désignée, liste partagée entre héritiers : les quatre gestes avant le premier carton.",
      "Trier en quatre tas — garder, faire estimer, donner, évacuer — par demi-journées, jamais dans l'épuisement.",
      "Une entreprise de débarras prend le portage, l'évacuation et le tri des souvenirs à mettre de côté ; le logement est rendu vide et propre.",
    ],
    faq: [
      {
        question: "Peut-on vider une maison avant que la succession soit réglée ?",
        answer:
          "On peut sécuriser le logement, rassembler les papiers et trier ; c'est même conseillé. En revanche, vendre ou donner des biens ayant de la valeur avant le règlement peut être considéré comme une acceptation de la succession et engager l'héritier. Demandez l'accord du notaire avant toute vente et faites valider la liste de ce qui est gardé par tous les héritiers.",
      },
      {
        question: "Y a-t-il un délai pour vider un appartement loué après un décès ?",
        answer:
          "Le décès du locataire met fin au bail, sauf transfert au conjoint ou à certains proches. Tant que les clés ne sont pas rendues, loyers ou indemnité d'occupation restent dus à la succession : il n'y a pas de délai imposé, mais chaque mois coûte. La plupart des familles libèrent le logement en quelques semaines à quelques mois.",
      },
      {
        question: "Que faire des papiers trouvés dans la maison ?",
        answer:
          "Rassemblez-les tous sans trier dans un premier temps — titres, contrats, relevés, factures, courriers — et remettez-les au notaire ou à la personne qui gère la succession. Pendant un débarras, nous mettons systématiquement de côté les papiers, photos et objets personnels que nous trouvons et nous vous les remettons.",
      },
      {
        question: "Les meubles anciens ont-ils de la valeur ?",
        answer:
          "Parfois. Faites estimer avant de jeter ce qui vous semble ancien : certains meubles, tableaux, argenterie ou collections se vendent. Le mobilier courant des années 70 à 90 n'a le plus souvent qu'une valeur de réemploi, que nous déduisons tout de même du prix du débarras.",
      },
      {
        question: "Combien coûte un débarras après décès ?",
        answer:
          "Comme tout débarras, au volume évacué : de quelques centaines d'euros pour un appartement à plusieurs milliers pour une maison pleine, avant déduction des biens repris. Le devis est gratuit et écrit après visite. Les ordres de grandeur sont détaillés dans notre article sur le prix d'un débarras.",
      },
      {
        question: "Pouvez-vous intervenir si les héritiers n'habitent pas la région ?",
        answer:
          "Oui, c'est fréquent. Une seule personne — un héritier, le notaire, un voisin de confiance — nous ouvre pour la visite puis le jour du débarras ; le devis, les photos et le compte rendu circulent par email ou WhatsApp. Le logement est rendu vide et propre, et nous remettons ce qui a été mis de côté à qui vous nous indiquez.",
      },
    ],
    links: [L.succession, L.appartement, A.gratuit, CONTACT],
  },

  // ───────────────────────────── 4. Qui peut vider une maison gratuitement ─────────
  {
    order: 4,
    slug: "conseils/qui-peut-vider-une-maison-gratuitement",
    heroImage: img("debarras-gratuit", "Objets anciens, vaisselle et meubles récupérés lors d'un débarras"),
    h1: "Qui peut vider une maison gratuitement ? Associations, Emmaüs, acheteurs de meubles et débarras gratuit",
    meta_title: "Qui peut vider une maison gratuitement ? Les vraies options",
    meta_description:
      "Emmaüs, associations, acheteurs de meubles, entreprises de débarras : qui vide une maison sans frais, à quelles conditions, et ce que chacun laisse.",
    main_keyword: "association qui vide les maisons gratuitement",
    secondary_keywords: [
      "qui peut vider une maison gratuitement",
      "association qui débarrasse les maisons",
      "emmaüs vide maison",
      "vider une maison emmaus",
      "brocanteur pour vider maison",
      "débarras maison gratuit",
    ],
    allowWords: ["brocante"],
    card: {
      title: "Qui peut vider une maison gratuitement ?",
      tagline: "Associations, Emmaüs, acheteurs de meubles, débarras gratuit : ce que chacun prend vraiment",
      description:
        "Les solutions qui existent pour vider un logement sans payer, leurs conditions réelles, ce qu'elles laissent sur place, et comment les combiner intelligemment.",
      badges: [],
      featured: false,
    },
    intro:
      "La question revient dans presque tous nos appels : « est-ce que quelqu'un peut vider la maison gratuitement ? ». La réponse honnête tient en une phrase : **oui pour une partie du contenu, rarement pour la totalité**. Les associations prennent ce qui se réutilise, les acheteurs ce qui se revend, et il reste toujours ce qui n'intéresse personne — c'est précisément ce qui coûte.\n\nVoici qui fait quoi, à quelles conditions, et comment combiner ces solutions pour payer le moins possible, ou rien du tout quand la maison s'y prête.",
    sections: [
      {
        title: "Emmaüs et les communautés : la collecte à domicile de ce qui se réutilise",
        content:
          "Les communautés Emmaüs vivent de la revente de ce qu'on leur donne. Beaucoup d'entre elles proposent une **collecte à domicile gratuite** pour les meubles et objets en bon état, sur rendez-vous, selon leurs tournées et leur secteur. Dans les Pyrénées-Orientales, renseignez-vous auprès de la communauté la plus proche : les conditions (secteur couvert, délai, volume minimum) varient d'un lieu à l'autre.\n\nCe qu'il faut comprendre :\n\n- ils prennent **ce qui se revend en l'état** — meubles propres et solides, électroménager fonctionnel, vaisselle, livres, bibelots, vêtements ;\n- ils refusent **ce qui est cassé, sale, démodé au point d'être invendable, ou trop lourd** à sortir pour leur équipe (gros buffets en étage, par exemple) ;\n- la collecte se fait **à leur rythme**, parfois plusieurs semaines après l'appel.\n\nC'est une excellente première étape quand vous avez du temps et du mobilier correct. Ce n'est pas une solution pour vider une maison : après le passage, il reste en général la moitié des choses — et tout ce qui est dans la cave.",
      },
      {
        title: "Associations, ressourceries, Secours populaire : qui prend quoi",
        content:
          "Autour d'Emmaüs existe tout un réseau qui reprend des dons, chacun avec sa spécialité :\n\n- les **ressourceries et recycleries** reprennent meubles, objets, électroménager, parfois en venant les chercher ; elles réparent et revendent à petit prix ;\n- le **Secours populaire**, la **Croix-Rouge**, le **Secours catholique** acceptent surtout vêtements, linge, vaisselle, jouets, petit électroménager, le plus souvent en dépôt dans leurs locaux ;\n- les **bornes textile** (Le Relais et autres) prennent vêtements, chaussures et linge, même usés, en sacs fermés ;\n- les **bibliothèques et boîtes à livres** reprennent les livres en bon état.\n\nAucune association ne « vide une maison » : chacune prend une catégorie, à condition d'apporter ou d'attendre une tournée. Si vous avez le temps, c'est la voie la plus utile socialement et la moins chère. Comptez tout de même plusieurs semaines, un véhicule, et des bras.",
      },
      {
        title: "Acheteurs de meubles, antiquaires, dépôts-vente : la valeur contre le vide",
        content:
          "Les brocanteurs, antiquaires et dépôts-vente vident gratuitement une maison **quand elle contient de quoi les rémunérer** : mobilier ancien, argenterie, tableaux, montres, collections, objets de métier. Certains proposent un « débarras complet contre le contenu » : ils emportent tout, se paient sur ce qui se vend.\n\nCe modèle est honnête quand la maison a de la valeur, et il est à son avantage quand elle en a beaucoup — vous cédez alors des biens qui valent plus que le débarras. Deux précautions :\n\n- faites **estimer séparément** ce qui pourrait avoir de la valeur avant d'accepter un forfait global ;\n- vérifiez ce qu'ils font **du reste** : les objets sans valeur, la cave, les déchets. Beaucoup les laissent sur place, et vous vous retrouvez avec un logement à moitié vide et le même problème qu'au départ.\n\nQuand la maison ne contient rien de recherché — ce qui est le cas le plus courant pour un logement meublé dans les années 70 à 2000 — aucun acheteur ne se déplacera.",
      },
      {
        title: "Le débarras gratuit par une entreprise : le mécanisme, sans promesse",
        content:
          "Une entreprise de débarras vit de la main-d'œuvre, du transport et du traitement des déchets. Elle peut rendre une intervention gratuite **quand la valeur de ce qu'elle récupère couvre ces coûts** : meubles en bon état revendus en réemploi, électroménager fonctionnel, métaux, objets anciens. C'est une équation, pas une faveur.\n\nLe plus souvent, l'équation donne un résultat intermédiaire : la reprise réduit la facture sans l'annuler. Pour un logement avec du mobilier de qualité, elle peut l'annuler ; pour une cave pleine de cartons, elle ne joue pas. Nous expliquons comment nous l'évaluons sur notre page [débarras gratuit à Perpignan](/prestations/debarras-gratuit-perpignan), et comment un devis se construit dans [prix d'un débarras de maison](/conseils/prix-debarras-maison).\n\nTrois signaux pour reconnaître une offre sérieuse :\n\n1. on vous dit **après la visite**, pas au téléphone, dans quel cas vous êtes : gratuit, partiellement compensé, chiffré ;\n2. l'entreprise prend **tout**, y compris ce qui n'a pas de valeur, et rend le logement vide et propre ;\n3. ce qui a de la valeur part en **réemploi** et pas à la benne — c'est la condition pour que la gratuité tienne.\n\nMéfiez-vous des promesses « toujours gratuit » ou « gratuit garanti » : ou bien elles ne portent que sur ce qui se revend, ou bien le prix se cache ailleurs.",
      },
      {
        title: "La bonne stratégie : combiner, dans le bon ordre",
        content:
          "Pour payer le moins possible, l'ordre des étapes compte plus que le choix d'un seul interlocuteur :\n\n1. **Triez d'abord ce que la famille garde** — papiers, souvenirs, objets choisis (voir [vider une maison après un décès](/conseils/vider-une-maison-apres-un-deces) si c'est le contexte).\n2. **Faites estimer** ce qui semble avoir de la valeur, séparément.\n3. **Donnez** ce qui se réutilise aux associations, si vous avez le temps d'attendre leurs tournées.\n4. **Faites chiffrer le reste** par une entreprise de débarras, en précisant ce qui a déjà été retiré : moins il reste de valeur, moins la gratuité est possible, mais moins il y a de volume aussi.\n\nSi vous n'avez pas le temps — état des lieux, vente, héritiers éloignés — faites l'inverse : appelez l'entreprise en premier, elle intègre le don et le réemploi dans son travail, et vous n'avez qu'un seul rendez-vous. C'est notre façon de faire : réemploi et dons aux associations locales d'abord, recyclage ensuite, déchèterie en dernier, et la valeur récupérée déduite du devis.\n\nDans tous les cas, un appel au 07 87 18 06 18 vous donne une réponse franche sur ce qui peut être gratuit chez vous, et sur ce qui ne le sera pas.",
      },
    ],
    highlights: [
      "Personne ne vide une maison entière gratuitement : les associations prennent ce qui se réutilise, les acheteurs ce qui se revend, et le reste coûte.",
      "Emmaüs et les ressourceries collectent à domicile les meubles en bon état, sur rendez-vous, à leur rythme ; les autres associations reprennent surtout en dépôt.",
      "Les acheteurs de meubles anciens vident gratuitement quand la maison contient de la valeur ; faites estimer séparément et vérifiez ce qu'ils font du reste.",
      "Le débarras gratuit par une entreprise est une équation — valeur récupérée contre coût de l'intervention — constatée à la visite, jamais promise au téléphone.",
      "Trier, faire estimer, donner, puis chiffrer le reste : l'ordre qui coûte le moins quand on a le temps. L'entreprise d'abord quand on ne l'a pas.",
    ],
    faq: [
      {
        question: "Emmaüs vient-il vider une maison gratuitement ?",
        answer:
          "Les communautés Emmaüs collectent gratuitement à domicile les meubles et objets en bon état qu'elles pourront revendre, sur rendez-vous et selon leur secteur. Elles ne prennent ni ce qui est cassé ou invendable, ni les déchets, et n'ont pas vocation à vider un logement entier. Renseignez-vous auprès de la communauté la plus proche pour ses conditions.",
      },
      {
        question: "Existe-t-il une association qui débarrasse les maisons entièrement ?",
        answer:
          "À notre connaissance, non : chaque association reprend une catégorie de dons — meubles, vêtements, livres, vaisselle — en bon état. Pour tout évacuer, y compris ce qui n'intéresse personne, il faut une entreprise de débarras, dont l'intervention peut être gratuite si la valeur des biens repris couvre son coût.",
      },
      {
        question: "Un brocanteur peut-il vider une maison contre le contenu ?",
        answer:
          "Oui, quand la maison contient des biens recherchés : mobilier ancien, argenterie, tableaux, collections. Avant d'accepter un forfait global, faites estimer séparément les pièces de valeur, et vérifiez qu'il emporte aussi le reste. Sans objets recherchés, aucun acheteur ne se déplace.",
      },
      {
        question: "Dans quels cas un débarras est-il vraiment gratuit ?",
        answer:
          "Quand la valeur de réemploi des meubles, de l'électroménager et des objets récupérés couvre la main-d'œuvre, le transport et le traitement des déchets. C'est fréquent pour un logement bien meublé, rare pour une cave ou un grenier. Nous le constatons à la visite gratuite et nous vous le disons avant toute intervention.",
      },
      {
        question: "Comment se méfier des faux débarras gratuits ?",
        answer:
          "Une offre qui promet la gratuité par téléphone, sans visite, ou « dans tous les cas », repose soit sur une sélection — on prend ce qui se revend, on laisse le reste — soit sur un prix rattrapé ailleurs. Exigez un devis écrit après visite qui précise ce qui est compris, ce qui est déduit, et que le logement sera rendu vide.",
      },
      {
        question: "Vous déplacez-vous gratuitement pour évaluer ?",
        answer:
          "Oui, à Perpignan et dans l'ensemble des Pyrénées-Orientales. À l'issue de la visite, vous savez dans quel cas vous êtes — gratuit, partiellement compensé ou chiffré — avec un devis écrit sans engagement.",
      },
    ],
    links: [L.gratuit, L.vide, A.prix, CONTACT],
  },

  // ───────────────────────────── 5. Syndrome de Diogène ────────────────────────────
  {
    order: 5,
    slug: "conseils/syndrome-de-diogene-vider-nettoyer-logement",
    heroImage: img("cave-garage", "Local très encombré d'objets, de cartons et d'outils, avant débarras"),
    h1: "Syndrome de Diogène : comment vider et nettoyer le logement, étape par étape",
    meta_title: "Syndrome de Diogène : vider et nettoyer le logement",
    meta_description:
      "Logement envahi par les objets : par où commencer, précautions, étapes du débarras et du nettoyage, prix pratiqués, et comment agir avec respect.",
    main_keyword: "nettoyage syndrome de diogène",
    secondary_keywords: [
      "débarras diogène",
      "tarif nettoyage diogène",
      "nettoyage diogène prix",
      "logement insalubre que faire",
      "vider un logement très encombré",
    ],
    card: {
      title: "Syndrome de Diogène : vider et nettoyer",
      tagline: "Par où commencer, les précautions, les étapes et les prix",
      description:
        "Un logement envahi se traite autrement qu'un débarras ordinaire : protections, tri des objets importants, désinfection, parfois plusieurs passages. Le déroulé, les précautions et les ordres de grandeur.",
      badges: [],
      featured: false,
    },
    intro:
      "On découvre souvent la situation d'un coup : une porte qui s'ouvre sur des piles de journaux, des sacs, des objets accumulés jusqu'au plafond, parfois des déchets et des odeurs. Un parent, un voisin, un locataire. Le syndrome de Diogène est un terme médical que nous n'avons pas vocation à expliquer ; ce dont nous pouvons parler, c'est de ce qui vient après la prise de conscience — vider, nettoyer et rendre le logement habitable, sans brutaliser la personne concernée.\n\nCe guide s'adresse aux familles, aux voisins, aux bailleurs et aux travailleurs sociaux qui se retrouvent devant ce logement et se demandent par où commencer.",
    sections: [
      {
        title: "Avant tout : la personne, pas le logement",
        content:
          "Quand l'occupant vit encore sur place, le débarras n'est jamais la première étape. L'accumulation n'est pas de la négligence ; vider le logement de force est vécu comme une violence et aboutit presque toujours à une nouvelle accumulation. Avant de parler de camion :\n\n- parlez-en au **médecin traitant**, qui peut évaluer la situation et orienter ;\n- contactez le **CCAS de la commune** ou les services sociaux du département : ils connaissent ces situations et peuvent accompagner la personne, parfois financer une partie de l'intervention ;\n- si la personne est âgée ou isolée, les **services d'aide à domicile** et l'entourage proche sont les relais naturels ;\n- en cas de danger immédiat (risque d'incendie, insalubrité qui menace l'immeuble), la mairie dispose de pouvoirs de police et peut intervenir.\n\nL'objectif est d'obtenir **l'accord de la personne**, ou de son représentant légal, sur ce qui va être fait. Un débarras accepté, même partiel, tient ; un débarras subi se refait six mois plus tard.\n\nQuand le logement est vide de son occupant — décès, hospitalisation longue, déménagement en établissement — la question se déplace vers la famille ou le bailleur, et l'on peut passer aux étapes pratiques.",
      },
      {
        title: "Les précautions avant d'entrer",
        content:
          "Un logement très encombré n'est pas un logement ordinaire plus sale. Il présente des risques précis :\n\n- **sanitaires** : moisissures, déjections, nuisibles (rongeurs, cafards, punaises), parfois des seringues ou des médicaments ;\n- **physiques** : sols instables sous les piles, objets qui s'effondrent, planchers fragilisés par l'humidité, électricité défaillante ;\n- **respiratoires** : poussières accumulées sur des années, ammoniac, spores.\n\nSi vous entrez vous-même, équipez-vous : **gants épais, masque FFP2, chaussures fermées à semelle rigide, vêtements couvrants**, et ouvrez tout ce qui peut s'ouvrir avant de commencer. Ne branchez rien avant d'avoir vérifié le tableau électrique. Et fixez-vous un objectif modeste : la première visite sert à repérer, pas à vider.\n\nSi le logement contient des déchets organiques, des traces de nuisibles ou une forte odeur, c'est le signal qu'il faut passer la main à une équipe équipée pour le [nettoyage Diogène](/prestations/nettoyage-diogene-perpignan) : combinaisons, matériel de désinfection, filières de déchets adaptées.",
      },
      {
        title: "Les étapes d'un débarras et d'un nettoyage Diogène",
        content:
          "Voici comment se déroule une intervention complète, telle que nous la menons :\n\n1. **Visite et diagnostic.** On évalue le volume (souvent le double de ce qu'on imagine : un T2 envahi peut représenter 40 m³), les risques, les accès, et surtout **ce qu'il faut absolument retrouver** : papiers, argent, bijoux, photos, objets auxquels la personne tient. Devis écrit, sans engagement.\n2. **Sécurisation.** Protection des parties communes, ventilation, parfois traitement contre les nuisibles avant toute manipulation.\n3. **Débarras par couches.** On vide pièce par pièce, en triant au fur et à mesure : objets à conserver mis de côté dans des contenants dédiés, biens réutilisables séparés, déchets par filière (organiques, encombrants, électroménager, dangereux). C'est l'étape longue, et celle où l'on trouve ce qu'on cherchait.\n4. **Nettoyage et désinfection.** Une fois les sols dégagés : évacuation des résidus, lavage, désinfection des surfaces, traitement des odeurs, parfois dépose des revêtements trop imprégnés (moquette, lino).\n5. **Remise en état de base.** Le logement est rendu vide, propre et aéré, prêt pour des travaux, une remise en location ou un retour de l'occupant dans de meilleures conditions.\n\nSelon l'état des lieux, l'intervention tient en une journée ou en demande plusieurs. Nous le disons au devis, pas après.",
        image: img("piece-vide", "Pièce entièrement vidée et nettoyée, parquet et grandes fenêtres"),
      },
      {
        title: "Combien ça coûte : les ordres de grandeur",
        content:
          "Un nettoyage Diogène se chiffre en deux parties, qu'un devis sérieux distingue :\n\n- **le débarras**, au volume évacué, dans les mêmes ordres de grandeur qu'un débarras classique mais avec un volume souvent très supérieur et des déchets plus coûteux à traiter — voir [prix d'un débarras de maison](/conseils/prix-debarras-maison) ;\n- **le nettoyage et la désinfection**, au m² ou au forfait, qui dépendent du degré d'insalubrité : d'un grand nettoyage à une désinfection complète avec traitement des nuisibles.\n\nEn France, les interventions complètes sur un appartement se situent le plus souvent **entre 1 500 et 6 000 € TTC**, parfois davantage pour une maison entière très dégradée. Ces chiffres sont des ordres de grandeur du marché, pas un tarif : chaque logement est différent, et c'est la visite qui permet d'écrire un prix. La valeur des objets récupérables, quand il y en a, vient en déduction, comme pour tout débarras.\n\nSachez que des aides existent dans certains cas : le CCAS, le conseil départemental ou la caisse de retraite peuvent participer quand la personne est âgée ou en situation de handicap, et un bailleur social dispose parfois de ses propres dispositifs. Posez la question avant de renoncer.",
      },
      {
        title: "Le jour J et après : respect, discrétion, et ce qui ne se jette pas",
        content:
          "Deux engagements que nous tenons sur chaque intervention de ce type :\n\n- **La discrétion.** Pas de camion marqué en grand devant l'immeuble, pas de commentaires, des horaires convenus avec vous. La situation est déjà assez lourde pour la personne et pour ses voisins.\n- **Rien d'important ne part à la benne.** Papiers administratifs, argent, bijoux, photos, souvenirs, objets désignés par la famille ou la personne : tout est mis de côté et remis. Dans un logement envahi, ces objets sont partout et nulle part ; les chercher fait partie du travail, pas d'une option.\n\nAprès l'intervention, le logement est propre mais la situation ne l'est pas forcément. Si la personne y revient, un accompagnement — aide à domicile, suivi social, passages réguliers — évite la rechute bien mieux qu'un second débarras. Si le logement est rendu à un bailleur ou vendu, l'étape suivante est celle des travaux, et notre rôle s'arrête à un logement vide, désinfecté et prêt.\n\nPour en parler, sans jugement et sans engagement : 07 87 18 06 18.",
      },
    ],
    highlights: [
      "Quand l'occupant vit sur place, l'accord de la personne et le relais du médecin ou du CCAS passent avant tout débarras : un logement vidé de force se remplit à nouveau.",
      "Gants, masque FFP2, chaussures rigides, aération, pas de branchement avant vérification : les précautions minimales pour entrer.",
      "Diagnostic, sécurisation, débarras par couches avec tri des objets importants, nettoyage-désinfection, remise en état : les cinq étapes, en une ou plusieurs journées.",
      "Ordres de grandeur du marché : 1 500 à 6 000 € TTC pour un appartement, débarras et désinfection compris ; des aides existent via le CCAS ou le département.",
      "Discrétion et objets personnels mis de côté sont les deux engagements qui comptent le plus pour les familles.",
    ],
    faq: [
      {
        question: "Par qui commencer quand un proche accumule chez lui ?",
        answer:
          "Par le médecin traitant et le CCAS de la commune, qui peuvent évaluer la situation, accompagner la personne et parfois aider à financer l'intervention. Le débarras vient ensuite, avec l'accord de la personne ou de son représentant. Nous pouvons vous conseiller par téléphone sur l'ordre des démarches.",
      },
      {
        question: "Combien coûte un nettoyage après syndrome de Diogène ?",
        answer:
          "Le marché se situe le plus souvent entre 1 500 et 6 000 € TTC pour un appartement, débarras et désinfection compris, davantage pour une maison très dégradée. Le prix dépend du volume, du degré d'insalubrité et des déchets à traiter : nous l'écrivons après une visite gratuite, sans engagement.",
      },
      {
        question: "Peut-on obtenir une aide financière ?",
        answer:
          "Dans certains cas, oui : CCAS, conseil départemental, caisses de retraite ou dispositifs des bailleurs sociaux peuvent participer, surtout quand la personne est âgée, isolée ou en situation de handicap. Faites la demande avant l'intervention, avec le devis à l'appui.",
      },
      {
        question: "Que deviennent les papiers, l'argent et les objets personnels ?",
        answer:
          "Ils sont systématiquement recherchés, mis de côté dans des contenants dédiés et remis à la personne ou à la famille. Dans un logement envahi, c'est une partie importante du travail, que nous intégrons au devis.",
      },
      {
        question: "Combien de temps dure l'intervention ?",
        answer:
          "Une journée pour un logement moyennement encombré, plusieurs quand le volume est très important ou que la désinfection demande des passages successifs. Nous l'annonçons dans le devis, après visite, plutôt que de promettre un délai à l'aveugle.",
      },
      {
        question: "Intervenez-vous pour un bailleur ou un syndic ?",
        answer:
          "Oui. Logement rendu après un départ ou un décès, injonction de la mairie, plainte de voisinage : nous intervenons à la demande du propriétaire, du bailleur ou du syndic, avec le même souci de discrétion vis-à-vis de l'immeuble, et nous remettons un compte rendu si nécessaire.",
      },
    ],
    links: [L.diogene, L.appartement, A.prix, CONTACT],
  },

  // ───────────────────────────── 6. Organiser un vide-maison ───────────────────────
  {
    order: 6,
    slug: "conseils/organiser-un-vide-maison",
    heroImage: img("vide-maison", "Pièce sous les combles remplie de meubles et de vêtements à trier"),
    h1: "Organiser un vide-maison : déclaration en mairie, règles, annonce et ce qu'on fait du reste",
    meta_title: "Organiser un vide-maison : règles, déclaration, conseils",
    meta_description:
      "Déclaration en mairie, deux ventes par an, annonce, prix, sécurité, et quoi faire de ce qui n'est pas parti : le mode d'emploi d'un vide-maison réussi.",
    main_keyword: "comment organiser un vide maison",
    secondary_keywords: [
      "organiser un vide maison",
      "vide maison comment faire",
      "cerfa vide-maison",
      "autorisation vide maison",
      "affiche vide maison",
    ],
    card: {
      title: "Organiser un vide-maison",
      tagline: "Déclaration en mairie, règles, annonce, prix, et le sort de ce qui reste",
      description:
        "Un vide-maison est une vente au déballage : il se déclare, il est limité à deux par an, et il ne vide jamais tout. Le mode d'emploi, des formalités au lendemain de la vente.",
      badges: [],
      featured: false,
    },
    intro:
      "Un vide-maison, c'est ouvrir sa porte (ou son garage, ou son jardin) un week-end pour vendre ce qu'on ne garde pas : meubles, vaisselle, outils, vêtements, livres. C'est la solution préférée de ceux qui déménagent, qui vident la maison d'un parent ou qui veulent simplement faire de la place en récupérant quelques centaines d'euros.\n\nC'est aussi, juridiquement, une **vente au déballage**, avec des formalités simples mais obligatoires, et une limite que beaucoup ignorent. Voici comment l'organiser dans les règles, le faire savoir, le réussir, et — point que personne n'anticipe — quoi faire de tout ce qui n'est pas parti le dimanche soir.",
    sections: [
      {
        title: "Les règles : déclaration en mairie et deux ventes par an",
        content:
          "Un particulier qui vend des objets personnels usagés chez lui organise une **vente au déballage** au sens du Code de commerce. Ce que cela implique :\n\n- une **déclaration préalable en mairie**, au moyen du formulaire officiel (cerfa de « déclaration préalable d'une vente au déballage »), déposée en général **au moins quinze jours avant** la date, avec une pièce d'identité. Beaucoup de mairies proposent la démarche en ligne ou par courrier ; certaines demandent plus d'anticipation : renseignez-vous auprès de la vôtre ;\n- la limite de **deux ventes au déballage par an et par personne**, que vous attestez sur l'honneur dans la déclaration. Les vide-greniers auxquels vous participez comptent dans ces deux fois ;\n- l'obligation de ne vendre que **des objets personnels et usagés** : pas de marchandise achetée pour être revendue, pas d'activité commerciale déguisée ;\n- la vente a lieu **sur votre propriété** ; déborder sur le trottoir ou la rue relève d'une occupation du domaine public, à demander séparément.\n\nUne vente non déclarée peut être verbalisée. C'est rare, mais une seule plainte de voisin suffit. La déclaration ne coûte rien, prend dix minutes, et vous permet d'annoncer la date sereinement. Ces règles sont celles en vigueur au moment où nous écrivons : votre mairie reste la référence.",
      },
      {
        title: "Préparer la vente : trier, étiqueter, fixer les prix",
        content:
          "Un vide-maison se prépare comme une petite boutique éphémère, et c'est la préparation qui fait la différence entre 150 € et 800 € de recettes.\n\n- **Triez en trois** : ce que vous gardez (hors de vue, pièce fermée), ce que vous vendez, ce qui ne vaut pas la peine d'être proposé (voir plus bas).\n- **Nettoyez** : un meuble dépoussiéré se vend, un meuble sale se négocie à moitié prix ou ne part pas.\n- **Étiquetez tout** avec un prix. Les visiteurs n'osent pas demander et repartent. Prévoyez des étiquettes de couleur par tranche de prix pour aller vite.\n- **Fixez des prix réalistes** : un vide-maison n'est pas une salle des ventes. Comptez 10 à 30 % du prix neuf pour du mobilier courant en bon état, quelques euros pour la vaisselle et les livres, et faites estimer à part ce qui pourrait avoir une vraie valeur — ne bradez pas un meuble ancien à 40 € parce qu'il est encombrant.\n- **Préparez la monnaie**, un carnet pour noter les ventes, des sacs et des cartons pour les acheteurs, et si possible un moyen de paiement par téléphone : beaucoup de visiteurs n'ont plus d'espèces.\n- **Organisez le parcours** : les grosses pièces visibles depuis l'entrée, les petits objets sur des tables, les vêtements sur un portant. Et fermez les pièces qui ne sont pas à vendre.",
      },
      {
        title: "Faire venir du monde : annonce, affiche, réseaux",
        content:
          "Un vide-maison sans visiteurs est une journée perdue. Tout se joue dans les dix jours qui précèdent :\n\n- **les sites spécialisés** qui recensent les vide-maisons par département et par week-end : c'est là que cherchent les habitués, et l'annonce y est gratuite ;\n- **les sites de petites annonces** avec quelques photos des plus belles pièces et la liste des catégories (mobilier, outils, vaisselle, jardin…) ;\n- **les groupes locaux sur les réseaux sociaux** — quartier, commune, « vide-maison 66 » — où une annonce bien faite tourne vite ;\n- **l'affiche** : sobre, lisible de loin, avec la date, les horaires, l'adresse et deux ou trois mots sur ce qu'on y trouve. Un format A3 pour les commerces du quartier qui acceptent de l'afficher, un A4 dans votre boîte aux lettres et chez les voisins. Attention : l'affichage sur les poteaux, les panneaux de signalisation et le mobilier urbain est interdit et verbalisable.\n\nPrécisez dans l'annonce si les grosses pièces sont à emporter sur place (la plupart des acheteurs viennent en voiture, pas en camion) et si vous acceptez les paiements par téléphone. Les visiteurs les plus décidés arrivent dès l'ouverture, parfois avant : soyez prêts une heure en avance.",
      },
      {
        title: "Le jour J : sécurité, négociation, bon sens",
        content:
          "Quelques règles qui évitent les mauvaises surprises :\n\n- **Soyez au moins deux**, l'un à l'entrée, l'autre dans la maison. Les objets qui disparaissent partent presque toujours pendant qu'on rend la monnaie.\n- **Rangez** bijoux, papiers, clés, téléphones et sacs à main hors de portée, dans une pièce fermée à clé.\n- **Acceptez la négociation**, c'est le jeu, mais fixez-vous un prix plancher par objet et tenez-le le matin ; l'après-midi, baissez franchement sur ce qui n'est pas parti.\n- **Ne laissez personne seul** dans une pièce, et refusez poliment les visites des pièces fermées.\n- **Prévoyez l'enlèvement** : un acheteur qui promet de revenir chercher l'armoire « la semaine prochaine » revient une fois sur trois. Demandez un acompte, ou mieux, l'emport immédiat.\n\nEt gardez en tête l'objectif. Un vide-maison sert à vider, pas à faire fortune : à 17 h, un buffet parti à 20 € vaut mieux qu'un buffet toujours là.",
      },
      {
        title: "Le dimanche soir : ce qui reste, et ce qu'on en fait",
        content:
          "C'est l'étape que personne ne prévoit, et pourtant la règle est constante : **un vide-maison ne vide jamais tout**. Il reste la moitié des objets, la vaisselle dépareillée, les vêtements, les meubles lourds, la cave, le grenier — tout ce que les visiteurs ne voulaient pas, et ce que vous n'aviez pas mis en vente.\n\nDans l'ordre, pour s'en débarrasser au meilleur coût :\n\n1. **Donner** ce qui se réutilise : associations, ressourceries, communautés Emmaüs (qui collectent parfois à domicile), bornes textile. Nous avons détaillé qui prend quoi dans [qui peut vider une maison gratuitement](/conseils/qui-peut-vider-une-maison-gratuitement).\n2. **Évacuer** ce qui ne se réutilise pas : déchèterie avec le badge de la Métropole, ou rendez-vous encombrants de la ville pour un ou deux objets — voir [notre guide des encombrants à Perpignan](/conseils/encombrants-perpignan).\n3. **Faire débarrasser le reste** quand le volume dépasse ce qu'une voiture et un week-end peuvent absorber, ou quand une date butoir approche : déménagement, remise des clés, vente de la maison. C'est le cas typique de notre prestation [vide maison à Perpignan](/prestations/vide-maison-perpignan) : nous emportons tout, nous trions pour le réemploi et le recyclage, et nous rendons la maison vide et propre. La valeur de ce qui est encore récupérable vient en déduction du devis — après un vide-maison, elle est souvent faible, mais le volume aussi.\n\nUn conseil pratique : si vous savez dès le départ que la maison doit être entièrement vidée à une date donnée, appelez-nous **avant** le vide-maison. Nous vous dirons ce qui vaut la peine d'être vendu, ce qui peut être donné, et nous calerons le passage du camion pour le lendemain. Vous gardez les recettes de la vente, et la maison est vide le lundi. 07 87 18 06 18.",
      },
    ],
    highlights: [
      "Un vide-maison est une vente au déballage : déclaration préalable en mairie (cerfa), en général quinze jours avant, et deux ventes par an au maximum par personne.",
      "On ne vend que des objets personnels usagés, chez soi ; déborder sur le trottoir demande une autorisation d'occupation du domaine public.",
      "La préparation fait la recette : tout étiqueté, prix réalistes (10 à 30 % du neuf), pièces à vendre visibles, pièces gardées fermées.",
      "Annonce sur les sites de vide-maisons et les groupes locaux dix jours avant ; affiche chez les commerçants, jamais sur le mobilier urbain.",
      "Un vide-maison ne vide jamais tout : donner, évacuer, puis faire débarrasser le reste — idéalement calé pour le lendemain de la vente.",
    ],
    faq: [
      {
        question: "Faut-il une autorisation pour faire un vide-maison chez soi ?",
        answer:
          "Il faut une déclaration préalable de vente au déballage, déposée en mairie avec le formulaire cerfa prévu à cet effet et une pièce d'identité, en général au moins quinze jours avant la date. Ce n'est pas une demande d'autorisation à proprement parler mais une déclaration obligatoire, gratuite, sans laquelle la vente peut être verbalisée. Votre mairie précise le délai et la procédure.",
      },
      {
        question: "Combien de vide-maisons peut-on organiser par an ?",
        answer:
          "Deux ventes au déballage par an et par personne, vide-greniers compris, attestées sur l'honneur dans la déclaration. Au-delà, l'administration considère qu'il s'agit d'une activité commerciale.",
      },
      {
        question: "Peut-on vendre des objets neufs ou achetés pour l'occasion ?",
        answer:
          "Non. Un particulier ne peut vendre que des objets personnels et usagés. Revendre des marchandises achetées pour l'occasion relève du commerce et n'est pas couvert par la déclaration de vente au déballage.",
      },
      {
        question: "Où annoncer un vide-maison dans les Pyrénées-Orientales ?",
        answer:
          "Sur les sites qui recensent les vide-maisons par département et par week-end, sur les sites de petites annonces avec photos, et dans les groupes locaux sur les réseaux sociaux. Complétez par une affiche chez les commerçants du quartier et un mot dans les boîtes aux lettres voisines, sans affichage sur le mobilier urbain.",
      },
      {
        question: "Que faire des meubles qui ne se sont pas vendus ?",
        answer:
          "Donnez ce qui se réutilise aux associations et ressourceries, évacuez le reste en déchèterie ou via le rendez-vous encombrants de la ville pour un ou deux objets, et faites débarrasser quand le volume ou le délai dépasse vos moyens. Nous pouvons passer dès le lendemain de la vente, sur devis gratuit.",
      },
      {
        question: "Vaut-il mieux faire un vide-maison ou appeler directement une entreprise de débarras ?",
        answer:
          "Si vous avez le temps, l'énergie et de belles pièces, le vide-maison rapporte quelques centaines d'euros et fait plaisir aux acheteurs. Si la maison doit être vide à une date proche, ou si le contenu a peu de valeur de revente, l'entreprise de débarras vous fait gagner des semaines ; la valeur des biens récupérables est de toute façon déduite du devis. Les deux se combinent très bien : la vente le week-end, le camion le lundi.",
      },
    ],
    links: [L.vide, A.gratuit, A.encombrants, CONTACT],
  },
];

// ─── Contrôles ────────────────────────────────────────────────────────
const WORDS_TO_AVOID = [
  "pas cher",
  "discount",
  "meilleur prix",
  "numéro 1",
  "leader",
  "le meilleur",
  "garanti",
  "certifié",
  "agréé",
  "assuré",
  "ans d’expérience",
  "ans d'expérience",
  "depuis 20 ans",
  "24h/24",
  "7j/7",
  "sous 24h",
  "sous 48h",
  "en 1h",
  "urgence 24h",
  "toujours gratuit",
  "100 % gratuit",
  "remise à neuf",
  "le gérant",
  "le patron",
  "chef d’équipe",
  "chef d'équipe",
  "rachat de meubles",
  "brocante",
];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
function report(a: Article) {
  const body = [a.intro, ...a.sections.map((s) => s.content)].join("\n");
  const faq = a.faq.map((f) => f.question + " " + f.answer).join(" ");
  const everything = [a.h1, a.meta_title, a.meta_description, body, faq, ...a.highlights].join("\n").toLowerCase();
  const slugs = new Set(articles.map((x) => "/" + x.slug));
  const links = [...body.matchAll(/\]\((\/[^)]+)\)/g)].map((m) => m[1]);
  const known = new Set([...Object.values(L).map((l) => l.url), "/contact", ...slugs]);
  const bad = links.filter((l) => !known.has(l));
  // Les mots interdits ne sont tolérés que quand on compare des solutions tierces (allowWords) ;
  // « toujours gratuit » / « gratuit garanti » apparaissent seulement comme mises en garde entre guillemets.
  const avoided = WORDS_TO_AVOID.filter((w) => !(a.allowWords ?? []).includes(w)).filter((w) => {
    const re = new RegExp(`(?<![«"])\\s?${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![»"])`, "i");
    return everything.includes(w) && re.test(everything.replace(/« ?[^»]* ?»/g, ""));
  });
  console.log(
    `${a.order}. ${a.slug}\n   title ${a.meta_title.length} car · meta ${a.meta_description.length} car · corps ${words(body)} mots · FAQ ${words(faq)} mots · ${a.sections.length} sections · ${a.faq.length} questions · ${links.length} liens dans le corps` +
      (bad.length ? `\n   LIENS INCONNUS : ${bad.join(", ")}` : "") +
      (avoided.length ? `\n   MOTS À ÉVITER : ${avoided.join(", ")}` : ""),
  );
  if (a.meta_title.length > 60) console.log("   !! titre > 60");
  if (a.meta_description.length > 155) console.log("   !! meta > 155");
  if (a.faq.length !== 6) console.log("   !! FAQ ≠ 6");
}

for (const a of articles) report(a);
if (process.argv.includes("--check")) process.exit(0);

// ─── Écriture ─────────────────────────────────────────────────────────
const sb = getSupabase();
const { data: hub } = await sb.from("seo_pages").select("id").eq("site_key", SITE).eq("slug", "conseils").maybeSingle();
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
    parent_id: hub?.id ?? null,
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
        source: "seed:debarras-conseils",
        main_keyword: a.main_keyword,
        secondary_keywords: a.secondary_keywords,
        publish_order: a.order,
        note:
          "Article rédigé le 2026-10-19 (GSC + DataForSEO + SERP). Faits locaux (collecte Allô Propreté, déchèteries, badge, 1 200 kg/trimestre) lus sur les sites de la Métropole et de la ville le 2026-10-19. Fourchettes de prix = ordres de grandeur du marché, à valider avant publication ; mentions juridiques (succession, vente au déballage) formulées avec renvoi au notaire / à la mairie. Téléphone " +
          PHONE +
          ".",
      },
    },
  };
  const q = existing ? sb.from("seo_pages").update(row).eq("id", existing.id) : sb.from("seo_pages").insert(row);
  const { error } = await q;
  console.log(error ? `ERREUR ${a.slug}: ${error.message}` : `${existing ? "màj" : "créé"} ${a.slug}`);
}
