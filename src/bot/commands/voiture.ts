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
import { describePublish, publishSiteChange, waitForLive, type LiveCheck } from '../../vehicles/publish.js';
import { registerCarPage } from '../../vehicles/register.js';

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
 *  · un push GitHub raté remonte au vendeur au lieu d'un faux « ajouté » ;
 *  · après chaque publication, la page réelle est relue jusqu'à y voir le
 *    changement, et le vendeur reçoit « vérifié en ligne » ou une alerte ;
 *  · `/voiture modif` corrige n'importe quel champ d'une fiche existante.
 *
 * Un client par site key, un groupe Telegram par client (TELEGRAM_GROUP_SITES) :
 * un client ne peut jamais lire ni modifier l'inventaire d'un autre. Les
 * brouillons sont par utilisateur (deux vendeurs du même groupe ne se marchent
 * pas dessus) et expirent au bout de 30 minutes.
 */
const CAR_SITE_KEYS = ['voitures', 'okaz'];

const MAX_PHOTOS = 10;
/** Description écrite à la main : en dessous, Google ne verra qu'un gabarit de plus. */
const MIN_MANUAL_WORDS = 80;
const FLOW_TTL_MS = 30 * 60 * 1000;

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

const vedetteKeyboard = () =>
  new InlineKeyboard()
    .text('🏠 Accueil + Catalogue', 'voiture_vedette:oui')
    .text('📋 Catalogue uniquement', 'voiture_vedette:non');

const fr = (n: number | undefined): string =>
  (n ?? 0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function carLabel(c: CarRecord): string {
  return `${c.marque} ${c.modele} ${c.annee}`;
}

function carUrl(site: SiteConfig, slug: string): string {
  return `${site.domain}/vehicules/${slug}`;
}

function carButtons(cars: CarRecord[], prefix: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const c of cars) {
    kb.text(`${c.disponible ? '' : '🔴 '}${carLabel(c)} (${fr(c.prix)}€)`, `${prefix}:${c.slug}`).row();
  }
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
    `/voiture modif\n   Corriger une fiche : prix, kilométrage, couleur, motorisation, équipements, description, photos, catégories, accueil.\n` +
    `/voiture prix\n   Raccourci pour changer seulement le prix.\n\n` +
    `<b>Quand une voiture est vendue</b>\n` +
    `/voiture vendu\n   Marquer une voiture comme vendue : elle quitte la liste des voitures à vendre, sa page reste en ligne avec le bandeau « Vendu » et sa fiche est réécrite au passé.\n` +
    `/voiture archives\n   Voir la liste des voitures déjà vendues (rien n'est modifié).\n` +
    `/voiture dispo\n   Remettre en vente une voiture marquée vendue par erreur.\n\n` +
    `<b>Rarement</b>\n` +
    `/voiture suppr\n   Effacer une voiture pour de bon, fiche et photos. Préfère « vendu », qui garde la page.\n` +
    `/voiture deploy\n   Relancer la mise en ligne du site si un changement n'apparaît pas au bout de quelques minutes.\n\n` +
    `À tout moment, tape "annuler" pour abandonner ce que tu es en train de faire.` +
    (admin ? `\n\n<b>Admin</b>\n/voiture client\n   Choisir le client sur lequel travailler.` : '')
  );
}

function clearFlow(ctx: BotContext): void {
  ctx.session.awaitingInput = undefined;
  ctx.session.context = undefined;
}

function startFlow(
  ctx: BotContext,
  awaiting: 'voiture_add' | 'voiture_modif',
  context: Record<string, unknown>,
) {
  ctx.session.awaitingInput = awaiting;
  ctx.session.context = { ...context, startedAt: Date.now() };
}

/** Le contexte du flux en cours, ou undefined (et un message) s'il n'y en a pas ou s'il a expiré. */
async function activeFlow(
  ctx: BotContext,
  awaiting: 'voiture_add' | 'voiture_modif',
): Promise<Record<string, unknown> | undefined> {
  if (ctx.session.awaitingInput !== awaiting || !ctx.session.context) return undefined;
  const startedAt = ctx.session.context.startedAt as number | undefined;
  if (startedAt && Date.now() - startedAt > FLOW_TTL_MS) {
    clearFlow(ctx);
    await ctx.reply('⌛ Brouillon expiré (30 minutes sans suite). Relance la commande.');
    return undefined;
  }
  return ctx.session.context;
}

/**
 * Relit la page réelle en arrière-plan et prévient le vendeur — c'est la seule
 * preuve qui compte, un hook Vercel qui répond 200 n'en est pas une.
 */
function verifyOnline(ctx: BotContext, check: LiveCheck, what: string, after?: () => Promise<unknown>): void {
  void waitForLive(check).then(async (r) => {
    const secs = Math.round(r.elapsedMs / 1000);
    // La page est prouvée en ligne : elle peut entrer à l'inventaire (seo_pages) telle qu'elle est servie.
    if (r.ok && after)
      await after().catch((e) => logger.warn(`Inscription seo_pages : ${(e as Error).message}`));
    try {
      await ctx.reply(
        r.ok
          ? `✅ Vérifié en ligne (${secs} s) — ${what}\n${check.url}`
          : `⚠️ ${what} : pas encore visible après ${Math.round(secs / 60)} min (HTTP ${r.lastStatus ?? '—'}).\n${check.url}\nRéessaie dans quelques minutes, sinon tape /voiture deploy ou préviens l'administrateur.`,
      );
    } catch (e) {
      logger.warn(`Message de vérification non envoyé : ${(e as Error).message}`);
    }
  });
}

const liveCheck = {
  hasText: (url: string, needle: string): LiveCheck => ({
    url,
    expect: (text, status) => status === 200 && text.includes(needle),
  }),
  lacksText: (url: string, needle: string): LiveCheck => ({
    url,
    expect: (text, status) => status === 200 && !text.includes(needle),
  }),
  gone: (url: string): LiveCheck => ({ url, expect: (_t, status) => status === 404 }),
};

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

/** Réécrit la description d'une fiche existante ; rend null si le CLI échoue. */
async function rewriteDescription(
  site: SiteConfig,
  car: CarRecord,
  sold: boolean,
  notes = '',
): Promise<string | null> {
  try {
    return await generateDescription({ site, car, notes, sold });
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

/** Prochain numéro de photo libre pour une fiche (les trous ne sont jamais recomblés). */
function nextPhotoIndex(car: CarRecord): number {
  const used = car.images.map((p) => parseInt(p.match(/-(\d+)\.\w+$/)?.[1] ?? '0', 10));
  return Math.max(0, ...used) + 1;
}

/* ───────────── Modification d'une fiche existante ───────────── */

type ModifField =
  | 'prix'
  | 'km'
  | 'couleur'
  | 'chevaux'
  | 'equipements'
  | 'description'
  | 'photos'
  | 'photos_add'
  | 'categories'
  | 'vedette';

const FIELD_LABELS: Record<Exclude<ModifField, 'photos_add'>, string> = {
  prix: '💰 Prix',
  km: '🛣️ Kilométrage',
  couleur: '🎨 Couleur',
  chevaux: '🏎️ Motorisation',
  equipements: '📋 Équipements',
  description: '📄 Description',
  photos: '📸 Photos',
  categories: '📂 Catégories',
  vedette: '⭐ Accueil',
};

function fieldKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  const entries = Object.entries(FIELD_LABELS);
  entries.forEach(([id, label], i) => {
    kb.text(label, `voiture_field:${id}`);
    if (i % 2 === 1) kb.row();
  });
  if (entries.length % 2 === 1) kb.row();
  kb.text('❌ Annuler', 'voiture_confirm_no');
  return kb;
}

function currentCar(ctx: BotContext): { site: SiteConfig; car: CarRecord } | undefined {
  const site = flowSite(ctx);
  const slug = ctx.session.context?.slug as string | undefined;
  if (!site || !slug) return undefined;
  const car = readCars(site.projectPath).find((c) => c.slug === slug);
  return car ? { site, car } : undefined;
}

/** Écrit la modification, publie, répond, puis vérifie en ligne. Termine le flux. */
async function applyModif(
  ctx: BotContext,
  site: SiteConfig,
  car: CarRecord,
  patch: Partial<CarRecord>,
  what: string,
  check: LiveCheck,
): Promise<void> {
  clearFlow(ctx);
  if (!updateCarsFile(site.projectPath, (content) => replaceCar(content, car.slug, patch))) {
    await ctx.reply(`❌ Véhicule "${car.slug}" non trouvé.`);
    return;
  }
  const r = await publishSiteChange(site, `Update ${car.slug}: ${what}`);
  await ctx.reply(`✏️ <b>${escapeHtml(carLabel(car))}</b> — ${escapeHtml(what)}\n${describePublish(r)}`, {
    parse_mode: 'HTML',
  });
  if (r.pushed && r.deploy !== 'none') verifyOnline(ctx, check, what, () => registerCarPage(site, car.slug));
}

async function askField(ctx: BotContext, field: ModifField): Promise<void> {
  const found = currentCar(ctx);
  if (!found) {
    clearFlow(ctx);
    await ctx.reply('❌ Session expirée. Relance /voiture modif.');
    return;
  }
  const { site, car } = found;
  ctx.session.context!.field = field;
  const html = { parse_mode: 'HTML' as const };
  switch (field) {
    case 'prix':
      await ctx.reply(`💰 Prix actuel : <b>${fr(car.prix)}€</b>\n\nTape le nouveau prix :`, html);
      break;
    case 'km':
      await ctx.reply(
        `🛣️ Kilométrage actuel : <b>${fr(car.kilometrage)} km</b>\n\nTape le nouveau kilométrage :`,
        html,
      );
      break;
    case 'couleur':
      await ctx.reply(
        `🎨 Couleur actuelle : <b>${escapeHtml(car.couleur || '—')}</b>\n\nTape la nouvelle couleur :`,
        html,
      );
      break;
    case 'chevaux':
      await ctx.reply(
        `🏎️ Motorisation actuelle : <b>${escapeHtml(String(car.chevaux || '—'))}</b>\n\nTape la nouvelle motorisation (ex: 2.0 HDi 150 ch) :`,
        html,
      );
      break;
    case 'equipements':
      await ctx.reply(
        `📋 Équipements actuels :\n${escapeHtml(car.equipements.join(', ') || '—')}\n\nTape la <b>liste complète</b> des équipements, séparés par des virgules (elle remplace l'ancienne) :`,
        html,
      );
      break;
    case 'description':
      await ctx.reply(
        `📄 Description actuelle (${countWords(car.description)} mots) :\n\n${escapeHtml(car.description)}\n\n` +
          `Envoie ton nouveau texte (au moins ${MIN_MANUAL_WORDS} mots), ou tape <b>refaire</b> pour une nouvelle rédaction — ` +
          `tu peux ajouter des précisions après : « refaire : CT ok, distribution faite ».`,
        html,
      );
      break;
    case 'photos':
      await ctx.reply(`📸 ${car.images.length} photo(s) sur la fiche.`, {
        reply_markup: new InlineKeyboard()
          .text('➕ Ajouter des photos', 'voiture_photos_add')
          .text('🗑️ Retirer une photo', 'voiture_photos_del')
          .row()
          .text('❌ Annuler', 'voiture_confirm_no'),
      });
      break;
    case 'photos_add':
      ctx.session.context!.draft = { images: [] };
      await ctx.reply(
        `📸 Envoie les photos à ajouter (${MAX_PHOTOS - car.images.length} max), puis tape "ok".`,
      );
      break;
    case 'categories':
      ctx.session.context!.draft = { images: [], categories: car.categorie.filter((c) => c !== 'standard') };
      await ctx.reply(STEP_PROMPTS.categories, {
        ...html,
        reply_markup: buildCategoryKeyboard(car.categorie, site.key),
      });
      break;
    case 'vedette':
      await ctx.reply(
        `⭐ Actuellement : <b>${car.enVedette ? "en vedette sur l'accueil" : 'catalogue uniquement'}</b>`,
        { ...html, reply_markup: vedetteKeyboard() },
      );
      break;
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
      modif: {
        filter: () => true,
        prefix: 'voiture_modif',
        title: '✏️ <b>Quelle fiche corriger ?</b>',
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
      startFlow(ctx, 'voiture_add', { step: 'marque', draft: { images: [] }, siteKey: site.key });
      await ctx.reply(STEP_PROMPTS.marque, { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(`Commande inconnue: "${subcommand}". Tape /voiture pour l'aide.`);
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

  /* ── Ajout ── */

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
    const cats = draft.categories?.length ? [...draft.categories] : ['standard'];
    if (ctx.session.awaitingInput === 'voiture_modif') {
      const found = currentCar(ctx);
      if (!found) return;
      const label = cats.map((c) => CATEGORY_LABELS[c] ?? c).join(', ');
      await applyModif(
        ctx,
        found.site,
        found.car,
        { categorie: cats },
        `catégories : ${label}`,
        liveCheck.hasText(carUrl(found.site, found.car.slug), carLabel(found.car)),
      );
      return;
    }
    ctx.session.context!.step = 'vedette';
    await ctx.reply(STEP_PROMPTS.vedette, { parse_mode: 'HTML', reply_markup: vedetteKeyboard() });
  });

  bot.callbackQuery(/^voiture_vedette:(oui|non)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const enVedette = ctx.match![1] === 'oui';
    if (ctx.session.awaitingInput === 'voiture_modif') {
      const found = currentCar(ctx);
      if (!found) return;
      await applyModif(
        ctx,
        found.site,
        found.car,
        { enVedette },
        enVedette ? "affichée sur l'accueil" : "retirée de l'accueil",
        liveCheck.hasText(carUrl(found.site, found.car.slug), carLabel(found.car)),
      );
      return;
    }
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    draft.enVedette = enVedette;
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
          `🔗 ${carUrl(site, slug)}\n\n${describePublish(r)}`,
        { parse_mode: 'HTML' },
      );
      if (r.pushed && r.deploy !== 'none') {
        verifyOnline(ctx, liveCheck.hasText(carUrl(site, slug), carLabel(record)), 'fiche en ligne', () =>
          registerCarPage(site, slug),
        );
      }
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

  /* ── Vente / remise en vente / suppression ── */

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
    if (r.pushed && r.deploy !== 'none') {
      const url = carUrl(site, slug);
      verifyOnline(
        ctx,
        disponible ? liveCheck.lacksText(url, '[VENDU]') : liveCheck.hasText(url, '[VENDU]'),
        disponible ? 'fiche remise en vente' : 'fiche marquée vendue',
        () => registerCarPage(site, slug),
      );
    }
  }

  bot.callbackQuery(/^voiture_vendu:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await setAvailability(ctx, ctx.match![1], false);
  });

  bot.callbackQuery(/^voiture_dispo:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await setAvailability(ctx, ctx.match![1], true);
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
    if (r.pushed && r.deploy !== 'none')
      verifyOnline(ctx, liveCheck.gone(carUrl(site, slug)), 'fiche retirée', () =>
        registerCarPage(site, slug, { removed: true }),
      );
  });

  bot.callbackQuery('voiture_action_cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('👌 Annulé.');
  });

  /* ── Modification ── */

  bot.callbackQuery(/^voiture_modif:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    const site = await requireSite(ctx);
    if (!site) return;
    const car = readCars(site.projectPath).find((c) => c.slug === slug);
    if (!car) {
      await ctx.reply(`❌ Véhicule "${slug}" non trouvé.`);
      return;
    }
    startFlow(ctx, 'voiture_modif', { slug, siteKey: site.key });
    await ctx.reply(`✏️ <b>${escapeHtml(carLabel(car))}</b> — que veux-tu corriger ?`, {
      parse_mode: 'HTML',
      reply_markup: fieldKeyboard(),
    });
  });

  bot.callbackQuery(/^voiture_prix:(.+)$/, async (ctx) => {
    const slug = ctx.match![1];
    await ctx.answerCallbackQuery();
    const site = await requireSite(ctx);
    if (!site) return;
    startFlow(ctx, 'voiture_modif', { slug, siteKey: site.key });
    await askField(ctx, 'prix');
  });

  bot.callbackQuery(/^voiture_field:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!(await activeFlow(ctx, 'voiture_modif'))) return;
    await askField(ctx, ctx.match![1] as ModifField);
  });

  bot.callbackQuery('voiture_photos_add', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!(await activeFlow(ctx, 'voiture_modif'))) return;
    await askField(ctx, 'photos_add');
  });

  bot.callbackQuery('voiture_photos_del', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!(await activeFlow(ctx, 'voiture_modif'))) return;
    const found = currentCar(ctx);
    if (!found) return;
    if (found.car.images.length === 0) {
      await ctx.reply("Cette fiche n'a aucune photo.");
      return;
    }
    const kb = new InlineKeyboard();
    found.car.images.forEach((p, i) =>
      kb.text(`Photo ${i + 1} (${p.split('/').pop()})`, `voiture_photo_del:${i}`).row(),
    );
    kb.text('❌ Annuler', 'voiture_confirm_no');
    await ctx.reply('🗑️ Quelle photo retirer ? (la 1re est celle de la vignette)', { reply_markup: kb });
  });

  bot.callbackQuery(/^voiture_photo_del:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!(await activeFlow(ctx, 'voiture_modif'))) return;
    const found = currentCar(ctx);
    if (!found) return;
    const { site, car } = found;
    const index = parseInt(ctx.match![1], 10);
    const removed = car.images[index];
    if (!removed) return;
    const images = car.images.filter((_, i) => i !== index);
    try {
      rmSync(join(site.projectPath, 'public', removed));
    } catch {
      /* fichier déjà absent */
    }
    const file = removed.split('/').pop() ?? removed;
    await applyModif(
      ctx,
      site,
      car,
      { images },
      `photo retirée (${file})`,
      liveCheck.lacksText(carUrl(site, car.slug), file),
    );
  });

  bot.callbackQuery('voiture_mdesc_ok', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!(await activeFlow(ctx, 'voiture_modif'))) return;
    const found = currentCar(ctx);
    const pending = ctx.session.context?.pending as string | undefined;
    if (!found || !pending) return;
    await applyModif(
      ctx,
      found.site,
      found.car,
      { description: pending },
      `description réécrite (${countWords(pending)} mots)`,
      liveCheck.hasText(carUrl(found.site, found.car.slug), pending.slice(0, 60)),
    );
  });

  bot.callbackQuery('voiture_mdesc_retry', async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!(await activeFlow(ctx, 'voiture_modif'))) return;
    await proposeRewrite(ctx, (ctx.session.context?.notes as string) || '');
  });

  /** Réécriture d'une fiche existante : proposition à valider avant publication. */
  async function proposeRewrite(ctx: BotContext, notes: string): Promise<void> {
    const found = currentCar(ctx);
    if (!found) return;
    await ctx.reply('✍️ Rédaction en cours (30 secondes environ)...');
    const text = await rewriteDescription(found.site, found.car, !found.car.disponible, notes);
    if (!text) {
      await ctx.reply(
        `⚠️ Le rédacteur ne répond pas. Envoie ton texte toi-même (au moins ${MIN_MANUAL_WORDS} mots).`,
      );
      return;
    }
    ctx.session.context!.pending = text;
    ctx.session.context!.notes = notes;
    await ctx.reply(`📄 <b>Nouvelle description</b> (${countWords(text)} mots)\n\n${escapeHtml(text)}`, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Publier', 'voiture_mdesc_ok')
        .text('🔁 Refaire', 'voiture_mdesc_retry')
        .row()
        .text('❌ Annuler', 'voiture_confirm_no'),
    });
  }

  /* ── Photos (ajout et modification) ── */

  function photosExpected(ctx: BotContext): boolean {
    if (ctx.session.awaitingInput === 'voiture_add') return ctx.session.context?.step === 'photos';
    if (ctx.session.awaitingInput === 'voiture_modif') return ctx.session.context?.field === 'photos_add';
    return false;
  }

  async function collectPhoto(ctx: BotContext, fileId: string): Promise<void> {
    const draft = ctx.session.context?.draft as CarDraft | undefined;
    if (!draft) return;
    const already =
      ctx.session.awaitingInput === 'voiture_modif' ? (currentCar(ctx)?.car.images.length ?? 0) : 0;
    if (already + draft.images.length >= MAX_PHOTOS) {
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
    if (!photosExpected(ctx)) return next();
    const photos = ctx.message.photo;
    await collectPhoto(ctx, photos[photos.length - 1].file_id);
  });

  bot.on('message:document', async (ctx, next) => {
    if (!photosExpected(ctx)) return next();
    const doc = ctx.message.document;
    if (!doc.mime_type?.startsWith('image/')) {
      await ctx.reply("📸 Ce fichier n'est pas une image.");
      return;
    }
    await collectPhoto(ctx, doc.file_id);
  });

  /* ── Saisies texte ── */

  async function handleModifText(ctx: BotContext, text: string): Promise<void> {
    const found = currentCar(ctx);
    if (!found) {
      clearFlow(ctx);
      await ctx.reply('❌ Session expirée. Relance /voiture modif.');
      return;
    }
    const { site, car } = found;
    const url = carUrl(site, car.slug);
    const field = ctx.session.context?.field as ModifField | undefined;
    const lower = text.toLowerCase();

    switch (field) {
      case 'prix': {
        const prix = parseInt(text.replace(/[^\d]/g, ''));
        if (!prix) {
          await ctx.reply('❌ Prix invalide. Tape un montant en euros (ex: 8500).');
          return;
        }
        await applyModif(
          ctx,
          site,
          car,
          { prix },
          `prix ${fr(car.prix)}€ → ${fr(prix)}€`,
          liveCheck.hasText(url, `${fr(prix)} €`),
        );
        return;
      }
      case 'km': {
        const km = parseInt(text.replace(/[^\d]/g, ''));
        if (isNaN(km)) {
          await ctx.reply('❌ Kilométrage invalide.');
          return;
        }
        await applyModif(
          ctx,
          site,
          car,
          { kilometrage: km },
          `kilométrage → ${fr(km)} km`,
          liveCheck.hasText(url, `${fr(km)} km`),
        );
        return;
      }
      case 'couleur':
        await applyModif(
          ctx,
          site,
          car,
          { couleur: text },
          `couleur → ${text}`,
          liveCheck.hasText(url, text),
        );
        return;
      case 'chevaux':
        await applyModif(
          ctx,
          site,
          car,
          { chevaux: text },
          `motorisation → ${text}`,
          liveCheck.hasText(url, text),
        );
        return;
      case 'equipements': {
        const equipements = normalizeEquipements(text.split(/[,;\n]/));
        await applyModif(
          ctx,
          site,
          car,
          { equipements },
          `équipements : ${equipements.join(', ')}`,
          liveCheck.hasText(url, equipements[0] ?? carLabel(car)),
        );
        return;
      }
      case 'description': {
        if (lower.startsWith('refaire')) {
          await proposeRewrite(ctx, text.slice('refaire'.length).replace(/^[\s:—-]+/, ''));
          return;
        }
        const words = countWords(text);
        if (words < MIN_MANUAL_WORDS) {
          await ctx.reply(
            `❌ ${words} mots : il en faut au moins ${MIN_MANUAL_WORDS}. Complète ton texte, ou tape "refaire".`,
          );
          return;
        }
        await applyModif(
          ctx,
          site,
          car,
          { description: text },
          `description (${words} mots)`,
          liveCheck.hasText(url, text.slice(0, 60)),
        );
        return;
      }
      case 'photos_add': {
        const draft = ctx.session.context?.draft as CarDraft | undefined;
        if (!['ok', 'fin', 'done'].includes(lower) || !draft) {
          await ctx.reply('📸 Envoie une photo ou tape "ok" quand c\'est fini.');
          return;
        }
        if (draft.images.length === 0) {
          clearFlow(ctx);
          await ctx.reply('Aucune photo reçue, rien à changer.');
          return;
        }
        await ctx.reply('⏳ Enregistrement des photos...');
        const images = [...car.images];
        let n = nextPhotoIndex(car);
        for (const src of draft.images) {
          images.push(await saveCarPhoto(site.projectPath, car.slug, n++, await fetchTelegramFile(src)));
        }
        const last = images[images.length - 1].split('/').pop() ?? '';
        await applyModif(
          ctx,
          site,
          car,
          { images },
          `${draft.images.length} photo(s) ajoutée(s)`,
          liveCheck.hasText(url, last),
        );
        return;
      }
      default:
        await ctx.reply('Choisis d\'abord ce que tu veux corriger avec les boutons, ou tape "annuler".');
    }
  }

  bot.on('message:text', async (ctx, next) => {
    const awaiting = ctx.session.awaitingInput;
    if (awaiting !== 'voiture_add' && awaiting !== 'voiture_modif') return next();

    const text = ctx.message.text.trim();
    const lower = text.toLowerCase();
    if (lower === 'annuler' || lower === 'stop') {
      clearFlow(ctx);
      await ctx.reply('❌ Annulé.');
      return;
    }

    if (awaiting === 'voiture_modif') {
      if (!(await activeFlow(ctx, 'voiture_modif'))) return;
      try {
        await handleModifText(ctx, text);
      } catch (e) {
        clearFlow(ctx);
        await ctx.reply(`❌ Erreur: ${escapeHtml((e as Error).message)}`);
        logger.error(`Voiture modif failed: ${(e as Error).message}`);
      }
      return;
    }

    const context = await activeFlow(ctx, 'voiture_add');
    if (!context) return;
    const step = context.step as VoitureStep | undefined;
    const draft = context.draft as CarDraft | undefined;
    if (!step || !draft) return next();

    const goTo = async (next: VoitureStep, extra?: Parameters<typeof ctx.reply>[1]) => {
      ctx.session.context!.step = next;
      await ctx.reply(STEP_PROMPTS[next], { parse_mode: 'HTML', ...extra });
    };

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
