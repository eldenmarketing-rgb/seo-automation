import { describe, expect, it } from 'vitest';
import { normalizeQuery, selectQueries } from './queries.js';

const gscRows = (n: number, prefix = 'requete') =>
  Array.from({ length: n }, (_, i) => ({ query: `${prefix} ${i}`, impressions: 100 - i }));

describe('normalizeQuery', () => {
  it('minuscules, sans accents, espaces repliés', () => {
    expect(normalizeQuery('  Réparation Boîte  Automatique ')).toBe('reparation boite automatique');
  });
});

describe('selectQueries', () => {
  it('agrège GSC par requête et trie par impressions', () => {
    const out = selectQueries({
      gsc: [
        { query: 'garage perpignan', impressions: 4 },
        { query: 'Garage Perpignan', impressions: 3 },
        { query: 'parallelisme perpignan', impressions: 5 },
      ],
      clusters: [],
      services: [],
      city: null,
    });
    expect(out.map((q) => q.query)).toEqual(['garage perpignan', 'parallelisme perpignan']);
    expect(out[0].impressions).toBe(7);
    expect(out[0].source).toBe('gsc');
  });

  it('ne dépasse jamais le plafond', () => {
    const out = selectQueries({ gsc: gscRows(60), clusters: [], services: [], city: null });
    expect(out).toHaveLength(20);
  });

  it('complète par les clusters seulement quand le site est muet', () => {
    const bavard = selectQueries({
      gsc: gscRows(15),
      clusters: ['silent disco mariage'],
      services: [],
      city: null,
    });
    expect(bavard.some((q) => q.source === 'cluster')).toBe(false);

    const muet = selectQueries({
      gsc: [{ query: 'carrosserie perpignan', impressions: 12 }],
      clusters: ['debosselage sans peinture', 'carrossier agree assurance'],
      services: [],
      city: null,
    });
    expect(muet.map((q) => q.source)).toEqual(['gsc', 'cluster', 'cluster']);
  });

  it('ajoute les services + ville sans doublonner une requête déjà couverte', () => {
    const out = selectQueries({
      gsc: [{ query: 'vidange perpignan pas cher', impressions: 12 }],
      clusters: [],
      services: ['Vidange', 'Pré-contrôle technique'],
      city: 'Perpignan',
    });
    expect(out.map((q) => q.query)).toEqual([
      'vidange perpignan pas cher',
      'pre-controle technique perpignan',
    ]);
    expect(out[1].source).toBe('service');
  });

  it('une hypothèse ne devance jamais une requête prouvée', () => {
    const out = selectQueries({
      gsc: gscRows(3),
      clusters: ['cluster a'],
      services: ['Service b'],
      city: 'Perpignan',
    });
    expect(out.slice(0, 3).every((q) => q.source === 'gsc')).toBe(true);
  });
});
