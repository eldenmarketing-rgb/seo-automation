/**
 * Universal Site Mode Configuration
 * 
 * Extends the existing SiteConfig to support 3 generation modes:
 * - local: ville × service (garage, carrosserie, massage, vtc, restaurant)
 * - thematic: topic × intent (formation, guide, blog authority)
 * - product: product × variant (voitures, catalogue, e-commerce)
 * 
 * IMPORTANT: This file extends config/sites.ts — it does NOT replace it.
 * Add these fields to your existing SiteConfig interface.
 */

// ─── Generation Modes ────────────────────────────────────────

export type SiteMode = 'local' | 'thematic' | 'product';

export type PageIntent = 
  | 'service'        // Page service standard (vidange, carrosserie...)
  | 'city_hub'       // Page hub ville (garage perpignan)
  | 'prix'           // Intention prix/tarif/devis
  | 'urgence'        // Intention urgence/dépannage/24h
  | 'avis'           // Intention avis/comparatif/meilleur
  | 'faq'            // Page FAQ thématique
  | 'guide'          // Guide expert / how-to
  | 'formation'      // Page formation/cours
  | 'comparatif'     // Comparatif produit/service
  | 'product_page'   // Fiche produit
  | 'category'       // Page catégorie
  | 'landing';       // Landing page conversion

// ─── Brand Voice Configuration ───────────────────────────────

export interface BrandVoice {
  tone: string;              // "professionnel et rassurant" / "expert technique" / "friendly et accessible"
  personality: string;       // Description courte de la personnalité de marque
  wordsToUse: string[];      // Mots à privilégier dans le contenu
  wordsToAvoid: string[];    // Mots interdits
  ctaStyle: string;          // "appel direct" / "formulaire" / "devis en ligne" / "réservation"
  uniqueSellingPoints: string[];  // Arguments différenciants (3-5 max)
  experienceProof: string;   // Phrase type E-E-A-T : "20 ans d'expérience" / "plus de 5000 clients"
}

// ─── Thematic Mode Config ────────────────────────────────────

export interface TopicDef {
  slug: string;         // "reprogrammation-stage-1"
  name: string;         // "Reprogrammation moteur Stage 1"
  keywords: string[];   // ["reprogrammation stage 1", "gain puissance stage 1", ...]
  parentTopic?: string; // slug du topic parent (pour cocooning)
  difficulty?: 'easy' | 'medium' | 'hard';  // Difficulté SEO estimée
}

export interface ThematicConfig {
  topics: TopicDef[];
  intents: PageIntent[];         // Quels types de pages générer par topic
  authority: {                   // Signaux d'autorité pour E-E-A-T
    expertise: string;           // "formateur certifié depuis 2015"
    certifications?: string[];   // ["certifié ALIENTECH", "master ECUTEK"]
    socialProof?: string;        // "plus de 500 stagiaires formés"
  };
  targetAudience: string;        // "mécaniciens indépendants souhaitant se spécialiser"
  contentDepth: 'standard' | 'expert' | 'encyclopedic';  // Profondeur de contenu
}

// ─── Product Mode Config ─────────────────────────────────────

export interface ProductVariant {
  slug: string;
  name: string;
  attributes: Record<string, string>;  // { marque: "Peugeot", modele: "308", annee: "2024" }
}

export interface ProductConfig {
  productType: string;          // "véhicule d'occasion", "pièce détachée"
  variants: ProductVariant[];
  affiliateConfig?: {
    platform: string;           // "awin", "direct"
    urlPattern: string;         // "auto-doc.fr/pieces-detachees/oem/{refOEM}"
    commission: string;         // "8%"
  };
  schemaType: 'Product' | 'Vehicle' | 'Course' | 'SoftwareApplication';
}

// ─── Extended Site Config ────────────────────────────────────

export interface SiteModeConfig {
  /** Generation mode — determines which matrix and prompt strategy to use */
  mode: SiteMode;
  
  /** Brand voice — injected into every prompt */
  brand: BrandVoice;
  
  /** Page intents to generate — controls which intent variants are created */
  enabledIntents: PageIntent[];
  
  /** Thematic config — only used when mode === 'thematic' */
  thematic?: ThematicConfig;
  
  /** Product config — only used when mode === 'product' */
  product?: ProductConfig;
  
  /** Content settings */
  content: {
    minWordCount: number;       // 1200 for expert, 800 for standard
    maxWordCount: number;       // 2500 for expert, 1500 for standard
    seoSectionCount: number;    // 5-7 sections
    faqCount: number;           // 6-8 FAQ
    language: 'fr' | 'en';     // Langue du contenu
    includeUpdatedDate: boolean; // Ajouter la date de fraîcheur
  };
  
  /** Semantic cocooning — internal linking strategy */
  cocooning: {
    pillarPages: string[];      // Slugs des pages pilier
    clusterDepth: number;       // 1 = pilier→enfant, 2 = pilier→enfant→petit-enfant
    maxInternalLinks: number;   // Nombre max de liens internes par page
  };
}

// ─── Universal Page Definition ───────────────────────────────

export interface UniversalPage {
  siteKey: string;
  slug: string;
  pageType: 'city' | 'city_service' | 'topic' | 'topic_intent' | 'product' | 'category';
  intent: PageIntent;
  
  // Mode local
  city?: {
    name: string;
    slug: string;
    postalCode: string;
    distanceFromBase: string;
    population?: number;
    department?: string;
  };
  service?: {
    name: string;
    slug: string;
    keywords: string[];
    parentService?: string;
  };
  
  // Mode thématique
  topic?: TopicDef;
  
  // Mode produit
  product?: ProductVariant;
  
  // Commun
  site: any;  // SiteConfig from existing config/sites.ts
  modeConfig: SiteModeConfig;
}
