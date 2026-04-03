import dotenv from 'dotenv'; dotenv.config();
import { getSupabase } from '../src/db/supabase.js';
async function main() {
  const db = getSupabase();
  const { data } = await db.from('seo_pages').select('*').eq('site_key', 'voitures');
  for (const r of (data || [])) {
    console.log(JSON.stringify({ slug: r.slug, page_type: r.page_type, city: r.city, meta_title: r.meta_title, h1: r.h1, contentKeys: Object.keys(r.content || {}) }, null, 2));
  }
}
main().catch(console.error);
