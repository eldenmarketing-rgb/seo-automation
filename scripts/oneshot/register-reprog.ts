/**
 * Inscription du site Reprog Formation (instance site-starter « Formation-reprog »,
 * formation reprogrammation moteur, national, génération de contacts) dans
 * site_profiles — étape 1 de docs/NOUVEAU-SITE.md du template. Le profil `reprog`
 * existait (avril 2026, inactif) : cet upsert le complète et l'active.
 * Idempotent : upsert sur site_key. Le secret de revalidation est lu dans le
 * .env.local du site (jamais écrit ici).
 *
 * `revalidate_url` reste vide tant que le site n'est pas sur Vercel ; le crawl
 * du lundi cible le domaine (parking OVH pour l'instant, 000 en HTTPS) — à
 * renseigner dès l'import Vercel (page /sites du dashboard).
 *
 *   npx tsx scripts/oneshot/register-reprog.ts
 */
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const envLocal = readFileSync("/home/ubuntu/sites/Formation-reprog/.env.local", "utf8");
const secret = envLocal.match(/^REVALIDATE_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("REVALIDATE_SECRET introuvable dans Formation-reprog/.env.local");

const row = {
  site_key: "reprog",
  name: "Reprog Formation",
  label: "Reprog",
  color: "bg-cyan-500",
  is_active: true,
  scope: "national",
  mode: "thematic",
  niche:
    "Formation à la reprogrammation moteur automobile (calculateur, OBD/bench/boot, cartographies essence, diesel, E85, banc) — site national de génération de contacts (appel / formulaire), aucune vente en ligne",
  geo_target: "France entière",
  business: "Formation à la reprogrammation moteur",
  business_model: "lead-gen",
  target_audience:
    "Mécaniciens, garagistes et passionnés ayant des bases en mécanique et électronique automobile, qui veulent proposer la reprogrammation à leurs clients ou s'installer comme reprogrammateur ; cherchent une formation, son prix, son format, son financement, le matériel et les débouchés",
  domain: "https://formation-reprogrammation-moteur.fr",
  gsc_domain: null,
  phone: null,
  email: "contact@formation-reprogrammation-moteur.fr",
  address: null,
  postal_code: "66000",
  city: "Perpignan",
  schema_type: "ProfessionalService",
  project_path: "/home/ubuntu/sites/Formation-reprog",
  production_branch: "main",
  delivery_mode: "cms",
  revalidate_url: null,
  revalidate_secret: secret,
  relevant_topics: [
    "formation reprogrammation moteur", "devenir reprogrammateur", "cartographie moteur", "calculateur moteur",
    "ECU", "OBD", "bench", "boot", "checksum", "stage 1", "stage 2", "éthanol E85", "flexfuel", "banc de puissance",
    "Alientech", "KESS3", "Autotuner", "WinOLS", "ECM Titanium", "FAP", "EGR", "AdBlue", "préparation moteur",
    "légalité reprogrammation", "assurance reprogrammation", "homologation", "prix reprogrammation", "CPF", "OPCO",
  ],
  reject_topics: [
    "vidange", "freins", "pneus", "contrôle technique pas cher", "voiture occasion", "reprogrammation clé",
    "reprogrammation télécommande", "reprogrammation boîte de vitesse seule", "moto cross", "jeux vidéo",
  ],
  triage_instructions:
    "Site NATIONAL de formation à la reprogrammation moteur. GARDER : formation / cours / apprendre / devenir / métier / salaire du reprogrammateur ; outils et logiciels (Alientech, KESS, Autotuner, WinOLS, ECM Titanium, OBD, bench, boot, checksum) ; cartographie et calculateur ; éthanol E85 / flexfuel ; légalité, assurance, homologation, garantie ; prix d'une reprogrammation ; stage 1/2/3 génériques ; banc de puissance ; FAP / EGR / AdBlue côté cartographie. REJETER : marques de préparateurs (Shiftech, BR Performance, Digiservices, BHD, O2, Ziptuning…), requêtes « marque + modèle » (reprogrammation golf 7, kuga 150…), requêtes avec une ville ou « autour de moi » (intention locale = praticien, pas formation), clés et télécommandes, mécanique générale (vidange, freins = site garage).",
  services: [
    { name: "Programme de la formation", slug: "formation/programme", emoji: "📘", category: "formation", keywords: ["formation reprogrammation moteur", "reprogrammation moteur formation", "formation reprogrammation automobile"] },
    { name: "Formation en ligne", slug: "formation/en-ligne", emoji: "💻", category: "formation", keywords: ["formation reprogrammation moteur en ligne", "formation reprogrammation moteur à distance"] },
    { name: "Prix de la formation", slug: "formation/prix", emoji: "💶", category: "formation", keywords: ["prix formation reprogrammation moteur", "formation reprogrammation moteur tarif"] },
    { name: "CPF et financements", slug: "formation/cpf", emoji: "🧾", category: "formation", keywords: ["formation reprogrammation moteur cpf"] },
    { name: "Formation cartographie moteur", slug: "formation/cartographie-moteur", emoji: "🗺️", category: "formation", keywords: ["formation cartographie moteur", "formation reprogrammation calculateur automobile", "cours reprogrammation calculateur automobile"] },
    { name: "Formation éthanol E85", slug: "formation/ethanol-e85", emoji: "🌱", category: "formation", keywords: ["formation reprogrammation ethanol", "formation reprogrammation moteur éthanol"] },
    { name: "Outils de reprogrammation", slug: "formation/outils", emoji: "🔧", category: "formation", keywords: ["formation reprogrammation moteur alientech", "cours reprogrammation winols", "outil reprogrammation moteur"] },
  ],
  seo_keyword_patterns: ["formation {sujet}", "{sujet} formation", "devenir {métier}", "cours {sujet}"],
  brand: {
    personality:
      "Le formateur qui parle comme à l'atelier : précis sur la technique, honnête sur les limites (mécaniques, légales, financières), jamais vendeur de rêve — ni « gains garantis », ni « devenez riche »",
    tone: "on parle en « nous » et on s'adresse à « vous » ; vocabulaire du métier (calculateur, cartographie, OBD, bench, boot, checksum, injection, avance, pression de suralimentation, limiteurs), phrases courtes, exemples concrets de fichiers et de moteurs. Ne jamais mettre en scène de formateur nommé. Jamais « je ». Aucun chiffre de puissance ou de gain présenté comme garanti.",
    ctaStyle:
      "l'appel d'abord — « Appeler pour un entretien d'orientation » ; « Recevoir le programme » en second (page contact, WhatsApp pré-rempli). Déroulé : appel → entretien (niveau, projet, format) → programme et modalités envoyés. Aucune vente en ligne, aucun prix affiché.",
    wordsToUse: ["calculateur", "cartographie", "lecture et écriture", "OBD, bench, boot", "checksum", "fichier d'origine", "essai et validation", "banc de puissance", "cas réels", "cadre légal", "entretien d'orientation", "programme complet"],
    wordsToAvoid: ["CPF" /* sauf pour dire que non */, "éligible CPF", "Qualiopi", "certifié", "certification reconnue", "diplôme", "organisme de formation", "garanti", "sans risque", "ans d'expérience", "stagiaires formés", "avis", "étoiles", "pas cher", "meilleure formation", "numéro 1", "accès à vie", "à partir de", "€"],
    experienceProof:
      "AUCUNE preuve vérifiée : ni formateur, ni atelier, ni nombre de stagiaires, ni durée, ni prix, ni format définitif (docs/A-FOURNIR.md du site). La formation est en construction : le site présente le contenu du métier et invite à appeler pour recevoir le programme. N'inventer aucune preuve, aucun tarif, aucune durée, aucune certification. Les fourchettes de prix du MARCHÉ (formations concurrentes 400-4 000 €, matériel 8 000-12 000 €, prestation reprog facturée 400-800 €) peuvent être citées comme repères du marché, jamais comme nos tarifs.",
    uniqueSellingPoints: [
      "Le programme couvre le métier complet : calculateur, OBD / bench / boot, cartographies essence, diesel et E85, validation au banc, cadre légal",
      "Apprentissage sur des fichiers de calculateurs réels, pas sur des diapositives",
      "Un entretien d'orientation avant toute inscription : niveau, projet, format — on dit non si la formation ne convient pas",
      "Le cadre légal (assurance, homologation, garantie constructeur) enseigné comme un module à part entière",
    ],
  },
  enabled_intents: ["guide", "prix", "faq", "comparatif"],
  content_rules: { language: "fr", minWordCount: 1300, maxWordCount: 2200, seoSectionCount: 6, faqCount: 6, includeUpdatedDate: true },
  cocooning: { pillarPages: ["formation"], clusterDepth: 2, maxInternalLinks: 6 },
  description_short: "Formation à la reprogrammation moteur : calculateur, OBD / bench / boot, cartographies essence, diesel et E85, banc de puissance. Programme sur demande, France entière.",
  description_long: "Reprog Formation forme les mécaniciens, garagistes et passionnés à la reprogrammation moteur : fonctionnement du calculateur, lecture et écriture en OBD, bench et boot, interprétation et modification des cartographies (injection, avance, suralimentation, couple, limiteurs), conversion éthanol E85, validation au banc de puissance et cadre légal (assurance, homologation, garantie constructeur). Un entretien d'orientation précède toute inscription. Programme et modalités communiqués sur demande, France entière.",
};

const sb = getSupabase();
const { error } = await sb.from("site_profiles").upsert(row, { onConflict: "site_key" });
if (error) throw error;
const { data } = await sb
  .from("site_profiles")
  .select("site_key, name, delivery_mode, revalidate_url, domain, is_active, mode, scope")
  .eq("site_key", "reprog")
  .single();
console.log("site_profiles :", data);
