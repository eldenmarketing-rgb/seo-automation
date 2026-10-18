/**
 * Brouillons des 24 fiches produit de « Livraison de Nuit » (site_key `nuit`, slug
 * `produit/<slug>`) — version 2 (2026-10-18) : chaque fiche porte un texte qui n'existe
 * nulle part ailleurs (ni sur Mon Sauveur, ni sur les 23 autres fiches) : intro, deux
 * sections propres au produit (comment le boire ce soir, ce qu'il faut savoir), une FAQ
 * de 2-3 questions propres au produit, et un maillage vers le rayon, la formule et les
 * pages livraison. Le paragraphe de service identique à toutes les fiches de la v1 a
 * disparu : horaires, délai et paiement sont déjà rendus par le gabarit de la fiche.
 *
 * Faits produit = ce que la marque dit publiquement (origine, type, degré, format).
 * Faits service = 20h-4h, ~30 min, paiement à la porte, vente aux majeurs. Aucune
 * mention de pièce d'identité (friction, décision user 2026-10-18). Prix et stock =
 * table `products`, jamais recopiés dans le texte. Pose aussi l'attribut `marque`
 * (schéma Product → brand) sur les produits qui en ont une.
 *
 * Statut `draft`. Idempotent, n'écrase jamais une fiche publiée.
 *
 *   npx tsx scripts/oneshot/seed-nuit-produits.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "nuit";
const DATE = new Date().toISOString().slice(0, 10);

type Link = { url: string; anchor: string; context: string };
type Fiche = {
  slug: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  intro: string;
  sections: { title: string; content: string }[];
  faq: { question: string; answer: string }[];
  links: Link[];
};

const cat = (slug: string, anchor: string): Link => ({ url: `/categorie/${slug}`, anchor, context: "Tout le rayon." });
const prod = (slug: string, anchor: string, context: string): Link => ({ url: `/produit/${slug}`, anchor, context });
const APERO: Link = { url: "/livraison/apero-de-nuit-perpignan", anchor: "Apéro de nuit à Perpignan", context: "Bouteilles, softs et snacks livrés en une commande." };
const EPICERIE: Link = { url: "/livraison/epicerie-de-nuit-perpignan", anchor: "Épicerie de nuit à Perpignan", context: "Ce qui manque quand tout est fermé." };

/** Marque posée dans `products.attributes.marque` (schéma Product → brand). */
const MARQUES: Record<string, string> = {
  "poliakov-70cl": "Poliakov",
  "absolut-70cl": "Absolut",
  "label-5-70cl": "Label 5",
  "johnnie-walker-70cl": "Johnnie Walker",
  "captain-morgan-70cl": "Captain Morgan",
  "ricard-70cl": "Ricard",
  "jet-27-70cl": "Get 27",
  "malibu-70cl": "Malibu",
  "baileys-70cl": "Baileys",
  "heineken-33cl": "Heineken",
  "pringles-original": "Pringles",
  "pringles-cream-onion": "Pringles",
  "pringles-hot": "Pringles",
  "m-ms-45g": "M&M's",
  "m-ms-330g": "M&M's",
  "fraises-tagada": "Haribo",
  "haribo-schtroumpfs": "Haribo",
  mars: "Mars",
  snickers: "Snickers",
};

const fiches: Fiche[] = [
  // ───────────────────────────── Vodkas ─────────────────────────────
  {
    slug: "produit/poliakov-70cl",
    h1: "Vodka Poliakov 70 cl livrée la nuit à Perpignan",
    meta_title: "Vodka Poliakov 70 cl livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Poliakov 70 cl livrée chez vous à Perpignan et alentours de 20h à 4h,. Seule ou en formule avec un Crazy Tiger 1 L. Commande par téléphone.",
    intro:
      "La Poliakov est la vodka qu'on nous demande le plus une fois les supermarchés fermés. Vodka française à 37,5 %, triple distillée, au goût neutre et net : elle ne prend pas le dessus sur ce qu'on lui ajoute, et c'est exactement ce qu'on attend d'elle à minuit.\n\nBouteille de 70 cl, livrée fermée à Perpignan et dans les communes voisines, avec ou sans le soft qui va avec.",
    sections: [
      {
        title: "Comment la boire ce soir",
        content:
          "Le classique de nos livraisons, c'est le vodka-énergisant : une dose de Poliakov pour trois ou quatre de Crazy Tiger, beaucoup de glace. C'est précisément le contenu de notre [formule Poliakov](/produit/formule-poliakov), la bouteille et son litre de Crazy Tiger dans la même commande.\n\nElle tient aussi bien en vodka-orange, en vodka-tonic ou en shot sorti du congélateur. Si vous voulez un jus ou un soft précis, dites-le au téléphone : on vous confirme ce qui est disponible ce soir.",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Poliakov est une marque française, produite et embouteillée en France, et l'une des vodkas les plus vendues du pays. Son degré de 37,5 % la rend un peu plus légère qu'une vodka à 40 % comme l'[Absolut](/produit/absolut-70cl), que nous livrons aussi, plus ronde et plus chère.\n\nElle se garde à température ambiante avant ouverture ; pour la boire pure, une heure au congélateur suffit. Tout le [rayon vodkas](/categorie/vodkas) est livrable aux mêmes horaires.",
      },
    ],
    faq: [
      { question: "Vous livrez le Crazy Tiger avec ?", answer: "Oui, c'est la formule Poliakov : la bouteille de 70 cl et un Crazy Tiger de 1 L dans la même commande. Un autre soft se demande au téléphone." },
      { question: "Elle arrive fraîche ?", answer: "La vodka se livre à température ambiante, fermée. Pour la boire glacée, comptez une heure au congélateur ; en mélange, les glaçons suffisent." },
      { question: "Je peux en commander plusieurs ?", answer: "Oui, dites la quantité au téléphone : on confirme le total avant de partir." },
    ],
    links: [prod("formule-poliakov", "Formule Poliakov", "La bouteille et son Crazy Tiger 1 L."), prod("absolut-70cl", "Absolut 70 cl", "La vodka suédoise, plus ronde."), cat("vodkas", "Vodkas"), APERO],
  },
  {
    slug: "produit/absolut-70cl",
    h1: "Vodka Absolut 70 cl livrée la nuit à Perpignan",
    meta_title: "Absolut Vodka 70 cl livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Absolut 70 cl, la vodka suédoise, livrée chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, total confirmé avant le départ.",
    intro:
      "Absolut, c'est la vodka suédoise à la bouteille en forme de flacon d'apothicaire, sans étiquette papier, le texte imprimé à même le verre. Distillée à Åhus, dans le sud de la Suède, à partir de blé d'hiver et d'eau de source locale, elle titre 40 % et garde un léger goût de céréale.\n\nC'est la vodka qu'on choisit quand on veut la boire pure ou dans un vrai cocktail, pas seulement la noyer dans un soft. Bouteille de 70 cl.",
    sections: [
      {
        title: "Comment la boire ce soir",
        content:
          "Pure et très froide, elle se tient toute seule. En long drink, l'Absolut-tonic avec un quartier de citron vert est le plus simple à réussir à 1h du matin ; le vodka-cranberry et le Moscow Mule (vodka, ginger beer, citron vert) suivent de près.\n\nAvec son soft dans la même commande, c'est la [formule Absolut](/produit/formule-absolut) ; le contenu exact de l'accompagnement vous est confirmé au téléphone.",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Absolut est produite depuis 1879 dans le village d'Åhus, par distillation continue : une seule distillerie, une seule source d'eau, un seul blé. La bouteille de 70 cl est le format standard de la marque en France.\n\nSi vous cherchez une vodka de mélange moins chère, la [Poliakov](/produit/poliakov-70cl) fait le travail. Le [rayon vodkas](/categorie/vodkas) se livre aux mêmes horaires que le reste.",
      },
    ],
    faq: [
      { question: "Absolut ou Poliakov, laquelle prendre ?", answer: "Absolut pour la boire pure, sur glace ou en cocktail : plus ronde, 40 %. Poliakov pour les mélanges avec un soft ou un énergisant : plus neutre, moins chère." },
      { question: "Vous avez le tonic ou le ginger beer avec ?", answer: "Les softs se commandent au téléphone avec la bouteille, et la formule Absolut en comprend un. On vous dit ce qui est disponible ce soir." },
      { question: "C'est bien l'Absolut classique, pas une aromatisée ?", answer: "Oui, l'Absolut Vodka originale, non aromatisée, en 70 cl." },
    ],
    links: [prod("formule-absolut", "Formule Absolut", "La bouteille et son soft."), prod("poliakov-70cl", "Poliakov 70 cl", "La vodka de soirée, moins chère."), cat("vodkas", "Vodkas"), APERO],
  },
  // ───────────────────────────── Whiskys ─────────────────────────────
  {
    slug: "produit/label-5-70cl",
    h1: "Whisky Label 5 70 cl livré la nuit à Perpignan",
    meta_title: "Whisky Label 5 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Label 5, blended scotch 70 cl, livré chez vous à Perpignan et alentours de 20h à 4h. Le whisky du whisky-coca de soirée. Commande par téléphone.",
    intro:
      "Label 5 est un blended scotch whisky, un assemblage de whiskies de grain et de single malts écossais, vieilli en Écosse et titré à 40 %. Doux, léger, un peu vanillé : il n'a aucune prétention et c'est sa qualité quand la soirée a déjà commencé.\n\nC'est le whisky le plus accessible de notre rayon, en bouteille de 70 cl, et celui qu'on commande pour le whisky-coca.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "Une dose de Label 5, trois de coca, de la glace et une rondelle de citron : le whisky-coca qui a fait sa réputation. Il passe aussi en whisky-ginger ale, plus sec, ou simplement sur glaçons pour ceux qui le préfèrent sans sucre.\n\nLe coca ou le soft se commande au téléphone avec la bouteille. Pour un blend avec plus de caractère, regardez le [Johnnie Walker](/produit/johnnie-walker-70cl).",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Label 5 appartient à un groupe français mais se distille, s'assemble et s'embouteille en Écosse, comme l'exige l'appellation scotch whisky. Il fait partie des scotchs les plus vendus en France depuis des années.\n\nLa bouteille se garde debout, à l'abri de la lumière, et ne bouge pas une fois ouverte. Tout le [rayon whiskys](/categorie/whiskys) se livre de 20h à 4h.",
      },
    ],
    faq: [
      { question: "Label 5 ou Johnnie Walker ?", answer: "Label 5 pour le whisky-coca et le budget, Johnnie Walker pour un blend plus fumé et plus marqué, agréable sur glace. Les deux sont des scotchs à 40 % en 70 cl." },
      { question: "Vous livrez le coca avec ?", answer: "Oui, demandez-le au téléphone avec la bouteille : on vous confirme la disponibilité et le total avant de partir." },
    ],
    links: [prod("johnnie-walker-70cl", "Johnnie Walker 70 cl", "Le blend le plus connu au monde."), cat("whiskys", "Whiskys"), cat("formules", "Formules"), APERO],
  },
  {
    slug: "produit/johnnie-walker-70cl",
    h1: "Whisky Johnnie Walker 70 cl livré la nuit à Perpignan",
    meta_title: "Johnnie Walker 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Johnnie Walker, blended scotch 70 cl, livré chez vous à Perpignan et alentours de 20h à 4h. Sur glace ou allongé. Commande par téléphone.",
    intro:
      "Johnnie Walker est le scotch le plus vendu au monde, reconnaissable à sa bouteille carrée, son étiquette inclinée et son homme qui marche. Un blended whisky écossais à 40 %, assemblé à partir de malts et de grains de toute l'Écosse, avec cette pointe fumée qui le distingue des blends plus doux.\n\nBouteille de 70 cl, livrée fermée, pour une soirée où l'on veut un whisky qu'on reconnaît au premier verre.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "Sur glace, c'est là qu'il donne le plus : la fumée s'adoucit, les fruits secs ressortent. Allongé au ginger ale (le « Johnnie & Ginger ») ou au coca, il reste bien présent sans être rugueux.\n\nIl existe aussi en [formule Johnnie Walker](/produit/formule-johnnie-walker), avec son accompagnement dans la même commande. Un whisky plus doux et moins cher pour les mélanges ? Le [Label 5](/produit/label-5-70cl).",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "La maison a été fondée par John Walker, épicier à Kilmarnock, dans les années 1820, et son whisky est aujourd'hui exporté dans presque tous les pays. La référence que nous livrons vous est confirmée au téléphone au moment de la commande.\n\nLa bouteille se garde debout et à l'abri de la lumière. Tout le [rayon whiskys](/categorie/whiskys) part aux mêmes horaires.",
      },
    ],
    faq: [
      { question: "Quelle version de Johnnie Walker livrez-vous ?", answer: "La référence disponible ce soir vous est dite au téléphone au moment de la commande, avant de confirmer le total." },
      { question: "Avec quoi l'allonger ?", answer: "Ginger ale pour rester sur le fumé, coca pour la version sucrée, ou simplement de la glace. Le soft se commande avec la bouteille." },
      { question: "Je veux un whisky moins cher pour un whisky-coca ?", answer: "Prenez le Label 5 : même degré, plus doux, et le prix le plus accessible du rayon." },
    ],
    links: [prod("formule-johnnie-walker", "Formule Johnnie Walker", "La bouteille et son soft."), prod("label-5-70cl", "Label 5 70 cl", "Le blend accessible."), cat("whiskys", "Whiskys"), APERO],
  },
  // ───────────────────────────── Rhum ─────────────────────────────
  {
    slug: "produit/captain-morgan-70cl",
    h1: "Rhum Captain Morgan 70 cl livré la nuit à Perpignan",
    meta_title: "Captain Morgan 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Captain Morgan, rhum épicé des Caraïbes en 70 cl, livré chez vous à Perpignan et alentours de 20h à 4h. La base du rhum-coca. Commande par téléphone.",
    intro:
      "Captain Morgan Original Spiced Gold est un rhum épicé des Caraïbes : un rhum ambré infusé d'épices et de vanille, titré à 35 %, doux et sucré en bouche. Il ne se boit pas comme un rhum vieux ; il est fait pour le mélange, et il y excelle.\n\nBouteille de 70 cl, livrée fermée à Perpignan et dans les communes voisines, tous les soirs.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "Le « Captain & Cola » : une dose de rhum, trois de coca, glace, un quartier de citron vert pressé. C'est le cocktail de la marque et celui que nos clients commandent le plus. Il marche aussi avec du ginger beer ou du jus d'ananas pour une version plus tropicale.\n\nAvec son soft dans la même commande, c'est la [formule Captain Morgan](/produit/formule-captain-morgan).",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "La marque porte le nom d'Henry Morgan, corsaire gallois du XVIIe siècle devenu gouverneur de la Jamaïque. Le rhum est produit à partir de mélasse de canne, vieilli puis infusé avec des épices : d'où sa couleur dorée et son nez de vanille.\n\nLe [rayon rhums](/categorie/rhums) et le [rayon apéritifs et liqueurs](/categorie/aperitifs-liqueurs) partent aux mêmes horaires, de 20h à 4h.",
      },
    ],
    faq: [
      { question: "Vous livrez le coca avec le Captain Morgan ?", answer: "Oui : commandez la formule Captain Morgan, ou demandez le soft de votre choix au téléphone avec la bouteille." },
      { question: "C'est un rhum fort ?", answer: "Non, c'est un rhum épicé à 35 %, plus doux qu'un rhum blanc à 40 % ou plus. Sucré, vanillé, il est conçu pour les mélanges." },
    ],
    links: [prod("formule-captain-morgan", "Formule Captain Morgan", "Le rhum et son accompagnement."), cat("rhums", "Rhums"), cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), APERO],
  },
  // ───────────────────────── Apéritifs et liqueurs ─────────────────────────
  {
    slug: "produit/ricard-70cl",
    h1: "Ricard 70 cl livré la nuit à Perpignan",
    meta_title: "Ricard 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pastis Ricard 70 cl livré chez vous à Perpignan et alentours de 20h à 4h. L'apéro du sud, même à minuit. Commande par téléphone, paiement à la livraison.",
    intro:
      "Le Ricard, c'est le pastis de Marseille : anis étoilé, réglisse et plantes de Provence, 45 %, créé par Paul Ricard en 1932. Il se trouble en jaune pâle dès qu'on ajoute l'eau, et c'est ce trouble qui signale que l'apéro commence, à 19h comme à 1h du matin.\n\nBouteille de 70 cl, livrée fermée à Perpignan et autour, tous les soirs.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "La règle marseillaise : un volume de Ricard pour cinq volumes d'eau bien fraîche, les glaçons après l'eau, jamais avant, pour ne pas figer l'anis. Pour un « mauresque », ajoutez un trait de sirop d'orgeat ; pour un « perroquet », de la menthe.\n\nPrévoyez de l'eau fraîche et des glaçons chez vous : nous livrons la bouteille, le reste de l'apéro se complète dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Le pastis est une boisson anisée à 45 % qui contient au moins 2 g de réglisse par litre : c'est ce qui le distingue d'un anis sec. Le Ricard est le pastis le plus vendu de France et de loin.\n\nLa bouteille se conserve à température ambiante, ouverte ou non. Les autres bouteilles d'apéritif sont dans le [rayon apéritifs et liqueurs](/categorie/aperitifs-liqueurs).",
      },
    ],
    faq: [
      { question: "Vous livrez l'eau et les glaçons ?", answer: "Nous livrons la bouteille de Ricard. L'eau et les glaçons ne sont pas au catalogue : demandez au téléphone ce qui est disponible ce soir en softs." },
      { question: "Combien de verres dans une bouteille de 70 cl ?", answer: "À 2 cl de pastis par verre, une bouteille de 70 cl fait environ 35 verres, allongés d'eau." },
    ],
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("jet-27-70cl", "Get 27 70 cl", "La menthe glacée."), cat("bieres", "Bières"), APERO],
  },
  {
    slug: "produit/jet-27-70cl",
    h1: "Get 27 70 cl livré la nuit à Perpignan",
    meta_title: "Get 27 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Get 27, liqueur de menthe en 70 cl, livrée chez vous à Perpignan et alentours de 20h à 4h. Sur glace ou allongée. Commande par téléphone.",
    intro:
      "Le Get 27 est la liqueur de menthe verte française, 21 %, née à Revel, dans le Lauragais, en 1796. Sucrée, puissamment mentholée, elle se boit toujours glacée et réveille une fin de repas comme un début de nuit.\n\nBouteille de 70 cl, livrée fermée, pour ceux qui veulent autre chose qu'un alcool fort ou une bière.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "Pur sur beaucoup de glaçons, il est à son meilleur quand il est presque sirupeux de froid. Allongé de tonic, de limonade ou d'eau gazeuse avec du citron vert, il devient un long drink frais à moins de 10 %. Le « Get-tonic » est devenu un classique de terrasse qu'on peut très bien boire sur un canapé.\n\nIl se marie aussi avec le chocolat : un [Mars](/produit/mars) ou un [Snickers](/produit/snickers) à côté, ce n'est pas une faute.",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Le « 27 » vient du degré d'origine de la recette ; la version actuelle titre 21 %. La liqueur est élaborée à partir de plusieurs variétés de menthe, et se garde sans problème une fois ouverte, de préférence au frais pour être prête à servir.\n\nLes autres liqueurs sont dans le [rayon apéritifs et liqueurs](/categorie/aperitifs-liqueurs).",
      },
    ],
    faq: [
      { question: "Il arrive froid ?", answer: "Non, la bouteille est livrée à température ambiante. Mettez-la au congélateur une heure, ou servez-le sur beaucoup de glaçons." },
      { question: "C'est fort ?", answer: "21 %, soit deux fois moins qu'une vodka ou un whisky. Allongé au tonic, le verre descend sous 10 %." },
    ],
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("malibu-70cl", "Malibu 70 cl", "Rhum et noix de coco."), prod("baileys-70cl", "Baileys 70 cl", "Crème de whisky."), APERO],
  },
  {
    slug: "produit/malibu-70cl",
    h1: "Malibu 70 cl livré la nuit à Perpignan",
    meta_title: "Malibu 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Malibu 70 cl, liqueur de rhum à la noix de coco, livré chez vous à Perpignan et alentours de 20h à 4h. Avec de l'ananas ou de l'orange.",
    intro:
      "Le Malibu est une liqueur à base de rhum des Caraïbes et de noix de coco, 21 %, douce et sucrée, dans sa bouteille blanche au palmier. On ne le boit jamais pur très longtemps : il est fait pour les jus de fruits et les cocktails de plage, qu'on peut très bien improviser à 1h du matin à Perpignan.\n\nBouteille de 70 cl, livrée fermée, tous les soirs.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "Malibu-ananas, à parts égales ou une dose de Malibu pour deux de jus : le plus demandé. Malibu-orange, Malibu-cranberry, ou Malibu-coca pour une version plus sombre. Avec du jus d'ananas et une touche de crème de coco, on tient une piña colada sans sortir le shaker.\n\nLe jus ou le soft se demande au téléphone avec la bouteille ; on vous dit ce qui est disponible ce soir.",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Malibu est née à la Barbade, où le rhum qui la compose est toujours produit, avant d'être assemblée avec l'arôme de noix de coco. Sa faible teneur en alcool en fait la bouteille des invités qui ne veulent pas d'un alcool fort.\n\nPour un rhum plus classique, le [Captain Morgan](/produit/captain-morgan-70cl) ; pour la fin de soirée, le [Baileys](/produit/baileys-70cl). Tout le [rayon apéritifs et liqueurs](/categorie/aperitifs-liqueurs) se livre aux mêmes horaires.",
      },
    ],
    faq: [
      { question: "Vous livrez le jus d'ananas avec ?", answer: "Les jus et les softs se commandent au téléphone avec la bouteille, selon ce qui est disponible ce soir. Le total est confirmé avant le départ." },
      { question: "Le Malibu se garde combien de temps une fois ouvert ?", answer: "Plusieurs mois, bouteille fermée et au frais : la liqueur est stable, mais son parfum de coco s'estompe avec le temps." },
    ],
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("captain-morgan-70cl", "Captain Morgan 70 cl", "Le rhum épicé."), prod("baileys-70cl", "Baileys 70 cl", "Pour la fin de soirée."), APERO],
  },
  {
    slug: "produit/baileys-70cl",
    h1: "Baileys 70 cl livré la nuit à Perpignan",
    meta_title: "Baileys 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Baileys 70 cl, crème de whisky irlandais, livré chez vous à Perpignan et alentours de 20h à 4h. Sur glace ou dans un café. Commande par téléphone.",
    intro:
      "Le Baileys est la crème de whisky irlandais originale, créée à Dublin en 1974 : whiskey irlandais, crème fraîche et cacao, 17 %. C'est une bouteille de fin de soirée plus que d'apéro, celle qu'on sort avec le dessert ou à la place du dessert.\n\nBouteille de 70 cl, livrée fermée à Perpignan et dans les communes voisines.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "Pur, sur deux ou trois glaçons, c'est la façon la plus simple et la plus courante. Versé dans un café chaud, il remplace le lait et le sucre ; sur une boule de glace vanille, il remplace le coulis. Il se marie bien avec un [Mars](/produit/mars) ou des [M&M's](/produit/m-ms-45g) à côté.\n\nÉvitez de le mélanger à un soft acide (coca, jus d'agrumes) : la crème tourne.",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "La crème est irlandaise, le whiskey aussi, et la marque garantit deux ans de conservation bouteille fermée. Une fois ouvert, gardez-le au frais et finissez-le dans les six mois.\n\nPour quelque chose de plus frais, le [Get 27](/produit/jet-27-70cl) ; de plus exotique, le [Malibu](/produit/malibu-70cl). Tout le [rayon apéritifs et liqueurs](/categorie/aperitifs-liqueurs) est livrable aux mêmes horaires.",
      },
    ],
    faq: [
      { question: "Il faut le mettre au frigo ?", answer: "Avant ouverture, non, un placard suffit. Une fois ouvert, oui : au frais, et à boire dans les six mois." },
      { question: "C'est fort ?", answer: "17 %, à peu près comme un vin doux. Un verre de Baileys sur glace est l'un des verres les moins alcoolisés de notre catalogue." },
    ],
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("malibu-70cl", "Malibu 70 cl", "Rhum et noix de coco."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  // ───────────────────────────── Bières ─────────────────────────────
  {
    slug: "produit/heineken-33cl",
    h1: "Heineken 33 cl livrée fraîche la nuit à Perpignan",
    meta_title: "Heineken 33 cl livrée fraîche la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Bière Heineken 33 cl livrée fraîche chez vous à Perpignan et alentours de 20h à 4h, à l'unité, en quantité. Commande par téléphone.",
    intro:
      "Heineken est la blonde néerlandaise la plus connue au monde : une lager à 5 %, brassée à Amsterdam depuis 1864 avec sa levure « A » maison, à la bouteille verte et à l'étoile rouge. Légère, nette, un peu amère : la bière de soirée par excellence.\n\nBouteille de 33 cl, vendue à l'unité, livrée fraîche à Perpignan et dans les communes voisines.",
    sections: [
      {
        title: "Comment la boire ce soir",
        content:
          "Bien fraîche, entre 4 et 6 °C, directement à la bouteille ou dans un verre droit. Elle se boit seule, avec des [Pringles](/produit/pringles-original), ou pour accompagner la fin d'un repas qui a commencé tard.\n\nVous dites la quantité au téléphone : six, douze, vingt-quatre. On confirme le total, et les bouteilles arrivent fraîches ; mettez-les au frigo en arrivant si la soirée doit durer.",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Une Heineken de 33 cl à 5 %, c'est 1,3 unité d'alcool : l'équivalent d'un verre de vin. La bouteille se garde plusieurs mois au frais et à l'abri de la lumière, qui altère le houblon.\n\nTout le [rayon bières](/categorie/bieres) et notre [épicerie de nuit](/livraison/epicerie-de-nuit-perpignan) partent aux mêmes horaires, de 20h à 4h.",
      },
    ],
    faq: [
      { question: "Elles arrivent vraiment fraîches ?", answer: "Oui, les bières sont gardées au frais et livrées en une trentaine de minutes, dans une poche isotherme pour les quantités. Vous les buvez en ouvrant la porte." },
      { question: "Il y a un minimum de bouteilles ?", answer: "Non. Dites le nombre au téléphone, on vous annonce le total avant de partir et vous décidez." },
      { question: "Vous avez d'autres bières ?", answer: "Le rayon bières évolue selon l'approvisionnement : demandez au téléphone ce qui est disponible ce soir." },
    ],
    links: [cat("bieres", "Bières"), prod("pringles-original", "Pringles Original", "La boîte de 160 g."), EPICERIE, APERO],
  },
  // ───────────────────────────── Bulles ─────────────────────────────
  {
    slug: "produit/cava-70cl",
    h1: "Cava brut 70 cl livré la nuit à Perpignan",
    meta_title: "Cava brut 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Cava brut 70 cl livré chez vous à Perpignan et alentours de 20h à 4h, pour trinquer sans attendre demain. Commande par téléphone, paiement à la livraison.",
    intro:
      "Le cava, ce sont les bulles de l'autre côté des Pyrénées : un vin mousseux espagnol, surtout catalan, élaboré comme le champagne, avec une seconde fermentation en bouteille. Brut, donc sec, vif, avec des notes de pomme verte et de brioche.\n\nUn anniversaire qui tombe à minuit, une bonne nouvelle, une envie de trinquer : la bouteille de 70 cl part du frais et arrive en une trentaine de minutes.",
    sections: [
      {
        title: "Comment le boire ce soir",
        content:
          "Entre 6 et 8 °C, dans des flûtes ou des verres à vin blanc. Il se suffit à lui-même, et il accompagne très bien des chips, des bonbons acidulés comme les [Schtroumpfs](/produit/haribo-schtroumpfs), ou un dessert improvisé.\n\nOuvrez-le en tenant le bouchon et en tournant la bouteille, pas l'inverse : la mousse reste dedans. Une fois ouvert, il tient une nuit avec un bouchon à champagne, et moins bien sans.",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Le cava est une appellation espagnole, produite en grande majorité dans le Penedès, au sud de Barcelone, à partir des cépages macabeu, xarel·lo et parellada. « Brut » signifie moins de 12 g de sucre par litre. La référence que nous livrons vous est confirmée au téléphone.\n\nLe [rayon bulles](/categorie/bulles) et le [rayon softs et snacks](/categorie/softs-snacks) partent aux mêmes horaires.",
      },
    ],
    faq: [
      { question: "Il arrive frais ?", answer: "Oui, la bouteille part du frais. Si vous ne l'ouvrez pas tout de suite, remettez-la au réfrigérateur une demi-heure." },
      { question: "Cava ou champagne ?", answer: "Même méthode de fabrication, bulles et sécheresse comparables, prix très différent. Pour trinquer à minuit, le cava fait exactement le travail." },
    ],
    links: [cat("bulles", "Bulles"), cat("softs-snacks", "Softs et snacks"), APERO],
  },
  // ───────────────────────────── Snacks ─────────────────────────────
  {
    slug: "produit/pringles-original",
    h1: "Pringles Original livrées la nuit à Perpignan",
    meta_title: "Pringles Original livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pringles Original, boîte de 160 g, livrées chez vous à Perpignan et alentours de 20h à 4h, avec ou sans bouteille. Commande par téléphone.",
    intro:
      "Les Pringles Original, la tuile salée dans son tube de 160 g, celle qui se vide pendant l'apéro sans qu'on s'en rende compte. Goût sel simple, croquant régulier, et la boîte se referme, ce qui n'arrive jamais avec un sachet de chips.\n\nLivrées avec des bières fraîches, avec une bouteille, ou toutes seules pour le creux de 1h du matin.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Avec une [Heineken](/produit/heineken-33cl) fraîche, c'est l'accord le plus simple de notre catalogue. Elles tiennent aussi avec un verre de [Ricard](/produit/ricard-70cl) ou un cava.\n\nDeux autres goûts existent au même format : la [Cream & Onion](/produit/pringles-cream-onion), plus douce, et la [Hot](/produit/pringles-hot), piquante. Le reste du salé et du sucré est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "Je peux commander des Pringles sans alcool ?", answer: "Oui. Les snacks se livrent seuls ou avec le reste de la commande, aux mêmes horaires." },
      { question: "Vous avez d'autres chips ?", answer: "Pringles en trois goûts au catalogue ; pour autre chose, demandez au téléphone ce qui est disponible ce soir." },
    ],
    links: [prod("pringles-cream-onion", "Pringles Cream & Onion", "La version crème-oignon."), prod("pringles-hot", "Pringles Hot", "La version piquante."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/pringles-cream-onion",
    h1: "Pringles Cream & Onion livrées la nuit à Perpignan",
    meta_title: "Pringles Cream & Onion livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pringles Cream & Onion, boîte de 160 g, livrées chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro:
      "Les Pringles Cream & Onion, la tuile à la crème et à l'oignon : plus douce et plus parfumée que l'Original, un peu sucrée, c'est souvent celle qui part en premier quand les trois boîtes sont sur la table.\n\nBoîte de 160 g, livrée avec le reste de la commande ou toute seule, tous les soirs de 20h à 4h.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Leur côté crémeux va bien avec une vodka-soft ou une bière blonde. Pour un plateau complet, ajoutez la [Pringles Original](/produit/pringles-original) et la [Pringles Hot](/produit/pringles-hot) : trois tubes, trois goûts, et tout le monde y trouve le sien.\n\nLe sucré pour finir est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "C'est piquant ?", answer: "Non, c'est la version douce : crème et oignon. La piquante, c'est la Pringles Hot." },
      { question: "Livrées seules, c'est possible ?", answer: "Oui, les snacks se commandent avec ou sans bouteille, aux mêmes horaires." },
    ],
    links: [prod("pringles-original", "Pringles Original", "La classique."), prod("pringles-hot", "Pringles Hot", "La piquante."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/pringles-hot",
    h1: "Pringles Hot livrées la nuit à Perpignan",
    meta_title: "Pringles Hot 160 g livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pringles Hot, boîte de 160 g, livrées chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro:
      "Les Pringles Hot, la tuile piquante : du piment, du paprika, et une chaleur qui monte au fil de la boîte. Pour ceux qui aiment que l'apéro réveille, et pour ceux qui veulent une raison de reprendre une bière.\n\nBoîte de 160 g, livrée fermée, à Perpignan et dans les communes voisines.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Une [Heineken](/produit/heineken-33cl) bien fraîche pour calmer le feu, c'est l'évidence. Côté sucré, des [M&M's](/produit/m-ms-330g) en grand sachet font la transition.\n\nSi la table est partagée entre amateurs et non-amateurs de piquant, prenez aussi l'[Original](/produit/pringles-original) ou la [Cream & Onion](/produit/pringles-cream-onion). Tout est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "Ça pique beaucoup ?", answer: "Une chaleur franche mais pas extrême : plus que des chips paprika, moins qu'un piment frais. Prévoyez une boisson fraîche." },
      { question: "Vous livrez les snacks sans alcool ?", answer: "Oui, seuls ou avec le reste de la commande, aux mêmes horaires." },
    ],
    links: [prod("heineken-33cl", "Heineken 33 cl", "Fraîche, à l'unité."), prod("pringles-original", "Pringles Original", "La classique."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/m-ms-45g",
    h1: "M&M's 45 g livrés la nuit à Perpignan",
    meta_title: "M&M's 45 g livrés la nuit à Perpignan | Livraison de Nuit",
    meta_description: "M&M's en sachet de 45 g livrés chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro:
      "Le petit sachet de M&M's, 45 g : les dragées colorées au chocolat, la dose pour une personne, ou de quoi finir la soirée sur une note sucrée sans en avoir pour toute la semaine.\n\nSe commande seul, avec un soft, ou glissé dans une commande de bouteilles, tous les soirs de 20h à 4h.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Avec un [Baileys](/produit/baileys-70cl) sur glace, le chocolat trouve son verre. Pour une table entière, prenez plutôt le [grand sachet de 330 g](/produit/m-ms-330g), ou ajoutez une barre [Snickers](/produit/snickers) pour varier.\n\nTout le sucré est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "Cacahuète ou chocolat ?", answer: "La variété disponible ce soir vous est confirmée au téléphone au moment de la commande." },
      { question: "Je peux commander juste un sachet ?", answer: "Oui, il n'y a pas de minimum : on vous annonce le total avant de partir." },
    ],
    links: [prod("m-ms-330g", "M&M's 330 g", "Le grand sachet."), prod("snickers", "Snickers", "La barre."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/m-ms-330g",
    h1: "M&M's 330 g livrés la nuit à Perpignan",
    meta_title: "M&M's 330 g livrés la nuit à Perpignan | Livraison de Nuit",
    meta_description: "M&M's en grand sachet de 330 g livrés chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro:
      "Le grand sachet de M&M's, 330 g : celui qu'on vide dans un saladier au milieu de la table et qui tient toute la soirée, à six ou à huit. Sept fois le petit sachet, pour ceux qui savent déjà qu'un seul ne suffira pas.\n\nLivré à Perpignan et autour, tous les soirs, avec ou sans bouteille.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Le saladier de M&M's accompagne tout : une [Heineken](/produit/heineken-33cl), un verre de [Malibu](/produit/malibu-70cl)-ananas, un cava. Pour une envie plus modeste, le [sachet de 45 g](/produit/m-ms-45g) suffit ; pour du sucré plus acidulé, les [fraises Tagada](/produit/fraises-tagada).\n\nTout le sucré et le salé est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "Cacahuète ou chocolat ?", answer: "La variété disponible ce soir vous est dite au téléphone au moment de la commande." },
      { question: "Le sachet se referme ?", answer: "Oui, les grands formats ont une fermeture zip : ce qui reste tient jusqu'au lendemain." },
    ],
    links: [prod("m-ms-45g", "M&M's 45 g", "Le petit sachet."), prod("fraises-tagada", "Fraises Tagada", "Le sachet Haribo."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/fraises-tagada",
    h1: "Fraises Tagada livrées la nuit à Perpignan",
    meta_title: "Fraises Tagada livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Fraises Tagada Haribo en sachet livrées chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro:
      "Les fraises Tagada d'Haribo, le bonbon rose, tendre et sucré, né en 1969 et toujours fabriqué en France. Celui qu'on connaît depuis l'enfance et qu'on commande encore à minuit, pour soi ou pour la table.\n\nUn sachet, à poser entre les chips et les bières, livré avec le reste de la commande ou tout seul.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Elles vont avec les bulles : une Tagada et une gorgée de [cava](/produit/cava-70cl), c'est un dessert. À côté, les [Schtroumpfs](/produit/haribo-schtroumpfs) apportent l'acidulé, et les [M&M's](/produit/m-ms-330g) le chocolat.\n\nTout le sucré est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "C'est le sachet classique ?", answer: "Oui, les fraises Tagada originales d'Haribo, en sachet. La contenance exacte vous est confirmée au téléphone." },
      { question: "Je peux commander des bonbons sans alcool ?", answer: "Oui, seuls ou avec un soft, aux mêmes horaires." },
    ],
    links: [prod("haribo-schtroumpfs", "Haribo Schtroumpfs", "Les bleus."), prod("m-ms-330g", "M&M's 330 g", "Le grand sachet."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/haribo-schtroumpfs",
    h1: "Haribo Schtroumpfs livrés la nuit à Perpignan",
    meta_title: "Haribo Schtroumpfs livrés la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Bonbons Haribo Schtroumpfs en sachet livrés chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro:
      "Les Schtroumpfs d'Haribo, les bonbons bleus et blancs à la gélatine, tendres et acidulés, au parfum de framboise. Un sachet pour finir la soirée en douceur, ou pour les invités qui ne boivent pas d'alcool et veulent quand même quelque chose.\n\nLivrés à Perpignan et dans les communes voisines, tous les soirs de 20h à 4h.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Leur acidité réveille un verre de [Get 27](/produit/jet-27-70cl) glacé ou un cava. Pour un mélange de bonbons, ajoutez les [fraises Tagada](/produit/fraises-tagada) ; pour le chocolat, une barre [Mars](/produit/mars).\n\nTout le sucré est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "Ils sont acidulés ?", answer: "Légèrement : tendres, fruités, avec une pointe d'acidité, moins marquée que des bonbons au sucre citrique." },
      { question: "Vous livrez des bonbons seuls ?", answer: "Oui, avec ou sans le reste de la commande, aux mêmes horaires." },
    ],
    links: [prod("fraises-tagada", "Fraises Tagada", "Les roses."), prod("mars", "Mars", "La barre caramel."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/snickers",
    h1: "Snickers livré la nuit à Perpignan",
    meta_title: "Snickers livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Barre Snickers livrée chez vous à Perpignan et alentours de 20h à 4h, avec le reste de la commande. Commande par téléphone, paiement à la livraison.",
    intro:
      "La barre Snickers : cacahuètes grillées, caramel, nougat et chocolat au lait. Le creux de 2h du matin a trouvé sa réponse, et c'est la barre la plus nourrissante de nos rayons.\n\nSe commande à l'unité, avec le reste de la commande ou avec un soft, tous les soirs de 20h à 4h.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Avec un café et un trait de [Baileys](/produit/baileys-70cl), c'est un dessert de fin de nuit. Pour varier, la barre [Mars](/produit/mars) joue le caramel sans cacahuète, et le [petit sachet de M&M's](/produit/m-ms-45g) le chocolat pur.\n\nTout le sucré est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "Il contient des cacahuètes ?", answer: "Oui, des cacahuètes entières grillées : à éviter en cas d'allergie. La barre Mars n'en contient pas." },
      { question: "Je peux en commander plusieurs ?", answer: "Oui, dites le nombre au téléphone, le total est confirmé avant le départ." },
    ],
    links: [prod("mars", "Mars", "Caramel et nougat."), prod("m-ms-45g", "M&M's 45 g", "Le petit sachet."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  {
    slug: "produit/mars",
    h1: "Mars livré la nuit à Perpignan",
    meta_title: "Mars livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Barre Mars livrée chez vous à Perpignan et alentours de 20h à 4h, avec le reste de la commande. Commande par téléphone, paiement à la livraison.",
    intro:
      "La barre Mars : nougat et caramel sous le chocolat au lait, sans cacahuète. Le sucré qui remonte une fin de soirée, moins dense qu'un Snickers, plus fondant.\n\nÀ l'unité, avec le reste de la commande ou avec un soft, livrée à Perpignan et autour tous les soirs.",
    sections: [
      {
        title: "Avec quoi, ce soir",
        content:
          "Son caramel va avec un verre de [Baileys](/produit/baileys-70cl) ou un [Get 27](/produit/jet-27-70cl) glacé, qui tranche le sucre. Pour ceux qui veulent des cacahuètes, le [Snickers](/produit/snickers) ; pour les bonbons, les [Schtroumpfs](/produit/haribo-schtroumpfs).\n\nTout le sucré est dans le [rayon softs et snacks](/categorie/softs-snacks).",
      },
    ],
    faq: [
      { question: "Il contient des fruits à coque ?", answer: "La recette Mars n'en contient pas, mais la barre est fabriquée dans des ateliers qui en manipulent : vérifiez l'emballage en cas d'allergie sévère." },
      { question: "Vous livrez une seule barre ?", answer: "Oui, il n'y a pas de minimum ; le total vous est annoncé avant le départ." },
    ],
    links: [prod("snickers", "Snickers", "Cacahuètes et caramel."), prod("haribo-schtroumpfs", "Haribo Schtroumpfs", "Les bleus."), cat("softs-snacks", "Softs et snacks"), EPICERIE],
  },
  // ───────────────────────────── Formules ─────────────────────────────
  {
    slug: "produit/formule-poliakov",
    h1: "Formule Poliakov : vodka 70 cl + Crazy Tiger 1 L, livrée la nuit à Perpignan",
    meta_title: "Formule Poliakov + Crazy Tiger à Perpignan | Livraison de Nuit",
    meta_description: "Formule Poliakov : vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L, livrées chez vous à Perpignan et alentours de 20h à 4h.",
    intro:
      "La formule la plus simple et la plus demandée de nos rayons : une bouteille de vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L, l'énergisant qui va avec. Tout ce qu'il faut pour le vodka-énergisant de la soirée, dans une seule commande, sans courir après le soft.\n\nLivrée fermée à Perpignan et dans les communes voisines, tous les soirs de 20h à 4h.",
    sections: [
      {
        title: "Comment la servir ce soir",
        content:
          "Une dose de Poliakov pour trois à quatre de Crazy Tiger, sur beaucoup de glace, dans un grand verre. Le litre d'énergisant couvre une bonne partie de la bouteille ; pour une table nombreuse, prenez deux formules plutôt qu'une bouteille de vodka seule.\n\nLa [Poliakov](/produit/poliakov-70cl) existe aussi seule, et la version plus ronde est la [formule Absolut](/produit/formule-absolut).",
      },
      {
        title: "Ce qu'il faut savoir",
        content:
          "Le Crazy Tiger est une boisson énergisante française : caféine, taurine, sucre. Mélangée à l'alcool, elle masque la fatigue mais pas l'alcoolémie ; allez-y doucement sur les quantités, et gardez de l'eau à portée.\n\nToutes les [formules](/categorie/formules) et le [rayon softs et snacks](/categorie/softs-snacks) partent aux mêmes horaires.",
      },
    ],
    faq: [
      { question: "La formule contient exactement quoi ?", answer: "Une bouteille de vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L. C'est la seule formule dont le contenu est fixe." },
      { question: "Je peux remplacer le Crazy Tiger par autre chose ?", answer: "Demandez au téléphone : selon les softs disponibles ce soir, on vous propose une solution et on confirme le total." },
    ],
    links: [prod("poliakov-70cl", "Poliakov 70 cl", "La bouteille seule."), cat("formules", "Formules"), cat("softs-snacks", "Softs et snacks"), APERO],
  },
  {
    slug: "produit/formule-captain-morgan",
    h1: "Formule Captain Morgan livrée la nuit à Perpignan",
    meta_title: "Formule Captain Morgan livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Formule autour du rhum Captain Morgan 70 cl avec son accompagnement, livrée chez vous à Perpignan et alentours de 20h à 4h. Contenu confirmé au téléphone.",
    intro:
      "La formule construite autour du rhum épicé Captain Morgan 70 cl et de son accompagnement, pour le rhum-coca de soirée sans avoir à commander deux fois. Le contenu exact de l'accompagnement vous est confirmé au téléphone au moment de la commande.\n\nLivrée fermée, à Perpignan et dans les communes voisines, tous les soirs.",
    sections: [
      {
        title: "Comment la servir ce soir",
        content:
          "Le rhum épicé se mélange une dose pour trois de soft, sur glace, avec un quartier de citron vert si vous en avez. Sa douceur vanillée à 35 % en fait la formule la plus facile à boire de nos rayons pour ceux qui n'aiment pas les alcools secs.\n\nLe [Captain Morgan](/produit/captain-morgan-70cl) existe aussi seul ; pour un whisky à la place du rhum, la [formule Johnnie Walker](/produit/formule-johnnie-walker).",
      },
    ],
    faq: [
      { question: "Quel soft est dans la formule ?", answer: "L'accompagnement dépend de ce qui est disponible ce soir : on vous le dit au téléphone, avec le total, avant de partir." },
      { question: "Je peux prendre deux formules ?", answer: "Oui, dites la quantité au téléphone." },
    ],
    links: [prod("captain-morgan-70cl", "Captain Morgan 70 cl", "Le rhum seul."), cat("formules", "Formules"), cat("rhums", "Rhums"), APERO],
  },
  {
    slug: "produit/formule-absolut",
    h1: "Formule Absolut livrée la nuit à Perpignan",
    meta_title: "Formule Absolut livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Formule autour de la vodka Absolut 70 cl avec son accompagnement, livrée chez vous à Perpignan et alentours de 20h à 4h. Contenu confirmé au téléphone.",
    intro:
      "La formule construite autour de la vodka suédoise Absolut 70 cl, 40 %, et de son accompagnement, dans une seule commande. C'est la version plus ronde de la formule Poliakov, pour ceux qui veulent une vodka qui se tient aussi pure. Le contenu exact de l'accompagnement vous est confirmé au téléphone.\n\nLivrée fermée à Perpignan et autour, tous les soirs de 20h à 4h.",
    sections: [
      {
        title: "Comment la servir ce soir",
        content:
          "Une dose d'Absolut pour trois de soft, sur glace. Avec un tonic, c'est un Absolut-tonic ; avec un énergisant, le même mélange que la formule Poliakov, en plus doux.\n\nL'[Absolut](/produit/absolut-70cl) existe aussi seule ; la version économique est la [formule Poliakov](/produit/formule-poliakov), dont le contenu est fixe (vodka + Crazy Tiger 1 L).",
      },
    ],
    faq: [
      { question: "Quel soft est dans la formule ?", answer: "L'accompagnement dépend de ce qui est disponible ce soir : on vous le dit au téléphone, avec le total, avant de partir." },
      { question: "Absolut ou Poliakov en formule ?", answer: "Absolut si vous comptez aussi la boire pure ou sur glace ; Poliakov si c'est uniquement pour le mélange." },
    ],
    links: [prod("absolut-70cl", "Absolut 70 cl", "La bouteille seule."), cat("formules", "Formules"), cat("vodkas", "Vodkas"), APERO],
  },
  {
    slug: "produit/formule-johnnie-walker",
    h1: "Formule Johnnie Walker livrée la nuit à Perpignan",
    meta_title: "Formule Johnnie Walker livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Formule autour du whisky Johnnie Walker 70 cl et son accompagnement, livrée chez vous à Perpignan et alentours de 20h à 4h. Contenu confirmé au téléphone.",
    intro:
      "La formule construite autour du blended scotch Johnnie Walker 70 cl, 40 %, et de son accompagnement, pour le whisky-coca ou le whisky-ginger sans commander deux fois. Le contenu exact de l'accompagnement vous est confirmé au téléphone au moment de la commande.\n\nLivrée fermée à Perpignan et dans les communes voisines, tous les soirs.",
    sections: [
      {
        title: "Comment la servir ce soir",
        content:
          "Une dose de whisky pour trois de soft, sur glace. Le ginger ale garde le côté fumé du Johnnie Walker, le coca l'arrondit. Sur glace seul, il reste le whisky le plus marqué de nos rayons.\n\nLe [Johnnie Walker](/produit/johnnie-walker-70cl) existe aussi seul ; pour un whisky-coca plus économique, le [Label 5](/produit/label-5-70cl) à l'unité, avec son soft commandé au téléphone.",
      },
    ],
    faq: [
      { question: "Quel soft est dans la formule ?", answer: "L'accompagnement dépend de ce qui est disponible ce soir : on vous le dit au téléphone, avec le total, avant de partir." },
      { question: "Quelle version de Johnnie Walker ?", answer: "La référence disponible ce soir vous est précisée au téléphone au moment de la commande." },
    ],
    links: [prod("johnnie-walker-70cl", "Johnnie Walker 70 cl", "La bouteille seule."), cat("formules", "Formules"), cat("whiskys", "Whiskys"), APERO],
  },
];

const sb = getSupabase();
const { data: products } = await sb.from("products").select("id, slug, name, attributes").eq("site_key", SITE);
const known = new Map((products ?? []).map((p) => [p.slug as string, p]));

// Marque → attribut du catalogue (schéma Product → brand, affichée dans la fiche).
let m = 0;
for (const [slug, marque] of Object.entries(MARQUES)) {
  const p = known.get(slug);
  if (!p) continue;
  const attrs = (p.attributes ?? {}) as Record<string, unknown>;
  if (attrs.marque === marque) continue;
  const { error } = await sb.from("products").update({ attributes: { marque, ...attrs } }).eq("id", p.id);
  if (error) throw new Error(`${slug} marque : ${error.message}`);
  m++;
}
console.log(`${m} marques posées.`);

let n = 0;
for (const f of fiches) {
  const pslug = f.slug.replace(/^produit\//, "");
  const p = known.get(pslug);
  if (!p) {
    console.log("PRODUIT INCONNU, fiche ignorée :", pslug);
    continue;
  }
  const { data: existing } = await sb.from("seo_pages").select("id, status").eq("site_key", SITE).eq("slug", f.slug).maybeSingle();
  if (existing && existing.status === "published") {
    console.log("publiée, non touchée :", f.slug);
    continue;
  }
  const row = {
    site_key: SITE,
    slug: f.slug,
    city: "Perpignan",
    service: p.name as string,
    page_type: "product",
    intent: "service",
    mode: "local",
    status: "draft",
    h1: f.h1,
    meta_title: f.meta_title,
    meta_description: f.meta_description,
    content: {
      intro: f.intro,
      seoSections: f.sections,
      highlights: [],
      faq: f.faq,
      internalLinks: f.links,
      card: { title: "", tagline: "", description: "", badges: [], featured: false },
      updatedDate: DATE,
      brief: { source: "seed:nuit-produits-v2", note: "Texte propre à la fiche (différenciation vs Mon Sauveur et entre fiches). Prix et stock = table products. À relire avant publication." },
    },
  };
  const q = existing ? sb.from("seo_pages").update(row).eq("id", existing.id) : sb.from("seo_pages").insert(row);
  const { error } = await q;
  if (error) throw new Error(`${f.slug} : ${error.message}`);
  n++;
}
console.log(`${n} fiches en brouillon.`);
