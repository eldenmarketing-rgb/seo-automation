/**
 * Inscription du site Façadier 66 (instance site-starter « Facadier66 »,
 * site SEO du réseau, rank & rent, domaine facadier66.fr) dans site_profiles
 * — étape 1 de docs/NOUVEAU-SITE.md du template.
 * Idempotent : upsert sur site_key. Le secret de revalidation est lu dans
 * le .env.local du site (jamais écrit ici).
 *
 *   npx tsx scripts/oneshot/register-facadier.ts
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const envLocal = readFileSync("/home/ubuntu/sites/Facadier66/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans Facadier66/.env.local");

const row = {
  site_key: "facadier",
  name: "Façadier 66",
  label: "Façadier",
  color: "bg-amber-700",
  is_active: true,
  scope: "local",
  mode: "local",
  niche:
    "Façadier à Perpignan : ravalement de façade, enduit (monocouche, chaux), peinture de façade, nettoyage et démoussage, isolation thermique par l'extérieur, réparation de fissures — site SEO rank & rent",
  geo_target:
    "Perpignan et Pyrénées-Orientales (66) : Cabestany, Canet-en-Roussillon, Saint-Cyprien, Argelès-sur-Mer, Saint-Estève, Toulouges, Thuir, Rivesaltes",
  business: "Entreprise de ravalement et de rénovation de façades",
  business_model: "lead-gen",
  target_audience:
    "Propriétaires de maisons et petits immeubles à Perpignan et dans le 66 dont la façade est sale, fissurée, écaillée ou mal isolée ; syndics et copropriétés pour un ravalement ; recherche sur mobile, contact par téléphone",
  domain: "https://facadier66.fr",
  gsc_domain: null,
  phone: "0973920994",
  email: "contact@facadier66.fr",
  address: null,
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "HomeAndConstructionBusiness",
  project_path: "/home/ubuntu/sites/Facadier66",
  production_branch: "main",
  delivery_mode: "cms",
  revalidate_url: "https://facadier66.fr/api/revalidate",
  revalidate_secret: secret,
  relevant_topics: [
    "façadier", "ravalement de façade", "ravalement", "enduit de façade", "enduit monocouche", "enduit à la chaux",
    "crépi", "peinture de façade", "nettoyage de façade", "démoussage", "hydrofuge", "hydrogommage",
    "isolation thermique par l'extérieur", "ite", "fissure de façade", "microfissure", "faïençage",
    "rénovation de façade", "façadier perpignan",
  ],
  reject_topics: [
    "formation", "emploi", "salaire", "cap", "fiche métier", "tuto", "leroy merlin", "castorama",
    "brico dépôt", "point p", "bricolage", "cours", "bardage bois pas cher", "façade de meuble", "façade de cuisine",
    "façade de placard", "mur intérieur", "plâtre intérieur", "plaquiste",
  ],
  triage_instructions:
    "GARDER : toute requête de travaux sur une façade extérieure chez un particulier ou une copropriété (ravalement, enduit, crépi, peinture de façade, nettoyage, démoussage, hydrofuge, ITE, fissures, rénovation de façade), avec ou sans lieu du 66, et les requêtes prix / tarif / devis / m² associées. REJETER : formation, emploi, salaire, bricolage et tutoriels, achat de matériaux, façades de meubles ou de cuisine, travaux intérieurs (plaquiste, plâtre), requêtes hors 66 sans intention locale.",
  services: [
    { name: "Ravalement de façade", slug: "prestations/ravalement-facade-perpignan", emoji: "🏠", category: "ravalement", keywords: ["ravalement de façade perpignan", "ravalement façade perpignan", "façadier perpignan"] },
    { name: "Enduit de façade", slug: "prestations/enduit-facade-perpignan", emoji: "🧱", category: "enduit", keywords: ["enduit façade perpignan", "crépi perpignan", "enduit monocouche perpignan"] },
    { name: "Peinture de façade", slug: "prestations/peinture-facade-perpignan", emoji: "🎨", category: "peinture", keywords: ["peinture façade perpignan", "peintre façade perpignan", "peinture extérieure maison perpignan"] },
    { name: "Nettoyage de façade", slug: "prestations/nettoyage-facade-perpignan", emoji: "🧽", category: "nettoyage", keywords: ["nettoyage façade perpignan", "démoussage façade perpignan", "hydrogommage perpignan"] },
    { name: "Isolation thermique par l'extérieur", slug: "prestations/isolation-exterieure-perpignan", emoji: "🛡️", category: "ite", keywords: ["isolation extérieure perpignan", "ite perpignan", "isolation thermique par l'extérieur perpignan"] },
    { name: "Réparation de fissures", slug: "prestations/reparation-fissures-facade-perpignan", emoji: "🔧", category: "fissures", keywords: ["réparation fissure façade perpignan", "fissure façade perpignan", "traitement fissure mur extérieur"] },
  ],
  seo_keyword_patterns: ["façadier {ville}", "{service} {ville}", "ravalement façade {ville}"],
  brand: {
    personality:
      "Le façadier de Perpignan qui répond au téléphone, vient voir la façade et explique ce qu'il va faire au mur et pourquoi — sérieux, concret, rassurant, jamais publicitaire",
    tone: "on parle en « nous » et on s'adresse à « vous » ; concret et précis sur le support et les produits (enduit monocouche, enduit à la chaux, peinture pliolite / siloxane / acrylique, hydrofuge, nettoyage basse pression, panneaux isolants et enduit de finition), phrases courtes, lisible sur mobile. Mentionner le climat local (soleil, tramontane, pluies violentes) quand c'est utile. Ne jamais mettre en scène de personne nommée. Jamais « je ».",
    ctaStyle:
      "l'appel d'abord — « Appelez le façadier » ; le devis en second (page contact). Déroulé : appel → visite et sondage de la façade → devis écrit → chantier. Pas de réservation en ligne.",
    wordsToUse: ["façade", "support", "enduit monocouche", "enduit à la chaux", "finition grattée / talochée", "peinture de façade", "hydrofuge", "démoussage", "fissure", "isolation par l'extérieur", "devis écrit", "visite sur place", "à Perpignan et dans le 66"],
    wordsToAvoid: ["gratuit", "24h/24", "7j/7", "sous 24h", "sous 48h", "garantie décennale", "certifié", "agréé", "RGE", "Qualibat", "ans d'expérience", "chantiers réalisés", "avis", "étoiles", "pas cher", "meilleur prix", "numéro 1", "le meilleur de Perpignan", "MaPrimeRénov", "prime", "CEE", "éco-PTZ", "€/m²"],
    experienceProof:
      "AUCUNE preuve vérifiée : adresse, SIRET, horaires, assurances, qualifications, ancienneté, avis, tarifs et zones réellement desservies restent À FOURNIR (docs/A-FOURNIR.md du site). N'inventer aucune preuve, aucun prix, aucune aide financière.",
    uniqueSellingPoints: [
      "Ravalement, enduit, peinture, nettoyage, ITE et fissures : toute la façade par un seul interlocuteur",
      "Une visite avec sondage du support, puis un devis écrit avant tout chantier",
      "Le traitement adapté au mur : chaux sur l'ancien, monocouche sur le récent",
      "Entreprise locale, Perpignan et tout le département",
    ],
  },
  enabled_intents: ["service", "prix"],
  content_rules: { language: "fr", minWordCount: 800, maxWordCount: 1500, seoSectionCount: 5, faqCount: 5, includeUpdatedDate: true },
  cocooning: { pillarPages: ["prestations"], clusterDepth: 1, maxInternalLinks: 4 },
};

const sb = getSupabase();
const { error } = await sb.from("site_profiles").upsert(row, { onConflict: "site_key" });
if (error) throw error;
const { data } = await sb
  .from("site_profiles")
  .select("site_key, name, delivery_mode, revalidate_url, domain, phone, is_active")
  .eq("site_key", "facadier")
  .single();
console.log("site_profiles :", data);
