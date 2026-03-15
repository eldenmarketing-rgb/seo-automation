/** Génère un slug SEO-friendly à partir d'un texte */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Génère le slug d'une page ville+service */
export function cityServiceSlug(service: string, city: string): string {
  return `${slugify(service)}-${slugify(city)}`;
}

/** Génère le slug d'une page ville seule */
export function citySlug(prefix: string, city: string): string {
  return `${prefix}-${slugify(city)}`;
}
