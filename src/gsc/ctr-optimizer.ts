import Anthropic from '@anthropic-ai/sdk';
import { fetchGscData } from './client.js';
import { getSupabase } from '../db/supabase.js';
import { sites } from '../../config/sites.js';
import * as logger from '../utils/logger.js';

interface LowCtrPage {
  page_url: string;
  avg_position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  top_queries: string[];
}

export async function findLowCtrPages(siteKey: string): Promise<LowCtrPage[]> {
  const rows = await fetchGscData(siteKey, 28);
  if (rows.length === 0) return [];

  // Group by page
  const pageMap = new Map<string, { positions: number[]; impressions: number; clicks: number; queries: string[] }>();
  for (const row of rows) {
    const existing = pageMap.get(row.page_url) || { positions: [], impressions: 0, clicks: 0, queries: [] };
    existing.positions.push(row.position);
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    if (!existing.queries.includes(row.query)) existing.queries.push(row.query);
    pageMap.set(row.page_url, existing);
  }

  const results: LowCtrPage[] = [];
  for (const [url, data] of pageMap) {
    const avgPos = data.positions.reduce((a, b) => a + b, 0) / data.positions.length;
    const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;

    // Top 10 position but low CTR and enough impressions to be meaningful
    if (avgPos <= 10 && ctr < 3 && data.impressions >= 20) {
      results.push({
        page_url: url,
        avg_position: Math.round(avgPos * 10) / 10,
        impressions: data.impressions,
        clicks: data.clicks,
        ctr: Math.round(ctr * 100) / 100,
        top_queries: data.queries.slice(0, 5),
      });
    }
  }

  return results.sort((a, b) => b.impressions - a.impressions);
}

export async function optimizeCtrForPage(
  siteKey: string,
  page: LowCtrPage,
): Promise<{ metaTitle: string; metaDescription: string } | null> {
  const site = sites[siteKey];
  if (!site) return null;

  const db = getSupabase();
  const slug = page.page_url.split('/').pop() || '';

  // Get current page from DB
  const { data: seoPage } = await db
    .from('seo_pages')
    .select('meta_title, meta_description')
    .eq('site_key', siteKey)
    .eq('slug', slug)
    .single();

  if (!seoPage) return null;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Tu es un expert SEO spécialisé en optimisation du CTR (taux de clic).

Une page est en position #${page.avg_position} sur Google mais a un CTR de seulement ${page.ctr}% (${page.clicks} clics / ${page.impressions} impressions).

REQUÊTES PRINCIPALES :
${page.top_queries.map(q => `- "${q}"`).join('\n')}

TITRE ACTUEL : "${seoPage.meta_title}"
DESCRIPTION ACTUELLE : "${seoPage.meta_description}"

Réécris le titre et la description pour MAXIMISER le taux de clic :
- Titre : max 60 caractères, accrocheur, avec la requête principale
- Description : max 155 caractères, avec CTA, chiffres ou éléments de réassurance
- Utilise des power words (gratuit, rapide, meilleur, avis, prix...)
- Ajoute un sentiment d'urgence ou de bénéfice

Retourne UNIQUEMENT un JSON valide :
{"metaTitle": "...", "metaDescription": "..."}`
    }],
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]) as { metaTitle: string; metaDescription: string };

  // Update in DB
  await db
    .from('seo_pages')
    .update({
      meta_title: parsed.metaTitle,
      meta_description: parsed.metaDescription,
      updated_at: new Date().toISOString(),
    })
    .eq('site_key', siteKey)
    .eq('slug', slug);

  logger.success(`CTR optimized: ${slug} — "${parsed.metaTitle}"`);
  return parsed;
}
