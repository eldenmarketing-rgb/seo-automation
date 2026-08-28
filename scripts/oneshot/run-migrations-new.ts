import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;
const projectRef = url.replace('https://', '').split('.')[0];

async function runMigration(name: string, filePath: string) {
  const sql = readFileSync(filePath, 'utf-8');
  console.log(`\n--- ${name} ---`);

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
    console.log(`✅ Migration exécutée`);
  } else {
    console.log(`❌ Erreur ${res.status}: ${body.slice(0, 400)}`);
  }
}

async function verify(tables: string[]) {
  const db = createClient(url, serviceKey);
  await new Promise(r => setTimeout(r, 2000));
  console.log('\n--- Vérification ---');
  for (const t of tables) {
    const { data, error } = await db.from(t).select('*').limit(0);
    console.log(`  ${error ? '❌' : '✅'} ${t}${error ? ' : ' + error.message : ''}`);
  }
}

async function main() {
  await runMigration('discovered_keywords', 'src/db/migration-discovered-keywords.sql');
  await runMigration('pending_pages', 'src/db/migration-pending-pages.sql');
  await verify(['discovered_keywords', 'pending_pages']);
}

main().catch(console.error);
