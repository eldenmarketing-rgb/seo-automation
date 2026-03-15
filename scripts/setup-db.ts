import { readFileSync } from 'fs';
import { getSupabase } from '../src/db/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  console.log('🔧 Setting up Supabase database...\n');

  const sql = readFileSync(new URL('../src/db/schema.sql', import.meta.url), 'utf-8');

  console.log('📋 SQL Schema to execute:');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('\n⚠️  Copy the SQL above and run it in your Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard → Your Project → SQL Editor\n');

  // Test connection
  try {
    const db = getSupabase();
    const { data, error } = await db.from('seo_pages').select('count').limit(1);
    if (error && error.code === '42P01') {
      console.log('❌ Tables not yet created. Please run the SQL in Supabase first.');
    } else if (error) {
      console.log(`❌ Connection error: ${error.message}`);
    } else {
      console.log('✅ Connection successful! Tables exist.');

      // Count existing records
      const counts = await Promise.all([
        db.from('seo_pages').select('*', { count: 'exact', head: true }),
        db.from('gsc_positions').select('*', { count: 'exact', head: true }),
        db.from('optimization_queue').select('*', { count: 'exact', head: true }),
        db.from('automation_logs').select('*', { count: 'exact', head: true }),
      ]);

      console.log(`   seo_pages: ${counts[0].count || 0} rows`);
      console.log(`   gsc_positions: ${counts[1].count || 0} rows`);
      console.log(`   optimization_queue: ${counts[2].count || 0} rows`);
      console.log(`   automation_logs: ${counts[3].count || 0} rows`);
    }
  } catch (e) {
    console.log(`❌ Cannot connect: ${(e as Error).message}`);
    console.log('   Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
  }
}

setupDatabase();
