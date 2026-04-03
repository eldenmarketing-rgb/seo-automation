import * as logger from '../utils/logger.js';

export interface KeywordSuggestion {
  keyword: string;
  type: 'short' | 'long';
  source: string;
}

/**
 * Quick keyword suggestions for pre-generation injection.
 * Uses only 4-5 seeds (no alphabet expansion) for speed.
 * Returns max 15 keywords.
 */
export async function quickKeywordSuggestions(
  topic: string,
  location: string = 'perpignan',
  department: string = '66',
): Promise<KeywordSuggestion[]> {
  const seeds = [
    `${topic} ${location}`,
    `${topic} ${location} prix`,
    `${topic} ${location} avis`,
    `meilleur ${topic} ${location}`,
    `${topic} ${department}`,
  ];

  const seen = new Set<string>();
  const results: KeywordSuggestion[] = [];

  // Sequential with 500ms delay to avoid rate-limiting
  const batchResults: string[][] = [];
  for (const seed of seeds) {
    const suggestions = await googleSuggest(seed);
    batchResults.push(suggestions);
    await new Promise(r => setTimeout(r, 500));
  }

  for (const suggestions of batchResults) {
    for (const kw of suggestions) {
      const normalized = kw.toLowerCase().trim();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const wordCount = normalized.split(/\s+/).length;
      results.push({
        keyword: normalized,
        type: wordCount <= 3 ? 'short' : 'long',
        source: 'google_suggest_quick',
      });
    }
  }

  // Sort: long tail first
  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'long' ? -1 : 1;
    return a.keyword.localeCompare(b.keyword, 'fr');
  });

  return results.slice(0, 15);
}

/**
 * Analyze competitor keywords by searching for their brand + services.
 * Finds keywords they rank for that we might be missing.
 */
export async function competitorKeywords(
  ourTopic: string,
  competitors: string[],
  location: string = 'perpignan',
): Promise<KeywordSuggestion[]> {
  const seen = new Set<string>();
  const results: KeywordSuggestion[] = [];

  for (const competitor of competitors) {
    const seeds = [
      `${competitor} ${location}`,
      `${competitor} ${ourTopic} ${location}`,
      `${ourTopic} ${location} vs ${competitor}`,
      `${competitor} avis`,
      `${competitor} prix`,
    ];

    for (const seed of seeds) {
      const suggestions = await googleSuggest(seed);
      for (const kw of suggestions) {
        const normalized = kw.toLowerCase().trim();
        // Only keep keywords relevant to our topic (not brand-specific)
        if (seen.has(normalized)) continue;
        if (normalized.includes(competitor.toLowerCase()) && !normalized.includes(ourTopic.toLowerCase())) continue;
        seen.add(normalized);

        results.push({
          keyword: normalized,
          type: normalized.split(/\s+/).length <= 3 ? 'short' : 'long',
          source: `competitor:${competitor}`,
        });
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

/**
 * Fetch Google Autocomplete suggestions for a seed keyword.
 * Free, no API key needed — uses the public autocomplete endpoint.
 * Retries once with 2s backoff if rate-limited (HTML response).
 */
async function googleSuggest(seed: string, retryCount = 0): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=fr&gl=fr&q=${encodeURIComponent(seed)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Detect HTML (rate-limit / captcha) response
    if (text.startsWith('<') || contentType.includes('text/html')) {
      if (retryCount === 0) {
        const backoff = 2000 + Math.random() * 1000;
        logger.warn(`Google Suggest rate-limited for "${seed}", retrying in ${Math.round(backoff)}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        return googleSuggest(seed, 1);
      }
      logger.warn(`Google Suggest still rate-limited for "${seed}" after retry, returning empty`);
      return [];
    }

    const data = JSON.parse(text) as [string, string[]];
    return data[1] || [];
  } catch (e) {
    logger.warn(`Google Suggest failed for "${seed}": ${(e as Error).message}`);
    return [];
  }
}

/**
 * Research keywords for a topic + location.
 * Uses multiple seed variations to maximize suggestions.
 */
export async function researchKeywords(
  topic: string,
  location: string = 'perpignan',
  department: string = '66',
): Promise<KeywordSuggestion[]> {
  const seeds = [
    `${topic} ${location}`,
    `${topic} ${location} prix`,
    `${topic} ${location} pas cher`,
    `${topic} ${location} avis`,
    `${topic} près de ${location}`,
    `${topic} ${department}`,
    `meilleur ${topic} ${location}`,
    `${topic} à ${location}`,
    // Intent variations
    `${topic} urgent ${location}`,
    `${topic} tarif ${location}`,
    `${topic} devis ${location}`,
    `${topic} horaire ${location}`,
  ];

  // Alphabet expansion: "taxi perpignan a", "taxi perpignan b", etc.
  const alphaSeeds = 'abcdefghijklmnopqrstuvwxyz'.split('').map(
    letter => `${topic} ${location} ${letter}`
  );

  const allSeeds = [...seeds, ...alphaSeeds];
  const seen = new Set<string>();
  const results: KeywordSuggestion[] = [];

  // Sequential with 500ms delay to avoid rate-limiting
  for (const seed of allSeeds) {
    const suggestions = await googleSuggest(seed);

    for (const kw of suggestions) {
      const normalized = kw.toLowerCase().trim();
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const wordCount = normalized.split(/\s+/).length;
      results.push({
        keyword: normalized,
        type: wordCount <= 3 ? 'short' : 'long',
        source: 'google_suggest',
      });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Sort: long tail first (more specific = easier to rank), then alphabetically
  results.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'long' ? -1 : 1;
    return a.keyword.localeCompare(b.keyword, 'fr');
  });

  logger.info(`Keyword research for "${topic} ${location}": ${results.length} keywords found`);
  return results;
}

/**
 * Format keyword research results for Telegram display.
 */
export function formatKeywordsForTelegram(
  keywords: KeywordSuggestion[],
  topic: string,
): string {
  const shortTail = keywords.filter(k => k.type === 'short');
  const longTail = keywords.filter(k => k.type === 'long');

  let msg = `<b>🔍 Recherche de mots-clés : "${topic}"</b>\n\n`;

  msg += `<b>📌 Courte traîne (${shortTail.length})</b>\n`;
  for (const kw of shortTail.slice(0, 10)) {
    msg += `  • ${kw.keyword}\n`;
  }
  if (shortTail.length > 10) {
    msg += `  <i>... et ${shortTail.length - 10} autres</i>\n`;
  }

  msg += `\n<b>🎯 Longue traîne (${longTail.length})</b>\n`;
  for (const kw of longTail.slice(0, 15)) {
    msg += `  • ${kw.keyword}\n`;
  }
  if (longTail.length > 15) {
    msg += `  <i>... et ${longTail.length - 15} autres</i>\n`;
  }

  msg += `\n<b>Total : ${keywords.length} mots-clés trouvés</b>`;
  return msg;
}

/**
 * Suggest page ideas based on keyword research.
 * Groups keywords into potential page topics.
 */
export function suggestPages(
  keywords: KeywordSuggestion[],
  topic: string,
  location: string,
): Array<{ title: string; targetKeywords: string[]; type: 'service' | 'blog' | 'faq' }> {
  const pages: Array<{ title: string; targetKeywords: string[]; type: 'service' | 'blog' | 'faq' }> = [];

  // Group keywords by intent
  const priceKws = keywords.filter(k => /prix|tarif|co[uû]t|pas cher|combien/.test(k.keyword));
  const infoKws = keywords.filter(k => /comment|quand|pourquoi|quel|difference|vs/.test(k.keyword));
  const urgentKws = keywords.filter(k => /urgent|nuit|24h|dimanche|weekend|jour férié/.test(k.keyword));
  const aviKws = keywords.filter(k => /avis|meilleur|fiable|confiance|recommand/.test(k.keyword));
  const serviceKws = keywords.filter(k =>
    !priceKws.includes(k) && !infoKws.includes(k) && !urgentKws.includes(k) && !aviKws.includes(k)
  );

  // Service pages (transactional intent)
  if (serviceKws.length > 0) {
    pages.push({
      title: `${topic} à ${location}`,
      targetKeywords: serviceKws.slice(0, 8).map(k => k.keyword),
      type: 'service',
    });
  }

  // Price page
  if (priceKws.length >= 2) {
    pages.push({
      title: `Prix ${topic} ${location} — Tarifs et devis`,
      targetKeywords: priceKws.map(k => k.keyword),
      type: 'blog',
    });
  }

  // Urgent/special hours page
  if (urgentKws.length >= 2) {
    pages.push({
      title: `${topic} urgent ${location} — Disponible 24h/7j`,
      targetKeywords: urgentKws.map(k => k.keyword),
      type: 'service',
    });
  }

  // FAQ page (informational intent)
  if (infoKws.length >= 3) {
    pages.push({
      title: `FAQ ${topic} ${location} — Questions fréquentes`,
      targetKeywords: infoKws.map(k => k.keyword),
      type: 'faq',
    });
  }

  // Review/comparison page
  if (aviKws.length >= 2) {
    pages.push({
      title: `Meilleur ${topic} ${location} — Avis et comparatif`,
      targetKeywords: aviKws.map(k => k.keyword),
      type: 'blog',
    });
  }

  return pages;
}
