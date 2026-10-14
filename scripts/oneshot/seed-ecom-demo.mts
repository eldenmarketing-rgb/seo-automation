/**
 * Boutique de démonstration du template ecom-starter (site_key `starter-ecom-demo`) :
 * 2 catégories, 4 produits, variantes taille/couleur, 1 produit épuisé, 1 variante
 * à 2 en stock. Sert à prouver le tunnel (panier → Stripe test → webhook → /admin).
 *
 * Idempotent : upsert sur (site_key, slug) pour catégories et produits, sur
 * (product_id, name) pour les variantes. Ne touche à rien d'autre.
 *
 *   npx tsx scripts/oneshot/seed-ecom-demo.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "starter-ecom-demo";
const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/1200/900`;

const categories = [
  { slug: "t-shirts", name: "T-shirts", description: "Coton bio, coupe droite, sérigraphie à Perpignan.", display_order: 0 },
  { slug: "accessoires", name: "Accessoires", description: "Casquettes, tote bags et mugs de la boutique.", display_order: 1 },
];

type Variant = { name: string; options: Record<string, string>; price: number; compare_at_price?: number; stock: number | null; sku?: string };
type Product = {
  slug: string; category: string; name: string; description: string; unit: string;
  attributes: Record<string, string>; images: string[]; status: "published" | "sold_out"; featured: boolean; variants: Variant[];
};

const sizes = ["S", "M", "L", "XL"];
const products: Product[] = [
  {
    slug: "t-shirt-catalan", category: "t-shirts", name: "T-shirt Catalan",
    description: "Le t-shirt de la boutique : coton bio 180 g, coupe droite, col rond renforcé. Sérigraphie sang et or réalisée à Perpignan.\n\nLavage à 30 °C, pas de sèche-linge : il garde sa forme et ses couleurs.",
    unit: "", attributes: { Matière: "100 % coton bio", Grammage: "180 g/m²", Fabrication: "Portugal, sérigraphie Perpignan" },
    images: [IMG("tshirt-catalan"), IMG("tshirt-catalan-2")], status: "published", featured: true,
    variants: sizes.flatMap((s) => [
      { name: `${s} / Sang`, options: { Taille: s, Couleur: "Sang" }, price: 29.9, stock: s === "XL" ? 2 : 12, sku: `TSC-${s}-R` },
      { name: `${s} / Or`, options: { Taille: s, Couleur: "Or" }, price: 29.9, stock: s === "S" ? 0 : 8, sku: `TSC-${s}-O` },
    ]),
  },
  {
    slug: "t-shirt-canigou", category: "t-shirts", name: "T-shirt Canigou",
    description: "Silhouette du Canigou brodée sur le cœur. Coton bio, coupe droite.\n\nÉdition limitée : quand c'est parti, c'est parti.",
    unit: "", attributes: { Matière: "100 % coton bio", Broderie: "Fil polyester recyclé" },
    images: [IMG("tshirt-canigou")], status: "published", featured: false,
    variants: sizes.map((s) => ({ name: s, options: { Taille: s }, price: 34.9, compare_at_price: 39.9, stock: null, sku: `TSK-${s}` })),
  },
  {
    slug: "casquette-usap", category: "accessoires", name: "Casquette brodée",
    description: "Casquette six panneaux, visière courbée, broderie 3D. Taille unique réglable.",
    unit: "Taille unique", attributes: { Matière: "Coton sergé", Fermeture: "Boucle métal" },
    images: [IMG("casquette")], status: "published", featured: true,
    variants: [
      { name: "Noir", options: { Couleur: "Noir" }, price: 24.9, stock: 15, sku: "CAP-N" },
      { name: "Sable", options: { Couleur: "Sable" }, price: 24.9, stock: 6, sku: "CAP-S" },
    ],
  },
  {
    slug: "mug-perpignan", category: "accessoires", name: "Mug Perpignan",
    description: "Mug en grès émaillé, 35 cl, passe au lave-vaisselle. Épuisé pour le moment : la fiche reste en ligne, le réassort est prévu.",
    unit: "35 cl", attributes: { Matière: "Grès émaillé" },
    images: [IMG("mug")], status: "sold_out", featured: false,
    variants: [{ name: "Standard", options: {}, price: 14.9, stock: 0, sku: "MUG-1" }],
  },
];

async function main() {
  const db = getSupabase();
  const catIds = new Map<string, string>();
  for (const c of categories) {
    const { data, error } = await db
      .from("product_categories")
      .upsert({ site_key: SITE, ...c, updated_at: new Date().toISOString() }, { onConflict: "site_key,slug" })
      .select("id, slug")
      .single();
    if (error) throw new Error(`catégorie ${c.slug} : ${error.message}`);
    catIds.set(data.slug as string, data.id as string);
    console.log(`✔ catégorie ${c.slug}`);
  }

  for (const p of products) {
    const { variants, category, ...row } = p;
    const { data, error } = await db
      .from("products")
      .upsert(
        { site_key: SITE, ...row, category_id: catIds.get(category) ?? null, price: Math.min(...variants.map((v) => v.price)), updated_at: new Date().toISOString() },
        { onConflict: "site_key,slug" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`produit ${p.slug} : ${error.message}`);
    const productId = data.id as string;
    for (const [i, v] of variants.entries()) {
      const { error: vErr } = await db.from("product_variants").upsert(
        {
          site_key: SITE, product_id: productId, name: v.name, options: v.options, price: v.price,
          compare_at_price: v.compare_at_price ?? null, stock: v.stock, sku: v.sku ?? null, status: "published",
          display_order: i, updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,name" },
      );
      if (vErr) throw new Error(`variante ${p.slug}/${v.name} : ${vErr.message}`);
    }
    console.log(`✔ produit ${p.slug} (${variants.length} variantes)`);
  }
  console.log("\nBoutique démo prête — site_key starter-ecom-demo");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
