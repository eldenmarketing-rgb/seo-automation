import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { triggerDeploy } from '../../deployers/vercel-deploy.js';
import * as logger from '../../utils/logger.js';
import { canAccessSite } from '../permissions.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const SITE_KEY = 'voitures';
const site = sites[SITE_KEY];

interface CarDraft {
  marque?: string;
  modele?: string;
  annee?: number;
  prix?: number;
  kilometrage?: number;
  carburant?: string;
  boiteVitesse?: string;
  couleur?: string;
  chevaux?: string;
  equipements?: string[];
  description?: string;
  images: string[];
  enVedette?: boolean;
  categories?: string[];
}

type VoitureStep = 'marque' | 'modele' | 'annee' | 'prix' | 'km' | 'carburant' | 'boite' | 'couleur' | 'chevaux' | 'equipements' | 'description' | 'photos' | 'categories' | 'vedette' | 'confirm';

const STEP_PROMPTS: Record<VoitureStep, string> = {
  marque: '🚗 <b>Marque ?</b>\nEx: Peugeot, Renault, BMW...',
  modele: '📝 <b>Modèle ?</b>\nEx: 3008 GT, Clio 5 Intens...',
  annee: '📅 <b>Année ?</b>\nEx: 2021',
  prix: '💰 <b>Prix ?</b>\nEx: 15990',
  km: '🛣️ <b>Kilométrage ?</b>\nEx: 45000',
  carburant: '⛽ <b>Carburant ?</b>',
  boite: '⚙️ <b>Boîte de vitesse ?</b>',
  couleur: '🎨 <b>Couleur ?</b>\nEx: Gris Artense, Blanc Glacier...',
  chevaux: '🏎️ <b>Puissance / Motorisation ?</b>\nEx: 130, 2.2L, 150ch 2.0 HDi\n\nOu tape "passer" pour ignorer',
  equipements: '📋 <b>Équipements ?</b>\nListe séparée par des virgules.\nEx: GPS, Clim auto, Caméra de recul\n\nOu tape "passer"',
  description: '✏️ <b>Description ?</b>\n1-2 phrases sur le véhicule.\n\nOu tape "auto" pour générer automatiquement.',
  photos: '📸 <b>Envoie les photos</b> (1 à 10)\nQuand tu as fini, tape "ok" ou "fin"',
  categories: '📂 <b>Dans quelles catégories ?</b>\nSélectionne une ou plusieurs catégories, puis appuie sur ✅ Valider.',
  vedette: '⭐ <b>Afficher sur l\'accueil ?</b>',
  confirm: '',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateSlug(draft: CarDraft): string {
  return slugify(`${draft.marque}-${draft.modele}-${draft.annee}`);
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

function getSoldCarsList(): Array<{ slug: string; marque: string; modele: string; prix: number }> {
  try {
    const content = readFileSync(join(site.projectPath, 'data/cars.ts'), 'utf-8');
    const cars: Array<{ slug: string; marque: string; modele: string; prix: number }> = [];
    const regex = /slug:\s*["']([^"']+)["'].*?marque:\s*["']([^"']+)["'].*?modele:\s*["']([^"']+)["'].*?prix:\s*(\d+).*?disponible:\s*false/gs;
    let match;
    while ((match = regex.exec(content)) !== null) {
      cars.push({ slug: match[1], marque: match[2], modele: match[3], prix: parseInt(match[4]) });
    }
    return cars;
  } catch {
    return [];
  }
}

function getCarsList(): Array<{ slug: string; marque: string; modele: string; prix: number; disponible: boolean }> {
  try {
    const content = readFileSync(join(site.projectPath, 'data/cars.ts'), 'utf-8');
    const cars: Array<{ slug: string; marque: string; modele: string; prix: number; disponible: boolean }> = [];
    const regex = /slug:\s*["']([^"']+)["'].*?marque:\s*["']([^"']+)["'].*?modele:\s*["']([^"']+)["'].*?prix:\s*(\d+).*?disponible:\s*(true|false)/gs;
    let match;
    while ((match = regex.exec(content)) !== null) {
      cars.push({ slug: match[1], marque: match[2], modele: match[3], prix: parseInt(match[4]), disponible: match[5] === 'true' });
    }
    return cars;
  } catch {
    return [];
  }
}

function injectCarIntoDataFile(draft: CarDraft, slug: string): void {
  const carsFile = join(site.projectPath, 'data/cars.ts');
  let content = readFileSync(carsFile, 'utf-8');

  const imagesPaths = draft.images.map((_, i) => `"/images/cars/${slug}-${i + 1}.jpg"`);

  const entry = `  {
    slug: "${slug}",
    marque: "${draft.marque}",
    modele: "${draft.modele}",
    annee: ${draft.annee},
    prix: ${draft.prix},
    kilometrage: ${draft.kilometrage},
    carburant: "${draft.carburant}",
    boiteVitesse: "${draft.boiteVitesse}",
    categorie: [${categorize(draft)}],
    chevaux: ${draft.chevaux ? (/^\d+$/.test(draft.chevaux) ? draft.chevaux : `"${draft.chevaux}"`) : 0},
    couleur: "${draft.couleur || ''}",
    portes: 5,
    equipements: [${(draft.equipements || []).map(e => `"${e.trim()}"`).join(', ')}],
    description: ${JSON.stringify(draft.description || '')},
    images: [${imagesPaths.join(', ')}],
    enVedette: ${draft.enVedette ?? false},
    disponible: true,
  },`;

  // Insert before the closing ];
  content = content.replace(/\];\s*$/, `${entry}\n];\n`);
  writeFileSync(carsFile, content, 'utf-8');
}

function categorize(draft: CarDraft): string {
  const cats = draft.categories || [];
  if (cats.length === 0) return '"standard"';
  return cats.map(c => `"${c}"`).join(', ');
}

function buildCategoryKeyboard(selected: string[]): InlineKeyboard {
  const categories = [
    { id: '4x4', label: '4x4 & SUV' },
    { id: 'petit-prix', label: 'Petit Prix' },
    { id: 'sport', label: 'Sport & Collection' },
  ];
  const kb = new InlineKeyboard();
  for (const cat of categories) {
    const check = selected.includes(cat.id) ? '✅ ' : '';
    kb.text(`${check}${cat.label}`, `voiture_cat:${cat.id}`);
    kb.row();
  }
  kb.text('✅ Valider', 'voiture_cat_done');
  return kb;
}

function removeCarFromDataFile(slug: string): boolean {
  const carsFile = join(site.projectPath, 'data/cars.ts');
  let content = readFileSync(carsFile, 'utf-8');
  const regex = new RegExp(`\\s*\\{[^}]*slug:\\s*["']${slug}["'][^}]*\\},?`, 'g');
  const newContent = content.replace(regex, '');
  if (newContent === content) return false;
  writeFileSync(carsFile, newContent, 'utf-8');
  return true;
}

function setCarAvailability(slug: string, disponible: boolean): boolean {
  const carsFile = join(site.projectPath, 'data/cars.ts');
  let content = readFileSync(carsFile, 'utf-8');
  const regex = new RegExp(`(slug:\\s*["']${slug}["'][\\s\\S]*?disponible:\\s*)(?:true|false)`, 'g');
  const newContent = content.replace(regex, `$1${disponible}`);
  if (newContent === content) return false;
  writeFileSync(carsFile, newContent, 'utf-8');
  return true;
}

function updateCarPrice(slug: string, newPrice: number): boolean {
  const carsFile = join(site.projectPath, 'data/cars.ts');
  let content = readFileSync(carsFile, 'utf-8');
  const regex = new RegExp(`(slug:\\s*["']${slug}["'][\\s\\S]*?prix:\\s*)\\d+`, 'g');
  const newContent = content.replace(regex, `$1${newPrice}`);
  if (newContent === content) return false;
  writeFileSync(carsFile, newContent, 'utf-8');
  return true;
}

export function registerVoitureCommand(bot: Bot<BotContext>) {
  // /voiture or /voiture add|list|vendu|prix|suppr
  bot.command('voiture', async (ctx) => {
    const chatId = ctx.chat?.id?.toString() || '';
    if (!canAccessSite(chatId, SITE_KEY)) {
      await ctx.reply('⛔ Vous n\'avez pas accès à cette commande.');
      return;
    }

    const args = (ctx.match as string)?.trim().split(/\s+/) || [];
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'help') {
      await ctx.reply(
        `🚗 <b>Gestion véhicules Ideo Car</b>\n\n` +
        `/voiture add — Ajouter un véhicule\n` +
        `/voiture list — Liste des véhicules\n` +
        `/voiture suppr — Supprimer un véhicule\n` +
        `/voiture vendu — Marquer comme vendu\n` +
        `/voiture dispo — Remettre en vente\n` +
        `/voiture prix — Modifier le prix\n` +
        `/voiture archives — Véhicules vendus\n` +
        `/voiture deploy — Redéployer le site`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (subcommand === 'list') {
      const cars = getCarsList();
      if (cars.length === 0) {
        await ctx.reply('Aucun véhicule trouvé.');
        return;
      }
      const lines = cars.map(c => {
        const status = c.disponible ? '🟢' : '🔴 VENDU';
        return `${status} <b>${c.marque} ${c.modele}</b> — ${c.prix.toLocaleString('fr-FR')}€\n   <code>${c.slug}</code>`;
      });
      await ctx.reply(`🚗 <b>Véhicules (${cars.length})</b>\n\n${lines.join('\n\n')}`, { parse_mode: 'HTML' });
      return;
    }

    if (subcommand === 'vendu') {
      const cars = getCarsList().filter(c => c.disponible);
      if (cars.length === 0) { await ctx.reply('Aucun véhicule en vente.'); return; }

      const kb = new InlineKeyboard();
      for (const c of cars) {
        kb.text(`${c.marque} ${c.modele} (${c.prix.toLocaleString('fr-FR')}€)`, `voiture_vendu:${c.slug}`);
        kb.row();
      }
      kb.text('❌ Annuler', 'voiture_action_cancel');
      await ctx.reply(`🔴 <b>Quel véhicule marquer comme vendu ?</b>`, { parse_mode: 'HTML', reply_markup: kb });
      return;
    }

    if (subcommand === 'dispo') {
      const sold = getSoldCarsList();
      if (sold.length === 0) { await ctx.reply('Aucun véhicule vendu/archivé.'); return; }

      const kb = new InlineKeyboard();
      for (const c of sold) {
        kb.text(`${c.marque} ${c.modele} (${c.prix.toLocaleString('fr-FR')}€)`, `voiture_dispo:${c.slug}`);
        kb.row();
      }
      kb.text('❌ Annuler', 'voiture_action_cancel');
      await ctx.reply(`🟢 <b>Quel véhicule remettre en vente ?</b>`, { parse_mode: 'HTML', reply_markup: kb });
      return;
    }

    if (subcommand === 'prix') {
      const cars = getCarsList().filter(c => c.disponible);
      if (cars.length === 0) { await ctx.reply('Aucun véhicule.'); return; }

      const kb = new InlineKeyboard();
      for (const c of cars) {
        kb.text(`${c.marque} ${c.modele} (${c.prix.toLocaleString('fr-FR')}€)`, `voiture_prix:${c.slug}`);
        kb.row();
      }
      kb.text('❌ Annuler', 'voiture_action_cancel');
      await ctx.reply(`💰 <b>Quel véhicule modifier ?</b>`, { parse_mode: 'HTML', reply_markup: kb });
      return;
    }

    if (subcommand === 'archives') {
      const sold = getSoldCarsList();
      if (sold.length === 0) {
        await ctx.reply('Aucun véhicule vendu/archivé.');
        return;
      }
      const lines = sold.map(c =>
        `🔴 <b>${c.marque} ${c.modele}</b> — ${c.prix.toLocaleString('fr-FR')}€\n   <code>${c.slug}</code>`
      );
      await ctx.reply(`📦 <b>Véhicules archivés (${sold.length})</b>\n\n${lines.join('\n\n')}\n\n💡 /voiture dispo [slug] pour remettre en vente`, { parse_mode: 'HTML' });
      return;
    }

    if (subcommand === 'suppr') {
      const cars = getCarsList().filter(c => c.disponible);
      if (cars.length === 0) { await ctx.reply('Aucun véhicule à supprimer.'); return; }

      const kb = new InlineKeyboard();
      for (const c of cars) {
        kb.text(`${c.marque} ${c.modele} (${c.prix.toLocaleString('fr-FR')}€)`, `voiture_del:${c.slug}`);
        kb.row();
      }
      kb.text('❌ Annuler', 'voiture_action_cancel');
      await ctx.reply(`🗑️ <b>Quel véhicule supprimer ?</b>`, { parse_mode: 'HTML', reply_markup: kb });
      return;
    }

    if (subcommand === 'deploy') {
      await ctx.reply('🚀 Déploiement en cours...');
      const ok = await triggerDeploy(SITE_KEY);
      await ctx.reply(ok ? '✅ Déploiement lancé !' : '❌ Échec du déploiement.');
      return;
    }

    if (subcommand === 'add') {
      // Start the add flow
      ctx.session.awaitingInput = 'voiture_add';
      ctx.session.context = { step: 'marque', draft: { images: [] } };
      await ctx.reply(STEP_PROMPTS.marque, { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(`Commande inconnue: "${subcommand}". Tape /voiture help`);
  });

  // Carburant inline keyboard
  bot.callbackQuery(/^voiture_fuel:(.+)$/, async (ctx) => {
    const fuel = ctx.match![1];
    const draft = ctx.session.context?.draft as CarDraft;
    if (!draft) return;
    draft.carburant = fuel;
    ctx.session.context!.step = 'boite';
    await ctx.answerCallbackQuery();
    await ctx.reply(STEP_PROMPTS.boite, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('Manuelle', 'voiture_boite:Manuelle')
        .text('Automatique', 'voiture_boite:Automatique'),
    });
  });

  // Transmission inline keyboard
  bot.callbackQuery(/^voiture_boite:(.+)$/, async (ctx) => {
    const boite = ctx.match![1];
    const draft = ctx.session.context?.draft as CarDraft;
    if (!draft) return;
    draft.boiteVitesse = boite;
    ctx.session.context!.step = 'couleur';
    await ctx.answerCallbackQuery();
    await ctx.reply(STEP_PROMPTS.couleur, { parse_mode: 'HTML' });
  });

  // Category toggle
  bot.callbackQuery(/^voiture_cat:(.+)$/, async (ctx) => {
    const catId = ctx.match![1];
    const draft = ctx.session.context?.draft as CarDraft;
    if (!draft) return;
    if (!draft.categories) draft.categories = [];

    const idx = draft.categories.indexOf(catId);
    if (idx >= 0) {
      draft.categories.splice(idx, 1);
    } else {
      draft.categories.push(catId);
    }

    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: buildCategoryKeyboard(draft.categories) });
  });

  // Category done → vedette step
  bot.callbackQuery('voiture_cat_done', async (ctx) => {
    const draft = ctx.session.context?.draft as CarDraft;
    if (!draft) return;
    await ctx.answerCallbackQuery();
    ctx.session.context!.step = 'vedette';
    await ctx.reply(STEP_PROMPTS.vedette, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🏠 Accueil + Catalogue', 'voiture_vedette:oui')
        .text('📋 Catalogue uniquement', 'voiture_vedette:non'),
    });
  });

  // Vedette selection
  bot.callbackQuery(/^voiture_vedette:(oui|non)$/, async (ctx) => {
    const choice = ctx.match![1];
    const draft = ctx.session.context?.draft as CarDraft;
    if (!draft) return;
    draft.enVedette = choice === 'oui';
    await ctx.answerCallbackQuery();
    await showConfirmation(ctx, draft);
  });

  // Confirm: add or cancel
  bot.callbackQuery('voiture_confirm_yes', async (ctx) => {
    await ctx.answerCallbackQuery();
    const draft = ctx.session.context?.draft as CarDraft;
    if (!draft) return;

    await ctx.reply('⏳ Ajout en cours...');

    try {
      const slug = generateSlug(draft);

      // Download photos
      const imagesDir = join(site.projectPath, 'public/images/cars');
      mkdirSync(imagesDir, { recursive: true });

      for (let i = 0; i < draft.images.length; i++) {
        const destPath = join(imagesDir, `${slug}-${i + 1}.jpg`);
        await downloadFile(draft.images[i], destPath);
      }

      // Inject into data file
      injectCarIntoDataFile(draft, slug);

      // Git commit + push
      try {
        execSync(`cd "${site.projectPath}" && git add -A && git commit -m "Add vehicle: ${draft.marque} ${draft.modele} ${draft.annee}"`, { stdio: 'pipe' });
        execSync(`cd "${site.projectPath}" && git push origin main`, { stdio: 'pipe', timeout: 30000 });
      } catch (e) {
        logger.warn(`Git push failed: ${(e as Error).message}`);
      }

      // Deploy
      const deployed = await triggerDeploy(SITE_KEY);

      await ctx.reply(
        `✅ <b>${draft.marque} ${draft.modele} ${draft.annee}</b> ajouté !\n\n` +
        `💰 ${draft.prix?.toLocaleString('fr-FR')}€ — ${draft.kilometrage?.toLocaleString('fr-FR')} km\n` +
        `📸 ${draft.images.length} photo(s)\n` +
        `🔗 Slug: <code>${slug}</code>\n\n` +
        (deployed ? '🚀 Déploiement lancé — en ligne dans ~1 min' : '⚠️ Déploiement à lancer manuellement'),
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
      logger.error(`Voiture add failed: ${(e as Error).message}`);
    }

    ctx.session.awaitingInput = undefined;
    ctx.session.context = undefined;
  });

  bot.callbackQuery('voiture_confirm_no', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.awaitingInput = undefined;
    ctx.session.context = undefined;
    await ctx.reply('❌ Annulé.');
  });

  // Mark as sold button
  bot.callbackQuery(/^voiture_vendu:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    if (setCarAvailability(slug, false)) {
      try {
        execSync(`cd "${site.projectPath}" && git add -A && git commit -m "Sold: ${slug}"`, { stdio: 'pipe' });
        execSync(`cd "${site.projectPath}" && git push origin main`, { stdio: 'pipe', timeout: 30000 });
      } catch (e) {
        logger.warn(`Git push failed: ${(e as Error).message}`);
      }
      const deployed = await triggerDeploy(SITE_KEY);
      await ctx.reply(
        `🔴 <b>${slug}</b> marqué comme vendu !\n${deployed ? '🚀 Déploiement lancé !' : '⚠️ Déploiement échoué.'}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`❌ Véhicule "${slug}" non trouvé.`);
    }
  });

  // Restore for sale button
  bot.callbackQuery(/^voiture_dispo:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    if (setCarAvailability(slug, true)) {
      try {
        execSync(`cd "${site.projectPath}" && git add -A && git commit -m "Restore: ${slug}"`, { stdio: 'pipe' });
        execSync(`cd "${site.projectPath}" && git push origin main`, { stdio: 'pipe', timeout: 30000 });
      } catch (e) {
        logger.warn(`Git push failed: ${(e as Error).message}`);
      }
      const deployed = await triggerDeploy(SITE_KEY);
      await ctx.reply(
        `🟢 <b>${slug}</b> remis en vente !\n${deployed ? '🚀 Déploiement lancé !' : '⚠️ Déploiement échoué.'}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`❌ Véhicule "${slug}" non trouvé.`);
    }
  });

  // Price change button — ask for new price
  bot.callbackQuery(/^voiture_prix:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    ctx.session.awaitingInput = 'voiture_prix';
    ctx.session.context = { slug };
    const cars = getCarsList();
    const c = cars.find(x => x.slug === slug);
    await ctx.reply(
      `💰 <b>${c ? `${c.marque} ${c.modele}` : slug}</b> — prix actuel : ${c?.prix.toLocaleString('fr-FR')}€\n\nTapez le nouveau prix :`,
      { parse_mode: 'HTML' }
    );
  });

  // Delete vehicle button
  bot.callbackQuery(/^voiture_del:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    if (removeCarFromDataFile(slug)) {
      try {
        execSync(`cd "${site.projectPath}" && git add -A && git commit -m "Remove vehicle: ${slug}"`, { stdio: 'pipe' });
        execSync(`cd "${site.projectPath}" && git push origin main`, { stdio: 'pipe', timeout: 30000 });
      } catch (e) {
        logger.warn(`Git push failed: ${(e as Error).message}`);
      }
      const deployed = await triggerDeploy(SITE_KEY);
      await ctx.reply(
        `🗑️ <b>${slug}</b> supprimé !\n${deployed ? '🚀 Déploiement lancé !' : '⚠️ Déploiement échoué.'}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`❌ Véhicule "${slug}" non trouvé.`);
    }
  });

  // Cancel button
  bot.callbackQuery('voiture_action_cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('👌 Annulé.');
  });

  // Photo handler
  bot.on('message:photo', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'voiture_add') return next();
    if ((ctx.session.context?.step as string) !== 'photos') return next();

    const draft = ctx.session.context?.draft as CarDraft;
    if (!draft) return;

    // Get the highest resolution photo
    const photos = ctx.message.photo;
    const biggestPhoto = photos[photos.length - 1];
    const file = await ctx.api.getFile(biggestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    draft.images.push(fileUrl);
    await ctx.reply(`📸 Photo ${draft.images.length} reçue. Envoie d'autres photos ou tape "ok" quand c'est fini.`);
  });

  // Text input handler for the add flow
  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'voiture_add') return next();

    const step = ctx.session.context?.step as VoitureStep;
    const draft = ctx.session.context?.draft as CarDraft;
    if (!step || !draft) return next();

    const text = ctx.message.text.trim();

    switch (step) {
      case 'marque':
        draft.marque = text;
        ctx.session.context!.step = 'modele';
        await ctx.reply(STEP_PROMPTS.modele, { parse_mode: 'HTML' });
        break;

      case 'modele':
        draft.modele = text;
        ctx.session.context!.step = 'annee';
        await ctx.reply(STEP_PROMPTS.annee, { parse_mode: 'HTML' });
        break;

      case 'annee': {
        const annee = parseInt(text);
        if (!annee || annee < 1990 || annee > 2027) {
          await ctx.reply('❌ Année invalide. Entre 1990 et 2027.');
          return;
        }
        draft.annee = annee;
        ctx.session.context!.step = 'prix';
        await ctx.reply(STEP_PROMPTS.prix, { parse_mode: 'HTML' });
        break;
      }

      case 'prix': {
        const prix = parseInt(text.replace(/[^\d]/g, ''));
        if (!prix) { await ctx.reply('❌ Prix invalide.'); return; }
        draft.prix = prix;
        ctx.session.context!.step = 'km';
        await ctx.reply(STEP_PROMPTS.km, { parse_mode: 'HTML' });
        break;
      }

      case 'km': {
        const km = parseInt(text.replace(/[^\d]/g, ''));
        if (isNaN(km)) { await ctx.reply('❌ Kilométrage invalide.'); return; }
        draft.kilometrage = km;
        ctx.session.context!.step = 'carburant';
        await ctx.reply(STEP_PROMPTS.carburant, {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('Essence', 'voiture_fuel:Essence')
            .text('Diesel', 'voiture_fuel:Diesel')
            .row()
            .text('Hybride', 'voiture_fuel:Hybride')
            .text('Électrique', 'voiture_fuel:Électrique'),
        });
        break;
      }

      case 'couleur':
        draft.couleur = text;
        ctx.session.context!.step = 'chevaux';
        await ctx.reply(STEP_PROMPTS.chevaux, { parse_mode: 'HTML' });
        break;

      case 'chevaux':
        if (text.toLowerCase() !== 'passer') {
          draft.chevaux = text;
        }
        ctx.session.context!.step = 'equipements';
        await ctx.reply(STEP_PROMPTS.equipements, { parse_mode: 'HTML' });
        break;

      case 'equipements':
        if (text.toLowerCase() !== 'passer') {
          draft.equipements = text.split(',').map(e => e.trim()).filter(Boolean);
        }
        ctx.session.context!.step = 'description';
        await ctx.reply(STEP_PROMPTS.description, { parse_mode: 'HTML' });
        break;

      case 'description':
        if (text.toLowerCase() === 'auto') {
          draft.description = `${draft.marque} ${draft.modele} ${draft.annee}, ${draft.kilometrage?.toLocaleString('fr-FR')} km, ${draft.carburant}, boîte ${draft.boiteVitesse?.toLowerCase()}. Véhicule en excellent état, entretien suivi. ${draft.couleur ? `Couleur ${draft.couleur}.` : ''} À voir chez Ideo Car à Cabestany.`;
        } else {
          draft.description = text;
        }
        ctx.session.context!.step = 'photos';
        await ctx.reply(STEP_PROMPTS.photos, { parse_mode: 'HTML' });
        break;

      case 'photos':
        if (text.toLowerCase() === 'ok' || text.toLowerCase() === 'fin' || text.toLowerCase() === 'done') {
          if (draft.images.length === 0) {
            await ctx.reply('⚠️ Au moins 1 photo requise. Envoie une photo ou tape "sans" pour continuer sans.');
            return;
          }
          draft.categories = [];
          ctx.session.context!.step = 'categories';
          await ctx.reply(STEP_PROMPTS.categories, {
            parse_mode: 'HTML',
            reply_markup: buildCategoryKeyboard([]),
          });
        } else if (text.toLowerCase() === 'sans') {
          draft.images = [];
          draft.categories = [];
          ctx.session.context!.step = 'categories';
          await ctx.reply(STEP_PROMPTS.categories, {
            parse_mode: 'HTML',
            reply_markup: buildCategoryKeyboard([]),
          });
        } else {
          await ctx.reply('📸 Envoie une photo ou tape "ok" quand c\'est fini.');
        }
        break;
    }
  });
}

async function showConfirmation(ctx: BotContext, draft: CarDraft) {
  const slug = generateSlug(draft);
  const summary =
    `🚗 <b>Récapitulatif</b>\n\n` +
    `<b>${draft.marque} ${draft.modele}</b>\n` +
    `📅 ${draft.annee} — 🛣️ ${draft.kilometrage?.toLocaleString('fr-FR')} km\n` +
    `💰 ${draft.prix?.toLocaleString('fr-FR')}€\n` +
    `⛽ ${draft.carburant} — ⚙️ ${draft.boiteVitesse}\n` +
    (draft.couleur ? `🎨 ${draft.couleur}\n` : '') +
    (draft.chevaux ? `🏎️ ${draft.chevaux}\n` : '') +
    (draft.equipements?.length ? `📋 ${draft.equipements.join(', ')}\n` : '') +
    (draft.categories?.length ? `📂 ${draft.categories.map(c => c === '4x4' ? '4x4 & SUV' : c === 'petit-prix' ? 'Petit Prix' : c === 'sport' ? 'Sport & Collection' : c).join(', ')}\n` : '') +
    `📸 ${draft.images.length} photo(s)\n` +
    `⭐ ${draft.enVedette ? 'En vedette (accueil)' : 'Catalogue uniquement'}\n` +
    `🔗 <code>${slug}</code>\n\n` +
    `✅ Confirmer ?`;

  ctx.session.context!.step = 'confirm';
  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('✅ Publier', 'voiture_confirm_yes')
      .text('❌ Annuler', 'voiture_confirm_no'),
  });
}
