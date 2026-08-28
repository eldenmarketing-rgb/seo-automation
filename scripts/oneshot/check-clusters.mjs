import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/sites/seo-dashboard/.env.local' });
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data } = await db.from('keyword_clusters').select('id, cluster_name, status, site_key').eq('status', 'new').limit(5);
console.log('sample new clusters:', JSON.stringify(data, null, 2));
