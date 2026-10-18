/**
 * Module Fiches Google (GBP) — collecte des faits, un site à la fois.
 *
 * Répond à « où en est notre fiche, et qui est devant elle dans le pack local ? »
 * en écrivant des FAITS :
 *  1. la fiche telle que Google l'affiche (catégorie, horaires, note, votes, site,
 *     tél, photos) → `gbp_snapshots`
 *  2. notre rang Maps sur les requêtes du site, et les fiches devant nous
 *     → `gbp_rank`
 *  3. les derniers avis → `gbp_reviews` (alerte Telegram sur un nouvel avis)
 * Le verdict (catégorie, votes, horaires…) et les actions se calculent côté
 * dashboard, jamais ici.
 *
 * Opt-in : seule une fiche `confirmed` dans `gbp_listings` est suivie chaque
 * semaine. Un site actif sans fiche reçoit une proposition (`candidate`) à
 * partir de son nom et de sa ville — à confirmer dans le dashboard.
 *
 * Usage :
 *   npx tsx src/jobs/gbp-scan.ts                      # simulation, fiches confirmées
 *   npx tsx src/jobs/gbp-scan.ts --site=nuit          # un site
 *   npx tsx src/jobs/gbp-scan.ts --apply --trigger=cron  # écrit (cron du lundi 7h20)
 *   npx tsx src/jobs/gbp-scan.ts --max-queries=10
 *
 * Comme `crawl.ts`, le défaut est la simulation : `--apply` écrit.
 */
import { randomUUID } from 'crypto';
import { getSupabase, log } from '../db/supabase.js';
import * as logger from '../utils/logger.js';
import { sendTelegram } from '../notifications/telegram.js';
import { QUERY_LIMITS, loadQueryInputs, selectQueries } from '../competitors/queries.js';
import { LOCATION_LOCAL } from '../competitors/serp.js';
import { locationCoordinate } from '../gbp/geo.js';
import { fetchListingInfo } from '../gbp/info.js';
import { fetchMaps } from '../gbp/maps.js';
import { fetchReviews, getReviewsTask } from '../gbp/reviews.js';
import type { GbpListingRow, ListingFacts, MapsItem, ReviewFacts } from '../gbp/types.js';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--site='))?.split('=')[1];
const apply = args.includes('--apply');
const trigger = args.find((a) => a.startsWith('--trigger='))?.split('=')[1] || 'cli';
const maxQueries = Number(args.find((a) => a.startsWith('--max-queries='))?.split('=')[1] || 20);

/** Fiches gardées par requête : la nôtre + celles devant elle, plafonné. */
const RANK_KEEP = 5;

interface SiteRow {
  site_key: string;
  name: string | null;
  domain: string | null;
  services: unknown;
  city: string | null;
  is_active: boolean;
}

interface SiteReport {
  listing: string | null;
  queries: number;
  ranked: number;
  reviews_new: number;
  cost: number;
  skipped?: string;
}

const mapsUrl = (cid: string) => `https://www.google.com/maps?cid=${cid}`;
const reviewUrl = (placeId: string) => `https://search.google.com/local/writereview?placeid=${placeId}`;

function describeHours(hours: unknown): string {
  const t =
    (hours as Record<
      string,
      Array<{ open?: { hour: number; minute: number }; close?: { hour: number; minute: number } }> | null
    > | null) ?? null;
  if (!t) return 'horaires inconnus';
  const day = t.monday?.[0] ?? t.friday?.[0];
  if (!day?.open || !day.close) return 'horaires inconnus';
  const f = (h: { hour: number; minute: number }) =>
    `${h.hour}h${h.minute ? String(h.minute).padStart(2, '0') : ''}`;
  return `${f(day.open)}-${f(day.close)}`;
}

/** Un site actif sans fiche : on cherche par nom + ville, une fois par semaine (cache). */
async function discover(
  db: ReturnType<typeof getSupabase>,
  site: SiteRow,
): Promise<{ facts: ListingFacts | null; cost: number }> {
  const keyword = `${site.name ?? site.site_key} ${site.city ?? 'Perpignan'}`.trim();
  const { facts, cost } = await fetchListingInfo({ keyword }, LOCATION_LOCAL);
  if (!facts?.cid) {
    console.log(
      `  Aucune fiche trouvée pour « ${keyword} » — saisir le CID dans le dashboard si elle existe.`,
    );
    return { facts: null, cost };
  }
  console.log(
    `  Fiche proposée : « ${facts.name} » (${facts.primary_category ?? '?'}, ${facts.rating ?? '-'}★ ${facts.votes ?? 0} avis, CID ${facts.cid})`,
  );
  if (apply) {
    const { error } = await db.from('gbp_listings').upsert(
      {
        site_key: site.site_key,
        cid: facts.cid,
        place_id: facts.place_id,
        name: facts.name,
        primary_category: facts.primary_category,
        categories: facts.categories,
        hours: facts.hours,
        website: facts.website,
        phone: facts.phone,
        rating: facts.rating,
        votes: facts.votes,
        is_claimed: facts.is_claimed,
        photos: facts.photos,
        status: 'candidate',
        origin: 'scan',
        maps_url: mapsUrl(facts.cid),
        review_url: facts.place_id ? reviewUrl(facts.place_id) : null,
        last_info_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_key,cid', ignoreDuplicates: true },
    );
    if (error) throw new Error(`gbp_listings ${site.site_key} : ${error.message}`);
  }
  return { facts, cost };
}

async function scanListing(
  db: ReturnType<typeof getSupabase>,
  site: SiteRow,
  listing: GbpListingRow,
  runId: string,
): Promise<SiteReport> {
  let cost = 0;
  const now = new Date().toISOString();
  if (!listing.cid) throw new Error('fiche confirmée sans CID');

  // ─── 1. La fiche telle que Google l'affiche ──────────────────────────────
  const info = await fetchListingInfo({ cid: listing.cid }, LOCATION_LOCAL);
  cost += info.cost;
  const facts = info.facts;
  if (facts) {
    console.log(
      `  Fiche : « ${facts.name} » — ${facts.primary_category ?? '?'} · ${facts.rating ?? '-'}★ (${facts.votes ?? 0} avis) · ${describeHours(facts.hours)} · site ${facts.website ? 'oui' : 'NON'} · ${facts.photos ?? '?'} photos`,
    );
  } else {
    console.log('  Fiche introuvable par CID (supprimée ? fusionnée ?)');
  }

  // ─── 2. Le pack local sur les requêtes du site ───────────────────────────
  const inputs = await loadQueryInputs(db, {
    site_key: site.site_key,
    services: site.services,
    city: site.city,
  });
  const queries = selectQueries(inputs, { ...QUERY_LIMITS, total: maxQueries });
  const geo = locationCoordinate(site.city);
  if (!geo.known)
    logger.warn(
      `${site.site_key} : ville « ${site.city ?? '?'} » inconnue de gbp/geo.ts, Maps vu depuis Perpignan`,
    );
  const rankRows: Array<Record<string, unknown>> = [];
  let ranked = 0;
  for (const q of queries) {
    const { items, cost: c } = await fetchMaps(q.query, geo.coord);
    cost += c;
    const ours = items.find((i) => i.cid === listing.cid);
    const keep: MapsItem[] = items.filter((i) => i.rank <= RANK_KEEP || i.cid === listing.cid);
    if (ours) ranked++;
    console.log(
      `  ${String(ours ? `#${ours.rank}` : '—').padStart(4)}  ${q.query.padEnd(44)} ${items[0] ? `1er : ${items[0].name.slice(0, 32)} (${items[0].votes ?? 0} avis)` : 'aucun résultat'}`,
    );
    for (const i of keep) {
      rankRows.push({
        run_id: runId,
        site_key: site.site_key,
        query: q.query,
        query_source: q.source,
        impressions: q.impressions,
        rank: i.rank,
        cid: i.cid,
        place_id: i.place_id,
        name: i.name,
        category: i.category,
        rating: i.rating,
        votes: i.votes,
        is_ours: i.cid === listing.cid,
        fetched_at: now,
      });
    }
  }

  // ─── 3. Les avis ─────────────────────────────────────────────────────────
  let reviews: ReviewFacts[] = [];
  let pendingTask: string | null = null;
  try {
    if (listing.pending_reviews_task) {
      const r = await getReviewsTask(listing.pending_reviews_task);
      if (r) {
        reviews = r.reviews;
        cost += r.cost;
      } else pendingTask = listing.pending_reviews_task;
    } else {
      const { taskId, result } = await fetchReviews(listing.cid, LOCATION_LOCAL);
      if (result) {
        reviews = result.reviews;
        cost += result.cost;
      } else pendingTask = taskId;
    }
  } catch (e) {
    logger.warn(`Avis ${site.site_key} : ${(e as Error).message}`);
  }
  const { data: known } = await db.from('gbp_reviews').select('review_id').eq('listing_id', listing.id);
  const knownIds = new Set((known ?? []).map((r) => r.review_id as string));
  const fresh = reviews.filter((r) => !knownIds.has(r.review_id));
  const firstPass = knownIds.size === 0;
  console.log(
    `  Avis lus : ${reviews.length}${pendingTask ? ' (tâche en attente)' : ''} — nouveaux : ${fresh.length}${firstPass ? ' (premier passage)' : ''}`,
  );

  if (!apply)
    return { listing: listing.cid, queries: queries.length, ranked, reviews_new: fresh.length, cost };

  // ─── Écriture ────────────────────────────────────────────────────────────
  if (facts) {
    const { error } = await db.from('gbp_snapshots').insert({
      run_id: runId,
      site_key: site.site_key,
      listing_id: listing.id,
      name: facts.name,
      primary_category: facts.primary_category,
      categories: facts.categories,
      hours: facts.hours,
      website: facts.website,
      phone: facts.phone,
      rating: facts.rating,
      votes: facts.votes,
      is_claimed: facts.is_claimed,
      photos: facts.photos,
      raw: facts.raw,
      fetched_at: now,
    });
    if (error) throw new Error(`gbp_snapshots : ${error.message}`);
  }
  for (let i = 0; i < rankRows.length; i += 200) {
    const { error } = await db.from('gbp_rank').insert(rankRows.slice(i, i + 200));
    if (error) throw new Error(`gbp_rank : ${error.message}`);
  }
  if (reviews.length) {
    const { error } = await db.from('gbp_reviews').upsert(
      reviews.map((r) => ({
        listing_id: listing.id,
        site_key: site.site_key,
        review_id: r.review_id,
        author: r.author,
        rating: r.rating,
        text: r.text,
        published_at: r.published_at,
        owner_reply: r.owner_reply,
        ...(knownIds.has(r.review_id) ? {} : { first_seen_run: runId }),
      })),
      { onConflict: 'listing_id,review_id' },
    );
    if (error) throw new Error(`gbp_reviews : ${error.message}`);
  }
  const { error: lErr } = await db
    .from('gbp_listings')
    .update({
      ...(facts
        ? {
            name: facts.name,
            place_id: facts.place_id ?? listing.place_id,
            primary_category: facts.primary_category,
            categories: facts.categories,
            hours: facts.hours,
            website: facts.website,
            phone: facts.phone,
            rating: facts.rating,
            votes: facts.votes,
            is_claimed: facts.is_claimed,
            photos: facts.photos,
            maps_url: mapsUrl(listing.cid),
            review_url:
              (facts.place_id ?? listing.place_id)
                ? reviewUrl((facts.place_id ?? listing.place_id) as string)
                : null,
            last_info_at: now,
          }
        : {}),
      pending_reviews_task: pendingTask,
      updated_at: now,
    })
    .eq('id', listing.id);
  if (lErr) throw new Error(`gbp_listings : ${lErr.message}`);

  // Un nouvel avis = une réponse à écrire : l'admin le sait tout de suite.
  if (!firstPass && fresh.length) {
    const lines = fresh
      .slice(0, 5)
      .map(
        (r) =>
          `${'★'.repeat(Math.round(r.rating ?? 0))} ${r.author ?? 'Anonyme'} — ${(r.text ?? '(sans texte)').slice(0, 160)}`,
      );
    await sendTelegram(
      `⭐ <b>${fresh.length} nouvel${fresh.length > 1 ? 's' : ''} avis Google</b> — ${site.name ?? site.site_key}\n\n${lines.join('\n\n')}\n\n<i>Réponse à rédiger dans le dashboard (/gbp).</i>`,
    );
  }

  return { listing: listing.cid, queries: queries.length, ranked, reviews_new: fresh.length, cost };
}

async function main() {
  const started = Date.now();
  const runId = randomUUID();
  const db = getSupabase();

  const { data: sites, error } = await db
    .from('site_profiles')
    .select('site_key, name, domain, services, city, is_active')
    .order('site_key');
  if (error) throw new Error(`Registre des sites : ${error.message}`);
  const { data: listingRows, error: lErr } = await db
    .from('gbp_listings')
    .select('id, site_key, cid, place_id, name, status, pending_reviews_task');
  if (lErr) throw new Error(`gbp_listings : ${lErr.message}`);
  const listings = (listingRows ?? []) as GbpListingRow[];

  const targets = ((sites ?? []) as SiteRow[]).filter((s) => (only ? s.site_key === only : s.is_active));
  if (targets.length === 0) {
    console.log(only ? `Aucun site « ${only} ».` : 'Aucun site actif.');
    return;
  }
  console.log(
    apply
      ? '\n=== FICHES GOOGLE (écriture en base) ==='
      : '\n=== FICHES GOOGLE — SIMULATION (--apply pour écrire) ===',
  );

  const reports: Record<string, SiteReport> = {};
  let hadError = false;
  for (const site of targets) {
    const mine = listings.filter((l) => l.site_key === site.site_key);
    const confirmed = mine.find((l) => l.status === 'confirmed');
    console.log(
      `\n▶ ${site.site_key} — ${site.name ?? ''} (${confirmed ? 'fiche confirmée' : mine.length ? `${mine.length} candidate(s), aucune confirmée` : 'aucune fiche'})`,
    );
    try {
      if (confirmed) {
        reports[site.site_key] = await scanListing(db, site, confirmed, runId);
      } else if (mine.length === 0) {
        const { cost } = await discover(db, site);
        reports[site.site_key] = {
          listing: null,
          queries: 0,
          ranked: 0,
          reviews_new: 0,
          cost,
          skipped: 'à confirmer',
        };
      } else {
        reports[site.site_key] = {
          listing: null,
          queries: 0,
          ranked: 0,
          reviews_new: 0,
          cost: 0,
          skipped: 'candidate non confirmée',
        };
      }
    } catch (e) {
      hadError = true;
      logger.error(`GBP ${site.site_key} : ${(e as Error).message}`);
      reports[site.site_key] = {
        listing: null,
        queries: 0,
        ranked: 0,
        reviews_new: 0,
        cost: 0,
        skipped: (e as Error).message,
      };
    }
  }

  const totalCost = Object.values(reports).reduce((s, r) => s + r.cost, 0);
  const durationMs = Date.now() - started;
  console.log(`\nCoût DataForSEO déclaré : $${totalCost.toFixed(3)} — ${Math.round(durationMs / 1000)} s`);

  if (apply) {
    await log(
      'gbp-scan',
      'scan',
      hadError ? 'warning' : 'success',
      undefined,
      { run_id: runId, trigger, sites: reports, cost: totalCost },
      durationMs,
    );
  }
}

main().catch((e) => {
  logger.error(`gbp-scan : ${(e as Error).message}`);
  process.exit(1);
});
