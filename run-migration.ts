import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL!;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;
const projectRef = url.replace('https://', '').split('.')[0];

const sql = `
ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'service';
ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'local';
`;

async function run() {
  console.log(`Project: ${projectRef}`);
  console.log('Executing migration...\n');

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
    console.log('Migration OK');
    console.log(body.slice(0, 500));
  } else {
    console.log(`Error ${res.status}: ${body.slice(0, 500)}`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
