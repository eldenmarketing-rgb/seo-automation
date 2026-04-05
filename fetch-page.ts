import { getSupabase } from './src/db/supabase.js';

async function main() {
  const db = getSupabase();
  const { data, error } = await db.from('seo_pages').select('*').eq('site_key', 'garage').eq('slug', 'vidange-perpignan').single();
  if (error) { console.error(error); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
