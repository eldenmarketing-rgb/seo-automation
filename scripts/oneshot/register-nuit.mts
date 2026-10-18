/**
 * Inscription du site « Livraison de Nuit » (livraison-de-nuit.fr, instance
 * site-starter `/home/ubuntu/sites/Livraison-de-nuit`) dans site_profiles —
 * étape 1 de docs/NOUVEAU-SITE.md. Deuxième marque de l'activité de livraison
 * d'alcool de nuit (même opération que Mon Sauveur / `restaurant`) : mêmes faits
 * terrain (20h-4h, 15 km, ~30 min, paiement à la livraison), positionnement
 * apéro de nuit + épicerie de nuit, numéro Twilio tracké 09 73 92 08 28.
 *
 * Idempotent : upsert sur site_key. Le secret de revalidation est lu dans le
 * .env.local du site. `domain` et `revalidate_url` sont posés dès maintenant
 * (le domaine existe, la 301 Cloudflare sera retirée au go-live) ; le crawl ne
 * verra qu'une 301 tant que le site n'est pas servi — acceptable.
 *
 *   npx tsx scripts/oneshot/register-nuit.mts
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const envLocal = readFileSync("/home/ubuntu/sites/Livraison-de-nuit/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans Livraison-de-nuit/.env.local");

const row = {
  site_key: "nuit",
  name: "Livraison de Nuit",
  label: "Livraison de Nuit",
  color: "bg-violet-600",
  is_active: true,
  scope: "local",
  mode: "local",
  niche: "Livraison d'alcool, d'apéro et d'épicerie de nuit à domicile — Perpignan et communes dans un rayon de 15 km, 20h-4h",
  geo_target: "Perpignan et communes environnantes dans un rayon de 15 km (66) : Cabestany, Canet-en-Roussillon, Saint-Cyprien, Rivesaltes, Bompas, Saint-Estève, Toulouges, Le Soler, Pia, Claira, Villeneuve-de-la-Raho, Thuir, Elne, Argelès-sur-Mer, Sainte-Marie-la-Mer, Torreilles, Le Barcarès, Leucate",
  business: "Service de livraison à domicile la nuit : alcool (vodka, whisky, rhum, apéritifs, bières, bulles), softs, snacks et formules bouteille + soft, commandés par téléphone",
  business_model: "lead-gen",
  target_audience:
    "Adultes à Perpignan et dans l'agglomération, le soir et la nuit, quand supermarchés, cavistes et épiceries sont fermés : soirée improvisée, apéro qui se prolonge, creux de 2h du matin. Sur mobile, pressés, ils veulent un numéro qui répond et un délai clair.",
  domain: "https://livraison-de-nuit.fr",
  gsc_domain: "livraison-de-nuit.fr",
  phone: "09 73 92 08 28",
  email: "contact@livraison-de-nuit.fr",
  address: null,
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "Store",
  project_path: "/home/ubuntu/sites/Livraison-de-nuit",
  production_branch: "main",
  delivery_mode: "cms",
  revalidate_url: "https://livraison-de-nuit.fr/api/revalidate",
  revalidate_secret: secret,
  relevant_topics: [
    "livraison alcool", "alcool nuit", "apéro de nuit", "épicerie de nuit", "livraison apéro", "livraison de nuit",
    "bière", "vodka", "whisky", "rhum", "champagne", "cava", "softs", "snacks", "glaçons", "boisson à domicile",
    "livraison soirée", "livraison 24h", "ouvert la nuit",
  ],
  reject_topics: [
    "restaurant", "cuisine", "traiteur", "livraison repas", "burger", "pizza", "bar", "discothèque", "mineur",
    "cocktail bar", "caviste", "brasserie", "emploi", "livreur recrutement", "uber eats", "deliveroo",
  ],
  triage_instructions:
    "Site LOCAL de livraison d'alcool, d'apéro et d'épicerie de nuit (20h-4h) à Perpignan et alentours (15 km). GARDER : livraison alcool / boissons / apéro / épicerie de nuit / de nuit / tard / 24h, avec ou sans ville du 66, les requêtes par produit (bière, vodka, whisky, rhum, champagne, glaçons, softs, snacks) associées à une livraison ou à la nuit, et les requêtes prix / ouvert maintenant. REJETER : restaurants et livraison de repas, bars et discothèques, cavistes et achat en magasin, recettes de cocktails, emploi, requêtes hors 66 sans intention locale, tout ce qui concerne les mineurs.",
  services: [
    { name: "Apéro de nuit", slug: "livraison/apero-de-nuit-perpignan", emoji: "🍹", category: "livraison", keywords: ["apero de nuit perpignan", "livraison apero perpignan", "livraison apero nuit", "apero de nuit 66"] },
    { name: "Épicerie de nuit", slug: "livraison/epicerie-de-nuit-perpignan", emoji: "🛒", category: "livraison", keywords: ["epicerie de nuit perpignan", "epicerie de nuit", "livraison de nuit perpignan", "ouvert la nuit perpignan"] },
  ],
  seo_keyword_patterns: ["livraison alcool nuit {ville}", "livraison alcool {ville}", "apero de nuit {ville}", "epicerie de nuit {ville}", "livraison {service} {ville}"],
  brand: {
    personality:
      "Le service de nuit qui décroche : direct, complice, efficace, jamais festif à outrance ni moralisateur. On est là quand tout est fermé, on dit le délai et le prix, on vient.",
    tone: "on parle en « nous » / « on », on vouvoie ; phrases courtes, concrètes, lisibles sur mobile à minuit. Pas de jargon, pas d'emphase, pas de mise en scène de personne nommée. Jamais « je ». Chaque page rappelle que la vente d'alcool est réservée aux majeurs et que l'abus d'alcool est dangereux pour la santé.",
    ctaStyle:
      "l'appel d'abord — « Commander au 09 73 92 08 28 » ; les rayons en second (/#rayons). Déroulé : appel → on confirme le total et le délai → on livre → paiement carte ou espèces à la porte. Pas de commande en ligne, pas de compte.",
    wordsToUse: ["de 20h à 4h", "tous les soirs", "une trentaine de minutes", "paiement à la livraison", "carte ou espèces", "Perpignan et communes voisines", "quand tout est fermé", "on confirme le total au téléphone", "nos rayons", "prix affichés"],
    wordsToAvoid: ["gratuit", "frais de livraison inclus", "sans minimum", "pas de minimum", "en 15 minutes", "en 20 minutes", "24h/24", "le moins cher", "meilleur prix", "numéro 1", "le premier", "avis", "étoiles", "satisfait ou remboursé", "nuit blanche", "beuverie", "ivre", "faire la fête jusqu'au bout", "mineur"],
    experienceProof:
      "Faits vérifiés sur le service réel (même opération que Mon Sauveur) : horaires 20h-4h 7j/7 fériés compris ; zone Perpignan + ~15 km (19 communes listées dans lib/config.ts du site) ; délai « une trentaine de minutes », plus vers le littoral ; paiement CB ou espèces à la livraison ; commande par téléphone uniquement ; catalogue et prix = tables product_categories / products (seuls prix citables). NON vérifiés, ne pas affirmer : minimum de commande, frais de livraison, nombre de clients, ancienneté, avis (aucun avis Google sur cette marque au lancement), email de contact.",
    uniqueSellingPoints: [
      "Un numéro qui répond tous les soirs de 20h à 4h, jours fériés compris",
      "Commande confirmée au téléphone : total et délai annoncés avant le départ",
      "Livraison à domicile en une trentaine de minutes à Perpignan et dans les communes voisines",
      "Paiement à la livraison, par carte ou en espèces",
      "Apéro complet ou dépannage d'épicerie : bouteilles, bières, bulles, softs, snacks, glaçons",
    ],
  },
  enabled_intents: ["service", "prix", "city_hub"],
  content_rules: { faqCount: 6, language: "fr", maxWordCount: 1200, minWordCount: 700, seoSectionCount: 4, includeUpdatedDate: true },
  cocooning: { pillarPages: ["livraison/apero-de-nuit-perpignan", "livraison/epicerie-de-nuit-perpignan"], clusterDepth: 1, maxInternalLinks: 4 },
};

const sb = getSupabase();
const { error } = await sb.from("site_profiles").upsert(row, { onConflict: "site_key" });
if (error) throw error;
const { data } = await sb.from("site_profiles").select("site_key,name,domain,delivery_mode,revalidate_url,is_active").eq("site_key", "nuit").single();
console.log("site_profiles.nuit :", data);
