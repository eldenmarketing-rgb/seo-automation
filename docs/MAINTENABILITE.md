# Maintenabilité — audit et plan (2026-08-28)

> Périmètre : dépôt `seo-automation` (jobs, crawler, bot Telegram, scripts) et, en second rideau,
> `seo-dashboard`. Ce document est le point d'entrée pour comprendre **pourquoi** le dépôt est
> organisé comme il l'est et **quelles règles** le maintiennent propre. Les conventions au
> quotidien sont dans [CONTRIBUTING.md](./CONTRIBUTING.md), l'architecture dans
> [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Constat du 2026-08-28 (avant travaux)

Chiffres mesurés, pas estimés.

| Mesure | Valeur | Conséquence |
|---|---|---|
| `npx tsc --noEmit` | **27 erreurs** (5 fichiers) | Personne ne lance le typage : une régression passe inaperçue |
| Tests | **0** | Toute modification se vérifie à la main, en prod |
| Lint / formatage | **aucun** | Style hétérogène, `any` (29), variables mortes invisibles |
| Hooks git / CI | **aucun** | Un secret ou un fichier cassé peut être commité et poussé |
| Fichiers appelant `dotenv.config()` | **78** | Chargement d'env dispersé, impossible de valider les variables |
| Lectures `process.env.*` | **51 endroits**, 20 variables | Aucun inventaire ; `.env.example` en liste 13 |
| `src/db/supabase.ts` | **808 lignes**, 55 exports, 12 domaines | Module fourre-tout : pages, GSC, véhicules, menu, blog, clusters… |
| Code mort dans `src/` | **≈ 3 500 lignes** | Générateur v1 + 6 templates, `image-generator`, `quality-validator`, `weekly-report`, `internal-links`, `city-service-matrix`, jobs IA désactivés |
| `universal-upgrade/` | copie **périmée** de 14 fichiers de `src/` | Deux versions du même code, une seule vraie |
| Scripts | **≈ 100** fichiers, **7** référencés (crons, dashboard, CLAUDE.md), 40 non versionnés | Impossible de savoir ce qui est un outil et ce qui est une analyse jetable |
| Commandes bot enregistrées | 19, dont 8 pilotent la génération IA (désactivée, contraire au human-in-the-loop) | Le bot tire tout le pipeline de génération alors qu'il ne sert qu'à `/voiture` et `/produit` |
| Dashboard | 2 erreurs `tsc`, 11 erreurs ESLint, 0 test, 0 hook | Même dérive, plus lente |

Ce qui est **bon** et qu'on garde tel quel : l'organisation par domaine de `src/` (`crawler/`, `gsc/`,
`keywords/`, `deployers/`, `jobs/`), les commentaires d'intention en tête de fichier, le registre unique
`site_profiles`, `CLAUDE.md` comme mémoire de projet, le crawler (types stricts, aucune dette).

### Points d'ancrage à ne pas casser

Le dashboard et les crons exécutent ces fichiers **par chemin** ; ils ne bougent pas :

- `src/jobs/gsc-sync.ts` (cron 6h30 + bouton « Synchroniser » du dashboard)
- `scripts/crawl.ts` (cron lundi 6h45)
- `src/jobs/weekly-gsc-audit.ts` (cron lundi 8h), `src/jobs/weekly-clustering.ts` (cron dimanche 22h)
- `scripts/publish-pages.ts` (dashboard `lib/publish.ts`), `scripts/serp-analyze.ts` (dashboard `/api/briefs/generate`)
- `src/bot/index.ts` (pm2 `seo-bot`)

---

## 2. Références suivies

- [Node.js Best Practices (goldbergyoni)](https://github.com/goldbergyoni/nodebestpractices) — structure par composant métier,
  config centralisée et validée, erreurs typées, lint + hooks, tests sur le code pur.
- [typescript-eslint — flat config](https://typescript-eslint.io/getting-started) et
  [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files).
- [knip](https://knip.dev) — détection de fichiers, exports et dépendances inutilisés.
- [Vitest](https://vitest.dev) — tests unitaires ESM/TS sans transpilation.
- [husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) — hooks git.
- [Hooks Claude Code](https://code.claude.com/docs/en/hooks) — garde-fous côté agent (`.claude/settings.json`).
- [Conventional Commits](https://www.conventionalcommits.org/) — déjà pratiqué dans l'historique (`feat(...)`, `fix(...)`).

---

## 3. Plan

Ordre : **d'abord le filet, ensuite le ménage, enfin la structure** — chaque phase est vérifiable
avant la suivante et commitée séparément.

### Phase 1 — Filet de sécurité (outillage)
- [x] `tsconfig.json` : `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, exclusion des scripts jetables.
- [x] ESLint 9 (flat) + typescript-eslint `recommended` + prettier (`eslint-config-prettier`).
- [x] Prettier (config unique, partagée avec le dashboard).
- [x] Vitest + premiers tests sur le code pur (crawler `funnel`/`issues`/`scope`/`types`, `utils/slug`, `intent-classifier`, `gsc-sync` découpage mensuel).
- [x] knip (fichiers/exports/dépendances morts) avec les points d'entrée déclarés (crons, dashboard, bot, scripts).
- [x] Scripts npm normalisés : `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test`, `knip`, `check` (= tout).
- [x] Hooks git (husky + lint-staged) : **pre-commit** = eslint --fix + prettier sur les fichiers stagés + refus des secrets ; **pre-push** = `typecheck` + `test`.
- [x] Hooks Claude Code (`.claude/settings.json`, versionné) : après chaque `Edit`/`Write` d'un `.ts`, lint + format du fichier ; avant un `git commit`/`git add`, refus si un secret est stagé ; refus de `git push --force` sur master.
- [x] CI GitHub Actions : `npm ci` → `check` sur push et PR.

### Phase 2 — Ménage (suppression, pas de déplacement)
- [x] Supprimer `universal-upgrade/`, `files.zip`, `logs/`, `tasks/`, `PROGRESS.md`, `run_phase0.sh`, `.claude/RESUME.md`.
- [x] Supprimer le code mort de `src/` : générateur v1 + `templates/`, `city-service-matrix`, `internal-links`, `image-generator`, `quality-validator`, `weekly-report`, `keywords/research.ts` (v1), jobs IA désactivés (`daily-generate`, `monthly-optimize`, `generate-approved`) et leurs dépendances exclusives.
- [x] Bot : ne garder que les commandes utiles sans IA (`help`, `voiture`, `produit`, `status`, `monitor`, `deploy`, `ping`, `index`, `seo`, `phone`) ; retirer `generate`, `approve`, `blog`, `edit`, `enrichir`, `ctr`, `keywords`, `claude`.
- [x] `config/*.legacy.ts` : lus uniquement par `seed-site-registry.ts` (A1 terminé, base seedée) → supprimer les deux.
- [x] Scripts : `scripts/` ne contient que les outils maintenus et référencés ; tout le reste (analyses par site, tests manuels, migrations one-shot) part dans `scripts/oneshot/`, **hors** tsc/eslint/knip, avec un README qui dit « jetable, non maintenu ».
- [x] `.gitignore` : `reports/` (sorties d'analyse), `.claude/RESUME.md`, `*.tsbuildinfo`.
- [x] Corriger les erreurs `tsc` restantes.

### Phase 3 — Structure
- [x] `src/config/env.ts` : **un seul** `dotenv.config()`, variables typées et validées au démarrage (`requireEnv`/`optionalEnv`), plus aucun `process.env.X` ailleurs que là (exception documentée : les hooks Vercel et chats Telegram nommés par site).
- [x] `src/db/` découpé par domaine (`client.ts`, `pages.ts`, `gsc.ts`, `logs.ts`, `bot-settings.ts`, `images.ts`, `blog.ts`, `vehicles.ts`, `menu.ts`, `pending-pages.ts`, `keywords.ts`, `clusters.ts`) ; `src/db/supabase.ts` devient un baril de ré-export → **aucun import à toucher**.
- [x] `src/bot/commands/index.ts` : liste des commandes en un seul endroit, `ADMIN_ONLY_COMMANDS` dérivée de cette liste.
- [x] Logger : niveau `debug` + variable `LOG_LEVEL`.

### Phase 4 — Formatage
- [ ] Un commit Prettier sur tout le dépôt, référencé dans `.git-blame-ignore-revs` (blame propre).

### Phase 5 — Documentation
- [x] `README.md` (installation, variables, scripts, structure, workflow qualité) — il n'y en avait pas.
- [x] `docs/ARCHITECTURE.md` (flux de données bout en bout, tables, points d'entrée).
- [x] `docs/CONTRIBUTING.md` (conventions, hooks, comment ajouter un job / un script / une commande bot / une migration).
- [x] `.env.example` complet (20 variables réellement lues).
- [x] `CLAUDE.md` mis à jour (scripts, structure, commandes bot).

### Phase 6 — Dashboard (même filet, plus léger)
- [ ] Corriger `tsc` (2) et ESLint (11).
- [ ] `typecheck`/`check` npm, husky + lint-staged, hooks Claude Code, CI.

### Vérification finale
- `npm run check` vert (typecheck + lint + format + tests + knip).
- `pm2 restart seo-bot` → `/help` répond ; crons pointent sur des fichiers existants ; `npm run crawl` (simulation) passe ; `gsc-sync --site=vtc` passe.

---

## 4. Journal d'exécution

**2026-08-28, après-midi** — Phases 1 à 3 exécutées dans une même session : outillage posé
(tsconfig strict, ESLint 9 flat, Prettier, Vitest, knip, husky + lint-staged, hooks Claude Code,
CI), ménage (`universal-upgrade/`, générateur v1, jobs IA, 8 commandes bot, `config/*.legacy.ts`,
≈ 80 scripts déplacés dans `scripts/oneshot/`), `src/config/env.ts` (1 seul `dotenv.config()`,
0 `process.env` ailleurs), `src/db/` découpé, `bot/commands/index.ts`. **La session a été coupée
à 16:41** pendant une transformation en masse : 11 fichiers vidés (`permissions.ts` réduit à un
import, `crawler/types.ts`, `sites/registry.ts`, `gsc/client.ts`, `gsc/inspect.ts`,
`gsc/positions.ts`, `deployers/indexing.ts`, `deployers/vercel-deploy.ts`,
`keywords/intent-classifier.ts`, `keywords/dataforseo.ts`, `dataforseo/cache.ts`), rien de commité.

**2026-08-28, soir** — Reprise : les 11 fichiers restaurés depuis HEAD puis repassés par la
transformation env.ts ; `google-auth-library` aligné sur la version embarquée par `googleapis`
(^9.15 — la ^11 cassait les types `GoogleAuth`) ; `sharp` et `pg` retirés ; test du funnel
corrigé (la ligne « saine » par défaut est déjà maillée, chaque marche nie explicitement la
suivante) ; `LOG_LEVEL` + `logger.debug` ; Prettier passé sur tout le dépôt ; README,
ARCHITECTURE, CONTRIBUTING, `.env.example` (variables réellement lues), `CLAUDE.md`
(scripts, structure, bot, dépendances), `scripts/oneshot/README.md`.

Vérification finale : `npm run check` vert (tsc 0 erreur, ESLint 0 erreur / 23 `any` signalés,
Prettier OK, 6 tests, knip 0 erreur / 21 exports inutilisés en avertissement) ; import de chaque
module d'entrée OK ; `npm run status` OK ; `gsc-sync --site=vtc` 644 lignes en 2 s ; `crawl
--site=vtc` 42 URL en simulation ; `publish-pages` et `serp-analyze` répondent ; `seo-bot`
redémarré sous pm2.

**Reste** : Phase 4 (commit Prettier isolé + `.git-blame-ignore-revs`, à faire au moment du commit),
Phase 6 (dashboard : 2 erreurs tsc, 11 ESLint, même filet). Les 21 exports inutilisés
(`dataforseo.ts`, `intent-classifier.ts`, `registry.ts`…) sont du code hérité à élaguer au fil
de l'eau, pas un blocage.
