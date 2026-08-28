# Conventions — seo-automation

## Le filet

| Étape        | Ce qui tourne                                                 | Où                                                  |
| ------------ | ------------------------------------------------------------- | --------------------------------------------------- |
| à l'édition  | Prettier + ESLint --fix sur le fichier (hook Claude Code)     | `.claude/hooks/post-edit-lint.sh`                   |
| `git commit` | refus des secrets, puis lint-staged (eslint --fix + prettier) | `.husky/pre-commit`, `scripts/dev/check-secrets.sh` |
| `git push`   | `typecheck` + `test`                                          | `.husky/pre-push`                                   |
| GitHub       | `npm ci` → typecheck, lint, format:check, test, knip          | `.github/workflows/ci.yml`                          |

`npm run check` = la même chose en local. Un `--no-verify` se fait en connaissance de cause et
la CI rattrape.

Règles ESLint qui bloquent : variable morte (préfixer `_` si volontaire), `process.env` hors
`src/config/env.ts`, promesse dans un exécuteur async, `var`, `==` non strict. `any` est
seulement signalé (code hérité).

## Ajouter…

**une variable d'environnement** — une ligne dans `SPEC` (`src/config/env.ts`) avec `required`,
`default`, `doc` ; un getter dans `env` ; une ligne dans `.env.example`. Lecture : `env.X`,
`requireEnv('X')` à un point d'entrée qui l'exige, `readEnvByName()` seulement pour un nom porté
par `site_profiles`.

**un job** — `src/jobs/<nom>.ts`, en-tête qui dit ce qu'il écrit et quand il tourne, `log()`
dans `automation_logs` avec `trigger`, ligne dans `scripts/setup-crons.sh`, script npm, ligne
dans le tableau de `docs/ARCHITECTURE.md` et dans `CLAUDE.md` (Jobs Cron).

**un script** — maintenu ⇒ `scripts/<nom>.ts` (typé, linté, listé dans knip par défaut) ;
jetable ⇒ `scripts/oneshot/` (hors outillage, non maintenu). Un script appelé par le dashboard
ou un cron est un **point d'ancrage** : on ne le renomme pas.

**une commande bot** — un fichier `src/bot/commands/<nom>.ts` qui exporte `register<Nom>Command`,
une entrée dans `BOT_COMMANDS` (`commands/index.ts`) avec `access: 'admin' | 'group'`. Rien
d'autre : `/help` et les permissions en découlent.

**une migration** — `src/db/migration-<sujet>.sql` idempotente (`IF NOT EXISTS`, `DROP … IF
EXISTS` avant `ADD CONSTRAINT`), jouée par `npx tsx scripts/run-migration.ts <fichier>`, puis
`CLAUDE.md` (tableau des tables).

**un accès base** — dans le module du domaine (`src/db/pages.ts`, `gsc.ts`…) ou au plus près
de l'appelant ; jamais un nouveau fourre-tout.

**un test** — `*.test.ts` à côté du code, Vitest, sur du code **pur** (funnel, issues, scope,
découpage de dates). Pas de test qui appelle Supabase ou Google.

## Commits

Conventional Commits, en français, sujet = l'effet pour l'utilisateur, corps = le pourquoi :
`feat(crawl): …`, `fix(publication): …`, `chore(maintenabilite): …`, `docs: …`. Jamais de
force-push sur `master` (refusé par le hook Claude Code).

## Ce qu'on ne fait pas

- Publier ou générer sans validation humaine (`CLAUDE.md` > Workflow).
- Décrire un site en dur : tout passe par `site_profiles`.
- Laisser un secret approcher git : `.env`, `config/gsc-service-account.json` sont refusés au
  commit et le diff est scanné (clés Anthropic, JWT Supabase, tokens Telegram, clés privées).
