import { describe, expect, it } from 'vitest';
import { classifyDomain, isCleanReferring, normalizeDomain, sameDomain, serpDomainKind } from './classify.js';

describe('classifyDomain', () => {
  it('reconnaît les familles de la preuve Carrosserie', () => {
    expect(classifyDomain('seobacklinkdirectory.com')).toBe('spam-pbn');
    expect(classifyDomain('betwinnermirror.com')).toBe('spam-pbn');
    expect(classifyDomain('autour-de-moi.pro')).toBe('annuaire');
    expect(classifyDomain('zecarrossery.fr')).toBe('annuaire');
    expect(classifyDomain('lindependant.fr')).toBe('presse');
    expect(classifyDomain('perpignan.fr')).toBe('autre');
    expect(classifyDomain('facebook.com')).toBe('social');
  });
});

describe('isCleanReferring', () => {
  it('exclut le spam et les domaines de rang 0', () => {
    expect(isCleanReferring('annuaire', 51)).toBe(true);
    expect(isCleanReferring('autre', 0)).toBe(false);
    expect(isCleanReferring('spam-pbn', 80)).toBe(false);
    expect(isCleanReferring('social', 900)).toBe(false);
  });
});

describe('serpDomainKind', () => {
  it('ne propose ni Google ni les réseaux sociaux', () => {
    expect(serpDomainKind('google.com')).toBeNull();
    expect(serpDomainKind('facebook.com')).toBeNull();
    expect(serpDomainKind('fr.wikipedia.org')).toBeNull();
  });
  it('étiquette annuaires, réseaux nationaux et concurrents directs', () => {
    expect(serpDomainKind('pagesjaunes.fr')).toBe('annuaire');
    expect(serpDomainKind('idgarages.com')).toBe('annuaire');
    expect(serpDomainKind('norauto.fr')).toBe('reseau');
    expect(serpDomainKind('sbncarrosserie66.fr')).toBe('direct');
  });
});

describe('normalizeDomain / sameDomain', () => {
  it('ramène une URL à son domaine nu', () => {
    expect(normalizeDomain('https://www.Garage-Perpignan.fr/vidange?x=1')).toBe('garage-perpignan.fr');
    expect(normalizeDomain('ideal-transport.fr')).toBe('ideal-transport.fr');
  });
  it('accepte les sous-domaines', () => {
    expect(sameDomain('blog.mdcs-groupe.com', 'mdcs-groupe.com')).toBe(true);
    expect(sameDomain('www.mdcs-groupe.com', 'https://mdcs-groupe.com')).toBe(true);
    expect(sameDomain('notmdcs-groupe.com', 'mdcs-groupe.com')).toBe(false);
  });
});

describe('serpDomainKind — enseignes et sites d’emploi', () => {
  it('reconnaît les enseignes nationales, sous-domaine compris', () => {
    expect(serpDomainKind('carter-cash.com')).toBe('reseau');
    expect(serpDomainKind('perpignan.firststop.fr')).toBe('reseau');
    expect(serpDomainKind('centres-auto.speedy.fr')).toBe('reseau');
    expect(serpDomainKind('re-fap.fr')).toBe('reseau');
  });
  it('ne propose pas un site d’emploi', () => {
    expect(serpDomainKind('fr.indeed.com')).toBeNull();
  });
});

describe('serpDomainKind — plateformes et institutions', () => {
  it('une plateforme VTC ou une institution est une citation, pas un concurrent', () => {
    expect(serpDomainKind('allocab.com')).toBe('annuaire');
    expect(serpDomainKind('montransport.com')).toBe('annuaire');
    expect(serpDomainKind('mairie-perpignan.fr')).toBe('annuaire');
    expect(serpDomainKind('aeroport-perpignan.com')).toBe('annuaire');
    expect(serpDomainKind('canet-tourisme.com')).toBe('annuaire');
    expect(serpDomainKind('accueilperpignantaxi.fr')).toBe('direct');
  });
});
