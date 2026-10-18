import { describe, it, expect } from 'vitest';
import { buildReviewSms, cooldownBlocks, formatFr, normalizeFrMobile, parseAvisArgs } from './avis.js';

/** Alphabet GSM-7 de base : un SMS qui y reste tient en 160 caractères par segment. */
const GSM7 = /^[A-Za-z0-9 @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r]*$/;

describe('normalizeFrMobile', () => {
  it('accepte les écritures courantes d’un mobile français', () => {
    expect(normalizeFrMobile('06 12 34 56 78')).toBe('+33612345678');
    expect(normalizeFrMobile('07.12.34.56.78')).toBe('+33712345678');
    expect(normalizeFrMobile('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(normalizeFrMobile('0033612345678')).toBe('+33612345678');
  });
  it('refuse les fixes et les numéros incomplets (un SMS n’y arrive pas)', () => {
    expect(normalizeFrMobile('04 68 12 34 56')).toBeNull();
    expect(normalizeFrMobile('06 12 34 56')).toBeNull();
    expect(normalizeFrMobile('demain')).toBeNull();
  });
  it('réaffiche en national', () => {
    expect(formatFr('+33612345678')).toBe('06 12 34 56 78');
  });
});

describe('buildReviewSms', () => {
  it('tient en un segment GSM-7 pour Livraison de Nuit', () => {
    const sms = buildReviewSms('Livraison de Nuit', 'livraison-de-nuit.fr');
    expect(sms.length).toBeLessThanOrEqual(160);
    expect(sms).toMatch(GSM7);
    expect(sms).toContain('https://livraison-de-nuit.fr/avis/google');
    expect(sms).toContain('STOP');
  });
});

describe('cooldownBlocks', () => {
  const now = new Date('2026-10-18T22:00:00Z');
  it('bloque sous 60 jours, libère au-delà, ignore l’absence d’historique', () => {
    expect(cooldownBlocks('2026-10-01T20:00:00Z', now)).toBe(true);
    expect(cooldownBlocks('2026-08-01T20:00:00Z', now)).toBe(false);
    expect(cooldownBlocks(null, now)).toBe(false);
  });
});

describe('parseAvisArgs', () => {
  const keys = ['nuit', 'garage'];
  it('lit le site en suffixe ou en préfixe, sinon rien', () => {
    expect(parseAvisArgs('06 12 34 56 78 nuit', keys)).toEqual({
      phoneRaw: '06 12 34 56 78',
      siteKey: 'nuit',
    });
    expect(parseAvisArgs('nuit: 06 12 34 56 78', keys)).toEqual({
      phoneRaw: '06 12 34 56 78',
      siteKey: 'nuit',
    });
    expect(parseAvisArgs('06 12 34 56 78', keys)).toEqual({ phoneRaw: '06 12 34 56 78', siteKey: null });
  });
});
