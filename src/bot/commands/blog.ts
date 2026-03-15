import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import * as logger from '../../utils/logger.js';

let isBlogGenerating = false;

export function registerBlogCommand(bot: Bot<BotContext>) {
  // /blog garage entretien-voiture-ete
  // /blog — select site via keyboard
  bot.command('blog', async (ctx) => {
    if (isBlogGenerating) {
      await ctx.reply('Un article est déjà en cours de génération...');
      return;
    }

    const args = ctx.match?.trim() || '';
    const parts = args.split(/\s+/);
    const siteArg = parts[0];
    const subject = parts.slice(1).join(' ');

    if (!siteArg) {
      const keyboard = new InlineKeyboard();
      for (const key of Object.keys(sites)) {
        keyboard.text(sites[key].name, `blog:${key}`).row();
      }
      await ctx.reply('Article pour quel site ?', { reply_markup: keyboard });
      return;
    }

    if (!sites[siteArg]) {
      await ctx.reply(`Site inconnu: ${siteArg}\nDisponibles: ${Object.keys(sites).join(', ')}`);
      return;
    }

    if (!subject) {
      ctx.session.awaitingInput = `blog:${siteArg}`;
      await ctx.reply(`Quel sujet pour l'article sur <b>${sites[siteArg].name}</b> ?`, { parse_mode: 'HTML' });
      return;
    }

    await generateBlogArticle(ctx, siteArg, subject);
  });

  // Callback for site selection
  bot.callbackQuery(/^blog:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();
    ctx.session.awaitingInput = `blog:${siteKey}`;
    await ctx.editMessageText(`Quel sujet pour l'article sur <b>${sites[siteKey].name}</b> ?`, { parse_mode: 'HTML' });
  });

  // Handle text input for blog subject
  bot.on('message:text', async (ctx, next) => {
    const awaiting = ctx.session.awaitingInput;
    if (!awaiting?.startsWith('blog:')) {
      return next();
    }

    const siteKey = awaiting.replace('blog:', '');
    const subject = ctx.message.text.trim();
    ctx.session.awaitingInput = undefined;

    if (!subject) {
      await ctx.reply('Sujet vide. Commande annulée.');
      return;
    }

    await generateBlogArticle(ctx, siteKey, subject);
  });
}

async function generateBlogArticle(ctx: BotContext, siteKey: string, subject: string) {
  isBlogGenerating = true;
  const site = sites[siteKey];

  try {
    await ctx.reply(
      `Génération d'un article pour <b>${site.name}</b>\n` +
      `Sujet: <b>${subject}</b>\n\n` +
      `Claude travaille...`,
      { parse_mode: 'HTML' }
    );

    const anthropic = new Anthropic();

    const servicesList = site.services.map(s => s.name).join(', ');
    const prompt = `Tu es un expert en rédaction SEO pour des entreprises locales en France.

ENTREPRISE: ${site.name} — ${site.business}
VILLE: ${site.city} (${site.postalCode})
SERVICES: ${servicesList}
DOMAINE: ${site.domain}

Rédige un article de blog complet et optimisé SEO sur le sujet suivant: "${subject}"

L'article doit:
1. Faire entre 800 et 1200 mots
2. Avoir un H1 accrocheur avec le mot-clé principal + localisation
3. Avoir 3-5 sous-titres H2
4. Inclure naturellement des liens vers les services pertinents (format markdown)
5. Mentionner la ville et le département 66 naturellement
6. Terminer par un appel à l'action avec le numéro de téléphone: ${site.phone}
7. Être utile et informatif, PAS du remplissage

Retourne un JSON valide avec cette structure exacte:
{
  "slug": "le-slug-de-l-article",
  "title": "Le titre H1",
  "metaTitle": "Meta title (max 60 chars)",
  "metaDescription": "Meta description (max 155 chars)",
  "content": "Le contenu complet en markdown",
  "tags": ["tag1", "tag2", "tag3"]
}

Retourne UNIQUEMENT le JSON, sans markdown autour.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Pas de JSON dans la réponse Claude');
    const article = JSON.parse(jsonMatch[0]) as {
      slug: string;
      title: string;
      metaTitle: string;
      metaDescription: string;
      content: string;
      tags: string[];
    };

    // Save article to site's blog data
    const blogDir = `${site.projectPath}/data`;
    if (!existsSync(blogDir)) mkdirSync(blogDir, { recursive: true });

    const blogFile = `${blogDir}/blog-articles.ts`;
    const now = new Date().toISOString();

    const articleEntry = {
      slug: article.slug,
      title: article.title,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      content: article.content,
      tags: article.tags,
      publishedAt: now,
    };

    if (!existsSync(blogFile)) {
      writeFileSync(blogFile, `// Auto-generated blog articles
// Managed by seo-automation bot

export interface BlogArticle {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  tags: string[];
  publishedAt: string;
}

export const blogArticles: BlogArticle[] = [
  ${JSON.stringify(articleEntry, null, 2)},
];

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return blogArticles.find(a => a.slug === slug);
}
`, 'utf-8');
    } else {
      let content = readFileSync(blogFile, 'utf-8');
      content = content.replace(
        /export const blogArticles: BlogArticle\[] = \[/,
        `export const blogArticles: BlogArticle[] = [\n  ${JSON.stringify(articleEntry, null, 2)},`
      );
      writeFileSync(blogFile, content, 'utf-8');
    }

    await ctx.reply(
      `<b>Article publié !</b>\n\n` +
      `<b>${article.title}</b>\n\n` +
      `Slug: <code>${article.slug}</code>\n` +
      `Tags: ${article.tags.join(', ')}\n` +
      `Fichier: <code>${blogFile}</code>\n\n` +
      `Note: Le deploy Vercel sera nécessaire pour mettre en ligne.`,
      { parse_mode: 'HTML' }
    );

  } catch (e) {
    await ctx.reply(`Erreur blog: ${(e as Error).message}`);
  } finally {
    isBlogGenerating = false;
  }
}
