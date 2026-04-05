/**
 * Keyword Research v2
 * 
 * Remplace src/keywords/research.ts avec DataForSEO comme source principale.
 * Fallback sur Google Suggest heuristique si DataForSEO n'est pas configuré.
 * 
 * Utilisé par :
 * - page-generator-v2.ts → injection de mots-clés dans le prompt
 * - daily-generate.ts → scoring des pages candidates
 * - Bot Grammy → commande /research
 */

import { 
  getSearchVolume, 
  getKeywordIdeas, 
  batchScoreKeywords,
  fullKeywordResearch,
  scoreKeywordWithData,
  KeywordData,
  KeywordIdea,
  KeywordResearchResult,
} from './dataforseo.js';
import * as logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// ─── Feature Detection ──────────────────────────────────────

function isDataForSeoConfigured(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

// ─── Heuristic Fallback (Google Suggest style) ───────────────

/**
 * Scoring heuristique quand DataForSEO n'est pas disponible.
 * Basé sur les patterns du mot-clé, pas sur des données réelles.
 */
function heuristicScore(keyword: string): { score: number; details: string } {
  let score = 30; // Base
  const kw = keyword.toLowerCase();

  // Intention transactionnelle
  if (/prix|tarif|co[uû]t|combien|devis/.test(kw)) score += 20;
  if (/urgent|nuit|dimanche|24h|dépannage/.test(kw)) score += 20;
  if (/avis|meilleur|recommand|top|comparatif/.test(kw)) score += 15;
  if (/formation|stage|cours|apprendre/.test(kw)) score += 15;
  if (/comment|pourquoi|quand|guide/.test(kw)) score += 10;

  // Ville connue
  const bigCities = ['perpignan', 'narbonne', 'béziers', 'montpellier', 'toulouse', 'carcassonne', 'marseille', 'nîmes'];
  if (bigCities.some(c => kw.includes(c))) score += 10;

  // Longueur (longue traîne = plus spécifique = meilleure conversion)
  const words = kw.split(/\s+/).length;
  if (words >= 4) score += 10;
  else if (words >= 3) score += 5;

  return { 
    score: Math.min(score, 100), 
    details: 'Score heuristique (DataForSEO non configuré)' 
  };
}

// ─── Public API ──────────────────────────────────────────────

export interface EnrichedKeyword {
  keyword: string;
  type: 'short' | 'long';
  volume?: number;
  cpc?: number | null;
  kd?: number;
  score: number;
  source: 'dataforseo' | 'heuristic';
}

/**
 * Recherche de mots-clés avec volumes — remplace quickKeywordSuggestions().
 * Utilisé par page-generator-v2.ts pour enrichir le prompt.
 * 
 * Avec DataForSEO : retourne les vrais volumes et KD.
 * Sans DataForSEO : retourne un scoring heuristique.
 */
export async function enrichedKeywordSuggestions(
  seed: string,
  location?: string,
  _dept?: string,
  limit: number = 12
): Promise<EnrichedKeyword[]> {
  
  if (isDataForSeoConfigured()) {
    try {
      const ideas = await getKeywordIdeas([seed], limit + 10);
      
      return ideas
        .filter(kw => kw.searchVolume > 0)
        .slice(0, limit)
        .map(kw => ({
          keyword: kw.keyword,
          type: kw.keyword.split(/\s+/).length >= 3 ? 'long' as const : 'short' as const,
          volume: kw.searchVolume,
          cpc: kw.cpc,
          kd: kw.keywordDifficulty,
          score: 0, // Calculé après
          source: 'dataforseo' as const,
        }))
        .map(kw => ({
          ...kw,
          score: calculateScore(kw),
        }))
        .sort((a, b) => b.score - a.score);
    } catch (e) {
      logger.warn(`DataForSEO enrichment failed, using heuristic: ${(e as Error).message}`);
    }
  }

  // Fallback heuristique
  return generateHeuristicKeywords(seed, location)
    .slice(0, limit);
}

/**
 * Score une page candidate avec ou sans DataForSEO.
 * Utilisé par daily-generate.ts pour décider quoi générer.
 */
export async function scorePageCandidate(keyword: string): Promise<{
  score: number;
  volume: number;
  cpc: number | null;
  kd: number;
  details: string;
  source: 'dataforseo' | 'heuristic';
}> {
  if (isDataForSeoConfigured()) {
    try {
      const result = await scoreKeywordWithData(keyword);
      return { ...result, source: 'dataforseo' };
    } catch (e) {
      logger.warn(`DataForSEO scoring failed for "${keyword}", using heuristic`);
    }
  }

  const h = heuristicScore(keyword);
  return {
    score: h.score,
    volume: 0,
    cpc: null,
    kd: 0,
    details: h.details,
    source: 'heuristic',
  };
}

/**
 * Scorer un batch de mots-clés (économique — 1 seul appel API).
 * Utilisé par daily-generate.ts pour scorer toutes les pages d'un coup.
 */
export async function scoreBatch(keywords: string[]): Promise<Map<string, {
  score: number;
  volume: number;
  kd: number;
  cpc: number | null;
  details: string;
  source: 'dataforseo' | 'heuristic';
}>> {
  if (isDataForSeoConfigured() && keywords.length > 0) {
    try {
      const dfsResults = await batchScoreKeywords(keywords);
      const result = new Map<string, any>();
      
      for (const [kw, data] of dfsResults.entries()) {
        result.set(kw, { ...data, source: 'dataforseo' });
      }
      
      return result;
    } catch (e) {
      logger.warn(`DataForSEO batch scoring failed, using heuristic`);
    }
  }

  // Fallback heuristique
  const result = new Map<string, any>();
  for (const kw of keywords) {
    const h = heuristicScore(kw);
    result.set(kw, {
      score: h.score,
      volume: 0,
      kd: 0,
      cpc: null,
      details: h.details,
      source: 'heuristic',
    });
  }
  return result;
}

/**
 * Recherche complète pour /research Telegram.
 * Avec DataForSEO : données réelles.
 * Sans : message d'erreur.
 */
export async function research(seed: string): Promise<KeywordResearchResult | null> {
  if (!isDataForSeoConfigured()) {
    logger.warn('DataForSEO not configured — /research requires DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD');
    return null;
  }

  return fullKeywordResearch(seed, 30);
}

// ─── Backward Compatibility ──────────────────────────────────

/**
 * Drop-in replacement for quickKeywordSuggestions() in research.ts.
 * Used by page-generator-v2.ts without breaking existing imports.
 */
export async function quickKeywordSuggestions(
  seed: string,
  location: string,
  dept: string
): Promise<Array<{ keyword: string; type: 'short' | 'long' }>> {
  const enriched = await enrichedKeywordSuggestions(seed, location, dept, 12);
  return enriched.map(k => ({ keyword: k.keyword, type: k.type }));
}

// ─── Internal Helpers ────────────────────────────────────────

function calculateScore(kw: { volume?: number; cpc?: number | null; kd?: number; keyword: string }): number {
  let score = 0;

  // Volume
  const vol = kw.volume || 0;
  if (vol >= 500) score += 35;
  else if (vol >= 100) score += 25;
  else if (vol >= 20) score += 15;
  else if (vol > 0) score += 5;

  // CPC (valeur commerciale)
  if (kw.cpc && kw.cpc >= 2) score += 20;
  else if (kw.cpc && kw.cpc >= 0.5) score += 10;

  // KD inversé (faible = mieux)
  if (kw.kd && kw.kd < 30) score += 20;
  else if (kw.kd && kw.kd < 50) score += 10;

  // Intention
  const k = kw.keyword.toLowerCase();
  if (/prix|tarif|devis|urgent/.test(k)) score += 15;
  else if (/avis|meilleur|formation/.test(k)) score += 10;

  return Math.min(score, 100);
}

function generateHeuristicKeywords(
  seed: string, 
  location?: string
): EnrichedKeyword[] {
  // Génère des variantes heuristiques quand DataForSEO n'est pas dispo
  const variants: string[] = [];
  const base = seed.toLowerCase();

  // Variantes d'intention
  const prefixes = ['prix', 'tarif', 'avis', 'meilleur', 'comment choisir'];
  for (const prefix of prefixes) {
    variants.push(`${prefix} ${base}`);
  }

  // Variantes de longue traîne
  const suffixes = ['pas cher', 'professionnel', 'avis clients', 'devis gratuit', 'proche de moi'];
  for (const suffix of suffixes) {
    variants.push(`${base} ${suffix}`);
  }

  // Avec localisation
  if (location) {
    variants.push(`${base} ${location}`);
    variants.push(`meilleur ${base} ${location}`);
    variants.push(`prix ${base} ${location}`);
  }

  return variants.map(kw => {
    const h = heuristicScore(kw);
    return {
      keyword: kw,
      type: kw.split(/\s+/).length >= 3 ? 'long' as const : 'short' as const,
      score: h.score,
      source: 'heuristic' as const,
    };
  });
}
