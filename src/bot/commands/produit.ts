import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { triggerDeploy } from '../../deployers/vercel-deploy.js';
import * as logger from '../../utils/logger.js';
import { canAccessSite } from '../permissions.js';
import { readFileSync, writeFileSync, mkdirSync, createWriteStream, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const SITE_KEY = 'restaurant';
const site = sites[SITE_KEY];
const CATALOGUE_FILE = join(site.projectPath, 'data/catalogue.ts');

const CATEGORIES = [
  { slug: 'bieres', label: '🍺 Bières' },
  { slug: 'vins', label: '🍷 Vins' },
  { slug: 'spiritueux', label: '🥃 Spiritueux' },
  { slug: 'champagnes', label: '🥂 Champagnes' },
  { slug: 'soft-snacks', label: '🥤 Softs & Snacks' },
  { slug: 'packs', label: '🎉 Packs Soirée' },
  { slug: 'formules', label: '🍽️ Formules' },
];

interface ProductDraft {
  name?: string;
  category?: string;
  price?: number;
  volume?: string;
  description?: string;
  image?: string; // Telegram file URL
  popular?: boolean;
}

type ProduitStep = 'name' | 'category' | 'price' | 'volume' | 'description' | 'photo' | 'popular' | 'confirm';

const STEP_PROMPTS: Record<ProduitStep, string> = {
  name: '🏷️ <b>Nom du produit ?</b>\nEx: Heineken 33cl, Jack Daniel\'s 70cl...',
  category: '📂 <b>Catégorie ?</b>',
  price: '💰 <b>Prix ?</b>\nEx: 3.50, 25, 12...',
  volume: '📏 <b>Volume / Contenance ?</b>\nEx: 33cl, 75cl, 1.5L, Pack, 250g...',
  description: '✏️ <b>Description ?</b> (courte)\nOu tape "passer" pour laisser vide.',
  photo: '📸 <b>Envoie une photo du produit</b>\nOu tape "passer" pour continuer sans image.',
  popular: '⭐ <b>Produit populaire ?</b> (affiché en priorité)',
  confirm: '',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
    }).on('error', (err) => { unlinkSync(dest); reject(err); });
  });
}

function getProductsList(): Array<{ slug: string; name: string; price: number; category: string; available: boolean }> {
  try {
    const content = readFileSync(CATALOGUE_FILE, 'utf-8');
    const products: Array<{ slug: string; name: string; price: number; category: string; available: boolean }> = [];
    const regex = /slug:\s*["']([^"']+)["'].*?name:\s*["']([^"']+)["'].*?category:\s*["']([^"']+)["'].*?price:\s*([\d.]+).*?available:\s*(true|false)/gs;
    let match;
    while ((match = regex.exec(content)) !== null) {
      products.push({
        slug: match[1],
        name: match[2],
        category: match[3],
        price: parseFloat(match[4]),
        available: match[5] === 'true',
      });
    }
    return products;
  } catch {
    return [];
  }
}

function setProductAvailability(slug: string, available: boolean): boolean {
  let content = readFileSync(CATALOGUE_FILE, 'utf-8');
  const regex = new RegExp(`(slug:\\s*["']${slug}["'][\\s\\S]*?available:\\s*)(?:true|false)`, 'g');
  const newContent = content.replace(regex, `$1${available}`);
  if (newContent === content) return false;
  writeFileSync(CATALOGUE_FILE, newContent, 'utf-8');
  return true;
}

function updateProductPrice(slug: string, newPrice: number): boolean {
  let content = readFileSync(CATALOGUE_FILE, 'utf-8');
  const regex = new RegExp(`(slug:\\s*["']${slug}["'][\\s\\S]*?price:\\s*)[\\d.]+`, 'g');
  const newContent = content.replace(regex, `$1${newPrice}`);
  if (newContent === content) return false;
  writeFileSync(CATALOGUE_FILE, newContent, 'utf-8');
  return true;
}

function removeProduct(slug: string): boolean {
  let content = readFileSync(CATALOGUE_FILE, 'utf-8');
  // Match the full product object including the trailing comma
  const regex = new RegExp(`\\s*\\{[^}]*slug:\\s*["']${slug}["'][^}]*\\},?`, 'g');
  const newContent = content.replace(regex, '');
  if (newContent === content) return false;
  writeFileSync(CATALOGUE_FILE, newContent, 'utf-8');
  return true;
}

function injectProduct(draft: ProductDraft, slug: string): void {
  let content = readFileSync(CATALOGUE_FILE, 'utf-8');

  const imageField = draft.image ? `image: "/images/products/${slug}.jpg", ` : '';
  const descField = `description: ${JSON.stringify(draft.description || '')}, `;
  const popularField = draft.popular ? `popular: true, ` : '';

  const entry = `  { slug: "${slug}", name: "${draft.name}", category: "${draft.category}", ${descField}price: ${draft.price}, volume: "${draft.volume}", ${imageField}available: true, ${popularField}},`;

  // Insert before the closing ]; of the products array (skip categories array)
  const productsMarker = 'export const products: Product[] = [';
  const productsStart = content.indexOf(productsMarker);
  if (productsStart === -1) throw new Error('products array not found in catalogue.ts');
  const closingBracket = content.indexOf('\n];', productsStart);
  if (closingBracket === -1) throw new Error('closing bracket of products array not found');
  content = content.slice(0, closingBracket) + `\n${entry}` + content.slice(closingBracket);
  writeFileSync(CATALOGUE_FILE, content, 'utf-8');
}

function gitCommitAndPush(message: string): void {
  try {
    execSync(`cd "${site.projectPath}" && git add -A && git commit -m "${message}"`, { stdio: 'pipe' });
    execSync(`cd "${site.projectPath}" && git push origin main`, { stdio: 'pipe', timeout: 30000 });
  } catch (e) {
    logger.warn(`Git push failed for ${SITE_KEY}: ${(e as Error).message}`);
  }
}

export function registerProduitCommand(bot: Bot<BotContext>) {
  bot.command('produit', async (ctx) => {
    const chatId = ctx.chat?.id?.toString() || '';
    if (!canAccessSite(chatId, SITE_KEY)) {
      await ctx.reply('⛔ Vous n\'avez pas accès à cette commande.');
      return;
    }

    const args = (ctx.match as string)?.trim().split(/\s+/) || [];
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'help') {
      await ctx.reply(
        `🍾 <b>Gestion catalogue Mon Sauveur</b>\n\n` +
        `/produit add — Ajouter un produit\n` +
        `/produit list — Liste des produits\n` +
        `/produit suppr — Supprimer un produit\n` +
        `/produit dispo — Remettre disponible\n` +
        `/produit prix — Modifier le prix\n` +
        `/produit deploy — Redéployer le site`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (subcommand === 'list') {
      const products = getProductsList();
      if (products.length === 0) {
        await ctx.reply('Aucun produit trouvé.');
        return;
      }

      // Group by category
      const grouped: Record<string, typeof products> = {};
      for (const p of products) {
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category].push(p);
      }

      const catLabels: Record<string, string> = {};
      for (const c of CATEGORIES) catLabels[c.slug] = c.label;

      let msg = `🍾 <b>Catalogue (${products.length} produits)</b>\n`;
      for (const [cat, items] of Object.entries(grouped)) {
        msg += `\n<b>${catLabels[cat] || cat}</b>\n`;
        for (const p of items) {
          const status = p.available ? '' : '🔴 ';
          msg += `${status}  ${p.name} — ${p.price}€\n   <code>${p.slug}</code>\n`;
        }
      }
      await ctx.reply(msg, { parse_mode: 'HTML' });
      return;
    }

    if (subcommand === 'suppr') {
      const products = getProductsList().filter(p => p.available);
      if (products.length === 0) { await ctx.reply('Aucun produit à supprimer.'); return; }

      // Group by category, show buttons
      const catLabels: Record<string, string> = {};
      for (const c of CATEGORIES) catLabels[c.slug] = c.label;

      const grouped: Record<string, typeof products> = {};
      for (const p of products) {
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category].push(p);
      }

      let msg = `🗑️ <b>Quel produit supprimer ?</b>\n`;
      const kb = new InlineKeyboard();
      let count = 0;
      for (const [cat, items] of Object.entries(grouped)) {
        for (const p of items) {
          kb.text(`${p.name} (${p.price}€)`, `produit_del:${p.slug}`);
          kb.row();
          count++;
        }
      }
      kb.text('❌ Annuler', 'produit_del_cancel');
      await ctx.reply(msg + `\n${count} produits disponibles :`, { parse_mode: 'HTML', reply_markup: kb });
      return;
    }

    if (subcommand === 'dispo') {
      const products = getProductsList().filter(p => !p.available);
      if (products.length === 0) { await ctx.reply('Aucun produit indisponible.'); return; }

      const kb = new InlineKeyboard();
      for (const p of products) {
        kb.text(`${p.name} (${p.price}€)`, `produit_restore:${p.slug}`);
        kb.row();
      }
      kb.text('❌ Annuler', 'produit_del_cancel');
      await ctx.reply(`🟢 <b>Quel produit remettre disponible ?</b>`, { parse_mode: 'HTML', reply_markup: kb });
      return;
    }

    if (subcommand === 'prix') {
      const products = getProductsList().filter(p => p.available);
      if (products.length === 0) { await ctx.reply('Aucun produit.'); return; }

      const kb = new InlineKeyboard();
      for (const p of products) {
        kb.text(`${p.name} (${p.price}€)`, `produit_prix:${p.slug}`);
        kb.row();
      }
      kb.text('❌ Annuler', 'produit_del_cancel');
      await ctx.reply(`💰 <b>Quel produit modifier ?</b>`, { parse_mode: 'HTML', reply_markup: kb });
      return;
    }

    if (subcommand === 'deploy') {
      await ctx.reply('🚀 Déploiement en cours...');
      const ok = await triggerDeploy(SITE_KEY);
      await ctx.reply(ok ? '✅ Déploiement lancé !' : '❌ Échec du déploiement.');
      return;
    }

    if (subcommand === 'add') {
      ctx.session.awaitingInput = 'produit_add';
      ctx.session.context = { step: 'name', draft: {} };
      await ctx.reply(STEP_PROMPTS.name, { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(`Commande inconnue: "${subcommand}". Tape /produit help`);
  });

  // Delete product button
  bot.callbackQuery(/^produit_del:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    if (removeProduct(slug)) {
      gitCommitAndPush(`Remove product: ${slug}`);
      const deployed = await triggerDeploy(SITE_KEY);
      await ctx.reply(
        `🗑️ <b>${slug}</b> supprimé !\n${deployed ? '🚀 Déploiement lancé !' : '⚠️ Déploiement échoué.'}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`❌ Produit "${slug}" non trouvé.`);
    }
  });

  // Restore product button
  bot.callbackQuery(/^produit_restore:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    if (setProductAvailability(slug, true)) {
      gitCommitAndPush(`Set available: ${slug}`);
      const deployed = await triggerDeploy(SITE_KEY);
      await ctx.reply(
        `🟢 <b>${slug}</b> remis disponible !\n${deployed ? '🚀 Déploiement lancé !' : ''}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`❌ Produit "${slug}" non trouvé.`);
    }
  });

  // Price change button — ask for new price
  bot.callbackQuery(/^produit_prix:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    ctx.session.awaitingInput = 'produit_prix';
    ctx.session.context = { slug };
    const products = getProductsList();
    const p = products.find(x => x.slug === slug);
    await ctx.reply(
      `💰 <b>${p?.name || slug}</b> — prix actuel : ${p?.price}€\n\nTapez le nouveau prix :`,
      { parse_mode: 'HTML' }
    );
  });

  // Cancel button
  bot.callbackQuery('produit_del_cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('👌 Annulé.');
  });

  // Category inline keyboard
  bot.callbackQuery(/^produit_cat:(.+)$/, async (ctx) => {
    const cat = ctx.match![1];
    const draft = ctx.session.context?.draft as ProductDraft;
    if (!draft) return;
    draft.category = cat;
    ctx.session.context!.step = 'price';
    await ctx.answerCallbackQuery();
    await ctx.reply(STEP_PROMPTS.price, { parse_mode: 'HTML' });
  });

  // Popular inline keyboard
  bot.callbackQuery(/^produit_popular:(oui|non)$/, async (ctx) => {
    const choice = ctx.match![1];
    const draft = ctx.session.context?.draft as ProductDraft;
    if (!draft) return;
    draft.popular = choice === 'oui';
    await ctx.answerCallbackQuery();
    await showConfirmation(ctx, draft);
  });

  // Confirm: add
  bot.callbackQuery('produit_confirm_yes', async (ctx) => {
    await ctx.answerCallbackQuery();
    const draft = ctx.session.context?.draft as ProductDraft;
    if (!draft) return;

    await ctx.reply('⏳ Ajout en cours...');

    try {
      const slug = slugify(`${draft.name}`);

      // Download photo if present
      if (draft.image) {
        const imagesDir = join(site.projectPath, 'public/images/products');
        mkdirSync(imagesDir, { recursive: true });
        await downloadFile(draft.image, join(imagesDir, `${slug}.jpg`));
      }

      // Inject into catalogue
      injectProduct(draft, slug);

      // Git + deploy
      gitCommitAndPush(`Add product: ${draft.name}`);
      const deployed = await triggerDeploy(SITE_KEY);

      await ctx.reply(
        `✅ <b>${draft.name}</b> ajouté !\n\n` +
        `📂 ${CATEGORIES.find(c => c.slug === draft.category)?.label || draft.category}\n` +
        `💰 ${draft.price}€ — ${draft.volume}\n` +
        `📸 ${draft.image ? 'Avec image' : 'Sans image'}\n` +
        `🔗 Slug: <code>${slug}</code>\n\n` +
        (deployed ? '🚀 Déploiement lancé — en ligne dans ~1 min' : '⚠️ Déploiement à lancer manuellement'),
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
      logger.error(`Produit add failed: ${(e as Error).message}`);
    }

    ctx.session.awaitingInput = undefined;
    ctx.session.context = undefined;
  });

  // Confirm: cancel
  bot.callbackQuery('produit_confirm_no', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.awaitingInput = undefined;
    ctx.session.context = undefined;
    await ctx.reply('❌ Annulé.');
  });

  // Photo handler
  bot.on('message:photo', async (ctx) => {
    if (ctx.session.awaitingInput !== 'produit_add') return;
    if ((ctx.session.context?.step as string) !== 'photo') return;

    const draft = ctx.session.context?.draft as ProductDraft;
    if (!draft) return;

    const photos = ctx.message.photo;
    const biggestPhoto = photos[photos.length - 1];
    const file = await ctx.api.getFile(biggestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    draft.image = fileUrl;

    // Move to popular step
    ctx.session.context!.step = 'popular';
    await ctx.reply('📸 Photo reçue !', { parse_mode: 'HTML' });
    await ctx.reply(STEP_PROMPTS.popular, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('⭐ Oui, populaire', 'produit_popular:oui')
        .text('Non', 'produit_popular:non'),
    });
  });

  // Text input handler for price change
  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'produit_prix') return next();

    const slug = ctx.session.context?.slug as string;
    if (!slug) return next();

    const text = ctx.message.text.trim();
    const newPrice = parseFloat(text.replace(',', '.').replace(/[^\d.]/g, ''));

    ctx.session.awaitingInput = undefined;
    ctx.session.context = undefined;

    if (!newPrice || newPrice <= 0) {
      await ctx.reply('❌ Prix invalide. Annulé.');
      return;
    }

    if (updateProductPrice(slug, newPrice)) {
      gitCommitAndPush(`Update price: ${slug} → ${newPrice}€`);
      const deployed = await triggerDeploy(SITE_KEY);
      await ctx.reply(
        `💰 <b>${slug}</b> → ${newPrice}€\n${deployed ? '🚀 Déploiement lancé !' : ''}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`❌ Produit "${slug}" non trouvé.`);
    }
  });

  // Text input handler for the add flow
  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'produit_add') return next();

    const step = ctx.session.context?.step as ProduitStep;
    const draft = ctx.session.context?.draft as ProductDraft;
    if (!step || !draft) return next();

    const text = ctx.message.text.trim();
    logger.info(`[produit] step=${step} input="${text}"`);

    switch (step) {
      case 'name':
        draft.name = text;
        ctx.session.context!.step = 'category';
        {
          const kb = new InlineKeyboard();
          for (let i = 0; i < CATEGORIES.length; i++) {
            kb.text(CATEGORIES[i].label, `produit_cat:${CATEGORIES[i].slug}`);
            if (i % 2 === 1) kb.row();
          }
          await ctx.reply(STEP_PROMPTS.category, { parse_mode: 'HTML', reply_markup: kb });
        }
        break;

      case 'price': {
        const price = parseFloat(text.replace(',', '.').replace(/[^\d.]/g, ''));
        if (!price || price <= 0) { await ctx.reply('❌ Prix invalide. Ex: 3.50, 25...'); return; }
        draft.price = price;
        ctx.session.context!.step = 'volume';
        await ctx.reply(STEP_PROMPTS.volume, { parse_mode: 'HTML' });
        break;
      }

      case 'volume':
        draft.volume = text;
        ctx.session.context!.step = 'description';
        await ctx.reply(STEP_PROMPTS.description, { parse_mode: 'HTML' });
        break;

      case 'description':
        if (text.toLowerCase() !== 'passer') {
          draft.description = text;
        }
        ctx.session.context!.step = 'photo';
        await ctx.reply(STEP_PROMPTS.photo, { parse_mode: 'HTML' });
        break;

      case 'photo':
        if (text.toLowerCase() === 'passer' || text.toLowerCase() === 'sans') {
          ctx.session.context!.step = 'popular';
          await ctx.reply(STEP_PROMPTS.popular, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .text('⭐ Oui, populaire', 'produit_popular:oui')
              .text('Non', 'produit_popular:non'),
          });
        } else {
          await ctx.reply('📸 Envoie une photo ou tape "passer" pour continuer sans.');
        }
        break;
    }
  });
}

async function showConfirmation(ctx: BotContext, draft: ProductDraft) {
  const slug = slugify(`${draft.name}`);
  const catLabel = CATEGORIES.find(c => c.slug === draft.category)?.label || draft.category;

  const summary =
    `🍾 <b>Récapitulatif</b>\n\n` +
    `<b>${draft.name}</b>\n` +
    `📂 ${catLabel}\n` +
    `💰 ${draft.price}€ — ${draft.volume}\n` +
    (draft.description ? `📝 ${draft.description}\n` : '') +
    `📸 ${draft.image ? 'Avec image' : 'Sans image'}\n` +
    `⭐ ${draft.popular ? 'Populaire' : 'Normal'}\n` +
    `🔗 <code>${slug}</code>\n\n` +
    `✅ Confirmer ?`;

  ctx.session.context!.step = 'confirm';
  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('✅ Publier', 'produit_confirm_yes')
      .text('❌ Annuler', 'produit_confirm_no'),
  });
}
