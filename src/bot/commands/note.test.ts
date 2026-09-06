import { describe, it, expect } from 'vitest';
import { splitSitePrefix } from './note.js';

/**
 * Le préfixe de site est la seule chose « intelligente » de `/note` : mal
 * réglée, une note part sur un site fantôme ou garde « garage: » dans son
 * titre. La règle est dupliquée dans le dashboard (`src/lib/tasks.ts`) — ces
 * cas valent pour les deux.
 */
describe('splitSitePrefix', () => {
  const keys = ['garage', 'carrosserie', 'vtc', 'voitures'];

  it('reconnaît une clé de site exacte et retire le préfixe', () => {
    expect(splitSitePrefix('garage: refaire le sitemap', keys)).toEqual({
      siteKey: 'garage',
      title: 'refaire le sitemap',
    });
  });

  it('accepte une abréviation sans ambiguïté', () => {
    expect(splitSitePrefix('carro: relancer le client', keys)).toEqual({
      siteKey: 'carrosserie',
      title: 'relancer le client',
    });
  });

  it('ignore un préfixe inconnu — le texte reste entier', () => {
    expect(splitSitePrefix('rappeler le client a 14:30', keys)).toEqual({
      siteKey: null,
      title: 'rappeler le client a 14:30',
    });
  });

  it('ignore une abréviation trop courte ou ambiguë', () => {
    expect(splitSitePrefix('v: quelque chose', keys).siteKey).toBeNull();
    expect(splitSitePrefix('vo: quelque chose', keys).siteKey).toBeNull();
  });

  it('ne prend pas un préfixe seul pour une note vide', () => {
    expect(splitSitePrefix('garage:', keys)).toEqual({ siteKey: null, title: 'garage:' });
  });
});
