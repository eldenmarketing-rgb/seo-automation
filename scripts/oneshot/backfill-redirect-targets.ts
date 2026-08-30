/**
 * Rattrapage du 2026-08-30 : renseigne `redirect_to` sur les lignes
 * `status = 'redirected'` existantes, depuis les redirections écrites dans le
 * next.config de chaque site (le code reste maître ; la base devient
 * cohérente et le crawler pourra un jour vérifier la cible).
 *
 * Carrosserie est exclue (banc d'essai, pas touché). Une ligne sans
 * correspondance dans le code reste à null et est listée.
 *
 * Simulation par défaut ; `--apply` écrit.
 */
import { readFileSync, existsSync } from 'fs';
import { getSupabase } from '../../src/db/client.js';

const apply = process.argv.includes('--apply');
const sb = getSupabase();

const SITES: Record<string, string> = {
  garage: '/home/ubuntu/sites/Site_Garage',
  restaurant: '/home/ubuntu/sites/Mon-Sauveur',
  elayarituel: '/home/ubuntu/sites/Elayarituel',
  debarras: '/home/ubuntu/sites/Debarras-Habitat',
  vtc: '/home/ubuntu/sites/Site_VTC',
  voitures: '/home/ubuntu/sites/Site_Voitures',
};

/** Les couples source → destination d'un next.config (lecture textuelle, pas d'exécution). */
function codeRedirects(dir: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of ['next.config.ts', 'next.config.mjs', 'next.config.js']) {
    const f = `${dir}/${name}`;
    if (!existsSync(f)) continue;
    const src = readFileSync(f, 'utf-8');
    const re = /source:\s*["'`]([^"'`]+)["'`]\s*,\s*destination:\s*["'`]([^"'`]+)["'`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) map.set(m[1], m[2]);
  }
  return map;
}

const { data, error } = await sb
  .from('seo_pages')
  .select('id, site_key, slug, redirect_to')
  .eq('status', 'redirected')
  .is('redirect_to', null)
  .order('site_key')
  .order('slug');
if (error) throw error;

let n = 0;
const orphans: string[] = [];
for (const row of data ?? []) {
  if (!(row.site_key in SITES)) {
    orphans.push(`${row.site_key} /${row.slug} (site hors périmètre)`);
    continue;
  }
  const code = codeRedirects(SITES[row.site_key]);
  const to = code.get(`/${row.slug}`) ?? code.get(`/${row.slug}/`);
  if (!to) {
    orphans.push(`${row.site_key} /${row.slug}`);
    continue;
  }
  n++;
  console.log(`${row.site_key.padEnd(12)} /${row.slug.padEnd(44)} → ${to}`);
  if (apply) await sb.from('seo_pages').update({ redirect_to: to }).eq('id', row.id);
}
console.log(`\n${n} cible(s) renseignée(s) — ${apply ? 'ÉCRIT' : 'simulation (--apply pour écrire)'}`);
if (orphans.length) console.log(`\nSans redirection dans le code (restent null) :\n  ${orphans.join('\n  ')}`);
