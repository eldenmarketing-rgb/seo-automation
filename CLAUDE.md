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
| Garage automobile | garage-perpignan.fr | AutoRepair | /home/ubuntu/sites/Site_Garage |
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

### Pages
`/` (overview), `/backlog`, `/keywords`, `/pages`, `/clusters`, `/cannibalization`, `/pipeline`, `/backlinks`, `/sites`

### API routes
`/api/overview`, `/api/backlog` (+ `[id]` PATCH/DELETE, + `scan` POST), `/api/keywords`, `/api/keywords/suggestions`, `/api/keywords/analyze`, `/api/keywords/create-page`, `/api/pages`, `/api/pages/publish`, `/api/clusters`, `/api/clusters/triage`, `/api/cannibalization`, `/api/pipeline`, `/api/chat`, `/api/backlinks` (+ `/api/backlinks/[id]` PATCH/DELETE), `/api/sites` (GET/POST, + `[key]` GET/PATCH)

### Module Backlog SEO (meilleure prochaine action, multi-sites)
Table `opportunities` réutilisée comme **backlog d'actions SEO** (15 types : CREATE_PAGE, OPTIMIZE_PAGE, UPDATE_CONTENT, FIX_CANNIBALIZATION, BACKLINK, GBP_OPTIMIZATION, NO_ACTION…). Priorité = **impact × confiance × valeur_site ÷ effort** — aucun bonus artificiel pour le contenu. 4 détecteurs automatiques dans `src/lib/backlog.ts` (dashboard) lisent `gsc_positions` : quick wins (pos 4-20), CTR faible vs CTR attendu, déclin (28j vs 28j précédents), cannibalisation GSC (même requête → plusieurs URLs). Scan : bouton dashboard ou `curl -X POST localhost:3000/api/backlog/scan` (cron lundi 7h30). Statuts : new → planned → done/dismissed. Passer une action `done` fixe `completed_at` et déclenche les mesures baseline/J+7/J+28/J+60/J+90 dans `seo_measurements` aux scans suivants. Les actions manuelles/CLI utilisent `source` ≠ `scan:*` et survivent aux re-scans ; les BACKLINK restent pilotés par `backlink_tasks`.

### Module Backlinks (autorité off-page)
Tables Supabase `backlink_targets` (catalogue : annuaires, web2, presse, fournisseurs…) + `backlink_tasks` (tracker par site). Seed : `npx tsx scripts/seed-backlinks.ts` (idempotent, importe les kits S-Party/VTC). Les anciennes tables `directories`/`directory_submissions` sont orphelines (importées, conservées).

---

## Bot Telegram — Commandes actives

Le bot reste actif pour la gestion des produits et véhicules.

| Commande | Fonction | Accès |
|----------|----------|-------|
| /help | Aide contextuelle | Tous |
| /voiture | Ajout véhicule 12 étapes (photos, data, git commit, deploy) | Tous |
| /produit | Catalogue restaurant (ajout, prix, dispo, git commit, deploy) | Tous |

Les commandes SEO (/status, /generate, /seo, /keywords, /ctr, /deploy, /index, /ping, /monitor, /edit, /blog, /phone, /claude) existent toujours dans le code mais la gestion SEO se fait via le dashboard.

### Commandes avec écriture fichiers
- `/voiture` → télécharge photos, écrit `data/cars.ts`, git commit, Vercel deploy
- `/produit` → écrit `data/catalogue.ts`, git commit, Vercel deploy

### Permissions
- Admin : chat ID `6240980049` — accès total
- Groupe voitures : `-5206230663` — accès /help, /voiture
- Groupe restaurant : `-5057411991` — accès /help, /produit

---

## Scripts npm

```bash
npm run bot            # Lance le bot Telegram (tsx src/bot/index.ts)
npm run audit          # Job audit GSC hebdomadaire (tsx src/jobs/weekly-gsc-audit.ts)
npm run optimize       # Job optimisation mensuelle (tsx src/jobs/monthly-optimize.ts)
npm run setup-db       # Setup et vérification BDD (tsx scripts/setup-db.ts)
npm run run            # Point d'entrée principal — status/generate/audit/optimize
npm run test-telegram  # Test notifications Telegram
```

> `npm run generate` (daily-generate) est DÉSACTIVÉ — la génération se fait manuellement via le dashboard (human-in-the-loop).

---

## Base de Données Supabase

| Table | Rôle | Colonnes clés |
|-------|------|---------------|
| seo_pages | Pages SEO générées | site_key, slug, city, service, content (JSONB), status (draft/published/optimized/error) |
| opportunities | **Backlog d'actions SEO** (ex-table auto-generate recyclée) | site_id (=site_key), action_type, query, page_url, impact, effort, confidence, priority, justification, source, status (new/planned/done/dismissed), completed_at |
| seo_measurements | Mesures d'impact par action | site_key, opportunity_id, checkpoint (baseline/j7/j28/j60/j90), clicks, impressions, ctr, position, window_start/end |
| site_profiles | **Registre des sites — source unique de vérité** | site_key, is_active, name/label/color, domain, gsc_domain, phone/email/adresse, schema_type, scope, **mode (local/thematic/product)**, niche, triage_instructions, delivery_mode + revalidate_url/secret, project_path & fichiers cibles, vercel_hook_env, services (JSONB), seo_keyword_patterns, brand, enabled_intents, content_rules, cocooning |
| gsc_positions | Données Search Console | site_key, query, page_url, position, clicks, impressions, ctr |
| optimization_queue | File d'optimisation | page_id, priority, status |
| automation_logs | Logs des jobs | job_type, site_key, details (JSONB), status |
| bot_settings | Config par site | site_key, phone, address, horaires (JSONB), promo_text, gbp_link |
| page_images | Images des pages | site_key, slug, image_type (ai/real/stock), file_path, alt_text |
| blog_articles | Articles de blog | site_key, slug, title, content, tags[], status (draft/published) |
| vehicles | Inventaire voitures | marque, modele, annee, prix, carburant, boite, couleur, photos[] |
| menu_categories | Catégories menu restaurant | site_key, slug, name, display_order |
| menu_items | Articles menu restaurant | category_id, name, price, allergens[], is_vegetarian, status |

> La vue `v_optimization_candidates` documentée historiquement **n'existe pas** en base — les candidats d'optimisation passent par le backlog (`opportunities`).

---

## Jobs Cron Automatisés

```
0 7 * * 1    Sync GSC → gsc_positions (lundi, avant l'audit) — src/jobs/gsc-sync.ts
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
@anthropic-ai/sdk    ^0.39.0    Claude API (génération + optimisation)
grammy               ^1.41.1    Bot Telegram
@supabase/supabase-js ^2.49.1   Client Supabase
googleapis           ^146.0.0   Google Search Console + Indexing API
pg                   ^8.20.0    PostgreSQL direct
tsx                  ^4.19.0    Exécution TypeScript
typescript           ^5.7.0     Compilation
```

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
AI          : Anthropic SDK ^0.39.0 — claude-sonnet-4-20250514
VPS         : OVH Ubuntu 24.04
```

### Structure Fichiers
```
/config/
  sites.ts                     → chargeur : lit site_profiles (top-level await), expose `sites`
  site-types.ts                → interfaces SiteConfig + ServiceDef
  sites.legacy.ts              → SNAPSHOT pré-A1, lu seulement par le seed (à supprimer en A2)
  mode-defaults.ts             → **règles génériques LOCAL/THEMATIC/PRODUCT** (seul endroit)
  site-modes.ts                → types et interfaces des modes (local/thématique/produit)
  site-mode-registry.ts        → chargeur : mode-defaults surchargé par site_profiles
  site-mode-registry.legacy.ts → SNAPSHOT pré-A1, lu seulement par le seed
  gsc-sites.ts                 → chargeur : dérivé de site_profiles.gsc_domain
  cities-66.ts                 → 42 villes avec zones (perpignan/proche/peripherie/eloigne)
  gsc-service-account.json     → IGNORÉ PAR GIT — ne jamais commiter
/scripts/
  run.ts                       → point d'entrée principal (status/generate/audit/optimize)
  setup-db.ts                  → setup et vérification BDD Supabase
  setup-crons.sh               → installation des cron jobs
  run-migration.ts             → migration via Supabase Management API
  check-pages.ts               → diagnostic DB vs fichiers
  check-slugs.ts               → matrice restante à générer
  gsc-auth.ts                  → helper OAuth2 GSC
/src/
  bot/index.ts                 → point d'entrée bot (Grammy, sessions, auth middleware)
  bot/permissions.ts           → système permissions admin/groupes
  bot/commands/*.ts            → commandes bot (voiture, produit, + legacy SEO)
  sites/registry.ts            → **chargeur unique du registre** (site_profiles → SiteConfig)
  db/schema.sql                → schéma complet BDD
  db/supabase.ts               → client Supabase singleton + CRUD complet
  deployers/vercel-deploy.ts   → trigger deploy hooks Vercel
  deployers/inject-pages.ts    → injection pages dans fichiers data des sites
  deployers/sitemap-ping.ts    → ping sitemap Google
  deployers/indexing.ts        → Google Indexing API + IndexNow
  generators/page-generator.ts → génération via Claude API + schema.org
  generators/universal-prompt.ts   → prompt builder universel (remplace 6 templates)
  generators/universal-matrix.ts   → matrice universelle (local/thématique/produit)
  generators/universal-schema.ts   → schema.org adaptatif
  gsc/auth.ts                  → authentification GSC (service account)
  gsc/client.ts                → client API GSC (queries, pages, positions sur 28j)
  gsc/analyzer.ts              → analyse des données GSC
  gsc/ctr-optimizer.ts         → optimisation CTR
  gsc/indexation.ts            → vérification indexation
  gsc/optimizer.ts             → optimisation contenu
  gsc/positions.ts             → suivi positions
  jobs/weekly-gsc-audit.ts     → job hebdo audit GSC
  jobs/monthly-optimize.ts     → job mensuel optimisation (crée des drafts)
  keywords/research-v2.ts      → recherche mots-clés (DataForSEO + Google Suggest fallback)
  keywords/dataforseo.ts       → client API DataForSEO
  linking/cocooning.ts         → moteur cocon sémantique (pilier → cluster → feuille)
  monitoring/uptime.ts         → vérification uptime sites
  notifications/telegram.ts    → envoi notifications Telegram
  utils/logger.ts              → logger coloré avec timestamps
  utils/slug.ts                → génération de slugs
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
