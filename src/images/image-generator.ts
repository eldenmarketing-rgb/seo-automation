/**
 * AI Image Generator for SEO Pages
 * 
 * Génère des images uniques par page via Together AI (FLUX).
 * Images jamais vues ailleurs = meilleur signal SEO que du stock photo.
 * 
 * Modèles disponibles (du moins cher au plus réaliste) :
 * - FLUX.1 [schnell] Free   → GRATUIT (qualité correcte, ultra rapide)
 * - FLUX.1 [schnell] Turbo  → ~$0.003/image (rapide, bonne qualité)
 * - FLUX.1 Krea [dev]       → ~$0.025/MP (le plus photoréaliste, anti "AI look")
 * - FLUX.2 [pro]            → $0.03/image (meilleure qualité générale)
 * 
 * Config : TOGETHER_API_KEY dans .env
 * 
 * Flow :
 * 1. Construit un prompt photo réaliste depuis le contexte de la page
 * 2. Appelle Together AI → reçoit l'URL de l'image
 * 3. Télécharge, convertit en WebP, compresse
 * 4. Sauvegarde dans le dossier public du site
 * 5. Retourne les métadonnées (path, alt, dimensions) pour injection
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp'; // npm install sharp
import dotenv from 'dotenv';
import { UniversalPage } from '../../config/site-modes.js';
import * as logger from '../utils/logger.js';

dotenv.config();

// ─── Config ──────────────────────────────────────────────────

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || '';
const API_URL = 'https://api.together.xyz/v1/images/generations';

// Modèle par défaut — Krea Dev pour le photoréalisme
const DEFAULT_MODEL = process.env.FLUX_MODEL || 'black-forest-labs/FLUX.1-krea-dev';

// Fallback rapide
const FREE_MODEL = 'black-forest-labs/FLUX.1-schnell';

// Dimensions optimisées SEO (16:9 pour hero, 4:3 pour contenu)
const IMAGE_SIZES = {
  hero: { width: 1200, height: 672 },     // ~16:9 (multiple of 8)
  content: { width: 800, height: 600 },    // 4:3
  square: { width: 800, height: 800 },     // 1:1
} as const;

type ImageRole = keyof typeof IMAGE_SIZES;

// ─── Types ───────────────────────────────────────────────────

export interface GeneratedImage {
  filename: string;           // vidange-perpignan-hero.webp
  filepath: string;           // /public/images/generated/vidange-perpignan-hero.webp
  alt: string;                // "Mécanicien effectuant une vidange à Perpignan"
  width: number;
  height: number;
  sizeKb: number;
  model: string;
  prompt: string;
}

export interface PageImages {
  hero: GeneratedImage;
  content: GeneratedImage[];  // 1-2 images dans le corps
}

// ─── Prompt Builder ──────────────────────────────────────────

/**
 * Construit un prompt photo réaliste adapté à la page.
 * L'objectif : des photos qui ressemblent à de vraies photos prises sur place.
 */
function buildImagePrompt(page: UniversalPage, role: ImageRole): string {
  const baseStyle = 'Professional photograph, natural lighting, realistic, high resolution, no text overlay, no watermark, no AI artifacts';
  
  // ── Mode LOCAL ──
  if (page.modeConfig.mode === 'local') {
    const city = page.city?.name || 'ville du sud de la France';
    const service = page.service?.name || page.site.business || '';
    const siteType = page.site.schemaType || 'LocalBusiness';

    // Prompts spécifiques par type de business
    const businessPrompts: Record<string, Record<ImageRole, string>> = {
      garage: {
        hero: `${baseStyle}. Interior of a professional auto repair garage workshop in southern France. Clean organized workshop with car on hydraulic lift, professional mechanic working, tools neatly arranged. Warm ambient lighting, Mediterranean architectural details visible.`,
        content: `${baseStyle}. Close-up of mechanic hands performing ${service} on a modern European car. Professional tools, clean workspace, focus on technical expertise and precision. Natural workshop lighting.`,
        square: `${baseStyle}. Professional auto mechanic in clean uniform smiling confidently in a well-organized French garage workshop. Shelves with organized parts visible behind.`,
      },
      carrosserie: {
        hero: `${baseStyle}. Professional auto body repair shop in France. Spacious paint booth with car being prepared for painting, protective covering, spray equipment. Clean, modern, well-lit facility.`,
        content: `${baseStyle}. Close-up of auto body repair work - ${service}. Skilled technician working on car panel, showing precision and craftsmanship. Professional lighting in body shop.`,
        square: `${baseStyle}. Before and after view of car body repair - smooth repaired panel next to damaged panel. Professional auto body work quality. Studio-like lighting.`,
      },
      massage: {
        hero: `${baseStyle}. Peaceful in-home massage setting in a bright Mediterranean-style room. Professional massage table with clean linens, essential oils, candles. Warm natural sunlight through shutters. Calm and serene atmosphere.`,
        content: `${baseStyle}. Professional massage therapist's hands performing ${service} technique. Clean, professional setup, calming atmosphere, soft lighting. Focus on technique and professionalism.`,
        square: `${baseStyle}. Elegant arrangement of massage oils, hot stones, and fresh towels on a bamboo tray. Zen-like composition, warm tones, spa atmosphere.`,
      },
      vtc: {
        hero: `${baseStyle}. Elegant black premium sedan parked in front of a beautiful Mediterranean building in southern France. Professional chauffeur in suit opening door. Palm trees, blue sky, warm sunlight.`,
        content: `${baseStyle}. Interior of a luxury private hire vehicle. Leather seats, immaculate cleanliness, water bottle for passenger, professional ambiance. Warm lighting.`,
        square: `${baseStyle}. Professional VTC driver in elegant dark suit standing next to a premium black sedan. Confident, welcoming pose. Mediterranean city background.`,
      },
      restaurant: {
        hero: `${baseStyle}. Beautiful terrace of a French Mediterranean restaurant. Set tables with white tablecloths, fresh flowers, view of a southern French town. Golden hour warm lighting, inviting atmosphere.`,
        content: `${baseStyle}. Beautifully plated dish of ${service || 'French Mediterranean cuisine'}. Fresh local ingredients, artistic presentation on white plate. Natural lighting, shallow depth of field.`,
        square: `${baseStyle}. Charming interior of a French bistro restaurant. Exposed stone walls, warm lighting, set tables, wine glasses. Cozy and authentic atmosphere.`,
      },
    };

    // Trouver le type de business
    const bizType = Object.keys(businessPrompts).find(k => 
      page.siteKey.includes(k) || siteType.toLowerCase().includes(k)
    ) || 'garage';

    const prompts = businessPrompts[bizType] || businessPrompts.garage;
    return prompts[role];
  }

  // ── Mode THÉMATIQUE ──
  if (page.modeConfig.mode === 'thematic') {
    const topic = page.topic?.name || '';

    if (page.siteKey.includes('reprog') || topic.toLowerCase().includes('reprogramm')) {
      const prompts: Record<ImageRole, string> = {
        hero: `${baseStyle}. Professional engine tuning workshop. Laptop connected to car ECU via OBD port, dyno screen showing power curves in background. Modern technical equipment, professional environment. Blue and dark tones.`,
        content: `${baseStyle}. Close-up of ${topic} process. Professional tuning equipment, OBD diagnostic interface connected to engine bay. Technical precision, modern workshop. Cool blue lighting.`,
        square: `${baseStyle}. Professional engine tuner analyzing ECU data on laptop screen. Power curves and maps visible. Technical expertise, focused professional. Clean modern workshop.`,
      };
      return prompts[role];
    }

    // Thématique générique
    return `${baseStyle}. Professional educational setting related to ${topic}. Modern training room, expert instructor demonstrating technique, students engaged. Well-lit, professional atmosphere.`;
  }

  // ── Mode PRODUIT ──
  if (page.modeConfig.mode === 'product') {
    const product = page.product?.name || '';
    const attrs = page.product?.attributes || {};

    if (page.modeConfig.product?.schemaType === 'Vehicle') {
      return `${baseStyle}. ${attrs.marque || ''} ${attrs.modele || ''} ${attrs.annee || ''} ${attrs.couleur || 'silver'} parked in a professional car dealership lot. Clean, polished, three-quarter front view. Mediterranean backdrop, professional car photography.`;
    }

    return `${baseStyle}. Product photography of ${product}. Clean white background, professional studio lighting, multiple angles visible. High-end commercial product shot.`;
  }

  // Fallback
  return `${baseStyle}. Professional business environment in southern France. Mediterranean architecture, warm sunlight, clean modern workspace.`;
}

// ─── Image Generator ─────────────────────────────────────────

/**
 * Appelle Together AI pour générer une image.
 */
async function generateImage(
  prompt: string,
  width: number,
  height: number,
  model?: string
): Promise<{ url: string; model: string }> {
  if (!TOGETHER_API_KEY) {
    throw new Error('Together AI API key not configured. Set TOGETHER_API_KEY in .env');
  }

  const selectedModel = model || DEFAULT_MODEL;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
      prompt,
      width,
      height,
      steps: selectedModel.includes('schnell') ? 4 : 28,
      n: 1,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    
    // Si le modèle payant échoue, essayer le gratuit
    if (selectedModel !== FREE_MODEL) {
      logger.warn(`Together AI ${selectedModel} failed, trying free model...`);
      return generateImage(prompt, width, height, FREE_MODEL);
    }
    
    throw new Error(`Together AI error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json() as any;
  const imageUrl = data.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error('No image URL in Together AI response');
  }

  return { url: imageUrl, model: selectedModel };
}

/**
 * Télécharge une image depuis une URL et la convertit en WebP optimisé.
 */
async function downloadAndOptimize(
  imageUrl: string,
  outputPath: string,
  maxWidth: number,
  maxHeight: number,
  quality: number = 82
): Promise<{ width: number; height: number; sizeKb: number }> {
  // Télécharger avec timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(imageUrl, { signal: controller.signal });
  clearTimeout(timeout);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  
  const buffer = Buffer.from(await response.arrayBuffer());

  // Convertir en WebP avec Sharp
  const processed = await sharp(buffer)
    .resize(maxWidth, maxHeight, { fit: 'cover', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  // Sauvegarder
  const dir = path.dirname(outputPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(outputPath, processed);

  // Métadonnées
  const metadata = await sharp(processed).metadata();
  
  return {
    width: metadata.width || maxWidth,
    height: metadata.height || maxHeight,
    sizeKb: Math.round(processed.length / 1024),
  };
}

// ─── Alt Text Builder ────────────────────────────────────────

function buildAltText(page: UniversalPage, role: ImageRole): string {
  const parts: string[] = [];

  if (page.service) parts.push(page.service.name);
  else if (page.topic) parts.push(page.topic.name);
  else if (page.product) parts.push(page.product.name);
  else parts.push(page.site.business || page.site.name);

  if (page.city) parts.push(`à ${page.city.name}`);

  if (role === 'hero') parts.push(`- ${page.site.name}`);

  return parts.join(' ');
}

function buildFilename(page: UniversalPage, role: ImageRole, index?: number): string {
  const parts = [page.slug];
  if (role !== 'hero') parts.push(role);
  if (index !== undefined) parts.push(String(index + 1));
  return parts.join('-') + '.webp';
}

// ─── Main Entry Points ──────────────────────────────────────

/**
 * Génère toutes les images pour une page SEO.
 * Retourne les métadonnées à injecter dans le contenu.
 * 
 * @param page - La page pour laquelle générer les images
 * @param outputDir - Dossier de sortie (ex: ~/sites/garage-perpignan/public/images/generated)
 * @param options - Options de génération
 */
export async function generatePageImages(
  page: UniversalPage,
  outputDir: string,
  options: {
    heroImage?: boolean;     // Générer l'image hero (default: true)
    contentImages?: number;  // Nombre d'images contenu (default: 1)
    model?: string;          // Modèle à utiliser
    quality?: number;        // Qualité WebP 1-100 (default: 82)
  } = {}
): Promise<PageImages> {
  const {
    heroImage = true,
    contentImages = 1,
    model,
    quality = 82,
  } = options;

  const results: PageImages = {
    hero: null as any,
    content: [],
  };

  // 1. Image Hero
  if (heroImage) {
    try {
      const prompt = buildImagePrompt(page, 'hero');
      const size = IMAGE_SIZES.hero;
      const filename = buildFilename(page, 'hero');
      const filepath = path.join(outputDir, filename);

      logger.info(`Generating hero image: ${filename}`);
      const { url, model: usedModel } = await generateImage(prompt, size.width, size.height, model);
      const meta = await downloadAndOptimize(url, filepath, size.width, size.height, quality);

      results.hero = {
        filename,
        filepath: `/images/generated/${filename}`,
        alt: buildAltText(page, 'hero'),
        width: meta.width,
        height: meta.height,
        sizeKb: meta.sizeKb,
        model: usedModel,
        prompt,
      };

      logger.success(`Hero image: ${filename} (${meta.sizeKb}KB)`);
    } catch (e) {
      logger.error(`Hero image failed for ${page.slug}: ${(e as Error).message}`);
    }
  }

  // 2. Images Contenu
  for (let i = 0; i < contentImages; i++) {
    try {
      const prompt = buildImagePrompt(page, 'content');
      const size = IMAGE_SIZES.content;
      const filename = buildFilename(page, 'content', i);
      const filepath = path.join(outputDir, filename);

      logger.info(`Generating content image ${i + 1}: ${filename}`);
      const { url, model: usedModel } = await generateImage(prompt, size.width, size.height, model);
      const meta = await downloadAndOptimize(url, filepath, size.width, size.height, quality);

      results.content.push({
        filename,
        filepath: `/images/generated/${filename}`,
        alt: buildAltText(page, 'content'),
        width: meta.width,
        height: meta.height,
        sizeKb: meta.sizeKb,
        model: usedModel,
        prompt,
      });

      logger.success(`Content image: ${filename} (${meta.sizeKb}KB)`);

      // Rate limit entre les images
      if (i < contentImages - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      logger.error(`Content image ${i + 1} failed for ${page.slug}: ${(e as Error).message}`);
    }
  }

  return results;
}

/**
 * Génère une seule image custom avec un prompt libre.
 * Utilisable via /image dans Grammy.
 */
export async function generateCustomImage(
  prompt: string,
  outputPath: string,
  options: {
    width?: number;
    height?: number;
    model?: string;
    quality?: number;
  } = {}
): Promise<GeneratedImage> {
  const {
    width = 1024,
    height = 768,
    model,
    quality = 85,
  } = options;

  const { url, model: usedModel } = await generateImage(prompt, width, height, model);
  const filename = path.basename(outputPath);
  const meta = await downloadAndOptimize(url, outputPath, width, height, quality);

  return {
    filename,
    filepath: outputPath,
    alt: prompt.slice(0, 120),
    width: meta.width,
    height: meta.height,
    sizeKb: meta.sizeKb,
    model: usedModel,
    prompt,
  };
}

/**
 * Estime le coût de génération d'images pour un batch de pages.
 */
export function estimateCost(pageCount: number, imagesPerPage: number = 2): {
  model: string;
  totalImages: number;
  estimatedCost: string;
} {
  const totalImages = pageCount * imagesPerPage;
  const modelName = DEFAULT_MODEL;
  
  let costPerImage: number;
  if (modelName.includes('schnell-Free')) costPerImage = 0;
  else if (modelName.includes('schnell')) costPerImage = 0.003;
  else if (modelName.includes('krea')) costPerImage = 0.02;
  else if (modelName.includes('FLUX.2')) costPerImage = 0.03;
  else if (modelName.includes('FLUX.1.1-pro')) costPerImage = 0.03;
  else costPerImage = 0.02;

  return {
    model: modelName,
    totalImages,
    estimatedCost: `~$${(totalImages * costPerImage).toFixed(2)}`,
  };
}
