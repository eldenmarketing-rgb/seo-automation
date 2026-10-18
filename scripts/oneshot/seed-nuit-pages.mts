/**
 * Brouillons des pages de contenu de « Livraison de Nuit » (site_key `nuit`) :
 *   2 pages de livraison (livraison/apero-de-nuit-perpignan, livraison/epicerie-de-nuit-perpignan)
 *   3 pages commune (livraison-alcool-nuit-<canet-en-roussillon|cabestany|saint-cyprien>)
 *   8 pages rayon (categorie/<slug>) — texte éditorial affiché au-dessus de la grille.
 *
 * Faits utilisés, et rien d'autre : 20h-4h 7j/7 fériés compris · Perpignan + ~15 km (19 communes) ·
 * une trentaine de minutes, un peu plus vers le littoral · commande par téléphone, total confirmé
 * avant le départ · paiement CB ou espèces à la livraison · majeurs uniquement · produits et prix = catalogue `products` du site (seed-nuit-catalogue.mts). Les softs
 * existent (formules, ancien site) mais sans référence au catalogue : « sur demande au téléphone ».
 * Aucun minimum de commande, aucun frais, aucun avis, aucune ancienneté n'est affirmé.
 *
 * Statut `draft` — relecture et publication depuis le dashboard (/pages).
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-nuit-pages.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "nuit";
const TEL = "09 73 92 08 28";
const DATE = new Date().toISOString().slice(0, 10);

type Link = { url: string; anchor: string; context: string };
type Page = {
  slug: string;
  page_type: "service" | "city_service" | "category";
  city: string;
  service: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  card: { title: string; tagline: string; description: string; badges: string[]; featured: boolean };
  intro: string;
  sections: { title: string; content: string }[];
  highlights: string[];
  faq: { question: string; answer: string }[];
  links: Link[];
};

const L = {
  apero: { url: "/livraison/apero-de-nuit-perpignan", anchor: "Apéro de nuit à Perpignan", context: "L'apéro complet livré chez vous, même tard." },
  epicerie: { url: "/livraison/epicerie-de-nuit-perpignan", anchor: "Épicerie de nuit à Perpignan", context: "Ce qui manque quand tout est fermé." },
  vodkas: { url: "/categorie/vodkas", anchor: "Vodkas", context: "Poliakov, Absolut, en 70 cl." },
  whiskys: { url: "/categorie/whiskys", anchor: "Whiskys", context: "Label 5, Johnnie Walker." },
  rhums: { url: "/categorie/rhums", anchor: "Rhums", context: "Captain Morgan 70 cl." },
  aperitifs: { url: "/categorie/aperitifs-liqueurs", anchor: "Apéritifs et liqueurs", context: "Ricard, Get 27, Malibu, Baileys." },
  bieres: { url: "/categorie/bieres", anchor: "Bières", context: "Heineken 33 cl, livrée fraîche." },
  bulles: { url: "/categorie/bulles", anchor: "Bulles", context: "Cava 70 cl." },
  snacks: { url: "/categorie/softs-snacks", anchor: "Softs et snacks", context: "Chips, bonbons, barres chocolatées." },
  formules: { url: "/categorie/formules", anchor: "Formules", context: "Bouteille + soft, prêtes à servir." },
  canet: { url: "/livraison-alcool-nuit-canet-en-roussillon", anchor: "Livraison à Canet-en-Roussillon", context: "Village, plage et port, la nuit." },
  cabestany: { url: "/livraison-alcool-nuit-cabestany", anchor: "Livraison à Cabestany", context: "À deux pas de Perpignan." },
  stcyp: { url: "/livraison-alcool-nuit-saint-cyprien", anchor: "Livraison à Saint-Cyprien", context: "Village et plage, un peu plus de route." },
};

const AGE =
  "La vente d'alcool est interdite aux mineurs : nous livrons uniquement des personnes majeures. L'abus d'alcool est dangereux pour la santé, à consommer avec modération.";

const FAQ_COMMUNE = (ville: string, delai: string) => [
  { question: `Jusqu'à quelle heure livrez-vous à ${ville} ?`, answer: `Tous les soirs de 20h à 4h du matin, 7 jours sur 7, jours fériés compris, à ${ville} comme à Perpignan.` },
  { question: `Combien de temps pour être livré à ${ville} ?`, answer: delai },
  { question: "Comment je paie ?", answer: "À la livraison, par carte bancaire ou en espèces. Le total est confirmé au téléphone au moment de la commande, il n'y a rien à payer en ligne." },
  { question: "Faut-il être majeur ?", answer: "Oui. La vente d'alcool est interdite aux mineurs." },
];

const pages: Page[] = [
  // ───────────────────────── Livraison : apéro de nuit ─────────────────────────
  {
    slug: "livraison/apero-de-nuit-perpignan",
    page_type: "service",
    city: "Perpignan",
    service: "Apéro de nuit",
    h1: "Apéro de nuit à Perpignan, livré chez vous en une trentaine de minutes",
    meta_title: "Apéro de nuit Perpignan : livraison 20h-4h, bouteille + soft",
    meta_description:
      "Apéro de nuit livré à domicile à Perpignan et alentours, tous les soirs de 20h à 4h : vodka, whisky, rhum, bières, bulles, snacks. Commande par téléphone, paiement à la livraison.",
    card: {
      title: "Apéro de nuit",
      tagline: "L'apéro complet livré chez vous, même tard.",
      description: "Bouteille, soft, chips et bonbons en une seule commande, préparée et livrée à Perpignan et alentours en une trentaine de minutes.",
      badges: ["20h – 4h", "Paiement à la livraison"],
      featured: true,
    },
    intro:
      "Il est 23h, les amis sont là, et il manque la bouteille, le soft ou les chips. Les supermarchés ont fermé, les épiceries aussi. Vous appelez le " + TEL + ", vous dites ce qu'il vous faut et où vous êtes : on confirme le total et le délai, et on part. Chez vous en une trentaine de minutes, à Perpignan et dans les communes voisines, tous les soirs de 20h à 4h.\n\nPas d'application, pas de compte à créer, pas de panier à remplir à minuit. Un appel, une adresse, et vous réglez à la porte, par carte ou en espèces.",
    sections: [
      {
        title: "Ce qu'on livre pour un apéro de nuit",
        content:
          "Tout ce qu'il faut pour que la soirée continue, dans nos rayons :\n\n- **Vodkas** : [Poliakov 70 cl à 29,90 €](/produit/poliakov-70cl), [Absolut 70 cl à 39,90 €](/produit/absolut-70cl).\n- **Whiskys** : [Label 5](/produit/label-5-70cl) à 29,90 €, [Johnnie Walker](/produit/johnnie-walker-70cl) à 39,90 €.\n- **Rhum** : [Captain Morgan 70 cl](/produit/captain-morgan-70cl) à 29,90 €, la base du rhum-coca.\n- **Apéritifs et liqueurs** : Ricard, Get 27, Malibu, Baileys.\n- **Bières** : Heineken 33 cl à 3 € l'unité, livrée fraîche, en quantité.\n- **Bulles** : Cava 70 cl à 30 €, pour marquer le coup sans attendre demain.\n- **Snacks** : Pringles, M&M's, Tagada, Snickers, Mars.\n- **Formules** : la bouteille et son soft, prêts à servir, à partir de 34,90 €.\n\nUn soft seul, une quantité particulière, quelque chose qui n'est pas dans la liste ? Dites-le au téléphone, on vous répond tout de suite. Tous les prix sont affichés sur les [rayons](/#rayons) : c'est ce que vous payez à la livraison.",
      },
      {
        title: "Comment ça se passe",
        content:
          "1. **Vous appelez le " + TEL + "** et vous dites ce qu'il vous faut, avec votre adresse à Perpignan ou dans une commune voisine.\n2. **On confirme le total et le délai** avant de partir. Si un produit manque ce soir-là, on vous propose l'équivalent au téléphone, pas à la porte.\n3. **On prépare et on part.** Une trentaine de minutes en moyenne à Perpignan et dans les communes proches, un peu plus vers le littoral.\n4. **Vous payez à la livraison**, par carte bancaire ou en espèces. La bouteille arrive fermée, les bières fraîches.\n\nLe numéro est le même tous les soirs, de 20h à 4h, jours fériés compris. Passé 4h, la ligne rouvre le soir même à 20h.",
      },
      {
        title: "Les formules, pour ne pas réfléchir",
        content:
          "Quand il est tard, la question n'est pas « quelle bouteille » mais « qu'est-ce qui va avec ». Les [formules](/categorie/formules) règlent ça : une bouteille de 70 cl et son soft, dans la même commande.\n\n- [Formule Poliakov](/produit/formule-poliakov) : vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L, 34,90 €.\n- [Formule Captain Morgan](/produit/formule-captain-morgan) : autour du rhum épicé, 34,90 €.\n- [Formule Absolut](/produit/formule-absolut) : autour de la vodka Absolut, 44,90 €.\n- [Formule Johnnie Walker](/produit/formule-johnnie-walker) : autour du whisky écossais, 44,50 €.\n\nLe détail de chaque formule vous est confirmé au téléphone au moment de la commande.",
      },
      {
        title: "Perpignan et les communes voisines, la nuit",
        content:
          "Nous livrons tout Perpignan, du centre historique à Saint-Assiscle, du Moulin-à-Vent au Bas-Vernet, de Catalunya à Las Cobas, et les communes dans un rayon d'environ 15 km : [Cabestany](/livraison-alcool-nuit-cabestany), [Canet-en-Roussillon](/livraison-alcool-nuit-canet-en-roussillon), [Saint-Cyprien](/livraison-alcool-nuit-saint-cyprien), Rivesaltes, Bompas, Saint-Estève, Toulouges, Le Soler, Pia, Claira, Villeneuve-de-la-Raho, Thuir, Elne, Argelès-sur-Mer, Sainte-Marie-la-Mer, Torreilles, Le Barcarès et Leucate.\n\nLe délai dépend de la distance : une trentaine de minutes en moyenne, un peu plus vers la côte. Vous n'êtes pas sûr d'être dans la zone ? Appelez, on vous le dit tout de suite.\n\nPour un dépannage qui n'a rien d'un apéro, softs, snacks ou une bouteille qui manque, c'est la même ligne : voir l'[épicerie de nuit](/livraison/epicerie-de-nuit-perpignan).\n\n" + AGE,
      },
    ],
    highlights: [
      "Tous les soirs de 20h à 4h, jours fériés compris",
      "Total et délai confirmés au téléphone avant le départ",
      "Une trentaine de minutes à Perpignan et dans les communes proches",
      "Paiement carte ou espèces à la livraison",
    ],
    faq: [
      { question: "Vous livrez jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h du matin, 7 jours sur 7, jours fériés compris." },
      { question: "En combien de temps l'apéro arrive ?", answer: "Une trentaine de minutes en moyenne à Perpignan et dans les communes proches, le temps de préparer la commande et de venir jusqu'à vous. Vers le littoral, comptez un peu plus : on vous donne le délai au téléphone." },
      { question: "Comment je commande ?", answer: "Par téléphone, au " + TEL + ". Vous dites ce qu'il vous faut et votre adresse, on confirme le total et le délai, on part. Pas de commande en ligne, pas de compte à créer." },
      { question: "Comment je paie ?", answer: "À la livraison, par carte bancaire ou en espèces. Rien à payer en ligne." },
      { question: "Vous avez des softs et des glaçons ?", answer: "Les softs se commandent au téléphone avec la bouteille, et nos formules en contiennent déjà un. Pour le reste, demandez : on vous dit ce qui est disponible ce soir." },
      { question: "Faut-il être majeur ?", answer: "Oui. La vente d'alcool est interdite aux mineurs." },
    ],
    links: [L.formules, L.epicerie, L.vodkas],
  },

  // ───────────────────────── Livraison : épicerie de nuit ─────────────────────────
  {
    slug: "livraison/epicerie-de-nuit-perpignan",
    page_type: "service",
    city: "Perpignan",
    service: "Épicerie de nuit",
    h1: "Épicerie de nuit à Perpignan : on livre quand tout est fermé",
    meta_title: "Épicerie de nuit Perpignan : livraison à domicile 20h-4h",
    meta_description:
      "Épicerie de nuit à Perpignan et alentours : bières, bouteilles, snacks et softs livrés chez vous de 20h à 4h, quand supermarchés et épiceries ont fermé. Un appel, paiement à la livraison.",
    card: {
      title: "Épicerie de nuit",
      tagline: "Quand tout est fermé, on vient à vous.",
      description: "Bières, bouteilles, snacks et softs livrés la nuit à domicile, quand les supermarchés et les épiceries ont baissé le rideau.",
      badges: ["7j/7", "Perpignan + 15 km"],
      featured: true,
    },
    intro:
      "À Perpignan, passé une certaine heure, il n'y a plus grand-chose d'ouvert. Le supermarché a fermé, l'épicerie du quartier aussi, et il manque une bière, un paquet de chips, une bouteille pour les invités qui restent. Livraison de Nuit est l'épicerie de nuit qui vient à vous : vous appelez le " + TEL + ", on confirme le total, on livre chez vous en une trentaine de minutes, tous les soirs de 20h à 4h.\n\nPas de rideau à chercher ouvert, pas de route à faire à 2h du matin. Un appel, et vous réglez à la porte.",
    sections: [
      {
        title: "Ce que l'épicerie de nuit apporte chez vous",
        content:
          "Nos rayons couvrent ce qu'on cherche le plus souvent une fois les magasins fermés :\n\n- **Bières** : [Heineken 33 cl](/produit/heineken-33cl) à 3 € l'unité, fraîche, en quantité.\n- **Snacks** : [Pringles](/produit/pringles-original) Original, Cream & Onion ou Hot, [M&M's](/produit/m-ms-330g) en sachet de 45 g ou 330 g, [Tagada](/produit/fraises-tagada), Schtroumpfs, Snickers, Mars.\n- **Bouteilles** : [vodkas](/categorie/vodkas), [whiskys](/categorie/whiskys), [rhum](/categorie/rhums), [apéritifs et liqueurs](/categorie/aperitifs-liqueurs), [cava](/categorie/bulles).\n- **Softs** : sur demande au téléphone, avec ou sans bouteille.\n\nLes prix sont ceux affichés sur chaque fiche ; c'est ce que vous payez à la livraison. Pour un produit qui n'est pas dans nos rayons, demandez : si on l'a ce soir, on vous le dit.",
      },
      {
        title: "Comment ça marche",
        content:
          "1. **Appelez le " + TEL + "** entre 20h et 4h. Dites ce qu'il vous faut et votre adresse.\n2. **On confirme le total et le délai** avant de partir. Si un produit manque, on vous propose l'équivalent tout de suite.\n3. **On livre** en une trentaine de minutes à Perpignan et dans les communes proches, un peu plus vers le littoral.\n4. **Vous payez à la porte**, par carte bancaire ou en espèces.\n\nC'est tout. Pas d'application à installer, pas de minimum à atteindre en remplissant un panier : vous demandez ce dont vous avez besoin, on vous dit le prix, vous décidez.",
      },
      {
        title: "Dans quels cas on nous appelle",
        content:
          "- **Les invités restent** et il n'y a plus rien dans le frigo : des bières fraîches et des chips en une commande.\n- **Un anniversaire improvisé** à minuit : une bouteille de [cava](/produit/cava-70cl) et des bonbons.\n- **La soirée se prolonge** et la bouteille est vide : voir l'[apéro de nuit](/livraison/apero-de-nuit-perpignan), avec les formules bouteille + soft.\n- **Un creux à 2h** : des snacks et un soft, sans sortir.\n- **Un week-end au bord de la mer** à [Canet](/livraison-alcool-nuit-canet-en-roussillon) ou [Saint-Cyprien](/livraison-alcool-nuit-saint-cyprien), où tout ferme encore plus tôt hors saison.\n\nNous livrons des adultes uniquement. " + AGE,
      },
      {
        title: "Perpignan et les communes voisines",
        content:
          "L'épicerie de nuit dessert tout Perpignan et les communes dans un rayon d'environ 15 km : Cabestany, Canet-en-Roussillon, Saint-Cyprien, Rivesaltes, Bompas, Saint-Estève, Toulouges, Le Soler, Pia, Claira, Villeneuve-de-la-Raho, Thuir, Elne, Argelès-sur-Mer, Sainte-Marie-la-Mer, Torreilles, Le Barcarès et Leucate.\n\nTous les soirs de 20h à 4h, jours fériés compris, au " + TEL + ". Passé 4h, la ligne rouvre le soir même à 20h.",
      },
    ],
    highlights: [
      "Ouvert quand les supermarchés et les épiceries sont fermés",
      "Bières fraîches, snacks, bouteilles, softs sur demande",
      "Livré en une trentaine de minutes, paiement à la porte",
      "Perpignan et 18 communes voisines",
    ],
    faq: [
      { question: "C'est une vraie épicerie de nuit ?", answer: "C'est une épicerie de nuit en livraison : pas de boutique où venir, c'est nous qui venons. Vous appelez, on confirme le total, on livre chez vous entre 20h et 4h." },
      { question: "Vous livrez des softs et de l'eau ?", answer: "Les softs se commandent au téléphone, avec ou sans bouteille. Demandez ce qu'il vous faut, on vous dit ce qui est disponible ce soir." },
      { question: "Il y a un minimum de commande ?", answer: "Dites-nous ce qu'il vous faut, on vous annonce le total au téléphone avant de partir. Vous décidez en connaissance de cause." },
      { question: "En combien de temps ?", answer: "Une trentaine de minutes en moyenne à Perpignan et dans les communes proches, un peu plus vers la côte." },
      { question: "Comment je paie ?", answer: "À la livraison, par carte bancaire ou en espèces." },
      { question: "Et si je suis mineur ?", answer: "Nous ne livrons pas d'alcool aux mineurs." },
    ],
    links: [L.apero, L.bieres, L.snacks],
  },

  // ───────────────────────── Communes ─────────────────────────
  {
    slug: "livraison-alcool-nuit-canet-en-roussillon",
    page_type: "city_service",
    city: "Canet-en-Roussillon",
    service: "Livraison alcool nuit",
    h1: "Livraison d'alcool la nuit à Canet-en-Roussillon",
    meta_title: "Livraison alcool nuit Canet-en-Roussillon : 20h-4h, à domicile",
    meta_description:
      "Alcool, apéro et snacks livrés la nuit à Canet-en-Roussillon, village, plage et port, de 20h à 4h. Commande par téléphone, paiement à la livraison.",
    card: { title: "Canet-en-Roussillon", tagline: "Village, plage et port, la nuit.", description: "Bouteilles, bières, snacks et formules livrés à Canet de 20h à 4h.", badges: ["20h – 4h", "Paiement à la livraison"], featured: false },
    intro:
      "À Canet-en-Roussillon, l'été, la soirée dure ; hors saison, tout ferme tôt. Dans les deux cas, quand il manque une bouteille, des bières ou des chips à 23h, vous appelez le " + TEL + " et on vient, au village comme à Canet-Plage ou vers le port. Tous les soirs de 20h à 4h, paiement à la livraison.",
    sections: [
      {
        title: "Ce qu'on livre à Canet",
        content:
          "Les mêmes rayons qu'à Perpignan, aux mêmes prix : [vodkas](/categorie/vodkas), [whiskys](/categorie/whiskys), [rhum](/categorie/rhums), [apéritifs](/categorie/aperitifs-liqueurs), [Heineken](/produit/heineken-33cl) fraîche à 3 € l'unité, [cava](/produit/cava-70cl), [snacks](/categorie/softs-snacks) et les [formules](/categorie/formules) bouteille + soft à partir de 34,90 €. Les softs seuls se demandent au téléphone.\n\nPour un apéro complet, voir l'[apéro de nuit](/livraison/apero-de-nuit-perpignan) ; pour un simple dépannage, l'[épicerie de nuit](/livraison/epicerie-de-nuit-perpignan). C'est la même ligne.",
      },
      {
        title: "Délai et paiement à Canet-en-Roussillon",
        content:
          "Canet est sur la côte, à une douzaine de kilomètres de Perpignan : comptez un peu plus que la trentaine de minutes habituelle, et on vous donne le délai précis au téléphone avant de partir, en même temps que le total. Vous payez à la porte, par carte bancaire ou en espèces.\n\nNous livrons dans toute la commune : Canet-Village, Canet-Plage, le port et les quartiers entre les deux. Précisez la résidence et l'étage, ça fait gagner du temps au livreur.\n\n" + AGE,
      },
    ],
    highlights: ["Village, plage et port", "Tous les soirs de 20h à 4h", "Carte ou espèces à la livraison"],
    faq: FAQ_COMMUNE("Canet-en-Roussillon", "Un peu plus qu'à Perpignan, le temps de la route jusqu'à la côte. On vous annonce le délai au téléphone avant de partir."),
    links: [L.apero, L.epicerie, L.stcyp],
  },
  {
    slug: "livraison-alcool-nuit-cabestany",
    page_type: "city_service",
    city: "Cabestany",
    service: "Livraison alcool nuit",
    h1: "Livraison d'alcool la nuit à Cabestany",
    meta_title: "Livraison alcool nuit Cabestany : 20h-4h, à domicile",
    meta_description:
      "Bouteilles, bières, snacks et formules livrés la nuit à Cabestany, de 20h à 4h. À deux pas de Perpignan, délai court. Commande par téléphone, paiement à la livraison.",
    card: { title: "Cabestany", tagline: "À deux pas de Perpignan.", description: "Livraison d'alcool, d'apéro et de snacks à Cabestany de 20h à 4h, délai court.", badges: ["20h – 4h", "Délai court"], featured: false },
    intro:
      "Cabestany touche Perpignan : pour nous, c'est le même trajet que le sud de la ville. Quand il manque une bouteille, des bières fraîches ou des chips, vous appelez le " + TEL + " et on arrive en une trentaine de minutes, tous les soirs de 20h à 4h, paiement à la livraison.",
    sections: [
      {
        title: "Ce qu'on livre à Cabestany",
        content:
          "Tout le catalogue, aux prix affichés : [vodkas](/categorie/vodkas) Poliakov et Absolut, [whiskys](/categorie/whiskys) Label 5 et Johnnie Walker, [Captain Morgan](/produit/captain-morgan-70cl), Ricard, Get 27, Malibu, Baileys, [Heineken](/produit/heineken-33cl) à 3 € l'unité, [cava](/produit/cava-70cl), [snacks](/categorie/softs-snacks) et [formules](/categorie/formules) bouteille + soft. Les softs seuls se demandent au téléphone.\n\nApéro complet ou simple dépannage, c'est la même ligne : [apéro de nuit](/livraison/apero-de-nuit-perpignan) ou [épicerie de nuit](/livraison/epicerie-de-nuit-perpignan).",
      },
      {
        title: "Délai et paiement à Cabestany",
        content:
          "Cabestany est l'une des communes les plus proches de notre zone : une trentaine de minutes en moyenne, le temps de préparer la commande et de venir. Le total et le délai sont confirmés au téléphone avant le départ ; vous payez à la porte, par carte bancaire ou en espèces.\n\nNous livrons toute la commune, du centre aux lotissements et à la zone du Mas Guérido. Donnez le nom de la rue et, en résidence, l'étage et le code.\n\n" + AGE,
      },
    ],
    highlights: ["Toute la commune", "Une trentaine de minutes", "Carte ou espèces à la livraison"],
    faq: FAQ_COMMUNE("Cabestany", "Une trentaine de minutes en moyenne : Cabestany est à côté de Perpignan. Le délai exact vous est annoncé au téléphone."),
    links: [L.apero, L.epicerie, L.canet],
  },
  {
    slug: "livraison-alcool-nuit-saint-cyprien",
    page_type: "city_service",
    city: "Saint-Cyprien",
    service: "Livraison alcool nuit",
    h1: "Livraison d'alcool la nuit à Saint-Cyprien",
    meta_title: "Livraison alcool nuit Saint-Cyprien : village et plage, 20h-4h",
    meta_description:
      "Alcool, apéro, bières et snacks livrés la nuit à Saint-Cyprien, village et plage, de 20h à 4h. Commande par téléphone, total confirmé avant le départ, paiement à la livraison.",
    card: { title: "Saint-Cyprien", tagline: "Village et plage, un peu plus de route.", description: "Livraison d'alcool et d'apéro à Saint-Cyprien de 20h à 4h, délai annoncé au téléphone.", badges: ["20h – 4h", "Village et plage"], featured: false },
    intro:
      "Saint-Cyprien, c'est le village, la plage, le port et les Capellans : des soirées qui finissent tard l'été, et pas grand-chose d'ouvert le reste de l'année. Quand il manque une bouteille, des bières ou des snacks, vous appelez le " + TEL + " : on confirme le total et le délai, et on part. Tous les soirs de 20h à 4h, paiement à la livraison.",
    sections: [
      {
        title: "Ce qu'on livre à Saint-Cyprien",
        content:
          "Les rayons sont les mêmes qu'à Perpignan, aux mêmes prix : [vodkas](/categorie/vodkas), [whiskys](/categorie/whiskys), [rhum](/categorie/rhums), [apéritifs et liqueurs](/categorie/aperitifs-liqueurs), [Heineken](/produit/heineken-33cl) fraîche, [cava](/produit/cava-70cl), [snacks](/categorie/softs-snacks) et [formules](/categorie/formules) bouteille + soft. Les softs seuls se demandent au téléphone.\n\nPour la soirée qui continue, l'[apéro de nuit](/livraison/apero-de-nuit-perpignan) ; pour le dépannage, l'[épicerie de nuit](/livraison/epicerie-de-nuit-perpignan).",
      },
      {
        title: "Délai et paiement à Saint-Cyprien",
        content:
          "Saint-Cyprien est sur le littoral, au bout de notre zone : comptez plus que la trentaine de minutes habituelle. On vous annonce le délai précis au téléphone avant de partir, avec le total, et vous décidez. Paiement à la porte, par carte bancaire ou en espèces.\n\nNous livrons le village, Saint-Cyprien-Plage, le port et les Capellans. En résidence de vacances, précisez le bâtiment et le code d'accès.\n\n" + AGE,
      },
    ],
    highlights: ["Village, plage, port, Capellans", "Tous les soirs de 20h à 4h", "Délai annoncé avant le départ"],
    faq: FAQ_COMMUNE("Saint-Cyprien", "Plus qu'à Perpignan, Saint-Cyprien est au bout de la zone. On vous annonce le délai précis au téléphone avant de partir, et vous décidez."),
    links: [L.apero, L.epicerie, L.canet],
  },

  // ───────────────────────── Rayons ─────────────────────────
  {
    slug: "categorie/vodkas",
    page_type: "category",
    city: "Perpignan",
    service: "Vodkas",
    h1: "Livraison de vodka la nuit à Perpignan",
    meta_title: "Livraison vodka Perpignan la nuit : Poliakov, Absolut, 20h-4h",
    meta_description:
      "Vodka livrée chez vous à Perpignan et alentours de 20h à 4h : Poliakov 70 cl à 29,90 €, Absolut 70 cl à 39,90 €, formules avec soft. Commande par téléphone, paiement à la livraison.",
    card: { title: "Vodkas", tagline: "Poliakov, Absolut, en 70 cl.", description: "Vodkas livrées fermées à Perpignan et alentours, de 20h à 4h.", badges: ["70 cl", "20h – 4h"], featured: false },
    intro:
      "La vodka est la bouteille qu'on nous demande le plus la nuit. Deux références en 70 cl, livrées fermées à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h : [Poliakov](/produit/poliakov-70cl) à 29,90 € et [Absolut](/produit/absolut-70cl) à 39,90 €. Vous appelez le " + TEL + ", on confirme, on part.",
    sections: [
      {
        title: "Poliakov ou Absolut ?",
        content:
          "**Poliakov 70 cl, 29,90 €** : la vodka de soirée par excellence, neutre, qui se mélange avec tout. C'est la base de notre [formule Poliakov](/produit/formule-poliakov) avec une bouteille de Crazy Tiger 1 L, à 34,90 €.\n\n**Absolut 70 cl, 39,90 €** : la suédoise, plus ronde, pour ceux qui la boivent aussi pure ou sur glace. Elle existe aussi en [formule](/produit/formule-absolut).\n\nUn soft pour accompagner ? Dites-le au téléphone, on l'ajoute à la commande.",
      },
      {
        title: "Livrée fermée, payée à la porte",
        content:
          "La bouteille arrive scellée. Vous payez à la livraison, par carte bancaire ou en espèces, le prix affiché ici. Nous livrons Perpignan et les communes dans un rayon d'environ 15 km, tous les soirs de 20h à 4h, jours fériés compris.\n\n" + AGE + " Voir aussi nos [whiskys](/categorie/whiskys) et nos [rhums](/categorie/rhums).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Vous livrez la vodka jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, 7 jours sur 7, jours fériés compris, à Perpignan et dans les communes voisines." },
      { question: "Vous avez d'autres vodkas que Poliakov et Absolut ?", answer: "Ce sont les deux références de nos rayons. Demandez au téléphone : si on a autre chose ce soir, on vous le dit." },
      { question: "Je peux avoir un soft avec ?", answer: "Oui : nos formules en contiennent déjà un, et un soft seul se commande au téléphone avec la bouteille." },
    ],
    links: [L.formules, L.whiskys, L.apero],
  },
  {
    slug: "categorie/whiskys",
    page_type: "category",
    city: "Perpignan",
    service: "Whiskys",
    h1: "Livraison de whisky la nuit à Perpignan",
    meta_title: "Livraison whisky Perpignan la nuit : Label 5, Johnnie Walker",
    meta_description:
      "Whisky livré chez vous à Perpignan et alentours de 20h à 4h : Label 5 70 cl à 29,90 €, Johnnie Walker 70 cl à 39,90 €. Commande par téléphone, paiement à la livraison.",
    card: { title: "Whiskys", tagline: "Label 5, Johnnie Walker.", description: "Whiskys 70 cl livrés la nuit à domicile.", badges: ["70 cl", "20h – 4h"], featured: false },
    intro:
      "Deux whiskys écossais en 70 cl, livrés à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h : [Label 5](/produit/label-5-70cl) à 29,90 € et [Johnnie Walker](/produit/johnnie-walker-70cl) à 39,90 €. Un appel au " + TEL + ", le total confirmé, et on part.",
    sections: [
      {
        title: "Label 5 ou Johnnie Walker ?",
        content:
          "**Label 5 70 cl, 29,90 €** : le blend écossais accessible, celui des whisky-coca de fin de soirée.\n\n**Johnnie Walker 70 cl, 39,90 €** : le blend le plus connu au monde, plus de caractère, pur ou allongé. Il existe en [formule](/produit/formule-johnnie-walker) à 44,50 €.\n\nLe soft se commande au téléphone avec la bouteille.",
      },
      {
        title: "Livré fermé, payé à la porte",
        content:
          "La bouteille arrive scellée, vous payez à la livraison par carte ou en espèces, au prix affiché. Perpignan et les communes dans un rayon d'environ 15 km, tous les soirs de 20h à 4h.\n\n" + AGE + " Voir aussi nos [vodkas](/categorie/vodkas) et nos [rhums](/categorie/rhums).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, jours fériés compris." },
      { question: "Vous avez du whisky irlandais ou américain ?", answer: "Nos deux références sont écossaises. Demandez au téléphone pour le reste : on vous dit ce qui est disponible ce soir." },
      { question: "Comment je paie ?", answer: "À la livraison, par carte bancaire ou en espèces." },
    ],
    links: [L.vodkas, L.rhums, L.formules],
  },
  {
    slug: "categorie/rhums",
    page_type: "category",
    city: "Perpignan",
    service: "Rhums",
    h1: "Livraison de rhum la nuit à Perpignan",
    meta_title: "Livraison rhum Perpignan la nuit : Captain Morgan 70 cl, 20h-4h",
    meta_description:
      "Rhum livré chez vous à Perpignan et alentours de 20h à 4h : Captain Morgan 70 cl à 29,90 €, en formule avec soft à 34,90 €. Commande par téléphone, paiement à la livraison.",
    card: { title: "Rhums", tagline: "Captain Morgan 70 cl.", description: "Rhum livré la nuit à Perpignan et dans les communes voisines.", badges: ["70 cl", "20h – 4h"], featured: false },
    intro:
      "Le rhum de nos rayons, c'est [Captain Morgan 70 cl](/produit/captain-morgan-70cl) à 29,90 €, le rhum épicé du rhum-coca. Livré fermé à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h, sur un appel au " + TEL + ".",
    sections: [
      {
        title: "Captain Morgan, seul ou en formule",
        content:
          "**Captain Morgan 70 cl, 29,90 €** : rhum épicé des Caraïbes, doux et vanillé, fait pour le coca et la glace.\n\n**[Formule Captain Morgan](/produit/formule-captain-morgan), 34,90 €** : la bouteille et son accompagnement dans la même commande, le détail confirmé au téléphone.\n\nPour un rhum blanc ou un rhum agricole, demandez : on vous dit ce qu'on a ce soir.",
      },
      {
        title: "Livré fermé, payé à la porte",
        content:
          "Bouteille scellée, paiement à la livraison par carte ou en espèces, au prix affiché. Perpignan et un rayon d'environ 15 km, tous les soirs de 20h à 4h.\n\n" + AGE + " Voir aussi les [apéritifs et liqueurs](/categorie/aperitifs-liqueurs) et les [formules](/categorie/formules).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, jours fériés compris." },
      { question: "Vous livrez le coca avec ?", answer: "Oui, le soft se commande au téléphone avec la bouteille, ou directement dans la formule Captain Morgan." },
      { question: "Comment je paie ?", answer: "À la livraison, par carte bancaire ou en espèces." },
    ],
    links: [L.formules, L.aperitifs, L.apero],
  },
  {
    slug: "categorie/aperitifs-liqueurs",
    page_type: "category",
    city: "Perpignan",
    service: "Apéritifs et liqueurs",
    h1: "Apéritifs et liqueurs livrés la nuit à Perpignan",
    meta_title: "Livraison pastis, liqueurs Perpignan la nuit : Ricard, Get 27, Malibu, Baileys",
    meta_description:
      "Ricard, Get 27, Malibu et Baileys livrés chez vous à Perpignan et alentours de 20h à 4h. Commande par téléphone, paiement à la livraison, bouteilles 70 cl.",
    card: { title: "Apéritifs et liqueurs", tagline: "Ricard, Get 27, Malibu, Baileys.", description: "Pastis et liqueurs pour l'apéro de nuit, en 70 cl.", badges: ["70 cl", "20h – 4h"], featured: false },
    intro:
      "Le rayon de l'apéro qui n'est ni vodka ni whisky : [Ricard](/produit/ricard-70cl) pour le pastis, [Get 27](/produit/jet-27-70cl) pour la menthe glacée, [Malibu](/produit/malibu-70cl) pour la coco, [Baileys](/produit/baileys-70cl) pour la fin de soirée. En 70 cl, livrés fermés à Perpignan et alentours de 20h à 4h, sur un appel au " + TEL + ".",
    sections: [
      {
        title: "Quatre bouteilles, quatre moments",
        content:
          "- **Ricard 70 cl, 39,90 €** : le pastis de Marseille, avec de l'eau bien fraîche.\n- **Get 27 70 cl, 29,90 €** : liqueur de menthe, sur glace ou en pile-face.\n- **Malibu 70 cl, 35 €** : rhum et noix de coco, avec un jus d'ananas ou d'orange.\n- **Baileys 70 cl, 35 €** : crème de whisky, pure sur glace ou dans un café.\n\nLes softs et jus se commandent au téléphone avec la bouteille.",
      },
      {
        title: "Livré fermé, payé à la porte",
        content:
          "Bouteilles scellées, paiement à la livraison par carte ou en espèces, au prix affiché. Perpignan et les communes dans un rayon d'environ 15 km, tous les soirs de 20h à 4h.\n\n" + AGE + " Voir aussi nos [rhums](/categorie/rhums) et nos [bulles](/categorie/bulles).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, jours fériés compris." },
      { question: "Vous avez d'autres apéritifs ?", answer: "Ces quatre références sont celles de nos rayons. Demandez au téléphone, on vous dit ce qu'on a ce soir." },
      { question: "Comment je paie ?", answer: "À la livraison, par carte bancaire ou en espèces." },
    ],
    links: [L.rhums, L.bulles, L.apero],
  },
  {
    slug: "categorie/bieres",
    page_type: "category",
    city: "Perpignan",
    service: "Bières",
    h1: "Livraison de bière la nuit à Perpignan",
    meta_title: "Livraison bière Perpignan la nuit : Heineken fraîche, 20h-4h",
    meta_description:
      "Bière livrée fraîche chez vous à Perpignan et alentours de 20h à 4h : Heineken 33 cl à 3 € l'unité, en quantité. Commande par téléphone, paiement à la livraison.",
    card: { title: "Bières", tagline: "Heineken 33 cl, livrée fraîche.", description: "Bières fraîches livrées à l'unité ou en quantité, de 20h à 4h.", badges: ["33 cl", "Livrée fraîche"], featured: false },
    intro:
      "Il manque des bières et tout est fermé : c'est l'appel le plus simple qu'on reçoit. [Heineken 33 cl](/produit/heineken-33cl) à 3 € l'unité, livrée fraîche à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h. Dites la quantité au " + TEL + ", on confirme le total, on part.",
    sections: [
      {
        title: "Combien de bières ?",
        content:
          "Le prix est à l'unité, 3 € la bouteille de 33 cl : vous commandez six, douze ou vingt-quatre bières, c'est vous qui dites. Le total est confirmé au téléphone avant qu'on parte, et les bouteilles arrivent fraîches.\n\nUne autre marque ? Demandez : si on l'a ce soir, on vous le dit. Des chips avec ? Voir le rayon [softs et snacks](/categorie/softs-snacks).",
      },
      {
        title: "Livrée fraîche, payée à la porte",
        content:
          "Paiement à la livraison, par carte bancaire ou en espèces. Perpignan et les communes dans un rayon d'environ 15 km, tous les soirs de 20h à 4h, jours fériés compris.\n\n" + AGE + " Pour un apéro complet, voir l'[apéro de nuit](/livraison/apero-de-nuit-perpignan).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Les bières arrivent fraîches ?", answer: "Oui, elles partent du frais et arrivent en une trentaine de minutes." },
      { question: "Il y a un nombre minimum ?", answer: "Dites la quantité au téléphone, on vous annonce le total avant de partir, et vous décidez." },
      { question: "Jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, jours fériés compris." },
    ],
    links: [L.snacks, L.epicerie, L.apero],
  },
  {
    slug: "categorie/bulles",
    page_type: "category",
    city: "Perpignan",
    service: "Bulles",
    h1: "Livraison de bulles la nuit à Perpignan",
    meta_title: "Livraison cava Perpignan la nuit : bulles à domicile 20h-4h",
    meta_description:
      "Une bouteille de bulles livrée chez vous à Perpignan et alentours de 20h à 4h : Cava 70 cl à 30 €. Pour fêter quelque chose sans attendre demain. Paiement à la livraison.",
    card: { title: "Bulles", tagline: "Cava 70 cl.", description: "Des bulles pour fêter quelque chose à n'importe quelle heure.", badges: ["70 cl", "20h – 4h"], featured: false },
    intro:
      "Un anniversaire qui tombe à minuit, une bonne nouvelle, une envie de trinquer : [Cava 70 cl](/produit/cava-70cl) à 30 €, livré à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h. Un appel au " + TEL + ", et on arrive avec la bouteille.",
    sections: [
      {
        title: "Le cava, les bulles de la nuit",
        content:
          "**Cava brut 70 cl, 30 €** : les bulles catalanes, sèches et vives, faites pour l'apéro et les toasts improvisés. C'est la référence de bulles de nos rayons.\n\nVous cherchez un champagne ou un crémant précis ? Demandez au téléphone : on vous dit ce qu'on a ce soir, sans promettre ce qu'on n'a pas.",
      },
      {
        title: "Livrée fermée, payée à la porte",
        content:
          "Bouteille scellée, paiement à la livraison par carte ou en espèces, au prix affiché. Perpignan et un rayon d'environ 15 km, tous les soirs de 20h à 4h.\n\n" + AGE + " Des bonbons ou des chips pour aller avec ? Rayon [softs et snacks](/categorie/softs-snacks).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Vous livrez du champagne ?", answer: "Notre référence de bulles est le cava. Pour un champagne, demandez au téléphone : on vous dit ce qui est disponible ce soir." },
      { question: "Le cava arrive frais ?", answer: "Il part du frais et arrive en une trentaine de minutes." },
      { question: "Jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, jours fériés compris." },
    ],
    links: [L.snacks, L.apero, L.aperitifs],
  },
  {
    slug: "categorie/softs-snacks",
    page_type: "category",
    city: "Perpignan",
    service: "Softs et snacks",
    h1: "Snacks et softs livrés la nuit à Perpignan",
    meta_title: "Livraison snacks Perpignan la nuit : chips, bonbons, softs 20h-4h",
    meta_description:
      "Pringles, M&M's, Tagada, Snickers, Mars et softs livrés chez vous à Perpignan et alentours de 20h à 4h. L'épicerie de nuit, sans sortir. Paiement à la livraison.",
    card: { title: "Softs et snacks", tagline: "Chips, bonbons, barres chocolatées.", description: "L'épicerie de nuit : snacks et softs livrés chez vous de 20h à 4h.", badges: ["Épicerie de nuit", "20h – 4h"], featured: false },
    intro:
      "C'est le rayon de l'[épicerie de nuit](/livraison/epicerie-de-nuit-perpignan) : ce qu'on cherche à 1h du matin quand le placard est vide. [Pringles](/produit/pringles-original), [M&M's](/produit/m-ms-330g), [Tagada](/produit/fraises-tagada), Schtroumpfs, Snickers, Mars, et les softs sur demande. Livrés à Perpignan et alentours en une trentaine de minutes, tous les soirs de 20h à 4h, sur un appel au " + TEL + ".",
    sections: [
      {
        title: "Ce qu'il y a dans le rayon",
        content:
          "- **Chips** : Pringles Original et Cream & Onion à 4,50 €, Pringles Hot à 5 €, en boîte de 160 g.\n- **Bonbons** : M&M's en sachet de 45 g à 2 € ou de 330 g à 10 €, Fraises Tagada et Haribo Schtroumpfs à 2,50 € le sachet.\n- **Barres** : Snickers et Mars à 1,50 €.\n- **Softs** : sur demande au téléphone, avec ou sans bouteille. Nos [formules](/categorie/formules) en contiennent déjà un.\n\nTout se commande à l'unité, avec ou sans alcool : des chips et un soft, c'est une commande comme une autre.",
      },
      {
        title: "Livré en une trentaine de minutes, payé à la porte",
        content:
          "Paiement à la livraison, par carte bancaire ou en espèces, au prix affiché. Perpignan et les communes dans un rayon d'environ 15 km, tous les soirs de 20h à 4h, jours fériés compris.\n\nAvec des [bières fraîches](/categorie/bieres) ou une [bouteille](/categorie/vodkas), ça devient un [apéro de nuit](/livraison/apero-de-nuit-perpignan).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Je peux commander seulement des snacks, sans alcool ?", answer: "Oui. Des chips et un soft, c'est une commande comme une autre, aux mêmes horaires et au même numéro." },
      { question: "Quels softs vous avez ?", answer: "Les softs se demandent au téléphone : on vous dit ce qui est disponible ce soir." },
      { question: "Jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, jours fériés compris." },
    ],
    links: [L.epicerie, L.bieres, L.formules],
  },
  {
    slug: "categorie/formules",
    page_type: "category",
    city: "Perpignan",
    service: "Formules",
    h1: "Formules apéro livrées la nuit à Perpignan : bouteille + soft",
    meta_title: "Formules apéro Perpignan la nuit : bouteille + soft dès 34,90 €",
    meta_description:
      "Formules bouteille 70 cl + soft livrées chez vous à Perpignan et alentours de 20h à 4h : Poliakov + Crazy Tiger 34,90 €, Captain Morgan 34,90 €, Absolut 44,90 €, Johnnie Walker 44,50 €.",
    card: { title: "Formules", tagline: "Bouteille + soft, prêtes à servir.", description: "La bouteille et son accompagnement dans la même commande, dès 34,90 €.", badges: ["Dès 34,90 €", "20h – 4h"], featured: true },
    intro:
      "Quand il est tard, on ne veut pas réfléchir à ce qui va avec quoi. Une formule, c'est la bouteille de 70 cl et son soft dans la même commande, prêts à servir. Quatre formules, de 34,90 € à 44,90 €, livrées à Perpignan et dans les communes voisines en une trentaine de minutes, tous les soirs de 20h à 4h, sur un appel au " + TEL + ".",
    sections: [
      {
        title: "Les quatre formules",
        content:
          "- **[Formule Poliakov](/produit/formule-poliakov), 34,90 €** : vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L.\n- **[Formule Captain Morgan](/produit/formule-captain-morgan), 34,90 €** : autour du rhum épicé Captain Morgan 70 cl.\n- **[Formule Absolut](/produit/formule-absolut), 44,90 €** : autour de la vodka Absolut 70 cl.\n- **[Formule Johnnie Walker](/produit/formule-johnnie-walker), 44,50 €** : autour du whisky Johnnie Walker 70 cl.\n\nLe contenu exact de chaque formule vous est confirmé au téléphone au moment de la commande. Vous préférez composer vous-même ? Une bouteille au choix dans les [vodkas](/categorie/vodkas), [whiskys](/categorie/whiskys) ou [rhums](/categorie/rhums), et le soft demandé au téléphone.",
      },
      {
        title: "Livrée fermée, payée à la porte",
        content:
          "Bouteille scellée, soft avec, paiement à la livraison par carte ou en espèces, au prix affiché. Perpignan et un rayon d'environ 15 km, tous les soirs de 20h à 4h, jours fériés compris.\n\n" + AGE + " Des chips et des bonbons pour compléter ? Rayon [softs et snacks](/categorie/softs-snacks).",
      },
    ],
    highlights: [],
    faq: [
      { question: "Qu'est-ce qu'il y a dans une formule ?", answer: "La bouteille de 70 cl et son soft. Le détail exact vous est confirmé au téléphone quand vous commandez." },
      { question: "Je peux changer le soft ?", answer: "Demandez au téléphone : on vous dit ce qui est possible ce soir." },
      { question: "Jusqu'à quelle heure ?", answer: "Tous les soirs de 20h à 4h, jours fériés compris." },
    ],
    links: [L.apero, L.vodkas, L.snacks],
  },
];

const sb = getSupabase();
for (const p of pages) {
  const { data: existing } = await sb
    .from("seo_pages")
    .select("id, status")
    .eq("site_key", SITE)
    .eq("slug", p.slug)
    .maybeSingle();
  if (existing && existing.status === "published") {
    console.log("publiée, non touchée :", p.slug);
    continue;
  }
  const row = {
    site_key: SITE,
    slug: p.slug,
    city: p.city,
    service: p.service,
    page_type: p.page_type,
    intent: "service",
    mode: "local",
    status: "draft",
    h1: p.h1,
    meta_title: p.meta_title,
    meta_description: p.meta_description,
    content: {
      intro: p.intro,
      seoSections: p.sections,
      highlights: p.highlights,
      faq: p.faq,
      internalLinks: p.links,
      card: p.card,
      updatedDate: DATE,
      brief: {
        source: "seed:nuit-pages",
        note: "Rédigé le 2026-10-18 depuis les faits du service (20h-4h, 15 km, ~30 min, paiement à la livraison, catalogue réel). Softs sans référence = « sur demande ». À relire avant publication.",
      },
    },
  };
  const q = existing
    ? sb.from("seo_pages").update(row).eq("id", existing.id)
    : sb.from("seo_pages").insert(row);
  const { error } = await q;
  if (error) throw new Error(`${p.slug} : ${error.message}`);
  const words = [p.intro, ...p.sections.map((s) => s.content), ...p.faq.map((f) => f.answer)].join(" ").split(/\s+/).length;
  console.log(existing ? "mis à jour" : "créé", p.slug.padEnd(46), `~${words} mots`);
}
