/**
 * Inscrit la boutique de démonstration « Maison Canigou » (ecom-starter,
 * site_key `starter-ecom-demo`) dans `site_profiles`, le temps de prouver le
 * pipeline fiche produit (brief → génération → publication CMS → vérification
 * en ligne). `is_active = false` : elle ne doit pas apparaître dans les listes
 * ni dans les scans hebdo. Domaine = serveur local du VPS (port fermé au public).
 *
 *   npx tsx scripts/oneshot/register-ecom-demo.mts            # inscrit / met à jour
 *   npx tsx scripts/oneshot/register-ecom-demo.mts --remove   # retire la ligne
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const SITE = "starter-ecom-demo";
const LOCAL = "http://localhost:3021";
const envLocal = readFileSync("/home/ubuntu/sites/ecom-starter/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans ecom-starter/.env.local");

const row = {
  site_key: SITE,
  name: "Maison Canigou (démo ecom-starter)",
  label: "Maison Canigou",
  color: "bg-stone-500",
  is_active: false,
  scope: "national",
  mode: "product",
  niche: "Boutique de démonstration du template ecom-starter : t-shirts, sweats et accessoires en coton bio, brodés et sérigraphiés à Perpignan",
  geo_target: "France métropolitaine (livraison), retrait en boutique à Perpignan",
  business: "Boutique de vêtements et accessoires",
  business_model: "ecommerce",
  target_audience: "Particuliers qui cherchent un basique durable en coton bio ou un cadeau catalan, sur mobile",
  domain: LOCAL,
  gsc_domain: null,
  phone: "0400000000",
  email: "bonjour@exemple.fr",
  address: "12 rue de la Loge",
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "Store",
  project_path: "/home/ubuntu/sites/ecom-starter",
  production_branch: "master",
  delivery_mode: "cms",
  revalidate_url: `${LOCAL}/api/revalidate`,
  revalidate_secret: secret,
  relevant_topics: ["t-shirt coton bio", "sweat molleton", "casquette brodée", "tote bag", "mug grès", "vêtement catalan", "cadeau perpignan"],
  reject_topics: ["emploi", "formation", "grossiste", "destockage", "pas cher"],
  triage_instructions:
    "GARDER : requêtes d'achat de vêtements et accessoires en coton bio, basiques durables, cadeaux catalans, avec ou sans lieu. REJETER : emploi, formation, gros, déstockage.",
  services: [],
  seo_keyword_patterns: ["{produit} coton bio", "{produit} catalan", "{produit} brodé perpignan"],
  brand: {
    personality: "La boutique de la rue de la Loge : sobre, précise, tenue — on vend des basiques qui durent et on explique pourquoi",
    tone: "« nous » et « vous », phrases courtes, matière et finitions avant les adjectifs, jamais de superlatif, jamais de prix dans le texte",
    ctaStyle: "le bouton d'achat est rendu par la fiche ; le texte n'appelle pas à l'action, il informe. Un seul rappel du téléphone en fin de page",
    wordsToUse: ["coton bio peigné", "teint en pièce", "col doublé", "molleton brossé", "brodé à Perpignan", "sérigraphie à l'eau", "petites séries"],
    wordsToAvoid: ["pas cher", "meilleur prix", "promo", "livraison gratuite", "stock limité", "dernière chance", "ans d'expérience", "avis", "certifié"],
    experienceProof: "Les finitions sont faites dans l'atelier derrière la boutique ; chaque pièce est vérifiée à la main",
  },
  content_rules: {
    doNotMention: ["prix", "remise", "délai de livraison", "stock", "note", "nombre d'avis"],
  },
};

async function main() {
  const db = getSupabase();
  if (process.argv.includes("--remove")) {
    const { error } = await db.from("site_profiles").delete().eq("site_key", SITE);
    if (error) throw error;
    console.log("retirée :", SITE);
    return;
  }
  const { data: existing } = await db.from("site_profiles").select("site_key").eq("site_key", SITE).maybeSingle();
  const { error } = existing
    ? await db.from("site_profiles").update(row).eq("site_key", SITE)
    : await db.from("site_profiles").insert(row);
  if (error) throw error;
  console.log(existing ? "mise à jour" : "inscrite", SITE, "(is_active = false)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
