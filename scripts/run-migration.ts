import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;
const projectRef = url.replace('https://', '').split('.')[0];

async function run() {
  const sql = readFileSync('src/db/migration-new-tables.sql', 'utf-8');
  
  console.log(`Project: ${projectRef}`);
  console.log('Executing migration via Management API...\n');

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.text();
  
  if (res.ok) {
    console.log('✅ Migration exécutée avec succès !\n');
  } else {
    console.log(`❌ Erreur ${res.status}: ${body.slice(0, 500)}\n`);
    return;
  }

  // Vérification
  console.log('Vérification des tables :');
  const db = createClient(url, serviceKey);
  await new Promise(r => setTimeout(r, 3000)); // attendre le cache schema
  
  const tables = ['seo_pages', 'gsc_positions', 'optimization_queue', 'automation_logs',
                  'bot_settings', 'page_images', 'blog_articles', 'vehicles', 'menu_categories', 'menu_items'];
  for (const t of tables) {
    const { data, error } = await db.from(t).select('*').limit(0);
    console.log(`  ${error ? '❌' : '✅'} ${t}`);
  }
}

run().catch(console.error);
