/**
 * Pages CMS de la boutique de démonstration « Maison Canigou » (site_key
 * `starter-ecom-demo`) : deux guides (`conseils/…`, type article) et deux pages
 * permanentes liées depuis chaque fiche (`guide-des-tailles`, `entretien`).
 * Montre la rubrique Guides du template : encart produit au milieu, catégories
 * citées en fin d'article.
 *
 * Idempotent : upsert sur (site_key, slug), publié directement (démo).
 *
 *   npx tsx scripts/oneshot/seed-ecom-demo-pages.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "starter-ecom-demo";
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&h=1000&fit=crop&q=80`;

type Page = {
  slug: string;
  page_type: "article" | "utility";
  h1: string;
  meta_title: string;
  meta_description: string;
  heroImage?: { src: string; alt: string };
  card: { title: string; tagline: string; description: string; badges: string[]; featured: boolean };
  intro: string;
  sections: { title: string; content: string }[];
  highlights?: string[];
  faq: { question: string; answer: string }[];
  links: { url: string; anchor: string; context: string }[];
};

const pages: Page[] = [
  {
    slug: "conseils/quelle-taille-de-sweat-choisir",
    page_type: "article",
    h1: "Quelle taille de sweat choisir ? Le guide sans mauvaise surprise",
    meta_title: "Quelle taille de sweat choisir ? Guide des tailles et coupes",
    meta_description:
      "Coupe droite, ample ou oversize : comment choisir la taille d'un sweat à capuche sans se tromper, avec nos mesures à plat en centimètres.",
    heroImage: { src: U("1620799140188-3b2a02fd9a77"), alt: "Sweat à capuche écru suspendu, prêt à être essayé" },
    card: { title: "Quelle taille de sweat choisir ?", tagline: "", description: "Coupe droite, ample ou oversize : nos mesures à plat pour ne pas se tromper.", badges: [], featured: true },
    intro:
      "Un sweat trop petit serre aux épaules, un sweat trop grand tombe comme un sac. Entre les deux, il y a une taille qui vous va, et elle ne se devine pas au hasard. Voici comment nous la trouvons en boutique, avec un mètre et trois questions.",
    sections: [
      {
        title: "Mesurez un sweat que vous aimez, pas votre corps",
        content:
          "Le tour de poitrine du corps est trompeur : il ne dit rien de l'aisance que vous aimez porter. Prenez plutôt un sweat ou un pull que vous portez souvent, posez-le à plat, et mesurez d'une aisselle à l'autre. Doublez : c'est votre **tour de poitrine à plat**, la seule mesure qui compte.\n\nComparez-la à notre [guide des tailles](/guide-des-tailles) : XS 48 cm, S 50 cm, M 53 cm, L 56 cm, XL 59 cm. Si vous tombez pile entre deux, lisez la suite.",
      },
      {
        title: "Droite ou ample : la coupe décide de la taille",
        content:
          "Notre [sweat à capuche molleton](/produit/sweat-capuche-molleton) a une coupe légèrement ample : les épaules tombent de deux centimètres, le corps est droit. Prenez votre taille habituelle ; il tombe comme il faut sans flotter.\n\nLe [sweat col rond](/produit/sweat-col-rond) est plus près du corps. Entre deux tailles, prenez la plus grande si vous le portez sur une chemise, la plus petite sur un t-shirt.",
      },
      {
        title: "Le molleton bouge au lavage, un peu",
        content:
          "Un molleton 350 g rétrécit d'environ un centimètre en longueur au premier lavage à 30 °C, puis se stabilise. Nous avons taillé nos sweats en tenant compte de ce centimètre : inutile de prendre une taille au-dessus « pour le lavage ».\n\nLe sèche-linge, lui, en prend deux ou trois de plus et casse les fibres. Séchage à plat ou sur cintre, toujours.",
      },
      {
        title: "Et si ça ne va pas ?",
        content:
          "Vous avez 14 jours pour échanger, sans justification. Un coup de fil, nous envoyons l'étiquette, et la bonne taille part le jour même. Tous nos [sweats](/categorie/sweats) sont en stock dans les cinq tailles.",
      },
    ],
    highlights: [],
    faq: [
      { question: "Je fais 1 m 80 pour 75 kg, quelle taille ?", answer: "Avec une carrure moyenne, le M en coupe ample et le L en coupe droite. Mesurez un sweat que vous aimez, c'est plus sûr que la taille et le poids." },
      { question: "Les tailles sont-elles les mêmes pour femmes et hommes ?", answer: "Oui, nos sweats sont unisexes : la même grille pour tout le monde, du XS au XL. Les femmes prennent souvent une taille en dessous de leur habitude en coupe ample." },
    ],
    links: [
      { url: "/produit/sweat-capuche-molleton", anchor: "Sweat à capuche molleton", context: "Coupe ample, molleton 350 g, cinq tailles." },
      { url: "/categorie/sweats", anchor: "Tous nos sweats", context: "Capuche ou col rond, gris chiné, noir, écru." },
      { url: "/guide-des-tailles", anchor: "Guide des tailles", context: "Mesures à plat en centimètres." },
    ],
  },
  {
    slug: "conseils/entretenir-un-t-shirt-en-coton-bio",
    page_type: "article",
    h1: "Entretenir un t-shirt en coton bio pour qu'il dure dix ans",
    meta_title: "Entretenir un t-shirt en coton bio : lavage, séchage, repassage",
    meta_description:
      "Température de lavage, séchage, repassage, taches : les gestes qui font durer un t-shirt en coton bio, et ceux qui le tuent en six mois.",
    heroImage: { src: U("1562157873-818bc0726f68"), alt: "T-shirts pliés, prêts pour l'armoire" },
    card: { title: "Entretenir un t-shirt en coton bio", tagline: "", description: "Les gestes qui font durer un t-shirt, et ceux qui le tuent en six mois.", badges: [], featured: false },
    intro:
      "Un t-shirt en coton bio bien entretenu se porte dix ans. Mal entretenu, il est détendu, délavé et pelucheux en une saison. La différence ne tient pas à la marque : elle tient à quatre gestes, tous gratuits.",
    sections: [
      {
        title: "30 °C, à l'envers, sans adoucissant",
        content:
          "Le coton n'a pas besoin de chaleur pour être propre : 30 °C suffit à tout ce qui n'est pas une tache grasse. Retournez le t-shirt avant de le mettre en machine : la sérigraphie et la broderie ne frottent pas contre le tambour.\n\nL'adoucissant enrobe les fibres d'un film qui les empêche de respirer et finit par jaunir les blancs. Un demi-verre de vinaigre blanc dans le bac fait le même travail, sans le film.",
      },
      {
        title: "Jamais de sèche-linge",
        content:
          "C'est le geste qui tue un t-shirt. La chaleur casse les fibres, rétrécit le col et fait peler les impressions. Suspendu sur un cintre, un t-shirt sèche en deux heures l'été, une nuit l'hiver. Posé à plat, il garde exactement sa forme.\n\nNotre [t-shirt Essentiel](/produit/t-shirt-essentiel) a un col doublé précisément pour résister aux cintres : il ne bâille pas.",
      },
      {
        title: "Les taches : vite, et à froid",
        content:
          "Une tache de gras se traite avec une goutte de liquide vaisselle, frottée du bout du doigt, puis lavage normal. Une tache de vin ou de fruit se rince à l'eau froide tout de suite — jamais chaude, elle la fixerait.\n\nLe déodorant laisse des auréoles sous les bras : une pâte de bicarbonate et d'eau, dix minutes de pose avant lavage, et elles disparaissent.",
      },
      {
        title: "Ranger plié, pas suspendu",
        content:
          "Suspendu des mois dans une armoire, un t-shirt se déforme aux épaules. Plié en trois, il ne bouge pas. Pour tout ce qui concerne le molleton et la laine, nous avons une page [entretien](/entretien) dédiée.\n\nEt si malgré tout un t-shirt finit par fatiguer, nos [t-shirts](/categorie/t-shirts) sont faits pour être rachetés sans y penser.",
      },
    ],
    highlights: [],
    faq: [
      { question: "Le coton bio rétrécit-il ?", answer: "D'un centimètre maximum au premier lavage à 30 °C, puis il se stabilise. Nos tailles tiennent compte de ce centimètre." },
      { question: "Peut-on repasser une sérigraphie ?", answer: "Oui, à l'envers, fer tiède, sans vapeur directe sur l'impression." },
    ],
    links: [
      { url: "/produit/t-shirt-essentiel", anchor: "T-shirt Essentiel", context: "Coton bio 180 g, col doublé, coupe droite." },
      { url: "/categorie/t-shirts", anchor: "Tous nos t-shirts", context: "Écru, noir, manches longues, lots de trois." },
      { url: "/entretien", anchor: "Entretien", context: "Coton, molleton, laine : tous nos conseils." },
    ],
  },
  {
    slug: "guide-des-tailles",
    page_type: "utility",
    h1: "Guide des tailles",
    meta_title: "Guide des tailles — mesures à plat en centimètres",
    meta_description: "Nos tailles XS à XL mesurées à plat : tour de poitrine, longueur, manches. Comment mesurer un vêtement que vous aimez.",
    card: { title: "Guide des tailles", tagline: "", description: "", badges: [], featured: false },
    intro:
      "Toutes nos pièces sont unisexes et taillées dans la même grille. Mesurez un vêtement que vous aimez, posé à plat, et comparez.",
    sections: [
      {
        title: "T-shirts (coupe droite)",
        content:
          "| Taille | Poitrine à plat | Longueur | Manche |\n|---|---|---|---|\n| XS | 48 cm | 66 cm | 19 cm |\n| S | 50 cm | 68 cm | 20 cm |\n| M | 53 cm | 70 cm | 21 cm |\n| L | 56 cm | 72 cm | 22 cm |\n| XL | 59 cm | 74 cm | 23 cm |\n\nEntre deux tailles, prenez la plus petite : la coupe est droite, pas moulante.",
      },
      {
        title: "Sweats (coupe ample)",
        content:
          "| Taille | Poitrine à plat | Longueur | Manche |\n|---|---|---|---|\n| XS | 52 cm | 66 cm | 60 cm |\n| S | 55 cm | 68 cm | 61 cm |\n| M | 58 cm | 70 cm | 62 cm |\n| L | 61 cm | 72 cm | 63 cm |\n| XL | 64 cm | 74 cm | 64 cm |\n\nEntre deux tailles, prenez la plus grande si vous aimez le tombé ample. Voir aussi [quelle taille de sweat choisir](/conseils/quelle-taille-de-sweat-choisir).",
      },
      {
        title: "Comment mesurer",
        content:
          "Posez le vêtement à plat sur une table, sans l'étirer. **Poitrine** : d'une aisselle à l'autre. **Longueur** : du bas du col au bas du vêtement, dans le dos. **Manche** : de la couture d'épaule au bout de la manche.",
      },
    ],
    faq: [],
    links: [{ url: "/conseils/quelle-taille-de-sweat-choisir", anchor: "Quelle taille de sweat choisir ?", context: "Le guide complet." }],
  },
  {
    slug: "entretien",
    page_type: "utility",
    h1: "Entretien de vos vêtements",
    meta_title: "Entretien — coton bio, molleton, broderie",
    meta_description: "Lavage à 30 °C, séchage à plat, pas d'adoucissant : les consignes d'entretien de nos t-shirts, sweats et accessoires.",
    card: { title: "Entretien", tagline: "", description: "", badges: [], featured: false },
    intro: "Nos vêtements sont faits pour durer, à condition de trois gestes simples. Les voici, pièce par pièce.",
    sections: [
      { title: "T-shirts en coton bio", content: "Lavage à 30 °C à l'envers, pas d'adoucissant, séchage sur cintre ou à plat, repassage tiède à l'envers. Détail dans notre guide [entretenir un t-shirt en coton bio](/conseils/entretenir-un-t-shirt-en-coton-bio)." },
      { title: "Sweats molleton", content: "Lavage à 30 °C à l'envers, essorage doux, séchage à plat : suspendu mouillé, un sweat s'allonge. Jamais de sèche-linge. La broderie ne se repasse pas." },
      { title: "Casquettes et tote bags", content: "Casquette : à la main, eau tiède et savon doux, séchage sur un bol pour garder la forme. Tote bag : machine 30 °C, séchage à plat." },
      { title: "Mugs en grès", content: "Lave-vaisselle et micro-ondes sans problème. Un émail artisanal peut se craqueler légèrement avec les années : c'est sa patine, pas un défaut." },
    ],
    faq: [],
    links: [{ url: "/conseils/entretenir-un-t-shirt-en-coton-bio", anchor: "Entretenir un t-shirt en coton bio", context: "Le guide complet." }],
  },
];

async function main() {
  const db = getSupabase();
  for (const p of pages) {
    const row = {
      site_key: SITE,
      slug: p.slug,
      page_type: p.page_type,
      status: "published",
      mode: "product",
      h1: p.h1,
      meta_title: p.meta_title,
      meta_description: p.meta_description,
      content: {
        intro: p.intro,
        seoSections: p.sections,
        highlights: p.highlights ?? [],
        faq: p.faq,
        internalLinks: p.links,
        card: p.card,
        ...(p.heroImage ? { heroImage: p.heroImage } : {}),
        updatedDate: new Date().toISOString().slice(0, 10),
      },
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db.from("seo_pages").select("id").eq("site_key", SITE).eq("slug", p.slug).maybeSingle();
    const { error } = existing
      ? await db.from("seo_pages").update(row).eq("id", existing.id)
      : await db.from("seo_pages").insert(row);
    if (error) throw new Error(`${p.slug} : ${error.message}`);
    console.log(existing ? "mis à jour" : "créé", p.slug);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
