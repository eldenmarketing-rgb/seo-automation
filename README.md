# seo-automation

Outil de pilotage SEO d'un réseau de sites locaux (Pyrénées-Orientales) : il **mesure** (Search
Console, crawl, indexation), **décide** (backlog d'actions dans le dashboard) et **n'exécute que
via le CMS** — jamais de génération ni de publication sans validation humaine.

Ce dépôt contient les **jobs**, le **crawler**, le **bot Telegram** (`/voiture`, `/produit`) et les
**scripts** appelés par le dashboard. L'interface est dans `../seo-dashboard` (Next.js, même base
Supabase). La mémoire de projet est `CLAUDE.md` ; l'architecture est décrite dans
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), les conventions dans
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Installation

```bash
node --version            # ≥ 22 (ESM, top-level await)
npm ci                    # installe aussi les hooks git (husky)
cp .env.example .env      # puis renseigner — .env n'entre jamais dans git
# config/gsc-service-account.json : clé du service account GSC (ignorée par git)
npm run status            # vérifie env, sites actifs, hooks, crons
```

Toutes les variables lues sont déclarées dans `src/config/env.ts` (obligatoire / optionnelle /
défaut). Une variable obligatoire absente lève une erreur claire à la première lecture.

## Scripts

| Commande                | Rôle                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `npm run bot`           | Bot Telegram (pm2 `seo-bot` en prod)                                  |
| `npm run crawl`         | Crawl + funnel d'indexation — simulation ; `-- --apply` écrit en base |
| `npm run gsc-sync`      | Search Console → `gsc_positions` (`-- --site=vtc`, `-- --backfill`)   |
| `npm run audit`         | Audit GSC hebdomadaire                                                |
| `npm run cluster`       | Clustering des mots-clés découverts                                   |
| `npm run status`        | État du système (env, sites, hooks, crons), aucune écriture           |
| `npm run setup-db`      | Vérification du schéma Supabase                                       |
| `npm run test-telegram` | Test des notifications                                                |
| `npm run check`         | **typecheck + lint + format + tests + knip** — ce que CI exige        |

Scripts appelés par le dashboard (par chemin, ne pas renommer) : `scripts/publish-pages.ts`,
`scripts/serp-analyze.ts`, `src/jobs/gsc-sync.ts`. Crons : `bash scripts/setup-crons.sh`.

## Structure

```
config/     registre des sites (lu depuis site_profiles), villes, modes
scripts/    outils maintenus (11) — scripts/oneshot/ = analyses jetables, hors outillage
src/
  bot/        Grammy — commandes listées dans bot/commands/index.ts
  config/     env.ts : seul lecteur de process.env
  crawler/    faits par URL + funnel d'indexation (tests dans *.test.ts)
  db/         accès Supabase par domaine (client, pages, gsc, logs, optimization) + migrations SQL
  deployers/  Vercel, injection dans les sites, Indexing API
  gsc/        Search Console : auth, client, inspection d'URL, positions, analyse
  jobs/       gsc-sync (quotidien), weekly-gsc-audit, weekly-clustering
  keywords/   DataForSEO + classification d'intention
  serp/       analyse concurrentielle (bridge pour le dashboard)
docs/       ARCHITECTURE, CONTRIBUTING, MAINTENABILITE, invariants SEO
```

## Qualité

`npm run check` doit être vert avant de pousser : le hook **pre-commit** formate et lint les
fichiers stagés et refuse tout secret ; le **pre-push** lance typecheck + tests ; la CI GitHub
rejoue le tout. Détail dans [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
