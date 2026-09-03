import { describe, expect, it } from 'vitest';
import { normalizeBrand, normalizeEquipements, normalizeModel, slugify, uniqueSlug } from './normalize.js';

describe('normalizeBrand', () => {
  it('rétablit la casse et les alias des marques connues', () => {
    expect(normalizeBrand('peugeot')).toBe('Peugeot');
    expect(normalizeBrand('MERCEDES')).toBe('Mercedes-Benz');
    expect(normalizeBrand('mercedes benz')).toBe('Mercedes-Benz');
    expect(normalizeBrand('citroen')).toBe('Citroën');
    expect(normalizeBrand('vw')).toBe('Volkswagen');
    expect(normalizeBrand('bmw')).toBe('BMW');
    expect(normalizeBrand('mini cooper')).toBe('Mini');
  });

  it('met une capitale à une marque inconnue sans la déformer', () => {
    expect(normalizeBrand('lynk & co')).toBe('Lynk & Co');
    expect(normalizeBrand('BYD')).toBe('BYD');
  });
});

describe('normalizeModel', () => {
  it('retire la marque retapée et les doublons (historique réel du bot)', () => {
    expect(normalizeModel('Nissan', 'X-Trail X-Trail')).toBe('X-Trail');
    expect(normalizeModel('Mini', 'Mini cooper')).toBe('Cooper');
    expect(normalizeModel('Mercedes-Benz', 'mercedes benz classe a')).toBe('Classe A');
  });

  it('respecte la casse déjà posée', () => {
    expect(normalizeModel('Peugeot', '3008 GT')).toBe('3008 GT');
    expect(normalizeModel('Peugeot', 'e-2008')).toBe('e-2008');
    expect(normalizeModel('Citroën', 'C4 Picasso HDi')).toBe('C4 Picasso HDi');
  });

  it("ne vide jamais le modèle quand il n'est que la marque", () => {
    expect(normalizeModel('Mini', 'Mini')).toBe('Mini');
  });
});

describe('normalizeEquipements', () => {
  it('traduit les raccourcis et dédoublonne', () => {
    expect(normalizeEquipements(['clim', 'gps', 'camera de recul', 'Climatisation', ' bluetooth '])).toEqual([
      'Climatisation',
      'GPS',
      'Caméra de recul',
      'Bluetooth',
    ]);
  });

  it('garde un libellé inconnu avec une capitale', () => {
    expect(normalizeEquipements(['hayon électrique', ''])).toEqual(['Hayon électrique']);
  });
});

describe('slugs', () => {
  it('slugifie sans accent ni doublon de tiret', () => {
    expect(slugify('Citroën C4 Picasso  2016')).toBe('citroen-c4-picasso-2016');
  });

  it('suffixe un slug déjà pris', () => {
    expect(uniqueSlug('audi-a3-2015', ['audi-a3-2015'])).toBe('audi-a3-2015-2');
    expect(uniqueSlug('audi-a3-2015', ['audi-a3-2015', 'audi-a3-2015-2'])).toBe('audi-a3-2015-3');
    expect(uniqueSlug('audi-a3-2015', [])).toBe('audi-a3-2015');
  });
});
