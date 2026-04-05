/**
 * Batch generate 10 garage pages (mix city_hub + service)
 * Stores in Supabase as draft — does NOT publish or deploy.
 */

import { generateMatrix } from './universal-upgrade/src/generators/universal-matrix.js';
import { generatePageContent } from './universal-upgrade/src/generators/page-generator-v2.js';
import { upsertSeoPage } from './src/db/supabase.js';
import * as logger from './src/utils/logger.js';

// 10 target pages: city_hubs for top cities + service pages for Perpignan
const TARGET_SLUGS = [
  // City hubs (5 biggest cities)
  'perpignan',                          // city_hub — 121k pop
  'canet-en-roussillon',                // city_hub — 13.3k pop
  'saint-esteve',                       // city_hub — 11.8k pop
  'saint-cyprien',                      // city_hub — 10.8k pop
  'cabestany',                          // city_hub — 9.8k pop
  // Service pages for Perpignan (top 5 services)
  'vidange-perpignan',                  // service
  'entretien-voiture-perpignan',        // service
  'freins-plaquettes-perpignan',        // service
  'diagnostic-auto-perpignan',          // service
  'climatisation-auto-perpignan',       // service
];

async function main() {
  const matrix = generateMatrix('garage');
  const pages = TARGET_SLUGS.map(slug => {
    const page = matrix.find(p => p.slug === slug);
    if (!page) throw new Error(`Slug not found in matrix: ${slug}`);
    return page;
  });

  console.log(`\n=== GENERATING ${pages.length} PAGES FOR GARAGE ===\n`);
  pages.forEach((p, i) => console.log(`  ${i + 1}. ${p.slug} [${p.intent}] — ${p.city?.name || 'N/A'} / ${p.service?.name || 'hub'}`));
  console.log('');

  const results: Array<{
    slug: string;
    intent: string;
    city: string;
    service: string;
    metaTitleLen: number;
    metaDescLen: number;
    sections: number;
    wordCount: number;
    faqCount: number;
    linksCount: number;
    score: string;
  }> = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const num = `[${i + 1}/${pages.length}]`;

    try {
      logger.info(`${num} Generating: ${page.slug} [${page.intent}]`);
      const result = await generatePageContent(page);

      // Save to Supabase as draft
      await upsertSeoPage(result);
      logger.success(`${num} Saved to Supabase: ${page.slug}`);

      // Quality checks
      const content = result.content as any;
      const sections = content.seoSections || [];
      let totalWords = 0;
      for (const s of sections) {
        if (s.content) totalWords += s.content.split(/\s+/).length;
      }
      const faq = content.faq || [];
      const links = content.internalLinks || [];
      const titleLen = (content.metaTitle || '').length;
      const descLen = (content.metaDescription || '').length;

      // Score calculation (same as test-gen.ts)
      let passed = 0;
      let total = 0;
      const check = (ok: boolean) => { total++; if (ok) passed++; };

      check(titleLen <= 60);                        // metaTitle length
      check(descLen >= 130 && descLen <= 154);      // metaDescription range
      check(!!content.h1);                          // h1 exists
      check(sections.length >= 4);                  // enough sections
      check(totalWords >= 800);                     // word count
      check(faq.length >= 5);                       // FAQ count
      check(links.length >= 1);                     // internal links
      check(!!content.highlights && content.highlights.length >= 3);  // highlights
      check(!!content.trustSignals && content.trustSignals.length >= 3); // trustSignals
      check(!!result.schema_org);                   // schema.org exists

      results.push({
        slug: page.slug,
        intent: page.intent,
        city: page.city?.name || '-',
        service: page.service?.name || 'hub',
        metaTitleLen: titleLen,
        metaDescLen: descLen,
        sections: sections.length,
        wordCount: totalWords,
        faqCount: faq.length,
        linksCount: links.length,
        score: `${passed}/${total}`,
      });

    } catch (e) {
      logger.error(`${num} FAILED: ${page.slug} — ${(e as Error).message}`);
      results.push({
        slug: page.slug,
        intent: page.intent,
        city: page.city?.name || '-',
        service: page.service?.name || 'hub',
        metaTitleLen: 0,
        metaDescLen: 0,
        sections: 0,
        wordCount: 0,
        faqCount: 0,
        linksCount: 0,
        score: 'ERROR',
      });
    }

    // Rate limiting — 2s between calls
    if (i < pages.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Final report
  console.log('\n\n' + '═'.repeat(120));
  console.log('RAPPORT FINAL — 10 PAGES GARAGE (draft)');
  console.log('═'.repeat(120));
  console.log(
    'Slug'.padEnd(35) +
    'Intent'.padEnd(12) +
    'Ville'.padEnd(22) +
    'Service'.padEnd(22) +
    'Title'.padEnd(7) +
    'Desc'.padEnd(7) +
    'Sect'.padEnd(6) +
    'Mots'.padEnd(7) +
    'FAQ'.padEnd(5) +
    'Links'.padEnd(7) +
    'Score'
  );
  console.log('─'.repeat(120));

  for (const r of results) {
    console.log(
      r.slug.padEnd(35) +
      r.intent.padEnd(12) +
      r.city.padEnd(22) +
      r.service.padEnd(22) +
      String(r.metaTitleLen).padEnd(7) +
      String(r.metaDescLen).padEnd(7) +
      String(r.sections).padEnd(6) +
      String(r.wordCount).padEnd(7) +
      String(r.faqCount).padEnd(5) +
      String(r.linksCount).padEnd(7) +
      r.score
    );
  }

  const ok = results.filter(r => r.score !== 'ERROR').length;
  const avgScore = results
    .filter(r => r.score !== 'ERROR')
    .reduce((sum, r) => sum + parseInt(r.score.split('/')[0]), 0) / (ok || 1);

  console.log('─'.repeat(120));
  console.log(`Générées: ${ok}/${results.length} | Score moyen: ${avgScore.toFixed(1)}/10 | Status: draft (non publiées)`);
  console.log('═'.repeat(120));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
