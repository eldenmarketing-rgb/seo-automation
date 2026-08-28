# Architecture — seo-automation

> Ce que fait chaque pièce, d'où viennent les données, où elles vont. Pour le _pourquoi_ des
> choix produit, lire `CLAUDE.md` ; pour les règles de code, `CONTRIBUTING.md`.

## 1. Vue d'ensemble

```
                 ┌──────────────┐   sync quotidien    ┌──────────────────┐
 Search Console ─┤ jobs/gsc-sync├────────────────────►│ gsc_positions    │
                 └──────────────┘                     │ gsc_page_daily   │
                                                      └────────┬─────────┘
 Sites en ligne ─┐  crawl lundi                                │ lecture
 (HTTP, sitemap) ├─► scripts/crawl.ts ─► src/crawler ─► crawl_results (v_crawl_latest)
                 │                              └─► crawl_site_checks (robots.txt, sitemap)
 GSC Inspection ─┘                                             │
                                                               ▼
                                              seo-dashboard (Next.js, même Supabase)
                                              ├─ /indexation, /gsc : constater
                                              ├─ /backlog : décider (détecteurs → opportunities)
                                              └─ /pages : produire → publier (CMS)
                                                               │ exec par chemin
                                                               ▼
                                   scripts/publish-pages.ts · scripts/serp-analyze.ts
```

Trois principes structurent tout :

1. **`site_profiles` est la seule source de vérité** sur les sites (domaine, GSC, hooks, mode).
   `config/sites.ts` et `config/gsc-sites.ts` ne font que la charger (`src/sites/registry.ts`,
   top-level await). Aucun site n'est décrit en dur.
2. **L'outil mesure et décide, il n'exécute pas** — sauf le CMS. Aucune génération ni
   publication automatique : les crons collectent, le dashboard propose, l'humain valide.
3. **Une variable d'environnement se lit dans `src/config/env.ts`** et nulle part ailleurs
   (règle ESLint). Exception documentée : `readEnvByName()` pour les hooks Vercel et chats
   Telegram nommés par site dans `site_profiles`.

## 2. Points d'entrée (ne pas renommer : appelés par chemin)

| Entrée                          | Déclencheur                         | Écrit dans                                                    |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `src/jobs/gsc-sync.ts`          | cron 6h30 · bouton « Synchroniser » | `gsc_positions`, `gsc_page_daily`, `automation_logs`          |
| `scripts/crawl.ts --apply`      | cron lundi 6h45                     | `crawl_results`, `crawl_site_checks`, alignements `seo_pages` |
| `src/jobs/weekly-gsc-audit.ts`  | cron lundi 8h                       | `optimization_queue`, Telegram                                |
| `src/jobs/weekly-clustering.ts` | cron dimanche 22h                   | `keyword_clusters`                                            |
| `scripts/publish-pages.ts`      | dashboard `lib/publish.ts`          | sites (CMS) + `seo_pages`                                     |
| `scripts/serp-analyze.ts`       | dashboard `/api/briefs/generate`    | stdout JSON (cache DataForSEO)                                |
| `src/bot/index.ts`              | pm2 `seo-bot`                       | sites (`data/cars.ts`, `data/catalogue.ts`), git, Vercel      |

Le scan du backlog et la vérification des backlinks sont des routes du **dashboard**
(`POST /api/backlog/scan`, `/api/backlinks/verify`), appelées par cron via `curl`.

## 3. Modules

### `src/crawler/` — faits par URL

`index.ts` crawle un site (base ∪ sitemap ∪ liens internes), `fetch.ts` garde la chaîne de
redirection, `parse.ts`/`extract.ts` sortent les faits HTML (title, h1, canonical, robots, mots,
schema), `graph.ts` calcule liens entrants et profondeur de clic, `robots.ts` lit robots.txt,
`scope.ts` écarte les pages hors SEO. `funnel.ts` place chaque URL sur la marche la plus avancée
**prouvée** (`DEPLOYED → HTTP_200 → INDEXABLE → IN_SITEMAP → INTERNALLY_LINKED → DISCOVERED →
CRAWLED → INDEXED → RECEIVING_IMPRESSIONS`) et `issues.ts` nomme les anomalies selon
`expected_state`. Code pur, testé (`funnel.test.ts`). Les libellés sont dupliqués dans le
dashboard (`src/lib/indexation.ts`) — tenir les deux à jour.

### `src/gsc/` — Search Console

`auth.ts` (service account, scope `webmasters`), `client.ts` (requêtes/pages sur N jours),
`property.ts` (résolution `sc-domain:` vs URL-prefix), `inspect.ts` (API URL Inspection, capteur
du funnel), `positions.ts` + `analyzer.ts` (audit hebdo), `indexation.ts` (commande `/index`).

### `src/db/` — accès Supabase

Un module par domaine (`client.ts`, `pages.ts`, `gsc.ts`, `logs.ts`, `optimization.ts`) ;
`supabase.ts` est un baril de ré-export pour les imports existants. Les migrations SQL vivent
à côté (`migration-*.sql`, jouées par `scripts/run-migration.ts`). Les accès aux autres tables se
font au plus près du domaine (`crawler`, `sites`, `jobs`).

### `src/bot/` — Telegram (Grammy)

`commands/index.ts` est **le** registre : nom, usage, accès (`admin` | `group`), fonction
d'enregistrement. `index.ts` en déduit `ADMIN_ONLY_COMMANDS` ; `permissions.ts` mappe les
groupes clients à leur site (`TELEGRAM_GROUP_SITES`). Les commandes IA ont été retirées
(2026-08-28) : la gestion SEO est dans le dashboard.

### `src/deployers/`, `src/keywords/`, `src/serp/`, `src/dataforseo/`

Déploiement Vercel par hook, injection dans les fichiers `data/` des sites, Indexing API +
IndexNow ; client DataForSEO et classification d'intention (`scripts/backfill-intents.ts`) ;
analyse SERP concurrentielle ; cache DataForSEO en base (`dataforseo_cache`, une requête achetée
n'est jamais rachetée).

## 4. Tables (résumé — détail dans `CLAUDE.md` et `src/db/schema.sql`)

`site_profiles` (registre) · `seo_pages` (journal CMS + inventaire `external`) · `gsc_positions`
/ `gsc_page_daily` (historique GSC, jamais écrasé) · `crawl_results` → `v_crawl_latest` (dernier
passage) · `crawl_site_checks` → `v_crawl_site_checks_latest` (robots.txt + sitemap par site) · `opportunities` (backlog d'actions) · `seo_measurements` (baseline / J+7 / J+28 / J+60
/ J+90) · `automation_logs` (chaque job, chaque déclencheur) · `dataforseo_cache`.

## 5. Ce qui n'est plus là (et pourquoi)

Générateur v1 + templates, matrice ville×service, cocon, `image-generator`, `quality-validator`,
`weekly-report`, jobs `daily-generate`/`monthly-optimize`/`generate-approved`, commandes bot
`generate`/`approve`/`blog`/`edit`/`enrichir`/`ctr`/`keywords`/`claude` : tout appelait l'API
Anthropic en autonomie, à rebours du human-in-the-loop. Supprimés le 2026-08-28 (commit
`chore(maintenabilite)`), récupérables dans l'historique git si un morceau manque.
