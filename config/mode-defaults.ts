/**
 * Règles génériques par mode de génération — LOCAL / THEMATIC / PRODUCT.
 *
 * C'est le SEUL endroit où vit la logique de mode. Ce qui est propre à un site
 * (voix de marque, services, topics, intents activés) est stocké dans
 * `site_profiles` et vient SURCHARGER ces défauts — voir `src/sites/registry.ts`.
 *
 * Décision A1 : la config par site part en base (éditable depuis /sites), les
 * règles de mode restent en TypeScript (revues en code, pas en SQL).
 */

import type { SiteMode, SiteModeConfig, PageIntent, BrandVoice } from './site-modes.js';

export interface ModeDefaults {
  enabledIntents: PageIntent[];
  content: SiteModeConfig['content'];
  cocooning: SiteModeConfig['cocooning'];
}

/** Voix de marque neutre, utilisée tant qu'un site n'a pas la sienne en base. */
export const DEFAULT_BRAND: BrandVoice = {
  tone: 'professionnel et accessible',
  personality: 'Un professionnel de confiance qui explique clairement',
  wordsToUse: ['qualité', 'proximité', 'expertise', 'confiance'],
  wordsToAvoid: ['pas cher', 'discount', 'le meilleur', 'numéro 1'],
  ctaStyle: 'appel direct',
  uniqueSellingPoints: ['Service de qualité', 'Proximité', 'Transparence'],
  experienceProof: 'Professionnel expérimenté',
};

export const MODE_DEFAULTS: Record<SiteMode, ModeDefaults> = {
  /** Artisans et services de proximité : une page = une prestation géolocalisée. */
  local: {
    enabledIntents: ['service', 'prix', 'faq'],
    content: {
      minWordCount: 1000,
      maxWordCount: 2000,
      seoSectionCount: 5,
      faqCount: 6,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: { pillarPages: [], clusterDepth: 1, maxInternalLinks: 4 },
  },

  /** Autorité thématique : une page = un sujet × une intention, contenu long. */
  thematic: {
    enabledIntents: ['guide', 'comparatif', 'prix', 'faq'],
    content: {
      minWordCount: 1500,
      maxWordCount: 3000,
      seoSectionCount: 6,
      faqCount: 8,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: { pillarPages: [], clusterDepth: 2, maxInternalLinks: 6 },
  },

  /** Catalogue : une page = un produit ou une catégorie, contenu plus court. */
  product: {
    enabledIntents: ['product_page', 'category', 'comparatif', 'avis'],
    content: {
      minWordCount: 800,
      maxWordCount: 1500,
      seoSectionCount: 4,
      faqCount: 5,
      language: 'fr',
      includeUpdatedDate: true,
    },
    cocooning: { pillarPages: [], clusterDepth: 1, maxInternalLinks: 4 },
  },
};

export function isSiteMode(value: unknown): value is SiteMode {
  return value === 'local' || value === 'thematic' || value === 'product';
}
