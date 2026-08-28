import { describe, expect, it } from 'vitest';
import { computeFunnelStage, gscStage } from './funnel.js';
import { makeRow } from './test-helpers.js';

describe('computeFunnelStage', () => {
  it('sort du funnel les URL hors périmètre, redirigées et brouillons', () => {
    expect(computeFunnelStage(makeRow({ expected_state: 'out_of_scope' }))).toBe('OUT_OF_SCOPE');
    expect(
      computeFunnelStage(
        makeRow({ expected_state: 'redirected', redirect_chain: [{ url: 'x', status: 301 }] }),
      ),
    ).toBe('REDIRECTED');
    expect(computeFunnelStage(makeRow({ expected_state: 'redirected', http_status: 200 }))).toBe(
      'STILL_LIVE',
    );
    expect(computeFunnelStage(makeRow({ expected_state: 'redirected', http_status: 404 }))).toBe('GONE');
    expect(computeFunnelStage(makeRow({ expected_state: 'draft', http_status: 200 }))).toBe(
      'LIVE_UNEXPECTED',
    );
    expect(computeFunnelStage(makeRow({ expected_state: 'draft', http_status: 404 }))).toBe('NOT_DEPLOYED');
  });

  it('avance marche par marche sur les faits déterministes', () => {
    expect(computeFunnelStage(makeRow({ http_status: 500 }))).toBe('DEPLOYED');
    expect(computeFunnelStage(makeRow({ http_status: 200, indexable: false }))).toBe('HTTP_200');
    expect(computeFunnelStage(makeRow({ http_status: 200, indexable: true, in_sitemap: false }))).toBe(
      'INDEXABLE',
    );
    expect(
      computeFunnelStage(
        makeRow({ http_status: 200, indexable: true, in_sitemap: true, links_in: 0, click_depth: null }),
      ),
    ).toBe('IN_SITEMAP');
    expect(
      computeFunnelStage(makeRow({ http_status: 200, indexable: true, in_sitemap: true, links_in: 3 })),
    ).toBe('INTERNALLY_LINKED');
  });

  it('une preuve Google dépasse la chaîne déterministe, mais jamais en arrière', () => {
    // Indexée mais absente du sitemap : indexée, point (le sitemap est une anomalie, pas un démenti)
    expect(
      computeFunnelStage(
        makeRow({ http_status: 200, indexable: true, in_sitemap: false, gsc_verdict: 'PASS' }),
      ),
    ).toBe('INDEXED');
    // Google ne la connaît pas : on reste sur les faits
    expect(
      computeFunnelStage(
        makeRow({
          http_status: 200,
          indexable: true,
          in_sitemap: true,
          links_in: 0,
          click_depth: null,
          gsc_coverage_state: 'URL is unknown to Google',
        }),
      ),
    ).toBe('IN_SITEMAP');
  });

  it('des impressions prouvent l’indexation même sans inspection', () => {
    expect(computeFunnelStage(makeRow({ http_status: 200, impressions28: 12 }))).toBe(
      'RECEIVING_IMPRESSIONS',
    );
  });
});

describe('gscStage', () => {
  it('rend null quand Google n’a rien dit (quota, propriété non partagée)', () => {
    expect(gscStage(makeRow())).toBeNull();
  });

  it('traduit les états de couverture', () => {
    expect(gscStage(makeRow({ gsc_coverage_state: 'Submitted and indexed' }))).toBe('INDEXED');
    expect(gscStage(makeRow({ gsc_coverage_state: 'URL is unknown to Google' }))).toBe('NONE');
    expect(gscStage(makeRow({ gsc_coverage_state: 'Crawled - currently not indexed' }))).toBe('CRAWLED');
    expect(gscStage(makeRow({ gsc_coverage_state: 'Discovered - currently not indexed' }))).toBe(
      'DISCOVERED',
    );
    expect(gscStage(makeRow({ gsc_verdict: 'NEUTRAL', gsc_coverage_state: 'Excluded by noindex' }))).toBe(
      'DISCOVERED',
    );
  });
});
