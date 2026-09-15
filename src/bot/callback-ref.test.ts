import { describe, expect, it } from 'vitest';
import { callbackRef, REF_LENGTH, resolveCallbackRef } from './callback-ref.js';

describe('callbackRef', () => {
  it('tient dans les 64 octets de Telegram quel que soit le slug', () => {
    const slug = 'peugeot-expert-cabine-approfondie-5-places-standard-2019';
    const data = `voiture_modif:${callbackRef(slug)}`;
    expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
    expect(callbackRef(slug)).toHaveLength(REF_LENGTH);
  });

  it('est stable et distingue deux slugs', () => {
    expect(callbackRef('audi-q5-2018')).toBe(callbackRef('audi-q5-2018'));
    expect(callbackRef('audi-q5-2018')).not.toBe(callbackRef('audi-q5-2019'));
  });
});

describe('resolveCallbackRef', () => {
  const slugs = ['audi-q5-2018', 'peugeot-partner-2021'];

  it('retrouve le slug depuis sa référence', () => {
    expect(resolveCallbackRef(slugs, callbackRef('peugeot-partner-2021'))).toBe('peugeot-partner-2021');
  });

  it('accepte encore un slug brut (bouton affiché avant le changement)', () => {
    expect(resolveCallbackRef(slugs, 'audi-q5-2018')).toBe('audi-q5-2018');
  });

  it('ne renvoie rien pour une donnée inconnue', () => {
    expect(resolveCallbackRef(slugs, 'inconnu')).toBeUndefined();
  });
});
