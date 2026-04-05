/**
 * SERP Competitor Analysis
 * 
 * Analyse les pages top 3 de Google pour une requête donnée.
 * Extrait : termes manquants, structure (H2), longueur de contenu, FAQ.
 * Injecte les résultats dans le prompt pour que le contenu généré surpasse les concurrents.
 * 
 * Utilise DataForSEO SERP API pour récupérer les résultats Google,
 * puis fetch le contenu des pages pour analyse.
 * 
 * Coût : ~0.002$ par requête SERP + temps de fetch des pages.
 */

import * as logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const API_BASE = 'https://api.dataforseo.com/v3';

// ─── Types ───────────────────────────────────────────────────

export interface SerpCompetitor {
  position: number;
  url: string;
  title: string;
  description: string;
  domain: string;
}

export interface ContentAnalysis {
  url: string;
  wordCount: number;
  headings: string[];          // H2 extraits
  keyTerms: string[];          // Termes fréquents (TF)
  hasFaq: boolean;
  faqCount: number;
  hasSchema: boolean;
}

export interface SerpInsight {
  query: string;
  competitors: SerpCompetitor[];
  contentAnalyses: ContentAnalysis[];
  missingTerms: string[];      // Termes présents chez les concurrents mais pas dans notre requête
  averageWordCount: number;
  recommendedStructure: string[];  // H2 suggérés
  promptBlock: string;         // Bloc prêt à injecter dans le prompt
}

// ─── SERP Fetch ──────────────────────────────────────────────

async function fetchSerpResults(query: string): Promise<SerpCompetitor[]> {
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    logger.warn('DataForSEO not configured — SERP analysis skipped');
    return [];
  }

  try {
    const auth = 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
    
    const response = await fetch(`${API_BASE}/serp/google/organic/live/advanced`, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        keyword: query,
        location_code: 2250,  // France
        language_code: 'fr',
        device: 'desktop',
        depth: 5,             // Top 5 seulement
      }]),
    });

    const data = await response.json() as any;
    const items = data.tasks?.[0]?.result?.[0]?.items || [];

    return items
      .filter((item: any) => item.type === 'organic')
      .slice(0, 3)
      .map((item: any) => ({
        position: item.rank_absolute || 0,
        url: item.url || '',
        title: item.title || '',
        description: item.description || '',
        domain: item.domain || '',
      }));
  } catch (e) {
    logger.error(`SERP fetch failed for "${query}": ${(e as Error).message}`);
    return [];
  }
}

// ─── Content Analysis ────────────────────────────────────────

async function analyzePageContent(url: string): Promise<ContentAnalysis | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();

    // Extraire les H2
    const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
    const headings = h2Matches
      .map(h => h.replace(/<[^>]+>/g, '').trim())
      .filter(h => h.length > 5 && h.length < 200);

    // Compter les mots (texte brut)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const wordCount = textContent.split(/\s+/).length;

    // Extraire les termes fréquents (simple TF)
    const words = textContent.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4)
      .filter(w => !['cette', 'votre', 'notre', 'leurs', 'entre', 'aussi', 'toute', 'comme', 'apres', 'avant', 'depuis', 'encore', 'meme', 'plus'].includes(w));
    
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    const keyTerms = [...freq.entries()]
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);

    // Détecter FAQ
    const hasFaq = /faq|question|frequen/i.test(html);
    const faqCount = (html.match(/<(dt|h3|h4)[^>]*>.*?\?/gi) || []).length;

    // Détecter Schema.org
    const hasSchema = /application\/ld\+json/i.test(html);

    return { url, wordCount, headings, keyTerms, hasFaq, faqCount, hasSchema };
  } catch (e) {
    logger.warn(`Content analysis failed for ${url}: ${(e as Error).message}`);
    return null;
  }
}

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Analyse complète de la SERP pour une requête.
 * Retourne un bloc prêt à injecter dans le prompt.
 */
export async function analyzeSerpForPrompt(query: string): Promise<SerpInsight | null> {
  logger.info(`SERP analysis for: "${query}"`);
  
  // 1. Récupérer les résultats SERP
  const competitors = await fetchSerpResults(query);
  if (competitors.length === 0) {
    logger.warn(`No SERP results for "${query}"`);
    return null;
  }

  // 2. Analyser le contenu de chaque concurrent
  const analyses: ContentAnalysis[] = [];
  for (const comp of competitors.slice(0, 3)) {
    const analysis = await analyzePageContent(comp.url);
    if (analysis) analyses.push(analysis);
  }

  if (analyses.length === 0) return null;

  // 3. Calculer les insights
  const avgWordCount = Math.round(analyses.reduce((sum, a) => sum + a.wordCount, 0) / analyses.length);
  
  // Termes communs aux concurrents (apparaissent chez 2+ concurrents)
  const termFreq = new Map<string, number>();
  for (const analysis of analyses) {
    for (const term of analysis.keyTerms) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    }
  }
  const missingTerms = [...termFreq.entries()]
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term]) => term);

  // H2 communs
  const allHeadings = analyses.flatMap(a => a.headings);
  const recommendedStructure = [...new Set(allHeadings)].slice(0, 8);

  // 4. Construire le bloc prompt
  const promptBlock = buildSerpPromptBlock(query, competitors, analyses, missingTerms, avgWordCount, recommendedStructure);

  return {
    query,
    competitors,
    contentAnalyses: analyses,
    missingTerms,
    averageWordCount: avgWordCount,
    recommendedStructure,
    promptBlock,
  };
}

function buildSerpPromptBlock(
  query: string,
  competitors: SerpCompetitor[],
  analyses: ContentAnalysis[],
  missingTerms: string[],
  avgWordCount: number,
  structure: string[]
): string {
  const parts: string[] = [];

  parts.push(`═══ ANALYSE CONCURRENTIELLE (TOP 3 GOOGLE pour "${query}") ═══`);
  parts.push('');

  for (let i = 0; i < Math.min(competitors.length, 3); i++) {
    const comp = competitors[i];
    const analysis = analyses[i];
    parts.push(`#${comp.position} — ${comp.domain}`);
    parts.push(`  Title : "${comp.title}"`);
    if (analysis) {
      parts.push(`  Mots : ${analysis.wordCount} | H2 : ${analysis.headings.length} | FAQ : ${analysis.faqCount} | Schema : ${analysis.hasSchema ? 'oui' : 'non'}`);
    }
  }

  parts.push('');
  parts.push(`LONGUEUR CIBLE : ${Math.max(avgWordCount + 200, 1200)} mots minimum (concurrents : ${avgWordCount} mots en moyenne)`);

  if (missingTerms.length > 0) {
    parts.push('');
    parts.push(`TERMES SÉMANTIQUES À INTÉGRER (présents chez les concurrents) :`);
    parts.push(missingTerms.map(t => `- ${t}`).join('\n'));
  }

  if (structure.length > 0) {
    parts.push('');
    parts.push(`STRUCTURE H2 DES CONCURRENTS (inspire-toi, ne copie pas) :`);
    parts.push(structure.map(h => `- ${h}`).join('\n'));
  }

  parts.push('');
  parts.push(`OBJECTIF : Ton contenu doit être PLUS complet, MIEUX structuré et PLUS utile que les 3 premiers résultats ci-dessus.`);

  return parts.join('\n');
}

/**
 * Version légère : juste les termes manquants, sans fetcher les pages.
 * Moins coûteux, utilisable dans le daily-generate pour enrichir les prompts.
 */
export async function quickSerpTerms(query: string): Promise<string[]> {
  const competitors = await fetchSerpResults(query);
  if (competitors.length === 0) return [];

  // Extraire les termes depuis les descriptions SERP uniquement (pas de fetch)
  const allTerms: string[] = [];
  for (const comp of competitors) {
    const text = `${comp.title} ${comp.description}`.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4);
    allTerms.push(...text);
  }

  const freq = new Map<string, number>();
  for (const w of allTerms) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  return [...freq.entries()]
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);
}
