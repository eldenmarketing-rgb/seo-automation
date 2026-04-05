/**
 * Semantic Cocooning Engine
 * 
 * Calcule le maillage interne intelligent pour chaque page générée.
 * Au lieu de laisser Claude inventer des liens, ce module lui fournit
 * les VRAIS slugs existants organisés en cocon sémantique.
 * 
 * Architecture du cocon :
 * 
 *   PILIER (page hub)
 *     ├── CLUSTER (page service/topic)
 *     │     ├── FEUILLE (page intent : prix, urgence, avis...)
 *     │     └── FEUILLE
 *     ├── CLUSTER
 *     │     ├── FEUILLE
 *     │     └── FEUILLE
 *     └── CLUSTER
 * 
 * Règles de maillage :
 * - Chaque page FEUILLE → lie vers son CLUSTER parent + 2-3 FEUILLES sœurs
 * - Chaque page CLUSTER → lie vers son PILIER parent + 2-3 CLUSTERS frères + ses FEUILLES enfants
 * - Chaque page PILIER → lie vers ses CLUSTERS enfants
 * - Liens transversaux entre clusters proches (même ville OU même service)
 */

import { UniversalPage, SiteModeConfig, PageIntent } from '../../config/site-modes.js';
import { getExistingSlugs } from '../db/supabase.js';
import { getExistingSlugsFromFiles } from '../deployers/inject-pages.js';
import * as logger from '../utils/logger.js';

// ─── Types ───────────────────────────────────────────────────

export interface CocoonLink {
  slug: string;
  label: string;       // Ancre descriptive pour le lien
  relation: 'parent' | 'sibling' | 'child' | 'transversal';
  priority: number;    // 1 = obligatoire, 2 = recommandé, 3 = optionnel
}

export interface CocoonContext {
  links: CocoonLink[];
  promptBlock: string;  // Bloc de texte prêt à injecter dans le prompt
}

// ─── Page Hierarchy ──────────────────────────────────────────

interface PageNode {
  slug: string;
  level: 'pillar' | 'cluster' | 'leaf';
  intent: PageIntent;
  city?: string;
  citySlug?: string;
  service?: string;
  serviceSlug?: string;
  topic?: string;
  topicSlug?: string;
  parentSlug?: string;
}

/**
 * Détermine le niveau hiérarchique d'une page dans le cocon.
 */
function classifyPage(page: UniversalPage): PageNode {
  const node: PageNode = {
    slug: page.slug,
    intent: page.intent,
    level: 'cluster', // default
    city: page.city?.name,
    citySlug: page.city?.slug,
    service: page.service?.name,
    serviceSlug: page.service?.slug,
    topic: page.topic?.name,
    topicSlug: page.topic?.slug,
  };

  // Mode LOCAL
  if (page.modeConfig.mode === 'local') {
    if (page.pageType === 'city' || page.intent === 'city_hub') {
      // Page ville = PILIER
      node.level = 'pillar';
      node.parentSlug = undefined; // Top level
    } else if (page.intent === 'service') {
      // Page service standard = CLUSTER
      node.level = 'cluster';
      node.parentSlug = page.city?.slug; // Parent = page ville
    } else {
      // Pages intent (prix, urgence, avis, faq) = FEUILLE
      node.level = 'leaf';
      // Parent = page service de la même ville
      if (page.service?.slug && page.city?.slug) {
        node.parentSlug = `${page.service.slug}-${page.city.slug}`;
      }
    }
  }

  // Mode THÉMATIQUE
  if (page.modeConfig.mode === 'thematic') {
    if (page.intent === 'guide') {
      // Guides = PILIER
      node.level = 'pillar';
    } else if (page.intent === 'formation' || page.intent === 'service') {
      // Formation/service = CLUSTER
      node.level = 'cluster';
      // Parent = guide du même topic
      if (page.topic?.slug) {
        node.parentSlug = `guide-${page.topic.slug}`;
      }
    } else {
      // Prix, comparatif, faq, avis = FEUILLE
      node.level = 'leaf';
      if (page.topic?.slug) {
        node.parentSlug = page.topic.slug;
      }
    }

    // Topic parent → lie aussi vers le topic parent
    if (page.topic?.parentTopic) {
      node.parentSlug = node.parentSlug || page.topic.parentTopic;
    }
  }

  // Mode PRODUIT
  if (page.modeConfig.mode === 'product') {
    if (page.intent === 'category') {
      node.level = 'pillar';
    } else if (page.intent === 'product_page') {
      node.level = 'cluster';
      // Parent = page catégorie
      if (page.modeConfig.product?.productType) {
        node.parentSlug = page.modeConfig.product.productType
          .toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
    } else {
      node.level = 'leaf';
      if (page.product?.slug) {
        node.parentSlug = page.product.slug;
      }
    }
  }

  return node;
}

// ─── Link Computation ────────────────────────────────────────

/**
 * Build a human-readable anchor label for a link.
 */
function buildAnchorLabel(slug: string, page: UniversalPage): string {
  // Essayer de déduire un label naturel depuis le slug
  const parts = slug.split('-');
  
  // Patterns connus
  if (slug.startsWith('prix-')) return `Prix ${parts.slice(1).join(' ')}`;
  if (slug.startsWith('urgence-')) return `Urgence ${parts.slice(1).join(' ')}`;
  if (slug.startsWith('avis-')) return `Avis ${parts.slice(1).join(' ')}`;
  if (slug.startsWith('faq-')) return `FAQ ${parts.slice(1).join(' ')}`;
  if (slug.startsWith('guide-')) return `Guide ${parts.slice(1).join(' ')}`;
  if (slug.startsWith('formation-')) return `Formation ${parts.slice(1).join(' ')}`;
  if (slug.startsWith('comparatif-')) return `Comparatif ${parts.slice(1).join(' ')}`;
  
  // Default : capitaliser
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

/**
 * Trouve les pages sœurs (même parent, même niveau).
 */
function findSiblings(
  currentSlug: string,
  currentNode: PageNode,
  existingSlugs: string[],
  page: UniversalPage,
  maxCount: number = 3
): CocoonLink[] {
  const siblings: CocoonLink[] = [];

  if (page.modeConfig.mode === 'local' && currentNode.level === 'leaf') {
    // Feuille locale : sœurs = autres intents pour le même service+ville
    // Ex: "prix-vidange-perpignan" → sœurs: "urgence-vidange-perpignan", "avis-vidange-perpignan"
    const intents = ['prix', 'urgence', 'avis', 'faq'];
    for (const intent of intents) {
      if (page.service?.slug && page.city?.slug) {
        const siblingSlug = `${intent}-${page.service.slug}-${page.city.slug}`;
        if (siblingSlug !== currentSlug && existingSlugs.includes(siblingSlug)) {
          siblings.push({
            slug: siblingSlug,
            label: buildAnchorLabel(siblingSlug, page),
            relation: 'sibling',
            priority: 2,
          });
        }
      }
    }
  }

  if (page.modeConfig.mode === 'local' && currentNode.level === 'cluster') {
    // Cluster local : sœurs = autres services dans la même ville
    for (const svc of page.site.services || []) {
      if (svc.slug !== page.service?.slug && page.city?.slug) {
        const siblingSlug = `${svc.slug}-${page.city.slug}`;
        if (existingSlugs.includes(siblingSlug)) {
          siblings.push({
            slug: siblingSlug,
            label: `${svc.name} à ${page.city.name}`,
            relation: 'sibling',
            priority: 2,
          });
        }
      }
    }
  }

  if (page.modeConfig.mode === 'local' && currentNode.level === 'cluster') {
    // Transversal : même service dans les villes voisines
    // Ex: "vidange-perpignan" → transversal: "vidange-canet-en-roussillon"
    const nearbyPatterns = existingSlugs.filter(s => {
      return s.startsWith(`${page.service?.slug}-`) && s !== currentSlug;
    });
    for (const nearby of nearbyPatterns.slice(0, 2)) {
      siblings.push({
        slug: nearby,
        label: buildAnchorLabel(nearby, page),
        relation: 'transversal',
        priority: 3,
      });
    }
  }

  if (page.modeConfig.mode === 'thematic') {
    // Thématique : sœurs = autres intents du même topic
    const intents = ['guide', 'formation', 'prix', 'comparatif', 'faq', 'avis'];
    for (const intent of intents) {
      if (page.topic?.slug) {
        const patterns = [
          `${intent}-${page.topic.slug}`,
          page.topic.slug, // le topic slug brut
        ];
        for (const pattern of patterns) {
          if (pattern !== currentSlug && existingSlugs.includes(pattern)) {
            siblings.push({
              slug: pattern,
              label: buildAnchorLabel(pattern, page),
              relation: 'sibling',
              priority: 2,
            });
            break;
          }
        }
      }
    }

    // Topics du même parent
    if (page.topic?.parentTopic && page.modeConfig.thematic) {
      for (const topic of page.modeConfig.thematic.topics) {
        if (topic.parentTopic === page.topic.parentTopic && topic.slug !== page.topic.slug) {
          const siblingSlug = `guide-${topic.slug}`;
          if (existingSlugs.includes(siblingSlug)) {
            siblings.push({
              slug: siblingSlug,
              label: `Guide ${topic.name}`,
              relation: 'sibling',
              priority: 2,
            });
          }
        }
      }
    }
  }

  // Trier par priorité et limiter
  return siblings
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxCount);
}

/**
 * Trouve les pages enfants (niveau inférieur, même branche).
 */
function findChildren(
  currentSlug: string,
  currentNode: PageNode,
  existingSlugs: string[],
  page: UniversalPage,
  maxCount: number = 4
): CocoonLink[] {
  const children: CocoonLink[] = [];

  if (page.modeConfig.mode === 'local' && currentNode.level === 'pillar') {
    // Pilier ville → enfants = pages service dans cette ville
    for (const svc of page.site.services || []) {
      if (page.city?.slug) {
        const childSlug = `${svc.slug}-${page.city.slug}`;
        if (existingSlugs.includes(childSlug)) {
          children.push({
            slug: childSlug,
            label: `${svc.name} à ${page.city.name}`,
            relation: 'child',
            priority: 1,
          });
        }
      }
    }
  }

  if (page.modeConfig.mode === 'local' && currentNode.level === 'cluster') {
    // Cluster service → enfants = pages intent (prix, urgence, avis)
    const intents = ['prix', 'urgence', 'avis', 'faq'];
    for (const intent of intents) {
      if (page.service?.slug && page.city?.slug) {
        const childSlug = `${intent}-${page.service.slug}-${page.city.slug}`;
        if (existingSlugs.includes(childSlug)) {
          children.push({
            slug: childSlug,
            label: buildAnchorLabel(childSlug, page),
            relation: 'child',
            priority: 2,
          });
        }
      }
    }
  }

  if (page.modeConfig.mode === 'thematic' && currentNode.level === 'pillar') {
    // Pilier guide → enfants = formation, prix, comparatif du même topic
    const childIntents = ['formation', 'prix', 'comparatif', 'faq'];
    for (const intent of childIntents) {
      if (page.topic?.slug) {
        const childSlug = `${intent}-${page.topic.slug}`;
        if (existingSlugs.includes(childSlug)) {
          children.push({
            slug: childSlug,
            label: buildAnchorLabel(childSlug, page),
            relation: 'child',
            priority: 1,
          });
        }
      }
    }

    // Topics enfants (parentTopic = ce topic)
    if (page.modeConfig.thematic) {
      for (const topic of page.modeConfig.thematic.topics) {
        if (topic.parentTopic === page.topic?.slug) {
          const childSlug = `guide-${topic.slug}`;
          if (existingSlugs.includes(childSlug)) {
            children.push({
              slug: childSlug,
              label: `Guide ${topic.name}`,
              relation: 'child',
              priority: 1,
            });
          }
        }
      }
    }
  }

  return children.slice(0, maxCount);
}

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Calcule les liens du cocon sémantique pour une page.
 * Retourne un bloc de texte prêt à injecter dans le prompt.
 */
export async function computeCocoonLinks(
  page: UniversalPage,
): Promise<CocoonContext> {
  const maxLinks = page.modeConfig.cocooning.maxInternalLinks;
  const allLinks: CocoonLink[] = [];

  // 1. Récupérer tous les slugs existants pour ce site
  let existingSlugs: string[] = [];
  try {
    const supabaseSlugs = await getExistingSlugs(page.siteKey);
    const fileSlugs = getExistingSlugsFromFiles(page.siteKey);
    existingSlugs = [...new Set([...supabaseSlugs, ...fileSlugs])];
  } catch (e) {
    logger.warn(`Could not fetch existing slugs for cocooning: ${(e as Error).message}`);
    return { links: [], promptBlock: '' };
  }

  if (existingSlugs.length === 0) {
    return { links: [], promptBlock: '' };
  }

  // 2. Classifier la page courante
  const currentNode = classifyPage(page);

  // 3. Lien parent (obligatoire si existe)
  if (currentNode.parentSlug && existingSlugs.includes(currentNode.parentSlug)) {
    allLinks.push({
      slug: currentNode.parentSlug,
      label: buildAnchorLabel(currentNode.parentSlug, page),
      relation: 'parent',
      priority: 1,
    });
  }

  // 4. Pages pilier du site (toujours lier vers elles)
  for (const pillarSlug of page.modeConfig.cocooning.pillarPages) {
    if (pillarSlug !== page.slug && 
        pillarSlug !== currentNode.parentSlug && 
        existingSlugs.includes(pillarSlug)) {
      allLinks.push({
        slug: pillarSlug,
        label: buildAnchorLabel(pillarSlug, page),
        relation: 'parent',
        priority: 1,
      });
    }
  }

  // 5. Pages sœurs
  const siblings = findSiblings(page.slug, currentNode, existingSlugs, page, 3);
  allLinks.push(...siblings);

  // 6. Pages enfants
  const children = findChildren(page.slug, currentNode, existingSlugs, page, 4);
  allLinks.push(...children);

  // 7. Trier par priorité, dédupliquer, limiter
  const uniqueLinks = allLinks
    .filter((link, index, self) => 
      index === self.findIndex(l => l.slug === link.slug)
    )
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxLinks);

  // 8. Construire le bloc prompt
  const promptBlock = buildCocoonPromptBlock(uniqueLinks, page, currentNode);

  return { links: uniqueLinks, promptBlock };
}

/**
 * Construit le bloc de texte pour le prompt avec les liens du cocon.
 */
function buildCocoonPromptBlock(
  links: CocoonLink[], 
  page: UniversalPage, 
  node: PageNode
): string {
  if (links.length === 0) return '';

  const domain = page.site.domain;
  const parts: string[] = [];

  parts.push(`═══ MAILLAGE INTERNE (COCON SÉMANTIQUE) ═══`);
  parts.push(`Cette page est de niveau : ${node.level.toUpperCase()}`);
  
  if (node.level === 'pillar') {
    parts.push(`En tant que page pilier, elle doit lier vers ses pages cluster enfants pour distribuer le jus SEO.`);
  } else if (node.level === 'cluster') {
    parts.push(`En tant que page cluster, elle doit lier vers sa page pilier parente ET vers ses pages feuilles enfants et ses sœurs.`);
  } else {
    parts.push(`En tant que page feuille, elle doit OBLIGATOIREMENT lier vers sa page cluster parente et vers 2-3 pages sœurs.`);
  }

  parts.push(`\nLIENS À INTÉGRER (utilise ces URLs exactes dans les internalLinks ET mentionne-les naturellement dans le contenu) :\n`);

  // Grouper par relation
  const parents = links.filter(l => l.relation === 'parent');
  const siblings = links.filter(l => l.relation === 'sibling');
  const children = links.filter(l => l.relation === 'child');
  const transversal = links.filter(l => l.relation === 'transversal');

  if (parents.length > 0) {
    parts.push(`LIENS PARENTS (obligatoires) :`);
    for (const link of parents) {
      parts.push(`  - ${domain}/${link.slug} → ancre suggérée : "${link.label}"`);
    }
  }

  if (children.length > 0) {
    parts.push(`LIENS ENFANTS (recommandés) :`);
    for (const link of children) {
      parts.push(`  - ${domain}/${link.slug} → ancre suggérée : "${link.label}"`);
    }
  }

  if (siblings.length > 0) {
    parts.push(`LIENS SŒURS (recommandés) :`);
    for (const link of siblings) {
      parts.push(`  - ${domain}/${link.slug} → ancre suggérée : "${link.label}"`);
    }
  }

  if (transversal.length > 0) {
    parts.push(`LIENS TRANSVERSAUX (optionnels) :`);
    for (const link of transversal) {
      parts.push(`  - ${domain}/${link.slug} → ancre suggérée : "${link.label}"`);
    }
  }

  parts.push(`\nRÈGLES DE MAILLAGE :`);
  parts.push(`- Utilise UNIQUEMENT les slugs listés ci-dessus dans les internalLinks`);
  parts.push(`- N'invente AUCUN slug — si un lien n'est pas dans la liste, ne le mets pas`);
  parts.push(`- Intègre les liens naturellement dans le contenu (pas juste en fin de page)`);
  parts.push(`- Les ancres doivent être descriptives et variées (pas toujours le même texte)`);
  parts.push(`- Place au moins 1 lien parent dans l'intro ou la première section`);

  return parts.join('\n');
}
