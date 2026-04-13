import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();

const url = process.env.SUPABASE_URL!;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;
const projectRef = url.replace('https://', '').split('.')[0];
const sql = readFileSync('src/db/migration-intent-type.sql', 'utf-8');

async function run() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const body = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', body.slice(0, 500));
}

run().catch(console.error);
