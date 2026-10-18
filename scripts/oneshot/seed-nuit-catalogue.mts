/**
 * Catalogue de lancement de « Livraison de Nuit » (site_key `nuit`) : 8 rayons et les
 * 25 références réellement vendues par le service (mêmes produits et mêmes prix que le
 * catalogue de Mon Sauveur, `Mon-Sauveur/data/catalogue.ts`, même opération), photos
 * copiées dans `public/images/products/` du site. Aucun prix inventé : les références de
 * l'ancien site WordPress (Ballantine's, Ciroc, Belvedere, Lafage…) sans prix connu ne
 * sont PAS ajoutées — à saisir dans /admin du site quand le prix est fixé.
 *
 * Le script REMPLACE le catalogue du site_key `nuit` : à ne lancer qu'au lancement.
 *
 *   npx tsx scripts/oneshot/seed-nuit-catalogue.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "nuit";
const IMG = (file: string) => `/images/products/${file}`;

const categories = [
  { slug: "vodkas", name: "Vodkas", description: "Vodkas 70 cl livrées fermées, à Perpignan et alentours, de 20h à 4h." },
  { slug: "whiskys", name: "Whiskys", description: "Whiskys 70 cl livrés la nuit à domicile." },
  { slug: "rhums", name: "Rhums", description: "Rhums 70 cl livrés la nuit à Perpignan et dans les communes voisines." },
  { slug: "aperitifs-liqueurs", name: "Apéritifs et liqueurs", description: "Pastis, liqueurs et crèmes pour l'apéro de nuit." },
  { slug: "bieres", name: "Bières", description: "Bières fraîches livrées à l'unité ou en quantité." },
  { slug: "bulles", name: "Bulles", description: "Cava et bulles pour fêter quelque chose à n'importe quelle heure." },
  { slug: "softs-snacks", name: "Softs et snacks", description: "Sodas, chips, bonbons et barres chocolatées : l'épicerie de nuit." },
  { slug: "formules", name: "Formules", description: "Bouteille + soft, prêts à servir." },
];

interface Seed {
  slug: string;
  name: string;
  cat: string;
  price: number;
  unit: string;
  image: string;
  description: string;
  attributes: Record<string, string>;
  featured?: boolean;
}

const products: Seed[] = [
  // Vodkas
  { slug: "poliakov-70cl", name: "Poliakov 70 cl", cat: "vodkas", price: 29.9, unit: "Bouteille 70 cl", image: "poliakov-0-70cl.jpg", description: "Vodka Poliakov en bouteille de 70 cl. La vodka la plus demandée la nuit, seule ou en formule avec un soft.", attributes: { type: "Vodka", contenance: "70 cl" }, featured: true },
  { slug: "absolut-70cl", name: "Absolut 70 cl", cat: "vodkas", price: 39.9, unit: "Bouteille 70 cl", image: "absolut-vodka-0-70cl.jpg", description: "Vodka Absolut en bouteille de 70 cl, livrée fermée.", attributes: { type: "Vodka", contenance: "70 cl" }, featured: true },
  // Whiskys
  { slug: "label-5-70cl", name: "Label 5 70 cl", cat: "whiskys", price: 29.9, unit: "Bouteille 70 cl", image: "label-5-0-70cl.jpg", description: "Whisky écossais Label 5 en bouteille de 70 cl.", attributes: { type: "Whisky", contenance: "70 cl" } },
  { slug: "johnnie-walker-70cl", name: "Johnnie Walker 70 cl", cat: "whiskys", price: 39.9, unit: "Bouteille 70 cl", image: "johnny-walker.jpg", description: "Whisky écossais Johnnie Walker en bouteille de 70 cl.", attributes: { type: "Whisky", contenance: "70 cl" }, featured: true },
  // Rhums
  { slug: "captain-morgan-70cl", name: "Captain Morgan 70 cl", cat: "rhums", price: 29.9, unit: "Bouteille 70 cl", image: "captain-morgan-70cl.jpg", description: "Rhum épicé Captain Morgan en bouteille de 70 cl, le classique du rhum-coca.", attributes: { type: "Rhum épicé", contenance: "70 cl" }, featured: true },
  // Apéritifs et liqueurs
  { slug: "ricard-70cl", name: "Ricard 70 cl", cat: "aperitifs-liqueurs", price: 39.9, unit: "Bouteille 70 cl", image: "ricard-70cl.jpg", description: "Pastis Ricard en bouteille de 70 cl.", attributes: { type: "Pastis", contenance: "70 cl" } },
  { slug: "jet-27-70cl", name: "Get 27 70 cl", cat: "aperitifs-liqueurs", price: 29.9, unit: "Bouteille 70 cl", image: "jet-27-0-70cl.jpg", description: "Liqueur de menthe Get 27 en bouteille de 70 cl.", attributes: { type: "Liqueur", contenance: "70 cl" } },
  { slug: "malibu-70cl", name: "Malibu 70 cl", cat: "aperitifs-liqueurs", price: 35, unit: "Bouteille 70 cl", image: "malibu.jpg", description: "Liqueur de rhum à la noix de coco Malibu, bouteille de 70 cl.", attributes: { type: "Liqueur", contenance: "70 cl" } },
  { slug: "baileys-70cl", name: "Baileys 70 cl", cat: "aperitifs-liqueurs", price: 35, unit: "Bouteille 70 cl", image: "bailey-s.jpg", description: "Crème de whisky Baileys en bouteille de 70 cl.", attributes: { type: "Crème de whisky", contenance: "70 cl" } },
  // Bières
  { slug: "heineken-33cl", name: "Heineken 33 cl", cat: "bieres", price: 3, unit: "Bouteille 33 cl", image: "biere-heineken-33cl.jpg", description: "Bière blonde Heineken en bouteille de 33 cl, livrée fraîche. Dites-nous la quantité au téléphone.", attributes: { type: "Bière blonde", contenance: "33 cl" }, featured: true },
  // Bulles
  { slug: "cava-70cl", name: "Cava 70 cl", cat: "bulles", price: 30, unit: "Bouteille 70 cl", image: "cava-70cl.jpg", description: "Cava brut en bouteille de 70 cl, pour fêter quelque chose sans attendre demain.", attributes: { type: "Cava", contenance: "70 cl" } },
  // Softs et snacks
  { slug: "pringles-original", name: "Pringles Original", cat: "softs-snacks", price: 4.5, unit: "Boîte 160 g", image: "pringles-original.jpg", description: "Chips Pringles Original, boîte de 160 g.", attributes: { type: "Chips", poids: "160 g" } },
  { slug: "pringles-cream-onion", name: "Pringles Cream & Onion", cat: "softs-snacks", price: 4.5, unit: "Boîte 160 g", image: "pringles-cream-onion.jpg", description: "Chips Pringles Cream & Onion, boîte de 160 g.", attributes: { type: "Chips", poids: "160 g" } },
  { slug: "pringles-hot", name: "Pringles Hot", cat: "softs-snacks", price: 5, unit: "Boîte 160 g", image: "pringles-hot.jpg", description: "Chips Pringles Hot, boîte de 160 g.", attributes: { type: "Chips", poids: "160 g" } },
  { slug: "m-ms-45g", name: "M&M's 45 g", cat: "softs-snacks", price: 2, unit: "Sachet 45 g", image: "m-m-s-45g.jpg", description: "M&M's en sachet de 45 g.", attributes: { type: "Confiserie", poids: "45 g" } },
  { slug: "m-ms-330g", name: "M&M's 330 g", cat: "softs-snacks", price: 10, unit: "Sachet 330 g", image: "m-m-s-330g.jpg", description: "M&M's en grand sachet de 330 g, pour toute la soirée.", attributes: { type: "Confiserie", poids: "330 g" } },
  { slug: "fraises-tagada", name: "Fraises Tagada", cat: "softs-snacks", price: 2.5, unit: "Sachet", image: "fraise-tagada.jpg", description: "Fraises Tagada Haribo en sachet.", attributes: { type: "Confiserie" } },
  { slug: "haribo-schtroumpfs", name: "Haribo Schtroumpfs", cat: "softs-snacks", price: 2.5, unit: "Sachet", image: "haribo-les-schtroumpfs.jpg", description: "Bonbons Haribo Schtroumpfs en sachet.", attributes: { type: "Confiserie" } },
  { slug: "snickers", name: "Snickers", cat: "softs-snacks", price: 1.5, unit: "Barre", image: "snickers.jpg", description: "Barre chocolatée Snickers.", attributes: { type: "Barre chocolatée" } },
  { slug: "mars", name: "Mars", cat: "softs-snacks", price: 1.5, unit: "Barre", image: "mars.jpg", description: "Barre chocolatée Mars.", attributes: { type: "Barre chocolatée" } },
  // Formules
  { slug: "formule-poliakov", name: "Formule Poliakov", cat: "formules", price: 34.9, unit: "Bouteille 70 cl + soft 1 L", image: "formule-poliakov-0-70cl.jpg", description: "Vodka Poliakov 70 cl et une bouteille de Crazy Tiger 1 L.", attributes: { type: "Formule", contenu: "Poliakov 70 cl + Crazy Tiger 1 L" }, featured: true },
  { slug: "formule-captain-morgan", name: "Formule Captain Morgan", cat: "formules", price: 34.9, unit: "Autour d'une bouteille 70 cl", image: "formule-captain-morgan.jpg", description: "Formule autour du rhum Captain Morgan 70 cl. Le contenu exact de la formule vous est confirmé au téléphone.", attributes: { type: "Formule", base: "Captain Morgan 70 cl" }, featured: true },
  { slug: "formule-absolut", name: "Formule Absolut", cat: "formules", price: 44.9, unit: "Autour d'une bouteille 70 cl", image: "formule-absolut-0-70cl.jpg", description: "Formule autour de la vodka Absolut 70 cl. Le contenu exact de la formule vous est confirmé au téléphone.", attributes: { type: "Formule", base: "Absolut 70 cl" } },
  { slug: "formule-johnnie-walker", name: "Formule Johnnie Walker", cat: "formules", price: 44.5, unit: "Autour d'une bouteille 70 cl", image: "formule-johnny-walker.jpg", description: "Formule autour du whisky Johnnie Walker 70 cl. Le contenu exact de la formule vous est confirmé au téléphone.", attributes: { type: "Formule", base: "Johnnie Walker 70 cl" } },
];

const sb = getSupabase();
await sb.from("products").delete().eq("site_key", SITE);
await sb.from("product_categories").delete().eq("site_key", SITE);

const { data: cats, error: e1 } = await sb
  .from("product_categories")
  .insert(categories.map((c, i) => ({ site_key: SITE, slug: c.slug, name: c.name, description: c.description, display_order: i + 1 })))
  .select("id, slug");
if (e1) throw e1;
const catId = new Map((cats ?? []).map((c) => [c.slug as string, c.id as string]));

const { error: e2 } = await sb.from("products").insert(
  products.map((p) => ({
    site_key: SITE,
    slug: p.slug,
    category_id: catId.get(p.cat) ?? null,
    name: p.name,
    description: p.description,
    price: p.price,
    unit: p.unit,
    attributes: p.attributes,
    images: [IMG(p.image)],
    status: "published",
    featured: p.featured === true,
  })),
);
if (e2) throw e2;
console.log(`Catalogue ${SITE} : ${categories.length} rayons, ${products.length} produits.`);
