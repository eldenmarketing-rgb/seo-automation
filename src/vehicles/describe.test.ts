import { describe, expect, it } from 'vitest';
import { buildDescriptionPrompt, checkDescription } from './describe.js';
import type { SiteConfig } from '../../config/site-types.js';
import type { CarRecord } from './types.js';

const site = { key: 'voitures', name: 'Ideo Car', city: 'Cabestany' } as SiteConfig;

const car: CarRecord = {
  slug: 'peugeot-308-2019',
  marque: 'Peugeot',
  modele: '308',
  annee: 2019,
  prix: 12990,
  kilometrage: 87000,
  carburant: 'Diesel',
  boiteVitesse: 'Manuelle',
  categorie: ['standard'],
  chevaux: '1.5 BlueHDi 130 ch',
  couleur: 'Gris',
  portes: 5,
  equipements: ['GPS', 'Régulateur de vitesse'],
  description: '',
  images: [],
  enVedette: false,
  disponible: true,
};

const paragraph = (n: number) => Array.from({ length: n }, (_, i) => `mot${i}`).join(' ');
const valid = `Peugeot 308 2019 ${paragraph(50)}.\n\n${paragraph(60)}.\n\n${paragraph(60)}.`;

describe('buildDescriptionPrompt', () => {
  it('ne contient que les faits saisis et ceux vérifiés du site', () => {
    const p = buildDescriptionPrompt({ site, car, notes: 'CT ok, distribution faite', sold: false });
    expect(p).toContain('Kilométrage : 87 000 km');
    expect(p).toContain('CT ok, distribution faite');
    expect(p).toContain('Cabestany');
    expect(p).not.toContain('120 points');
    expect(p).not.toContain('500 véhicules');
  });

  it('passe au passé pour une fiche vendue', () => {
    const p = buildDescriptionPrompt({ site, car, notes: '', sold: true });
    expect(p).toContain('VENDU');
    expect(p).toContain("n'est plus disponible");
  });
});

describe('checkDescription', () => {
  it('accepte un texte conforme', () => {
    expect(checkDescription(valid, { car, notes: '' })).toBeNull();
  });

  it('refuse trop court, un seul paragraphe, une liste', () => {
    expect(checkDescription(paragraph(40), { car, notes: '' })).toMatch(/trop court/);
    expect(checkDescription(paragraph(180), { car, notes: '' })).toMatch(/un seul paragraphe/);
    expect(checkDescription(`${valid}\n\n- point`, { car, notes: '' })).toMatch(/liste/);
  });

  it("refuse une affirmation que le vendeur n'a pas donnée, l'accepte s'il l'a donnée", () => {
    const text = `${valid} Garantie 12 mois incluse.`;
    expect(checkDescription(text, { car, notes: '' })).toMatch(/garantie/);
    expect(checkDescription(text, { car, notes: 'garantie 12 mois' })).toBeNull();
  });

  it('refuse le vocabulaire de brocante', () => {
    expect(checkDescription(`${valid} Une affaire à saisir.`, { car, notes: '' })).toMatch(/interdite/);
  });
});
