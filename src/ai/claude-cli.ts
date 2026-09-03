import { execFile } from 'child_process';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { childEnvForClaudeCli } from '../config/env.js';

/**
 * Rédaction IA via le Claude CLI local (forfait Max) — même mécanisme que
 * `src/lib/claude-cli.ts` du dashboard, porté ici pour le bot Telegram.
 *
 * Le CLI est invoqué en **générateur de texte**, jamais en agent : `claude -p`
 * lancé nu démarre un agent de code complet (CLAUDE.md du répertoire courant,
 * outils, raisonnement « projet ») et peut rendre « Execution error » à la
 * place du texte attendu. Trois verrous, donc :
 *  · `--system-prompt` remplace l'agent de code par un rédacteur,
 *  · `--disallowedTools` lui retire tout moyen d'agir,
 *  · `--setting-sources ""` + un répertoire vide l'empêchent de charger le
 *    CLAUDE.md et les réglages d'un projet.
 *
 * Une seule exécution à la fois : le CLI est partagé avec le dashboard et les
 * sessions du user, deux vendeurs qui ajoutent en même temps attendent leur tour.
 */

const CLAUDE_BIN = '/home/ubuntu/.local/bin/claude';

const SYSTEM_REDACTEUR =
  'Tu es un rédacteur francophone. Tu produis exactement le format demandé, ' +
  'sans commentaire ni préambule. Tu n’exécutes aucune action, tu ne poses aucune ' +
  'question : tu rends le contenu, un point c’est tout.';

const OUTILS_INTERDITS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'NotebookEdit',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'Task',
  'TodoWrite',
];

let sandbox: string | null = null;
function getSandbox(): string {
  if (!sandbox) {
    sandbox = join(tmpdir(), 'seo-automation-cli');
    mkdirSync(sandbox, { recursive: true });
  }
  return sandbox;
}

function runOnce(prompt: string, opts: { system?: string; timeoutMs?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    // La clé API (épuisée) présente dans l'env prendrait le pas sur le login
    // claude.ai du forfait Max — on la retire pour le sous-processus.
    const env = childEnvForClaudeCli();

    const child = execFile(
      CLAUDE_BIN,
      [
        '-p',
        '--model',
        'opus',
        '--output-format',
        'text',
        '--system-prompt',
        opts.system || SYSTEM_REDACTEUR,
        '--setting-sources',
        '',
        '--disallowedTools',
        ...OUTILS_INTERDITS,
      ],
      {
        cwd: getSandbox(),
        timeout: opts.timeoutMs ?? 120_000,
        maxBuffer: 10 * 1024 * 1024,
        env,
      },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`Claude CLI: ${err.message}${stderr ? ` — ${stderr.slice(0, 300)}` : ''}`));
          return;
        }
        const texte = stdout.trim();
        if (!texte || /^execution error$/i.test(texte)) {
          reject(new Error('Claude CLI: aucun contenu produit (« Execution error » ou sortie vide)'));
          return;
        }
        resolve(texte);
      },
    );
    child.stdin?.write(prompt);
    child.stdin?.end();
  });
}

let queue: Promise<unknown> = Promise.resolve();

/** Exécute le CLI en file d'attente (une exécution à la fois) et rend le texte produit. */
export function runClaudeCli(
  prompt: string,
  opts: { system?: string; timeoutMs?: number } = {},
): Promise<string> {
  const next = queue.then(() => runOnce(prompt, opts));
  queue = next.catch(() => undefined);
  return next;
}
