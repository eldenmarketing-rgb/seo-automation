/**
 * Inscription du site Plombier Perpignan (instance site-starter « Plomberie_perpignan »,
 * pages de destination Google Ads + SEO local, rank & rent) dans site_profiles — étape 1 de
 * docs/NOUVEAU-SITE.md du template.
 * Idempotent : upsert sur site_key. Le secret de revalidation est lu dans
 * le .env.local du site (jamais écrit ici).
 *
 * `domain` reste vide tant que le nom de domaine n'est pas choisi : le crawl
 * du lundi ne cible que les sites actifs AVEC domaine, le site noindex ne
 * polluera donc ni /indexation ni le backlog. À renseigner avec
 * `revalidate_url` dès que le domaine existe (page /sites du dashboard).
 *
 *   npx tsx scripts/oneshot/register-plomberie.ts
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const envLocal = readFileSync("/home/ubuntu/sites/Plomberie_perpignan/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans Plomberie_perpignan/.env.local");

const row = {
  site_key: "plomberie",
  name: "Plombier Perpignan", // placeholder : marque du site à fournir
  label: "Plombier",
  color: "bg-blue-700",
  is_active: true,
  scope: "local",
  mode: "local",
  niche:
    "Plombier à Perpignan : recherche de fuite, débouchage de canalisation, réparation de fuite d'eau, dépannage et remplacement de chauffe-eau, WC et chasse d'eau, installation sanitaire, rénovation de plomberie — pages de destination Google Ads + SEO local, rank & rent",
  geo_target:
    "Perpignan et agglomération (66) : Cabestany, Canet-en-Roussillon, Saint-Estève, Bompas, Saleilles, Toulouges, Pollestres, Saint-Cyprien",
  business: "Entreprise de plomberie et de dépannage sanitaire",
  business_model: "lead-gen",
  target_audience:
    "Particuliers de Perpignan et de l'agglomération avec un problème de plomberie à régler vite : fuite d'eau, canalisation ou WC bouchés, plus d'eau chaude, robinet ou WC à remplacer ; recherche sur mobile en situation d'urgence ou de gêne, contact par téléphone",
  domain: null,
  gsc_domain: null,
  phone: null,
  email: null,
  address: null,
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "Plumber",
  project_path: "/home/ubuntu/sites/Plomberie_perpignan",
  production_branch: "main",
  delivery_mode: "cms",
  revalidate_url: null,
  revalidate_secret: secret,
  relevant_topics: [
    "plombier", "plomberie", "fuite d'eau", "recherche de fuite", "fuite invisible", "dégât des eaux",
    "débouchage", "canalisation bouchée", "évier bouché", "douche bouchée", "wc bouché", "chasse d'eau",
    "chauffe-eau", "ballon d'eau chaude", "cumulus", "groupe de sécurité", "robinet", "mitigeur", "flexible",
    "siphon", "installation sanitaire", "lavabo", "douche", "lave-linge", "rénovation plomberie", "rénovation salle de bain", "remplacement canalisations", "plomb", "galvanisé", "dépannage plomberie", "plombier perpignan",
  ],
  reject_topics: [
    "formation", "emploi", "salaire", "cap", "bts", "fiche métier", "tuto", "bricolage", "leroy merlin", "castorama",
    "brico dépôt", "point p", "cedeo", "prix des pièces", "cours", "chaudière gaz", "climatisation", "pompe à chaleur",
    "piscine", "plombier chauffagiste", "assainissement collectif", "fosse septique", "camion hydrocureur",
  ],
  triage_instructions:
    "GARDER : toute requête de dépannage ou d'installation de plomberie sanitaire chez un particulier (fuite, recherche de fuite, débouchage, WC, chasse d'eau, chauffe-eau / ballon / cumulus, robinetterie, lavabo, douche, raccordement d'appareils, rénovation de la plomberie d'une salle de bain ou d'une cuisine, remplacement de canalisations), avec ou sans lieu du 66, et les requêtes prix / tarif / devis / urgence associées. REJETER : formation, emploi, salaire, bricolage et tutoriels, achat de pièces et matériaux (Leroy Merlin, Castorama, Cedeo, Point P), chaudière gaz et chauffage central, climatisation, pompe à chaleur, piscine, assainissement et fosses (camion hydrocureur), requêtes hors 66 sans intention locale.",
  services: [
    { name: "Recherche de fuite", slug: "prestations/recherche-de-fuite-perpignan", emoji: "🔍", category: "fuites", keywords: ["recherche de fuite perpignan", "fuite d'eau invisible perpignan", "détection fuite perpignan"] },
    { name: "Débouchage canalisation", slug: "prestations/debouchage-canalisation-perpignan", emoji: "🌀", category: "debouchage", keywords: ["débouchage canalisation perpignan", "évier bouché perpignan", "débouchage perpignan"] },
    { name: "Réparation fuite d'eau", slug: "prestations/reparation-fuite-eau-perpignan", emoji: "💧", category: "fuites", keywords: ["réparation fuite d'eau perpignan", "fuite robinet perpignan", "plombier fuite perpignan"] },
    { name: "Dépannage chauffe-eau", slug: "prestations/depannage-chauffe-eau-perpignan", emoji: "🔥", category: "chauffe-eau", keywords: ["dépannage chauffe-eau perpignan", "remplacement chauffe-eau perpignan", "ballon d'eau chaude perpignan"] },
    { name: "Dépannage WC", slug: "prestations/depannage-wc-perpignan", emoji: "🚽", category: "wc", keywords: ["wc bouché perpignan", "chasse d'eau qui fuit perpignan", "réparation wc perpignan"] },
    { name: "Installation sanitaire", slug: "prestations/installation-sanitaire-perpignan", emoji: "🚿", category: "installation", keywords: ["installation sanitaire perpignan", "remplacement robinet perpignan", "pose lavabo douche perpignan"] },
    { name: "Rénovation plomberie", slug: "prestations/renovation-plomberie-perpignan", emoji: "🛠️", category: "renovation", keywords: ["rénovation plomberie perpignan", "plomberie salle de bain perpignan", "remplacement canalisations perpignan"] },
  ],
  seo_keyword_patterns: ["plombier {ville}", "{service} {ville}", "dépannage plomberie {ville}"],
  brand: {
    personality:
      "Le plombier de Perpignan qui répond au téléphone, donne un créneau, explique la panne et annonce le tarif avant d'intervenir — calme, concret, rassurant dans l'urgence, jamais publicitaire ni alarmiste",
    tone: "on parle en « nous » et on s'adresse à « vous » ; concret et précis sur les gestes et les pièces (robinet d'arrêt, groupe de sécurité, résistance, thermostat, mécanisme de chasse, flexible, cartouche de mitigeur, siphon, furet, hydrocurage), phrases courtes, lisible sur mobile par quelqu'un qui a les pieds dans l'eau. Ne jamais mettre en scène de personne nommée. Jamais « je ».",
    ctaStyle:
      "l'appel d'abord — « Appelez-nous » ; le contact écrit en second. Déroulé : appel → créneau → diagnostic sur place → tarif annoncé → intervention (devis écrit pour une installation ou un remplacement). Pas de réservation en ligne.",
    wordsToUse: ["fuite", "robinet d'arrêt", "canalisation", "évacuation", "chauffe-eau", "ballon", "groupe de sécurité", "mécanisme de chasse", "raccord", "joint", "diagnostic", "tarif annoncé avant", "devis écrit", "créneau", "à Perpignan et alentours"],
    wordsToAvoid: ["gratuit", "24h/24", "7j/7", "sous 30 min", "sous 1h", "en moins de", "urgence 24/7", "garantie décennale", "certifié", "agréé", "RGE", "Qualibat", "PG", "ans d'expérience", "interventions réalisées", "avis", "étoiles", "pas cher", "meilleur prix", "numéro 1", "le meilleur de Perpignan", "€", "forfait", "taux horaire"],
    experienceProof:
      "AUCUNE preuve vérifiée : marque du site, téléphone, adresse, SIRET, horaires (et disponibilité soir / week-end), assurances, qualifications, ancienneté, avis, tarifs et zones réellement desservies restent À FOURNIR (docs/A-FOURNIR.md du site). N'inventer aucune preuve, aucun prix, aucun délai d'intervention.",
    uniqueSellingPoints: [
      "Recherche de fuite, débouchage, réparation de fuite, chauffe-eau, WC, installation sanitaire et rénovation de plomberie chez les particuliers",
      "Un créneau fixé à l'appel, le diagnostic expliqué et le tarif annoncé avant d'intervenir",
      "La cause traitée, pas seulement le symptôme : pièce en cause remplacée, conseils pour éviter la récidive",
      "Plombier local à Perpignan, interventions dans l'agglomération",
    ],
  },
  enabled_intents: ["service", "prix", "faq"],
  content_rules: { language: "fr", minWordCount: 800, maxWordCount: 1500, seoSectionCount: 5, faqCount: 5, includeUpdatedDate: true },
  cocooning: { pillarPages: ["prestations"], clusterDepth: 1, maxInternalLinks: 4 },
};

const sb = getSupabase();
const { error } = await sb.from("site_profiles").upsert(row, { onConflict: "site_key" });
if (error) throw error;
const { data } = await sb
  .from("site_profiles")
  .select("site_key, name, delivery_mode, revalidate_url, domain, is_active, schema_type")
  .eq("site_key", "plomberie")
  .single();
console.log("site_profiles :", data);
