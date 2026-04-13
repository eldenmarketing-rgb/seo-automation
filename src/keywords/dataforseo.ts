/**
 * DataForSEO API Client
 * 
 * Remplace Google Suggest comme source de données SEO.
 * Fournit : volumes de recherche, KD, CPC, mots-clés liés, analyse concurrentielle.
 * 
 * Endpoints utilisés :
 * - Keywords Data → Google Ads → Search Volume (volumes exacts)
 * - DataForSEO Labs → Keyword Ideas (mots-clés liés)
 * - DataForSEO Labs → Keywords for Site (mots-clés d'un domaine)
 * - DataForSEO Labs → Ranked Keywords (analyse concurrentielle)
 * 
 * Config : DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD dans .env
 * Pricing : ~0.04$/requête (Search Volume), ~0.01$/requête (Labs)
 * Location France : 2250, Language FR : "fr"
 */

import dotenv from 'dotenv';
import * as logger from '../utils/logger.js';

dotenv.config();

// ─── Config ──────────────────────────────────────────────────

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const API_BASE = 'https://api.dataforseo.com/v3';

// France location code for DataForSEO
const LOCATION_CODE_FR = 2250;
const LANGUAGE_CODE_FR = 'fr';

function getAuthHeader(): string {
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    throw new Error('DataForSEO credentials not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env');
  }
  return 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
}

// ─── Types ───────────────────────────────────────────────────

export interface KeywordData {
  keyword: string;
  searchVolume: number;         // Volume mensuel
  cpc: number | null;           // Coût par clic en €
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  competitionIndex: number;     // 0-100
  keywordDifficulty?: number;   // 0-100 (KD)
  trend: number[];              // 12 derniers mois
  intent?: string;              // commercial, informational, navigational, transactional
}

export interface KeywordIdea {
  keyword: string;
  searchVolume: number;
  cpc: number | null;
  competition: string | null;
  keywordDifficulty: number;
}

export interface RankedKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
  keywordDifficulty: number;
}

export interface KeywordResearchResult {
  seed: string;
  mainKeyword: KeywordData | null;
  relatedKeywords: KeywordIdea[];
  totalCost: number;  // Coût de la requête en $
}

// ─── API Caller ──────────────────────────────────────────────

async function callApi<T>(endpoint: string, body: unknown[], retries = 2): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`DataForSEO API error ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = await response.json() as any;

      if (data.status_code !== 20000) {
        throw new Error(`DataForSEO error: ${data.status_message}`);
      }

      return data;
    } catch (e) {
      lastError = e as Error;
      if (attempt < retries) {
        const delay = 1000 * (attempt + 1);
        logger.warn(`DataForSEO retry ${attempt + 1}/${retries} in ${delay}ms: ${lastError.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError!;
}

// ─── Search Volume (volumes exacts) ──────────────────────────

/**
 * Obtenir les volumes de recherche exacts pour une liste de mots-clés.
 * Coût : ~0.04$ par requête (jusqu'à 700 mots-clés par batch).
 * 
 * @param keywords - Liste de mots-clés (max 700)
 * @returns Map keyword → KeywordData
 */
export async function getSearchVolume(keywords: string[]): Promise<Map<string, KeywordData>> {
  if (keywords.length === 0) return new Map();
  if (keywords.length > 700) {
    logger.warn(`DataForSEO: truncating ${keywords.length} keywords to 700`);
    keywords = keywords.slice(0, 700);
  }

  const result = new Map<string, KeywordData>();

  try {
    const data = await callApi<any>('/keywords_data/google_ads/search_volume/live', [{
      keywords,
      location_code: LOCATION_CODE_FR,
      language_code: LANGUAGE_CODE_FR,
    }]);

    const items = data.tasks?.[0]?.result || [];
    for (const item of items) {
      if (!item.keyword) continue;
      
      const trend = (item.monthly_searches || [])
        .slice(0, 12)
        .map((m: any) => m.search_volume || 0);

      result.set(item.keyword.toLowerCase(), {
        keyword: item.keyword,
        searchVolume: item.search_volume || 0,
        cpc: item.cpc || null,
        competition: item.competition || null,
        competitionIndex: item.competition_index || 0,
        trend,
        intent: item.search_intent_info?.main_intent || undefined,
      });
    }

    const cost = data.cost || 0;
    logger.info(`DataForSEO Search Volume: ${keywords.length} keywords, cost: $${cost.toFixed(4)}`);
  } catch (e) {
    logger.error(`DataForSEO Search Volume failed: ${(e as Error).message}`);
    throw e;
  }

  return result;
}

// ─── Keyword Ideas (mots-clés liés) ─────────────────────────

/**
 * Obtenir des idées de mots-clés liés à des seeds.
 * Coût : ~0.01$ par requête.
 * 
 * @param seedKeywords - 1 à 20 mots-clés de départ
 * @param limit - Nombre max de résultats (default 50)
 * @returns Liste de KeywordIdea triée par volume décroissant
 */
export async function getKeywordIdeas(
  seedKeywords: string[],
  limit: number = 50
): Promise<KeywordIdea[]> {
  if (seedKeywords.length === 0) return [];
  if (seedKeywords.length > 20) seedKeywords = seedKeywords.slice(0, 20);

  try {
    const data = await callApi<any>('/dataforseo_labs/google/keyword_ideas/live', [{
      keywords: seedKeywords,
      location_code: LOCATION_CODE_FR,
      language_code: LANGUAGE_CODE_FR,
      include_serp_info: true,
      include_seed_keyword: false,
      limit,
      order_by: ['keyword_info.search_volume,desc'],
      filters: [
        ['keyword_info.search_volume', '>', 0],
      ],
    }]);

    const items = data.tasks?.[0]?.result?.[0]?.items || [];
    const cost = data.cost || 0;
    logger.info(`DataForSEO Keyword Ideas: ${items.length} results for [${seedKeywords.join(', ')}], cost: $${cost.toFixed(4)}`);

    return items.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: item.keyword_info?.search_volume || 0,
      cpc: item.keyword_info?.cpc || null,
      competition: item.keyword_info?.competition || null,
      keywordDifficulty: item.serp_info?.keyword_difficulty || 0,
    }));
  } catch (e) {
    logger.error(`DataForSEO Keyword Ideas failed: ${(e as Error).message}`);
    return [];
  }
}

// ─── Related Keywords (mots-clés sémantiquement proches) ─────

/**
 * Obtenir des mots-clés sémantiquement proches d'un seed.
 * Plus précis que keyword_ideas — reste dans le champ sémantique du seed.
 * Coût : ~0.01$ par requête.
 *
 * @param seedKeyword - Un mot-clé de départ (pas une liste)
 * @param limit - Nombre max de résultats (default 50)
 */
export async function getRelatedKeywords(
  seedKeyword: string,
  limit: number = 50
): Promise<KeywordIdea[]> {
  if (!seedKeyword) return [];

  try {
    const data = await callApi<any>('/dataforseo_labs/google/related_keywords/live', [{
      keyword: seedKeyword,
      location_code: LOCATION_CODE_FR,
      language_code: LANGUAGE_CODE_FR,
      include_seed_keyword: true,
      limit,
      order_by: ['keyword_data.keyword_info.search_volume,desc'],
      filters: [
        ['keyword_data.keyword_info.search_volume', '>', 0],
      ],
    }]);

    const items = data.tasks?.[0]?.result?.[0]?.items || [];
    const cost = data.cost || 0;
    logger.info(`DataForSEO Related Keywords: ${items.length} results for "${seedKeyword}", cost: $${cost.toFixed(4)}`);

    return items.map((item: any) => ({
      keyword: item.keyword_data?.keyword || '',
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      cpc: item.keyword_data?.keyword_info?.cpc || null,
      competition: item.keyword_data?.keyword_info?.competition || null,
      keywordDifficulty: item.keyword_data?.keyword_info?.keyword_difficulty || 0,
    }));
  } catch (e) {
    logger.error(`DataForSEO Related Keywords failed: ${(e as Error).message}`);
    return [];
  }
}

// ─── Keywords for Site (mots-clés d'un domaine) ──────────────

/**
 * Obtenir les mots-clés pour lesquels un domaine est pertinent.
 * Utile pour analyser ses propres sites ou les concurrents.
 * Coût : ~0.01$ par requête.
 */
export async function getKeywordsForSite(
  domain: string,
  limit: number = 100
): Promise<KeywordIdea[]> {
  try {
    const data = await callApi<any>('/dataforseo_labs/google/keywords_for_site/live', [{
      target: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      location_code: LOCATION_CODE_FR,
      language_code: LANGUAGE_CODE_FR,
      include_serp_info: true,
      limit,
      order_by: ['keyword_info.search_volume,desc'],
      filters: [
        ['keyword_info.search_volume', '>', 0],
      ],
    }]);

    const items = data.tasks?.[0]?.result?.[0]?.items || [];
    const cost = data.cost || 0;
    logger.info(`DataForSEO Keywords for Site: ${items.length} results for ${domain}, cost: $${cost.toFixed(4)}`);

    return items.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: item.keyword_info?.search_volume || 0,
      cpc: item.keyword_info?.cpc || null,
      competition: item.keyword_info?.competition || null,
      keywordDifficulty: item.serp_info?.keyword_difficulty || 0,
    }));
  } catch (e) {
    logger.error(`DataForSEO Keywords for Site failed: ${(e as Error).message}`);
    return [];
  }
}

// ─── Ranked Keywords (analyse concurrentielle) ───────────────

/**
 * Obtenir les mots-clés pour lesquels un domaine ranke dans Google.
 * = L'équivalent de "Organic Research" dans SEMrush.
 * Coût : ~0.01$ par requête.
 */
export async function getRankedKeywords(
  domain: string,
  limit: number = 100
): Promise<RankedKeyword[]> {
  try {
    const data = await callApi<any>('/dataforseo_labs/google/ranked_keywords/live', [{
      target: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      location_code: LOCATION_CODE_FR,
      language_code: LANGUAGE_CODE_FR,
      load_rank_absolute: true,
      limit,
      order_by: ['keyword_data.keyword_info.search_volume,desc'],
      filters: [
        ['keyword_data.keyword_info.search_volume', '>', 0],
      ],
    }]);

    const items = data.tasks?.[0]?.result?.[0]?.items || [];
    const cost = data.cost || 0;
    logger.info(`DataForSEO Ranked Keywords: ${items.length} results for ${domain}, cost: $${cost.toFixed(4)}`);

    return items.map((item: any) => ({
      keyword: item.keyword_data?.keyword || '',
      position: item.ranked_serp_element?.serp_item?.rank_absolute || 0,
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      url: item.ranked_serp_element?.serp_item?.relative_url || '',
      keywordDifficulty: item.keyword_data?.keyword_info?.keyword_difficulty || 0,
    }));
  } catch (e) {
    logger.error(`DataForSEO Ranked Keywords failed: ${(e as Error).message}`);
    return [];
  }
}

// ─── High-Level Research (combine tout) ──────────────────────

/**
 * Recherche complète sur un mot-clé : volume exact + idées liées.
 * C'est la fonction appelée par /research dans Grammy.
 * Coût total : ~0.05$ par recherche.
 */
export async function fullKeywordResearch(
  seed: string,
  limit: number = 30
): Promise<KeywordResearchResult> {
  let totalCost = 0;

  // 1. Volume exact du seed
  const volumeMap = await getSearchVolume([seed]);
  const mainKeyword = volumeMap.get(seed.toLowerCase()) || null;

  // 2. Idées de mots-clés liés
  const relatedKeywords = await getKeywordIdeas([seed], limit);

  return {
    seed,
    mainKeyword,
    relatedKeywords,
    totalCost,
  };
}

/**
 * Analyse concurrentielle : mots-clés des concurrents qu'on ne cible pas.
 * Compare notre domaine avec 1-3 concurrents.
 */
export async function competitorGapAnalysis(
  ourDomain: string,
  competitorDomains: string[],
  limit: number = 50
): Promise<KeywordIdea[]> {
  // 1. Nos mots-clés
  const ourKeywords = await getRankedKeywords(ourDomain, 200);
  const ourKwSet = new Set(ourKeywords.map(k => k.keyword.toLowerCase()));

  // 2. Mots-clés des concurrents
  const allGaps: KeywordIdea[] = [];
  
  for (const competitor of competitorDomains.slice(0, 3)) {
    const compKeywords = await getKeywordsForSite(competitor, 100);
    
    // Filtrer ceux qu'on n'a pas
    const gaps = compKeywords.filter(k => !ourKwSet.has(k.keyword.toLowerCase()));
    allGaps.push(...gaps);
  }

  // Dédupliquer et trier par volume
  const seen = new Set<string>();
  const unique = allGaps.filter(k => {
    const lower = k.keyword.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  return unique
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, limit);
}

// ─── Scoring enrichi avec DataForSEO ─────────────────────────

/**
 * Enrichir le scoring d'une page candidate avec les données DataForSEO.
 * Remplace le scoring heuristique de Google Suggest.
 * 
 * @returns Score 0-100 basé sur les données réelles
 */
export async function scoreKeywordWithData(keyword: string): Promise<{
  score: number;
  volume: number;
  kd: number;
  cpc: number | null;
  competition: string | null;
  details: string;
}> {
  try {
    const volumeMap = await getSearchVolume([keyword]);
    const data = volumeMap.get(keyword.toLowerCase());

    if (!data || data.searchVolume === 0) {
      return {
        score: 0,
        volume: 0,
        kd: 0,
        cpc: null,
        competition: null,
        details: 'Aucun volume détecté',
      };
    }

    // Score composite
    let score = 0;

    // Volume (0-40 points)
    if (data.searchVolume >= 1000) score += 40;
    else if (data.searchVolume >= 500) score += 35;
    else if (data.searchVolume >= 200) score += 30;
    else if (data.searchVolume >= 100) score += 25;
    else if (data.searchVolume >= 50) score += 20;
    else if (data.searchVolume >= 20) score += 15;
    else if (data.searchVolume >= 10) score += 10;
    else score += 5;

    // CPC = valeur commerciale (0-25 points)
    if (data.cpc) {
      if (data.cpc >= 5) score += 25;
      else if (data.cpc >= 3) score += 20;
      else if (data.cpc >= 1.5) score += 15;
      else if (data.cpc >= 0.5) score += 10;
      else score += 5;
    }

    // Compétition inversée (0-20 points) — faible concurrence = mieux
    if (data.competition === 'LOW') score += 20;
    else if (data.competition === 'MEDIUM') score += 12;
    else if (data.competition === 'HIGH') score += 5;

    // Bonus intention transactionnelle (0-15 points)
    const kw = keyword.toLowerCase();
    if (/prix|tarif|co[uû]t|combien|devis/.test(kw)) score += 15;
    else if (/urgent|nuit|dimanche|24h|dépannage/.test(kw)) score += 15;
    else if (/avis|meilleur|recommand|top/.test(kw)) score += 10;
    else if (/formation|stage|cours|apprendre/.test(kw)) score += 10;
    else if (/comment|pourquoi|quand|guide/.test(kw)) score += 5;

    // Cap à 100
    score = Math.min(score, 100);

    const details = `Vol: ${data.searchVolume}/mois | CPC: ${data.cpc ? data.cpc.toFixed(2) + '€' : 'n/a'} | Comp: ${data.competition || 'n/a'}`;

    return {
      score,
      volume: data.searchVolume,
      kd: data.keywordDifficulty || 0,
      cpc: data.cpc,
      competition: data.competition,
      details,
    };
  } catch (e) {
    logger.warn(`DataForSEO scoring failed for "${keyword}": ${(e as Error).message}`);
    // Fallback : retourner un score neutre
    return {
      score: 30,
      volume: 0,
      kd: 0,
      cpc: null,
      competition: null,
      details: 'Scoring fallback (API error)',
    };
  }
}

// ─── Batch scoring pour daily-generate ───────────────────────

/**
 * Scorer plusieurs mots-clés en un seul appel API (économique).
 * Utilisé par daily-generate pour scorer toutes les pages candidates.
 * 
 * @param keywords - Liste de mots-clés à scorer
 * @returns Map keyword → score data
 */
export async function batchScoreKeywords(keywords: string[]): Promise<Map<string, {
  score: number;
  volume: number;
  kd: number;
  cpc: number | null;
  details: string;
}>> {
  const result = new Map<string, { score: number; volume: number; kd: number; cpc: number | null; details: string }>();

  if (keywords.length === 0) return result;

  try {
    // Un seul appel pour tous les volumes (max 700 par batch)
    const volumeMap = await getSearchVolume(keywords.slice(0, 700));

    for (const keyword of keywords) {
      const data = volumeMap.get(keyword.toLowerCase());

      if (!data || data.searchVolume === 0) {
        result.set(keyword, { score: 0, volume: 0, kd: 0, cpc: null, details: 'Pas de volume' });
        continue;
      }

      let score = 0;
      if (data.searchVolume >= 500) score += 35;
      else if (data.searchVolume >= 100) score += 25;
      else if (data.searchVolume >= 20) score += 15;
      else score += 5;

      if (data.cpc && data.cpc >= 1.5) score += 20;
      else if (data.cpc && data.cpc >= 0.5) score += 10;

      if (data.competition === 'LOW') score += 20;
      else if (data.competition === 'MEDIUM') score += 10;

      const kw = keyword.toLowerCase();
      if (/prix|tarif|devis|urgent|dépannage/.test(kw)) score += 15;
      else if (/avis|meilleur|formation/.test(kw)) score += 10;

      score = Math.min(score, 100);

      result.set(keyword, {
        score,
        volume: data.searchVolume,
        kd: data.keywordDifficulty || 0,
        cpc: data.cpc || null,
        details: `${data.searchVolume}/mois, CPC ${data.cpc?.toFixed(2) || 'n/a'}€, ${data.competition || 'n/a'}`,
      });
    }

    logger.info(`DataForSEO batch scoring: ${keywords.length} keywords scored`);
  } catch (e) {
    logger.error(`DataForSEO batch scoring failed: ${(e as Error).message}`);
    // Fallback : score neutre pour tous
    for (const kw of keywords) {
      result.set(kw, { score: 30, volume: 0, kd: 0, cpc: null, details: 'Fallback (API error)' });
    }
  }

  return result;
}

// ─── Telegram Formatter ──────────────────────────────────────

/**
 * Formate les résultats de recherche pour un message Telegram.
 * Utilisé par la commande /research du bot Grammy.
 */
export function formatResearchForTelegram(result: KeywordResearchResult): string {
  const lines: string[] = [];

  lines.push(`🔍 <b>${result.seed}</b>`);
  lines.push('');

  if (result.mainKeyword) {
    const kw = result.mainKeyword;
    lines.push(`📊 <b>Volume :</b> ${kw.searchVolume.toLocaleString('fr-FR')}/mois`);
    if (kw.cpc) lines.push(`💰 <b>CPC :</b> ${kw.cpc.toFixed(2)}€`);
    if (kw.competition) lines.push(`⚔️ <b>Concurrence :</b> ${kw.competition}`);
    if (kw.keywordDifficulty) lines.push(`📈 <b>KD :</b> ${kw.keywordDifficulty}/100`);

    if (kw.trend.length > 0) {
      const trendEmoji = kw.trend[0] > kw.trend[kw.trend.length - 1] ? '📈' : '📉';
      lines.push(`${trendEmoji} <b>Tendance :</b> ${kw.trend.slice(0, 6).join(' → ')}`);
    }
  } else {
    lines.push('❌ Aucun volume détecté pour ce mot-clé');
  }

  if (result.relatedKeywords.length > 0) {
    lines.push('');
    lines.push(`🔗 <b>Mots-clés liés (${result.relatedKeywords.length}) :</b>`);
    for (const kw of result.relatedKeywords.slice(0, 15)) {
      const cpcStr = kw.cpc ? ` | ${kw.cpc.toFixed(2)}€` : '';
      const kdStr = kw.keywordDifficulty ? ` | KD ${kw.keywordDifficulty}` : '';
      lines.push(`• <code>${kw.keyword}</code> — ${kw.searchVolume}/mois${cpcStr}${kdStr}`);
    }

    if (result.relatedKeywords.length > 15) {
      lines.push(`<i>... et ${result.relatedKeywords.length - 15} autres</i>`);
    }
  }

  return lines.join('\n');
}

/**
 * Formate l'analyse concurrentielle pour Telegram.
 */
export function formatGapAnalysisForTelegram(
  ourDomain: string,
  gaps: KeywordIdea[]
): string {
  const lines: string[] = [];

  lines.push(`🎯 <b>Opportunités SEO pour ${ourDomain}</b>`);
  lines.push(`<i>Mots-clés que les concurrents ciblent et pas nous</i>`);
  lines.push('');

  if (gaps.length === 0) {
    lines.push('✅ Aucun gap détecté — bon boulot !');
    return lines.join('\n');
  }

  for (const kw of gaps.slice(0, 20)) {
    const cpcStr = kw.cpc ? ` | ${kw.cpc.toFixed(2)}€` : '';
    lines.push(`• <code>${kw.keyword}</code> — ${kw.searchVolume}/mois${cpcStr}`);
  }

  if (gaps.length > 20) {
    lines.push(`\n<i>... et ${gaps.length - 20} autres opportunités</i>`);
  }

  return lines.join('\n');
}

// ─── Credit Check ────────────────────────────────────────────

/**
 * Vérifier le solde de crédits DataForSEO.
 */
export async function checkBalance(): Promise<{ balance: number; currency: string }> {
  try {
    const response = await fetch(`${API_BASE}/appendix/user_data`, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
      },
    });

    const data = await response.json() as any;
    const money = data.tasks?.[0]?.result?.[0]?.money || {};

    return {
      balance: money.balance || 0,
      currency: money.currency || 'USD',
    };
  } catch (e) {
    logger.error(`DataForSEO balance check failed: ${(e as Error).message}`);
    return { balance: 0, currency: 'USD' };
  }
}
