/**
 * robots.txt — lecture minimale mais honnête.
 *
 * On ne cherche pas à réimplémenter le parseur de Google : on cherche à
 * répondre à une seule question, « cette URL est-elle interdite au crawl ? »,
 * en appliquant les deux règles qui comptent — le groupe le plus spécifique
 * (Googlebot avant *) et le motif le plus long l'emporte.
 */
import { fetchText } from './fetch.js';

interface Rule {
  allow: boolean;
  pattern: string;
}

export interface Robots {
  fetched: boolean;
  rules: Rule[];
  sitemaps: string[];
}

function parse(body: string): { groups: Map<string, Rule[]>; sitemaps: string[] } {
  const groups = new Map<string, Rule[]>();
  const sitemaps: string[] = [];
  let agents: string[] = [];
  let expectingAgents = true;

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'sitemap') {
      sitemaps.push(value);
      continue;
    }

    if (field === 'user-agent') {
      // Plusieurs User-agent d'affilée = un seul groupe partagé.
      if (!expectingAgents) {
        agents = [];
        expectingAgents = true;
      }
      agents.push(value.toLowerCase());
      continue;
    }

    if (field === 'allow' || field === 'disallow') {
      expectingAgents = false;
      for (const agent of agents) {
        const rules = groups.get(agent) || [];
        // « Disallow: » vide autorise tout : ce n'est pas une règle.
        if (value) rules.push({ allow: field === 'allow', pattern: value });
        groups.set(agent, rules);
      }
    }
  }

  return { groups, sitemaps };
}

/** Traduit un motif robots (`*`, `$`) en expression régulière ancrée au début. */
function toRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + (anchored ? '$' : ''));
}

export async function loadRobots(origin: string): Promise<Robots> {
  const { status, body } = await fetchText(`${origin}/robots.txt`);
  if (status !== 200) return { fetched: false, rules: [], sitemaps: [] };

  const { groups, sitemaps } = parse(body);
  // Le groupe Googlebot prime sur le générique : c'est lui qui décide de
  // l'indexation, et c'est la seule opinion qui nous intéresse.
  const rules = groups.get('googlebot') ?? groups.get('*') ?? [];
  return { fetched: true, rules, sitemaps };
}

/** Motif le plus long gagnant ; à égalité, Allow gagne (règle Google). */
export function isAllowed(robots: Robots, pathname: string): boolean {
  if (!robots.fetched || robots.rules.length === 0) return true;

  let best: Rule | null = null;
  for (const rule of robots.rules) {
    if (!toRegex(rule.pattern).test(pathname)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule;
    }
  }

  return best ? best.allow : true;
}
