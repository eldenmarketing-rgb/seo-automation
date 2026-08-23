/**
 * Récupération d'une URL, chaîne de redirection comprise.
 *
 * `redirect: 'manual'` et non `'follow'` : la chaîne EST une donnée. Une page
 * supprimée doit répondre 301 vers une cible en 200 — savoir qu'on est arrivé
 * quelque part ne suffit pas, il faut savoir par où.
 */

export interface Hop {
  url: string;
  status: number;
}

export interface FetchResult {
  /** Statut de la réponse finale (0 = injoignable). */
  status: number;
  finalUrl: string;
  chain: Hop[];
  html: string;
  headers: Record<string, string>;
  ms: number;
  error?: string;
}

const UA = 'seo-automation/crawler (+https://github.com/eldenmarketing-rgb/seo-automation)';
const MAX_HOPS = 5;
const TIMEOUT_MS = 20_000;

export async function fetchUrl(url: string): Promise<FetchResult> {
  const started = Date.now();
  const chain: Hop[] = [];
  const seen = new Set<string>();
  let current = url;

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (seen.has(current)) {
      return {
        status: 0,
        finalUrl: current,
        chain,
        html: '',
        headers: {},
        ms: Date.now() - started,
        error: 'boucle de redirection',
      };
    }
    seen.add(current);

    let res: Response;
    try {
      res = await fetch(current, {
        redirect: 'manual',
        headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e: any) {
      return {
        status: 0,
        finalUrl: current,
        chain,
        html: '',
        headers: {},
        ms: Date.now() - started,
        error: e?.name === 'TimeoutError' ? 'timeout' : String(e?.message || e),
      };
    }

    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));

    const location = headers['location'];
    if (res.status >= 300 && res.status < 400 && location) {
      chain.push({ url: current, status: res.status });
      current = new URL(location, current).toString();
      continue;
    }

    return {
      status: res.status,
      finalUrl: current,
      chain,
      html: res.ok ? await res.text() : '',
      headers,
      ms: Date.now() - started,
    };
  }

  return {
    status: 0,
    finalUrl: current,
    chain,
    html: '',
    headers: {},
    ms: Date.now() - started,
    error: `plus de ${MAX_HOPS} redirections`,
  };
}

/** Récupération texte simple (robots.txt, sitemaps). */
export async function fetchText(url: string): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { status: res.status, body: res.ok ? await res.text() : '' };
  } catch {
    return { status: 0, body: '' };
  }
}
