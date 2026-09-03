import { describe, expect, it } from 'vitest';
import {
  assembleBody,
  buildArticleEntry,
  filtrerLiensMarkdown,
  parseArticlesFile,
  upsertArticle,
} from './inject-articles.js';
import type { SeoPageRow } from '../db/pages.js';
import type { SiteConfig } from '../../config/site-types.js';

const FIXTURE = `import type { Article } from "@/types/article";

/** CONSEILS — un article par mois. */
export const articles: Article[] = [
  {
    slug: "quel-4x4-occasion-montagne-plage",
    title: "Quel 4x4 d'occasion pour la montagne et la plage ?",
    description: "Neige l'hiver, sable l'été.",
    datePublication: "2026-09-03",
    categorie: "4x4",
    image: "/images/cars/nissan-x-trail-x-trail-2012-1.webp",
    body: \`Dans les Pyrénées-Orientales, la question n'est pas « faut-il un 4x4 ? ».

## Trois usages

**La montagne l'hiver.** Texte.\`,
    faq: [{ question: "Faut-il un vrai 4x4 ?", answer: "Non, un SUV suffit souvent." }],
  },
];
`;

const site = { key: 'voitures', name: 'Ideo Car', projectPath: '/nope' } as SiteConfig;
const routes = new Set(['petit-prix', 'vehicules', 'vehicules/audi-a3-2015']);

const page: SeoPageRow = {
  site_key: 'voitures',
  page_type: 'article',
  slug: 'conseils/voiture-electrique-occasion-perpignan',
  h1: 'Voiture électrique d’occasion à Perpignan : laquelle choisir ?',
  meta_title: 'Voiture électrique d’occasion à Perpignan : le guide | Ideo Car',
  meta_description: 'Autonomie réelle, recharge, prix : ce qu’il faut vérifier avant d’acheter.',
  content: {
    intro: 'Une électrique d’occasion se juge sur sa batterie.',
    seoSections: [
      {
        title: 'Vérifier la batterie',
        content: 'Demandez le rapport SOH.\n\n### En pratique\n\n- Prise en main\n- Essai',
      },
      {
        title: '## Où les voir',
        content:
          'Nos [petits prix](/petit-prix) et une [Audi](/vehicules/audi-a3-2015), pas la [page ville](/voitures-pia).',
      },
    ],
    faq: [
      { question: 'Quelle autonomie ?', answer: 'Comptez 200 km.' },
      { question: '', answer: 'vide' },
    ],
    article: { categorie: 'petit-prix', image: '/images/cars/peugeot-e-2008-2022-1.webp' },
  },
};

describe('parseArticlesFile', () => {
  it('évalue le fichier réel, corps en gabarit de chaîne compris', () => {
    const list = parseArticlesFile(FIXTURE);
    expect(list).toHaveLength(1);
    expect(list[0].body).toContain('## Trois usages');
    expect(list[0].faq?.[0].question).toBe('Faut-il un vrai 4x4 ?');
  });
});

describe('assembleBody + liens', () => {
  it('assemble intro et sections sous ## sans doubler les dièses', () => {
    const body = assembleBody(page.content);
    expect(body.startsWith('Une électrique')).toBe(true);
    expect(body).toContain('\n\n## Vérifier la batterie\n\nDemandez');
    expect(body).toContain('\n\n## Où les voir\n\n');
    expect(body).not.toContain('## ## ');
  });

  it('retire les liens vers une route inexistante, garde les autres', () => {
    const body = filtrerLiensMarkdown(assembleBody(page.content), routes, 'test');
    expect(body).toContain('[petits prix](/petit-prix)');
    expect(body).toContain('[Audi](/vehicules/audi-a3-2015)');
    expect(body).toContain('pas la page ville.');
    expect(body).not.toContain('/voitures-pia');
  });
});

describe('buildArticleEntry', () => {
  it('prend le H1 comme titre, le title sans le suffixe du site, la catégorie et l’image de l’éditeur', () => {
    const e = buildArticleEntry(page, site, routes, undefined, '2026-09-04');
    expect(e.slug).toBe('voiture-electrique-occasion-perpignan');
    expect(e.title).toBe(page.h1);
    expect(e.metaTitle).toBe('Voiture électrique d’occasion à Perpignan : le guide');
    expect(e.datePublication).toBe('2026-09-04');
    expect(e.dateMaj).toBeUndefined();
    expect(e.categorie).toBe('petit-prix');
    expect(e.image).toBe('/images/cars/peugeot-e-2008-2022-1.webp');
    expect(e.faq).toEqual([{ question: 'Quelle autonomie ?', answer: 'Comptez 200 km.' }]);
  });

  it('retombe sur standard sans catégorie et pose dateMaj sur une mise à jour', () => {
    const p2 = { ...page, content: { ...page.content, article: undefined } };
    const e = buildArticleEntry(p2, site, routes, { datePublication: '2026-01-10' } as never, '2026-09-04');
    expect(e.categorie).toBe('standard');
    expect(e.datePublication).toBe('2026-01-10');
    expect(e.dateMaj).toBe('2026-09-04');
  });
});

describe('upsertArticle', () => {
  it('ajoute un article et le fichier reste évaluable, l’existant intact', () => {
    const e = buildArticleEntry(page, site, routes, undefined, '2026-09-04');
    const next = upsertArticle(FIXTURE, e);
    const list = parseArticlesFile(next);
    expect(list.map((a) => a.slug)).toEqual([
      'quel-4x4-occasion-montagne-plage',
      'voiture-electrique-occasion-perpignan',
    ]);
    expect(list[1].body).toContain('## Vérifier la batterie');
    expect(list[0]).toEqual(parseArticlesFile(FIXTURE)[0]);
  });

  it('remplace le bloc de même slug au lieu de doubler', () => {
    const existing = parseArticlesFile(FIXTURE)[0];
    const p2 = { ...page, slug: 'conseils/quel-4x4-occasion-montagne-plage' };
    const e = buildArticleEntry(p2, site, routes, existing, '2026-09-04');
    const list = parseArticlesFile(upsertArticle(FIXTURE, e));
    expect(list).toHaveLength(1);
    expect(list[0].dateMaj).toBe('2026-09-04');
    expect(list[0].datePublication).toBe('2026-09-03');
  });
});
