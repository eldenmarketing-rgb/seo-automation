/**
 * Inscription du site D&L.S Motors (nettoyage auto, Perpignan) dans
 * site_profiles — étape 1 de docs/NOUVEAU-SITE.md du template.
 * Idempotent : upsert sur site_key. Le secret de revalidation est lu dans
 * le .env.local du site (jamais écrit ici).
 *
 *   npx tsx scripts/oneshot/register-dls.ts
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const envLocal = readFileSync("/home/ubuntu/sites/DLSMOTORS/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans DLSMOTORS/.env.local");

const row = {
  site_key: "dls",
  name: "D&L.S Motors",
  label: "DLS Motors",
  color: "bg-amber-500",
  is_active: true,
  scope: "local",
  mode: "local",
  niche: "Nettoyage et esthétique automobile (nettoyage intérieur, lavage extérieur à la main, formule complète, detailing) — Perpignan et alentours (66)",
  geo_target: "Perpignan et alentours (66)",
  business: "Entreprise de nettoyage et d'esthétique automobile",
  business_model: "lead-gen",
  target_audience:
    "Automobilistes de Perpignan et de l'agglomération qui veulent un véhicule propre sans s'en occuper : particuliers (revente, habitacle sale, enfants/animaux), et véhicules premium pour le detailing",
  domain: "https://dlsmotors.fr",
  gsc_domain: null,
  phone: "06 12 34 56 78",
  email: "contact@dlsmotors.fr",
  address: null,
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "AutoWash",
  project_path: "/home/ubuntu/sites/DLSMOTORS",
  production_branch: "main",
  delivery_mode: "cms",
  revalidate_url: "https://dlsmotors.fr/api/revalidate",
  revalidate_secret: secret,
  relevant_topics: [
    "nettoyage voiture", "lavage auto", "lavage à la main", "nettoyage intérieur",
    "detailing", "traitement céramique", "polissage", "rénovation cuir",
    "désinfection habitacle", "lavage à domicile", "prix nettoyage voiture",
  ],
  reject_topics: [
    "station de lavage", "lavage haute pression libre-service", "aspirateur",
    "produits de nettoyage", "emploi", "franchise", "formation detailing",
    "garage mécanique", "carrosserie", "pare-brise",
  ],
  triage_instructions:
    "GARDER : toute requête de nettoyage / lavage / detailing / rénovation esthétique d'un véhicule (intérieur, extérieur, complet, cuir, céramique, polissage, désinfection, à domicile), avec ou sans lieu du 66, et les requêtes prix / tarif / devis associées. REJETER : stations de lavage en libre-service, achat de produits ou de matériel, emploi / formation / franchise, mécanique, carrosserie, pare-brise, requêtes hors 66 sans intention locale.",
  services: [
    { name: "Nettoyage intérieur", slug: "prestations/nettoyage-interieur-voiture-perpignan", emoji: "🪑", category: "nettoyage", keywords: ["nettoyage intérieur voiture perpignan", "nettoyage habitacle voiture", "shampoing sièges voiture"] },
    { name: "Nettoyage extérieur", slug: "prestations/lavage-exterieur-voiture-perpignan", emoji: "🚿", category: "nettoyage", keywords: ["lavage voiture à la main perpignan", "lavage auto à domicile perpignan", "nettoyage extérieur voiture"] },
    { name: "Formule complète", slug: "prestations/nettoyage-complet-voiture-perpignan", emoji: "✨", category: "nettoyage", keywords: ["nettoyage complet voiture perpignan", "nettoyage voiture intérieur extérieur", "lavage complet voiture"] },
    { name: "Detailing premium", slug: "prestations/detailing-voiture-perpignan", emoji: "💎", category: "detailing", keywords: ["detailing perpignan", "traitement céramique voiture perpignan", "polissage voiture perpignan"] },
  ],
  seo_keyword_patterns: ["nettoyage voiture {ville}", "lavage auto {ville}", "{service} {ville}", "detailing {ville}"],
  brand: {
    personality: "L'entreprise de nettoyage auto qui rend un véhicule plus propre, plus sain et plus valorisé, à domicile ou sur son centre à Perpignan — soignée, directe, premium sans snobisme",
    tone: "on parle en « nous » et on s'adresse à « vous » ; concret, précis sur ce qui est fait (aspiration, plastiques, vitres, jantes, protection…), jamais publicitaire. Ne jamais mettre en scène de personne nommée. Jamais « je ».",
    ctaStyle: "l'appel d'abord — « Appelez-nous au 06 12 34 56 78 » ; WhatsApp pré-rempli et email en appoint. Déroulé : appel → choix de la formule et du créneau → confirmation immédiate. Pas de réservation en ligne.",
    wordsToUse: ["nettoyage", "lavage à la main", "habitacle", "detailing", "protection carrosserie", "traitement céramique", "à domicile", "sur rendez-vous", "comme neuf"],
    wordsToAvoid: ["pas cher", "discount", "meilleur prix", "numéro 1", "leader", "le meilleur de Perpignan", "certifié", "agréé", "ans d'expérience", "24h/24", "7j/7", "sous 24h", "garantie à vie", "le gérant", "le patron"],
    experienceProof: "Aucune preuve chiffrée vérifiée : pas d'avis publiés, pas d'ancienneté, pas de certification. Les prix affichés (à partir de 49 € intérieur, 39 € extérieur, 79 € complète, detailing sur devis) viennent du mockup du client et restent à confirmer. N'inventer aucune preuve.",
    uniqueSellingPoints: [
      "À domicile à Perpignan et alentours, ou sur le centre à Perpignan",
      "Lavage extérieur à la main (jantes, protection carrosserie, brillance longue durée)",
      "Nettoyage intérieur complet : aspiration, dépoussiérage, plastiques, vitres, sièges, désinfection",
      "Formule complète intérieur + extérieur ; detailing (rénovation en profondeur, correction de peinture, traitement céramique) sur devis",
      "Produits haut de gamme et éco-responsables (formulation du client, non vérifiée)",
      "Réservation par téléphone ou WhatsApp, confirmation immédiate",
    ],
  },
  enabled_intents: ["service", "prix"],
  content_rules: { language: "fr", minWordCount: 900, maxWordCount: 2000, seoSectionCount: 5, faqCount: 5, includeUpdatedDate: true },
  cocooning: { pillarPages: ["prestations"], clusterDepth: 1, maxInternalLinks: 4 },
};

const sb = getSupabase();
const { error } = await sb.from("site_profiles").upsert(row, { onConflict: "site_key" });
if (error) throw error;
const { data } = await sb.from("site_profiles").select("site_key, name, delivery_mode, revalidate_url, is_active").eq("site_key", "dls").single();
console.log("site_profiles :", data);
