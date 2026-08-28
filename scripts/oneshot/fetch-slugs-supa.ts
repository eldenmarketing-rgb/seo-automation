import dotenv from 'dotenv'; dotenv.config();
import { getSupabase } from '../src/db/supabase.js';
const db = getSupabase();
async function main() {
  for (const sk of ['garage','carrosserie','vtc','voitures','restaurant']) {
    const { data } = await db.from('seo_pages').select('slug').eq('site_key', sk);
    console.log('SITE:' + sk);
    for (const r of (data||[])) console.log(r.slug);
  }
}
main().catch(console.error);
