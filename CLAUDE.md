# CLAUDE.md — SEO Automation System
> Projet : Réseau multi-sites SEO local automatisé — Pyrénées-Orientales (66)
> Stack : Claude Code + Supabase + GitHub + Vercel + Telegram bot (Grammy)
> VPS : OVH Ubuntu 24.04 — 4 vCores / 8 GB RAM
> GitHub : github.com/eldenmarketing-rgb/seo-automation
> Owner : Elden (@eldenmarketing-rgb)

---

## Contexte Projet

Système d'automatisation SEO autonome pilotant un réseau de 6 sites Next.js locaux ciblant des niches artisans dans les Pyrénées-Orientales (66). Objectif : générer des leads qualifiés convertis exclusivement via appels téléphoniques. Les sites rankés seront loués à des artisans locaux (loyer fixe mensuel). Telegram (Grammy) est l'interface de contrôle principale.

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

## État Actuel du Système (Mars 2026)

### 100% opérationnel
- Bot Telegram Grammy — 16 commandes fonctionnelles
- Génération SEO via Claude API (`claude-sonnet-4-20250514`, max 8192 tokens) — 6 templates, matrice 42 villes x services
- Supabase — schéma complet (9 tables + 1 vue), data layer CRUD complet
- Google Search Console — auth par service account JSON, client API, analyse, optimisation CTR
- Jobs cron — 3 jobs automatisés + rotation logs
- Git + GitHub privé (eldenmarketing-rgb/seo-automation) — initialisé mars 2026
- Maillage interne automatique — liens injectés dans les prompts Claude
- Injection automatique mots-clés longue traîne via Google Suggest
- Schema.org JSON-LD automatique (FAQPage + type métier)
- Uptime monitoring — boucle toutes les 5 min dans le bot

### Incomplet
- Deploy hooks Vercel manquants : **Carrosserie**, **Massage**
- Groupes Telegram manquants : **Garage**, **Carrosserie**, **Massage**, **VTC**
- `dataStrategy` varie par site : `data-files` (garage, carrosserie, voitures, restaurant), `config-only` (massage), `create-dynamic` (vtc)

### Manquant
- Tests unitaires et d'intégration — aucun framework de test
- CI/CD (GitHub Actions)
- Monitoring healthcheck des crons
- Documentation README

---

## Scripts npm

```bash
npm run bot            # Lance le bot Telegram (tsx src/bot/index.ts)
npm run generate       # Job génération quotidienne (tsx src/jobs/daily-generate.ts)
npm run audit          # Job audit GSC hebdomadaire (tsx src/jobs/weekly-gsc-audit.ts)
npm run optimize       # Job optimisation mensuelle (tsx src/jobs/monthly-optimize.ts)
npm run setup-db       # Setup et vérification BDD (tsx scripts/setup-db.ts)
npm run run            # Point d'entrée principal — status/generate/audit/optimize
npm run test-telegram  # Test notifications Telegram
```

---

## Bot Telegram — Commandes

| Commande | Fonction | Accès |
|----------|----------|-------|
| /help | Aide contextuelle (admin vs groupe) | Tous |
| /status | Progression matrice ville x service, checks env | Admin |
| /generate | Génération pages SEO via Claude (batch, keyboard UI) | Admin |
| /blog | Articles de blog IA via Claude | Admin |
| /deploy | Déploiement Vercel (par site) | Admin |
| /seo | Rapport GSC (positions, CTR, top queries) | Admin |
| /keywords | Recherche mots-clés court/long tail + suggestions pages | Admin |
| /ctr | Optimisation CTR pages positions 5-15 | Admin |
| /index | Vérification indexation (indexed vs total) | Admin |
| /ping | Indexation instantanée (Google Indexing API + IndexNow) | Admin |
| /monitor | Uptime de tous les sites | Admin |
| /edit | Édition inline (meta, H1, hero, intro, sections, FAQ) | Admin |
| /phone | Mise à jour numéro de téléphone (écrit dans config/) | Admin |
| /voiture | Ajout véhicule 12 étapes (photos, data, git commit, deploy) | Tous |
| /produit | Catalogue restaurant (ajout, prix, dispo, git commit, deploy) | Tous |
| /claude | Requêtes libres à Claude CLI (bash read-only) | Admin |

### Commandes avec écriture fichiers
- `/phone` → modifie `config/sites.ts` + fichiers config des sites
- `/voiture` → télécharge photos, écrit `data/cars.ts`, git commit, Vercel deploy
- `/produit` → écrit `data/catalogue.ts`, git commit, Vercel deploy

### Permissions
- Admin : chat ID `6240980049` — accès total (toutes commandes)
- Groupe voitures : `-5206230663` — accès /help, /voiture
- Groupe restaurant : `-5057411991` — accès /help, /produit
- Raccourcis texte : "status"/"état", "aide"/"help", "monitor"/"sites", "genere [site] [n]"

---

## Base de Données Supabase

| Table | Rôle | Colonnes clés |
|-------|------|---------------|
| seo_pages | Pages SEO générées | site_key, slug, city, service, content (JSONB), status (draft/published/optimized/error) |
| gsc_positions | Données Search Console | site_key, query, page_url, position, clicks, impressions, ctr |
| optimization_queue | File d'optimisation | page_id, priority, status |
| automation_logs | Logs des jobs | job_type, site_key, details (JSONB), status |
| bot_settings | Config par site | site_key, phone, address, horaires (JSONB), promo_text, gbp_link |
| page_images | Images des pages | site_key, slug, image_type (ai/real/stock), file_path, alt_text |
| blog_articles | Articles de blog | site_key, slug, title, content, tags[], status (draft/published) |
| vehicles | Inventaire voitures | marque, modele, annee, prix, carburant, boite, couleur, photos[] |
| menu_categories | Catégories menu restaurant | site_key, slug, name, display_order |
| menu_items | Articles menu restaurant | category_id, name, price, allergens[], is_vegetarian, status |

**Vue :** `v_optimization_candidates` — pages entre positions 5-15 (candidats top 3)

---

## Jobs Cron Automatisés

```
0 6 * * *    Génération quotidienne 5 pages/site
0 8 * * 1    Audit GSC hebdomadaire (lundi)
0 10 1 * *   Optimisation mensuelle (1er du mois)
0 0 * * 0    Rotation logs (>10MB)
```
Logs : `/var/log/seo-automation.log`
Install : `bash scripts/setup-crons.sh`

### Workflow du job daily-generate
1. Génère la matrice ville×service pour chaque site
2. Vérifie les pages existantes (Supabase + fichiers)
3. Génère les nouvelles pages via Claude API (priorité : pages ville)
4. Stocke dans Supabase (status: draft)
5. Injecte dans les fichiers data du site
6. Déploie sur Vercel
7. Demande indexation instantanée (Google Indexing API + IndexNow)
8. Log les résultats

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

### 2. Boucle d'Auto-Amélioration
- Après TOUTE correction : mettre à jour tasks/lessons.md avec le pattern d'erreur
- Relire tasks/lessons.md au démarrage de chaque session

### 3. Vérification Avant de Clore
- Ne jamais marquer une tâche terminée sans prouver que ça fonctionne
- Vérifier : build Vercel OK, Telegram bot répond, Supabase requêtes valides

### 4. Bug Fixing Autonome
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
Bot         : Grammy ^1.41.1 (Telegram)
AI          : Anthropic SDK ^0.39.0 — claude-sonnet-4-20250514
VPS         : OVH Ubuntu 24.04
```

### Structure Fichiers
```
/config/
  sites.ts                     → config centralisée des 6 sites (SiteConfig + ServiceDef)
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
  test-gsc.ts                  → test connexion GSC
  test-keywords.ts             → test recherche mots-clés
  test-links.ts                → test maillage interne
/src/
  bot/index.ts                 → point d'entrée bot (Grammy, sessions, auth middleware)
  bot/permissions.ts           → système permissions admin/groupes
  bot/commands/*.ts            → 16 commandes (1 fichier par commande)
  db/schema.sql                → schéma complet BDD
  db/migration-new-tables.sql  → migration 6 tables additionnelles
  db/supabase.ts               → client Supabase singleton + CRUD complet
  deployers/vercel-deploy.ts   → trigger deploy hooks Vercel
  deployers/inject-pages.ts    → injection pages dans fichiers data des sites
  deployers/sitemap-ping.ts    → ping sitemap Google
  deployers/indexing.ts        → Google Indexing API + IndexNow
  generators/page-generator.ts → génération via Claude API + schema.org
  generators/city-service-matrix.ts → matrice ville×service
  generators/templates/*.ts    → 6 templates (garage, carrosserie, massage, vtc, voitures, restaurant)
  gsc/auth.ts                  → authentification GSC (service account)
  gsc/client.ts                → client API GSC (queries, pages, positions sur 28j)
  gsc/analyzer.ts              → analyse des données GSC
  gsc/ctr-optimizer.ts         → optimisation CTR
  gsc/indexation.ts            → vérification indexation
  gsc/optimizer.ts             → optimisation contenu
  gsc/positions.ts             → suivi positions
  jobs/daily-generate.ts       → job quotidien génération pages
  jobs/weekly-gsc-audit.ts     → job hebdo audit GSC
  jobs/monthly-optimize.ts     → job mensuel optimisation
  keywords/research.ts         → recherche mots-clés (Google Suggest)
  linking/internal-links.ts    → maillage interne automatique
  monitoring/uptime.ts         → vérification uptime sites
  notifications/telegram.ts    → envoi notifications Telegram
  utils/logger.ts              → logger coloré avec timestamps
  utils/slug.ts                → génération de slugs
.env                           → IGNORÉ PAR GIT — ne jamais commiter
```

### Sécurité — NON NÉGOCIABLE
- `.env` → jamais dans git (contient : Supabase keys, Anthropic key, Vercel hooks, Telegram token, GSC creds)
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
- Contenu minimum : 400 mots pour pages service, 800+ pour pages piliers
- Maillage interne automatique — chaque page liée depuis au moins une page existante
- Mots-clés longue traîne injectés automatiquement via Google Suggest
- Schema.org JSON-LD sur chaque page (type métier + FAQPage)
- Champ `updatedDate` ajouté automatiquement pour la fraîcheur

### Performance (Core Web Vitals)
- LCP < 2.5s — images WebP + lazy loading
- CLS = 0 — réserver l'espace des images
- INP < 100ms — pas de JS bloquant

### URL Structure
```
/[service]/                     → page principale service
/[service]/[ville]/             → page géolocalisée
/[service]/[ville]/[quartier]/  → page hyperlocale si pertinent
```

### Optimisation pages #5-#15 (monthly-optimize)
- Analyse les requêtes GSC (impressions, position, CTR)
- Renforcement sémantique + entités NLP
- Title/meta réécrits pour maximiser CTR
- Sections allongées à 250-400 mots
- FAQ enrichies (6 minimum, 60-120 mots/réponse)
- Ajout trustSignals (E-E-A-T)

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
