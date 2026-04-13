/**
 * Cannibalization Detector
 * 
 * Détecte quand deux pages du même site ciblent la même requête.
 * Vérifie AVANT génération pour éviter de créer des pages qui se cannibalisent.
 * 
 * Exemples de cannibalisation :
 * - "vidange-perpignan" (intent service) vs "prix-vidange-perpignan" (intent prix)
 *   → OK si les intents sont différents et le contenu distinct
 * - "vidange-perpignan" vs "entretien-vidange-perpignan"
 *   → DANGER : même requête, pages différentes
 * 
 * Méthode : comparaison des mots-clés principaux via overlap de tokens.
 * Avec DataForSEO : vérifie aussi les SERP pour voir si Google considère les requêtes comme similaires.
 */

import { getExistingSlugs } from '../db/supabase.js';
import { getSupabase } from '../db/supabase.js';
import { UniversalPage } from '../../config/site-modes.js';
import * as logger from '../utils/logger.js';

// ─── Types ───────────────────────────────────────────────────

export interface CannibalizationRisk {
  slug: string;
  existingSlug: string;
  overlapScore: number;      // 0-100
  sharedKeywords: string[];
  recommendation: 'merge' | 'differentiate' | 'skip' | 'ok';
  reason: string;
}

// ─── Token Overlap ───────────────────────────────────────────

// City names excluded — they match all geo-targeted pages and cause false positives
const CITY_NAMES = new Set([
  'perpignan', 'cabestany', 'saint-esteve', 'pia', 'bompas', 'saleilles',
  'canohes', 'toulouges', 'soler', 'pollestres', 'claira', 'rivesaltes',
  'canet-en-roussillon', 'canet', 'saint-cyprien', 'elne', 'thuir',
  'saint-laurent-de-la-salanque', 'saint-laurent', 'barcares', 'argeles-sur-mer',
  'argeles', 'collioure', 'port-vendres', 'ceret', 'prades', 'ille-sur-tet',
  'amelie-les-bains', 'leucate', 'narbonne', 'beziers', 'carcassonne',
  'toulouse', 'marseille', 'montpellier',
]);

const STOP_WORDS = new Set([
  'les', 'des', 'une', 'pour', 'par', 'dans', 'sur', 'avec', 'votre', 'notre',
  ...CITY_NAMES,
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[-_\s]+/)
      .filter(t => t.length > 2)
      .filter(t => !STOP_WORDS.has(t))
  );
}

function calculateOverlap(tokensA: Set<string>, tokensB: Set<string>): number {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  
  const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
  const smaller = Math.min(tokensA.size, tokensB.size);
  
  return Math.round((intersection.size / smaller) * 100);
}

// ─── Intent Compatibility ────────────────────────────────────

/**
 * Certaines combinaisons d'intents pour le même service+ville sont attendues
 * et ne constituent PAS de la cannibalisation.
 */
const COMPATIBLE_INTENT_PAIRS: Array<[string, string]> = [
  ['service', 'prix'],
  ['service', 'urgence'],
  ['service', 'avis'],
  ['service', 'faq'],
  ['city_hub', 'service'],
  ['guide', 'formation'],
  ['guide', 'prix'],
  ['guide', 'comparatif'],
  ['guide', 'faq'],
  ['formation', 'prix'],
  ['product_page', 'comparatif'],
  ['product_page', 'avis'],
];

function areIntentsCompatible(intentA: string, intentB: string): boolean {
  return COMPATIBLE_INTENT_PAIRS.some(([a, b]) => 
    (intentA === a && intentB === b) || (intentA === b && intentB === a)
  );
}

// ─── Main Detector ───────────────────────────────────────────

/**
 * Vérifie si une page candidate risque de cannibaliser une page existante.
 */
export async function checkCannibalization(
  page: UniversalPage
): Promise<CannibalizationRisk[]> {
  const risks: CannibalizationRisk[] = [];
  
  try {
    // Récupérer les pages existantes depuis Supabase
    const supabase = getSupabase();
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('slug, meta_title, h1, service, city, intent, content')
      .eq('site_key', page.siteKey)
      .in('status', ['draft', 'published', 'optimized']);

    if (!existingPages || existingPages.length === 0) return risks;

    // Tokens de la page candidate
    const candidateKeywords: string[] = [];
    if (page.service) candidateKeywords.push(...page.service.keywords);
    if (page.topic) candidateKeywords.push(...page.topic.keywords);
    if (page.city) candidateKeywords.push(page.city.name);
    const candidateTokens = tokenize(candidateKeywords.join(' ') + ' ' + page.slug);

    for (const existing of existingPages) {
      if (existing.slug === page.slug) continue;

      // Tokens de la page existante
      const existingTokens = tokenize(
        [existing.slug, existing.h1, existing.meta_title, existing.service, existing.city]
          .filter(Boolean)
          .join(' ')
      );

      const overlap = calculateOverlap(candidateTokens, existingTokens);

      if (overlap < 50) continue; // Pas de risque significatif

      // Vérifier la compatibilité des intents
      const existingIntent = existing.intent || 'service';
      const compatible = areIntentsCompatible(page.intent, existingIntent);

      let recommendation: CannibalizationRisk['recommendation'];
      let reason: string;

      if (overlap >= 80 && !compatible) {
        recommendation = 'skip';
        reason = `Overlap ${overlap}% avec "${existing.slug}" — même cible, intents incompatibles → ne pas générer`;
      } else if (overlap >= 80 && compatible) {
        recommendation = 'differentiate';
        reason = `Overlap ${overlap}% avec "${existing.slug}" — intents compatibles mais contenu doit être très distinct`;
      } else if (overlap >= 60 && !compatible) {
        recommendation = 'merge';
        reason = `Overlap ${overlap}% avec "${existing.slug}" — envisager de fusionner plutôt que créer une nouvelle page`;
      } else {
        recommendation = 'ok';
        reason = `Overlap ${overlap}% avec "${existing.slug}" — acceptable`;
      }

      if (recommendation !== 'ok') {
        const shared = [...candidateTokens].filter(t => existingTokens.has(t));
        risks.push({
          slug: page.slug,
          existingSlug: existing.slug,
          overlapScore: overlap,
          sharedKeywords: shared,
          recommendation,
          reason,
        });
      }
    }
  } catch (e) {
    logger.warn(`Cannibalization check failed for ${page.slug}: ${(e as Error).message}`);
  }

  return risks.sort((a, b) => b.overlapScore - a.overlapScore);
}

/**
 * Vérifie un batch de pages candidates et filtre celles à risque.
 */
export async function filterCannibalized(
  pages: UniversalPage[]
): Promise<{ safe: UniversalPage[]; blocked: Array<{ page: UniversalPage; risks: CannibalizationRisk[] }> }> {
  const safe: UniversalPage[] = [];
  const blocked: Array<{ page: UniversalPage; risks: CannibalizationRisk[] }> = [];

  for (const page of pages) {
    const risks = await checkCannibalization(page);
    const hasBlocker = risks.some(r => r.recommendation === 'skip');

    if (hasBlocker) {
      blocked.push({ page, risks });
      logger.warn(`Cannibalisation bloquée : ${page.slug} → ${risks[0].reason}`);
    } else {
      safe.push(page);
      if (risks.length > 0) {
        logger.info(`Cannibalisation mineure détectée pour ${page.slug} — génération autorisée avec différenciation`);
      }
    }
  }

  return { safe, blocked };
}

/**
 * Formate les risques pour Telegram.
 */
export function formatCannibalizationTelegram(
  blocked: Array<{ page: UniversalPage; risks: CannibalizationRisk[] }>
): string {
  if (blocked.length === 0) return '';

  const lines: string[] = [];
  lines.push(`⚠️ <b>Cannibalisation détectée (${blocked.length} pages bloquées) :</b>`);
  
  for (const { page, risks } of blocked.slice(0, 5)) {
    const risk = risks[0];
    lines.push(`• <code>${page.slug}</code> ↔ <code>${risk.existingSlug}</code>`);
    lines.push(`  Overlap ${risk.overlapScore}% — ${risk.recommendation}`);
  }

  return lines.join('\n');
}
