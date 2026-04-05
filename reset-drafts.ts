import { getSupabase } from './src/db/supabase.js';

const OUR_10 = [
  'perpignan', 'canet-en-roussillon', 'saint-esteve', 'saint-cyprien', 'cabestany',
  'vidange-perpignan', 'entretien-voiture-perpignan', 'freins-plaquettes-perpignan',
  'diagnostic-auto-perpignan', 'climatisation-auto-perpignan',
];

async function main() {
  const db = getSupabase();
  const { data, error } = await db
    .from('seo_pages')
    .update({ status: 'draft', deployed_at: null })
    .eq('site_key', 'garage')
    .in('slug', OUR_10)
    .select('slug, status');

  if (error) console.error('Error:', error.message);
  console.log(`Set to draft:`, data?.map(p => p.slug));
}

main().catch(e => { console.error(e); process.exit(1); });
