# CLAUDE.md — SEO Automation System
> Projet : Réseau multi-sites SEO local automatisé — Pyrénées-Orientales (66)
> Stack : Claude Code + Supabase + GitHub + Vercel + SEO Dashboard + Telegram bot (Grammy)
> VPS : OVH Ubuntu 24.04 — 4 vCores / 8 GB RAM
> GitHub : github.com/eldenmarketing-rgb/seo-automation
> Owner : Elden (@eldenmarketing-rgb)

---

## Contexte Projet

Système d'automatisation SEO pilotant un réseau de 6 sites Next.js locaux ciblant des niches artisans dans les Pyrénées-Orientales (66). Objectif : générer des leads qualifiés convertis exclusivement via appels téléphoniques. Les sites rankés seront loués à des artisans locaux (loyer fixe mensuel).

**Interface de gestion SEO :** SEO Dashboard (Next.js) à `/home/ubuntu/sites/seo-dashboard` — keywords, pages, clusters, cannibalisation, pipeline, génération.
**Bot Telegram (Grammy) :** toujours actif pour `/voiture` (ajout véhicule) et `/produit` (catalogue restaurant).

**Sites dans le réseau :**
| Site | Domaine | Schema.org | Projet local |
|------|---------|------------|--------------|
| Garage automobile | garage-perpignan.fr — **CMS** (19 pages service, 2026-08-30) | AutoRepair | /home/ubuntu/sites/Site_Garage |
| Carrosserie | CarrosserPro.fr (TF10, 148 referring domains) | AutoBodyShop | /home/ubuntu/sites/Site_Carrosserie |
| Massage à domicile | — | HealthAndBeautyBusiness | /home/ubuntu/sites/Site_Massage |
| VTC | ideal-transport.fr | TaxiService | /home/ubuntu/sites/Site_VTC |
| Voitures | — | AutoDealer | /home/ubuntu/sites/Site_Voitures |
| Restaurant | — | Restaurant | /home/ubuntu/sites/Site_Restaurant |

**Modèle économique :**
- Sites rankés loués à des artisans locaux : 200-500€/mois par page géolocalisée
- Un numéro de téléphone tracké par locataire (call tracking)
- Seul CTA autorisé : numéro de téléphone — zéro formulaire

**Expansion géographique carrosserie :** Perpignan → Narbonne → Béziers → Carcassonne → Toulouse → Marseille

---

## Stratégie SEO (avril 2026)

### Pages service (carrosserie, garage)
- Pages SERVICE par prestation suffixées -perpignan (débosselage, peinture, pare-chocs, etc.)
- Pages ville supprimées (contenu dupliqué, aucune ne rank) — 301 vers page principale
- 800+ mots, contenu expert, schema Service + LocalBusiness, CTA téléphone

### Pages produit (voitures)
- Pages MODÈLE/MARQUE via fiches véhicules enrichies (400+ mots + schema Vehicle)
- Pas de pages ville

### Pages ville (VTC, livraison alcool uniquement)
- Pages destination/trajet ou zone de livraison — seuls sites où l'intent géo existe

### Workflow human-in-the-loop
1. Découverte keywords (DataForSEO) → validation manuelle dans le dashboard
2. Clustering → approbation manuelle
3. Analyse IA recommande pages → utilisateur clique "Créer cette page"
4. Génération produit un draft → review dans /pages
5. Utilisateur clique "Publier" → Vercel deploy
**Jamais d'auto-publish ni d'auto-generate sans validation.**

---

## SEO Dashboard

**Repo :** `/home/ubuntu/sites/seo-dashboard` (Next.js, même base Supabase)
**Accès :** local VPS via pm2 (`pm2 start npm --name "seo-dashboard" -- run start`)
**Filet qualité (2026-08-28) :** même dispositif que ce dépôt — `npm run check` (typecheck + lint + format:check),
husky + lint-staged, hooks Claude Code, CI GitHub ; détail dans son `README.md`.

### Pages
`/` (plan d'action), `/backlog`, `/gsc`, `/indexation`, `/keywords`, `/clusters`, `/pages` (onglets **Liste · Pipeline · Cannibalisation**), `/backlinks`, `/sites`.
`/pipeline` et `/cannibalization` redirigent en 308 vers les onglets de `/pages` (`next.config.ts`).

### Navigation, périmètre, pagination (2026-08-28)
- **Nav latérale par étape du workflow** (`src/components/Nav.tsx`) : Décider (Plan, Backlog) · Constater (Search
  Console, Indexation) · Produire (Mots-clés, Clusters, Pages) · Autorité (Backlinks) · Réglages (Sites).
- **Périmètre site global** (`src/lib/site-scope.tsx`, `useSiteScope()`) : un seul filtre dans la colonne de gauche,
  porté par `?site=` dans l'URL (lien partageable), propagé par la nav, mémorisé en `localStorage`. Les écrans ne
  posent plus leur propre filtre ; GSC et Backlinks, qui ne savent pas additionner les sites, prennent le premier
  site actif quand le périmètre est « tous ».
- **Pagination serveur** (`src/lib/paging.ts` côté API, `src/components/Pagination.tsx` côté écran) sur
  `/api/keywords`, `/api/clusters`, `/api/pages`, `/api/backlog` : `?page=&per=` (per ≤ 500), réponse
  `{ …, total, page, per }` avec COUNT exact — l'ancien `.limit(500)` cachait 21 000 mots-clés sans le dire.
  Une page hors bornes (PGRST103) est rabattue sur la page 1 et la réponse fait foi (`page` renvoyé).
  `idsOnly=1` sur `/api/clusters` reste non paginé (tri par lots).
- **Vue par défaut = ce qui attend une décision** : Mots-clés `status=new` (onglets avec compteurs),
  Clusters `new`, Pages `status=todo` (draft + brief_ready + error ; `all` = tout sauf 301), Backlog `new`.

### API routes
`/api/overview`, `/api/backlog` (+ `[id]` PATCH/DELETE, + `scan` POST, paginé), `/api/gsc` (+ `sync` POST), `/api/briefs/prepare` (GET) + `/api/briefs/generate` (POST, overrides), `/api/generate/prompt` (GET
`?page_id=`/`?cluster_id=` — le prompt de génération exact en texte brut, lien « Voir le prompt » dans
l'éditeur ; assemblage partagé `src/lib/generation-prompt.ts`, prompt intégral aussi loggé dans
`automation_logs.details.prompt`), `/api/pages/retype` (POST), `/api/keywords` (paginé, `status=`, `counts`), `/api/keywords/suggestions`, `/api/keywords/analyze`, `/api/keywords/create-page`, `/api/pages`, `/api/pages/publish`, `/api/clusters`, `/api/clusters/triage`, `/api/cannibalization`, `/api/pipeline`, `/api/chat`, `/api/backlinks` (+ `/api/backlinks/[id]` PATCH/DELETE), `/api/sites` (GET/POST, + `[key]` GET/PATCH), `/api/indexation`, `/api/jobs` (POST : crée le journal d'un brief/génération, + `[id]` GET : progression — `job_id` accepté par `/api/briefs/generate` et `/api/generate`)

### Module Backlog SEO (meilleure prochaine action, multi-sites)
Table `opportunities` réutilisée comme **backlog d'actions SEO** (15 types : CREATE_PAGE, OPTIMIZE_PAGE, UPDATE_CONTENT, FIX_CANNIBALIZATION, BACKLINK, GBP_OPTIMIZATION, NO_ACTION…). Priorité = **impact × confiance × valeur_site ÷ effort** — aucun bonus artificiel pour le contenu. 4 détecteurs automatiques dans `src/lib/backlog.ts` (dashboard) lisent `gsc_positions` : quick wins (pos 4-20), CTR faible vs CTR attendu, déclin (28j vs 28j précédents), cannibalisation GSC (même requête → plusieurs URLs). Scan : bouton dashboard ou `curl -X POST localhost:3000/api/backlog/scan` (cron lundi 7h30). Statuts : new → planned → done/dismissed. Passer une action `done` fixe `completed_at` et déclenche les mesures baseline/J+7/J+28/J+60/J+90 dans `seo_measurements` aux scans suivants. Les actions manuelles/CLI utilisent `source` ≠ `scan:*` et survivent aux re-scans ; les BACKLINK restent pilotés par `backlink_tasks`.

### Module Indexation (funnel de découverte)
Page `/indexation` + `/api/indexation` : lisent **`v_crawl_latest`** (dernier passage du crawler) et
comptent, sans rien interpréter. Le funnel ne porte que sur les URL `expected_state = 'indexable'` —
une page redirigée ou hors périmètre a été retirée exprès. Chaque marche est cliquable (liste les URL
qui ne l'atteignent pas), chaque anomalie filtre, et chaque URL affiche l'action de backlog ouverte
qui la concerne. Les compteurs restent toujours ceux du réseau entier : filtrer change la liste, jamais
le diagnostic. Libellés d'étapes et d'anomalies dupliqués dans `src/lib/indexation.ts` (dashboard) —
tenir à jour avec `src/crawler/types.ts` et `src/crawler/issues.ts`.
**Robots.txt et sitemap par site (2026-08-28)** : le crawler écrit aussi `crawl_site_checks` (HTTP du
`/robots.txt`, groupe et règles retenus, sitemaps déclarés, corps du fichier ; HTTP du `/sitemap.xml`,
fichiers lus, URL déclarées). `buildSiteTech` (dashboard `src/lib/indexation.ts`) en fait un voyant par
site — rouge si le sitemap est injoignable ou vide, ambre si le robots.txt manque, ne déclare pas de
sitemap, ou si des URL déclarées cassent/redirigent/manquent — affiché sur `/indexation` (bandeau
d'alerte + chips par site + sitemap dépliable avec le HTTP de chaque URL + robots.txt visible), sur
`/sites` (liste) et sur `/pages/[id]` (carte **Indexation** : HTTP, robots, noindex, sitemap, étape).
C'est le filet de la bascule CMS : un robots.txt disparu ne produit aucune anomalie par URL.
**Garde-fou dépublication (2026-08-28)** : `PATCH /api/pages/[id]` refuse de faire quitter `published` à
une page **indexée ou recevant des impressions** (`v_crawl_latest` + `gsc_page_daily` 28 j) tant que
`confirm: true` n'est pas envoyé — 428 `needs_confirm` avec les enjeux et la conséquence selon le mode
(`src/lib/unpublish.ts`). Une dépublication sur un site CMS purge le cache (`revalidateCms`, partagé avec
la publication) : sans purge la page restait servie et le crawl la ressortait en « brouillon en ligne ».
Seul geste du dashboard qui peut coûter des positions.

### Sources des nouvelles pages — GSC d'abord, mots-clés en repli
**Site avec du signal** (≥ 100 impressions / 28 j) : les CREATE_PAGE viennent de `gsc_positions`
— « Google te montre déjà sur cette requête sans page dédiée » = demande **prouvée sur le domaine**.
**Site muet** (carrosserie 19 impressions, site neuf, pas de propriété GSC) : repli sur les
**clusters `approved`** de `keyword_clusters` (`src/lib/keyword-detectors.ts` du dashboard).
Les 22 000 mots-clés bruts de DataForSEO ne déclenchent rien : le tri humain reste obligatoire.
Approuver un cluster redescend sur ses mots-clés (`src/lib/cluster-keywords.ts`) — sans ça le
détecteur ne voyait rien (constat du 2026-08-28 : 59 clusters approuvés, 0 mot-clé approuvé).
L'unité est la **page cible** (plusieurs clusters visant le même `suggested_slug` = une page),
le volume est celui de la **requête de tête** (pas la somme des variantes) et, sur un site
`scope = local`, il est ramené à la zone (× 0,72 % = population des P.-O. / France) sauf si la
requête nomme déjà un lieu. Une page dont une formulation validée correspond à un slug existant
(comparaison sur radicaux : « carrossiers » ↔ `/carrosserie-perpignan`) n'est pas proposée.
Une hypothèse ne doit jamais devancer une demande prouvée — impact calculé au CTR du **bas de
première page**, confiance plafonnée (0,35 max, 0,15 si `kd` vaut 0 = difficulté non calculée),
5 propositions par site. DataForSEO sert donc à trois choses : lancer un site neuf, chiffrer une
candidate (volume + KD affichés sur les CREATE_PAGE, sans appel API), et les backlinks.

### Page Search Console (`/gsc`)
Fenêtre glissante bornée sur la dernière date en base (Google livre à J-3) : **28 j / 3 / 6 / 12 mois / Tout**,
comparée à la période précédente ou **à la même période un an plus tôt** (saisonnalité garage/restaurant).
L'état est dans l'URL (`?site=&view=&period=&compare=`). Bouton **Synchroniser** = `POST /api/gsc/sync`, qui
lance `src/jobs/gsc-sync.ts --trigger=dashboard` (un seul passage à la fois, ~8 s) ; le pied de page affiche
la vraie dernière synchro lue dans `automation_logs` (job `gsc-sync`). Une référence tronquée par l'historique
est signalée, jamais tue. Les totaux viennent toujours de `gsc_page_daily` ; le détail par requête reste partiel.

### Éditeur de page — brief depuis les faits (chantier A, 2026-08-28)
- **Types de page réels** (`src/lib/page-types.ts` du dashboard, contrainte `seo_pages_page_type_check`
  élargie par `src/db/migration-page-types.sql`) : service · city_service · city · **hub · category ·
  article · product · home · utility**. Déduits du chemin sans IA (`deducePageType`, même règle dans
  `scripts/import-inventaire.ts`), éditables dans la fiche, rattrapés par `POST /api/pages/retype[?apply=1]`
  (81 pages requalifiées le 2026-08-28). Le type pilote le brief, la génération et le profil de score ;
  `product` et `utility` ne reçoivent pas de brief SERP.
- **Panneau « Avant le brief »** (`src/components/BriefPanel.tsx`, `GET /api/briefs/prepare`) : la requête
  déduite avec sa source — **GSC de l'URL (180 j) → champ service → H1 → slug** pour une page existante,
  requête de tête pour un cluster (`src/lib/brief-source.ts`) — les variantes, le type, le profil, ce qui
  existe déjà en ligne, et les **consignes**. `POST /api/briefs/generate` accepte `main_keyword`,
  `secondary_keywords`, `page_type`, `profile_id`, `instructions` ; un mot seul de rubrique (« blog »,
  « contact ») est refusé en 422 `generic_keyword`. Les consignes sont stockées dans `brief.instructions`
  et injectées en tête du prompt d'angle **et** de rédaction (`instructionsBlock`). Même panneau depuis
  `/clusters` et depuis le bouton **« Préparer la page »** des actions CREATE_PAGE du backlog.
- **« Tel que servi »** dans `/pages/[id]` : la page réelle (dernier crawl) bloc par bloc, chaque bloc marqué
  **CMS** ou **hérité du site** (CTA, hero, maillage automatique) — `renderedBlocks` compare les H2 servis
  aux `seoSections` du CMS. Une page `external` est entièrement « héritée du site ».

### Module Backlinks (autorité off-page)
Tables Supabase `backlink_targets` (catalogue : annuaires, web2, presse, fournisseurs…) + `backlink_tasks` (tracker par site). Seed : `npx tsx scripts/seed-backlinks.ts` (idempotent, importe les kits S-Party/VTC). Les anciennes tables `directories`/`directory_submissions` sont orphelines (importées, conservées).

---

## Bot Telegram — Commandes actives

Le bot sert aux clients pour les véhicules et le catalogue, à l'admin pour quelques actions
d'exploitation. **Registre unique : `src/bot/commands/index.ts`** (nom, usage, accès) — `/help`
et `ADMIN_ONLY_COMMANDS` en découlent, rien n'est recopié.

| Commande | Fonction | Accès |
|----------|----------|-------|
| /help | Aide contextuelle | Tous |
| /voiture | Ajout véhicule 12 étapes (photos, data, commit git, deploy) | Groupes voitures/okaz + admin |
| /produit | Catalogue restaurant (ajout, prix, dispo, commit git, deploy) | Groupe restaurant + admin |
| /status, /seo, /index, /monitor, /ping, /deploy, /phone | Exploitation (pages, GSC, indexation, uptime, Vercel, téléphone) | Admin |

Les commandes IA (`/generate`, `/approve`, `/blog`, `/edit`, `/enrichir`, `/ctr`, `/keywords`,
`/claude`) ont été **supprimées** le 2026-08-28 : elles appelaient l'API Anthropic en autonomie.
La gestion SEO se fait via le dashboard.

### Commandes avec écriture fichiers
- `/voiture` → télécharge photos, écrit `data/cars.ts`, commit git, Vercel deploy
- `/produit` → écrit `data/catalogue.ts`, commit git, Vercel deploy

### Permissions
- Admin : chat ID `6240980049` — accès total
- Groupe voitures : `-5206230663` — accès /help, /voiture
- Groupe restaurant : `-5057411991` — accès /help, /produit

---

## Scripts npm

```bash
npm run bot            # Bot Telegram (tsx src/bot/index.ts) — pm2 seo-bot en prod
npm run crawl          # Crawl + funnel d'indexation (tsx scripts/crawl.ts) — simulation par défaut, -- --apply écrit
npm run gsc-sync       # Search Console → gsc_positions (-- --site=vtc, -- --backfill, -- --trigger=…)
npm run audit          # Audit GSC hebdomadaire (tsx src/jobs/weekly-gsc-audit.ts)
npm run cluster        # Clustering des mots-clés découverts (tsx src/jobs/weekly-clustering.ts)
npm run status         # État du système : env, sites actifs, hooks, crons — aucune écriture
npm run setup-db       # Vérification du schéma Supabase (tsx scripts/setup-db.ts)
npm run test-telegram  # Test notifications Telegram
npm run check          # typecheck + lint + format:check + test + knip — ce que CI et les hooks exigent
```

> `generate` / `optimize` / `run` n'existent plus : la génération et l'optimisation sont human-in-the-loop
> via le dashboard. Le filet qualité (ESLint, Prettier, Vitest, knip, husky, CI) est décrit dans
> `docs/CONTRIBUTING.md` ; le plan et le journal du ménage du 2026-08-28 dans `docs/MAINTENABILITE.md`.

---

## Base de Données Supabase

| Table | Rôle | Colonnes clés |
|-------|------|---------------|
| seo_pages | Pages SEO générées | site_key, slug, city, service, **page_type** (service/city/city_service/hub/category/article/product/home/utility), **parent_id** (page parente : accueil/hub/catégorie — fixe le préfixe d'URL et la liste qui reprend la page côté site ; `src/lib/parents.ts` du dashboard, préfixe **déduit** des pages déjà rattachées, jamais déclaré), content (JSONB, dont `brief.instructions` et **`card`** = titre/accroche/description/badges/featured affichés par le parent), status (draft/published/optimized/error/redirected/brief_ready/**external**), deployed_revision_id |
| opportunities | **Backlog d'actions SEO** (ex-table auto-generate recyclée) | site_id (=site_key), action_type, query, page_url, impact, effort, confidence, priority, justification, source, status (new/planned/done/dismissed), completed_at |
| seo_measurements | Mesures d'impact par action | site_key, opportunity_id, checkpoint (baseline/j7/j28/j60/j90), clicks, impressions, ctr, position, window_start/end |
| site_profiles | **Registre des sites — source unique de vérité** | site_key, is_active, name/label/color, domain, gsc_domain, phone/email/adresse, schema_type, scope, **mode (local/thematic/product)**, niche, triage_instructions, delivery_mode + revalidate_url/secret, project_path & fichiers cibles, vercel_hook_env, services (JSONB), seo_keyword_patterns, brand, enabled_intents, content_rules, cocooning |
| gsc_positions | Données Search Console | site_key, query, page_url, position, clicks, impressions, ctr |
| crawl_results | **Faits par URL + funnel d'indexation** (B2) — une ligne par URL et par passage, lire via `v_crawl_latest` (= **le dernier passage du site**, pas le dernier état connu de chaque URL : une URL sortie du périmètre sort du diagnostic) | site_key, url, page_id, expected_state (indexable/redirected/draft/out_of_scope), http_status, redirect_chain, indexable, canonical, in_sitemap, links_in/out, click_depth, content_hash, gsc_verdict/coverage_state/last_crawl, funnel_stage, issues[] |
| crawl_site_checks | **Ce que le site déclare** — robots.txt et sitemap, une ligne par site et par passage, lire via `v_crawl_site_checks_latest` | site_key, run_id, robots_status/fetched/group/rules/sitemaps/body, sitemap_status/reached/sources/urls[] |
| generation_jobs | **Progression d'un brief ou d'une génération** (dashboard, `/api/jobs`) — étapes horodatées écrites par la route, lues en polling ; le résultat survit à une connexion coupée | kind (brief/page), site_key, page_id, cluster_id, status (running/success/error), steps[] (key, label, status, started_at, ended_at, note), result, error |
| optimization_queue | File d'optimisation | page_id, priority, status |
| automation_logs | Logs des jobs | **job_name**, **action**, site_key, details (JSONB), status, duration_ms |
| bot_settings | Config par site | site_key, phone, address, horaires (JSONB), promo_text, gbp_link |
| page_images | Images des pages | site_key, slug, image_type (ai/real/stock), file_path, alt_text |
| blog_articles | Articles de blog | site_key, slug, title, content, tags[], status (draft/published) |
| vehicles | Inventaire voitures | marque, modele, annee, prix, carburant, boite, couleur, photos[] |
| menu_categories | Catégories menu restaurant | site_key, slug, name, display_order |
| menu_items | Articles menu restaurant | category_id, name, price, allergens[], is_vegetarian, status |

> La vue `v_optimization_candidates` documentée historiquement **n'existe pas** en base — les candidats d'optimisation passent par le backlog (`opportunities`).
>
> **`status = 'external'`** : la page existe en ligne mais c'est le **code du site** qui la rend, pas le CMS. Sur carrossier-pro, `app/[service]/page.tsx` cherche `siteConfig.services` (`lib/config.ts`) avant `getCmsPage()` — trois slugs présents des deux côtés étaient servis depuis le fichier TypeScript pendant que le dashboard prétendait les publier. Ces pages restent dans l'inventaire (le backlog SEO les voit) mais la publication les refuse.
>
> **`deployed_revision_id`** ne se pose qu'après constat en ligne (`confirmDeployed`, dashboard `lib/publish.ts`) : on relit l'URL et on compare le `<h1>` rendu, le `<title>` et la meta description à ce que dit la base. Un 200 de la route de revalidation ne prouve rien — la propagation CDN prend 1 à 2 s.

---

## Jobs Cron Automatisés

```
30 6 * * *   Sync GSC → gsc_positions (QUOTIDIEN, en tête de chaîne le lundi) — src/jobs/gsc-sync.ts --trigger=cron
45 6 * * 1   Crawl + funnel d'indexation → crawl_results + crawl_site_checks — scripts/crawl.ts --apply (~1 min/site)
30 7 * * 1   Scan backlog SEO — détecteurs + mesures (curl POST /api/backlog/scan sur le dashboard pm2)
0 8 * * 1    Audit GSC hebdomadaire (lundi)
0 22 * * 0   Clustering keywords hebdomadaire (dimanche)
0 0 * * 0    Rotation logs (>10MB)
```
Logs : `/var/log/seo-automation.log`
Install : `bash scripts/setup-crons.sh`

> Les crons `daily-generate` et `monthly-optimize` sont DÉSACTIVÉS (appelaient l'API Anthropic — crédits épuisés, l'IA passe par les sessions Claude CLI). Génération et optimisation = human-in-the-loop via dashboard + sessions CLI.
>
> **`gsc_positions` = source de vérité historique GSC** (snapshots par site/query/page/date, jamais écrasés). Backfill 16 mois fait le 2026-08-21. Nouveau site : partager la propriété GSC avec le service account puis renseigner « Domaine GSC » sur la page `/sites` du dashboard (colonne `site_profiles.gsc_domain`). Backfill : `npx tsx src/jobs/gsc-sync.ts --backfill --site=<key>`.

---

## Dépendances clés

```
@anthropic-ai/sdk     ^0.39.0   Claude API (scripts seulement — les jobs n'appellent plus l'IA)
grammy                ^1.41.1   Bot Telegram
@supabase/supabase-js ^2.49.1   Client Supabase
googleapis            ^146.0.0  Search Console + Indexing API (google-auth-library aligné en ^9.15)
cheerio               ^1.2.0    Parsing HTML du crawler
tsx                   ^4.19.0   Exécution TypeScript
typescript            ^5.7.0    Compilation (strict + noUnusedLocals/Parameters)
eslint 9 · prettier 3 · vitest 3 · knip 5 · husky 9 · lint-staged   Filet qualité (dev)
```

> `pg` et `sharp` retirés (aucun usage hors scripts jetables).

---

## Workflow Orchestration

### 1. Mode Plan par Défaut
- Entrer en mode plan pour TOUTE tâche non-triviale (3+ étapes ou décisions d'architecture)
- Si quelque chose déraille : STOP et re-planifier immédiatement

### 2. Vérification Avant de Clore
- Ne jamais marquer une tâche terminée sans prouver que ça fonctionne
- Vérifier : build Vercel OK, Supabase requêtes valides, dashboard fonctionnel

### 3. Bug Fixing Autonome
- Face à un bug : corriger directement sans demander à être guidé
- S'appuyer sur les logs Vercel, erreurs Supabase, logs VPS
- Zéro interruption de l'utilisateur pour des corrections techniques

---

## Conventions Techniques

### Stack
```
Runtime     : Node.js v22 (ESM — "type": "module" dans package.json)
Framework   : Next.js (App Router)
DB          : Supabase (PostgreSQL + RLS)
Deploy      : Vercel (deploy hooks par site)
Versioning  : GitHub (eldenmarketing-rgb/seo-automation)
Dashboard   : Next.js 16 / React 19 / Tailwind 4 — local VPS via pm2
Bot         : Grammy ^1.41.1 (Telegram) — /voiture + /produit
AI          : Anthropic SDK ^0.39.0 — claude-sonnet-4-20250514 (scripts) ; dashboard = Claude CLI `--model opus` (Opus 5, forfait Max)
VPS         : OVH Ubuntu 24.04
```

### Structure Fichiers
```
/config/
  sites.ts                     → chargeur : lit site_profiles (top-level await), expose `sites`
  site-types.ts                → interfaces SiteConfig + ServiceDef
  mode-defaults.ts             → **règles génériques LOCAL/THEMATIC/PRODUCT** (seul endroit)
  site-modes.ts                → types et interfaces des modes (local/thématique/produit)
  gsc-sites.ts                 → chargeur : dérivé de site_profiles.gsc_domain
  cities-66.ts                 → 42 villes avec zones (perpignan/proche/peripherie/eloigne)
  gsc-service-account.json     → IGNORÉ PAR GIT — ne jamais commiter
/scripts/                      → 11 outils maintenus ; scripts/oneshot/ = jetable, hors outillage (README)
  run.ts                       → `npm run status` : env, sites, hooks, crons (aucune écriture)
  crawl.ts                     → crawl + indexation de tous les sites (--site=, --apply, --no-inspect)
  import-inventaire.ts         → import des pages réelles des sites (sitemap → seo_pages en `external`)
  publish-pages.ts             → publication CMS, appelé par le dashboard (lib/publish.ts)
  serp-analyze.ts              → analyse SERP, appelé par le dashboard (/api/briefs/generate)
  backfill-intents.ts          → classification d'intention des mots-clés découverts
  seed-backlinks.ts            → catalogue backlink_targets (idempotent)
  setup-db.ts · run-migration.ts · check-pages.ts · gsc-auth.ts · setup-crons.sh
  dev/check-secrets.sh         → refus des secrets au commit (hook pre-commit)
/src/
  config/env.ts                → **seul lecteur de process.env** : SPEC des variables, env / requireEnv / readEnvByName
  bot/index.ts                 → point d'entrée bot (Grammy, sessions, auth middleware, boucle uptime)
  bot/commands/index.ts        → **registre des commandes** (nom, usage, accès) — seul endroit à éditer
  bot/permissions.ts           → admin / groupes clients (TELEGRAM_GROUP_SITES)
  sites/registry.ts            → **chargeur unique du registre** (site_profiles → SiteConfig)
  db/client.ts                 → getSupabase() ; pages.ts · gsc.ts · logs.ts · optimization.ts par domaine
  db/supabase.ts               → baril de ré-export (compatibilité des imports)
  db/schema.sql · migration-*.sql → schéma et migrations (idempotentes)
  deployers/vercel-deploy.ts   → trigger deploy hooks Vercel
  deployers/inject-pages.ts    → injection pages dans fichiers data des sites
  deployers/sitemap-ping.ts    → ping sitemap Google
  deployers/indexing.ts        → Google Indexing API + IndexNow
  crawler/index.ts             → **crawl d'un site** (base ∪ sitemap ∪ liens) + funnel d'indexation
  crawler/fetch.ts             → requêtes HTTP, chaîne de redirection conservée
  crawler/parse.ts · extract.ts → extraction des faits HTML (cheerio), contenu rendu au format CMS
  crawler/robots.ts            → robots.txt (groupe Googlebot) + sitemaps déclarés
  crawler/graph.ts             → maillage : liens entrants éditoriaux + profondeur de clic
  crawler/issues.ts            → anomalies déterministes selon l'état attendu de l'URL
  crawler/funnel.ts (+ .test)  → étape atteinte dans le funnel d'indexation — testé
  crawler/scope.ts             → slugs hors périmètre SEO (mentions légales, CGV…)
  gsc/auth.ts                  → authentification GSC (service account)
  gsc/property.ts              → résolution de la propriété (sc-domain: / URL-prefix)
  gsc/inspect.ts               → **API URL Inspection** (scope `webmasters`, pas readonly)
  gsc/client.ts                → client API GSC (queries, pages, positions sur 28j)
  gsc/analyzer.ts · positions.ts → audit hebdo (candidats d'optimisation)
  gsc/indexation.ts            → vérification indexation (/index)
  jobs/gsc-sync.ts             → sync quotidienne GSC (+ --backfill)
  jobs/weekly-gsc-audit.ts     → job hebdo audit GSC
  jobs/weekly-clustering.ts    → clustering hebdo
  keywords/dataforseo.ts       → client API DataForSEO
  keywords/intent-classifier.ts → classification d'intention (regex + repli IA)
  dataforseo/cache.ts          → cache des appels payants (dataforseo_cache)
  serp/competitor-analysis.ts  → analyse SERP concurrentielle
  monitoring/uptime.ts         → vérification uptime sites
  notifications/telegram.ts    → envoi notifications Telegram
  utils/logger.ts              → logger horodaté, niveau via LOG_LEVEL (debug/info/warn/error)
/docs/                         → ARCHITECTURE.md · CONTRIBUTING.md · MAINTENABILITE.md · seo-invariants.md
.env                           → IGNORÉ PAR GIT — ne jamais commiter
```

### Sécurité — NON NÉGOCIABLE
- `.env` → jamais dans git (contient : Supabase keys, Anthropic key, Vercel hooks, Telegram token, GSC creds, DataForSEO creds)
- `config/gsc-service-account.json` → jamais dans git
- Vérifier .gitignore avant tout nouveau fichier sensible
- Avant chaque push : `git status` pour vérifier qu'aucun secret n'est stagé

### Déploiement
- Push GitHub → deploy automatique Vercel (via hooks)
- Hooks configurés : Garage, VTC, Voitures, Restaurant
- Hooks manquants : Carrosserie, Massage → à configurer sur Vercel
- Ne jamais force-push sur master

---

## Règles SEO — Invariants

### Contenu
- Une intention de recherche précise par page — pas de keyword stuffing
- Title : [Service] [Ville] | [Nom Site] — max 60 caractères
- Meta description : bénéfice + localisation + CTA implicite — max 155 caractères
- H1 unique par page avec keyword principal
- Contenu minimum : 800+ mots pour pages service/pilier, 500+ pour pages ville
- Maillage interne automatique via cocon sémantique (pilier → cluster → feuille)
- Schema.org JSON-LD sur chaque page (type métier + FAQPage)
- Champ `updatedDate` ajouté automatiquement pour la fraîcheur
- 60%+ contenu unique par page vs les autres du même set (seuil programmatic SEO)

### Performance (Core Web Vitals)
- LCP < 2.5s — images WebP + lazy loading
- CLS = 0 — réserver l'espace des images
- INP < 100ms — pas de JS bloquant

### URL Structure
```
/[service]-perpignan/           → page service géolocalisée (carrosserie, garage)
/[service]/[ville]/             → page géolocalisée (VTC, livraison)
```

---

## Règles Conversion — NON NÉGOCIABLES

- CTA principal : numéro de téléphone (click-to-call `<a href="tel:...">`)
- WhatsApp autorisé avec `?text=` pré-rempli uniquement
- Zéro formulaire de contact sur aucun site
- Numéro visible above the fold sur toutes les pages
- Pas de chatbot ni widget tiers qui dilue l'attention
- Un numéro tracké unique par locataire/ville

---

## Principes Fondamentaux

- Simplicité d'abord : changement minimal pour l'effet maximal
- Pas de fixes temporaires : trouver la cause racine
- Impact minimal : ne toucher que ce qui est nécessaire
- Phone-first : chaque décision se juge sur une seule question — est-ce que ça génère plus d'appels ?
