import { Bot } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { getSupabase } from '../../db/supabase.js';

/**
 * `/note` — capture depuis le téléphone.
 *
 * Le dashboard tourne en local sur le VPS : loin du bureau, une idée ou une
 * promesse client se notait ailleurs et se perdait. Cette commande écrit dans
 * la même table `site_tasks` que l'onglet Chantiers, sans passer par le
 * dashboard (qui peut être arrêté) — le tri se fait plus tard, à l'écran.
 *
 * On ne classe pas au moment de la note : tout arrive en `inbox`.
 */

/** États non clos, dans l'ordre où ils réclament un geste. */
const OPEN_STATUSES = ['inbox', 'blocked', 'doing', 'todo'] as const;

const STATUS_LABELS: Record<string, string> = {
  inbox: 'à trier',
  todo: 'à faire',
  doing: 'en cours',
  blocked: 'bloqué',
  idea: 'idée',
  done: 'fait',
  dropped: 'abandonné',
};

/**
 * « noia: refaire le hero » → site `noia`.
 *
 * Même règle que `splitSitePrefix` du dashboard (`src/lib/tasks.ts` de
 * seo-dashboard) : les deux écrivent dans la même table sans passer l'un par
 * l'autre. À tenir à jour des deux côtés.
 */
export function splitSitePrefix(raw: string, knownKeys: string[]): { siteKey: string | null; title: string } {
  const text = raw.trim();
  const sep = text.indexOf(':');
  if (sep <= 0) return { siteKey: null, title: text };

  const prefix = text.slice(0, sep).trim().toLowerCase();
  const rest = text.slice(sep + 1).trim();
  if (!rest) return { siteKey: null, title: text };

  const exact = knownKeys.find((k) => k.toLowerCase() === prefix);
  if (exact) return { siteKey: exact, title: rest };

  const partial = knownKeys.filter((k) => k.toLowerCase().startsWith(prefix));
  if (partial.length === 1 && prefix.length >= 3) return { siteKey: partial[0], title: rest };

  return { siteKey: null, title: text };
}

/** Repère court et stable d'un chantier, pour `/note fait <ref>`. */
function shortRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 4);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function registerNoteCommand(bot: Bot<BotContext>) {
  bot.command('note', async (ctx) => {
    const raw = ctx.match?.trim() || '';
    const db = getSupabase();

    // `/note` seul : ce qui est ouvert, pour se remettre en tête où on en est.
    if (!raw) {
      const { data, error } = await db
        .from('site_tasks')
        .select('id, site_key, title, status, blocked_by')
        .in('status', OPEN_STATUSES)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        await ctx.reply(`Lecture impossible : ${error.message}`);
        return;
      }
      if (!data?.length) {
        await ctx.reply('Aucun chantier ouvert.\n\nUsage : /note [site:] texte');
        return;
      }

      const lines = [`<b>Chantiers ouverts (${data.length})</b>\n`];
      for (const t of data) {
        const site = t.site_key ? `${sites[t.site_key]?.name || t.site_key} — ` : '';
        const attente = t.status === 'blocked' && t.blocked_by ? ` (attend ${t.blocked_by})` : '';
        lines.push(
          `<code>${shortRef(t.id)}</code> ${site}${escapeHtml(t.title)}` +
            ` <i>${STATUS_LABELS[t.status] || t.status}${attente}</i>`,
        );
      }
      lines.push('\n<i>/note fait &lt;ref&gt; pour clore · /note texte pour ajouter</i>');
      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
      return;
    }

    // `/note fait a1b2` : clore depuis le téléphone, sans ouvrir le dashboard.
    const doneMatch = raw.match(/^fait\s+([0-9a-f]{4,})$/i);
    if (doneMatch) {
      const ref = doneMatch[1].toLowerCase();
      const { data } = await db.from('site_tasks').select('id, title').in('status', OPEN_STATUSES).limit(200);
      const hits = (data || []).filter((t) => shortRef(t.id).startsWith(ref));
      if (hits.length === 0) {
        await ctx.reply(`Aucun chantier ouvert avec la référence ${ref}.`);
        return;
      }
      if (hits.length > 1) {
        await ctx.reply(`Référence ambiguë (${hits.length} chantiers) — donne plus de caractères.`);
        return;
      }
      const now = new Date().toISOString();
      const { error } = await db
        .from('site_tasks')
        .update({ status: 'done', done_at: now, updated_at: now })
        .eq('id', hits[0].id);
      if (error) {
        await ctx.reply(`Non enregistré : ${error.message}`);
        return;
      }
      await ctx.reply(`✅ Fait : ${escapeHtml(hits[0].title)}`, { parse_mode: 'HTML' });
      return;
    }

    const { siteKey, title } = splitSitePrefix(raw, Object.keys(sites));
    const { data, error } = await db
      .from('site_tasks')
      .insert({
        site_key: siteKey,
        title: title.slice(0, 500),
        status: 'inbox',
        source: 'telegram',
      })
      .select('id')
      .single();
    if (error) {
      await ctx.reply(`Note non enregistrée : ${error.message}`);
      return;
    }

    const cible = siteKey ? sites[siteKey]?.name || siteKey : 'sans site';
    await ctx.reply(
      `📝 Noté <code>${shortRef(data.id)}</code> — <i>${escapeHtml(cible)}</i>\n${escapeHtml(title)}\n\n` +
        `<i>À trier dans Chantiers.</i>`,
      { parse_mode: 'HTML' },
    );
  });
}
