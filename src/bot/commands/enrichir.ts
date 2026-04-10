import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { getSupabase, SeoPageRow, PageImageRow } from '../../db/supabase.js';
import { injectPages } from '../../deployers/inject-pages.js';
import { triggerDeploy } from '../../deployers/vercel-deploy.js';
import * as logger from '../../utils/logger.js';
import { mkdirSync, createWriteStream, unlinkSync } from 'fs';
import { join } from 'path';
import https from 'https';
import http from 'http';

const PAGES_PER_PAGE = 8;

interface EnrichmentData {
  photos: Array<{ filePath: string; fileUrl: string; altText: string }>;
  pricing: Array<{ service: string; price: string }>;
  testimonials: Array<{ author: string; text: string }>;
  trustSignals: string[];
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      try { unlinkSync(dest); } catch { /* ignore */ }
      reject(err);
    });
  });
}

async function getPublishedPages(siteKey: string): Promise<SeoPageRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('seo_pages')
    .select('*')
    .eq('site_key', siteKey)
    .in('status', ['published', 'optimized', 'draft'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getPublishedPages: ${error.message}`);
  return (data || []) as SeoPageRow[];
}

async function getPage(siteKey: string, slug: string): Promise<SeoPageRow | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('seo_pages')
    .select('*')
    .eq('site_key', siteKey)
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data as SeoPageRow;
}

export function registerEnrichirCommand(bot: Bot<BotContext>) {
  // /enrichir — start enrichment flow
  bot.command('enrichir', async (ctx) => {
    const keyboard = new InlineKeyboard();
    for (const key of Object.keys(sites)) {
      keyboard.text(`${sites[key].name}`, `enrichir_site:${key}`).row();
    }
    await ctx.reply(
      '<b>Enrichir une page</b>\n\n' +
      'Quel site veux-tu enrichir ?',
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Step 1: Site selected → show pages
  bot.callbackQuery(/^enrichir_site:(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    await ctx.answerCallbackQuery();

    if (!sites[siteKey]) {
      await ctx.editMessageText('Site inconnu.');
      return;
    }

    await showPageList(ctx, siteKey, 0);
  });

  // Pagination for page list
  bot.callbackQuery(/^enrichir_pages:(.+):(\d+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const offset = parseInt(ctx.match![2], 10);
    await ctx.answerCallbackQuery();
    await showPageList(ctx, siteKey, offset);
  });

  // Step 2: Page selected → enter enrichment mode
  bot.callbackQuery(/^enrichir_page:(.+):(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    await ctx.answerCallbackQuery();

    const page = await getPage(siteKey, slug);
    if (!page) {
      await ctx.editMessageText(`Page <code>${slug}</code> introuvable.`, { parse_mode: 'HTML' });
      return;
    }

    // Initialize enrichment session
    ctx.session.awaitingInput = 'enrichir';
    ctx.session.context = {
      siteKey,
      slug,
      data: {
        photos: [],
        pricing: [],
        testimonials: [],
        trustSignals: [],
      } as EnrichmentData,
    };

    await ctx.editMessageText(
      `<b>Mode enrichissement actif</b>\n\n` +
      `Site : <b>${sites[siteKey].name}</b>\n` +
      `Page : <code>${slug}</code>\n\n` +
      `Envoie du contenu :\n\n` +
      `📸 <b>Photos</b> — envoie directement des images\n\n` +
      `💰 <b>Prix</b> — <code>prix: vidange 89€, freins 149€</code>\n\n` +
      `⭐ <b>Avis</b> — <code>avis: Jean M. - Super garage, rapide et pas cher</code>\n\n` +
      `💎 <b>Info</b> — <code>info: 15 ans d'expérience, certifié Renault</code>\n\n` +
      `Tape /done quand tu as fini.`,
      { parse_mode: 'HTML' }
    );
  });

  // /done — finish enrichment
  bot.command('done', async (ctx) => {
    if (ctx.session.awaitingInput !== 'enrichir') {
      return;
    }

    const sessionCtx = ctx.session.context as Record<string, unknown>;
    const siteKey = sessionCtx.siteKey as string;
    const slug = sessionCtx.slug as string;
    const data = sessionCtx.data as EnrichmentData;

    const totalItems = data.photos.length + data.pricing.length + data.testimonials.length + data.trustSignals.length;

    if (totalItems === 0) {
      ctx.session.awaitingInput = undefined;
      ctx.session.context = undefined;
      await ctx.reply('Aucun enrichissement capturé. Mode enrichissement terminé.');
      return;
    }

    await ctx.reply('⏳ Sauvegarde des enrichissements...');

    try {
      // 1. Save photos to disk + page_images table
      if (data.photos.length > 0) {
        const site = sites[siteKey];
        const imagesDir = join(site.projectPath, 'public/images', slug);
        mkdirSync(imagesDir, { recursive: true });

        const db = getSupabase();
        for (let i = 0; i < data.photos.length; i++) {
          const photo = data.photos[i];
          const fileName = `${slug}-enrichir-${Date.now()}-${i + 1}.jpg`;
          const destPath = join(imagesDir, fileName);

          await downloadFile(photo.fileUrl, destPath);
          photo.filePath = `/images/${slug}/${fileName}`;

          // Insert into page_images table
          const imageRow: PageImageRow = {
            site_key: siteKey,
            slug: slug,
            image_type: 'real',
            file_path: photo.filePath,
            alt_text: photo.altText || `${sites[siteKey].name} - ${slug}`,
          };
          // Use insert instead of upsert since we want multiple images per page
          await db.from('page_images').insert(imageRow);
        }
      }

      // 2. Update seo_pages.content JSONB with pricing, testimonials, trust signals
      const page = await getPage(siteKey, slug);
      if (page) {
        const content = { ...(page.content as Record<string, unknown>) };
        let updated = false;

        // Merge pricing
        if (data.pricing.length > 0) {
          const existingPricing = (content.pricing || []) as Array<{ service: string; price: string }>;
          content.pricing = [...existingPricing, ...data.pricing];
          updated = true;
        }

        // Merge testimonials
        if (data.testimonials.length > 0) {
          const existingTestimonials = (content.testimonials || []) as Array<{ author: string; text: string }>;
          content.testimonials = [...existingTestimonials, ...data.testimonials];
          updated = true;
        }

        // Merge trust signals
        if (data.trustSignals.length > 0) {
          const existingSignals = (content.trustSignals || []) as string[];
          content.trustSignals = [...existingSignals, ...data.trustSignals];
          updated = true;
        }

        // Add photo paths to content
        if (data.photos.length > 0) {
          const existingImages = (content.images || []) as string[];
          const newPaths = data.photos.map(p => p.filePath).filter(Boolean);
          content.images = [...existingImages, ...newPaths];
          updated = true;
        }

        if (updated) {
          const db = getSupabase();
          const { error } = await db
            .from('seo_pages')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('site_key', siteKey)
            .eq('slug', slug);
          if (error) throw new Error(error.message);
        }
      }

      // 3. Build summary
      const lines: string[] = ['<b>Enrichissement sauvegardé</b>\n'];
      lines.push(`Site : <b>${sites[siteKey].name}</b>`);
      lines.push(`Page : <code>${slug}</code>\n`);
      if (data.photos.length > 0) lines.push(`📸 ${data.photos.length} photo(s)`);
      if (data.pricing.length > 0) lines.push(`💰 ${data.pricing.length} tarif(s)`);
      if (data.testimonials.length > 0) lines.push(`⭐ ${data.testimonials.length} avis`);
      if (data.trustSignals.length > 0) lines.push(`💎 ${data.trustSignals.length} info(s)`);

      const keyboard = new InlineKeyboard();
      keyboard.text('🚀 Redéployer', `enrichir_deploy:${siteKey}:${slug}`).row();
      keyboard.text('Terminer', `enrichir_close`).row();

      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: keyboard });
      logger.info(`Enrichment saved for ${siteKey}/${slug}: ${data.photos.length} photos, ${data.pricing.length} pricing, ${data.testimonials.length} testimonials, ${data.trustSignals.length} trust signals`);

    } catch (e) {
      await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
      logger.error(`Enrichment save failed: ${(e as Error).message}`);
    }

    ctx.session.awaitingInput = undefined;
    ctx.session.context = undefined;
  });

  // Deploy after enrichment
  bot.callbackQuery(/^enrichir_deploy:(.+):(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(`🚀 Déploiement de <b>${sites[siteKey].name}</b>...`, { parse_mode: 'HTML' });

    try {
      const page = await getPage(siteKey, slug);
      if (page) {
        await injectPages(siteKey, [page]);
      }
      const ok = await triggerDeploy(siteKey);
      await ctx.reply(
        ok
          ? `✅ <b>${sites[siteKey].name}</b> redéployé — en ligne dans ~1 min`
          : `❌ Échec du déploiement`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
    }
  });

  // Close enrichment summary
  bot.callbackQuery('enrichir_close', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('✅ Enrichissement terminé.');
  });

  // Photo handler for enrichment
  bot.on('message:photo', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'enrichir') return next();

    const sessionCtx = ctx.session.context as Record<string, unknown>;
    const data = sessionCtx.data as EnrichmentData;
    const siteKey = sessionCtx.siteKey as string;
    const slug = sessionCtx.slug as string;

    // Get highest resolution photo
    const photos = ctx.message.photo;
    const biggestPhoto = photos[photos.length - 1];
    const file = await ctx.api.getFile(biggestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const altText = ctx.message.caption || `${sites[siteKey].name} - ${slug}`;

    data.photos.push({
      filePath: '', // Will be set when saving
      fileUrl,
      altText,
    });

    await ctx.reply(`📸 Photo ${data.photos.length} reçue.${ctx.message.caption ? ` Alt: "${altText}"` : ''} Envoie d'autres photos ou tape /done.`);
  });

  // Text handler for enrichment (prix, avis, info)
  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'enrichir') return next();

    const sessionCtx = ctx.session.context as Record<string, unknown>;
    const data = sessionCtx.data as EnrichmentData;
    const text = ctx.message.text.trim();

    // Skip /done — handled by command handler
    if (text.startsWith('/')) return next();

    // Parse prix: ...
    const prixMatch = text.match(/^prix\s*:\s*(.+)$/i);
    if (prixMatch) {
      const items = prixMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      for (const item of items) {
        // "vidange 89€" or "freins 149€" or "vidange: 89€"
        const parts = item.match(/^(.+?)\s*[:—-]?\s*(\d+\s*€?)$/);
        if (parts) {
          data.pricing.push({ service: parts[1].trim(), price: parts[2].trim() });
        } else {
          // Store as-is
          data.pricing.push({ service: item, price: '' });
        }
      }
      await ctx.reply(`💰 ${items.length} tarif(s) ajouté(s). Total: ${data.pricing.length}`);
      return;
    }

    // Parse avis: ...
    const avisMatch = text.match(/^avis\s*:\s*(.+)$/i);
    if (avisMatch) {
      const raw = avisMatch[1];
      // "Jean M. - Super garage, rapide et pas cher"
      const dashParts = raw.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      if (dashParts) {
        data.testimonials.push({ author: dashParts[1].trim(), text: dashParts[2].trim() });
      } else {
        data.testimonials.push({ author: 'Client', text: raw.trim() });
      }
      await ctx.reply(`⭐ Avis ajouté. Total: ${data.testimonials.length}`);
      return;
    }

    // Parse info: ...
    const infoMatch = text.match(/^info\s*:\s*(.+)$/i);
    if (infoMatch) {
      data.trustSignals.push(infoMatch[1].trim());
      await ctx.reply(`💎 Info ajoutée. Total: ${data.trustSignals.length}`);
      return;
    }

    // Unknown format
    await ctx.reply(
      'Format non reconnu. Utilise :\n\n' +
      '<code>prix: vidange 89€, freins 149€</code>\n' +
      '<code>avis: Jean M. - Super garage</code>\n' +
      '<code>info: 15 ans d\'expérience</code>\n\n' +
      'Ou envoie une photo. Tape /done pour terminer.',
      { parse_mode: 'HTML' }
    );
  });

  // Back to site selection
  bot.callbackQuery('enrichir_back_sites', async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard();
    for (const key of Object.keys(sites)) {
      keyboard.text(`${sites[key].name}`, `enrichir_site:${key}`).row();
    }
    await ctx.editMessageText(
      '<b>Enrichir une page</b>\n\n' +
      'Quel site veux-tu enrichir ?',
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });
}

// --- Helper functions ---

async function showPageList(ctx: BotContext, siteKey: string, offset: number) {
  try {
    const pages = await getPublishedPages(siteKey);

    if (pages.length === 0) {
      await ctx.editMessageText(
        `Aucune page trouvée pour <b>${sites[siteKey].name}</b>.`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    const pageSlice = pages.slice(offset, offset + PAGES_PER_PAGE);
    const keyboard = new InlineKeyboard();

    for (const page of pageSlice) {
      const label = truncate(`${page.slug}`, 40);
      keyboard.text(label, `enrichir_page:${siteKey}:${page.slug}`).row();
    }

    // Pagination
    const navRow: Array<{ text: string; data: string }> = [];
    if (offset > 0) {
      navRow.push({ text: '← Précédent', data: `enrichir_pages:${siteKey}:${Math.max(0, offset - PAGES_PER_PAGE)}` });
    }
    if (offset + PAGES_PER_PAGE < pages.length) {
      navRow.push({ text: 'Suivant →', data: `enrichir_pages:${siteKey}:${offset + PAGES_PER_PAGE}` });
    }
    if (navRow.length > 0) {
      for (const btn of navRow) {
        keyboard.text(btn.text, btn.data);
      }
      keyboard.row();
    }

    keyboard.text('← Retour sites', `enrichir_back_sites`).row();

    const total = pages.length;
    const showing = `${offset + 1}-${Math.min(offset + PAGES_PER_PAGE, total)}`;

    await ctx.editMessageText(
      `<b>${sites[siteKey].name}</b> — Pages (${showing} sur ${total})\n\n` +
      `Quelle page enrichir ?`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  } catch (e) {
    await ctx.editMessageText(`❌ Erreur: ${(e as Error).message}`);
  }
}

function truncate(str: string, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '...' : str;
}
