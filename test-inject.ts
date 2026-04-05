/**
 * Test: inject 1 service page into a COPY of services.ts,
 * then verify the result compiles.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { getSupabase } from './src/db/supabase.js';
import { injectPages } from './src/deployers/inject-pages.js';
import { execSync } from 'child_process';

async function main() {
  const db = getSupabase();

  // Backup originals
  const sitePath = '/home/ubuntu/sites/Site_Garage';
  copyFileSync(`${sitePath}/data/services.ts`, `${sitePath}/data/services.ts.bak`);
  copyFileSync(`${sitePath}/data/cities.ts`, `${sitePath}/data/cities.ts.bak`);

  // Fetch all 10 draft pages
  const { data } = await db
    .from('seo_pages')
    .select('*')
    .eq('site_key', 'garage')
    .eq('status', 'draft')
    .limit(10);

  if (!data || data.length === 0) { console.error('No draft pages found'); process.exit(1); }
  console.log(`Found ${data.length} drafts`);

  // Inject
  const injected = await injectPages('garage', data);
  console.log('Injected:', injected);

  // Try Next.js build
  try {
    const out = execSync('npx next build 2>&1', {
      cwd: sitePath,
      timeout: 120000,
    });
    console.log('\nBUILD OUTPUT (last 10 lines):');
    console.log(out.toString().split('\n').slice(-10).join('\n'));
  } catch (e: any) {
    console.log('\nBUILD FAILED:');
    console.log(e.stdout?.toString().split('\n').slice(-15).join('\n'));
  }

  // Restore
  copyFileSync(`${sitePath}/data/services.ts.bak`, `${sitePath}/data/services.ts`);
  copyFileSync(`${sitePath}/data/cities.ts.bak`, `${sitePath}/data/cities.ts`);
  console.log('\nOriginals restored.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
