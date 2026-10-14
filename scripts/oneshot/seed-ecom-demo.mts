/**
 * Boutique de démonstration du template ecom-starter — « Maison Canigou »
 * (site_key `starter-ecom-demo`) : 3 catégories avec photo, 10 produits
 * rédigés, variantes taille / couleur, prix barrés, un épuisé, des stocks bas.
 * Sert à juger le template sur une boutique crédible et à prouver le tunnel.
 *
 * Photos : Unsplash (licence Unsplash, hôte `images.unsplash.com` autorisé
 * dans next.config.ts de la démo seulement — un vrai site dépose ses photos
 * depuis /admin dans le bucket Supabase).
 *
 * DÉMO : le script REMPLACE le catalogue du site_key (produits, variantes,
 * catégories) — jamais à lancer sur un autre site_key.
 *
 *   npx tsx scripts/oneshot/seed-ecom-demo.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "starter-ecom-demo";
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&h=1500&fit=crop&q=80`;

const PHOTOS = {
  tshirtBlanc: U("1581655353564-df123a1eb820"),
  tshirtBlanc2: U("1651761179569-4ba2aa054997"),
  tshirtNoir: U("1583743814966-8936f5b7be1a"),
  manchesLongues: U("1620799140408-edc6dcb6d633"),
  pile: U("1640747624372-5968cbcf9a76"),
  pile2: U("1562157873-818bc0726f68"),
  hoodieGris: U("1578874763335-4d21bab88a99"),
  hoodieGris2: U("1577221084712-45b0445d2b00"),
  hoodieBlanc: U("1620799140188-3b2a02fd9a77"),
  hoodieNoir: U("1680292783974-a9a336c10366"),
  casquetteBlanche: U("1588850561407-ed78c282e89b"),
  casquetteGrise: U("1521369909029-2afed882baee"),
  casquetteMontagne: U("1560774358-d727658f457c"),
  tote: U("1780480999319-ba6a502ed72c"),
  tote2: U("1755634457762-71ef6e7f0ca4"),
  mug: U("1536936812504-0e77dc3f0b40"),
  mug2: U("1590422749897-47036da0b0ff"),
  boutique: U("1750603247133-1fd1b4e4aca4"),
};

const categories = [
  {
    slug: "t-shirts",
    name: "T-shirts",
    description:
      "Coton bio peigné, coupe droite, sérigraphie à l'eau faite à Perpignan. Des basiques qui tiennent dix ans.",
    image: PHOTOS.pile,
  },
  {
    slug: "sweats",
    name: "Sweats",
    description:
      "Molleton 350 g brossé à l'intérieur, bords-côtes épais, coupe légèrement ample. Le sweat qu'on ne prête pas.",
    image: PHOTOS.hoodieBlanc,
  },
  {
    slug: "accessoires",
    name: "Accessoires",
    description:
      "Casquettes, tote bags et mugs brodés ou émaillés. Les petits objets qui disent d'où l'on vient.",
    image: PHOTOS.casquetteMontagne,
  },
];

type Variant = {
  name: string;
  options: Record<string, string>;
  price: number;
  compare_at_price?: number;
  stock: number | null;
  sku?: string;
  image?: string;
};
type Product = {
  slug: string;
  category: string;
  name: string;
  description: string;
  unit: string;
  attributes: Record<string, string>;
  images: string[];
  status: "published" | "sold_out";
  featured: boolean;
  variants: Variant[];
};

const sizes = ["XS", "S", "M", "L", "XL"];
const sized = (
  prefix: string,
  colors: { name: string; image?: string }[],
  price: number,
  compare?: number,
  stockOf: (size: string, color: string) => number | null = () => 10,
): Variant[] =>
  colors.flatMap((c) =>
    sizes.map((s) => ({
      name: colors.length > 1 ? `${s} / ${c.name}` : s,
      options: colors.length > 1 ? { Taille: s, Couleur: c.name } : { Taille: s },
      price,
      compare_at_price: compare,
      stock: stockOf(s, c.name),
      sku: `${prefix}-${s}-${c.name.slice(0, 2).toUpperCase()}`,
      image: c.image,
    })),
  );

const products: Product[] = [
  {
    slug: "t-shirt-essentiel",
    category: "t-shirts",
    name: "T-shirt Essentiel",
    description:
      "Le t-shirt que l'on remet tous les matins : coton bio peigné 180 g, col rond doublé qui ne se déforme pas, coupe droite ni moulante ni flottante. Teint en pièce pour une couleur profonde qui vieillit bien.\n\nLavage à 30 °C, séchage à plat. Il rétrécit de moins d'un centimètre au premier lavage, nous l'avons mesuré.\n\nFabriqué au Portugal, sérigraphié et expédié depuis notre atelier de Perpignan.",
    unit: "",
    attributes: {
      Matière: "100 % coton bio peigné",
      Grammage: "180 g/m²",
      Coupe: "Droite, col rond",
      Fabrication: "Portugal · finition Perpignan",
      Entretien: "30 °C, pas de sèche-linge",
    },
    images: [PHOTOS.tshirtBlanc, PHOTOS.tshirtBlanc2, PHOTOS.pile2],
    status: "published",
    featured: true,
    variants: sized(
      "TSE",
      [
        { name: "Écru", image: PHOTOS.tshirtBlanc },
        { name: "Noir", image: PHOTOS.tshirtNoir },
      ],
      29,
      undefined,
      (s, c) => (s === "XS" && c === "Noir" ? 0 : s === "XL" ? 2 : 14),
    ),
  },
  {
    slug: "t-shirt-canigou-brode",
    category: "t-shirts",
    name: "T-shirt Canigou brodé",
    description:
      "La silhouette du Canigou brodée sur le cœur, fil ton sur ton. Même base que l'Essentiel : coton bio 180 g, col doublé, coupe droite.\n\nLa broderie est faite chez nous, à la machine, puis vérifiée à la main. Une pièce par couleur, pas de surproduction.",
    unit: "",
    attributes: {
      Matière: "100 % coton bio peigné",
      Broderie: "Fil polyester recyclé, ton sur ton",
      Fabrication: "Portugal · broderie Perpignan",
    },
    images: [PHOTOS.tshirtNoir, PHOTOS.tshirtBlanc],
    status: "published",
    featured: true,
    variants: sized("TSC", [{ name: "Noir" }, { name: "Écru" }], 34, 39, (s) =>
      s === "M" ? 3 : 9,
    ),
  },
  {
    slug: "t-shirt-manches-longues",
    category: "t-shirts",
    name: "T-shirt manches longues",
    description:
      "Le même coton que l'Essentiel, manches longues avec poignets bords-côtes. Parfait sous une veste de novembre à mars, seul dès que le vent tombe.\n\nCoupe droite, longueur qui couvre la ceinture sans flotter.",
    unit: "",
    attributes: {
      Matière: "100 % coton bio peigné",
      Grammage: "200 g/m²",
      Coupe: "Droite, poignets bords-côtes",
    },
    images: [PHOTOS.manchesLongues],
    status: "published",
    featured: false,
    variants: sized("TML", [{ name: "Écru" }], 39),
  },
  {
    slug: "lot-3-t-shirts-essentiel",
    category: "t-shirts",
    name: "Lot de 3 T-shirts Essentiel",
    description:
      "Trois Essentiel de la même taille, couleurs au choix dans le lot, pour le prix de deux et demi. Le lot que l'on commande quand on a compris qu'on ne porterait plus que ceux-là.\n\nMême coton, mêmes finitions. Livré dans un seul colis.",
    unit: "le lot de 3",
    attributes: {
      Contenu: "3 t-shirts (écru, noir, écru)",
      Matière: "100 % coton bio peigné",
    },
    images: [PHOTOS.pile2, PHOTOS.pile],
    status: "published",
    featured: true,
    variants: sized("LOT3", [{ name: "Assortiment" }], 72, 87, () => null),
  },
  {
    slug: "sweat-capuche-molleton",
    category: "sweats",
    name: "Sweat à capuche molleton",
    description:
      "Molleton 350 g brossé à l'intérieur, capuche doublée à cordon plat, poche kangourou profonde. Coupe un peu ample : prenez votre taille habituelle, il tombe comme il faut.\n\nLes bords-côtes sont épais et élastanés : après un an, ils serrent encore.\n\nFabriqué au Portugal, brodé à Perpignan.",
    unit: "",
    attributes: {
      Matière: "80 % coton bio, 20 % polyester recyclé",
      Grammage: "350 g/m²",
      Coupe: "Ample, capuche doublée",
      Fabrication: "Portugal · broderie Perpignan",
    },
    images: [PHOTOS.hoodieBlanc, PHOTOS.hoodieGris2, PHOTOS.hoodieGris],
    status: "published",
    featured: true,
    variants: sized(
      "SWC",
      [
        { name: "Écru", image: PHOTOS.hoodieBlanc },
        { name: "Gris chiné", image: PHOTOS.hoodieGris2 },
        { name: "Noir", image: PHOTOS.hoodieNoir },
      ],
      79,
      undefined,
      (s, c) => (c === "Écru" && s === "L" ? 1 : c === "Écru" ? 4 : 8),
    ),
  },
  {
    slug: "sweat-col-rond",
    category: "sweats",
    name: "Sweat col rond",
    description:
      "La version sans capuche du molleton : col rond à bord-côte, épaules légèrement tombantes, manches longues. Plus habillé qu'un hoodie, plus chaud qu'un pull fin.\n\nLe gris chiné est tissé, pas imprimé : il ne « pèle » pas.",
    unit: "",
    attributes: {
      Matière: "80 % coton bio, 20 % polyester recyclé",
      Grammage: "350 g/m²",
      Coupe: "Épaules tombantes, col rond",
    },
    images: [PHOTOS.hoodieGris2, PHOTOS.hoodieGris],
    status: "published",
    featured: false,
    variants: sized("SCR", [{ name: "Gris chiné" }, { name: "Noir" }], 69, 79),
  },
  {
    slug: "casquette-brodee",
    category: "accessoires",
    name: "Casquette brodée",
    description:
      "Six panneaux en sergé de coton, visière courbée, broderie du Canigou sur le devant. Boucle métal à l'arrière : taille unique, réglable du 54 au 60.\n\nLa visière reste rigide au lavage à la main.",
    unit: "Taille unique",
    attributes: {
      Matière: "Sergé de coton",
      Fermeture: "Boucle métal réglable",
      Broderie: "Perpignan",
    },
    images: [PHOTOS.casquetteMontagne, PHOTOS.casquetteGrise, PHOTOS.casquetteBlanche],
    status: "published",
    featured: true,
    variants: [
      { name: "Sable", options: { Couleur: "Sable" }, price: 29, stock: 12, sku: "CAP-SA", image: PHOTOS.casquetteBlanche },
      { name: "Gris", options: { Couleur: "Gris" }, price: 29, stock: 5, sku: "CAP-GR", image: PHOTOS.casquetteGrise },
      { name: "Olive", options: { Couleur: "Olive" }, price: 29, stock: 0, sku: "CAP-OL", image: PHOTOS.casquetteMontagne },
    ],
  },
  {
    slug: "tote-bag-toile-epaisse",
    category: "accessoires",
    name: "Tote bag toile épaisse",
    description:
      "Toile de coton 320 g, anses longues cousues en croix, fond plat. Il porte dix kilos de courses sans se déformer et passe en machine.\n\nSérigraphie à l'eau d'un côté, uni de l'autre.",
    unit: "40 × 38 cm",
    attributes: {
      Matière: "Toile de coton 320 g",
      Dimensions: "40 × 38 cm, anses 65 cm",
      Entretien: "Machine 30 °C",
    },
    images: [PHOTOS.tote, PHOTOS.tote2],
    status: "published",
    featured: false,
    variants: [
      { name: "Naturel", options: { Couleur: "Naturel" }, price: 19, stock: null, sku: "TOTE-NA" },
      { name: "Noir", options: { Couleur: "Noir" }, price: 19, stock: null, sku: "TOTE-NO" },
    ],
  },
  {
    slug: "mug-gres-emaille",
    category: "accessoires",
    name: "Mug en grès émaillé",
    description:
      "Tourné et émaillé dans un atelier de Céret, 35 cl, anse large pour quatre doigts. Chaque pièce est unique : l'émail coule un peu différemment à chaque cuisson.\n\nPasse au lave-vaisselle et au micro-ondes.",
    unit: "35 cl",
    attributes: {
      Matière: "Grès émaillé",
      Contenance: "35 cl",
      Fabrication: "Céret (66)",
    },
    images: [PHOTOS.mug, PHOTOS.mug2],
    status: "published",
    featured: false,
    variants: [
      { name: "Blanc cassé", options: { Couleur: "Blanc cassé" }, price: 24, stock: 7, sku: "MUG-BC", image: PHOTOS.mug },
      { name: "Sable", options: { Couleur: "Sable" }, price: 24, stock: 2, sku: "MUG-SA", image: PHOTOS.mug2 },
    ],
  },
  {
    slug: "coffret-cadeau-canigou",
    category: "accessoires",
    name: "Coffret cadeau Canigou",
    description:
      "Un t-shirt Canigou brodé, une casquette et un mug, dans une boîte kraft fermée d'un ruban. Le cadeau de ceux qui sont partis vivre ailleurs.\n\nÉpuisé jusqu'au prochain réassort : la fiche reste en ligne, appelez-nous pour être prévenu.",
    unit: "le coffret",
    attributes: {
      Contenu: "T-shirt brodé + casquette + mug",
      Emballage: "Boîte kraft, ruban",
    },
    images: [PHOTOS.boutique, PHOTOS.mug],
    status: "sold_out",
    featured: false,
    variants: sized("COF", [{ name: "Noir" }], 79, 87, () => 0),
  },
];

async function main() {
  const db = getSupabase();

  // Démo : on repart propre (les lignes de commande gardent leur instantané, variant_id → NULL).
  for (const table of ["products", "product_categories"]) {
    const { error } = await db.from(table).delete().eq("site_key", SITE);
    if (error) throw new Error(`purge ${table} : ${error.message}`);
  }

  const catIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const { data, error } = await db
      .from("product_categories")
      .insert({ site_key: SITE, ...c, display_order: i })
      .select("id, slug")
      .single();
    if (error) throw new Error(`catégorie ${c.slug} : ${error.message}`);
    catIds.set(data.slug as string, data.id as string);
    console.log(`✔ catégorie ${c.slug}`);
  }

  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  for (const [i, p] of products.entries()) {
    const { variants, category, ...row } = p;
    const { data, error } = await db
      .from("products")
      .insert({
        site_key: SITE,
        ...row,
        category_id: catIds.get(category) ?? null,
        price: Math.min(...variants.map((v) => v.price)),
        // Les deux derniers produits sont « nouveaux » (< 30 j), les autres plus anciens.
        created_at: daysAgo(i < 2 ? 5 : 90 + i * 10),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(`produit ${p.slug} : ${error.message}`);
    const productId = data.id as string;
    const { error: vErr } = await db.from("product_variants").insert(
      variants.map((v, j) => ({
        site_key: SITE,
        product_id: productId,
        name: v.name,
        options: v.options,
        price: v.price,
        compare_at_price: v.compare_at_price ?? null,
        stock: v.stock,
        sku: v.sku ?? null,
        image: v.image ?? null,
        status: "published",
        display_order: j,
      })),
    );
    if (vErr) throw new Error(`variantes ${p.slug} : ${vErr.message}`);
    console.log(`✔ produit ${p.slug} (${variants.length} variantes)`);
  }
  console.log("\nMaison Canigou prête — site_key starter-ecom-demo");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
