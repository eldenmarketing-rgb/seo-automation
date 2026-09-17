/**
 * Inscription du site Vitrier Perpignan (instance site-starter « Vitrier2026 »,
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
 *   npx tsx scripts/oneshot/register-vitrier.ts
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const envLocal = readFileSync("/home/ubuntu/sites/Vitrier2026/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans Vitrier2026/.env.local");

const row = {
  site_key: "vitrier",
  name: "Vitrier Perpignan", // placeholder : marque du site à fournir
  label: "Vitrier",
  color: "bg-cyan-800",
  is_active: true,
  scope: "local",
  mode: "local",
  niche:
    "Vitrier à Perpignan : remplacement de vitre cassée, dépannage et mise en sécurité après bris de glace, remplacement de double vitrage, vitrine de magasin, miroir sur mesure, verre sur mesure (paroi de douche, crédence, plateau, garde-corps) — pages de destination Google Ads + SEO local, rank & rent",
  geo_target:
    "Perpignan et agglomération (66) : Cabestany, Canet-en-Roussillon, Saint-Estève, Bompas, Saleilles, Toulouges, Le Soler, Argelès-sur-Mer",
  business: "Entreprise de vitrerie et de miroiterie",
  business_model: "lead-gen",
  target_audience:
    "Particuliers et commerçants de Perpignan et de l'agglomération avec un vitrage à remplacer vite (vitre cassée, effraction, tempête, double vitrage embué, vitrine brisée) ou un projet sur mesure (miroir, paroi de douche, crédence) ; recherche sur mobile, souvent en situation de casse, contact par téléphone",
  domain: null,
  gsc_domain: null,
  phone: null,
  email: null,
  address: null,
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "HomeAndConstructionBusiness",
  project_path: "/home/ubuntu/sites/Vitrier2026",
  production_branch: "main",
  delivery_mode: "cms",
  revalidate_url: null,
  revalidate_secret: secret,
  relevant_topics: [
    "vitrier", "vitrerie", "miroiterie", "vitre cassée", "vitre brisée", "bris de glace", "remplacement de vitre",
    "double vitrage", "double vitrage embué", "vitrage isolant", "simple vitrage", "survitrage", "vitrine", "vitrine cassée",
    "vitrage feuilleté", "verre trempé", "verre sécurit", "mise en sécurité", "fermeture provisoire", "effraction", "tempête",
    "miroir sur mesure", "miroir salle de bain", "verre sur mesure", "paroi de douche", "crédence en verre", "plateau en verre",
    "garde-corps en verre", "verrière", "porte vitrée", "baie vitrée", "velux", "fenêtre", "menuiserie", "parclose", "mastic", "joint de vitrage",
    "dépannage vitrier", "vitrier urgence", "vitrier perpignan", "assurance bris de glace",
  ],
  reject_topics: [
    "formation", "emploi", "salaire", "cap", "fiche métier", "tuto", "bricolage", "leroy merlin", "castorama",
    "brico dépôt", "lapeyre", "prix du verre au m²", "cours", "pare-brise", "vitrage automobile", "vitre de voiture",
    "vitrail", "art verrier", "soufflage de verre", "fenêtre pvc complète", "menuisier", "volet roulant", "store",
    "film solaire", "nettoyage de vitres", "laveur de vitres", "aquarium",
  ],
  triage_instructions:
    "GARDER : toute requête de remplacement, dépannage ou pose de vitrage chez un particulier ou un commerçant (vitre cassée, bris de glace, mise en sécurité, double vitrage embué ou cassé, vitrage isolant sur menuiserie existante, vitrine, miroir sur mesure, paroi de douche, crédence, plateau, garde-corps, verrière, porte ou baie vitrée), avec ou sans lieu du 66, et les requêtes prix / tarif / devis / urgence / assurance associées. REJETER : formation, emploi, salaire, bricolage et tutoriels, achat de verre ou de fenêtres en magasin (Leroy Merlin, Castorama, Lapeyre), vitrage automobile et pare-brise, vitrail et art verrier, remplacement complet de fenêtres et volets (menuisier), films solaires, nettoyage de vitres, requêtes hors 66 sans intention locale.",
  services: [
    { name: "Vitre cassée", slug: "prestations/remplacement-vitre-cassee-perpignan", emoji: "🪟", category: "remplacement", keywords: ["vitre cassée perpignan", "remplacement vitre perpignan", "changer une vitre perpignan"] },
    { name: "Dépannage vitrier", slug: "prestations/depannage-vitrier-perpignan", emoji: "🚨", category: "depannage", keywords: ["vitrier dépannage perpignan", "vitrier urgence perpignan", "bris de glace perpignan"] },
    { name: "Double vitrage", slug: "prestations/remplacement-double-vitrage-perpignan", emoji: "🧊", category: "double-vitrage", keywords: ["remplacement double vitrage perpignan", "double vitrage embué perpignan", "double vitrage perpignan"] },
    { name: "Vitrine de magasin", slug: "prestations/vitrine-magasin-perpignan", emoji: "🏪", category: "vitrine", keywords: ["vitrine magasin perpignan", "vitrine cassée perpignan", "remplacement vitrine perpignan"] },
    { name: "Miroir sur mesure", slug: "prestations/miroir-sur-mesure-perpignan", emoji: "🪞", category: "miroiterie", keywords: ["miroir sur mesure perpignan", "miroiterie perpignan", "miroir salle de bain sur mesure perpignan"] },
    { name: "Verre sur mesure", slug: "prestations/verre-sur-mesure-perpignan", emoji: "📐", category: "sur-mesure", keywords: ["verre sur mesure perpignan", "paroi de douche sur mesure perpignan", "crédence en verre perpignan"] },
  ],
  seo_keyword_patterns: ["vitrier {ville}", "{service} {ville}", "dépannage vitrier {ville}"],
  brand: {
    personality:
      "Le vitrier de Perpignan qui répond au téléphone, donne un créneau, explique quel verre convient et annonce le prix avant de poser — calme, précis, rassurant après une casse, jamais publicitaire ni alarmiste",
    tone: "on parle en « nous » et on s'adresse à « vous » ; concret et précis sur les verres et les gestes (feuilleté, trempé, vitrage isolant, épaisseur, feuillure, parclose, joint, calage, mise en sécurité, relevé des cotes), phrases courtes, lisible sur mobile par quelqu'un qui vient de casser une vitre. Ne jamais mettre en scène de personne nommée. Jamais « je ».",
    ctaStyle:
      "l'appel d'abord — « Appelez-nous » ; le contact écrit en second. Déroulé : appel → créneau → relevé des cotes sur place → prix annoncé → pose (mise en sécurité d'abord si le vitrage doit être commandé ; devis écrit pour une vitrine, un double vitrage ou du sur-mesure). Pas de réservation en ligne.",
    wordsToUse: ["vitrage", "verre feuilleté", "verre trempé", "double vitrage", "épaisseur", "feuillure", "parclose", "joint", "relevé des cotes", "mise en sécurité", "prix annoncé avant", "devis écrit", "créneau", "facture pour votre assurance", "à Perpignan et alentours"],
    wordsToAvoid: ["gratuit", "24h/24", "7j/7", "sous 30 min", "sous 1h", "en moins de", "urgence 24/7", "agréé assurances", "prise en charge assurance", "franchise offerte", "garantie décennale", "certifié", "Qualibat", "RGE", "ans d'expérience", "interventions réalisées", "avis", "étoiles", "pas cher", "meilleur prix", "numéro 1", "le meilleur de Perpignan", "€", "au m²", "forfait", "en stock"],
    experienceProof:
      "AUCUNE preuve vérifiée : marque du site, téléphone, adresse, SIRET, horaires (et disponibilité soir / week-end), assurances, qualifications, ancienneté, avis, tarifs, stock de verre et zones réellement desservies restent À FOURNIR (docs/A-FOURNIR.md du site). N'inventer aucune preuve, aucun prix, aucun délai d'intervention ni de commande.",
    uniqueSellingPoints: [
      "Vitre cassée, dépannage et mise en sécurité, double vitrage, vitrine, miroir et verre sur mesure chez les particuliers et les commerçants",
      "Un créneau fixé à l'appel, les cotes relevées sur place par la personne qui pose, le prix annoncé avant de poser",
      "Le verre adapté à l'usage (feuilleté, trempé, isolant, dépoli), expliqué et non imposé",
      "Vitrier local à Perpignan, interventions dans l'agglomération",
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
  .eq("site_key", "vitrier")
  .single();
console.log("site_profiles :", data);
