import { mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

/**
 * Photos reçues par Telegram → fichiers WebP du site.
 *
 * Les sites servent `public/images/cars/<slug>-<n>.webp` en 1280 px de large
 * (convention posée à la main sur Ideo Car le 2026-09-03). Le bot écrivait
 * jusque-là le JPEG brut de Telegram : on aligne, et on redresse l'orientation
 * EXIF au passage (photo de téléphone tournée d'un quart de tour sinon).
 */

const MAX_WIDTH = 1280;
const QUALITY = 82;

export const CAR_IMAGES_DIR = 'public/images/cars';

export async function fetchTelegramFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`téléchargement photo : HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Écrit une photo au format du site et rend le chemin public à mettre dans `images`. */
export async function saveCarPhoto(
  projectPath: string,
  slug: string,
  index: number,
  source: Buffer,
): Promise<string> {
  const dir = join(projectPath, CAR_IMAGES_DIR);
  mkdirSync(dir, { recursive: true });
  const file = `${slug}-${index}.webp`;
  await sharp(source)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(join(dir, file));
  return `/${CAR_IMAGES_DIR}/${file}`.replace('/public/', '/');
}
