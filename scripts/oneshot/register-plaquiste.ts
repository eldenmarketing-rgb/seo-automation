/**
 * Inscription du site Plaquiste Perpignan (instance site-starter « Plaquiste_perpi »,
 * site SEO du réseau, rank & rent) dans site_profiles — étape 1 de
 * docs/NOUVEAU-SITE.md du template.
 * Idempotent : upsert sur site_key. Le secret de revalidation est lu dans
 * le .env.local du site (jamais écrit ici).
 *
 * `domain` reste vide tant que le nom de domaine n'est pas choisi : le crawl
 * du lundi ne cible que les sites actifs AVEC domaine, le site noindex ne
 * polluera donc ni /indexation ni le backlog. À renseigner avec
 * `revalidate_url` dès que le domaine existe (page /sites du dashboard).
 *
 *   npx tsx scripts/oneshot/register-plaquiste.ts
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const envLocal = readFileSync("/home/ubuntu/sites/Plaquiste_perpi/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans Plaquiste_perpi/.env.local");

const row = {
  site_key: "plaquiste",
  name: "Plaquiste Perpignan", // placeholder : marque du site à fournir
  label: "Plaquiste",
  color: "bg-stone-500",
  is_active: true,
  scope: "local",
  mode: "local",
  niche:
    "Plaquiste à Perpignan : cloisons en plaques de plâtre, faux plafonds, isolation intérieure et doublage, aménagement de combles, bandes et enduit — site SEO rank & rent",
  geo_target:
    "Perpignan et agglomération (66) : Cabestany, Canet-en-Roussillon, Saint-Estève, Rivesaltes, Toulouges, Le Soler, Pia, Saint-Laurent-de-la-Salanque",
  business: "Entreprise de plâtrerie sèche et d'aménagement intérieur",
  business_model: "lead-gen",
  target_audience:
    "Particuliers de Perpignan et de l'agglomération qui rénovent ou aménagent un logement : créer une pièce, poser un faux plafond, isoler un mur, rendre des combles habitables ; recherche sur mobile, contact par téléphone",
  domain: null,
  gsc_domain: null,
  phone: null,
  email: null,
  address: null,
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "HomeAndConstructionBusiness",
  project_path: "/home/ubuntu/sites/Plaquiste_perpi",
  production_branch: "main",
  delivery_mode: "cms",
  revalidate_url: null,
  revalidate_secret: secret,
  relevant_topics: [
    "plaquiste", "placo", "plaque de plâtre", "cloison", "faux plafond", "plafond suspendu",
    "isolation intérieure", "doublage", "isolation phonique", "aménagement de combles",
    "bandes", "enduit", "joints placo", "rénovation intérieure", "plaquiste perpignan",
  ],
  reject_topics: [
    "formation", "emploi", "salaire", "cap", "fiche métier", "tuto", "leroy merlin", "castorama",
    "brico dépôt", "point p", "prix des plaques", "bricolage", "cours", "isolation extérieure", "ite",
    "plâtre traditionnel", "staff", "plafond tendu",
  ],
  triage_instructions:
    "GARDER : toute requête de travaux de plâtrerie sèche chez un particulier (cloison, placo, faux plafond, doublage, isolation intérieure, combles, bandes, enduit, finitions), avec ou sans lieu du 66, et les requêtes prix / tarif / devis / m² associées. REJETER : formation, emploi, salaire, bricolage et tutoriels, achat de matériaux (Leroy Merlin, Castorama, Point P), isolation par l'extérieur, plafond tendu, plâtre traditionnel et staff, requêtes hors 66 sans intention locale.",
  services: [
    { name: "Cloisons placo", slug: "prestations/cloison-placo-perpignan", emoji: "🧱", category: "cloisons", keywords: ["cloison placo perpignan", "pose de cloison perpignan", "plaquiste perpignan"] },
    { name: "Faux plafonds", slug: "prestations/faux-plafond-perpignan", emoji: "🏠", category: "plafonds", keywords: ["faux plafond perpignan", "plafond suspendu perpignan", "pose faux plafond placo"] },
    { name: "Isolation intérieure", slug: "prestations/isolation-interieure-perpignan", emoji: "🛡️", category: "isolation", keywords: ["isolation intérieure perpignan", "doublage mur perpignan", "isolation phonique perpignan"] },
    { name: "Aménagement de combles", slug: "prestations/amenagement-combles-perpignan", emoji: "🪜", category: "combles", keywords: ["aménagement combles perpignan", "isolation combles perpignan", "combles aménageables perpignan"] },
    { name: "Bandes et enduit", slug: "prestations/bandes-enduit-placo-perpignan", emoji: "🎨", category: "finitions", keywords: ["enduit placo perpignan", "bandes placo perpignan", "finition placo prêt à peindre"] },
  ],
  seo_keyword_patterns: ["plaquiste {ville}", "{service} {ville}", "placo {ville}"],
  brand: {
    personality:
      "Le plaquiste de Perpignan qui répond au téléphone, passe mesurer et explique ce qu'il pose — sérieux, concret, rassurant, jamais publicitaire",
    tone: "on parle en « nous » et on s'adresse à « vous » ; concret et précis sur les gestes et les matériaux (rails et montants, plaques standard / hydrofuge / haute dureté / phonique, laine minérale, bandes, enduit, ponçage), phrases courtes, lisible sur mobile. Ne jamais mettre en scène de personne nommée. Jamais « je ».",
    ctaStyle:
      "l'appel d'abord — « Appelez-nous » ; le devis en second (page contact). Déroulé : appel → visite et métré → devis écrit → chantier. Pas de réservation en ligne.",
    wordsToUse: ["plaques de plâtre", "ossature métallique", "cloison", "faux plafond", "doublage", "isolant", "bandes", "enduit", "prêt à peindre", "devis écrit", "visite sur place", "à Perpignan et alentours"],
    wordsToAvoid: ["gratuit", "24h/24", "7j/7", "sous 24h", "sous 48h", "garantie décennale", "certifié", "agréé", "RGE", "Qualibat", "ans d'expérience", "chantiers réalisés", "avis", "étoiles", "pas cher", "meilleur prix", "numéro 1", "le meilleur de Perpignan", "MaPrimeRénov", "prime", "€/m²"],
    experienceProof:
      "AUCUNE preuve vérifiée : marque du site, téléphone, adresse, SIRET, horaires, assurances, qualifications, ancienneté, avis, tarifs et zones réellement desservies restent À FOURNIR (docs/A-FOURNIR.md du site). N'inventer aucune preuve ni aucun prix.",
    uniqueSellingPoints: [
      "Cloisons, faux plafonds, isolation intérieure, combles et finitions chez les particuliers",
      "Une visite avec métré, puis un devis écrit avant tout chantier",
      "Chantier protégé et nettoyé, support livré prêt à peindre",
      "Artisan local à Perpignan, interventions dans l'agglomération",
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
  .select("site_key, name, delivery_mode, revalidate_url, domain, is_active")
  .eq("site_key", "plaquiste")
  .single();
console.log("site_profiles :", data);
