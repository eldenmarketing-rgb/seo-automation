import { Bot, InlineKeyboard } from 'grammy';
import { BotContext } from '../index.js';
import { sites, SiteConfig } from '../../../config/sites.js';
import * as logger from '../../utils/logger.js';
import { canAccessSite, getSiteForChat, isAdmin } from '../permissions.js';
import { rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { env } from '../../config/env.js';
import type { CarRecord, FuelType, Transmission } from '../../vehicles/types.js';
import { todayIso } from '../../vehicles/types.js';
import { appendCar, readCars, removeCar, replaceCar, updateCarsFile } from '../../vehicles/cars-file.js';
import {
  normalizeBrand,
  normalizeEquipements,
  normalizeModel,
  slugify,
  uniqueSlug,
} from '../../vehicles/normalize.js';
import { countWords, generateDescription } from '../../vehicles/describe.js';
import { CAR_IMAGES_DIR, fetchTelegramFile, saveCarPhoto } from '../../vehicles/photos.js';
import { describePublish, publishSiteChange } from '../../vehicles/publish.js';

/**
 * `/voiture` — inventaire des sites concessionnaires, piloté par le client
 * depuis son groupe Telegram.
 *
 * Ce que la commande garantit depuis le 2026-09-03 :
 *  · chaque fiche part avec une description propre au véhicule (150 à 250 mots,
 *    rédigée par le CLI à partir des faits saisis, relue par le vendeur) — le
 *    gabarit « auto » de 150 caractères laissait 13 fiches sur 13 hors index ;
 *  · `dateAjout` à l'ajout, `dateVente` à la vente : sans elle, Ideo Car sort la
 *    fiche du sitemap et la passe en noindex le jour même au lieu de 90 jours après ;
 *  · une vente réécrit la fiche au passé, une remise en vente la réécrit au présent ;
 *  · marque, modèle, équipements normalisés, slug unique, photos en WebP 1280 px ;
 *  · un push GitHub raté remonte au vendeur au lieu d'un faux « ajouté ».
 *
 * Un client par site key, un groupe Telegram par client (TELEGRAM_GROUP_SITES) :
 * un client ne peut jamais lire ni modifier l'inventaire d'un autre.
 */
const CAR_SITE_KEYS = ['voitures', 'okaz'];

const MAX_PHOTOS = 10;
/** Description écrite à la main : en dessous, Google ne verra qu'un gabarit de plus. */
const MIN_MANUAL_WORDS = 80;

function resolveSite(ctx: BotContext): SiteConfig | undefined {
  const chatId = ctx.chat?.id?.toString() || '';
  const groupSiteKey = getSiteForChat(chatId);
  if (groupSiteKey) return CAR_SITE_KEYS.includes(groupSiteKey) ? sites[groupSiteKey] : undefined;
  if (isAdmin(chatId)) {
    const sessionKey = ctx.session.carSiteKey;
    if (sessionKey && CAR_SITE_KEYS.includes(sessionKey)) return sites[sessionKey];
  }
  return undefined;
}

function buildSiteKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const key of CAR_SITE_KEYS) kb.text(`🚗 ${sites[key].name}`, `voiture_site:${key}`).row();
  return kb;
}

async function requireSite(ctx: BotContext): Promise<SiteConfig | undefined> {
  const chatId = ctx.chat?.id?.toString() || '';
  const site = resolveSite(ctx);
  if (!site) {
    if (isAdmin(chatId)) {
      await ctx.reply('🚗 <b>Quel client ?</b>', { parse_mode: 'HTML', reply_markup: buildSiteKeyboard() });
    } else {
      await ctx.reply("⛔ Vous n'avez pas accès à cette commande.");
    }
    return undefined;
  }
  if (!canAccessSite(chatId, site.key)) {
    await ctx.reply("⛔ Vous n'avez pas accès à ce site.");
    return undefined;
  }
  return site;
}

/** Le site figé au démarrage d'un flux (un brouillon ne change pas de client en route). */
function flowSite(ctx: BotContext): SiteConfig | undefined {
  const key = ctx.session.context?.siteKey as string | undefined;
  return key && CAR_SITE_KEYS.includes(key) ? sites[key] : undefined;
}

interface CarDraft {
  marque?: string;
  modele?: string;
  annee?: number;
  prix?: number;
  kilometrage?: number;
  carburant?: FuelType;
  boiteVitesse?: Transmission;
  couleur?: string;
  chevaux?: string;
  equipements?: string[];
  /** URL Telegram des photos, téléchargées à la confirmation. */
  images: string[];
  enVedette?: boolean;
  categories?: string[];
  notes?: string;
  description?: string;
}

type VoitureStep =
  | 'marque'
  | 'modele'
  | 'annee'
  | 'prix'
  | 'km'
  | 'carburant'
  | 'boite'
  | 'couleur'
  | 'chevaux'
  | 'equipements'
  | 'photos'
  | 'categories'
  | 'vedette'
  | 'notes'
  | 'description'
  | 'description_manuelle'
  | 'confirm';

const STEP_PROMPTS: Record<VoitureStep, string> = {
  marque: '🚗 <b>Marque ?</b>\nEx: Peugeot, Renault, BMW...',
  modele: '📝 <b>Modèle ?</b>\nEx: 3008 GT, Clio 5 Intens...',
  annee: '📅 <b>Année ?</b>\nEx: 2021',
  prix: '💰 <b>Prix ?</b>\nEx: 15990',
  km: '🛣️ <b>Kilométrage ?</b>\nEx: 45000',
  carburant: '⛽ <b>Carburant ?</b>',
  boite: '⚙️ <b>Boîte de vitesse ?</b>',
  couleur: '🎨 <b>Couleur ?</b>\nEx: Gris Artense, Blanc Glacier...',
  chevaux:
    '🏎️ <b>Puissance / Motorisation ?</b>\nEx: 130 ch, 2.0 HDi 150 ch\n\nOu tape "passer" pour ignorer',
  equipements:
    '📋 <b>Équipements ?</b>\nListe séparée par des virgules.\nEx: GPS, Clim auto, Caméra de recul\n\nOu tape "passer"',
  photos: `📸 <b>Envoie les photos</b> (1 à ${MAX_PHOTOS})\nQuand tu as fini, tape "ok"`,
  categories:
    '📂 <b>Dans quelles catégories ?</b>\nSélectionne une ou plusieurs catégories, puis appuie sur ✅ Valider.',
  vedette: "⭐ <b>Afficher sur l'accueil ?</b>",
  notes:
    '🗒️ <b>Ce que tu sais de cette voiture ?</b>\nEntretien fait, contrôle technique, historique, options, pourquoi elle vaut le coup... 2 ou 3 lignes suffisent. ' +
    'Seul ce que tu écris ici sera affirmé dans la fiche.\n\nOu tape "passer".',
  description: '',
  description_manuelle: `✏️ <b>Écris la description</b> (au moins ${MIN_MANUAL_WORDS} mots, un texte propre à cette voiture).`,
  confirm: '',
};

const CATEGORY_LABELS: Record<string, string> = {
  '4x4': '4x4 & SUV',
  'petit-prix': 'Petit Prix',
  sport: 'Sport & Collection',
};

/** Catégories retirées du site d'un client : plus proposées à l'ajout. */
const HIDDEN_CATEGORIES: Record<string, string[]> = {
  okaz: ['4x4'], // page /4x4-suv supprimée du site Okaz Autos 66
};

function buildCategoryKeyboard(selected: string[], siteKey?: string): InlineKeyboard {
  const hidden = siteKey ? (HIDDEN_CATEGORIES[siteKey] ?? []) : [];
  const kb = new InlineKeyboard();
  for (const [id, label] of Object.entries(CATEGORY_LABELS)) {
    if (hidden.includes(id)) continue;
    kb.text(`${selected.includes(id) ? '✅ ' : ''}${label}`, `voiture_cat:${id}`).row();
  }
  kb.text('✅ Valider', 'voiture_cat_done');
  return kb;
}

const fr = (n: number | undefined): string => (n ?? 0).toLocaleString('fr-FR');

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function carLabel(c: CarRecord): string {
  return `${c.marque} ${c.modele} ${c.annee}`;
}

function carButtons(cars: CarRecord[], prefix: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const c of cars) kb.text(`${carLabel(c)} (${fr(c.prix)}€)`, `${prefix}:${c.slug}`).row();
  kb.text('❌ Annuler', 'voiture_action_cancel');
  return kb;
}

/** La fiche complète telle qu'elle sera écrite, à partir du brouillon (sans photos ni description). */
function draftToRecord(draft: CarDraft, slug: string): CarRecord {
  const marque = normalizeBrand(draft.marque || '');
  return {
    slug,
    marque,
    modele: normalizeModel(marque, draft.modele || ''),
    annee: draft.annee || 0,
    prix: draft.prix || 0,
    kilometrage: draft.kilometrage || 0,
    carburant: draft.carburant || 'Essence',
    boiteVitesse: draft.boiteVitesse || 'Manuelle',
    categorie: draft.categories?.length ? draft.categories : ['standard'],
    chevaux: draft.chevaux || undefined,
    couleur: draft.couleur || undefined,
    portes: 5,
    equipements: normalizeEquipements(draft.equipements || []),
    description: draft.description || '',
    images: [],
    enVedette: draft.enVedette ?? false,
    disponible: true,
    dateAjout: todayIso(),
  };
}

function draftSlug(draft: CarDraft): string {
  const record = draftToRecord(draft, '');
  return slugify(`${record.marque}-${record.modele}-${record.annee}`);
}

/** Lance la rédaction, affiche le texte avec les boutons de relecture, ou bascule en saisie manuelle. */
async function proposeDescription(ctx: BotContext, draft: CarDraft, site: SiteConfig): Promise<void> {
  await ctx.reply('✍️ Rédaction de la fiche en cours (30 secondes environ)...');
  try {
    const record = draftToRecord(draft, draftSlug(draft));
    draft.description = await generateDescription({
      site,
      car: record,
      notes: draft.notes || '',
      sold: false,
    });
    ctx.session.context!.step = 'description';
    await ctx.reply(
      `📄 <b>Proposition de description</b> (${countWords(draft.description)} mots)\n\n${escapeHtml(draft.description)}\n\n` +
        `Garde-la, fais-la refaire, ou envoie directement ton propre texte.`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('✅ Garder', 'voiture_desc_ok')
          .text('🔁 Refaire', 'voiture_desc_retry')
          .row()
          .text("✏️ J'écris moi-même", 'voiture_desc_manual'),
      },
    );
  } catch (e) {
    logger.warn(`Rédaction fiche impossible (${site.key}) : ${(e as Error).message}`);
    ctx.session.context!.step = 'description_manuelle';
    await ctx.reply(`⚠️ Le rédacteur ne répond pas. ${STEP_PROMPTS.description_manuelle}`, {
      parse_mode: 'HTML',
    });
  }
}

async function showConfirmation(ctx: BotContext, draft: CarDraft): Promise<void> {
  const site = flowSite(ctx);
  const slug = draftSlug(draft);
  const record = draftToRecord(draft, slug);
  const summary =
    `🚗 <b>Récapitulatif</b>\n\n` +
    `<b>${escapeHtml(carLabel(record))}</b>\n` +
    `📅 ${record.annee} — 🛣️ ${fr(record.kilometrage)} km\n` +
    `💰 ${fr(record.prix)}€\n` +
    `⛽ ${record.carburant} — ⚙️ ${record.boiteVitesse}\n` +
    (record.couleur ? `🎨 ${escapeHtml(record.couleur)}\n` : '') +
    (record.chevaux ? `🏎️ ${escapeHtml(String(record.chevaux))}\n` : '') +
    (record.equipements.length ? `📋 ${escapeHtml(record.equipements.join(', '))}\n` : '') +
    (draft.categories?.length
      ? `📂 ${draft.categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')}\n`
      : '') +
    `📸 ${draft.images.length} photo(s)\n` +
    `⭐ ${record.enVedette ? 'En vedette (accueil)' : 'Catalogue uniquement'}\n` +
    `📄 Description : ${countWords(record.description)} mots\n` +
    `🔗 <code>${slug}</code>${site ? ` sur ${escapeHtml(site.name)}` : ''}\n\n` +
    `✅ Confirmer ?`;

  ctx.session.context!.step = 'confirm';
  await ctx.reply(summary, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text('✅ Publier', 'voiture_confirm_yes')
      .text('❌ Annuler', 'voiture_confirm_no'),
  });
}

/**
 * Aide de `/voiture`, partagée avec `/help` : chaque commande dit ce qu'elle
 * fait **pour le vendeur**, pas ce qu'elle fait dans le code. « vendu » est un
 * geste (la voiture quitte la vitrine, sa page reste avec le bandeau Vendu),
 * « archives » est une liste (les voitures déjà vendues) — les deux mots se
 * ressemblaient trop pour un client qui découvre le bot.
 */
export function voitureHelp(siteName: string, admin: boolean): string {
  return (
    `🚗 <b>Gestion véhicules ${escapeHtml(siteName)}</b>\n\n` +
    `<b>Au quotidien</b>\n` +
    `/voiture add\n   Mettre une voiture en ligne : caractéristiques, photos, fiche rédigée pour toi, tu valides avant publication.\n` +
    `/voiture list\n   Voir toutes les voitures du site, en vente 🟢 ou vendues 🔴.\n` +
    `/voiture prix\n   Changer le prix d'une voiture en vente.\n\n` +
    `<b>Quand une voiture est vendue</b>\n` +
    `/voiture vendu\n   Marquer une voiture comme vendue : elle quitte la liste des voitures à vendre, sa page reste en ligne avec le bandeau « Vendu » et sa fiche est réécrite au passé.\n` +
    `/voiture archives\n   Voir la liste des voitures déjà vendues (rien n'est modifié).\n` +
    `/voiture dispo\n   Remettre en vente une voiture marquée vendue par erreur.\n\n` +
    `<b>Rarement</b>\n` +
    `/voiture suppr\n   Effacer une voiture pour de bon, fiche et photos. Préfère « vendu », qui garde la page.\n` +
    `/voiture deploy\n   Relancer la mise en ligne du site si un changement n'apparaît pas au bout de quelques minutes.` +
    (admin ? `\n\n<b>Admin</b>\n/voiture client\n   Choisir le client sur lequel travailler.` : '')
  );
}

function clearFlow(ctx: BotContext): void {
  ctx.session.awaitingInput = undefined;
  ctx.session.context = undefined;
}

/** Réécrit la description d'une fiche existante (vente / remise en vente) ; rend null si le CLI échoue. */
async function rewriteDescription(site: SiteConfig, car: CarRecord, sold: boolean): Promise<string | null> {
  try {
    return await generateDescription({ site, car, notes: '', sold });
  } catch (e) {
    logger.warn(`Réécriture fiche ${car.slug} impossible : ${(e as Error).message}`);
    return null;
  }
}

function deleteCarImages(site: SiteConfig, slug: string): void {
  const dir = join(site.projectPath, CAR_IMAGES_DIR);
  try {
    for (const f of readdirSync(dir)) {
      if (new RegExp(`^${slug}-\\d+\\.(webp|jpe?g|png)$`).test(f)) rmSync(join(dir, f));
    }
  } catch {
    /* pas de dossier photos : rien à retirer */
  }
}

export function registerVoitureCommand(bot: Bot<BotContext>) {
  bot.command('voiture', async (ctx) => {
    const site = await requireSite(ctx);
    if (!site) return;

    const args = (ctx.match as string)?.trim().split(/\s+/) || [];
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'help') {
      await ctx.reply(voitureHelp(site.name, isAdmin(ctx.chat?.id?.toString() || '')), {
        parse_mode: 'HTML',
      });
      return;
    }

    if (subcommand === 'client') {
      if (!isAdmin(ctx.chat?.id?.toString() || '')) {
        await ctx.reply("⛔ Réservé à l'administrateur.");
        return;
      }
      await ctx.reply('🚗 <b>Quel client ?</b>', { parse_mode: 'HTML', reply_markup: buildSiteKeyboard() });
      return;
    }

    if (subcommand === 'list') {
      const cars = readCars(site.projectPath);
      if (cars.length === 0) {
        await ctx.reply('Aucun véhicule trouvé.');
        return;
      }
      const lines = cars.map(
        (c) =>
          `${c.disponible ? '🟢' : '🔴 VENDU'} <b>${escapeHtml(carLabel(c))}</b> — ${fr(c.prix)}€\n   <code>${c.slug}</code>`,
      );
      await ctx.reply(
        `🚗 <b>${escapeHtml(site.name)} — véhicules (${cars.length})</b>\n\n${lines.join('\n\n')}`,
        {
          parse_mode: 'HTML',
        },
      );
      return;
    }

    if (subcommand === 'archives') {
      const sold = readCars(site.projectPath).filter((c) => !c.disponible);
      if (sold.length === 0) {
        await ctx.reply('Aucun véhicule vendu/archivé.');
        return;
      }
      const lines = sold.map(
        (c) =>
          `🔴 <b>${escapeHtml(carLabel(c))}</b> — ${fr(c.prix)}€${c.dateVente ? ` — vendu le ${c.dateVente}` : ''}\n   <code>${c.slug}</code>`,
      );
      await ctx.reply(
        `📦 <b>Véhicules archivés (${sold.length})</b>\n\n${lines.join('\n\n')}\n\n💡 /voiture dispo pour remettre en vente`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    const pickers: Record<
      string,
      { filter: (c: CarRecord) => boolean; prefix: string; title: string; empty: string }
    > = {
      vendu: {
        filter: (c) => c.disponible,
        prefix: 'voiture_vendu',
        title:
          '🔴 <b>Quel véhicule marquer comme vendu ?</b>\nIl quittera la liste des voitures à vendre ; sa page restera en ligne avec le bandeau « Vendu ».',
        empty: 'Aucun véhicule en vente.',
      },
      dispo: {
        filter: (c) => !c.disponible,
        prefix: 'voiture_dispo',
        title: '🟢 <b>Quel véhicule remettre en vente ?</b>\nIl réapparaîtra dans les voitures à vendre.',
        empty: 'Aucun véhicule vendu/archivé.',
      },
      prix: {
        filter: (c) => c.disponible,
        prefix: 'voiture_prix',
        title: '💰 <b>Quel véhicule modifier ?</b>',
        empty: 'Aucun véhicule.',
      },
      suppr: {
        filter: () => true,
        prefix: 'voiture_del',
        title:
          '🗑️ <b>Quel véhicule supprimer ?</b>\nDéfinitif : fiche et photos effacées. Pour une voiture vendue, préfère /voiture vendu.',
        empty: 'Aucun véhicule à supprimer.',
      },
    };
    if (pickers[subcommand]) {
      const p = pickers[subcommand];
      const cars = readCars(site.projectPath).filter(p.filter);
      if (cars.length === 0) {
        await ctx.reply(p.empty);
        return;
      }
      await ctx.reply(p.title, { parse_mode: 'HTML', reply_markup: carButtons(cars, p.prefix) });
      return;
    }

    if (subcommand === 'deploy') {
      await ctx.reply(`🚀 Publication de ${site.name} en cours...`);
      const r = await publishSiteChange(site, 'chore: redéploiement demandé via Telegram');
      await ctx.reply(
        r.error === 'aucun changement à publier'
          ? '✅ Rien à publier : le site est à jour.'
          : describePublish(r),
      );
      return;
    }

    if (subcommand === 'add') {
      ctx.session.awaitingInput = 'voiture_add';
      ctx.session.context = { step: 'marque', draft: { images: [] }, siteKey: site.key };
      await ctx.reply(STEP_PROMPTS.marque, { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(`Commande inconnue: "${subcommand}". Tape /voiture help`);
  });

  bot.callbackQuery(/^voiture_site:(.+)$/, async (ctx) => {
    const key = ctx.match![1];
    await ctx.answerCallbackQuery();
    if (!isAdmin(ctx.chat?.id?.toString() || '')) {
      await ctx.reply("⛔ Réservé à l'administrateur.");
      return;
    }
    if (!CAR_SITE_KEYS.includes(key)) {
      await ctx.reply('❌ Client inconnu.');
      return;
    }
    ctx.session.carSiteKey = key;
    await ctx.reply(
      `✅ Client actif : <b>${escapeHtml(sites[key].name)}</b>\n\nTape /voiture pour voir les actions.`,
      {
        parse_mode: 'HTML',
      },
    );
  });

  bot.callbackQuery(/^voiture_fuel:(.+)$/, async (ctx) => {
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    draft.carburant = ctx.match![1] as FuelType;
    ctx.session.context!.step = 'boite';
    await ctx.answerCallbackQuery();
    await ctx.reply(STEP_PROMPTS.boite, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('Manuelle', 'voiture_boite:Manuelle')
        .text('Automatique', 'voiture_boite:Automatique'),
    });
  });

  bot.callbackQuery(/^voiture_boite:(.+)$/, async (ctx) => {
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    draft.boiteVitesse = ctx.match![1] as Transmission;
    ctx.session.context!.step = 'couleur';
    await ctx.answerCallbackQuery();
    await ctx.reply(STEP_PROMPTS.couleur, { parse_mode: 'HTML' });
  });

  bot.callbackQuery(/^voiture_cat:(.+)$/, async (ctx) => {
    const catId = ctx.match![1];
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    draft.categories ??= [];
    const idx = draft.categories.indexOf(catId);
    if (idx >= 0) draft.categories.splice(idx, 1);
    else draft.categories.push(catId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({
      reply_markup: buildCategoryKeyboard(draft.categories, flowSite(ctx)?.key),
    });
  });

  bot.callbackQuery('voiture_cat_done', async (ctx) => {
    const draft = ctx.session.context?.draft as CarDraft | undefined;
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

  bot.callbackQuery(/^voiture_vedette:(oui|non)$/, async (ctx) => {
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    draft.enVedette = ctx.match![1] === 'oui';
    await ctx.answerCallbackQuery();
    ctx.session.context!.step = 'notes';
    await ctx.reply(STEP_PROMPTS.notes, { parse_mode: 'HTML' });
  });

  bot.callbackQuery('voiture_desc_ok', async (ctx) => {
    await ctx.answerCallbackQuery();
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft?.description) return;
    await showConfirmation(ctx, draft);
  });

  bot.callbackQuery('voiture_desc_retry', async (ctx) => {
    await ctx.answerCallbackQuery();
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    const site = flowSite(ctx);
    if (!draft || !site) return;
    await proposeDescription(ctx, draft, site);
  });

  bot.callbackQuery('voiture_desc_manual', async (ctx) => {
    await ctx.answerCallbackQuery();
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    ctx.session.context!.step = 'description_manuelle';
    await ctx.reply(STEP_PROMPTS.description_manuelle, { parse_mode: 'HTML' });
  });

  bot.callbackQuery('voiture_confirm_yes', async (ctx) => {
    await ctx.answerCallbackQuery();
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    const site = flowSite(ctx) ?? (await requireSite(ctx));
    if (!site) return;

    await ctx.reply(`⏳ Ajout en cours sur ${site.name}...`);
    try {
      const existing = readCars(site.projectPath).map((c) => c.slug);
      const slug = uniqueSlug(draftSlug(draft), existing);
      const record = draftToRecord(draft, slug);

      for (let i = 0; i < draft.images.length; i++) {
        record.images.push(
          await saveCarPhoto(site.projectPath, slug, i + 1, await fetchTelegramFile(draft.images[i])),
        );
      }
      updateCarsFile(site.projectPath, (content) => appendCar(content, record));

      const r = await publishSiteChange(site, `Add vehicle: ${carLabel(record)}`);
      await ctx.reply(
        `✅ <b>${escapeHtml(carLabel(record))}</b> ajouté sur ${escapeHtml(site.name)} !\n\n` +
          `💰 ${fr(record.prix)}€ — ${fr(record.kilometrage)} km\n` +
          `📸 ${record.images.length} photo(s) — 📄 ${countWords(record.description)} mots\n` +
          `🔗 ${site.domain}/vehicules/${slug}\n\n${describePublish(r)}`,
        { parse_mode: 'HTML' },
      );
    } catch (e) {
      await ctx.reply(`❌ Erreur: ${escapeHtml((e as Error).message)}`);
      logger.error(`Voiture add failed: ${(e as Error).message}`);
    }
    clearFlow(ctx);
  });

  bot.callbackQuery('voiture_confirm_no', async (ctx) => {
    await ctx.answerCallbackQuery();
    clearFlow(ctx);
    await ctx.reply('❌ Annulé.');
  });

  /** Vente / remise en vente : date posée, description réécrite, publication. */
  async function setAvailability(ctx: BotContext, slug: string, disponible: boolean): Promise<void> {
    const site = await requireSite(ctx);
    if (!site) return;
    const car = readCars(site.projectPath).find((c) => c.slug === slug);
    if (!car) {
      await ctx.reply(`❌ Véhicule "${slug}" non trouvé.`);
      return;
    }
    await ctx.reply(
      `⏳ ${disponible ? 'Remise en vente' : 'Vente'} de ${carLabel(car)} — réécriture de la fiche...`,
    );
    const description = await rewriteDescription(site, { ...car, disponible }, !disponible);
    updateCarsFile(site.projectPath, (content) =>
      replaceCar(content, slug, {
        disponible,
        dateVente: disponible ? undefined : todayIso(),
        ...(description ? { description } : {}),
      }),
    );
    const r = await publishSiteChange(site, `${disponible ? 'Restore' : 'Sold'}: ${slug}`);
    await ctx.reply(
      `${disponible ? '🟢' : '🔴'} <b>${escapeHtml(carLabel(car))}</b> ${disponible ? 'remis en vente' : 'marqué comme vendu'} !\n` +
        (description
          ? '📄 Fiche réécrite.\n'
          : '⚠️ Fiche non réécrite (rédacteur indisponible), texte précédent conservé.\n') +
        describePublish(r),
      { parse_mode: 'HTML' },
    );
  }

  bot.callbackQuery(/^voiture_vendu:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await setAvailability(ctx, ctx.match![1], false);
  });

  bot.callbackQuery(/^voiture_dispo:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await setAvailability(ctx, ctx.match![1], true);
  });

  bot.callbackQuery(/^voiture_prix:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    const site = await requireSite(ctx);
    if (!site) return;
    const car = readCars(site.projectPath).find((c) => c.slug === slug);
    ctx.session.awaitingInput = 'voiture_prix';
    ctx.session.context = { slug, siteKey: site.key };
    await ctx.reply(
      `💰 <b>${escapeHtml(car ? carLabel(car) : slug)}</b> — prix actuel : ${fr(car?.prix)}€\n\nTapez le nouveau prix :`,
      { parse_mode: 'HTML' },
    );
  });

  bot.callbackQuery(/^voiture_del:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    const site = await requireSite(ctx);
    if (!site) return;
    if (!updateCarsFile(site.projectPath, (content) => removeCar(content, slug))) {
      await ctx.reply(`❌ Véhicule "${slug}" non trouvé.`);
      return;
    }
    deleteCarImages(site, slug);
    const r = await publishSiteChange(site, `Remove vehicle: ${slug}`);
    await ctx.reply(`🗑️ <b>${slug}</b> supprimé !\n${describePublish(r)}`, { parse_mode: 'HTML' });
  });

  bot.callbackQuery('voiture_action_cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('👌 Annulé.');
  });

  /** Photo compressée ou envoyée en fichier : on garde l'URL Telegram, téléchargée à la confirmation. */
  async function collectPhoto(ctx: BotContext, fileId: string): Promise<void> {
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    if (draft.images.length >= MAX_PHOTOS) {
      await ctx.reply(`📸 Maximum ${MAX_PHOTOS} photos. Tape "ok" pour continuer.`);
      return;
    }
    const file = await ctx.api.getFile(fileId);
    draft.images.push(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
    await ctx.reply(
      `📸 Photo ${draft.images.length} reçue. Envoie d'autres photos ou tape "ok" quand c'est fini.`,
    );
  }

  bot.on('message:photo', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'voiture_add' || ctx.session.context?.step !== 'photos') return next();
    const photos = ctx.message.photo;
    await collectPhoto(ctx, photos[photos.length - 1].file_id);
  });

  bot.on('message:document', async (ctx, next) => {
    if (ctx.session.awaitingInput !== 'voiture_add' || ctx.session.context?.step !== 'photos') return next();
    const doc = ctx.message.document;
    if (!doc.mime_type?.startsWith('image/')) {
      await ctx.reply("📸 Ce fichier n'est pas une image.");
      return;
    }
    await collectPhoto(ctx, doc.file_id);
  });

  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.awaitingInput === 'voiture_prix') {
      const slug = ctx.session.context?.slug as string;
      const site = flowSite(ctx);
      if (!slug || !site) {
        clearFlow(ctx);
        await ctx.reply('❌ Session expirée. Relance /voiture prix.');
        return;
      }
      const prix = parseInt(ctx.message.text.replace(/[^\d]/g, ''));
      if (!prix) {
        await ctx.reply('❌ Prix invalide. Tape un montant en euros (ex: 8500).');
        return;
      }
      clearFlow(ctx);
      if (!updateCarsFile(site.projectPath, (content) => replaceCar(content, slug, { prix }))) {
        await ctx.reply(`❌ Véhicule "${slug}" non trouvé.`);
        return;
      }
      const r = await publishSiteChange(site, `Price update: ${slug} → ${prix}`);
      await ctx.reply(`💰 <b>${slug}</b> → ${fr(prix)}€\n${describePublish(r)}`, { parse_mode: 'HTML' });
      return;
    }

    if (ctx.session.awaitingInput !== 'voiture_add') return next();
    const step = ctx.session.context?.step as VoitureStep | undefined;
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!step || !draft) return next();

    const text = ctx.message.text.trim();
    const lower = text.toLowerCase();
    const goTo = async (next: VoitureStep, extra?: Parameters<typeof ctx.reply>[1]) => {
      ctx.session.context!.step = next;
      await ctx.reply(STEP_PROMPTS[next], { parse_mode: 'HTML', ...extra });
    };

    if (lower === 'annuler' || lower === 'stop') {
      clearFlow(ctx);
      await ctx.reply('❌ Ajout annulé.');
      return;
    }

    switch (step) {
      case 'marque':
        draft.marque = text;
        await goTo('modele');
        break;

      case 'modele':
        draft.modele = text;
        await goTo('annee');
        break;

      case 'annee': {
        const annee = parseInt(text);
        const maxYear = new Date().getFullYear() + 1;
        if (!annee || annee < 1950 || annee > maxYear) {
          await ctx.reply(`❌ Année invalide. Entre 1950 et ${maxYear}.`);
          return;
        }
        draft.annee = annee;
        await goTo('prix');
        break;
      }

      case 'prix': {
        const prix = parseInt(text.replace(/[^\d]/g, ''));
        if (!prix) {
          await ctx.reply('❌ Prix invalide.');
          return;
        }
        draft.prix = prix;
        await goTo('km');
        break;
      }

      case 'km': {
        const km = parseInt(text.replace(/[^\d]/g, ''));
        if (isNaN(km)) {
          await ctx.reply('❌ Kilométrage invalide.');
          return;
        }
        draft.kilometrage = km;
        await goTo('carburant', {
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
        await goTo('chevaux');
        break;

      case 'chevaux':
        if (lower !== 'passer') draft.chevaux = text;
        await goTo('equipements');
        break;

      case 'equipements':
        if (lower !== 'passer')
          draft.equipements = text
            .split(/[,;\n]/)
            .map((e) => e.trim())
            .filter(Boolean);
        await goTo('photos');
        break;

      case 'photos':
        if (['ok', 'fin', 'done', 'sans'].includes(lower)) {
          if (lower !== 'sans' && draft.images.length === 0) {
            await ctx.reply(
              '⚠️ Au moins 1 photo requise. Envoie une photo ou tape "sans" pour continuer sans.',
            );
            return;
          }
          if (lower === 'sans') draft.images = [];
          draft.categories = [];
          await goTo('categories', { reply_markup: buildCategoryKeyboard([], flowSite(ctx)?.key) });
        } else {
          await ctx.reply('📸 Envoie une photo ou tape "ok" quand c\'est fini.');
        }
        break;

      case 'notes': {
        draft.notes = lower === 'passer' ? '' : text;
        const site = flowSite(ctx);
        if (!site) {
          clearFlow(ctx);
          await ctx.reply('❌ Session expirée. Relance /voiture add.');
          return;
        }
        await proposeDescription(ctx, draft, site);
        break;
      }

      case 'description':
      case 'description_manuelle': {
        const words = countWords(text);
        if (words < MIN_MANUAL_WORDS) {
          await ctx.reply(
            `❌ ${words} mots : il en faut au moins ${MIN_MANUAL_WORDS} pour que Google garde la fiche. Complète ton texte.`,
          );
          return;
        }
        draft.description = text;
        await showConfirmation(ctx, draft);
        break;
      }

      default:
        await ctx.reply('Utilise les boutons ci-dessus pour continuer, ou tape "annuler".');
    }
  });
}
