import { Bot, InlineKeyboard } from 'grammy';
import type { BotContext } from '../index.js';
import { sites } from '../../../config/sites.js';
import { readFileSync, writeFileSync } from 'fs';
import * as logger from '../../utils/logger.js';

export function registerPhoneCommand(bot: Bot<BotContext>) {
  // /phone garage 0612345678
  // /phone all 0612345678
  // /phone — show current numbers
  bot.command('phone', async (ctx) => {
    const args = ctx.match?.trim().split(/\s+/) || [];

    // No args: show current phones
    if (args.length === 0 || !args[0]) {
      const lines = ['<b>Numéros de téléphone actuels</b>\n'];
      for (const [key, site] of Object.entries(sites)) {
        const isPlaceholder = site.phone.includes('XX') || site.phone === '06 12 34 56 78';
        lines.push(`  <b>${key}</b>: ${site.phone}${isPlaceholder ? ' ⚠️ placeholder' : ''}`);
      }
      lines.push(`\nUsage: /phone [site|all] [numéro]`);
      await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
      return;
    }

    const siteArg = args[0];
    const phoneArg = args.slice(1).join(' ');

    if (!phoneArg) {
      await ctx.reply('Usage: /phone [site|all] [numéro]\nExemple: /phone garage 06 23 15 35 04');
      return;
    }

    // Validate site
    if (siteArg !== 'all' && !sites[siteArg]) {
      await ctx.reply(`Site inconnu: ${siteArg}\nDisponibles: ${Object.keys(sites).join(', ')}, all`);
      return;
    }

    const sitesToUpdate = siteArg === 'all' ? Object.keys(sites) : [siteArg];
    const results: string[] = [];

    for (const key of sitesToUpdate) {
      try {
        const result = await updatePhoneInSite(key, phoneArg);
        results.push(`  ✅ <b>${key}</b>: ${result}`);
      } catch (e) {
        results.push(`  ❌ <b>${key}</b>: ${(e as Error).message}`);
      }
    }

    await ctx.reply(
      `<b>Mise à jour téléphone</b>\n\n` +
      `Nouveau: <b>${phoneArg}</b>\n\n` +
      results.join('\n'),
      { parse_mode: 'HTML' }
    );
  });
}

async function updatePhoneInSite(siteKey: string, newPhone: string): Promise<string> {
  const site = sites[siteKey];
  const oldPhone = site.phone;

  // 1. Update config/sites.ts
  const configPath = '/home/ubuntu/sites/seo-automation/config/sites.ts';
  let configContent = readFileSync(configPath, 'utf-8');

  // Find this site's phone line and replace
  const phoneRegex = new RegExp(
    `(${siteKey}:[\\s\\S]*?phone:\\s*')([^']*)(')`,
  );
  if (configContent.match(phoneRegex)) {
    configContent = configContent.replace(phoneRegex, `$1${newPhone}$3`);
    writeFileSync(configPath, configContent, 'utf-8');
  }

  // 2. Update the site's own config file
  const siteConfigFiles = findSiteConfigFiles(siteKey);
  let updatedFiles = 0;

  for (const filePath of siteConfigFiles) {
    try {
      let content = readFileSync(filePath, 'utf-8');
      if (content.includes(oldPhone)) {
        content = content.replaceAll(oldPhone, newPhone);
        writeFileSync(filePath, content, 'utf-8');
        updatedFiles++;
      }
      // Also try formatted versions
      const oldFormatted = formatPhoneForTel(oldPhone);
      const newFormatted = formatPhoneForTel(newPhone);
      if (content.includes(oldFormatted)) {
        content = content.replaceAll(oldFormatted, newFormatted);
        writeFileSync(filePath, content, 'utf-8');
        updatedFiles++;
      }
    } catch {
      // File might not exist
    }
  }

  // Update in-memory config
  site.phone = newPhone;

  return `${oldPhone} → ${newPhone} (${updatedFiles + 1} fichiers)`;
}

function findSiteConfigFiles(siteKey: string): string[] {
  const site = sites[siteKey];
  const basePath = site.projectPath;
  const candidates = [
    `${basePath}/lib/config.ts`,
    `${basePath}/lib/config.tsx`,
    `${basePath}/lib/siteConfig.ts`,
    `${basePath}/app/layout.tsx`,
  ];
  return candidates;
}

function formatPhoneForTel(phone: string): string {
  // "06 23 15 35 04" → "+33623153504"
  const digits = phone.replace(/\s/g, '');
  if (digits.startsWith('0')) {
    return '+33' + digits.slice(1);
  }
  return digits;
}
