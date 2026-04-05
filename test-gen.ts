import { generateMatrix } from './src/generators/universal-matrix.js';
import { generatePageContent } from './src/generators/page-generator-v2.js';
import { buildUniversalSchemaOrg } from './src/generators/universal-schema.js';
import { computeCocoonLinks } from './src/linking/cocooning.js';
import { enrichedKeywordSuggestions } from './src/keywords/research-v2.js';
import { buildPrompt } from './src/generators/universal-prompt.js';
import * as logger from './src/utils/logger.js';

async function main() {
  // 1. Find the page in the matrix
  const matrix = generateMatrix('garage');
  const page = matrix.find(p => p.slug === 'prix-vidange-perpignan');
  if (!page) { console.error('Page not found in matrix!'); process.exit(1); }

  console.log('=== PAGE FOUND ===');
  console.log('Slug:', page.slug);
  console.log('PageType:', page.pageType);
  console.log('Intent:', page.intent);
  console.log('City:', page.city?.name);
  console.log('Service:', page.service?.name);
  console.log('Mode:', page.modeConfig.mode);
  console.log('');

  // 2. Show cocooning links
  console.log('=== COCOONING LINKS ===');
  try {
    const { links, promptBlock } = await computeCocoonLinks(page);
    console.log('Links found:', links.length);
    console.log('Prompt block:\n' + promptBlock);
  } catch (e) {
    console.log('Cocooning error:', (e as Error).message);
  }
  console.log('');

  // 3. Show the full prompt sent to Claude
  console.log('=== PROMPT (user excerpt — first 500 chars) ===');
  const { system, user } = buildPrompt(page);
  console.log('System prompt length:', system.length, 'chars');
  console.log('User prompt length:', user.length, 'chars');
  console.log('User prompt start:\n' + user.slice(0, 500));
  console.log('...');
  console.log('');

  // 4. Generate via Claude API
  console.log('=== GENERATING PAGE VIA CLAUDE API ===');
  const result = await generatePageContent(page);

  // 5. Show full JSON
  console.log('\n=== FULL JSON RESPONSE ===');
  console.log(JSON.stringify(result.content, null, 2));

  // 6. Show schema.org
  console.log('\n=== SCHEMA.ORG ===');
  console.log(JSON.stringify(result.schema_org, null, 2));

  // 7. Quality validation
  console.log('\n=== QUALITY REPORT ===');
  const content = result.content as any;
  const checks: string[] = [];

  // metaTitle
  const titleLen = (content.metaTitle || '').length;
  checks.push(`metaTitle: "${content.metaTitle}" (${titleLen} chars) ${titleLen <= 60 ? '✅' : '❌ >60'}`);

  // metaDescription
  const descLen = (content.metaDescription || '').length;
  checks.push(`metaDescription: (${descLen} chars) ${descLen <= 155 ? '✅' : '❌ >155'}`);

  // H1
  checks.push(`h1: "${content.h1}" ${content.h1 ? '✅' : '❌ missing'}`);

  // Sections
  const sections = content.seoSections || [];
  checks.push(`seoSections: ${sections.length} ${sections.length >= 5 ? '✅' : '❌ <5'}`);

  // Word count estimate
  let totalWords = 0;
  for (const s of sections) {
    if (s.content) totalWords += s.content.split(/\s+/).length;
  }
  checks.push(`Estimated words in sections: ${totalWords} ${totalWords >= 800 ? '✅' : '⚠️ <800'}`);

  // FAQ
  const faq = content.faq || [];
  checks.push(`FAQ: ${faq.length} ${faq.length >= 6 ? '✅' : '❌ <6'}`);

  // FAQ answer length
  if (faq.length > 0) {
    const avgFaqLen = faq.reduce((s: number, f: any) => s + (f.answer || '').split(/\s+/).length, 0) / faq.length;
    checks.push(`FAQ avg answer length: ${Math.round(avgFaqLen)} words ${avgFaqLen >= 40 ? '✅' : '⚠️ <40'}`);
  }

  // Internal links
  const links = content.internalLinks || [];
  checks.push(`internalLinks: ${links.length} ${links.length >= 2 ? '✅' : '⚠️ <2'}`);

  // Intent match
  checks.push(`Intent "prix" signals: ${/prix|tarif|co[uû]t|devis/i.test(JSON.stringify(content)) ? '✅ found' : '❌ missing'}`);

  // Schema types
  const schemas = (result.schema_org as any)?.schemas || [];
  const types = schemas.map((s: any) => s['@type']).join(', ');
  checks.push(`Schema.org types: ${types}`);
  checks.push(`BreadcrumbList: ${types.includes('BreadcrumbList') ? '✅' : '❌'}`);
  checks.push(`FAQPage: ${types.includes('FAQPage') ? '✅' : '❌'}`);
  checks.push(`LocalBusiness/AutoRepair: ${types.includes('AutoRepair') || types.includes('LocalBusiness') ? '✅' : '❌'}`);

  // No markdown
  const hasMarkdown = /^#{1,6}\s|^\*\*|^\- \[/m.test(JSON.stringify(content));
  checks.push(`No markdown in content: ${!hasMarkdown ? '✅' : '⚠️ possible markdown'}`);

  console.log(checks.join('\n'));

  // Summary
  const passed = checks.filter(c => c.includes('✅')).length;
  const total = checks.length;
  console.log(`\n=== SCORE: ${passed}/${total} checks passed ===`);

  console.log('\n=== STATUS: draft (not published) ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
