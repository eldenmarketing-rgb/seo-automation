import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/sites/seo-dashboard/.env.local' });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
console.log('ENV found:', { url: !!url, key: !!key });
if (!url || !key) process.exit(1);

const db = createClient(url, key);

const { data: profiles, error: pErr } = await db.from('site_profiles').select('site_key, name, scope, niche, relevant_topics, reject_topics');
console.log('\n=== site_profiles ===');
if (pErr) console.log('ERROR:', pErr);
else console.log(JSON.stringify(profiles, null, 2));

const { count: kwNew } = await db.from('discovered_keywords').select('*', { count: 'exact', head: true }).eq('status', 'new');
console.log('\n=== discovered_keywords (new) ===', kwNew);

const { count: clNew } = await db.from('keyword_clusters').select('*', { count: 'exact', head: true }).eq('status', 'new');
console.log('=== keyword_clusters (new) ===', clNew);

const { data: sample } = await db.from('discovered_keywords').select('id, keyword, status, site_key').eq('status', 'new').limit(5);
console.log('\n=== sample new keywords ===');
console.log(JSON.stringify(sample, null, 2));
