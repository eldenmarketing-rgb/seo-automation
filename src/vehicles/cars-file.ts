import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import type { CarRecord } from './types.js';

/**
 * Lecture et écriture de `data/cars.ts` d'un site concessionnaire.
 *
 * Lecture : le tableau est **évalué** tel quel (c'est un littéral JavaScript
 * valide), plus de regex qui devinent les champs. Écriture : chaque fiche est
 * un bloc `  {` … `  },` à deux espaces, tel que les deux sites et le bot
 * l'écrivent ; on ne réécrit que le bloc concerné, les fiches voisines
 * (dont celles rédigées à la main) restent au caractère près.
 */

const CARS_FILE = 'data/cars.ts';

function carsPath(projectPath: string): string {
  return join(projectPath, CARS_FILE);
}

/** Le littéral de tableau après `export const cars: Car[] =`, sans le `;` final. */
function arrayLiteral(content: string): { start: number; end: number } {
  const declaration = content.match(/export\s+const\s+cars\s*(?::\s*Car\[\])?\s*=\s*\[/);
  if (!declaration || declaration.index === undefined) {
    throw new Error(`${CARS_FILE} : déclaration \`export const cars\` introuvable`);
  }
  const start = declaration.index + declaration[0].length - 1;
  const end = content.lastIndexOf('];');
  if (end < start) throw new Error(`${CARS_FILE} : fin du tableau introuvable`);
  return { start, end: end + 1 };
}

export function parseCarsFile(content: string): CarRecord[] {
  const { start, end } = arrayLiteral(content);
  const literal = content.slice(start, end);
  const value = vm.runInNewContext(`(${literal})`, {}, { timeout: 1000 }) as unknown;
  if (!Array.isArray(value)) throw new Error(`${CARS_FILE} : le tableau ne s'évalue pas en liste`);
  return value as CarRecord[];
}

export function readCars(projectPath: string): CarRecord[] {
  return parseCarsFile(readFileSync(carsPath(projectPath), 'utf-8'));
}

const q = (s: string): string => JSON.stringify(s);
const list = (items: string[]): string => `[${items.map(q).join(', ')}]`;

/** Une fiche au format du fichier (ordre des champs = celui des sites). */
export function serializeCar(car: CarRecord): string {
  const lines = [
    `    slug: ${q(car.slug)},`,
    `    marque: ${q(car.marque)},`,
    `    modele: ${q(car.modele)},`,
    `    annee: ${car.annee},`,
    `    prix: ${car.prix},`,
    `    kilometrage: ${car.kilometrage},`,
    `    carburant: ${q(car.carburant)},`,
    `    boiteVitesse: ${q(car.boiteVitesse)},`,
    `    categorie: ${list(car.categorie.length ? car.categorie : ['standard'])},`,
  ];
  if (car.puissanceFiscale) lines.push(`    puissanceFiscale: ${car.puissanceFiscale},`);
  const chevaux = car.chevaux;
  if (typeof chevaux === 'number' ? chevaux > 0 : chevaux) {
    lines.push(`    chevaux: ${typeof chevaux === 'number' ? chevaux : q(chevaux as string)},`);
  }
  if (car.couleur) lines.push(`    couleur: ${q(car.couleur)},`);
  if (car.portes) lines.push(`    portes: ${car.portes},`);
  lines.push(
    `    equipements: ${list(car.equipements)},`,
    `    description:`,
    `      ${q(car.description)},`,
    `    images: ${list(car.images)},`,
    `    enVedette: ${car.enVedette},`,
    `    disponible: ${car.disponible},`,
  );
  if (car.dateAjout) lines.push(`    dateAjout: ${q(car.dateAjout)},`);
  if (car.dateVente) lines.push(`    dateVente: ${q(car.dateVente)},`);
  return `  {\n${lines.join('\n')}\n  },`;
}

/** Position du bloc `  {` … `  },` de la fiche `slug` dans le fichier, ou null. */
function findBlock(content: string, slug: string): { start: number; end: number } | null {
  const blocks = content.matchAll(/^ {2}\{\n[\s\S]*?^ {2}\},?[ \t]*$/gm);
  const needle = new RegExp(`^\\s*slug:\\s*${q(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,`, 'm');
  for (const m of blocks) {
    if (m.index !== undefined && needle.test(m[0])) return { start: m.index, end: m.index + m[0].length };
  }
  return null;
}

export function appendCar(content: string, car: CarRecord): string {
  const { end } = arrayLiteral(content);
  const before = content.slice(0, end - 1).replace(/\s+$/, '');
  return `${before}\n${serializeCar(car)}\n${content.slice(end - 1)}`;
}

/** Remplace le bloc d'une fiche par sa version modifiée ; null si le slug n'existe pas. */
export function replaceCar(content: string, slug: string, patch: Partial<CarRecord>): string | null {
  const block = findBlock(content, slug);
  if (!block) return null;
  const current = parseCarsFile(content).find((c) => c.slug === slug);
  if (!current) return null;
  const updated: CarRecord = { ...current, ...patch };
  for (const key of Object.keys(patch) as (keyof CarRecord)[]) {
    if (patch[key] === undefined) delete updated[key];
  }
  return content.slice(0, block.start) + serializeCar(updated) + content.slice(block.end);
}

export function removeCar(content: string, slug: string): string | null {
  const block = findBlock(content, slug);
  if (!block) return null;
  let end = block.end;
  if (content[end] === '\n') end += 1;
  return content.slice(0, block.start) + content.slice(end);
}

/** Applique une transformation au fichier du site et l'écrit ; rend false si la fiche n'existe pas. */
export function updateCarsFile(projectPath: string, transform: (content: string) => string | null): boolean {
  const path = carsPath(projectPath);
  const content = readFileSync(path, 'utf-8');
  const next = transform(content);
  if (next === null) return false;
  parseCarsFile(next); // le fichier réécrit doit rester évaluable — sinon le build du site casse
  writeFileSync(path, next, 'utf-8');
  return true;
}
