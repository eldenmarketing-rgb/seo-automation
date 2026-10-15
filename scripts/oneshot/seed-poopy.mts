/**
 * Catalogue de LANCEMENT de la boutique Poopy (site_key `poopy`) : 3 collections
 * (fondants parfumés, fondants crémeux, bougies bijoux = bougie avec un bijou caché
 * dans la cire, révélé à la combustion — format My Jolie Candle) et 13 produits
 * avec variantes (bijou, parfum, couleur). Noms, parfums, prix et stocks sont des
 * EXEMPLES à remplacer par l'offre réelle depuis /admin du site ; les photos
 * sont des placeholders Unsplash (hôte autorisé dans next.config.ts du site,
 * à retirer quand les vraies photos sont dans le bucket).
 *
 * Le script REMPLACE le catalogue du site_key `poopy` — à ne lancer qu'au
 * lancement, jamais une fois l'offre réelle saisie dans /admin.
 *
 *   npx tsx scripts/oneshot/seed-poopy.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "poopy";
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&h=1500&fit=crop&q=80`;

const PHOTOS = {
  fondantsPlateau: U("1711207354630-20b977c4bfc3"),
  fondantsViolets: U("1711207354615-5b4c454fce1b"),
  cireCoulee: U("1711207354771-8a52847af385"),
  blocCire: U("1643716991721-15b3e95660a7"),
  cremeFleurie: U("1618324395109-82adcad01043"),
  cremeVerre: U("1618324359017-5452b2f4eec9"),
  cremeAssiette: U("1618324497832-05e6e65f0131"),
  bougieVerre: U("1616172890963-a45e7da8de31"),
  bougieAllumette: U("1612293905607-b003de9e54fb"),
  potCeramique: U("1612198526331-66fcc90d67da"),
  potsAmbre: U("1572726729207-a78d6feb18d7"),
  bougiesGroupe: U("1643122966676-29e8597257f7"),
  bougiesEucalyptus: U("1613068431228-8cb6a1e92573"),
  bolsCeramique: U("1604249180474-3ebaf8747373"),
  chainesOr: U("1611591437281-460bfbe1220a"),
  collierOr: U("1611107683227-e9060eccd846"),
  braceletMagazine: U("1602173574767-37ac01994b2a"),
  braceletsRoche: U("1679156271456-d6068c543ee7"),
  parure: U("1727947074642-0bd47ef70b58"),
  parureNoir: U("1742627032795-1dfb552448ce"),
};

const categories = [
  {
    slug: "fondants-parfumes",
    name: "Fondants parfumés",
    description:
      "Des cubes de cire parfumée à poser dans un brûle-parfum : une pièce parfumée pendant des heures, sans flamme près de la cire.",
    image: PHOTOS.fondantsPlateau,
  },
  {
    slug: "fondants-cremeux",
    name: "Fondants crémeux",
    description:
      "Cire fouettée parfumée en pot : une cuillère dans la coupelle, et le parfum monte plus vite qu'avec un cube.",
    image: PHOTOS.cremeVerre,
  },
  {
    slug: "bougies-bijoux",
    name: "Bougies bijoux",
    description:
      "Une bougie parfumée avec un bijou caché dans la cire : bracelet, collier ou boucles d'oreilles. Après quelques heures de combustion, la capsule apparaît, on la retire, on découvre le bijou.",
    image: PHOTOS.bougieVerre,
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

const simple = (sku: string, price: number, stock: number | null, compare?: number): Variant[] => [
  { name: "Unique", options: {}, price, compare_at_price: compare, stock, sku },
];

const products: Product[] = [
  {
    slug: "fondant-parfume-vanille-caramel",
    category: "fondants-parfumes",
    name: "Fondant parfumé Vanille caramel",
    description:
      "Une vanille ronde, relevée d'un caramel légèrement salé : le parfum de cuisine du dimanche, sans le four. Une plaquette de six cubes sécables.\n\nUn cube suffit pour une pièce de 20 m² ; il parfume plusieurs heures et se réutilise jusqu'à ce qu'il ne sente plus. Laissez refroidir la cire pour la retirer d'un bloc.\n\nÀ poser dans un brûle-parfum avec une bougie chauffe-plat, jamais dans un diffuseur électrique à huiles.",
    unit: "plaquette de 6 cubes · 50 g",
    attributes: {
      Famille: "Gourmand",
      Notes: "Vanille, caramel, pointe de sel",
      Contenance: "6 cubes · 50 g",
      Diffusion: "6 à 8 h par cube",
      Usage: "Brûle-parfum à bougie chauffe-plat",
    },
    images: [PHOTOS.fondantsPlateau, PHOTOS.fondantsViolets],
    status: "published",
    featured: true,
    variants: simple("FP-VAN", 4.9, 24),
  },
  {
    slug: "fondant-parfume-fleur-de-coton",
    category: "fondants-parfumes",
    name: "Fondant parfumé Fleur de coton",
    description:
      "Le parfum du linge propre qui sèche au vent : fleur de coton, une touche de musc blanc, un fond poudré. Le fondant qu'on met dans la chambre ou la salle de bain.\n\nPlaquette de six cubes sécables ; un cube parfume une pièce pendant plusieurs heures.",
    unit: "plaquette de 6 cubes · 50 g",
    attributes: {
      Famille: "Frais, poudré",
      Notes: "Fleur de coton, musc blanc, iris",
      Contenance: "6 cubes · 50 g",
      Diffusion: "6 à 8 h par cube",
    },
    images: [PHOTOS.blocCire, PHOTOS.fondantsPlateau],
    status: "published",
    featured: true,
    variants: simple("FP-COT", 4.9, 18),
  },
  {
    slug: "fondant-parfume-monoi",
    category: "fondants-parfumes",
    name: "Fondant parfumé Monoï",
    description:
      "Fleur de tiaré et coco, le parfum d'une crème solaire de juillet. À réserver au salon ou à la véranda, il remplit vite une grande pièce.\n\nPlaquette de six cubes sécables.",
    unit: "plaquette de 6 cubes · 50 g",
    attributes: {
      Famille: "Solaire",
      Notes: "Tiaré, coco, vanille",
      Contenance: "6 cubes · 50 g",
      Diffusion: "6 à 8 h par cube",
    },
    images: [PHOTOS.fondantsViolets, PHOTOS.cireCoulee],
    status: "published",
    featured: false,
    variants: simple("FP-MON", 4.9, 12),
  },
  {
    slug: "coffret-decouverte-6-fondants",
    category: "fondants-parfumes",
    name: "Coffret découverte 6 fondants",
    description:
      "Six parfums différents pour trouver le vôtre : vanille caramel, fleur de coton, monoï, fleur d'oranger, bois de santal et fruits rouges. Une plaquette de chaque, dans une boîte kraft.\n\nLe coffret pour offrir, ou pour parfumer chaque pièce différemment.",
    unit: "6 plaquettes · 300 g",
    attributes: {
      Contenu: "6 plaquettes de 6 cubes",
      Parfums: "Vanille caramel, fleur de coton, monoï, fleur d'oranger, bois de santal, fruits rouges",
      Emballage: "Boîte kraft",
    },
    images: [PHOTOS.fondantsPlateau, PHOTOS.blocCire],
    status: "published",
    featured: true,
    variants: simple("FP-COF6", 24.9, 8, 29.4),
  },
  {
    slug: "brule-parfum-ceramique",
    category: "fondants-parfumes",
    name: "Brûle-parfum en céramique",
    description:
      "Le brûle-parfum qui va avec nos fondants : céramique émaillée, coupelle large pour un ou deux cubes, ouverture latérale pour la bougie chauffe-plat.\n\nLa coupelle se nettoie d'un bloc une fois la cire refroidie.",
    unit: "11 × 11 cm",
    attributes: {
      Matière: "Céramique émaillée",
      Dimensions: "11 cm de haut, coupelle 8 cm",
      Usage: "Bougie chauffe-plat (non fournie)",
    },
    images: [PHOTOS.bolsCeramique, PHOTOS.potCeramique],
    status: "published",
    featured: false,
    variants: [
      { name: "Blanc", options: { Couleur: "Blanc" }, price: 14.9, stock: 10, sku: "BP-BL" },
      { name: "Terracotta", options: { Couleur: "Terracotta" }, price: 14.9, stock: 6, sku: "BP-TE" },
    ],
  },
  {
    slug: "fondant-cremeux-chantilly-vanille",
    category: "fondants-cremeux",
    name: "Fondant crémeux Chantilly vanille",
    description:
      "Une cire fouettée, légère comme une chantilly, parfumée à la vanille bourbon. Servie dans un pot de 100 ml avec sa cuillère : une cuillère rase dans la coupelle du brûle-parfum, et le parfum monte en quelques minutes.\n\nLe pot parfume une vingtaine de fois.",
    unit: "pot de 100 ml",
    attributes: {
      Famille: "Gourmand",
      Notes: "Vanille bourbon, lait d'amande",
      Contenance: "100 ml, environ 20 utilisations",
      Usage: "Brûle-parfum, une cuillère rase",
    },
    images: [PHOTOS.cremeVerre, PHOTOS.cremeFleurie],
    status: "published",
    featured: true,
    variants: simple("FC-VAN", 7.9, 15),
  },
  {
    slug: "fondant-cremeux-fraise-chantilly",
    category: "fondants-cremeux",
    name: "Fondant crémeux Fraise chantilly",
    description:
      "Fraise mûre et chantilly, le parfum d'un dessert d'enfance. Même cire fouettée que la Chantilly vanille, même pot de 100 ml avec cuillère.\n\nParfum sucré et net : une demi-cuillère suffit dans une petite pièce.",
    unit: "pot de 100 ml",
    attributes: {
      Famille: "Gourmand, fruité",
      Notes: "Fraise, crème fouettée, sucre",
      Contenance: "100 ml, environ 20 utilisations",
    },
    images: [PHOTOS.cremeFleurie, PHOTOS.cremeAssiette],
    status: "published",
    featured: false,
    variants: simple("FC-FRA", 7.9, 9),
  },
  {
    slug: "fondant-cremeux-fleur-d-oranger",
    category: "fondants-cremeux",
    name: "Fondant crémeux Fleur d'oranger",
    description:
      "Fleur d'oranger et néroli, un parfum propre et lumineux pour l'entrée ou le salon. Cire fouettée en pot de 100 ml avec cuillère.",
    unit: "pot de 100 ml",
    attributes: {
      Famille: "Floral",
      Notes: "Fleur d'oranger, néroli, musc",
      Contenance: "100 ml, environ 20 utilisations",
    },
    images: [PHOTOS.cremeAssiette, PHOTOS.cremeVerre],
    status: "published",
    featured: false,
    variants: simple("FC-ORA", 7.9, 0),
  },
  {
    slug: "bougie-bijou-vanille-caramel",
    category: "bougies-bijoux",
    name: "Bougie bijou Vanille caramel",
    description:
      "La vanille caramel de nos fondants, en bougie, avec un bijou caché dans la cire. Vous choisissez le type de bijou : bracelet, collier ou boucles d'oreilles, en acier inoxydable doré.\n\nLe bijou est protégé dans une capsule, posée dans la cire. Après deux à trois heures de combustion, la capsule affleure : éteignez la bougie, retirez-la avec une pince, laissez-la refroidir et ouvrez-la.\n\nÀ la première utilisation, laissez la bougie brûler jusqu'à ce que toute la surface soit fondue, et coupez la mèche à 5 mm avant chaque allumage.",
    unit: "",
    attributes: {
      Famille: "Gourmand",
      Notes: "Vanille, caramel, pointe de sel",
      Bijou: "Acier inoxydable doré, au choix",
      Révélation: "Après 2 à 3 h de combustion",
      Combustion: "Environ 40 h",
      Mèche: "Coton",
    },
    images: [PHOTOS.bougieVerre, PHOTOS.braceletMagazine, PHOTOS.bougieAllumette],
    status: "published",
    featured: true,
    variants: [
      { name: "Bracelet", options: { Bijou: "Bracelet" }, price: 34.9, stock: 8, sku: "BB-VAN-BRA", image: PHOTOS.braceletMagazine },
      { name: "Collier", options: { Bijou: "Collier" }, price: 34.9, stock: 6, sku: "BB-VAN-COL", image: PHOTOS.collierOr },
      { name: "Boucles d'oreilles", options: { Bijou: "Boucles d'oreilles" }, price: 34.9, stock: 5, sku: "BB-VAN-BO", image: PHOTOS.parure },
    ],
  },
  {
    slug: "bougie-bijou-fleur-de-coton",
    category: "bougies-bijoux",
    name: "Bougie bijou Fleur de coton",
    description:
      "Fleur de coton, musc blanc, iris : le linge propre, en bougie, avec un bijou caché dans la cire. Bracelet, collier ou boucles d'oreilles en acier inoxydable doré, au choix.\n\nLa capsule qui protège le bijou apparaît après deux à trois heures de combustion : on éteint, on la retire à la pince, on la laisse refroidir, on l'ouvre.",
    unit: "",
    attributes: {
      Famille: "Frais, poudré",
      Notes: "Fleur de coton, musc blanc, iris",
      Bijou: "Acier inoxydable doré, au choix",
      Révélation: "Après 2 à 3 h de combustion",
      Combustion: "Environ 40 h",
      Mèche: "Coton",
    },
    images: [PHOTOS.potCeramique, PHOTOS.collierOr, PHOTOS.bougiesGroupe],
    status: "published",
    featured: true,
    variants: [
      { name: "Bracelet", options: { Bijou: "Bracelet" }, price: 34.9, stock: 7, sku: "BB-COT-BRA", image: PHOTOS.braceletMagazine },
      { name: "Collier", options: { Bijou: "Collier" }, price: 34.9, stock: 4, sku: "BB-COT-COL", image: PHOTOS.collierOr },
      { name: "Boucles d'oreilles", options: { Bijou: "Boucles d'oreilles" }, price: 34.9, stock: 3, sku: "BB-COT-BO", image: PHOTOS.parure },
    ],
  },
  {
    slug: "bougie-bijou-monoi",
    category: "bougies-bijoux",
    name: "Bougie bijou Monoï",
    description:
      "Tiaré, coco et vanille : la bougie des soirs d'été, avec un bijou caché dans la cire. Bracelet, collier ou boucles d'oreilles en acier inoxydable doré, au choix.\n\nLa capsule apparaît après deux à trois heures de combustion.",
    unit: "",
    attributes: {
      Famille: "Solaire",
      Notes: "Tiaré, coco, vanille",
      Bijou: "Acier inoxydable doré, au choix",
      Révélation: "Après 2 à 3 h de combustion",
      Combustion: "Environ 40 h",
      Mèche: "Coton",
    },
    images: [PHOTOS.bougiesGroupe, PHOTOS.parure],
    status: "published",
    featured: false,
    variants: [
      { name: "Bracelet", options: { Bijou: "Bracelet" }, price: 34.9, stock: 5, sku: "BB-MON-BRA", image: PHOTOS.braceletMagazine },
      { name: "Collier", options: { Bijou: "Collier" }, price: 34.9, stock: 2, sku: "BB-MON-COL", image: PHOTOS.collierOr },
      { name: "Boucles d'oreilles", options: { Bijou: "Boucles d'oreilles" }, price: 34.9, stock: 0, sku: "BB-MON-BO", image: PHOTOS.parure },
    ],
  },
  {
    slug: "bougie-bijou-bois-de-santal",
    category: "bougies-bijoux",
    name: "Bougie bijou Bois de santal",
    description:
      "Santal, cèdre et une pointe d'ambre : une bougie chaude et boisée, avec un bijou caché dans la cire. Verre ambré. Bracelet, collier ou boucles d'oreilles en acier inoxydable doré, au choix.\n\nLa capsule apparaît après deux à trois heures de combustion.",
    unit: "",
    attributes: {
      Famille: "Boisé, ambré",
      Notes: "Santal, cèdre, ambre",
      Bijou: "Acier inoxydable doré, au choix",
      Révélation: "Après 2 à 3 h de combustion",
      Combustion: "Environ 40 h",
      Mèche: "Coton",
    },
    images: [PHOTOS.potsAmbre, PHOTOS.bougiesEucalyptus, PHOTOS.braceletsRoche],
    status: "published",
    featured: false,
    variants: [
      { name: "Bracelet", options: { Bijou: "Bracelet" }, price: 36.9, stock: 4, sku: "BB-SAN-BRA", image: PHOTOS.braceletsRoche },
      { name: "Collier", options: { Bijou: "Collier" }, price: 36.9, stock: 3, sku: "BB-SAN-COL", image: PHOTOS.collierOr },
      { name: "Boucles d'oreilles", options: { Bijou: "Boucles d'oreilles" }, price: 36.9, stock: 2, sku: "BB-SAN-BO", image: PHOTOS.parureNoir },
    ],
  },
  {
    slug: "bougie-bijou-surprise",
    category: "bougies-bijoux",
    name: "Bougie bijou Surprise",
    description:
      "Vous choisissez le parfum, on choisit le bijou : bracelet, collier ou boucles d'oreilles, en acier inoxydable doré, caché dans la cire. La bougie à offrir quand on ne sait pas ce qu'elle porte déjà.\n\nLa capsule apparaît après deux à trois heures de combustion : on éteint, on la retire à la pince, on la laisse refroidir, on l'ouvre.",
    unit: "",
    attributes: {
      Bijou: "Surprise — acier inoxydable doré",
      Révélation: "Après 2 à 3 h de combustion",
      Combustion: "Environ 40 h",
      Mèche: "Coton",
    },
    images: [PHOTOS.bougieAllumette, PHOTOS.chainesOr],
    status: "published",
    featured: true,
    variants: [
      { name: "Vanille caramel", options: { Parfum: "Vanille caramel" }, price: 32.9, stock: 6, sku: "BB-SUR-VAN" },
      { name: "Fleur de coton", options: { Parfum: "Fleur de coton" }, price: 32.9, stock: 6, sku: "BB-SUR-COT" },
      { name: "Monoï", options: { Parfum: "Monoï" }, price: 32.9, stock: 4, sku: "BB-SUR-MON" },
      { name: "Bois de santal", options: { Parfum: "Bois de santal" }, price: 32.9, stock: 3, sku: "BB-SUR-SAN" },
    ],
  },
];

// Faits confirmés par Elden le 2026-10-15 : tout ce qui est coulé (fondants, crémeux, bougies) l'est à la
// main, en cire végétale, avec des parfums de Grasse ; les bijoux sont en acier inoxydable doré.
const COULE = new Set(["fondants-parfumes", "fondants-cremeux", "bougies-bijoux"]);
for (const p of products) {
  if (COULE.has(p.category) && p.slug !== "brule-parfum-ceramique") {
    p.attributes = { ...p.attributes, Cire: "Végétale, coulée à la main", Parfum: "Parfum de Grasse" };
  }
}

async function main() {
  const db = getSupabase();
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("site_key", SITE);
  if ((count ?? 0) > 0) throw new Error(`Le site ${SITE} a déjà ${count} commande(s) : ne pas re-seeder le catalogue.`);

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
        created_at: daysAgo(i < 2 ? 5 : 40 + i * 7),
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
  console.log(`\nCatalogue de lancement Poopy en place — ${categories.length} collections, ${products.length} produits (site_key ${SITE})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
