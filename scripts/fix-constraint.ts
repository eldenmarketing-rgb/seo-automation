import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
  // Use Supabase Management API to alter the constraint
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;
  const projectRef = process.env.SUPABASE_URL!.match(/https:\/\/(\w+)\./)?.[1];

  if (!projectRef || !accessToken) {
    console.log('Missing SUPABASE_ACCESS_TOKEN or cannot parse project ref');
    console.log('Running SQL directly via pg...');

    // Fallback: use pg directly
    const { default: pg } = await import('pg');
    const connStr = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_SERVICE_KEY}@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`;

    // Actually, let's just set status to 'error' for now (which is allowed) and we'll handle it
    console.log('Setting redirected pages to status=error with redirect metadata...');

    // Get all pages that should be redirected (have redirect metadata but wrong status)
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('id, slug, site_key, status')
      .in('site_key', ['garage', 'carrosserie'])
      .eq('status', 'draft');

    // Check which ones are city pages that should be redirected
    const cityPrefixes = ['garage-', 'carrossier-'];
    const cityOnlySlugs = ['cabestany', 'saint-cyprien', 'saint-esteve', 'canet-en-roussillon'];

    const toRedirect = (pages || []).filter(p => {
      return cityPrefixes.some(pre => p.slug.startsWith(pre)) ||
             cityOnlySlugs.includes(p.slug);
    });

    console.log(`Found ${toRedirect.length} city pages to mark as error/redirected`);

    for (const p of toRedirect) {
      const { error } = await supabase
        .from('seo_pages')
        .update({ status: 'error' })
        .eq('id', p.id);

      if (error) {
        console.log(`  Failed ${p.slug}: ${error.message}`);
      } else {
        console.log(`  Marked ${p.slug} as error (redirected)`);
      }
    }

    return;
  }

  // Try Management API
  const sql = `ALTER TABLE seo_pages DROP CONSTRAINT IF EXISTS seo_pages_status_check; ALTER TABLE seo_pages ADD CONSTRAINT seo_pages_status_check CHECK (status IN ('draft', 'published', 'optimized', 'error', 'redirected'));`;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log('Constraint updated successfully!');

    // Now update the pages
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('id, slug, site_key')
      .in('site_key', ['garage', 'carrosserie'])
      .eq('status', 'draft');

    const cityPrefixes = ['garage-', 'carrossier-'];
    const cityOnlySlugs = ['cabestany', 'saint-cyprien', 'saint-esteve', 'canet-en-roussillon', 'garage-canet'];

    const toRedirect = (pages || []).filter(p =>
      cityPrefixes.some(pre => p.slug.startsWith(pre)) || cityOnlySlugs.includes(p.slug)
    );

    for (const p of toRedirect) {
      await supabase.from('seo_pages').update({ status: 'redirected' }).eq('id', p.id);
      console.log(`  Marked ${p.slug} as redirected`);
    }

    console.log(`Done: ${toRedirect.length} pages marked as redirected`);
  } else {
    console.log('Management API failed:', res.status, await res.text());
    console.log('Falling back to marking as error...');

    const { data: pages } = await supabase
      .from('seo_pages')
      .select('id, slug, site_key, status')
      .in('site_key', ['garage', 'carrosserie'])
      .eq('status', 'draft');

    const cityPrefixes = ['garage-', 'carrossier-'];
    const cityOnlySlugs = ['cabestany', 'saint-cyprien', 'saint-esteve', 'canet-en-roussillon', 'garage-canet'];

    const toRedirect = (pages || []).filter(p =>
      cityPrefixes.some(pre => p.slug.startsWith(pre)) || cityOnlySlugs.includes(p.slug)
    );

    for (const p of toRedirect) {
      await supabase.from('seo_pages').update({ status: 'error' }).eq('id', p.id);
      console.log(`  Marked ${p.slug} as error (redirected)`);
    }
  }
}

main().catch(console.error);
