/**
 * Inscrit la boutique « Poopy » (instance ecom-starter, site_key `poopy`,
 * fondants parfumés / fondants crémeux / bougies / bijoux) dans `site_profiles`
 * — étape 1 de docs/NOUVEAU-SITE.md du template, AVANT tout import d'inventaire.
 * `is_active = false` et domaine = serveur local tant que le domaine réel n'est
 * pas connu (docs/A-FOURNIR.md du site). Idempotent : upsert sur site_key.
 *
 *   npx tsx scripts/oneshot/register-poopy.mts
 *   npx tsx scripts/oneshot/register-poopy.mts --remove
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const SITE = "poopy";
const LOCAL = "http://localhost:3022";
const envLocal = readFileSync("/home/ubuntu/sites/Poopy/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans Poopy/.env.local");

const row = {
  site_key: SITE,
  name: "Poopy",
  label: "Poopy",
  color: "bg-rose-700",
  is_active: false,
  scope: "national",
  mode: "product",
  niche:
    "Boutique en ligne Poopy : fondants parfumés et fondants crémeux pour brûle-parfum, bougies parfumées, bijoux fantaisie dorés",
  geo_target: "France métropolitaine (livraison)",
  business: "Boutique en ligne de fondants parfumés, bougies et bijoux",
  business_model: "ecommerce",
  target_audience:
    "Femmes 25-55 ans qui parfument leur intérieur (fondants, bougies) et cherchent un petit cadeau ou un bijou du quotidien, sur mobile",
  domain: LOCAL,
  gsc_domain: null,
  phone: "0000000000",
  email: "bonjour@poopy.example",
  address: "Adresse à confirmer",
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "Store",
  project_path: "/home/ubuntu/sites/Poopy",
  production_branch: "master",
  delivery_mode: "cms",
  revalidate_url: `${LOCAL}/api/revalidate`,
  revalidate_secret: secret,
  relevant_topics: [
    "fondant parfumé",
    "fondant crémeux",
    "cire fouettée parfumée",
    "brûle-parfum",
    "bougie parfumée",
    "bougie végétale",
    "bijou fantaisie doré",
    "collier acier inoxydable",
    "idée cadeau parfum d'intérieur",
  ],
  reject_topics: ["recette", "fondant au chocolat", "pâtisserie", "grossiste", "fabriquer soi-même", "emploi", "formation"],
  triage_instructions:
    "GARDER : requêtes d'achat de fondants parfumés / cire parfumée pour brûle-parfum, fondants crémeux, bougies parfumées, bijoux fantaisie dorés, cadeaux parfum d'intérieur, questions d'usage (comment utiliser, combien de temps). REJETER : fondant au chocolat et pâtisserie (homonyme), DIY/fabrication, grossiste, emploi, formation.",
  services: [],
  seo_keyword_patterns: ["fondant parfumé {parfum}", "bougie parfumée {parfum}", "{bijou} doré acier inoxydable"],
  brand: {
    personality:
      "Une petite boutique qui parle comme à une amie : chaleureuse, précise sur l'usage, jamais mièvre",
    tone: "« nous » et « vous », phrases courtes, le parfum et l'usage avant les adjectifs, jamais de superlatif, jamais de prix dans le texte",
    ctaStyle:
      "le bouton d'achat est rendu par la fiche ; le texte informe (parfum, usage, durée), un seul rappel du téléphone en fin de page",
    wordsToUse: ["brûle-parfum", "cube", "diffusion", "note de tête / de cœur / de fond", "cire fouettée", "petites séries"],
    wordsToAvoid: ["pas cher", "meilleur prix", "promo", "stock limité", "dernière chance", "fait main" , "naturel", "certifié", "avis"],
    experienceProof: "À CONFIRMER avec Elden : où et comment les fondants et bougies sont coulés (docs/A-FOURNIR.md du site)",
  },
  content_rules: {
    doNotMention: ["prix", "remise", "délai de livraison", "stock", "note", "nombre d'avis", "fait main", "cire végétale (tant que non confirmé)"],
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
