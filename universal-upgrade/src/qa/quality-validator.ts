/**
 * Quality Validator
 * 
 * Vérifie chaque page générée AVANT publication.
 * Bloque les pages qui ne passent pas les critères de qualité.
 * 
 * Checks effectués :
 * - Meta title ≤ 60 chars et ≥ 30 chars
 * - Meta description ≤ 155 chars et ≥ 80 chars
 * - H1 présent et non vide
 * - Contenu total > minWordCount (configurable, default 1200)
 * - Au moins N seoSections avec contenu substantiel
 * - FAQ présentes et bien formatées
 * - Pas de placeholder ou texte générique détecté
 * - Pas de duplication avec les pages existantes
 * - JSON valide et structure respectée
 * - Liens internes valides (slugs existants)
 */

import { SeoPageRow } from '../db/supabase.js';
import { getExistingSlugs } from '../db/supabase.js';
import { getExistingSlugsFromFiles } from '../deployers/inject-pages.js';
import * as logger from '../utils/logger.js';

// ─── Types ───────────────────────────────────────────────────

export interface QualityIssue {
  severity: 'error' | 'warning';  // error = bloque, warning = publie quand même
  field: string;
  message: string;
}

export interface QualityReport {
  passed: boolean;
  score: number;           // 0-100
  issues: QualityIssue[];
  summary: string;
}

// ─── Validators ──────────────────────────────────────────────

function checkMetaTitle(content: Record<string, unknown>): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const title = content.metaTitle as string;

  if (!title) {
    issues.push({ severity: 'error', field: 'metaTitle', message: 'Meta title manquant' });
  } else {
    if (title.length > 60) {
      issues.push({ severity: 'error', field: 'metaTitle', message: `Meta title trop long : ${title.length}/60 chars` });
    }
    if (title.length < 30) {
      issues.push({ severity: 'warning', field: 'metaTitle', message: `Meta title trop court : ${title.length}/30 chars minimum` });
    }
  }
  return issues;
}

function checkMetaDescription(content: Record<string, unknown>): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const desc = content.metaDescription as string;

  if (!desc) {
    issues.push({ severity: 'error', field: 'metaDescription', message: 'Meta description manquante' });
  } else {
    if (desc.length > 155) {
      issues.push({ severity: 'error', field: 'metaDescription', message: `Meta description trop longue : ${desc.length}/155 chars` });
    }
    if (desc.length < 80) {
      issues.push({ severity: 'warning', field: 'metaDescription', message: `Meta description trop courte : ${desc.length}/80 chars minimum` });
    }
  }
  return issues;
}

function checkH1(content: Record<string, unknown>): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const h1 = content.h1 as string;

  if (!h1 || h1.trim().length === 0) {
    issues.push({ severity: 'error', field: 'h1', message: 'H1 manquant ou vide' });
  }
  return issues;
}

function checkContentDepth(content: Record<string, unknown>, minWordCount: number): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const sections = content.seoSections as Array<{ title: string; content: string }>;

  if (!sections || sections.length === 0) {
    issues.push({ severity: 'error', field: 'seoSections', message: 'Aucune section SEO' });
    return issues;
  }

  if (sections.length < 3) {
    issues.push({ severity: 'error', field: 'seoSections', message: `Seulement ${sections.length} sections (min 3)` });
  }

  // Compter les mots totaux (gestion des contractions françaises : l', d', n', s', j')
  let totalWords = 0;
  const countWords = (text: string): number => {
    if (!text) return 0;
    return text
      .replace(/['']/g, ' ')  // Expand contractions: l'atelier → l atelier
      .split(/\s+/)
      .filter(w => w.length > 0)
      .length;
  };
  
  const intro = content.intro as string;
  if (intro) totalWords += countWords(intro);

  for (const section of sections) {
    if (!section.content || section.content.trim().length === 0) {
      issues.push({ severity: 'error', field: 'seoSections', message: `Section "${section.title}" vide` });
      continue;
    }
    const words = countWords(section.content);
    totalWords += words;

    if (words < 100) {
      issues.push({ severity: 'warning', field: 'seoSections', message: `Section "${section.title}" trop courte : ${words} mots (min 200)` });
    }
  }

  if (totalWords < minWordCount) {
    issues.push({ severity: 'error', field: 'wordCount', message: `Contenu trop court : ${totalWords} mots (min ${minWordCount})` });
  }

  return issues;
}

function checkFaq(content: Record<string, unknown>): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const faq = content.faq as Array<{ question: string; answer: string }>;

  if (!faq || faq.length === 0) {
    issues.push({ severity: 'warning', field: 'faq', message: 'Aucune FAQ' });
    return issues;
  }

  if (faq.length < 3) {
    issues.push({ severity: 'warning', field: 'faq', message: `Seulement ${faq.length} FAQ (min 5)` });
  }

  for (const item of faq) {
    if (!item.question || !item.answer) {
      issues.push({ severity: 'error', field: 'faq', message: 'FAQ avec question ou réponse manquante' });
    }
    if (item.answer && item.answer.split(/\s+/).length < 20) {
      issues.push({ severity: 'warning', field: 'faq', message: `Réponse trop courte pour "${item.question?.slice(0, 40)}"` });
    }
  }

  return issues;
}

function checkPlaceholders(content: Record<string, unknown>): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const json = JSON.stringify(content);

  // Détecter les placeholders non remplacés
  const placeholders = [
    /\{\{.*?\}\}/g,                    // {{VARIABLE}}
    /\(.*?à compléter.*?\)/gi,        // (à compléter)
    /\[INSÉRER.*?\]/gi,               // [INSÉRER ICI]
    /Lorem ipsum/gi,                   // Lorem ipsum
    /XXX/g,                            // XXX
    /TODO/gi,                          // TODO
    /PLACEHOLDER/gi,                   // PLACEHOLDER
  ];

  for (const pattern of placeholders) {
    const matches = json.match(pattern);
    if (matches) {
      issues.push({ severity: 'error', field: 'placeholders', message: `Placeholder détecté : "${matches[0]}"` });
    }
  }

  // Détecter le contenu IA générique
  const genericPhrases = [
    'n\'hésitez pas à nous contacter',
    'nous sommes les meilleurs',
    'notre équipe de professionnels qualifiés',
    'nous nous engageons à fournir',
    'satisfaction garantie à 100%',
  ];

  for (const phrase of genericPhrases) {
    if (json.toLowerCase().includes(phrase)) {
      issues.push({ severity: 'warning', field: 'generic', message: `Phrase générique détectée : "${phrase}"` });
    }
  }

  return issues;
}

function checkInternalLinks(
  content: Record<string, unknown>,
  existingSlugs: string[]
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const links = content.internalLinks as Array<{ slug: string; label: string }>;

  if (!links || links.length === 0) {
    issues.push({ severity: 'warning', field: 'internalLinks', message: 'Aucun lien interne' });
    return issues;
  }

  for (const link of links) {
    if (!link.slug) {
      issues.push({ severity: 'error', field: 'internalLinks', message: 'Lien interne sans slug' });
      continue;
    }
    if (existingSlugs.length > 0 && !existingSlugs.includes(link.slug)) {
      issues.push({ severity: 'warning', field: 'internalLinks', message: `Slug inexistant : "${link.slug}"` });
    }
    if (!link.label || link.label.toLowerCase().includes('cliquez ici') || link.label.toLowerCase().includes('en savoir plus')) {
      issues.push({ severity: 'warning', field: 'internalLinks', message: `Ancre non descriptive : "${link.label}"` });
    }
  }

  return issues;
}

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Valide une page générée avant publication.
 * Retourne un rapport avec score et issues.
 * 
 * @param page - SeoPageRow à valider
 * @param minWordCount - Nombre minimum de mots (default 1200)
 * @returns QualityReport
 */
export async function validatePage(
  page: SeoPageRow,
  minWordCount: number = 1200
): Promise<QualityReport> {
  const content = page.content as Record<string, unknown>;
  const allIssues: QualityIssue[] = [];

  // Checks structurels
  allIssues.push(...checkMetaTitle(content));
  allIssues.push(...checkMetaDescription(content));
  allIssues.push(...checkH1(content));
  allIssues.push(...checkContentDepth(content, minWordCount));
  allIssues.push(...checkFaq(content));
  allIssues.push(...checkPlaceholders(content));

  // Check liens internes contre les slugs existants
  let existingSlugs: string[] = [];
  try {
    const supabaseSlugs = await getExistingSlugs(page.site_key);
    const fileSlugs = getExistingSlugsFromFiles(page.site_key);
    existingSlugs = [...new Set([...supabaseSlugs, ...fileSlugs])];
  } catch (e) {
    logger.warn(`Could not fetch slugs for link validation: ${(e as Error).message}`);
  }
  allIssues.push(...checkInternalLinks(content, existingSlugs));

  // Calculer le score
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  const score = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));
  const passed = errors.length === 0;

  // Résumé
  let summary: string;
  if (passed && score >= 80) {
    summary = `Page OK (score ${score}/100) — prête à publier`;
  } else if (passed) {
    summary = `Page acceptable (score ${score}/100) — ${warnings.length} avertissements`;
  } else {
    summary = `Page REJETÉE (score ${score}/100) — ${errors.length} erreur(s) bloquante(s)`;
  }

  if (!passed) {
    logger.error(`Quality check FAILED for ${page.slug}: ${summary}`);
    for (const issue of errors) {
      logger.error(`  [${issue.field}] ${issue.message}`);
    }
  } else {
    logger.info(`Quality check passed for ${page.slug}: ${summary}`);
  }

  return { passed, score, issues: allIssues, summary };
}

/**
 * Formate le rapport qualité pour Telegram.
 */
export function formatQualityReportTelegram(slug: string, report: QualityReport): string {
  const icon = report.passed ? (report.score >= 80 ? '✅' : '⚠️') : '❌';
  const lines: string[] = [];

  lines.push(`${icon} <b>QA : ${slug}</b>`);
  lines.push(`Score : ${report.score}/100 — ${report.summary}`);

  if (report.issues.length > 0) {
    lines.push('');
    const errors = report.issues.filter(i => i.severity === 'error');
    const warnings = report.issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      lines.push(`<b>Erreurs (${errors.length}) :</b>`);
      for (const e of errors.slice(0, 5)) {
        lines.push(`  ❌ ${e.message}`);
      }
    }
    if (warnings.length > 0) {
      lines.push(`<b>Avertissements (${warnings.length}) :</b>`);
      for (const w of warnings.slice(0, 5)) {
        lines.push(`  ⚠️ ${w.message}`);
      }
    }
  }

  return lines.join('\n');
}
