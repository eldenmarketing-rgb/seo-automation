#!/usr/bin/env node
/**
 * Semi-automated directory submitter for Ideal Transport
 *
 * Usage:
 *   npm install
 *   npm run install:browsers
 *   npm run submit
 *   npm run submit:from -- 5    # commencer à la 5e entrée
 *
 * Comment ça marche :
 *  1. Ouvre un navigateur Chromium VISIBLE
 *  2. Pour chaque annuaire :
 *     - Ouvre l'URL d'inscription
 *     - Pré-remplit les champs détectés via heuristique (name/id/placeholder/label)
 *     - Met le presse-papier à dispo (Ctrl+V) pour les champs récalcitrants
 *     - Affiche les infos manquantes dans le terminal
 *  3. Toi tu fais : résoudre CAPTCHA + cliquer "Submit" + valider email
 *  4. Tape Entrée dans le terminal → passe à l'annuaire suivant
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load data ───
const business = JSON.parse(readFileSync(join(__dirname, 'business-data.json'), 'utf-8'));
const directories = JSON.parse(readFileSync(join(__dirname, 'directories.json'), 'utf-8'));

// CLI args
const args = process.argv.slice(2);
const fromIdx = args[0] === '--from' ? parseInt(args[1] || '0', 10) : 0;

// ─── Heuristic field matcher ───
// Maps regex patterns (matched against name/id/placeholder/aria-label/label) → business value
const FIELD_PATTERNS = [
  // Identité entreprise
  { match: /(business[_-]?name|company[_-]?name|nom[_-]?(entreprise|societe|de[_-]?la[_-]?societe|commercial|raison)|enterprise|raison[_-]?sociale)/i, value: business.name },
  { match: /(^name$|titre|title|denomination)/i, value: business.name, context: 'company' },

  // Email
  { match: /(e[_-]?mail|courriel|courrier[_-]?electronique)/i, value: business.email, type: 'email' },

  // Phone
  { match: /(phone|tel(ephone)?|mobile|gsm|portable|numero)/i, value: business.phone, type: 'tel' },

  // Address
  { match: /(street[_-]?address|address[_-]?line|adresse[_-]?(rue|postale|complete)|street|rue|voie)/i, value: business.address.street },
  { match: /(^city$|^ville$|locality|town|commune)/i, value: business.address.city },
  { match: /(zip|postal[_-]?code|code[_-]?postal|cp)/i, value: business.address.postalCode },
  { match: /(state|region|province|departement|county)/i, value: business.address.region },
  { match: /(country|pays)/i, value: business.address.country },

  // Web
  { match: /(website|site[_-]?web|site[_-]?internet|url|web[_-]?site|homepage)/i, value: business.website, type: 'url' },

  // Description
  { match: /(short[_-]?description|description[_-]?courte|tagline|slogan|baseline|catchphrase)/i, value: business.shortDescription, type: 'short_description' },
  { match: /(long[_-]?description|description[_-]?longue|about|presentation|presentation[_-]?entreprise)/i, value: business.longDescription, type: 'long_description' },
  { match: /(description|bio|presentation)/i, value: business.mediumDescription, type: 'description' },

  // Tags / keywords
  { match: /(tags|mots[_-]?cles|keywords|hashtags|categories?)/i, value: business.tags.join(', '), type: 'tags' },

  // Year founded
  { match: /(year[_-]?founded|founded|annee[_-]?creation|date[_-]?creation|since)/i, value: business.yearFounded },

  // Categories
  { match: /(category|categorie|secteur|industry|metier|activite)/i, value: business.category, type: 'category' },

  // Hours
  { match: /(hours|horaires|opening[_-]?hours|business[_-]?hours)/i, value: business.hours },

  // First / last name (use legal contact)
  { match: /(first[_-]?name|prenom|fname)/i, value: 'Contact' },
  { match: /(last[_-]?name|nom[_-]?(famille|contact)|lname|surname)/i, value: business.name },

  // Contact title / function
  { match: /(job[_-]?title|function|fonction|role|poste)/i, value: 'Gérant' },
];

// ─── Smart fill helpers ───

async function getFieldSignature(field) {
  // Get name, id, placeholder, aria-label, and parent label text
  return await field.evaluate(el => {
    const name = el.getAttribute('name') || '';
    const id = el.getAttribute('id') || '';
    const placeholder = el.getAttribute('placeholder') || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const dataField = el.getAttribute('data-field') || el.getAttribute('data-name') || '';

    // Try to find associated label
    let labelText = '';
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) labelText = label.textContent || '';
    }
    // Or parent label
    if (!labelText) {
      const parentLabel = el.closest('label');
      if (parentLabel) labelText = parentLabel.textContent || '';
    }
    // Or preceding text
    if (!labelText) {
      const prev = el.previousElementSibling;
      if (prev && prev.textContent && prev.textContent.length < 100) {
        labelText = prev.textContent;
      }
    }

    const inputType = el.getAttribute('type') || el.tagName.toLowerCase();
    const tagName = el.tagName.toLowerCase();
    const required = el.required || el.getAttribute('aria-required') === 'true';
    const maxLength = el.getAttribute('maxlength') || '';

    return { name, id, placeholder, ariaLabel, dataField, labelText, inputType, tagName, required, maxLength };
  });
}

function matchField(signature) {
  const haystack = [
    signature.name,
    signature.id,
    signature.placeholder,
    signature.ariaLabel,
    signature.dataField,
    signature.labelText,
  ].join(' | ').toLowerCase();

  for (const pattern of FIELD_PATTERNS) {
    if (pattern.match.test(haystack)) {
      return pattern;
    }
  }

  // Fallback by type
  if (signature.inputType === 'email') return { value: business.email };
  if (signature.inputType === 'tel') return { value: business.phone };
  if (signature.inputType === 'url') return { value: business.website };

  // Textarea without match → use medium description
  if (signature.tagName === 'textarea') {
    const max = parseInt(signature.maxLength, 10);
    if (max && max < 200) return { value: business.shortDescription };
    if (max && max < 600) return { value: business.mediumDescription };
    return { value: business.longDescription };
  }

  return null;
}

function adaptValueToMaxLength(value, maxLength) {
  if (!maxLength || !value) return value;
  const max = parseInt(maxLength, 10);
  if (isNaN(max) || max <= 0) return value;
  if (value.length <= max) return value;

  // Try shorter variants
  if (value === business.longDescription && business.mediumDescription.length <= max) return business.mediumDescription;
  if (value === business.mediumDescription && business.shortDescription.length <= max) return business.shortDescription;
  if (value === business.shortDescription && business.bio.length <= max) return business.bio;

  // Truncate
  return value.slice(0, max - 3) + '...';
}

async function autofillPage(page) {
  const inputs = await page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select');

  let filledCount = 0;
  const filledFields = [];
  const unmatchedFields = [];

  for (const input of inputs) {
    try {
      const visible = await input.isVisible();
      if (!visible) continue;

      const editable = await input.isEditable();
      if (!editable) continue;

      const sig = await getFieldSignature(input);

      // Skip if already has value
      const currentValue = await input.inputValue().catch(() => '');
      if (currentValue && currentValue.length > 0) continue;

      // Handle SELECT
      if (sig.tagName === 'select') {
        // Try to match country/category
        const haystack = `${sig.name} ${sig.id} ${sig.labelText}`.toLowerCase();
        if (/country|pays/.test(haystack)) {
          await input.selectOption({ label: 'France' }).catch(() => input.selectOption({ value: 'FR' }).catch(() => null));
          filledFields.push(`${sig.name || sig.id}: France`);
          filledCount++;
        } else if (/category|categorie/.test(haystack)) {
          await input.selectOption({ label: 'Taxi' }).catch(() => input.selectOption({ label: 'Transport' }).catch(() => null));
          filledFields.push(`${sig.name || sig.id}: Taxi`);
          filledCount++;
        }
        continue;
      }

      // Match by heuristic
      const match = matchField(sig);
      if (!match) {
        unmatchedFields.push(`${sig.name || sig.id || sig.placeholder || '(unknown)'}`);
        continue;
      }

      const value = adaptValueToMaxLength(match.value, sig.maxLength);
      await input.fill(value).catch(() => null);
      filledFields.push(`${sig.name || sig.id || sig.placeholder}: "${value.slice(0, 40)}${value.length > 40 ? '…' : ''}"`);
      filledCount++;
    } catch (e) {
      // Skip problematic fields silently
    }
  }

  return { filledCount, filledFields, unmatchedFields };
}

// ─── Readline pause ───
function pause(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

// ─── Main ───
(async () => {
  console.log(`\n🚀 Directory Submitter — ${business.name}\n`);
  console.log(`   ${directories.length - fromIdx} annuaires à soumettre`);
  console.log(`   Démarrage à l'index : ${fromIdx}\n`);
  console.log(`💡 Commandes pendant la session :`);
  console.log(`   [Entrée]  → annuaire suivant`);
  console.log(`   r         → re-remplir la page (si nouvelle étape s'affiche)`);
  console.log(`   s         → skip (passer cet annuaire)`);
  console.log(`   q         → quitter\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({
    viewport: null,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });

  // Set clipboard with business data so user can Ctrl+V anywhere
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  const page = await context.newPage();

  for (let i = fromIdx; i < directories.length; i++) {
    const dir = directories[i];
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[${i + 1}/${directories.length}] ${dir.name}`);
    console.log(`Tier: ${dir.tier} | URL: ${dir.url}`);
    if (dir.notes) console.log(`📝 ${dir.notes}`);
    console.log('═'.repeat(60));

    try {
      await page.goto(dir.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500); // let JS hydrate

      const result = await autofillPage(page);
      console.log(`\n✅ ${result.filledCount} champs pré-remplis :`);
      result.filledFields.forEach(f => console.log(`   • ${f}`));
      if (result.unmatchedFields.length > 0) {
        console.log(`\n⚠️  ${result.unmatchedFields.length} champs non reconnus (à remplir à la main) :`);
        result.unmatchedFields.slice(0, 10).forEach(f => console.log(`   • ${f}`));
      }
    } catch (e) {
      console.log(`\n❌ Erreur : ${e.message}`);
      console.log(`   Tu peux remplir à la main, le navigateur reste ouvert.`);
    }

    // Wait for user
    while (true) {
      const ans = (await pause('\n👉 Action [Entrée=suivant / r=re-fill / s=skip / q=quit] : ')).trim().toLowerCase();
      if (ans === 'q') {
        console.log('\n👋 Quit. Le navigateur reste ouvert pour finir manuellement.');
        process.exit(0);
      }
      if (ans === 's') break;
      if (ans === 'r') {
        const result = await autofillPage(page);
        console.log(`✅ Re-fill : ${result.filledCount} champs.`);
        continue;
      }
      // Default = next
      break;
    }
  }

  console.log('\n🎉 Tous les annuaires traités. Le navigateur reste ouvert.');
})().catch(e => {
  console.error('💥 Erreur fatale :', e);
  process.exit(1);
});
