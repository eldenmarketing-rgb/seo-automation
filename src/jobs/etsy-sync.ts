/**
 * Synchro Etsy ↔ boutique Maison Cirelle (site_key `poopy`), toutes les 15 minutes.
 *
 * Un seul stock physique, deux vitrines. Le **site est la référence** :
 *  1. Nouvelles commandes Etsy (depuis le dernier passage) → alerte Telegram,
 *     et la quantité vendue est retirée du stock du site (`claim_stock`).
 *  2. Stock du site → Etsy : chaque déclinaison dont la quantité Etsy diffère
 *     est réalignée (inventaire réécrit, prix et activation inchangés). Une
 *     vente sur le site disparaît donc d'Etsy au passage suivant.
 * Le lien : l'annonce vient de `product_variants.sku` = `ETSY-<listing>[-<product>]`
 * (posé à l'import, jamais renommé — Merchant Center s'en sert) ; la déclinaison se
 * reconnaît à ses **caractéristiques** (`options` du site ↔ `property_values` d'Etsy),
 * pas au numéro de produit : Etsy renumérote ses déclinaisons à chaque réécriture
 * d'inventaire (constaté le 2026-10-28, les 120 Snapbars ne se retrouvaient plus).
 *
 * Le curseur des commandes = `details.cursor` du dernier passage réussi dans
 * `automation_logs` ; au tout premier passage il part de maintenant (les
 * commandes anciennes ne sont ni annoncées ni décomptées).
 *
 *   npx tsx src/jobs/etsy-sync.ts            # simulation : affiche, n'écrit rien
 *   npx tsx src/jobs/etsy-sync.ts --apply    # écrit (cron toutes les 15 min)
 */
import { getSupabase, log } from '../db/supabase.js';
import { sendTelegram } from '../notifications/telegram.js';
import * as logger from '../utils/logger.js';
import { ETSY_SHOP_ID, ETSY_SITE_KEY, etsy } from '../etsy/client.js';

const JOB = 'etsy-sync';
const apply = process.argv.includes('--apply');
const trigger = process.argv.find((a) => a.startsWith('--trigger='))?.split('=')[1] ?? 'manual';

interface Money {
  amount: number;
  divisor: number;
}
interface Offering {
  offering_id: number;
  price: Money;
  quantity: number;
  is_enabled: boolean;
  is_deleted: boolean;
  readiness_state_id?: number;
}
interface InvProduct {
  product_id: number;
  sku: string;
  is_deleted: boolean;
  offerings: Offering[];
  property_values: {
    property_id: number;
    property_name: string;
    scale_id: number | null;
    value_ids: number[];
    values: string[];
  }[];
}
interface Inventory {
  products: InvProduct[];
  price_on_property: number[];
  quantity_on_property: number[];
  sku_on_property: number[];
  readiness_state_on_property?: number[];
}
interface Receipt {
  receipt_id: number;
  create_timestamp: number;
  name: string;
  city: string;
  country_iso: string;
  grandtotal: Money;
  total_shipping_cost: Money;
  transactions: { listing_id: number; product_id: number; quantity: number; title: string }[];
}

const euros = (m: Money) => `${(m.amount / m.divisor).toFixed(2).replace('.', ',')} €`;
// Clé d'une déclinaison dans son annonce : « Primary color=blanc;Scent=patchouli », '' si unique.
const optionKey = (pairs: [string, string][]) =>
  pairs
    .map(([k, v]) => `${k.trim()}=${v.trim().toLowerCase()}`)
    .sort()
    .join(';');
// Etsy renvoie ses couleurs standard en anglais ; l'import du catalogue les a traduites.
const ETSY_COLORS_FR: Record<string, string> = {
  black: 'Noir',
  blue: 'Bleu',
  brown: 'Marron',
  gray: 'Gris',
  green: 'Vert',
  orange: 'Orange',
  pink: 'Rose',
  purple: 'Violet',
  red: 'Rouge',
  white: 'Blanc',
  yellow: 'Jaune',
  beige: 'Beige',
  gold: 'Doré',
  silver: 'Argenté',
  clear: 'Transparent',
};
const etsyKey = (p: InvProduct) =>
  optionKey(
    p.property_values.map((pv) => {
      const v = pv.values[0] ?? '';
      return [pv.property_name, ETSY_COLORS_FR[v.trim().toLowerCase()] ?? v];
    }),
  );
const listingOf = (sku: string) => sku.split('-')[1];

async function lastCursor(): Promise<number | null> {
  const { data } = await getSupabase()
    .from('automation_logs')
    .select('details')
    .eq('job_name', JOB)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(20);
  for (const row of data ?? []) {
    const c = (row.details as { cursor?: number } | null)?.cursor;
    if (typeof c === 'number') return c;
  }
  return null;
}

async function main() {
  const t0 = Date.now();
  const db = getSupabase();
  const { data: variants, error } = await db
    .from('product_variants')
    .select('id, sku, stock, name, options, products!inner(name, site_key)')
    .eq('products.site_key', ETSY_SITE_KEY)
    .like('sku', 'ETSY-%');
  if (error) throw new Error(`variantes : ${error.message}`);
  type Variant = NonNullable<typeof variants>[number];
  const byKey = new Map<string, Variant>(
    (variants ?? []).map((v) => [
      `${listingOf(v.sku as string)}|${optionKey(Object.entries((v.options ?? {}) as Record<string, string>))}`,
      v,
    ]),
  );
  const inventories = new Map<string, Inventory>();
  const inventory = async (listing: string) => {
    if (!inventories.has(listing))
      inventories.set(listing, await etsy<Inventory>(`/listings/${listing}/inventory`));
    return inventories.get(listing)!;
  };
  // Une seule déclinaison des deux côtés : correspondance directe, quelles que soient les options.
  const variantFor = (listing: string, p: InvProduct, inv: Inventory) => {
    const direct = byKey.get(`${listing}|${etsyKey(p)}`);
    if (direct || inv.products.filter((x) => !x.is_deleted).length > 1) return direct;
    const same = [...byKey.entries()].filter(([k]) => k.startsWith(`${listing}|`));
    return same.length === 1 ? same[0][1] : undefined;
  };
  const label = (v: Variant) =>
    `${(v.products as unknown as { name: string }).name}${v.name !== 'Standard' && v.name !== 'Unique' ? ` (${v.name})` : ''}`;

  // ── 1. Commandes Etsy ────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  const since = (await lastCursor()) ?? now;
  const receipts = await etsy<{ results: Receipt[] }>(
    `/shops/${ETSY_SHOP_ID}/receipts?min_created=${since}&limit=100&sort_on=created&sort_order=asc`,
  );
  const fresh = receipts.results.filter((r) => r.create_timestamp >= since);
  let cursor = since;
  const sold: string[] = [];
  let siteChanged = false;
  for (const r of fresh) {
    cursor = Math.max(cursor, r.create_timestamp + 1);
    const lines: string[] = [];
    for (const tr of r.transactions) {
      const listing = String(tr.listing_id);
      const inv =
        byKey.size && [...byKey.keys()].some((k) => k.startsWith(`${listing}|`))
          ? await inventory(listing)
          : null;
      const prod = inv?.products.find((p) => p.product_id === tr.product_id);
      const v = inv && prod ? variantFor(listing, prod, inv) : undefined;
      lines.push(`• ${tr.quantity} × ${v ? label(v) : tr.title.slice(0, 60)}`);
      if (!v || v.stock === null) continue;
      sold.push(`${label(v)} −${tr.quantity}`);
      if (!apply) continue;
      const { error: e } = await db.rpc('claim_stock', { p_variant_id: v.id, p_qty: tr.quantity });
      if (e) {
        await db.from('product_variants').update({ stock: 0 }).eq('id', v.id);
        lines.push(`  ⚠️ stock du site insuffisant (${v.stock}) — mis à 0, vérifiez l'inventaire`);
      }
      siteChanged = true;
    }
    const msg = [
      `🧡 Commande Etsy — Maison Cirelle`,
      `n° ${r.receipt_id} · ${euros(r.grandtotal)} (dont livraison ${euros(r.total_shipping_cost)})`,
      '',
      ...lines,
      '',
      `Client : ${r.name} — ${r.city} (${r.country_iso})`,
      `https://www.etsy.com/your/orders/sold?order_id=${r.receipt_id}`,
    ].join('\n');
    logger.info(msg);
    if (apply) await sendTelegram(msg);
  }
  if (fresh.length === 0) cursor = Math.max(since, now - 60);

  // Le site a pu bouger juste au-dessus : on relit avant de pousser vers Etsy.
  const { data: current } = await db
    .from('product_variants')
    .select('id, stock')
    .in(
      'id',
      (variants ?? []).map((v) => v.id),
    );
  const stockOf = new Map((current ?? []).map((v) => [v.id as string, v.stock as number | null]));

  // ── 2. Stock du site → Etsy ──────────────────────────────────────
  const listings = new Set((variants ?? []).map((v) => listingOf(v.sku as string)));
  const pushed: string[] = [];
  let compared = 0;
  for (const listing of listings) {
    const inv = await inventory(listing);
    const changes: string[] = [];
    const products = inv.products
      .filter((p) => !p.is_deleted)
      .map((p) => {
        const v = variantFor(listing, p, inv);
        const target = v ? stockOf.get(v.id) : undefined;
        const name = v ? label(v) : `${listing} ${etsyKey(p)}`;
        return {
          sku: p.sku ?? '',
          property_values: p.property_values.map((pv) => ({
            property_id: pv.property_id,
            value_ids: pv.value_ids,
            property_name: pv.property_name,
            scale_id: pv.scale_id,
            values: pv.values,
          })),
          offerings: p.offerings
            .filter((o) => !o.is_deleted)
            .map((o) => {
              if (target !== undefined && target !== null) compared++;
              const quantity = target === undefined || target === null ? o.quantity : Math.max(0, target);
              if (quantity !== o.quantity) changes.push(`${name} ${o.quantity}→${quantity}`);
              return {
                price: o.price.amount / o.price.divisor,
                quantity,
                // Une déclinaison épuisée est désactivée : Etsy refuse 0 sur une offre active.
                is_enabled: quantity > 0 ? o.is_enabled : false,
                readiness_state_id: o.readiness_state_id,
              };
            }),
        };
      });
    if (changes.length === 0) continue;
    pushed.push(...changes);
    if (!apply) continue;
    try {
      await etsy(`/listings/${listing}/inventory`, {
        method: 'PUT',
        json: {
          products,
          price_on_property: inv.price_on_property,
          quantity_on_property: inv.quantity_on_property,
          sku_on_property: inv.sku_on_property,
          readiness_state_on_property: inv.readiness_state_on_property ?? [],
        },
      });
    } catch (e) {
      const msg = `⚠️ Etsy — stock non mis à jour sur l'annonce ${listing} : ${(e as Error).message.slice(0, 200)}`;
      logger.warn(msg);
      await sendTelegram(msg);
    }
  }

  // ── 3. Purge du cache du site si son stock a changé ──────────────
  if (apply && siteChanged) {
    const { data: site } = await db
      .from('site_profiles')
      .select('revalidate_url, revalidate_secret')
      .eq('site_key', ETSY_SITE_KEY)
      .single();
    if (site?.revalidate_url && site.revalidate_secret)
      await fetch(site.revalidate_url as string, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${site.revalidate_secret as string}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ tags: [`catalog:${ETSY_SITE_KEY}`] }),
        signal: AbortSignal.timeout(15_000),
      }).catch((e: Error) => logger.warn(`purge du cache : ${e.message}`));
  }

  const summary = `${fresh.length} commande(s) Etsy, ${sold.length} retrait(s) de stock site, ${pushed.length} quantité(s) poussée(s) vers Etsy (${compared} déclinaisons sur ${listings.size} annonces comparées)`;
  logger.info(`${apply ? '' : '[simulation] '}${summary}`);
  for (const p of [...sold, ...pushed]) logger.info(`  ${p}`);
  if (apply)
    await log(
      JOB,
      'sync',
      'success',
      ETSY_SITE_KEY,
      { cursor, trigger, receipts: fresh.length, sold, pushed },
      Date.now() - t0,
    );
}

main().catch(async (e: Error) => {
  logger.error(`${JOB} : ${e.message}`);
  if (apply) {
    await log(JOB, 'sync', 'error', ETSY_SITE_KEY, { trigger, error: e.message });
    await sendTelegram(`⚠️ Synchro Etsy en échec : ${e.message.slice(0, 300)}`);
  }
  process.exit(1);
});
