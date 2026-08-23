/**
 * Périmètre SEO : les URL qui n'ont aucune raison d'être jugées.
 *
 * Mentions légales, CGV, page de remerciement… elles doivent exister, elles ne
 * doivent pas ranker. Les compter comme « non indexées » polluerait le
 * diagnostic et gaspillerait du quota d'inspection.
 *
 * Liste unique, partagée avec `scripts/import-inventaire.ts` : deux copies
 * finiraient par diverger.
 */
export const OUT_OF_SCOPE_SLUGS = [
  /^mentions-legales/,
  /^cgu$/,
  /^cgv$/,
  /^conditions/,
  /^politique/,
  /^confidentialite/,
  /^plan-du-site$/,
  /^merci$/,
  /^404$/,
];

export function isOutOfScope(slug: string): boolean {
  return OUT_OF_SCOPE_SLUGS.some((re) => re.test(slug));
}
