import { describe, expect, it } from 'vitest';
import { appendCar, parseCarsFile, removeCar, replaceCar, serializeCar } from './cars-file.js';
import type { CarRecord } from './types.js';

/** Extrait fidèle des deux formats en production : fiche Ideo Car rédigée à la main, fiche Okaz écrite par le bot. */
const FIXTURE = `import { Car } from "@/types/car";

/**
 * INVENTAIRE DES VÉHICULES — FICHIER À ÉDITER
 */
export const cars: Car[] = [
  {
    slug: "nissan-x-trail-2006",
    marque: "Nissan",
    modele: "X-Trail",
    annee: 2006,
    prix: 5880,
    kilometrage: 241000,
    carburant: "Diesel",
    boiteVitesse: "Manuelle",
    categorie: ["petit-prix", "4x4"],
    chevaux: "2.2 dCi 136 ch",
    couleur: "Noir",
    portes: 5,
    equipements: ["Transmission 4x4 ALL MODE", "Climatisation"],
    description:
      "Nissan X-Trail de première génération (T30).\\n\\nLe X-Trail T30 reste recherché : \\"sable\\" et {chemins}.\\n\\nCe véhicule n'est plus disponible.",
    images: ["/images/cars/nissan-x-trail-2006-1.webp", "/images/cars/nissan-x-trail-2006-2.webp"],
    enVedette: false,
    disponible: false,
    dateAjout: "2026-03-12",
    dateVente: "2026-03-15",
  },
  {
    slug: "peugeot-2008-2022",
    marque: "Peugeot",
    modele: "2008",
    annee: 2022,
    prix: 10900,
    kilometrage: 130109,
    carburant: "Électrique",
    boiteVitesse: "Automatique",
    categorie: ["petit-prix"],
    chevaux: 0,
    couleur: "Orange",
    portes: 5,
    equipements: ["Climatisation", "Caméra 360", "Aide à la conduite"],
    description: "Peugeot 2008 2022, 130 109 km, Électrique, boîte automatique. À voir chez Okaz Autos 66 à Saleilles.",
    images: ["/images/cars/peugeot-2008-2022-1.jpg"],
    dateAjout: "2026-08-26T04:16:33+00:00",
    enVedette: true,
    disponible: true,
  },
];
`;

const NEW_CAR: CarRecord = {
  slug: 'audi-a3-2015',
  marque: 'Audi',
  modele: 'A3 Sportback',
  annee: 2015,
  prix: 11990,
  kilometrage: 98000,
  carburant: 'Diesel',
  boiteVitesse: 'Manuelle',
  categorie: [],
  chevaux: '2.0 TDI 150 ch',
  couleur: 'Gris',
  portes: 5,
  equipements: ['GPS', 'Régulateur de vitesse'],
  description: 'Premier paragraphe.\n\nDeuxième paragraphe avec "guillemets".',
  images: ['/images/cars/audi-a3-2015-1.webp'],
  enVedette: false,
  disponible: true,
  dateAjout: '2026-09-03',
};

describe('parseCarsFile', () => {
  it('évalue les deux formats sans deviner les champs', () => {
    const cars = parseCarsFile(FIXTURE);
    expect(cars.map((c) => c.slug)).toEqual(['nissan-x-trail-2006', 'peugeot-2008-2022']);
    expect(cars[0].dateVente).toBe('2026-03-15');
    expect(cars[0].description).toContain('{chemins}');
    expect(cars[0].description.split('\n\n')).toHaveLength(3);
    expect(cars[1].disponible).toBe(true);
    expect(cars[1].chevaux).toBe(0);
  });

  it('refuse un fichier sans déclaration', () => {
    expect(() => parseCarsFile('export const foo = [];')).toThrow(/introuvable/);
  });
});

describe('appendCar', () => {
  it('ajoute la fiche en fin de tableau et le fichier reste évaluable', () => {
    const next = appendCar(FIXTURE, NEW_CAR);
    const cars = parseCarsFile(next);
    expect(cars).toHaveLength(3);
    expect(cars[2]).toMatchObject({ slug: 'audi-a3-2015', categorie: ['standard'], dateAjout: '2026-09-03' });
    expect(cars[2].description).toBe(NEW_CAR.description);
    expect(next.endsWith('];\n')).toBe(true);
    // Les fiches existantes n'ont pas bougé d'un caractère.
    expect(next.startsWith(FIXTURE.slice(0, FIXTURE.lastIndexOf('];')))).toBe(true);
  });

  it("n'écrit ni chevaux: 0 ni champs vides", () => {
    const text = serializeCar({ ...NEW_CAR, chevaux: 0, couleur: '', dateAjout: undefined });
    expect(text).not.toContain('chevaux');
    expect(text).not.toContain('couleur');
    expect(text).not.toContain('dateAjout');
  });
});

describe('replaceCar', () => {
  it('marque vendu avec dateVente sans toucher aux autres fiches', () => {
    const next = replaceCar(FIXTURE, 'peugeot-2008-2022', { disponible: false, dateVente: '2026-09-03' });
    expect(next).not.toBeNull();
    const cars = parseCarsFile(next!);
    expect(cars[1]).toMatchObject({ disponible: false, dateVente: '2026-09-03', prix: 10900 });
    expect(cars[0]).toEqual(parseCarsFile(FIXTURE)[0]);
    expect(next!).toContain('INVENTAIRE DES VÉHICULES');
  });

  it('retire dateVente à la remise en vente (patch à undefined)', () => {
    const next = replaceCar(FIXTURE, 'nissan-x-trail-2006', { disponible: true, dateVente: undefined });
    const car = parseCarsFile(next!)[0];
    expect(car.disponible).toBe(true);
    expect(car.dateVente).toBeUndefined();
    expect(car.dateAjout).toBe('2026-03-12');
  });

  it('rend null pour un slug inconnu', () => {
    expect(replaceCar(FIXTURE, 'inconnu', { prix: 1 })).toBeNull();
  });
});

describe('removeCar', () => {
  it('retire une fiche et laisse un tableau propre', () => {
    const next = removeCar(FIXTURE, 'nissan-x-trail-2006');
    expect(next).not.toBeNull();
    const cars = parseCarsFile(next!);
    expect(cars.map((c) => c.slug)).toEqual(['peugeot-2008-2022']);
    expect(next!).toContain('export const cars: Car[] = [\n  {\n    slug: "peugeot-2008-2022"');
  });

  it('rend null pour un slug inconnu', () => {
    expect(removeCar(FIXTURE, 'inconnu')).toBeNull();
  });
});
