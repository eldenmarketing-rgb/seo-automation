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
import { withDfsCache } from '../dataforseo/cache.js';
import { env } from '../config/env.js';

const DATAFORSEO_LOGIN = env.DATAFORSEO_LOGIN ?? '';
const DATAFORSEO_PASSWORD = env.DATAFORSEO_PASSWORD ?? '';
const API_BASE = 'https://api.dataforseo.com/v3';

/**
 * Mots écartés de l'extraction TF. La liste d'origine (14 mots grammaticaux)
 * laissait passer le boilerplate des plateformes de réservation et des avis
 * clients : sur « massage intuitif perpignan », le top 3 (Fresha, Planity)
 * faisait remonter « merci », « moment », « experience » — et le rédacteur,
 * sommé de les intégrer, écrivait des phrases dont le seul but était de caser
 * le mot (« Merci de préciser vos disponibilités... »). Termes normalisés
 * NFD sans accents, comme le texte comparé.
 */
const STOP_WORDS = new Set([
  // grammaticaux
  'cette',
  'votre',
  'notre',
  'leurs',
  'entre',
  'aussi',
  'toute',
  'toutes',
  'comme',
  'apres',
  'avant',
  'depuis',
  'encore',
  'meme',
  'plus',
  'chaque',
  'ainsi',
  'alors',
  'autre',
  'autres',
  'celle',
  'celui',
  'quand',
  'était',
  'etait',
  'etre',
  'faire',
  'peuvent',
  'toujours',
  'jamais',
  'beaucoup',
  'vraiment',
  // politesse et avis clients
  'merci',
  'bonjour',
  'bonsoir',
  'moment',
  'moments',
  'super',
  'genial',
  'parfait',
  'sympa',
  'agreable',
  'recommande',
  'vivement',
  'experience',
  'experiences',
  // interface des plateformes de réservation
  'cliquez',
  'decouvrez',
  'reserver',
  'reservez',
  'rendez',
  'ligne',
  'compte',
  'connexion',
  'propos',
  'horaires',
  'ouverture',
]);

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
  headings: string[]; // H2 extraits
  subHeadings: string[]; // H3 extraits — profondeur de la structure
  keyTerms: string[]; // Termes fréquents (TF)
  hasFaq: boolean;
  faqCount: number;
  hasSchema: boolean;
  // Structure du contenu : sert à décider ce qu'on exige de NOS pages plutôt
  // que d'appliquer une règle fixe (un tableau n'a de sens que si la SERP en
  // montre).
  tableCount: number;
  listCount: number;
  avgSentenceWords: number;
}

/**
 * Ce que la SERP dit de la forme attendue. Sert à activer ou désactiver des
 * critères de notre score : exiger un tableau alors qu'aucun concurrent n'en
 * a, c'est inventer une règle que Google ne récompense pas.
 */
export interface SerpStructure {
  analyzed: number;
  withTable: number;
  withList: number;
  withH3: number;
  withFaq: number;
  avgSections: number;
  avgSubHeadings: number;
  avgSentenceWords: number;
}

export interface SerpInsight {
  query: string;
  competitors: SerpCompetitor[];
  contentAnalyses: ContentAnalysis[];
  missingTerms: string[]; // Termes présents chez les concurrents mais pas dans notre requête
  averageWordCount: number;
  recommendedStructure: string[]; // H2 suggérés
  structure: SerpStructure;
  promptBlock: string; // Bloc prêt à injecter dans le prompt
}

// ─── SERP Fetch ──────────────────────────────────────────────

async function fetchSerpResults(query: string): Promise<SerpCompetitor[]> {
  if (!DATAFORSEO_LOGIN || !DATAFORSEO_PASSWORD) {
    logger.warn('DataForSEO not configured — SERP analysis skipped');
    return [];
  }

  try {
    const auth = 'Basic ' + Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

    const endpoint = '/serp/google/organic/live/advanced';
    const body = [
      {
        keyword: query,
        location_code: 2250, // France
        language_code: 'fr',
        device: 'desktop',
        depth: 5, // Top 5 seulement
      },
    ];

    // Chaque brief déclenchait une SERP payante, même sur une requête déjà
    // achetée la veille. Cache 7 jours (W0.3).
    const data = await withDfsCache<any>(endpoint, body, async () => {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await response.json();
    });

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
      .map((h) => h.replace(/<[^>]+>/g, '').trim())
      .filter((h) => h.length > 5 && h.length < 200);

    // Compter les mots (texte brut)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const wordCount = textContent.split(/\s+/).length;

    // Extraire les termes fréquents (simple TF)
    const words = textContent
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .filter((w) => !STOP_WORDS.has(w));

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

    // H3 : indique si les concurrents structurent l'intérieur de leurs sections
    const subHeadings = (html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [])
      .map((h) => h.replace(/<[^>]+>/g, '').trim())
      .filter((h) => h.length > 3 && h.length < 200);

    // Un tableau de mise en page n'est pas un tableau de données : on exige au
    // moins deux lignes d'en-tête ou trois lignes de corps.
    const tableCount = (html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || []).filter(
      (t) => (t.match(/<th[^>]*>/gi) || []).length >= 2 || (t.match(/<tr[^>]*>/gi) || []).length >= 3,
    ).length;

    // Idem pour les listes : les menus de navigation en sont truffés, on ne
    // compte que celles qui portent du texte.
    const listCount = (html.match(/<[uo]l[^>]*>[\s\S]*?<\/[uo]l>/gi) || []).filter((l) => {
      const items = l.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      if (items.length < 3) return false;
      const avgLen = items.reduce((n, i) => n + i.replace(/<[^>]+>/g, '').trim().length, 0) / items.length;
      return avgLen > 25;
    }).length;

    const sentences = textContent.split(/[.!?…]+\s/).filter((s) => s.trim().split(/\s+/).length >= 3);
    const avgSentenceWords = sentences.length
      ? Math.round(
          (sentences.reduce((n, s) => n + s.trim().split(/\s+/).length, 0) / sentences.length) * 10,
        ) / 10
      : 0;

    return {
      url,
      wordCount,
      headings,
      subHeadings,
      keyTerms,
      hasFaq,
      faqCount,
      hasSchema,
      tableCount,
      listCount,
      avgSentenceWords,
    };
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
  // « Manquants » = absents de NOTRE requête. Sans ce filtre, « massage » et
  // « perpignan » étaient réclamés comme termes à intégrer sur la requête
  // « massage intuitif perpignan » — et le rédacteur les sur-répétait.
  const queryNorm = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const missingTerms = [...termFreq.entries()]
    .filter(([term, count]) => count >= 2 && !queryNorm.includes(term.replace(/s$/, '')))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term]) => term);

  // H2 communs
  const allHeadings = analyses.flatMap((a) => a.headings);
  const recommendedStructure = [...new Set(allHeadings)].slice(0, 8);

  const avg = (pick: (a: ContentAnalysis) => number) =>
    Math.round((analyses.reduce((n, a) => n + pick(a), 0) / analyses.length) * 10) / 10;

  const structure: SerpStructure = {
    analyzed: analyses.length,
    withTable: analyses.filter((a) => a.tableCount > 0).length,
    withList: analyses.filter((a) => a.listCount > 0).length,
    withH3: analyses.filter((a) => a.subHeadings.length >= 2).length,
    withFaq: analyses.filter((a) => a.faqCount >= 3).length,
    avgSections: avg((a) => a.headings.length),
    avgSubHeadings: avg((a) => a.subHeadings.length),
    avgSentenceWords: avg((a) => a.avgSentenceWords),
  };

  // 4. Construire le bloc prompt
  const promptBlock = buildSerpPromptBlock(
    query,
    competitors,
    analyses,
    missingTerms,
    avgWordCount,
    recommendedStructure,
    structure,
  );

  return {
    query,
    competitors,
    contentAnalyses: analyses,
    missingTerms,
    averageWordCount: avgWordCount,
    recommendedStructure,
    structure,
    promptBlock,
  };
}

function buildSerpPromptBlock(
  query: string,
  competitors: SerpCompetitor[],
  analyses: ContentAnalysis[],
  missingTerms: string[],
  avgWordCount: number,
  structure: string[],
  shape: SerpStructure,
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
      parts.push(
        `  Mots : ${analysis.wordCount} | H2 : ${analysis.headings.length} | FAQ : ${analysis.faqCount} | Schema : ${analysis.hasSchema ? 'oui' : 'non'}`,
      );
    }
  }

  parts.push('');
  parts.push(
    `LONGUEUR CIBLE : ${Math.max(avgWordCount + 200, 1200)} mots minimum (concurrents : ${avgWordCount} mots en moyenne)`,
  );

  if (missingTerms.length > 0) {
    parts.push('');
    parts.push(
      `TERMES OBSERVÉS CHEZ LES CONCURRENTS — à placer uniquement là où ils viennent naturellement, jamais dans une phrase écrite pour les caser :`,
    );
    parts.push(missingTerms.map((t) => `- ${t}`).join('\n'));
  }

  if (structure.length > 0) {
    parts.push('');
    parts.push(`STRUCTURE H2 DES CONCURRENTS (inspire-toi, ne copie pas) :`);
    parts.push(structure.map((h) => `- ${h}`).join('\n'));
  }

  if (shape.analyzed > 0) {
    parts.push('');
    parts.push(`FORME OBSERVÉE CHEZ LES ${shape.analyzed} PREMIERS :`);
    parts.push(`- Tableau de données : ${shape.withTable}/${shape.analyzed}`);
    parts.push(`- Listes à puces : ${shape.withList}/${shape.analyzed}`);
    parts.push(`- Sous-titres H3 : ${shape.withH3}/${shape.analyzed} (${shape.avgSubHeadings} en moyenne)`);
    parts.push(`- Bloc FAQ : ${shape.withFaq}/${shape.analyzed}`);
    parts.push(`- ${shape.avgSections} sections H2 et ${shape.avgSentenceWords} mots par phrase en moyenne`);
  }

  parts.push('');
  parts.push(
    `OBJECTIF : Ton contenu doit être PLUS complet, MIEUX structuré et PLUS utile que les 3 premiers résultats ci-dessus.`,
  );

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
    const text = `${comp.title} ${comp.description}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .filter((w) => !STOP_WORDS.has(w));
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
