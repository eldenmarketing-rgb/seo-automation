# Plan : Dashboard SEO — De bancal à exploitable

> Date : 2026-04-13
> Objectif : Transformer le dashboard en outil de production SEO fonctionnel
> Repos concernés : seo-dashboard + seo-automation (Supabase partagé)
> Basé sur : Recherche approfondie des meilleures pratiques SEO 2025-2026

---

## Etat des lieux (données live 2026-04-13)

- 1000 clusters en "new", 0 approved, 0 generated — pipeline bloqué
- Pages publiées (carrosserie) à 30/100 de quality score — contenu vide (DANGER : scaled content abuse, Google March 2026)
- 437 clusters carrosserie non triés, dont beaucoup hors sujet (pare-brise, doublons)
- 84 conflits de cannibalisation sans actions possibles
- 0 données GSC visibles dans le dashboard
- Pas de vue détaillée/édition de page
- Pas de génération de contenu depuis le dashboard
- Pas de content brief (étape manquante entre cluster et page)
- Site "reprog" fantôme en base sans config

---

## Recherche : Faits clés qui orientent le plan

### Google 2025-2026
- March 2026 Core Update : sites avec pages quasi-identiques à faible valeur = -60 à -90% visibilité
- Seuil programmatic SEO : 60%+ contenu unique par page, 3+ sources de données, 800+ mots
- FAQPage schema ne donne plus de rich results mais aide pour AI Overviews et voice search
- AI Overviews ne touchent que ~7% des requêtes locales — le local est safe

### Content scoring industrie (Surfer SEO, Clearscope, MarketMuse)
- Score basé sur : couverture NLP des termes sémantiques du top 10 SERP (poids #1)
- + alignement word count vs top 10, structure H2/H3, densité et placement des termes
- 73% des articles scorant 80+ améliorent leur ranking en 4-8 semaines
- Le score actuel du dashboard (30/100) ne mesure que la structure, pas la qualité SEO

### Workflow industrie standard
- Keyword Research → Content Brief (basé sur analyse SERP) → Draft → Review → SEO Check → Publish → Index → Monitor
- Le brief est l'étape critique entre la recherche et la rédaction
- Ratio optimal : 80% automatisé, 20% review humaine

### Conversion locale
- CTA au-dessus du fold = +304% conversions
- CTA unique (pas multiple) = +266% conversions
- Photos avant/après = +20% d'appels
- Zéro formulaire = aligné avec les best practices

### Expansion géographique
- Sous-dossiers sur même domaine (pas de nouveaux domaines)
- Règle 70/30 : 70% template, 30% contenu unique par ville (150-250 mots min)
- Focus 15-20 villes à volume réel, pas 42 pages thin

### Ranking factors local organique (Whitespark 2026)
- On-page : 33% | Links : 24% | Behavioral : 10% | GBP : 7% (organique seulement)
- Sans GBP, le ranking organique reste accessible via on-page + links

### Content decay detection (formule standard)
- Decay Score = (Position Change × 2) + (CTR Change × 1.5) + (Impressions Change × 1)
- Clics -30% sur 2 semaines = déclin confirmé
- Position -2 spots sur requêtes 100+ impressions = perte de ranking
- Refresh trimestriel = +42% meilleurs résultats vs annuel

---

## Phase 0 — URGENCE : Régénérer les pages vides (Avant tout)

Les pages publiées à score 30/100 sont un risque immédiat de pénalité Google (scaled content abuse). À traiter AVANT d'ajouter des features.

### 0.1 Audit des pages publiées
- [ ] API route `/api/pages/audit` GET — retourne toutes les pages published avec score < 60
- [ ] Dashboard : alerte rouge sur l'overview avec nombre de pages à risque
- [ ] Détail par site : quelles pages sont vides

### 0.2 Régénération ciblée
- [ ] Script ou route pour régénérer les pages à score < 60 avec du vrai contenu
- [ ] Chaque page régénérée doit atteindre : 800+ mots, 5+ sections, 6+ FAQ, schema complet
- [ ] Validation humaine avant republication (human-in-the-loop)
- [ ] Backup de l'ancien contenu (version N-1)

**Fichiers :**
- `seo-dashboard/src/app/api/pages/audit/route.ts`
- Réutilise la route `/api/generate` de la Phase 2

---

## Phase 1 — Vue détaillée et édition des pages (Semaine 1)

### 1.1 Page détaillée `/pages/[id]`
- [ ] Nouvelle page Next.js `src/app/pages/[id]/page.tsx`
- [ ] Affiche TOUT le contenu : meta_title, meta_desc, H1, intro, seoSections, FAQ, highlights, trustSignals, internalLinks, schema_org
- [ ] Score de qualité détaillé : 10 critères avec check/cross + explication de ce qui manque
- [ ] **Word count total** affiché (alerte si < 800 mots pour service, < 400 pour ville)
- [ ] Lien vers la page live (domaine + slug)
- [ ] Bouton "Publier" / "Dépublier" individuel
- [ ] API route `src/app/api/pages/[id]/route.ts` GET pour récupérer le contenu complet

### 1.2 Edition inline des pages
- [ ] Clic sur chaque section pour éditer (meta, intro, sections, FAQ, highlights, trustSignals)
- [ ] API route `src/app/api/pages/[id]/route.ts` PATCH pour sauvegarder
- [ ] Recalcul du quality score après chaque edit
- [ ] Incrémenter `version` à chaque save
- [ ] `dateModified` mis à jour automatiquement (signal de fraîcheur pour Google)

### 1.3 Amélioration du quality score
Le score actuel (10 critères structure) est insuffisant. Ajouter :
- [ ] **Word count check** : < 400 mots = 0pts, 400-800 = 5pts, 800+ = 15pts
- [ ] **Meta description présence ET longueur** : 80-155 chars = 10pts (pas juste ≤ 155)
- [ ] **Intro longueur** : > 200 chars = 10pts (pas juste > 100)
- [ ] **Section profondeur** : chaque section > 150 mots = bonus (pas juste "existe")
- [ ] **FAQ profondeur** : chaque réponse > 60 mots = bonus (pas juste "4+ items")
- [ ] **Unique content indicator** : % de contenu unique vs autres pages du même site
- [ ] Score recalculé sur /100 avec les nouveaux critères

**Fichiers à créer :**
- `seo-dashboard/src/app/pages/[id]/page.tsx`
- `seo-dashboard/src/app/api/pages/[id]/route.ts`

**Fichiers à modifier :**
- `seo-dashboard/src/app/pages/page.tsx` (lien vers détail par clic sur slug)
- `seo-dashboard/src/app/api/pages/route.ts` (améliorer computeQualityScore)

---

## Phase 2 — Content Briefs + Génération (Semaine 1-2)

### 2.1 Content Brief (NOUVELLE ÉTAPE — industrie standard)
Le brief est l'étape entre "cluster approved" et "page generated". Il contient les instructions pour la génération, basées sur l'analyse du SERP.

- [ ] API route `/api/briefs/generate` POST — reçoit cluster_id
- [ ] Le brief contient :
  - Keyword principal + secondaires (du cluster)
  - Intent de recherche
  - Word count cible (800-1200 pour service, 400-600 pour ville)
  - Structure H2/H3 recommandée (5-7 sections)
  - Questions à couvrir (FAQ : 6 minimum, 60-120 mots/réponse)
  - Termes NLP à inclure (extraits des pages existantes qui rankent pour ce keyword)
  - Concurrents à battre (top 3 URLs si disponibles via GSC)
  - Consignes E-E-A-T : expérience locale, certifications, cas pratiques à mentionner
  - Maillage interne : pages existantes à lier
  - Schema.org : type à utiliser
- [ ] Brief sauvegardé en base (nouvelle table `content_briefs` ou champ JSONB dans `keyword_clusters`)
- [ ] Brief visible et éditable dans le dashboard avant génération
- [ ] Cluster status → 'brief' une fois le brief créé

### 2.2 Route de génération (basée sur le brief)
- [ ] API route `/api/generate` POST — reçoit brief_id ou cluster_id (génère le brief si absent)
- [ ] Construit le prompt Claude à partir du brief (pas hardcodé)
- [ ] Claude Sonnet, 8192 tokens max
- [ ] Prompt inclut :
  - Le brief complet
  - Les pages existantes du site (pour éviter la duplication)
  - Les liens internes à injecter
  - Consignes de style : "Écris comme un professionnel [métier] avec 15 ans d'expérience à [ville]"
  - Consignes E-E-A-T : mentionner des cas concrets, quartiers, landmarks locaux
- [ ] Retourne la page complète (meta, H1, intro, 5+ seoSections, 6+ FAQ, highlights, trustSignals, schema_org)
- [ ] **Validation automatique avant save** : quality score ≥ 60 pour accepter, sinon retry ou alerte
- [ ] Sauvegarde en base `seo_pages` avec status='draft'
- [ ] Cluster status → 'generated'

### 2.3 UI de génération
- [ ] Sur `/clusters` : bouton "Brief" sur chaque cluster approved → génère le brief
- [ ] Sur `/clusters` : bouton "Générer" sur chaque cluster avec brief → génère la page
- [ ] Sur la page brief : possibilité d'éditer le brief avant génération
- [ ] Loading indicator pendant la génération (~10-15s)
- [ ] Redirection vers la page détaillée `/pages/[id]` après génération
- [ ] Génération batch : sélection multiple → génère en séquence avec progress

### 2.4 Régénération de pages existantes
- [ ] Bouton "Régénérer" sur `/pages/[id]` pour les pages avec score < 60
- [ ] Garde l'ancien contenu comme backup (version N-1)
- [ ] Option : régénérer tout (contenu complet) ou juste meta/title (pour CTR)
- [ ] Régénération utilise le brief si disponible, sinon en crée un

**Fichiers à créer :**
- `seo-dashboard/src/app/api/briefs/generate/route.ts`
- `seo-dashboard/src/app/api/generate/route.ts`

**Fichiers à modifier :**
- `seo-dashboard/src/app/clusters/page.tsx` (boutons Brief + Générer)
- `seo-dashboard/src/app/pipeline/page.tsx` (boutons Brief + Générer sur les colonnes)

**Migration Supabase :**
- Ajouter table `content_briefs` OU champ `brief` JSONB dans `keyword_clusters`

---

## Phase 3 — Nettoyage et curation des clusters (Semaine 2)

### 3.1 Nettoyage IA des clusters
- [ ] API route `/api/clusters/clean` POST — envoie les clusters par batch à Claude
- [ ] Claude catégorise chaque cluster : `keep` / `merge` / `delete` / `off-topic`
- [ ] Contexte fourni à Claude : niche du site, services existants, pages existantes
- [ ] Détection des doublons : typos (repare/répare), pluriels (pare-brise/pare-brises), synonymes
- [ ] Détection hors-niche : "pare brise" ≠ carrosserie (c'est vitrier auto)
- [ ] UI : résultat affiché avec actions rapides (accepter la suggestion IA ou override)

### 3.2 Fusion de clusters
- [ ] API route `/api/clusters/merge` POST — merge 2+ clusters
- [ ] Fusionne keywords_list, somme les volumes, garde le cluster à plus fort volume comme principal
- [ ] Redirecte les références des clusters supprimés

### 3.3 Triage IA en masse avec progress
- [ ] Bouton "Trier tout" — lance le tri IA sur TOUS les clusters "new" (batch de 20)
- [ ] **Progress bar temps réel** : X/Y clusters triés
- [ ] Résumé : X approved, Y rejected, Z maybe, W off-topic
- [ ] Timeout configurable (60s par batch via `maxDuration`)

### 3.4 Filtres avancés
- [ ] Filtre par niche/pertinence (garder seulement les clusters pertinents au site)
- [ ] Filtre par volume minimum (exclure < 10 recherches/mois)
- [ ] Filtre par KD max (exclure KD > 60 sauf volume > 5000)
- [ ] Pagination (les 437 clusters saturent l'UI — 50 par page)

**Fichiers à créer :**
- `seo-dashboard/src/app/api/clusters/clean/route.ts`
- `seo-dashboard/src/app/api/clusters/merge/route.ts`

**Fichiers à modifier :**
- `seo-dashboard/src/app/clusters/page.tsx` (boutons, progress, pagination)

---

## Phase 4 — Actions sur la cannibalisation (Semaine 2)

### 4.1 Boutons d'action par conflit
- [ ] "Fusionner" — merge le contenu de 2 pages, 301 redirect la supprimée
- [ ] "Ignorer" — marque comme résolu (flag en base, ne plus afficher)
- [ ] "Différencier" — ouvre l'éditeur pour modifier l'intent/angle
- [ ] API route `/api/cannibalization/resolve` PATCH

### 4.2 Recommandations IA par conflit
- [ ] Bouton "Analyser" sur chaque conflit
- [ ] Claude analyse les 2 pages + les données GSC si disponibles
- [ ] Recommande : fusionner (quelle page garder), différencier (comment changer l'angle), ignorer (pourquoi c'est OK)

### 4.3 Cannib détectée depuis GSC (nouveau)
- [ ] Quand les données GSC sont disponibles : détecter les pages qui rankent sur les mêmes queries
- [ ] C'est plus fiable que l'overlap de tokens — c'est ce que Google voit réellement

**Fichiers à créer :**
- `seo-dashboard/src/app/api/cannibalization/resolve/route.ts`

**Fichiers à modifier :**
- `seo-dashboard/src/app/cannibalization/page.tsx` (boutons d'action + analyse IA)

---

## Phase 5 — Données GSC dans le dashboard (Semaine 2-3)

### 5.1 Page GSC `/gsc`
- [ ] Nouveau lien nav "GSC"
- [ ] Vue par site : top queries, positions moyennes, CTR, clics, impressions
- [ ] Tableau triable par position/clics/impressions/CTR
- [ ] Filtre par site + plage de positions (#1-3, #4-10, #11-20, #20+)
- [ ] **Highlight des quick wins** : pages entre position 5-15 avec impressions > 100

### 5.2 API route `/api/gsc`
- [ ] GET — récupère les données `gsc_positions` depuis Supabase
- [ ] Filtres : site_key, position min/max, date range
- [ ] Agrégation par page (position moyenne, total clics, CTR moyen)
- [ ] Tendance : comparaison derniers 30j vs 30j précédents

### 5.3 Content Decay Detection (automatisé)
- [ ] Calcul du decay score par page :
  ```
  Decay Score = (Position Change × 2) + (CTR Change × 1.5) + (Impressions Change × 1)
  ```
- [ ] Baseline : moyenne 6 mois vs derniers 30 jours
- [ ] Alertes : score > 25 = prioritaire, score > 50 = intervention immédiate
- [ ] Affichage dans `/gsc` : section "Pages en déclin" triée par decay score
- [ ] Lien direct vers "Optimiser" (régénération meta/title ciblée)

### 5.4 Lien GSC ↔ Pages
- [ ] Sur `/pages/[id]` : section GSC avec queries qui mènent à cette page, position, clics
- [ ] Sur `/gsc` : lien vers la page détaillée si elle existe en base
- [ ] Sur l'overview : top 5 pages qui montent + top 5 en déclin

### 5.5 Bouton "Optimiser" (quick wins)
- [ ] Pour les pages position 5-15 : régénère uniquement title + meta description pour CTR
- [ ] Utilise Claude avec le contexte GSC (queries à fort volume, CTR actuel)
- [ ] Prompt : "Ce page est en position X pour 'query'. Réécris le title et la meta pour maximiser le CTR. Title ≤ 60 chars, meta 80-155 chars, inclure un appel à l'action implicite."

**Fichiers à créer :**
- `seo-dashboard/src/app/gsc/page.tsx`
- `seo-dashboard/src/app/api/gsc/route.ts`

**Fichiers à modifier :**
- `seo-dashboard/src/components/Nav.tsx` (ajouter lien GSC)
- `seo-dashboard/src/app/pages/[id]/page.tsx` (section GSC)
- `seo-dashboard/src/app/api/overview/route.ts` (ajouter top movers + decliners)

---

## Phase 6 — Pipeline amélioré (Semaine 3)

### 6.1 Nouvelles étapes pipeline
Le pipeline actuel (6 étapes) devient 8 :
```
new → triaged → approved → brief → generated → review → published → indexed
```
- [ ] **review** : la page est générée mais attend la validation humaine
- [ ] **indexed** : la page est confirmée indexée par Google (via GSC ou IndexNow check)
- [ ] Couleurs distinctes par étape
- [ ] Compteurs par étape sur l'overview

### 6.2 Actions contextuelles par colonne
- [ ] Colonne "approved" → bouton "Créer Brief"
- [ ] Colonne "brief" → bouton "Générer"
- [ ] Colonne "generated" / "review" → bouton "Voir" (ouvre page détaillée) + "Publier"
- [ ] Colonne "published" → lien vers page live

### 6.3 Métriques pipeline
- [ ] Temps moyen par étape (combien de temps un cluster reste dans chaque colonne)
- [ ] Throughput : pages générées/publiées cette semaine vs semaine dernière
- [ ] Goulots d'étranglement : quelle étape a le plus d'items bloqués

**Fichiers à modifier :**
- `seo-dashboard/src/app/pipeline/page.tsx` (nouvelles colonnes + actions)
- `seo-dashboard/src/app/api/pipeline/route.ts` (nouveaux mappings de status)

---

## Phase 7 — Overview et polish (Semaine 3)

### 7.1 Overview enrichi
- [ ] Quality score moyen par site (avec alerte si < 60)
- [ ] Nombre de pages à risque (score < 40) par site — alerte rouge
- [ ] Top 5 pages qui montent (GSC) + Top 5 en déclin
- [ ] Compteur pipeline : X brief → Y generated → Z published cette semaine
- [ ] Volume total de recherche des clusters approved (potentiel non exploité)
- [ ] Retirer le site "reprog" fantôme ou l'ajouter dans SITES config

### 7.2 UX améliorations
- [ ] Bouton refresh sur chaque page (icône reload, pas F5)
- [ ] Toast notifications pour actions (publish, generate, triage, merge)
- [ ] Confirmation avant actions destructives (supprimer, dépublier)
- [ ] Pagination sur clusters et keywords (50 par page)
- [ ] Mobile responsive vérifié (pipeline Kanban en scroll horizontal OK)

### 7.3 Export
- [ ] Bouton export CSV sur les pages keywords et GSC
- [ ] Utile pour le reporting client (artisans locataires)

**Fichiers à modifier :**
- `seo-dashboard/src/app/page.tsx` (overview enrichi)
- `seo-dashboard/src/app/api/overview/route.ts` (quality scores, pipeline stats, GSC movers)
- Tous les composants (toast, refresh, pagination)

---

## Ordre d'exécution

```
Phase 0 (urgence pages vides)   ██████████  → CRITIQUE : éviter pénalité Google
Phase 1 (vue/édition pages)     ████████░░  → VOIR ce qui existe
Phase 2 (briefs + génération)   ████████░░  → PRODUIRE du vrai contenu
Phase 3 (nettoyage clusters)    ██████░░░░  → PRIORISER les bons keywords
Phase 4 (actions cannib)        ████░░░░░░  → RÉSOUDRE les conflits
Phase 5 (GSC)                   ████████░░  → MESURER la performance
Phase 6 (pipeline amélioré)     ████░░░░░░  → FLUIDIFIER le workflow
Phase 7 (overview + polish)     ████░░░░░░  → UTILISER confortablement
```

---

## Contraintes techniques

- Dashboard = Next.js 16 / React 19 / Tailwind 4 / Supabase
- Même base Supabase que seo-automation
- Claude API : Sonnet 4 (`claude-sonnet-4-20250514`) avec fallback Haiku
- Human-in-the-loop : jamais d'auto-publish, toujours validation manuelle
- Toutes les API routes en `force-dynamic`
- Pattern existant : `getSupabase()` singleton, pas d'auth (VPS local)
- Prompt de génération : adapter le system prompt pour E-E-A-T (expérience locale, cas concrets)

## Migrations Supabase nécessaires

- [ ] Table `content_briefs` (id, cluster_id, site_key, brief JSONB, created_at, updated_at)
  - OU champ `brief` JSONB dans `keyword_clusters`
- [ ] Champ `word_count` INTEGER dans `seo_pages` (calculé à la sauvegarde)
- [ ] Champ `decay_score` FLOAT dans `gsc_positions` (calculé par le weekly audit)
- [ ] Champ `resolved` BOOLEAN dans une table `cannibalization_resolutions`
- [ ] Status 'review' et 'indexed' ajoutés aux enums valides de `keyword_clusters`

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Pages vides déjà indexées par Google | Phase 0 : régénérer en urgence avec du vrai contenu |
| Duplication logique génération (dashboard vs seo-automation) | Le dashboard devient le seul point de génération. seo-automation garde les crons pour GSC sync et monitoring |
| 437 clusters saturent l'UI | Pagination + tri IA en masse |
| Coût Claude API pour génération massive | Générer par batch de 5-10 max/jour, human review chaque page |
| Contenu généré de mauvaise qualité | Quality gate ≥ 60 avant save + brief enrichi + review humaine |
| Perte de ranking sur pages régénérées | Garder le même slug/URL, améliorer le contenu sans changer la cible |

## Décisions architecturales à prendre

1. **Brief : table séparée ou champ JSONB ?** — Table séparée si on veut historiser les briefs, JSONB si on veut rester simple
2. **Génération : dashboard direct ou via seo-automation API ?** — Dashboard direct est plus simple et évite la dépendance. Le prompt sera dans le dashboard.
3. **Les crons (daily-generate, weekly-audit) continuent-ils ?** — Le weekly-audit GSC oui (alimente la BDD). Le daily-generate non (la génération devient manuelle via dashboard).
