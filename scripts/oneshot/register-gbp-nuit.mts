/**
 * Inscrit la fiche Google de Livraison de Nuit comme fiche CONFIRMÉE du site
 * `nuit` (module GBP, lot 2). CID et place ID retrouvés le 2026-10-18 par la
 * recherche Maps DataForSEO (titre exact de la fiche). Idempotent.
 *   npx tsx scripts/oneshot/register-gbp-nuit.mts
 */
import { getSupabase } from '../../src/db/client';

const CID = '11180232705172667333';
const PLACE = 'ChIJIaYj8wOMew4RxXsF8mgqKJs';
const sb = getSupabase();
const { error } = await sb.from('gbp_listings').upsert(
  {
    site_key: 'nuit',
    cid: CID,
    place_id: PLACE,
    kgmid: '/g/11y6z10g2w',
    name: "Livraison de nuit | service de livraison d'alcool 66",
    status: 'confirmed',
    origin: 'manual',
    hours_expected: '20h-4h, 7j/7',
    maps_url: `https://www.google.com/maps?cid=${CID}`,
    review_url: `https://search.google.com/local/writereview?placeid=${PLACE}`,
    notes: 'Ancienne fiche Mon Sauveur renommée ; 14 avis 5/5 au 2026-10-18.',
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'site_key,cid' },
);
console.log(error ? 'ERREUR ' + error.message : 'fiche nuit confirmée');
