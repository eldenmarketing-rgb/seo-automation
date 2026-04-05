# Migration Guide: Universal SEO Page Generator

## Vue d'ensemble

Ce guide migre le système de 6 templates hardcodés (garage.ts, carrosserie.ts, etc.) vers un générateur universel qui supporte 3 modes : **local** (ville×service), **thématique** (topic×intent), **produit** (product×variant).

**Changements principaux :**
- 12 fonctions de template → 1 `buildPrompt()` universel
- `page-generator.ts` → `page-generator-v2.ts` (drop-in replacement)
- `city-service-matrix.ts` → `universal-matrix.ts` (rétro-compatible)
- `buildSchemaOrg()` basique → `buildUniversalSchemaOrg()` avec BreadcrumbList, GeoCoordinates, Service, Course, Product
- System prompt séparé du user prompt (meilleure adhérence + cache tokens)
- Brand voice configurable par site (ton, personnalité, USP)
- Pages intention : prix, urgence, avis, faq, guide, formation, comparatif

**Ce qui ne change PAS :**
- `daily-generate.ts` — même interface, mêmes appels
- `generateBatch()` — même signature
- `SeoPageRow` — même structure de sortie
- Bot Telegram — aucun changement
- Supabase — aucun changement
- Déploiement Vercel — aucun changement

## Étapes de migration

### Étape 1 : Copier les nouveaux fichiers

```bash
cd ~/sites/seo-automation

# Backup des fichiers existants
cp src/generators/page-generator.ts src/generators/page-generator.backup.ts
cp src/generators/city-service-matrix.ts src/generators/city-service-matrix.backup.ts

# Les 5 nouveaux fichiers à créer :
# 1. config/site-modes.ts           — Types et interfaces des modes
# 2. config/site-mode-registry.ts    — Config brand/mode par site
# 3. src/generators/universal-prompt.ts    — Prompt builder universel
# 4. src/generators/universal-matrix.ts    — Matrice universelle
# 5. src/generators/universal-schema.ts    — Schema.org adaptatif
```

### Étape 2 : Adapter les imports dans page-generator.ts

Remplacer le contenu de `src/generators/page-generator.ts` par celui de `page-generator-v2.ts`.

Les anciens imports des templates (`garagePrompt`, `carrosseriePrompt`, etc.) sont supprimés et remplacés par :
```typescript
import { buildPrompt, buildOptimizationPrompt } from './universal-prompt.js';
import { buildUniversalSchemaOrg } from './universal-schema.js';
import { getSiteModeConfig } from '../../config/site-mode-registry.js';
```

### Étape 3 : Adapter daily-generate.ts

Le seul changement nécessaire : importer `generateMatrix` depuis le nouveau fichier.

```typescript
// AVANT
import { generateMatrix, PageToGenerate } from '../generators/city-service-matrix.js';

// APRÈS
import { generateMatrix, prioritizePages, PageToGenerate } from '../generators/universal-matrix.js';
```

Et remplacer la prioritisation manuelle :
```typescript
// AVANT
const prioritized = [
  ...newPages.filter(p => p.pageType === 'city'),
  ...newPages.filter(p => p.pageType === 'city_service'),
];

// APRÈS
const prioritized = prioritizePages(newPages);
```

### Étape 4 : Adapter SeoPageRow dans Supabase

Ajouter 2 colonnes à la table `seo_pages` :
```sql
ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS intent TEXT DEFAULT 'service';
ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'local';
```

Mettre à jour l'interface `SeoPageRow` dans `src/db/supabase.ts` :
```typescript
export interface SeoPageRow {
  // ... champs existants ...
  intent?: string;  // PageIntent
  mode?: string;    // SiteMode
}
```

### Étape 5 : Configurer DataForSEO

1. Créer un compte sur https://dataforseo.com (1$ de crédit gratuit pour tester)
2. Aller dans API Access : https://app.dataforseo.com/api-access
3. Ajouter dans `.env` :
```
DATAFORSEO_LOGIN=ton_email@example.com
DATAFORSEO_PASSWORD=ton_mot_de_passe_api
```

Si DataForSEO n'est pas configuré, le système fonctionne quand même avec le scoring heuristique (Google Suggest fallback). Mais avec DataForSEO tu as les vrais volumes, KD et CPC.

### Étape 6 : Personnaliser les configs brand

Ouvrir `config/site-mode-registry.ts` et adapter les `BrandVoice` de chaque site avec les vrais arguments, le vrai ton, les vrais USP. Les valeurs fournies sont des exemples réalistes mais Elden connaît mieux ses business.

### Étape 6 : Ajouter latitude/longitude aux sites

Pour les GeoCoordinates dans le schema.org, ajouter dans `config/sites.ts` :
```typescript
// Garage
latitude: 42.6887,
longitude: 2.8948,

// Les coordonnées exactes de chaque business
```

### Étape 7 : Tester

```bash
# Dry run avec un seul site
npx tsx src/generators/page-generator.ts --test garage perpignan vidange service

# Ou via le bot Telegram
/generate garage 1
```

Vérifier :
- [ ] JSON valide retourné
- [ ] metaTitle < 60 chars
- [ ] metaDescription < 155 chars
- [ ] seoSections ≥ 5
- [ ] FAQ ≥ 6
- [ ] Schema.org contient BreadcrumbList + LocalBusiness + FAQPage
- [ ] Pas de markdown dans la réponse

## Ajout d'un nouveau site thématique

Pour ajouter le site formation reprog :

1. Ajouter dans `config/sites.ts` :
```typescript
reprog: {
  name: 'Formation Reprog',
  domain: 'https://formation-reprog.fr',
  phone: '06 XX XX XX XX',
  // ...
}
```

2. Décommenter la section `reprog` dans `config/site-mode-registry.ts`

3. Ajouter le deploy hook Vercel dans `.env` :
```
VERCEL_HOOK_REPROG=https://api.vercel.com/v1/integrations/deploy/...
```

4. Le système génère automatiquement la matrice topic×intent et les pages correspondantes.

## Fichiers impliqués

```
config/
  sites.ts                    — EXISTANT (ajouter latitude, longitude)
  cities-66.ts                — EXISTANT (pas de changement)
  site-modes.ts               — NOUVEAU (types et interfaces)
  site-mode-registry.ts       — NOUVEAU (config brand/mode par site)

src/generators/
  page-generator.ts           — MODIFIÉ (remplacé par v2)
  page-generator.backup.ts    — BACKUP (ancien fichier)
  universal-prompt.ts         — NOUVEAU (prompt builder)
  universal-matrix.ts         — NOUVEAU (matrice universelle)
  universal-schema.ts         — NOUVEAU (schema.org adaptatif)
  city-service-matrix.ts      — DÉPRÉCIÉ (gardé pour référence)
  city-service-matrix.backup.ts — BACKUP
  templates/                  — DÉPRÉCIÉ (plus importé, gardé pour référence)
    garage.ts
    carrosserie.ts
    massage.ts
    vtc.ts
    voitures.ts
    restaurant.ts

src/keywords/
  research.ts               — DÉPRÉCIÉ (remplacé par research-v2.ts)
  research-v2.ts             — NOUVEAU (DataForSEO + fallback heuristique)
  dataforseo.ts              — NOUVEAU (client API DataForSEO)

src/linking/
  internal-links.ts           — DÉPRÉCIÉ (remplacé par cocooning.ts)
  cocooning.ts                — NOUVEAU (moteur de cocon sémantique)
```
