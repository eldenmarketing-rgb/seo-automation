/**
 * Brouillons des 24 fiches produit de « Livraison de Nuit » (site_key `nuit`, slug
 * `produit/<slug>`) : H1, meta, intro et une section par référence, pour que chaque
 * fiche ait un texte à elle — le catalogue (noms, prix, photos) est le même que celui
 * de Mon Sauveur, le texte ne doit pas l'être. Faits produit = ce que la marque dit
 * publiquement (origine, type, format) ; faits service = 20h-4h, ~30 min, paiement à
 * la livraison, majeurs. Prix et stock restent ceux de la table `products` (jamais
 * recopiés dans le texte, sauf le prix affiché sur la fiche elle-même).
 *
 * Statut `draft`. Idempotent, n'écrase jamais une fiche publiée.
 *
 *   npx tsx scripts/oneshot/seed-nuit-produits.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "nuit";
const TEL = "09 73 92 08 28";
const DATE = new Date().toISOString().slice(0, 10);
const SERVICE =
  "Livrée fermée à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h. Vous appelez le " +
  TEL +
  ", on confirme le total, on part ; vous payez à la porte, par carte ou en espèces. Vente réservée aux majeurs, pièce d'identité possible à la livraison.";
const SNACK =
  "Livré à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h, avec ou sans alcool dans la commande. Vous appelez le " +
  TEL +
  ", on confirme le total, on part ; vous payez à la porte, par carte ou en espèces.";

type Fiche = {
  slug: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  intro: string;
  section: { title: string; content: string };
  links: { url: string; anchor: string; context: string }[];
};

const cat = (slug: string, anchor: string) => ({ url: `/categorie/${slug}`, anchor, context: "Tout le rayon." });
const prod = (slug: string, anchor: string, context: string) => ({ url: `/produit/${slug}`, anchor, context });

const fiches: Fiche[] = [
  // Vodkas
  {
    slug: "produit/poliakov-70cl",
    h1: "Poliakov 70 cl livrée la nuit à Perpignan",
    meta_title: "Poliakov 70 cl livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Vodka Poliakov 70 cl livrée chez vous à Perpignan et alentours de 20h à 4h, en une trentaine de minutes. Commande par téléphone, paiement à la livraison.",
    intro: "La Poliakov est la vodka que l'on nous demande le plus la nuit : neutre, franche, faite pour les mélanges. Vodka française en bouteille de 70 cl, elle se boit en vodka-soft, en shot bien froid ou dans notre formule avec une bouteille de Crazy Tiger 1 L.",
    section: { title: "Comment ça se passe", content: SERVICE + "\n\nUn soft pour l'accompagner ? Demandez-le au téléphone, ou prenez directement la [formule Poliakov](/produit/formule-poliakov)." },
    links: [prod("formule-poliakov", "Formule Poliakov", "La bouteille et son Crazy Tiger 1 L."), prod("absolut-70cl", "Absolut 70 cl", "La vodka suédoise, plus ronde."), cat("vodkas", "Vodkas")],
  },
  {
    slug: "produit/absolut-70cl",
    h1: "Absolut 70 cl livrée la nuit à Perpignan",
    meta_title: "Absolut Vodka 70 cl livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Vodka Absolut 70 cl livrée chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, total confirmé avant le départ, paiement à la livraison.",
    intro: "Absolut, c'est la vodka suédoise à la bouteille d'apothicaire, distillée à partir de blé d'hiver dans le sud de la Suède. Plus ronde que la Poliakov, elle se boit aussi pure, sur glace, et tient dans tous les cocktails. Bouteille de 70 cl.",
    section: { title: "Comment ça se passe", content: SERVICE + "\n\nElle existe aussi en [formule Absolut](/produit/formule-absolut), avec son soft dans la même commande." },
    links: [prod("formule-absolut", "Formule Absolut", "La bouteille et son soft."), prod("poliakov-70cl", "Poliakov 70 cl", "La vodka de soirée, moins chère."), cat("vodkas", "Vodkas")],
  },
  // Whiskys
  {
    slug: "produit/label-5-70cl",
    h1: "Label 5 70 cl livré la nuit à Perpignan",
    meta_title: "Whisky Label 5 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Whisky écossais Label 5 70 cl livré chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Label 5 est un blended scotch whisky, assemblage de whiskies de grain et de malt écossais, doux et facile. C'est le whisky du whisky-coca de fin de soirée, en bouteille de 70 cl, au prix le plus accessible de notre rayon.",
    section: { title: "Comment ça se passe", content: SERVICE + "\n\nLe coca ou le soft se commande au téléphone avec la bouteille." },
    links: [prod("johnnie-walker-70cl", "Johnnie Walker 70 cl", "Le blend le plus connu au monde."), cat("whiskys", "Whiskys"), cat("formules", "Formules")],
  },
  {
    slug: "produit/johnnie-walker-70cl",
    h1: "Johnnie Walker 70 cl livré la nuit à Perpignan",
    meta_title: "Johnnie Walker 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Whisky Johnnie Walker 70 cl livré chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, total confirmé, paiement à la livraison.",
    intro: "Johnnie Walker est le blended scotch le plus vendu au monde, reconnaissable à son homme qui marche. Un assemblage écossais avec plus de caractère que le Label 5 : pur, sur glace ou allongé. Bouteille de 70 cl.",
    section: { title: "Comment ça se passe", content: SERVICE + "\n\nIl existe aussi en [formule Johnnie Walker](/produit/formule-johnnie-walker), avec le soft dans la même commande." },
    links: [prod("formule-johnnie-walker", "Formule Johnnie Walker", "La bouteille et son soft."), prod("label-5-70cl", "Label 5 70 cl", "Le blend accessible."), cat("whiskys", "Whiskys")],
  },
  // Rhum
  {
    slug: "produit/captain-morgan-70cl",
    h1: "Captain Morgan 70 cl livré la nuit à Perpignan",
    meta_title: "Rhum Captain Morgan 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Rhum épicé Captain Morgan 70 cl livré chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Captain Morgan est un rhum épicé des Caraïbes, doux, avec des notes de vanille et d'épices : la base du rhum-coca de soirée. Bouteille de 70 cl, livrée fermée.",
    section: { title: "Comment ça se passe", content: SERVICE + "\n\nAvec son coca, c'est la [formule Captain Morgan](/produit/formule-captain-morgan)." },
    links: [prod("formule-captain-morgan", "Formule Captain Morgan", "Le rhum et son accompagnement."), cat("rhums", "Rhums"), cat("aperitifs-liqueurs", "Apéritifs et liqueurs")],
  },
  // Apéritifs et liqueurs
  {
    slug: "produit/ricard-70cl",
    h1: "Ricard 70 cl livré la nuit à Perpignan",
    meta_title: "Ricard 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pastis Ricard 70 cl livré chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Le Ricard, c'est le pastis de Marseille, anis et réglisse, qui se trouble dès qu'on ajoute l'eau. Un volume de Ricard pour cinq d'eau bien fraîche, et l'apéro du sud est servi, même à minuit. Bouteille de 70 cl.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("jet-27-70cl", "Get 27 70 cl", "La menthe glacée."), cat("bieres", "Bières")],
  },
  {
    slug: "produit/jet-27-70cl",
    h1: "Get 27 70 cl livré la nuit à Perpignan",
    meta_title: "Get 27 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Liqueur de menthe Get 27 70 cl livrée chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Get 27 est la liqueur de menthe verte qui se boit glacée : pure sur des glaçons, en pile-face avec du Get 31, ou allongée au soda pour un long drink frais. Bouteille de 70 cl, livrée fermée.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("malibu-70cl", "Malibu 70 cl", "Rhum et noix de coco."), prod("baileys-70cl", "Baileys 70 cl", "Crème de whisky.")],
  },
  {
    slug: "produit/malibu-70cl",
    h1: "Malibu 70 cl livré la nuit à Perpignan",
    meta_title: "Malibu 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Malibu 70 cl, liqueur de rhum à la noix de coco, livré chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Malibu est une liqueur à base de rhum des Caraïbes et de noix de coco, douce et sucrée. Avec du jus d'ananas ou d'orange, c'est le cocktail de plage qu'on peut aussi boire à 1h du matin sur un canapé. Bouteille de 70 cl.",
    section: { title: "Comment ça se passe", content: SERVICE + "\n\nLe jus ou le soft se demande au téléphone avec la bouteille." },
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("captain-morgan-70cl", "Captain Morgan 70 cl", "Le rhum épicé."), prod("baileys-70cl", "Baileys 70 cl", "Pour la fin de soirée.")],
  },
  {
    slug: "produit/baileys-70cl",
    h1: "Baileys 70 cl livré la nuit à Perpignan",
    meta_title: "Baileys 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Baileys 70 cl, crème de whisky irlandais, livré chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Baileys est la crème de whisky irlandais originale : whiskey, crème fraîche et cacao. Pur sur glace, dans un café ou sur un dessert, c'est la bouteille de la fin de soirée plutôt que de l'apéro. Bouteille de 70 cl.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [cat("aperitifs-liqueurs", "Apéritifs et liqueurs"), prod("malibu-70cl", "Malibu 70 cl", "Rhum et noix de coco."), cat("softs-snacks", "Softs et snacks")],
  },
  // Bières
  {
    slug: "produit/heineken-33cl",
    h1: "Heineken 33 cl livrée fraîche la nuit à Perpignan",
    meta_title: "Heineken 33 cl livrée fraîche la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Bière Heineken 33 cl livrée fraîche chez vous à Perpignan et alentours de 20h à 4h, à l'unité, en quantité. Commande par téléphone, paiement à la livraison.",
    intro: "Heineken, la blonde néerlandaise la plus connue au monde, en bouteille de 33 cl. Le prix est à l'unité : six, douze, vingt-quatre, vous dites la quantité au téléphone, on confirme le total, et les bouteilles arrivent fraîches.",
    section: { title: "Comment ça se passe", content: SERVICE + "\n\nDes chips avec ? Rayon [softs et snacks](/categorie/softs-snacks)." },
    links: [cat("bieres", "Bières"), prod("pringles-original", "Pringles Original", "La boîte de 160 g."), { url: "/livraison/epicerie-de-nuit-perpignan", anchor: "Épicerie de nuit", context: "Ce qui manque quand tout est fermé." }],
  },
  // Bulles
  {
    slug: "produit/cava-70cl",
    h1: "Cava 70 cl livré la nuit à Perpignan",
    meta_title: "Cava brut 70 cl livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Cava brut 70 cl livré chez vous à Perpignan et alentours de 20h à 4h, pour fêter quelque chose sans attendre demain. Commande par téléphone, paiement à la livraison.",
    intro: "Le cava, ce sont les bulles catalanes, élaborées comme le champagne, sèches et vives. Un anniversaire à minuit, une bonne nouvelle, une envie de trinquer : la bouteille de 70 cl part du frais et arrive en une trentaine de minutes.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [cat("bulles", "Bulles"), cat("softs-snacks", "Softs et snacks"), { url: "/livraison/apero-de-nuit-perpignan", anchor: "Apéro de nuit", context: "L'apéro complet livré chez vous." }],
  },
  // Snacks
  {
    slug: "produit/pringles-original",
    h1: "Pringles Original livrées la nuit à Perpignan",
    meta_title: "Pringles Original 160 g livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pringles Original, boîte de 160 g, livrées chez vous à Perpignan et alentours de 20h à 4h, avec ou sans bouteille. Commande par téléphone, paiement à la livraison.",
    intro: "Les Pringles Original, la chips salée en tuile dans sa boîte de 160 g : celle qui se vide pendant l'apéro sans qu'on s'en rende compte. Avec des bières fraîches ou seule, pour le creux de 1h du matin.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("pringles-cream-onion", "Pringles Cream & Onion", "La version crème-oignon."), prod("pringles-hot", "Pringles Hot", "La version piquante."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/pringles-cream-onion",
    h1: "Pringles Cream & Onion livrées la nuit à Perpignan",
    meta_title: "Pringles Cream & Onion 160 g livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pringles Cream & Onion, boîte de 160 g, livrées chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Les Pringles Cream & Onion, la tuile à la crème et à l'oignon, plus douce que l'Original. Boîte de 160 g, livrée avec le reste de la commande ou toute seule.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("pringles-original", "Pringles Original", "La classique."), prod("pringles-hot", "Pringles Hot", "La piquante."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/pringles-hot",
    h1: "Pringles Hot livrées la nuit à Perpignan",
    meta_title: "Pringles Hot 160 g livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Pringles Hot, boîte de 160 g, livrées chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Les Pringles Hot, la tuile piquante pour ceux qui aiment que l'apéro réveille. Boîte de 160 g, à commander avec des bières bien fraîches pour calmer le feu.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("heineken-33cl", "Heineken 33 cl", "Fraîche, à l'unité."), prod("pringles-original", "Pringles Original", "La classique."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/m-ms-45g",
    h1: "M&M's 45 g livrés la nuit à Perpignan",
    meta_title: "M&M's 45 g livrés la nuit à Perpignan | Livraison de Nuit",
    meta_description: "M&M's en sachet de 45 g livrés chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Le petit sachet de M&M's, 45 g, la dose pour une personne ou pour finir la soirée sur une note sucrée. Pour une table entière, il y a le [grand sachet de 330 g](/produit/m-ms-330g).",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("m-ms-330g", "M&M's 330 g", "Le grand sachet."), prod("snickers", "Snickers", "La barre."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/m-ms-330g",
    h1: "M&M's 330 g livrés la nuit à Perpignan",
    meta_title: "M&M's 330 g livrés la nuit à Perpignan | Livraison de Nuit",
    meta_description: "M&M's en grand sachet de 330 g livrés chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Le grand sachet de M&M's, 330 g : celui qu'on vide dans un saladier au milieu de la table et qui tient toute la soirée. Pour une envie plus modeste, le [sachet de 45 g](/produit/m-ms-45g) suffit.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("m-ms-45g", "M&M's 45 g", "Le petit sachet."), prod("fraises-tagada", "Fraises Tagada", "Le sachet Haribo."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/fraises-tagada",
    h1: "Fraises Tagada livrées la nuit à Perpignan",
    meta_title: "Fraises Tagada livrées la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Fraises Tagada Haribo en sachet livrées chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Les fraises Tagada d'Haribo, le bonbon rose et sucré qu'on connaît depuis l'enfance et qu'on commande encore à minuit. Un sachet, à poser entre les chips et les bières.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("haribo-schtroumpfs", "Haribo Schtroumpfs", "Les bleus."), prod("m-ms-330g", "M&M's 330 g", "Le grand sachet."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/haribo-schtroumpfs",
    h1: "Haribo Schtroumpfs livrés la nuit à Perpignan",
    meta_title: "Haribo Schtroumpfs livrés la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Bonbons Haribo Schtroumpfs en sachet livrés chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    intro: "Les Schtroumpfs d'Haribo, les bonbons bleus à la framboise, tendres et acidulés. Un sachet pour finir la soirée en douceur, ou pour les invités qui ne boivent pas d'alcool.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("fraises-tagada", "Fraises Tagada", "Les roses."), prod("mars", "Mars", "La barre caramel."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/snickers",
    h1: "Snickers livré la nuit à Perpignan",
    meta_title: "Snickers livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Barre Snickers livrée chez vous à Perpignan et alentours de 20h à 4h, avec le reste de la commande. Commande par téléphone, paiement à la livraison.",
    intro: "La barre Snickers, cacahuètes, caramel et chocolat au lait : le creux de 2h du matin a trouvé sa réponse. Se commande à l'unité, avec le reste de la commande ou avec un soft.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("mars", "Mars", "Caramel et nougat."), prod("m-ms-45g", "M&M's 45 g", "Le petit sachet."), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/mars",
    h1: "Mars livré la nuit à Perpignan",
    meta_title: "Mars livré la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Barre Mars livrée chez vous à Perpignan et alentours de 20h à 4h, avec le reste de la commande. Commande par téléphone, paiement à la livraison.",
    intro: "La barre Mars, nougat et caramel sous le chocolat au lait, le sucré qui remonte une fin de soirée. À l'unité, avec le reste de la commande.",
    section: { title: "Comment ça se passe", content: SNACK },
    links: [prod("snickers", "Snickers", "Cacahuètes et caramel."), prod("haribo-schtroumpfs", "Haribo Schtroumpfs", "Les bleus."), cat("softs-snacks", "Softs et snacks")],
  },
  // Formules
  {
    slug: "produit/formule-poliakov",
    h1: "Formule Poliakov : vodka 70 cl + Crazy Tiger 1 L, livrée la nuit à Perpignan",
    meta_title: "Formule Poliakov + Crazy Tiger livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Formule Poliakov : vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L, livrées chez vous à Perpignan et alentours de 20h à 4h. Paiement à la livraison.",
    intro: "La formule la plus simple de nos rayons : une bouteille de vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L, l'energy drink qui va avec. Tout ce qu'il faut pour le vodka-énergisant de la soirée, dans une seule commande.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [prod("poliakov-70cl", "Poliakov 70 cl", "La bouteille seule."), cat("formules", "Formules"), cat("softs-snacks", "Softs et snacks")],
  },
  {
    slug: "produit/formule-captain-morgan",
    h1: "Formule Captain Morgan livrée la nuit à Perpignan",
    meta_title: "Formule Captain Morgan livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Formule autour du rhum Captain Morgan 70 cl, livrée chez vous à Perpignan et alentours de 20h à 4h. Contenu confirmé au téléphone, paiement à la livraison.",
    intro: "La formule construite autour du rhum épicé Captain Morgan 70 cl, avec son accompagnement pour le rhum-coca de soirée. Le contenu exact de la formule vous est confirmé au téléphone au moment de la commande.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [prod("captain-morgan-70cl", "Captain Morgan 70 cl", "Le rhum seul."), cat("formules", "Formules"), cat("rhums", "Rhums")],
  },
  {
    slug: "produit/formule-absolut",
    h1: "Formule Absolut livrée la nuit à Perpignan",
    meta_title: "Formule Absolut livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Formule autour de la vodka Absolut 70 cl, livrée chez vous à Perpignan et alentours de 20h à 4h. Contenu confirmé au téléphone, paiement à la livraison.",
    intro: "La formule construite autour de la vodka suédoise Absolut 70 cl, avec son accompagnement, dans une seule commande. Le contenu exact vous est confirmé au téléphone au moment de la commande.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [prod("absolut-70cl", "Absolut 70 cl", "La bouteille seule."), cat("formules", "Formules"), cat("vodkas", "Vodkas")],
  },
  {
    slug: "produit/formule-johnnie-walker",
    h1: "Formule Johnnie Walker livrée la nuit à Perpignan",
    meta_title: "Formule Johnnie Walker livrée la nuit à Perpignan | Livraison de Nuit",
    meta_description: "Formule autour du whisky Johnnie Walker 70 cl, livrée chez vous à Perpignan et alentours de 20h à 4h. Contenu confirmé au téléphone, paiement à la livraison.",
    intro: "La formule construite autour du blend écossais Johnnie Walker 70 cl, avec son accompagnement pour le whisky-coca. Le contenu exact vous est confirmé au téléphone au moment de la commande.",
    section: { title: "Comment ça se passe", content: SERVICE },
    links: [prod("johnnie-walker-70cl", "Johnnie Walker 70 cl", "La bouteille seule."), cat("formules", "Formules"), cat("whiskys", "Whiskys")],
  },
];

const sb = getSupabase();
const { data: products } = await sb.from("products").select("slug, name").eq("site_key", SITE);
const known = new Set((products ?? []).map((p) => p.slug as string));
let n = 0;
for (const f of fiches) {
  const pslug = f.slug.replace(/^produit\//, "");
  if (!known.has(pslug)) {
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
    service: (products ?? []).find((p) => p.slug === pslug)?.name ?? pslug,
    page_type: "product",
    intent: "service",
    mode: "local",
    status: "draft",
    h1: f.h1,
    meta_title: f.meta_title,
    meta_description: f.meta_description,
    content: {
      intro: f.intro,
      seoSections: [f.section],
      highlights: [],
      faq: [],
      internalLinks: f.links,
      card: { title: "", tagline: "", description: "", badges: [], featured: false },
      updatedDate: DATE,
      brief: { source: "seed:nuit-produits", note: "Texte propre à la fiche (différenciation vs Mon Sauveur). Prix et stock = table products. À relire avant publication." },
    },
  };
  const q = existing ? sb.from("seo_pages").update(row).eq("id", existing.id) : sb.from("seo_pages").insert(row);
  const { error } = await q;
  if (error) throw new Error(`${f.slug} : ${error.message}`);
  n++;
}
console.log(`${n} fiches en brouillon.`);
