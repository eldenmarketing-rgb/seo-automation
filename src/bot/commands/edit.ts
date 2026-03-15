import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { getSupabase, SeoPageRow } from '../../db/supabase.js';
import { injectPages } from '../../deployers/inject-pages.js';
import { triggerDeploy } from '../../deployers/vercel-deploy.js';
import * as logger from '../../utils/logger.js';

// Editable fields with display names
const EDITABLE_FIELDS: Record<string, { label: string; path: string; inContent: boolean }> = {
  metaTitle:       { label: 'Meta Title', path: 'meta_title', inContent: false },
  metaDescription: { label: 'Meta Description', path: 'meta_description', inContent: false },
  h1:              { label: 'H1', path: 'h1', inContent: false },
  heroTitle:       { label: 'Hero Title', path: 'content.heroTitle', inContent: true },
  heroSubtitle:    { label: 'Hero Subtitle', path: 'content.heroSubtitle', inContent: true },
  intro:           { label: 'Introduction', path: 'content.intro', inContent: true },
};

export function registerEditCommand(bot: Bot<BotContext>) {
  // /edit site slug
  bot.command('edit', async (ctx) => {
    const args = ctx.match?.trim().split(/\s+/) || [];

    if (args.length < 2) {
      await ctx.reply(
        `<b>Usage :</b>\n` +
        `/edit [site] [slug]\n\n` +
        `<b>Exemple :</b>\n` +
        `/edit garage vidange-perpignan\n` +
        `/edit vtc taxi-vtc-collioure`,
        { parse_mode: 'HTML' }
      );
      return;
    }

    const [siteKey, slug] = args;

    if (!sites[siteKey]) {
      await ctx.reply(`Site inconnu: ${siteKey}\nDisponibles: ${Object.keys(sites).join(', ')}`);
      return;
    }

    await showPageEditor(ctx, siteKey, slug);
  });

  // Field selection callback
  bot.callbackQuery(/^edit_field:(.+):(.+):(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    const fieldKey = ctx.match![3];

    await ctx.answerCallbackQuery();

    const field = EDITABLE_FIELDS[fieldKey];
    if (!field) {
      await ctx.editMessageText('Champ inconnu.');
      return;
    }

    // Get current value
    const page = await getPage(siteKey, slug);
    if (!page) {
      await ctx.editMessageText('Page introuvable.');
      return;
    }

    const currentValue = getFieldValue(page, fieldKey);

    ctx.session.awaitingInput = 'edit_page';
    ctx.session.context = { siteKey, slug, fieldKey, fieldLabel: field.label };

    await ctx.editMessageText(
      `<b>Modifier : ${field.label}</b>\n\n` +
      `Page : <code>${slug}</code>\n\n` +
      `<b>Valeur actuelle :</b>\n` +
      `<i>${truncate(currentValue, 500)}</i>\n\n` +
      `Envoie la nouvelle valeur :`,
      { parse_mode: 'HTML' }
    );
  });

  // Section edit callback
  bot.callbackQuery(/^edit_section:(.+):(.+):(\d+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    const sectionIdx = parseInt(ctx.match![3], 10);

    await ctx.answerCallbackQuery();

    const page = await getPage(siteKey, slug);
    if (!page) {
      await ctx.editMessageText('Page introuvable.');
      return;
    }

    const sections = (page.content as Record<string, unknown>).seoSections as Array<Record<string, string>> | undefined;
    const section = sections?.[sectionIdx];

    if (!section) {
      await ctx.editMessageText('Section introuvable.');
      return;
    }

    const keyboard = new InlineKeyboard();
    keyboard.text('Modifier le titre', `edit_sec_field:${siteKey}:${slug}:${sectionIdx}:title`).row();
    keyboard.text('Modifier le contenu', `edit_sec_field:${siteKey}:${slug}:${sectionIdx}:content`).row();
    keyboard.text('← Retour', `edit_back:${siteKey}:${slug}`).row();

    await ctx.editMessageText(
      `<b>Section ${sectionIdx + 1}</b>\n\n` +
      `<b>Titre :</b> ${section.title}\n\n` +
      `<b>Contenu :</b>\n<i>${truncate(section.content, 300)}</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // Section field edit
  bot.callbackQuery(/^edit_sec_field:(.+):(.+):(\d+):(title|content)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    const sectionIdx = parseInt(ctx.match![3], 10);
    const fieldName = ctx.match![4];

    await ctx.answerCallbackQuery();

    const page = await getPage(siteKey, slug);
    const sections = (page?.content as Record<string, unknown>)?.seoSections as Array<Record<string, string>> | undefined;
    const section = sections?.[sectionIdx];

    ctx.session.awaitingInput = 'edit_section';
    ctx.session.context = { siteKey, slug, sectionIdx, fieldName };

    await ctx.editMessageText(
      `<b>Modifier ${fieldName === 'title' ? 'le titre' : 'le contenu'} — Section ${sectionIdx + 1}</b>\n\n` +
      `<b>Actuel :</b>\n<i>${truncate(section?.[fieldName] || '', 400)}</i>\n\n` +
      `Envoie la nouvelle valeur :`,
      { parse_mode: 'HTML' }
    );
  });

  // FAQ edit callback
  bot.callbackQuery(/^edit_faq:(.+):(.+):(\d+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    const faqIdx = parseInt(ctx.match![3], 10);

    await ctx.answerCallbackQuery();

    const page = await getPage(siteKey, slug);
    const faqs = (page?.content as Record<string, unknown>)?.faq as Array<Record<string, string>> | undefined;
    const faq = faqs?.[faqIdx];

    if (!faq) {
      await ctx.editMessageText('FAQ introuvable.');
      return;
    }

    const keyboard = new InlineKeyboard();
    keyboard.text('Modifier la question', `edit_faq_field:${siteKey}:${slug}:${faqIdx}:question`).row();
    keyboard.text('Modifier la réponse', `edit_faq_field:${siteKey}:${slug}:${faqIdx}:answer`).row();
    keyboard.text('← Retour', `edit_back:${siteKey}:${slug}`).row();

    await ctx.editMessageText(
      `<b>FAQ ${faqIdx + 1}</b>\n\n` +
      `<b>Q :</b> ${faq.question}\n\n` +
      `<b>R :</b> <i>${truncate(faq.answer, 300)}</i>`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  });

  // FAQ field edit
  bot.callbackQuery(/^edit_faq_field:(.+):(.+):(\d+):(question|answer)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    const faqIdx = parseInt(ctx.match![3], 10);
    const fieldName = ctx.match![4];

    await ctx.answerCallbackQuery();

    const page = await getPage(siteKey, slug);
    const faqs = (page?.content as Record<string, unknown>)?.faq as Array<Record<string, string>> | undefined;
    const faq = faqs?.[faqIdx];

    ctx.session.awaitingInput = 'edit_faq';
    ctx.session.context = { siteKey, slug, faqIdx, fieldName };

    await ctx.editMessageText(
      `<b>Modifier ${fieldName === 'question' ? 'la question' : 'la réponse'} — FAQ ${faqIdx + 1}</b>\n\n` +
      `<b>Actuel :</b>\n<i>${truncate(faq?.[fieldName] || '', 400)}</i>\n\n` +
      `Envoie la nouvelle valeur :`,
      { parse_mode: 'HTML' }
    );
  });

  // Deploy callback
  bot.callbackQuery(/^edit_deploy:(.+):(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Déploiement de <b>${slug}</b>...`, { parse_mode: 'HTML' });

    const page = await getPage(siteKey, slug);
    if (page) {
      await injectPages(siteKey, [page]);
      const ok = await triggerDeploy(siteKey);
      await ctx.reply(ok ? `✅ <b>${slug}</b> redéployé` : `❌ Échec du déploiement`, { parse_mode: 'HTML' });
    }
  });

  // Back to editor
  bot.callbackQuery(/^edit_back:(.+):(.+)$/, async (ctx) => {
    const siteKey = ctx.match![1];
    const slug = ctx.match![2];
    await ctx.answerCallbackQuery();
    await showPageEditor(ctx, siteKey, slug);
  });

  // Handle text input for edits
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.session.awaitingInput?.startsWith('edit_')) {
      return next();
    }

    const sessionCtx = ctx.session.context as Record<string, unknown>;
    const siteKey = sessionCtx.siteKey as string;
    const slug = sessionCtx.slug as string;
    const newValue = ctx.message.text;

    try {
      if (ctx.session.awaitingInput === 'edit_page') {
        const fieldKey = sessionCtx.fieldKey as string;
        const fieldLabel = sessionCtx.fieldLabel as string;
        await updateField(siteKey, slug, fieldKey, newValue);
        await ctx.reply(`✅ <b>${fieldLabel}</b> mis à jour\n\nNouvelle valeur : <i>${truncate(newValue, 200)}</i>`, { parse_mode: 'HTML' });
      } else if (ctx.session.awaitingInput === 'edit_section') {
        const sectionIdx = sessionCtx.sectionIdx as number;
        const fieldName = sessionCtx.fieldName as string;
        await updateSection(siteKey, slug, sectionIdx, fieldName, newValue);
        await ctx.reply(`✅ Section ${sectionIdx + 1} — ${fieldName} mis à jour`, { parse_mode: 'HTML' });
      } else if (ctx.session.awaitingInput === 'edit_faq') {
        const faqIdx = sessionCtx.faqIdx as number;
        const fieldName = sessionCtx.fieldName as string;
        await updateFaq(siteKey, slug, faqIdx, fieldName, newValue);
        await ctx.reply(`✅ FAQ ${faqIdx + 1} — ${fieldName} mis à jour`, { parse_mode: 'HTML' });
      }

      // Show editor again with deploy button
      ctx.session.awaitingInput = undefined;
      ctx.session.context = undefined;
      await showPageEditor(ctx, siteKey, slug);

    } catch (e) {
      await ctx.reply(`❌ Erreur: ${(e as Error).message}`);
      ctx.session.awaitingInput = undefined;
      ctx.session.context = undefined;
    }
  });
}

// --- Helper functions ---

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

async function showPageEditor(ctx: BotContext, siteKey: string, slug: string) {
  const page = await getPage(siteKey, slug);

  if (!page) {
    await ctx.reply(`Page <code>${slug}</code> introuvable pour <b>${siteKey}</b>`, { parse_mode: 'HTML' });
    return;
  }

  const content = page.content as Record<string, unknown>;
  const sections = (content.seoSections || []) as Array<{ title: string }>;
  const faqs = (content.faq || []) as Array<{ question: string }>;

  let msg = `<b>📄 ${slug}</b>\n\n`;
  msg += `<b>Meta Title:</b> ${truncate(page.meta_title, 60)}\n`;
  msg += `<b>Meta Desc:</b> ${truncate(page.meta_description, 80)}\n`;
  msg += `<b>H1:</b> ${truncate(page.h1, 60)}\n`;
  msg += `<b>Hero:</b> ${truncate(content.heroTitle as string || '', 50)}\n`;
  msg += `<b>Intro:</b> ${truncate(content.intro as string || '', 80)}\n`;
  msg += `<b>Sections:</b> ${sections.length}\n`;
  msg += `<b>FAQ:</b> ${faqs.length}\n`;

  const keyboard = new InlineKeyboard();

  // Basic fields
  for (const [key, field] of Object.entries(EDITABLE_FIELDS)) {
    keyboard.text(field.label, `edit_field:${siteKey}:${slug}:${key}`).row();
  }

  // Sections
  sections.forEach((s, i) => {
    keyboard.text(`Section ${i + 1}: ${truncate(s.title, 25)}`, `edit_section:${siteKey}:${slug}:${i}`).row();
  });

  // FAQs
  faqs.forEach((f, i) => {
    keyboard.text(`FAQ ${i + 1}: ${truncate(f.question, 25)}`, `edit_faq:${siteKey}:${slug}:${i}`).row();
  });

  // Deploy button
  keyboard.text('🚀 Redéployer', `edit_deploy:${siteKey}:${slug}`).row();

  await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: keyboard });
}

function getFieldValue(page: SeoPageRow, fieldKey: string): string {
  const field = EDITABLE_FIELDS[fieldKey];
  if (!field) return '';

  if (field.inContent) {
    const contentKey = field.path.replace('content.', '');
    return ((page.content as Record<string, unknown>)[contentKey] as string) || '';
  }

  return (page as unknown as Record<string, string>)[field.path] || '';
}

async function updateField(siteKey: string, slug: string, fieldKey: string, newValue: string) {
  const db = getSupabase();
  const field = EDITABLE_FIELDS[fieldKey];
  if (!field) throw new Error(`Unknown field: ${fieldKey}`);

  const page = await getPage(siteKey, slug);
  if (!page) throw new Error('Page not found');

  if (field.inContent) {
    const contentKey = field.path.replace('content.', '');
    const content = { ...(page.content as Record<string, unknown>), [contentKey]: newValue };
    const { error } = await db
      .from('seo_pages')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('site_key', siteKey)
      .eq('slug', slug);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db
      .from('seo_pages')
      .update({ [field.path]: newValue, updated_at: new Date().toISOString() })
      .eq('site_key', siteKey)
      .eq('slug', slug);
    if (error) throw new Error(error.message);
  }

  logger.info(`Edited ${siteKey}/${slug} — ${fieldKey}: ${newValue.slice(0, 50)}`);
}

async function updateSection(siteKey: string, slug: string, sectionIdx: number, fieldName: string, newValue: string) {
  const db = getSupabase();
  const page = await getPage(siteKey, slug);
  if (!page) throw new Error('Page not found');

  const content = { ...(page.content as Record<string, unknown>) };
  const sections = [...((content.seoSections || []) as Array<Record<string, string>>)];
  if (!sections[sectionIdx]) throw new Error('Section not found');

  sections[sectionIdx] = { ...sections[sectionIdx], [fieldName]: newValue };
  content.seoSections = sections;

  const { error } = await db
    .from('seo_pages')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('site_key', siteKey)
    .eq('slug', slug);
  if (error) throw new Error(error.message);

  logger.info(`Edited section ${sectionIdx} ${fieldName} for ${siteKey}/${slug}`);
}

async function updateFaq(siteKey: string, slug: string, faqIdx: number, fieldName: string, newValue: string) {
  const db = getSupabase();
  const page = await getPage(siteKey, slug);
  if (!page) throw new Error('Page not found');

  const content = { ...(page.content as Record<string, unknown>) };
  const faqs = [...((content.faq || []) as Array<Record<string, string>>)];
  if (!faqs[faqIdx]) throw new Error('FAQ not found');

  faqs[faqIdx] = { ...faqs[faqIdx], [fieldName]: newValue };
  content.faq = faqs;

  const { error } = await db
    .from('seo_pages')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('site_key', siteKey)
    .eq('slug', slug);
  if (error) throw new Error(error.message);

  logger.info(`Edited FAQ ${faqIdx} ${fieldName} for ${siteKey}/${slug}`);
}

function truncate(str: string, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '...' : str;
}
