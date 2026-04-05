import { readFileSync, writeFileSync } from 'fs';
import { getSupabase } from './src/db/supabase.js';

// Import the merge function by reimporting inject-pages
// We'll manually test the merge on a copy

async function main() {
  const db = getSupabase();

  // Get the freins-plaquettes page from Supabase
  const { data: page } = await db.from('seo_pages').select('*')
    .eq('site_key', 'garage').eq('slug', 'freins-plaquettes-perpignan').single();
  if (!page) { console.error('Not found'); return; }

  const original = readFileSync('/home/ubuntu/sites/Site_Garage/data/services.ts', 'utf-8');

  // Find the slug marker - show all occurrences
  const marker = 'slug: "freins-plaquettes-perpignan"';
  let pos = 0;
  let idx = 0;
  while ((pos = original.indexOf(marker, pos)) !== -1) {
    idx++;
    // Check what's around it
    const before = original.slice(Math.max(0, pos - 30), pos);
    console.log(`Occurrence #${idx} at char ${pos}: ...${before}[MARKER]...`);

    // Walk back to find {
    let braceIdx = pos;
    while (braceIdx > 0 && original[braceIdx] !== '{') braceIdx--;
    const between = original.slice(braceIdx, pos);
    console.log(`  { at char ${braceIdx}, between contains anchor: ${between.includes('anchor:')}`);

    pos += marker.length;
  }

  // Now test the actual inject
  const { injectPages } = await import('./src/deployers/inject-pages.js');

  // Use a temp copy
  const origCities = readFileSync('/home/ubuntu/sites/Site_Garage/data/cities.ts', 'utf-8');

  const injected = await injectPages('garage', [page]);
  console.log('\nInjected:', injected);

  // Read the result and check around line 170-215
  const result = readFileSync('/home/ubuntu/sites/Site_Garage/data/services.ts', 'utf-8');

  // Find the merged freins entry
  const mergedPos = result.indexOf('slug: "freins-plaquettes-perpignan", name:');
  if (mergedPos > -1) {
    console.log('\n--- Merged freins entry (last 500 chars) ---');
    // Find end of this entry
    let depth = 0;
    let start = mergedPos;
    while (start > 0 && result[start] !== '{') start--;
    // Find matching }
    let inStr = false, esc = false;
    let end = start;
    for (let i = start; i < result.length; i++) {
      const ch = result[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    const block = result.slice(start, end + 1);
    console.log(`Block length: ${block.length} chars`);
    console.log(`Last 300 chars:\n${block.slice(-300)}`);

    // Check what comes after
    console.log('\n--- After the block ---');
    console.log(result.slice(end + 1, end + 200));
  }

  // Restore
  writeFileSync('/home/ubuntu/sites/Site_Garage/data/services.ts', original, 'utf-8');
  writeFileSync('/home/ubuntu/sites/Site_Garage/data/cities.ts', origCities, 'utf-8');
  console.log('\nRestored.');
}

main().catch(e => { console.error(e); process.exit(1); });
