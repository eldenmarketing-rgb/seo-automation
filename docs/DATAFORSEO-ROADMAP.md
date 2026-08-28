# DataForSEO API — Roadmap d'intégration Dashboard SEO

> Date : 2026-04-11
> Contexte : Réseau multi-sites SEO local (artisans 66) en expansion vers e-commerce, sites nationaux, autres niches
> API utilisée actuellement : `keywords_for_keywords` uniquement
> Doc officielle : https://docs.dataforseo.com/v3/

---

## Vue d'ensemble

DataForSEO v3 = 12 familles d'API, 100+ endpoints. Pay-as-you-go, pas d'abonnement. Rate limit : 2,000 calls/min. Client libraries dispo en TypeScript, Python, PHP, Java, C#.

---

## 1. DATAFORSEO LABS — Le cœur du dashboard

Base de données propre à DataForSEO. Rapide (~2s), pas cher, riche en data.

**Formule de prix standard : $0.01/task + $0.0001/item retourné.**

### 1A. Recherche de mots-clés

| Endpoint | Ce qu'il fait | Intégration dashboard | Coût |
|----------|--------------|----------------------|------|
| **Keyword Suggestions** | Mots-clés longue traîne contenant un seed (jusqu'à 1,000 résultats) | Page recherche KW : expandre les seeds pour la matrice ville×service | $0.01 + $0.0001/kw |
| **Keyword Ideas** | Mots-clés sémantiquement liés par catégorie (plus large que suggestions) | Découverte de content gaps : KW de la même catégorie qu'on rate | $0.01 + $0.0001/kw |
| **Related Keywords** | KW depuis "recherches associées" Google, 4 niveaux de profondeur (~4,680 max) | Topic cluster builder : cartographier le champ sémantique complet d'un service | $0.01 + $0.0001/kw |
| **Keywords For Site** | KW pertinents pour un domaine (pas forcément rankés) | Lancement de nouveau site : trouver tous les KW d'une niche avant création | $0.01 + $0.0001/kw |
| **Bulk Keyword Difficulty** | Score difficulté 0-100 pour jusqu'à 1,000 KW par requête | Priorisation : filtrer les KW faciles pour des quick wins | $0.01 + $0.0001/kw |
| **Historical Search Volume** | Volume mensuel + CPC + compétition depuis 2019, jusqu'à 700 KW | Analyse saisonnalité (chauffage en hiver, clim en été) | $0.01 + $0.0001/kw |
| **Search Intent** | Classifie les KW : informationnel/navigationnel/commercial/transactionnel | Stratégie contenu : matcher type de page à l'intent | $0.001 + $0.0001/kw |

### 1B. Analyse concurrentielle

| Endpoint | Ce qu'il fait | Intégration dashboard | Coût |
|----------|--------------|----------------------|------|
| **Ranked Keywords** | Tous les KW sur lesquels un domaine/page ranke, avec positions et trafic estimé | Audit domaine : voir tous les KW de nos sites, tracking hebdo | $0.01 + $0.0001/kw |
| **Competitors Domain** | Domaines qui concurrencent sur les mêmes KW | Découverte concurrents : qui se bat contre garage-perpignan.fr ? | $0.01 + $0.0001/domaine |
| **SERP Competitors** | Pour jusqu'à 200 KW, quels domaines rankent avec scores de visibilité | Monitoring niche : qui domine "carrosserie perpignan" | $0.01 + $0.0001/domaine |
| **Domain Intersection** | KW partagés entre 2 domaines (ou que l'un a et pas l'autre) | Content gap : KW sur lesquels les concurrents rankent et pas nous | $0.01 + $0.0001/kw |
| **Page Intersection** | Même chose au niveau URL (jusqu'à 20 URLs) | Gap page par page : notre /carrosserie/ vs celle du concurrent | $0.01 + $0.0001/kw |
| **Relevant Pages** | Top pages d'un domaine par trafic/nombre de KW | Analyse concurrent : trouver leurs pages les plus performantes à répliquer | $0.01 + $0.0001/page |
| **Subdomains** | Sous-domaines avec distribution de ranking et ETV | Structure concurrent : comprendre comment ils organisent leurs sites | $0.01 + $0.0001/subdomain |

### 1C. Domaine & marché

| Endpoint | Ce qu'il fait | Intégration dashboard | Coût |
|----------|--------------|----------------------|------|
| **Domain Rank Overview** | Distribution ranking organique/payant + ETV + traffic cost | Homepage dashboard : santé globale de chaque site | $0.01 + $0.0001/item |
| **Bulk Traffic Estimation** | ETV pour jusqu'à 1,000 domaines en 1 call | Vue réseau : comparer les 6 sites + concurrents d'un coup | $0.1 + $0.001/domaine |
| **Historical Rank Overview** | Distribution ranking historique | Graphique tendance : progression mois par mois | $0.1 + $0.001/item |
| **Categories For Domain** | Catégories Google où le domaine ranke | Positionnement marché : quelles catégories chaque site domine | $0.01 + $0.0001/cat |
| **Top Searches** | Recherches tendance dans une catégorie/localisation | Détection opportunités : tendances montantes dans nos niches | $0.01 + $0.0001/item |
| **Historical SERPs** | Snapshots SERP passés pour un KW | Qui rankait pour "garage perpignan" il y a 6 mois ? | $0.0001/SERP |

---

## 2. SERP API — Scraping SERP en temps réel

Scraping live de Google, Bing, YouTube, Maps.

### Pricing

| Mode | Coût par SERP (10 résultats) |
|------|------------------------------|
| Standard Queue (~5 min) | $0.0006 |
| Priority Queue (~1 min) | $0.0012 |
| Live Mode (~6 sec) | $0.002 |

Page supplémentaire : 75% du prix de base. Search operators (site:, inurl:) : coût ×5.

### Endpoints clés

| Endpoint | Ce qu'il fait | Intégration dashboard | Coût (Live) |
|----------|--------------|----------------------|-------------|
| **Google Organic Live Regular** | Résultats organiques + payants en temps réel | Rank tracker : position exacte quotidienne | $0.002/SERP |
| **Google Organic Live Advanced** | Idem + TOUS les SERP features (knowledge graph, local pack, PAA, AI overview) | Monitoring features SERP | $0.002/SERP |
| **Google Maps** | Résultats Google Maps | SEO local : tracking positions Maps pour "garage près de moi" | $0.002/SERP |
| **Google Local Finder** | Résultats Local Finder (maps étendu) | Monitoring GBP : positions dans le pack local | $0.002/SERP |
| **Google Autocomplete** | Suggestions autocomplete Google | Découverte KW : ce que les gens tapent autour de nos services | $0.002/SERP |
| **Google AI Mode** | Résultats AI Overview de Google | Monitoring AI : nos sites apparaissent-ils dans les AI overviews ? | $0.002/SERP |

---

## 3. KEYWORDS DATA API — Data Google Ads officielle

### Pricing

| Mode | Coût par task (jusqu'à 1,000 KW) |
|------|----------------------------------|
| Standard (~1-3 heures) | $0.05 |
| Live (~7 sec) | $0.075 |

### Endpoints clés

| Endpoint | Ce qu'il fait | Intégration dashboard | Coût |
|----------|--------------|----------------------|------|
| **Search Volume** | Volume officiel Google Ads + CPC + compétition (jusqu'à 1,000 KW) | Recherche KW : volumes mensuels précis | $0.05-0.075/1000 kw |
| **Keywords For Keywords** | *(déjà utilisé)* KW liés depuis Google Ads | Expansion KW | $0.05-0.075/task |
| **Keywords For Site** | Suggestions Google Ads pour un domaine | Découverte niche : KW que Google associe au site d'un concurrent | $0.05-0.075/task |
| **Google Trends Explore** | Data Google Trends temporelle | Saisonnalité : calendrier éditorial basé sur les tendances | Variable |

> **Note :** Labs API est généralement meilleur (plus rapide, moins cher, plus de data) sauf quand on veut les volumes officiels Google.

---

## 4. BACKLINKS API — Analyse de liens

Index live crawlé en continu. **Minimum $100 de balance pour activer.**

**Prix : $0.02/requête + $0.00003/ligne retournée.**

| Endpoint | Ce qu'il fait | Intégration dashboard | Coût |
|----------|--------------|----------------------|------|
| **Summary** | Profil backlink complet : total backlinks, referring domains, rank, spam score | Homepage : santé backlinks par site (surtout CarrosserPro.fr TF10/148 RD) | $0.02/req |
| **Backlinks** | Liste détaillée de tous les backlinks (ancre, dofollow, dates) | Page audit backlinks : review chaque lien, détecter toxic links | $0.02 + $0.00003/row |
| **Competitors** | Domaines qui partagent des backlinks avec nous | Link building : sites qui linkent les concurrents mais pas nous | $0.02 + $0.00003/row |
| **Referring Domains** | Backlinks groupés par domaine référent | Vue domaine : quels domaines envoient le plus de liens | $0.02 + $0.00003/row |
| **Anchors** | Distribution des textes d'ancre | Audit ancres : détecter la sur-optimisation | $0.02 + $0.00003/row |
| **Domain Intersection** | Domaines référents partagés entre plusieurs domaines | Link gap : sites qui linkent les concurrents mais pas nous | $0.02 + $0.00003/row |
| **Timeseries New/Lost** | Suivi acquisition/perte de backlinks dans le temps | Graphique tendance : vélocité d'acquisition de liens | $0.02/req |
| **History** | Profil backlink historique | Courbe de croissance du profil de liens | $0.02/req |
| **Bulk Ranks** | Domain rank pour jusqu'à 1,000 cibles | Vue réseau : comparer l'autorité de tous les sites | $0.02 + $0.00003/row |
| **Bulk Spam Score** | Spam score pour jusqu'à 1,000 cibles | Health check : détecter les problèmes de spam | $0.02 + $0.00003/row |

---

## 5. ON-PAGE API — Audit technique

Crawler de site pour audits SEO technique. **60+ checks automatiques.**

### Pricing

| Feature | Coût par page |
|---------|--------------|
| Base crawl | $0.000125 |
| + Load resources (images, CSS, JS) | $0.000375 |
| + JavaScript execution | $0.00125 |
| + Browser rendering (Core Web Vitals) | $0.00425 |
| Instant Pages (scan page unique) | $0.000125 |

### Endpoints clés

| Endpoint | Ce qu'il fait | Intégration dashboard | Coût |
|----------|--------------|----------------------|------|
| **Crawl + Summary** | Audit complet : onpage_score (0-100), broken links, duplicate content, missing tags, redirects, SSL | Dashboard santé technique : score par site, issues critiques | $0.000125-0.00425/page |
| **Pages** | Data audit par page avec tous les checks SEO | Audit page : flagger les pages à problèmes (H1 manquant, title long, thin content) | Inclus dans crawl |
| **Duplicate Tags** | Pages avec title/description identiques | Critique pour notre matrice 42 villes (risque de titles dupliqués) | Inclus |
| **Duplicate Content** | Pages avec contenu similaire | Vérifier que les pages villes sont suffisamment uniques | Inclus |
| **Links** | Tous les liens internes et externes | Audit maillage interne : vérifier que l'injection automatique marche | Inclus |
| **Redirect Chains** | Redirections multi-hop | Post-migration : vérifier les 42 redirections 301 du garage | Inclus |
| **Instant Pages** | Scan d'une seule page sans crawl complet | Quick check après édition via /edit du bot | $0.000125/page |

**Checks effectués (60+) :** Missing H1, duplicate titles/descriptions, title trop long/court, thin content (<1024 chars), missing meta descriptions, broken links, orphan pages, missing alt tags, redirect loops, canonical issues, SSL, load time >3s, TTFB >1.5s, page size, deprecated HTML, missing favicon, etc.

---

## 6. CONTENT ANALYSIS API — Monitoring de marque

**Prix : $0.02/requête + $0.00003/ligne.**

| Endpoint | Ce qu'il fait | Intégration dashboard |
|----------|--------------|----------------------|
| **Search** | Citations d'un mot-clé/marque sur le web avec sentiment | Monitoring : mentions de "garage-perpignan.fr" ou "CarrosserPro" |
| **Sentiment Analysis** | Sentiment positif/négatif/neutre + émotions | Réputation : détecter du négatif sur nos sites |
| **Phrase Trends** | Tendances de citations dans le temps | Tracking : notre marque est-elle de plus en plus mentionnée ? |

---

## 7. APIs secondaires

| API | Ce qu'elle fait | Quand l'utiliser | Coût |
|-----|----------------|-----------------|------|
| **Merchant (Google Shopping + Amazon)** | Data produits, prix, vendeurs, reviews | Quand on lance l'e-commerce | $0.001-0.002/SERP |
| **AI Optimization** | Mentions de marque dans ChatGPT/Claude/Gemini/Perplexity | Quand la part de recherche AI grandit | Variable |
| **Business Data (GBP + Reviews)** | Fiches Google Business, avis Google/Trustpilot | Monitoring GBP pour les clients artisans | Variable |
| **Domain Analytics (Technologies + Whois)** | Stack technique + data domaine | Analyse tech stack concurrent | ~$0.01/req |

---

## Plan d'implémentation par tiers

### Tier 1 — Implémenter en premier (ROI max)

1. **Labs: Ranked Keywords** — Suivre tous les KW de chaque site
2. **Labs: Domain Rank Overview** — KPIs homepage du dashboard
3. **Labs: Bulk Traffic Estimation** — Comparer les 6 sites en 1 call
4. **Labs: Competitors Domain** — Savoir contre qui on se bat
5. **Labs: Keyword Suggestions + Ideas** — Alimenter le pipeline de contenu
6. **Labs: Bulk Keyword Difficulty** — Prioriser les KW faciles
7. **Backlinks: Summary** — Santé backlinks par site

### Tier 2 — Haute valeur

8. **Labs: Domain Intersection** — Content gap vs concurrents
9. **Labs: SERP Competitors** — Tracking visibilité par cluster de KW
10. **SERP: Google Organic Live** — Rank tracking précis des top KW
11. **On-Page: Crawl + Summary** — Audits techniques hebdo
12. **Labs: Historical Search Volume** — Planning saisonnier
13. **Backlinks: Competitors** — Opportunités link building

### Tier 3 — Nice to have

14. **Labs: Related Keywords** — Recherche approfondie de topics
15. **Content Analysis: Search** — Monitoring de marque
16. **SERP: Google Maps** — Tracking pack local
17. **Backlinks: Domain Intersection** — Link gap avancé
18. **On-Page: Duplicate Content/Tags** — Contrôle qualité matrice villes

### Tier 4 — Futur (e-commerce / expansion)

19. **Merchant: Google Shopping** — Quand on lance l'e-commerce
20. **AI Optimization: LLM Mentions** — Quand la recherche AI prend de l'ampleur
21. **Business Data: GBP** — Monitoring fiches Google des clients

---

## Estimation de coût mensuel

Pour 6 sites + 10 concurrents, usage modéré :

| Usage | Calls/mois | Coût estimé |
|-------|-----------|-------------|
| Ranked Keywords (6 sites, hebdo) | 24 | ~$8 |
| Domain Rank Overview (6 sites, hebdo) | 24 | ~$1 |
| Bulk Traffic Estimation (quotidien) | 30 | ~$3 |
| Keyword Suggestions (50 seeds/mois) | 50 | ~$5 |
| Bulk KW Difficulty (2,000 kw/mois) | 2 | ~$0.25 |
| Competitors Domain (6 sites, mensuel) | 6 | ~$1 |
| Domain Intersection (6 paires, mensuel) | 6 | ~$1 |
| Backlinks Summary (6 sites, hebdo) | 24 | ~$0.50 |
| SERP Live (200 kw, quotidien) | 6,000 | ~$12 |
| On-Page Crawl (6 sites, 200 pages, mensuel) | 6 | ~$0.50 |
| **Total estimé** | | **~$30-50/mois** |

**Comparaison :** Ahrefs $99-999/mois, SEMrush $119-449/mois, Moz $99-599/mois — avec DataForSEO on a un accès API complet et une customisation illimitée pour une fraction du prix.
