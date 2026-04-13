/**
 * Site Mode Registry
 * 
 * Central registry of SiteModeConfig for each site.
 * This is where you configure mode, brand voice, intents, and content strategy per site.
 * 
 * To add a new site:
 * 1. Add an entry to config/sites.ts (domain, services, phone, etc.)
 * 2. Add a SiteModeConfig here with mode, brand, intents
 * 3. The system generates pages automatically
 */

import { SiteModeConfig } from './site-modes.js';

const registry: Record<string, SiteModeConfig> = {

  // ═══════════════════════════════════════════════════════════
  // MODE LOCAL — Artisans & services de proximité
  // ═══════════════════════════════════════════════════════════

  garage: {
    mode: 'local',
    brand: {
      tone: 'professionnel, rassurant et accessible — on parle comme un vrai garagiste de confiance, pas comme une pub',
      personality: 'Le garagiste du quartier qui explique clairement, sans jargon inutile, et qui ne pousse pas à la vente',
      wordsToUse: ['diagnostic', 'intervention', 'transparence', 'proximité', 'pièces d\'origine', 'rendez-vous', 'devis gratuit'],
      wordsToAvoid: ['pas cher', 'discount', 'le meilleur', 'numéro 1', 'révolutionnaire', 'incroyable', 'unique'],
      ctaStyle: 'appel direct — "Appelez-nous au" / "Prenez rendez-vous par téléphone"',
      uniqueSellingPoints: [
        'Diagnostic gratuit avant toute intervention',
        'Devis détaillé et transparent — pas de surprise à la facturation',
        'Pièces de qualité équivalente constructeur',
        'Prise en charge rapide sans rendez-vous pour les urgences',
      ],
      experienceProof: 'Plus de 15 ans d\'expérience en mécanique automobile toutes marques',
    },
    enabledIntents: ['service', 'prix', 'faq'],  // Stratégie V2 : pages service-perpignan, plus de city_hub
    content: {
      minWordCount: 1200,
      maxWordCount: 2500,
      seoSectionCount: 5,
      faqCount: 6,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: ['garage-automobile'],
      clusterDepth: 2,
      maxInternalLinks: 5,
    },
  },

  carrosserie: {
    mode: 'local',
    brand: {
      tone: 'expert et méticuleux — on parle avec la précision d\'un artisan qui aime le travail bien fait',
      personality: 'Le carrossier passionné qui voit chaque véhicule comme un défi technique à relever avec précision',
      wordsToUse: ['réparation', 'remise en état', 'finition', 'peinture', 'débosselage', 'expertise', 'devis assurance'],
      wordsToAvoid: ['pas cher', 'discount', 'bradé', 'le meilleur', 'miracle', 'magique'],
      ctaStyle: 'appel direct pour devis — "Envoyez-nous une photo ou appelez pour un devis gratuit"',
      uniqueSellingPoints: [
        'Expertise en débosselage sans peinture (PDR)',
        'Gestion directe avec les assurances — on s\'occupe de tout',
        'Cabine de peinture dernière génération',
        'Véhicule de courtoisie disponible',
      ],
      experienceProof: 'Carrossier certifié avec plus de 2000 véhicules réparés',
    },
    enabledIntents: ['service', 'prix', 'avis'],  // Stratégie V2 : pages service-perpignan, plus de city_hub
    content: {
      minWordCount: 1200,
      maxWordCount: 2500,
      seoSectionCount: 5,
      faqCount: 6,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: ['carrosserie-automobile'],
      clusterDepth: 2,
      maxInternalLinks: 5,
    },
  },

  massage: {
    mode: 'local',
    brand: {
      tone: 'chaleureux, bienveillant et professionnel — inspirant confiance et sérénité',
      personality: 'Un praticien attentionné qui écoute avant de proposer, et qui adapte chaque séance à la personne',
      wordsToUse: ['bien-être', 'détente', 'soulagement', 'séance personnalisée', 'à domicile', 'relaxation', 'écoute'],
      wordsToAvoid: ['médical', 'guérir', 'soigner', 'thérapie', 'pas cher', 'promo'],
      ctaStyle: 'appel direct — "Réservez votre séance par téléphone"',
      uniqueSellingPoints: [
        'Massage à domicile — on se déplace chez vous avec tout le matériel',
        'Séance 100% personnalisée après échange sur vos besoins',
        'Plusieurs techniques maîtrisées (suédois, californien, sportif)',
        'Disponible en soirée et le week-end',
      ],
      experienceProof: 'Praticien certifié avec plus de 3000 séances réalisées',
    },
    enabledIntents: ['city_hub', 'service', 'prix'],
    content: {
      minWordCount: 1000,
      maxWordCount: 2000,
      seoSectionCount: 5,
      faqCount: 6,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: ['perpignan', 'massage-domicile'],
      clusterDepth: 1,
      maxInternalLinks: 4,
    },
  },

  vtc: {
    mode: 'local',
    brand: {
      tone: 'courtois et fiable — le chauffeur privé sur qui on peut compter, de jour comme de nuit',
      personality: 'Un chauffeur ponctuel, discret et professionnel qui connaît parfaitement la région',
      wordsToUse: ['chauffeur privé', 'transfert', 'ponctualité', 'confort', 'réservation', 'trajet', 'aéroport'],
      wordsToAvoid: ['taxi', 'uber', 'pas cher', 'discount', 'low cost', 'covoiturage'],
      ctaStyle: 'appel direct ou réservation — "Réservez votre chauffeur au"',
      uniqueSellingPoints: [
        'Véhicules haut de gamme climatisés',
        'Disponible 24h/24, 7j/7 — transferts aéroport nuit comprise',
        'Prix fixé à l\'avance, pas de compteur, pas de surprise',
        'Connaissance parfaite des Pyrénées-Orientales et de la région',
      ],
      experienceProof: 'Plus de 10 000 courses réalisées avec une note moyenne de 4.9/5',
    },
    enabledIntents: ['city_hub', 'service', 'prix', 'urgence'],
    content: {
      minWordCount: 1000,
      maxWordCount: 2000,
      seoSectionCount: 5,
      faqCount: 6,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: ['perpignan', 'vtc-aeroport'],
      clusterDepth: 1,
      maxInternalLinks: 4,
    },
  },

  voitures: {
    mode: 'product',
    brand: {
      tone: 'direct et honnête — on parle comme un vendeur transparent qui n\'a rien à cacher',
      personality: 'Le vendeur qui montre les défauts comme les qualités, et qui gagne la confiance par la transparence',
      wordsToUse: ['occasion', 'garantie', 'contrôle technique', 'historique', 'reprise', 'financement', 'essai'],
      wordsToAvoid: ['pas cher', 'affaire du siècle', 'occasion en or', 'dernier prix', 'à saisir', 'urgent'],
      ctaStyle: 'appel direct — "Appelez pour un essai" / "Venez voir le véhicule"',
      uniqueSellingPoints: [
        'Chaque véhicule passe un contrôle en 120 points avant mise en vente',
        'Historique complet et transparent — carnet d\'entretien disponible',
        'Garantie mécanique incluse sur tous les véhicules',
        'Reprise de votre ancien véhicule possible',
      ],
      experienceProof: 'Plus de 500 véhicules vendus avec un taux de satisfaction de 97%',
    },
    enabledIntents: ['product_page', 'category', 'comparatif', 'avis'],
    product: {
      productType: 'véhicule d\'occasion',
      variants: [], // Filled dynamically from vehicles table
      schemaType: 'Vehicle',
    },
    content: {
      minWordCount: 800,
      maxWordCount: 1500,
      seoSectionCount: 4,
      faqCount: 5,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: ['vehicules-occasion', 'catalogue'],
      clusterDepth: 1,
      maxInternalLinks: 4,
    },
  },

  restaurant: {
    mode: 'local',
    brand: {
      tone: 'convivial et gourmand — on donne envie de venir manger avec des mots qui mettent l\'eau à la bouche',
      personality: 'Le restaurateur passionné qui aime partager sa cuisine et faire découvrir ses créations',
      wordsToUse: ['fait maison', 'produits frais', 'saison', 'terroir', 'carte', 'réservation', 'accueil'],
      wordsToAvoid: ['pas cher', 'discount', 'fast food', 'rapide', 'industriel', 'surgelé'],
      ctaStyle: 'appel direct — "Réservez votre table au"',
      uniqueSellingPoints: [
        'Cuisine 100% fait maison avec des produits locaux de saison',
        'Cadre chaleureux en cœur de ville',
        'Menu qui change chaque semaine selon les arrivages',
        'Terrasse ouverte aux beaux jours',
      ],
      experienceProof: 'Restaurant familial depuis plus de 10 ans, noté 4.5/5 sur Google',
    },
    enabledIntents: ['city_hub', 'service'],
    content: {
      minWordCount: 800,
      maxWordCount: 1500,
      seoSectionCount: 4,
      faqCount: 5,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: ['perpignan', 'carte-menu'],
      clusterDepth: 1,
      maxInternalLinks: 3,
    },
  },

  // ═══════════════════════════════════════════════════════════
  // MODE THÉMATIQUE — Formation, guides, autorité
  // ═══════════════════════════════════════════════════════════

  // EXEMPLE : Site de formation reprogrammation moteur
  // Décommente et adapte quand tu lances le site
  /*
  reprog: {
    mode: 'thematic',
    brand: {
      tone: 'expert technique et pédagogue — le formateur qui vulgarise sans simplifier',
      personality: 'Un préparateur moteur expérimenté qui partage ses connaissances avec rigueur et passion',
      wordsToUse: ['reprogrammation', 'cartographie', 'puissance', 'couple', 'OBD', 'ECU', 'banc de puissance', 'stage'],
      wordsToAvoid: ['illégal', 'triche', 'hack', 'crack', 'pas cher', 'miracle', 'arnaque'],
      ctaStyle: 'appel direct — "Appelez pour réserver votre formation" / "Contactez-nous pour le programme complet"',
      uniqueSellingPoints: [
        'Formation pratique sur banc de puissance — pas que de la théorie',
        'Formateur avec plus de 10 ans d\'expérience en préparation moteur',
        'Certification délivrée en fin de formation',
        'Support post-formation inclus pendant 6 mois',
        'Groupes limités à 6 personnes pour un suivi personnalisé',
      ],
      experienceProof: 'Plus de 500 stagiaires formés et plus de 3000 cartographies réalisées',
    },
    enabledIntents: ['formation', 'guide', 'prix', 'comparatif', 'faq', 'avis'],
    thematic: {
      topics: [
        {
          slug: 'reprogrammation-stage-1',
          name: 'Reprogrammation moteur Stage 1',
          keywords: ['reprogrammation stage 1', 'gain puissance stage 1', 'reprog stage 1 prix', 'stage 1 diesel', 'stage 1 essence'],
          difficulty: 'medium',
        },
        {
          slug: 'reprogrammation-stage-2',
          name: 'Reprogrammation moteur Stage 2',
          keywords: ['reprogrammation stage 2', 'stage 2 turbo', 'downpipe stage 2', 'stage 2 hybride turbo'],
          parentTopic: 'reprogrammation-stage-1',
          difficulty: 'hard',
        },
        {
          slug: 'reprogrammation-ethanol-e85',
          name: 'Reprogrammation Éthanol E85',
          keywords: ['reprogrammation e85', 'conversion ethanol', 'flexfuel reprog', 'e85 sans boitier'],
          difficulty: 'medium',
        },
        {
          slug: 'suppression-fap-egr',
          name: 'Suppression FAP et EGR',
          keywords: ['suppression fap', 'suppression egr', 'vanne egr reprogrammation', 'fap off'],
          difficulty: 'hard',
        },
        {
          slug: 'outils-reprogrammation',
          name: 'Outils de reprogrammation moteur',
          keywords: ['outil reprogrammation', 'interface obd reprog', 'ktag', 'kess v2', 'autotuner', 'alientech'],
          difficulty: 'easy',
        },
        {
          slug: 'lecture-cartographie-moteur',
          name: 'Lecture de cartographie moteur',
          keywords: ['lecture cartographie', 'lire ecu', 'winols', 'ecm titanium', 'fichier map'],
          parentTopic: 'outils-reprogrammation',
          difficulty: 'medium',
        },
        {
          slug: 'banc-puissance',
          name: 'Passage au banc de puissance',
          keywords: ['banc puissance', 'dyno', 'mesure puissance moteur', 'banc 2 roues motrices', 'banc 4 roues motrices'],
          difficulty: 'easy',
        },
      ],
      intents: ['formation', 'guide', 'prix', 'comparatif', 'faq'],
      authority: {
        expertise: 'Préparateur moteur certifié avec plus de 10 ans d\'expérience',
        certifications: ['Certifié ALIENTECH', 'Master ECUTEK', 'Partenaire AUTOTUNER'],
        socialProof: 'Plus de 500 stagiaires formés, plus de 3000 cartographies réalisées',
      },
      targetAudience: 'Mécaniciens indépendants, passionnés automobile et entrepreneurs souhaitant se spécialiser en préparation moteur',
      contentDepth: 'expert',
    },
    content: {
      minWordCount: 1500,
      maxWordCount: 3000,
      seoSectionCount: 6,
      faqCount: 8,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: ['reprogrammation-stage-1', 'outils-reprogrammation', 'formation-reprogrammation'],
      clusterDepth: 2,
      maxInternalLinks: 6,
    },
  },
  */
};

/**
 * Get the mode config for a site.
 * Falls back to a sensible default if not registered.
 */
export function getSiteModeConfig(siteKey: string): SiteModeConfig {
  const config = registry[siteKey];
  if (config) return config;

  // Default: local mode with basic settings
  console.warn(`No mode config for "${siteKey}" — using default local config`);
  return {
    mode: 'local',
    brand: {
      tone: 'professionnel et accessible',
      personality: 'Un professionnel de confiance qui explique clairement',
      wordsToUse: ['qualité', 'proximité', 'expertise', 'confiance'],
      wordsToAvoid: ['pas cher', 'discount', 'le meilleur', 'numéro 1'],
      ctaStyle: 'appel direct',
      uniqueSellingPoints: ['Service de qualité', 'Proximité', 'Transparence'],
      experienceProof: 'Professionnel expérimenté',
    },
    enabledIntents: ['city_hub', 'service'],
    content: {
      minWordCount: 1000,
      maxWordCount: 2000,
      seoSectionCount: 5,
      faqCount: 6,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: {
      pillarPages: [],
      clusterDepth: 1,
      maxInternalLinks: 4,
    },
  };
}

/**
 * Register or update a site's mode config at runtime.
 * Useful for adding sites via Telegram bot.
 */
export function registerSiteModeConfig(siteKey: string, config: SiteModeConfig): void {
  registry[siteKey] = config;
}

/**
 * List all registered site keys and their modes.
 */
export function listRegisteredSites(): Array<{ key: string; mode: string; intents: string[] }> {
  return Object.entries(registry).map(([key, config]) => ({
    key,
    mode: config.mode,
    intents: config.enabledIntents,
  }));
}
