# Invariants SEO & variables SERP — socle de rédaction

> Version : 2026-08-23 · Portée : générateur de pages du réseau (carrosserie, garage, VTC/taxi, massage à domicile, voitures d'occasion, livraison de nuit, débarras, silent disco, retraites bien-être).
> Objectif unique du réseau : **faire sonner un téléphone**. Aucun formulaire. Un seul CTA : `<a href="tel:…">`.
> Ce document est lu à chaque décision de rédaction. Il n'est pas un article : c'est une liste de contraintes.

---

## 0. Comment lire ce document

Chaque règle porte un **statut de preuve**. Le générateur doit le traiter différemment selon le statut :

| Statut | Signification | Le générateur peut… |
|---|---|---|
| **[CONFIRMÉ]** | Affirmé par une documentation Google officielle ou un porte-parole Google identifié | …l'appliquer sans discuter |
| **[OBSERVÉ]** | Étude sectorielle mesurée, corrélation, consensus de praticiens | …l'appliquer, mais ne jamais la présenter comme une règle Google |
| **[MAISON]** | Décision propre à ce réseau (modèle rank-and-rent, phone-first, droit français) | …l'appliquer sans exception : c'est contractuel ici |
| **[CONTESTÉ]** | Les sources se contredisent — la divergence est documentée dans la règle | …choisir prudemment et signaler l'incertitude, jamais trancher en silence |

**Deux catégories, et elles ne se mélangent jamais :**

- **A. LES INVARIANTS** — vrais quelle que soit la requête. Imposables au générateur, vérifiables mécaniquement.
- **B. LES VARIABLES SERP** — faux de les imposer. À observer requête par requête sur le top 10 réel.

### L'incident fondateur (à ne jamais reproduire)

Une règle de content-scoring classique avait été codée dans ce système : « une requête contenant *prix*, *tarif* ou *devis* attend une grille tarifaire ». Vérification faite sur la SERP réelle **« carrossier perpignan » : 0 concurrent sur 7 n'affiche de prix.** Sommé de produire un tableau tarifaire sans aucune source de prix, le générateur **a inventé des montants** — puis s'est contredit d'une section à l'autre dans la même page.

Trois leçons, qui structurent tout ce document :

1. Une recommandation d'outil (Surfer, SEMrush, « content score ») **n'est pas une observation de SERP**. Elle est une moyenne sur des corpus qui ne sont pas le nôtre.
2. Une contrainte de format imposée sans données disponibles **produit mécaniquement une hallucination**. Le modèle remplit le gabarit.
3. **Hiérarchie absolue :** anti-hallucination (§4) > invariants (§1) > variables SERP (§2). Si la SERP « attend » un tableau de prix et qu'aucun prix vérifié n'existe en base, **on n'écrit pas le tableau**. On ne l'invente jamais, et on ne le remplace pas par une fourchette « à titre indicatif ».

---

# 1. Catégorie A — LES INVARIANTS

Règles applicables à toute page, toute requête, toute verticale. Chacune est rédigée pour être vérifiable par un humain ou par un test automatique.

## 1.1 Intention et unicité

**INV-01 — Une page = une intention de recherche.** Une page traite une seule intention. Si deux besoins distincts apparaissent (« réparer un pare-chocs » et « combien coûte un pare-chocs »), soit ils sont deux moments de la même intention et cohabitent dans une page, soit ils justifient deux pages reliées par des liens internes. Jamais un compromis mou qui ne sert bien ni l'un ni l'autre.
*Pourquoi :* Google regroupe les pages très similaires et n'en retient qu'une comme canonique ; deux pages sur la même intention se cannibalisent et diluent les signaux au lieu de les additionner.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls

**INV-02 — La requête cible d'une page est unique dans le réseau.** Avant génération, vérifier qu'aucune page publiée du même site ne cible déjà la requête principale ni une variante quasi identique (`gsc_positions` : même requête → plusieurs URL = conflit à trancher avant d'écrire, pas après).
*Pourquoi :* même mécanique canonique ; en pratique Google choisit lui-même la page qu'il montre, et ce n'est pas toujours celle qu'on a optimisée.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls

**INV-03 — Interdiction du gabarit « ville-swap ».** Deux pages du même set (deux villes, deux services voisins) ne peuvent pas être identiques à un nom près. Chaque page doit contenir une **substance propre non transposable** : contrainte technique spécifique au service, cas d'usage réel, spécificité opérationnelle documentée. Seuil de contrôle du réseau : **≥ 60 % de contenu unique par page vis-à-vis des autres pages du même set**, mesuré sur le contenu éditorial hors boilerplate (nav, footer, bloc NAP, schema).
*Pourquoi :* Google qualifie explicitement de *doorway pages* les « sites ou pages créés pour ranker sur des requêtes spécifiques et similaires », en citant « plusieurs noms de domaine ou pages ciblant des régions ou villes spécifiques ». C'est le risque n°1 structurel d'un réseau rank-and-rent.
*Statut :* [CONFIRMÉ] (le principe) + [MAISON] (le seuil de 60 %) — https://developers.google.com/search/docs/essentials/spam-policies

**INV-04 — Pas de génération en masse sans valeur ajoutée par page.** Si, au moment de rédiger, le générateur ne dispose d'aucune matière propre à cette page (aucun fait, aucune donnée site, aucune spécificité), il **ne génère pas** : il remonte l'absence de matière comme un blocage. Une page vide générée est plus coûteuse qu'une page absente.
*Pourquoi :* le *scaled content abuse* est défini par Google comme « de nombreuses pages générées dans le but principal de manipuler le classement et non d'aider les utilisateurs » — la définition vise le motif et le résultat, pas l'outil ; l'IA n'est pas pénalisée en tant que telle.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/essentials/spam-policies

## 1.2 Balises et structure

**INV-05 — Un H1 unique par page, qui porte l'intention en toutes lettres.** Le H1 formule le besoin de l'utilisateur avec les mots qu'il emploie (« Carrosserie à Perpignan : débosselage et peinture »), pas un slogan. Il n'est dupliqué sur aucune autre page du site.
*Nuance importante :* techniquement, plusieurs H1 ne posent aucun problème à Google — Mueller : « nos systèmes n'ont pas de problème avec plusieurs titres h1 sur une page ». La règle « un seul H1 » est ici une **discipline d'unicité éditoriale et d'accessibilité**, pas une contrainte algorithmique. Ne jamais la justifier auprès d'un client par « Google l'exige ».
*Statut :* [CONFIRMÉ] pour la nuance / [MAISON] pour la règle — https://www.searchenginejournal.com/google-h1-headings-seo/328459/

**INV-06 — Une balise `<title>` unique, descriptive, non boilerplate.** Format du réseau : `[Service] [Ville] | [Nom du site]`. Interdits : répétition du même mot-clé, empilement de villes, texte identique d'une page à l'autre, « Accueil ».
*Pourquoi :* Google déclare qu'il n'existe **aucune limite de longueur** pour `<title>` (la troncature est un effet d'affichage lié à la largeur de l'écran), mais interdit explicitement le keyword stuffing et le texte répété/boilerplate — et se réserve le droit de réécrire le titre affiché si le `<title>` est mauvais.
*Corollaire :* la cible ~60 caractères du réseau est une règle de **lisibilité en SERP**, pas un facteur de classement. L'étude Whitespark 2026 classe d'ailleurs « longueur de la balise title » quasiment dernière de ses 180+ facteurs testés (rang ~184), c'est-à-dire dans ses mythes.
*Statut :* [CONFIRMÉ] + [OBSERVÉ] — https://developers.google.com/search/docs/appearance/title-link · https://whitespark.ca/local-search-ranking-factors/

**INV-07 — Une meta description unique par page, qui décrit le contenu réel.** Elle annonce le bénéfice et la zone, sans promesse invérifiable. Le générateur ne la duplique jamais et ne la remplit pas de mots-clés.
*Pourquoi :* Google construit le snippet principalement à partir du contenu de la page, et n'utilise la meta description que lorsqu'elle décrit la page **mieux** que le reste ; le snippet varie selon la requête. Ce n'est donc pas un levier de position, c'est un levier de clic.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/appearance/snippet

**INV-08 — Hiérarchie Hn cohérente et sans saut.** H2 pour les blocs principaux, H3 pour leurs subdivisions ; jamais de H3 sans H2 parent ; jamais de balise de titre utilisée pour son style. Un titre annonce ce qui suit et reste compréhensible hors contexte (lu seul dans un sommaire ou par un lecteur d'écran).
*Pourquoi :* Google utilise les titres pour comprendre la structure d'une page, mais déclare ne pas être « pointilleux » — le bénéfice réel est de scannabilité et d'accessibilité, ce qui reste décisif pour un visiteur mobile qui décide en quelques secondes d'appeler ou de repartir.
*Statut :* [CONFIRMÉ] (usage par Google) + [OBSERVÉ] (bénéfice UX) — https://www.searchenginejournal.com/google-h1-headings-seo/328459/

**INV-09 — La réponse à l'intention arrive avant le premier scroll.** Les 2 à 3 premières phrases répondent explicitement à la requête (quoi, où, pour qui), et le numéro de téléphone est visible sans défilement sur mobile. Aucune mise en bouche, aucun paragraphe d'introduction générique sur « l'importance de bien choisir son professionnel ».
*Pourquoi :* règle métier du réseau, renforcée par le contexte 2026 : les recherches locales sur mobile sont massivement zero-click (jusqu'à ~78 % des requêtes « near me » selon les données mobiles Similarweb reprises par Search Engine Land) — le visiteur qui arrive enfin sur la page a franchi un filtre coûteux, il ne doit pas attendre.
*Statut :* [MAISON] + [OBSERVÉ] — https://searchengineland.com/google-zero-click-searches-2026-study-479717

## 1.3 Profondeur sémantique et couverture d'entités

**INV-10 — Employer le vocabulaire réel du domaine, pas des synonymes forcés.** Une page carrosserie nomme les entités du métier quand elles sont pertinentes : débosselage sans peinture (DSP), pare-chocs, ailes, cabine de peinture, teinte opaque/vernie, expertise assurance, véhicule de courtoisie. Une page VTC : prise en charge, gare de Perpignan, aéroport de Perpignan-Rivesaltes, forfait, longue distance. Le critère n'est pas la fréquence, c'est la **pertinence** : si une entité n'est pas réellement traitée, elle n'est pas citée.
*Pourquoi :* Google le formule directement — la densité de mots-clés n'existe pas comme notion chez lui, mais « être explicite compte » : utiliser les mêmes termes que l'utilisateur rend la page trouvable et reconnaissable. Ce n'est pas une question de quota, c'est une question de sujet réellement traité.
*Statut :* [CONFIRMÉ] — https://www.seroundtable.com/google-search-optimal-keyword-density-34826.html

**INV-11 — Couvrir les questions que la page rend légitimes, ou ne pas ouvrir le sujet.** Une page qui parle de « réparation de pare-chocs » doit pouvoir répondre à : dans quels cas on répare plutôt qu'on remplace, ce qui change entre plastique et composite, ce que voit l'expert d'assurance. Si le générateur ne dispose pas de la matière pour traiter une sous-question, il **ne l'ouvre pas** — une section titrée qui ne répond pas est pire qu'une section absente.
*Pourquoi :* les Quality Rater Guidelines évaluent le Main Content sur « l'effort, l'originalité et la compétence » adaptés au but de la page, et sanctionnent le « manque de soin » ; une section creuse est exactement ce signal.
*Statut :* [CONFIRMÉ] — https://services.google.com/fh/files/misc/hsw-sqrg.pdf

**INV-12 — [CONTESTÉ] L'« autorité topique » n'est pas une métrique à optimiser.** Le générateur ne doit pas produire des pages satellites dans le seul but de « compléter un cluster ». Chaque page se justifie par une demande réelle (requête GSC prouvée, ou mot-clé validé humainement), pas par une case vide dans une carte sémantique.
*Divergence explicite :* une partie de l'industrie SEO (Koray Tuğberk Gübür, écoles du *topical map*) considère la couverture exhaustive d'un domaine comme un levier de premier ordre ; John Mueller a validé publiquement l'analyse inverse, selon laquelle « topical authority » est une étiquette posée sur de bonnes pratiques anciennes, sans score correspondant chez Google. Les deux camps produisent des résultats — probablement parce que la couverture exhaustive **corrèle** avec « répondre réellement aux besoins », sans en être la cause. Position du réseau : couvrir par nécessité, jamais par complétude décorative.
*Statut :* [CONTESTÉ] — https://www.searchenginejournal.com/google-on-topical-authority-dont-worry-about-it/501209/

## 1.4 E-E-A-T et confiance

**INV-13 — Ne jamais affirmer un fait invérifiable. Règle mère du système.** Toute affirmation factuelle d'une page doit être traçable à une source du système : `site_profiles`, `bot_settings`, une fiche produit en base, un document fourni par le locataire. En l'absence de source : **on n'écrit pas la phrase** — on ne l'atténue pas, on ne la met pas au conditionnel, on ne la remplace pas par une formulation vague. Détail opérationnel en §4.
*Pourquoi :* les Quality Rater Guidelines placent la **confiance (Trust)** au centre de E-E-A-T — la documentation Google est explicite : « trust is most important », les autres composantes n'existent que pour l'alimenter. Une inexactitude vérifiable détruit la confiance de toute la page, pas seulement de la phrase.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/fundamentals/creating-helpful-content

**INV-14 — Le « qui » est identifiable sur chaque page.** Nom de l'entreprise exploitante, adresse ou zone d'intervention, téléphone, et un lien vers des mentions légales complètes accessibles depuis toutes les pages (dénomination, adresse, SIREN/RCS, statut, hébergeur).
*Pourquoi :* double contrainte. (1) Google demande de clarifier « Qui, Comment, Pourquoi » — qui a produit le contenu et qui est responsable du site. (2) En France, les mentions légales sont **obligatoires** pour tout site professionnel ; leur absence expose à des sanctions pénales lourdes.
*Statut :* [CONFIRMÉ] + obligation légale — https://developers.google.com/search/docs/fundamentals/creating-helpful-content · https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter

**INV-15 — Le « comment » de la prestation remplace les superlatifs.** Écrire le processus concret (ce qui se passe à l'appel, comment le diagnostic se fait, ce qu'on demande au client d'apporter, ce qui déclenche un devis) plutôt que des qualificatifs (« expert », « leader », « le meilleur »). Le processus est descriptible sans mentir ; le superlatif ne l'est pas.
*Pourquoi :* c'est la forme rédactionnelle de l'« Experience » d'E-E-A-T : montrer une connaissance de première main du métier. Les QRG valorisent l'effort et la compétence visibles dans le Main Content.
*Statut :* [CONFIRMÉ] — https://services.google.com/fh/files/misc/hsw-sqrg.pdf

**INV-16 — Rappeler l'incertitude quand elle existe.** Quand une réponse dépend du cas (« ça dépend de l'ampleur du choc », « selon la pièce et la teinte »), le dire franchement et enchaîner sur l'appel : c'est précisément la fonction du téléphone dans ce modèle. Une incertitude assumée est un argument de conversion, pas une faiblesse.
*Statut :* [MAISON]

## 1.5 Données structurées

**INV-17 — Le JSON-LD ne décrit que ce que la page affiche.** Toute propriété du schema doit avoir sa contrepartie visible en HTML. Interdit : `aggregateRating` sans avis réellement affichés et vérifiés, `priceRange` sans base tarifaire, `openingHours` inventés, `areaServed` plus large que la zone réellement desservie.
*Pourquoi :* règle Google formelle : « Ne balisez pas du contenu qui n'est pas visible pour les lecteurs de la page » et « vos données structurées doivent être une représentation fidèle du contenu de la page » ; la violation expose à une action manuelle.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/appearance/structured-data/sd-policies

**INV-18 — Type métier + `Service` sur les pages service.** Le type de premier niveau vient de `site_profiles.schema_type` (AutoRepair, AutoBodyShop, TaxiService, HealthAndBeautyBusiness, AutoDealer, Restaurant). Propriétés requises minimales pour un LocalBusiness : `name` et `address`. Recommandées et à remplir quand la donnée existe réellement : `telephone`, `url`, `geo`, `openingHoursSpecification`, `areaServed`.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/appearance/structured-data/local-business

**INV-19 — Le balisage `FAQPage` n'apporte plus de rich result. Ne pas construire une page autour de lui.** Google a restreint les rich results FAQ aux sites gouvernementaux et de santé faisant autorité en août 2023, puis les a **entièrement dépréciés le 7 mai 2026**. Conserver le balisage existant est sans risque (les données structurées inutilisées ne posent pas de problème, et le type reste valide pour d'autres consommateurs : Bing, crawlers RAG), mais **aucune FAQ ne doit être ajoutée pour obtenir un affichage enrichi** — ce motif n'existe plus.
*Conséquence directe :* la présence et la taille d'une FAQ deviennent une pure variable SERP (§2.3), plus jamais un réflexe.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/blog/2023/08/howto-faq-changes · https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/

## 1.6 Maillage interne et cocon

**INV-20 — Tout lien est un `<a href>` crawlable.** Pas de lien porté par un `onclick`, un `<span>` ou un composant JS sans href. Google déclare explicitement ne suivre que les éléments `<a>` munis d'un `href`.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/crawling-indexing/links-crawlable

**INV-21 — Ancre descriptive, jamais « cliquez ici », jamais l'URL brute.** L'ancre décrit la page de destination et reste concise. Elle varie naturellement d'une occurrence à l'autre (exacte, partielle, sémantique) au lieu de répéter la même chaîne.
*Pourquoi :* Google : une bonne ancre est « descriptive, raisonnablement concise et pertinente à la fois pour la page qui la porte et pour la page visée » ; soigner les ancres internes aide Google et les visiteurs à comprendre le site.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/crawling-indexing/links-crawlable

**INV-22 — Aucune page orpheline ; chaque page reçoit au moins un lien éditorial interne.** Le cocon du réseau : pilier → cluster → feuille, avec remontée systématique feuille → pilier. Une page publiée sans lien entrant éditorial est un défaut de génération, pas une variante acceptable.
*Pourquoi :* Google : « chaque page qui compte pour vous devrait avoir un lien depuis au moins une autre page de votre site ».
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/crawling-indexing/links-crawlable

**INV-23 — Ne jamais lier vers une URL qui n'existe pas encore.** Le générateur ne pose un lien interne que vers une page dont l'URL est publiée et vérifiée (crawl à l'appui). Un lien vers une page fantôme casse la confiance du crawl et celle du visiteur.
*Statut :* [MAISON]

**INV-24 — Profondeur de clic ≤ 3 depuis l'accueil pour toute page monétisable.** Au-delà, la page est structurellement mal reliée : ajouter un point d'entrée dans un hub ou dans le pilier concerné plutôt que d'espérer une découverte par sitemap.
*Statut :* [OBSERVÉ] (consensus de praticiens, non affirmé par Google comme seuil)

## 1.7 Fraîcheur

**INV-25 — La date affichée ne change que si le contenu a réellement changé de fond.** Corriger une coquille, changer une image ou remplacer « 2025 » par « 2026 » ne justifie pas une nouvelle date. Ajouter une information substantielle, corriger un fait ou réécrire une section le justifie.
*Pourquoi :* Google demande de ne pas « rafraîchir artificiellement » une page sans ajout significatif ; Mueller : « changer la date sans rien faire d'autre, c'est du bruit inutile ».
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/blog/2019/03/help-google-search-know-best-date-for

**INV-26 — Une seule date claire par page, cohérente entre le visible et le structuré.** Pas de date de publication en haut, date de mise à jour en bas et `dateModified` du JSON-LD qui dit une troisième chose.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/blog/2019/03/help-google-search-know-best-date-for

## 1.8 Lisibilité, accessibilité, performance

**INV-27 — Phrases courtes, paragraphes de 2 à 4 lignes, pas de mur de texte.** Sous-titres tous les 150 à 250 mots environ pour permettre le scan mobile. Ce n'est pas un facteur de classement, c'est la condition pour que la page soit lue jusqu'au numéro.
*Statut :* [OBSERVÉ] — l'étude Whitespark 2026 insiste sur « du contenu clair, concis, de qualité » et sur l'évitement des « murs de texte » pour le référencement local organique — https://whitespark.ca/local-search-ranking-factors/

**INV-28 — Le lien téléphone est un vrai lien, cliquable et atteignable au pouce.** `<a href="tel:+33…">`, cible d'au moins 24 × 24 px CSS (WCAG 2.2 SC 2.5.8, niveau AA — l'exception « inline » ne s'applique qu'aux liens dans une phrase, pas à un bouton d'appel), contraste conforme, numéro écrit en clair dans le texte du lien (pas seulement dans une image ou une icône).
*Pourquoi :* accessibilité obligatoire et conversion : un bouton d'appel trop petit est un appel perdu, et le numéro en texte reste copiable et lisible par les assistants.
*Statut :* [CONFIRMÉ] (norme) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

**INV-29 — Toute image porte un `alt` descriptif et des dimensions réservées.** L'`alt` décrit l'image, il n'est pas un emplacement à mots-clés. Les dimensions explicites (width/height ou ratio CSS) évitent le décalage de mise en page.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/essentials

**INV-30 — Budgets Core Web Vitals : LCP < 2,5 s, INP < 200 ms, CLS < 0,1, mesurés sur mobile.** INP a remplacé FID en mars 2024 ; le seuil « bon » est 200 ms. Ces métriques font partie des signaux d'expérience de page utilisés par Google, mais restent secondaires face à la pertinence du contenu — un contenu médiocre et rapide ne rank pas.
*Statut :* [CONFIRMÉ] — https://developers.google.com/search/docs/appearance/core-web-vitals

## 1.9 SEO local — invariants

**INV-31 — NAP strictement identique partout.** Nom, adresse, téléphone rigoureusement à l'octet près entre le site, le Google Business Profile et chaque citation/annuaire : même forme juridique, même abréviation de voie, même format de numéro. Source unique de vérité : `site_profiles` / `bot_settings`. Aucune variation « esthétique » d'une page à l'autre.
*Pourquoi :* la cohérence des citations pèse encore explicitement dans les études de facteurs locaux (~7 % du poids du pack local chez Whitespark 2026), et trois des cinq premiers facteurs de visibilité en recherche IA y sont liés aux citations.
*Statut :* [OBSERVÉ] — https://whitespark.ca/local-search-ranking-factors/

**INV-32 — Une page dédiée par service, c'est le facteur on-page local n°1.** Whitespark 2026 place « Dedicated Page for Each Service » **en tête des facteurs du local organique** (devant la pertinence géographique et les liens entrants). La stratégie du réseau — pages service suffixées `-perpignan`, pages ville supprimées sur carrosserie/garage — est alignée avec cette donnée, pas contre elle.
*Statut :* [OBSERVÉ] — https://whitespark.ca/local-search-ranking-factors/

**INV-33 — La zone desservie est déclarée et réaliste.** La page nomme la zone réellement couverte (ville + communes desservies existantes du 66) et ne promet pas une couverture que le locataire ne peut pas assurer. Le `areaServed` du schema reflète exactement cette zone. Google recommande de ne pas étendre une zone de service au-delà d'environ 2 heures de route depuis la base.
*Statut :* [CONFIRMÉ] — https://support.google.com/business/answer/3038177

**INV-34 — Le nom d'établissement ne contient pas de mots-clés.** Ni sur le GBP, ni dans le NAP du site : le nom doit refléter le nom réel utilisé sur la devanture, le site et les documents. « Carrosserie Untel » et non « Carrosserie Perpignan pas cher réparation rapide ». Le bourrage du champ nom est une cause classique de suspension de fiche — et une fiche suspendue coûte plus cher que tout gain de position.
*Statut :* [CONFIRMÉ] — https://support.google.com/business/answer/3038177

**INV-35 — Une seule fiche GBP par établissement, un numéro tracké par locataire.** Pas de fiche par ville pour une même adresse : Google impose une fiche unique pour le bureau central avec une zone de service définie. Le numéro tracké reste unique et cohérent partout où il apparaît (voir INV-31).
*Statut :* [CONFIRMÉ] — https://support.google.com/business/answer/3038177

---

# 2. Catégorie B — CE QUI DÉPEND DE LA SERP

Rien de ce qui suit ne doit être imposé par le générateur. Chaque élément s'observe sur le **top 10 réel de la requête cible**, avant rédaction, et la décision se prend au seuil indiqué.

## 2.0 Protocole d'observation (commun à toutes les variables)

1. Requête exécutée **en français, géolocalisée sur la ville cible**, sur mobile de préférence (c'est le terrain réel de ces niches).
2. Corpus = les **10 premiers résultats organiques**. Exclure : Google Business Profile / pack local, résultats sponsorisés, AI Overview, et les agrégateurs/annuaires structurellement inimitables (Pages Jaunes, Yelp, Doctolib, plateformes de mise en relation). Si le corpus retenu tombe sous **5 résultats exploitables**, considérer la SERP comme **non concluante** : appliquer les invariants seuls et ne rien imposer.
3. Pour chaque résultat retenu, relever mécaniquement : type de page, nombre de mots du contenu éditorial, présence d'un tableau, présence d'une FAQ (+ nombre de questions), nombre de H2, présence d'un prix affiché, présence de médias.
4. Appliquer la grille de décision commune ci-dessous.

**Grille de décision commune (fraction du corpus exploitable) :**

| Fréquence observée | Statut de l'élément | Consigne au générateur |
|---|---|---|
| **≥ 70 %** | **Attendu** | À inclure — sauf si la donnée nécessaire n'existe pas (§4 l'emporte : on omet, on n'invente pas) |
| **40 – 69 %** | **Optionnel** | À inclure seulement si on a une matière réelle et supérieure à celle des concurrents |
| **≤ 30 %** | **Non attendu** | Ne pas inclure. Ajouter cet élément ne différencie pas, il dilue |

**Règle de l'écart de format :** quand un élément est non attendu (≤ 30 %) mais qu'on dispose d'une matière réelle et solide, l'inclure est une **hypothèse de différenciation** — jamais un automatisme. Elle se journalise et se mesure (backlog + `seo_measurements`), elle ne se généralise pas au reste du réseau tant qu'elle n'a pas produit un résultat.

## 2.1 Longueur du contenu

- **À observer :** nombre de mots du contenu éditorial (hors nav, footer, mentions, boilerplate) de chaque page du corpus. Retenir la **médiane** et l'intervalle interquartile.
- **Seuil de décision :** viser entre la **médiane et le 75e percentile** du corpus. En dessous de la médiane, la page a un risque de couverture insuffisante ; au-dessus du 75e percentile, on paie du délayage sans gain.
- **Interdit :** appliquer un minimum universel (« 800 mots minimum ») là où la SERP est courte, ou allonger pour atteindre un quota. Le minimum de 800 mots hérité de la stratégie du réseau est un **repère de départ pour une page service concurrentielle**, pas une règle de classement.
- **Pourquoi :** Google est catégorique — « nous n'avons pas de facteur de classement qui compte les mots d'une page » (Mueller), et Danny Sullivan : le nombre de mots idéal « n'existe pas ». Ce qui corrèle avec la longueur, c'est la couverture de l'intention, pas la longueur elle-même.
- *Statut :* [CONFIRMÉ] — https://www.searchenginejournal.com/word-count-not-a-quality-factor/397288/

## 2.2 Présence d'un tableau

- **À observer :** combien de pages du corpus présentent un tableau comparatif ou récapitulatif, et **ce qu'il compare** (options techniques, délais, matériaux, formules).
- **Seuil :** grille commune. ≥ 70 % → tableau attendu ; ≤ 30 % → pas de tableau.
- **Condition bloquante :** un tableau ne se génère **que si chaque cellule a une source**. Un tableau à moitié rempli de « nous consulter » est un aveu de vide et abîme la page.
- *Statut :* [OBSERVÉ] — méthode d'analyse de SERP : https://www.abondance.com/20251218-1738655-serp-analyse-technique-comment-lire-les-signaux-concurrentiels-au-dela-du-volume-de-recherche.html

## 2.3 Présence et taille d'une FAQ

- **À observer :** (a) combien de pages du corpus portent une FAQ et avec combien de questions ; (b) le bloc **« Autres questions posées » / People Also Ask** est-il présent dans la SERP, et quelles questions contient-il ?
- **Seuil :** ≥ 70 % de FAQ dans le corpus → FAQ attendue, calibrée sur le **nombre médian de questions observé** (typiquement 3 à 6). Entre 40 et 69 % → FAQ seulement si le PAA révèle des questions qu'on peut réellement traiter. ≤ 30 % → pas de FAQ.
- **Ce qui a changé :** avant août 2023, une FAQ se justifiait pour occuper de l'espace en SERP via le rich result. **Ce motif est mort** (INV-19). Une FAQ ne se justifie plus que si elle répond à de vraies questions résiduelles du visiteur — donc si elle rapproche de l'appel.
- **Interdit :** la FAQ « de remplissage » qui reformule le corps de la page en questions.
- *Statut :* [CONFIRMÉ] pour la dépréciation — https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/

## 2.4 Format de page (guide vs page service vs comparatif vs liste)

- **À observer :** classer chaque résultat du corpus dans : page service/commerciale, guide informationnel, comparatif, annuaire/liste, page produit, vidéo.
- **Seuil :** un format ≥ 60 % du corpus = **intention stabilisée**, s'y conformer. Aucun format ≥ 40 % = **SERP mixte** : choisir un format principal (celui qui sert l'appel : la page service) et traiter les autres intentions en sections secondaires courtes, pas en pages séparées.
- **Signal à ne pas rater :** si le corpus est dominé par des guides informationnels et que la requête contient pourtant une ville, l'intention commerciale est probablement captée par le pack local et non par l'organique. La bonne action est alors le **GBP**, pas une nouvelle page (voir §3).
- *Statut :* [OBSERVÉ] — https://www.abondance.com/20251218-1738655-serp-analyse-technique-comment-lire-les-signaux-concurrentiels-au-dela-du-volume-de-recherche.html

## 2.5 Profondeur de la structure

- **À observer :** nombre de H2 et présence de H3 dans le corpus.
- **Seuil :** aligner le nombre de sections principales sur la **médiane du corpus ±2**. Ne descendre en H3 que si la médiane du corpus en contient — une arborescence à quatre niveaux sur une SERP plate signale une page sur-structurée et sous-nourrie.
- *Statut :* [OBSERVÉ]

## 2.6 Présence de prix

- **À observer :** compter les pages du corpus qui affichent un **montant réel** (tarif, forfait, fourchette chiffrée). « Devis gratuit » n'est pas un prix et ne compte pas.
- **Seuil :** ≥ 70 % → un élément de prix est attendu **et n'est écrit que si la base contient des tarifs sourcés du locataire**. 31–69 % → optionnel, même condition. ≤ 30 % → **ne rien écrire sur les prix**, quel que soit le mot-clé de la requête.
- **La règle qui prime sur tout :** l'absence de source tarifaire **interdit** l'écriture d'un prix, même quand 100 % de la SERP en affiche. Dans ce cas, l'action correcte est de **remonter le besoin** (« obtenir la grille tarifaire du locataire ») dans le backlog, et de publier la page sans section prix.
- **Le cas fondateur, à garder en mémoire :** SERP « carrossier perpignan », **0/7 concurrent n'affiche de prix**, alors même que les outils de content-scoring réclamaient une grille tarifaire. La SERP avait raison, l'outil avait tort.
- *Statut :* [MAISON], sur mesure de SERP réelle

## 2.7 Médias (photos, vidéo, avant/après)

- **À observer :** présence de photos de réalisations réelles, de vidéo, de galeries avant/après dans le corpus.
- **Seuil :** grille commune, avec une contrainte propre : **aucune image de banque d'images présentée comme une réalisation du professionnel**. Sans photo réelle disponible, on n'ouvre pas de section « nos réalisations » (voir §4).
- *Statut :* [MAISON]

---

# 3. SEO local et génération d'appels

## 3.1 Ce qui fait ranker localement (et ce que la page peut vraiment influencer)

Google décrit trois facteurs pour les résultats locaux : **pertinence**, **distance**, **notoriété** (« combien de sites renvoient vers votre établissement et combien d'avis vous avez ») — et précise qu'aucun classement local ne peut être acheté ni demandé.
https://support.google.com/business/answer/7091

Les mesures sectorielles en donnent les poids relatifs (Whitespark 2026) :

| Levier | Poids relatif | La page web peut-elle agir dessus ? |
|---|---|---|
| Catégorie principale du GBP | facteur n°1 du pack local | **Non** — action GBP |
| Proximité du chercheur | facteur n°2 | **Non** — structurel |
| Mots-clés dans le nom d'établissement | facteur n°3 | **Non**, et ne pas y toucher (INV-34) |
| Avis (volume, note, **récence**) | ~16–20 % | **Non** — action locataire |
| Page dédiée par service | **n°1 du local organique** | **Oui** — c'est le cœur du travail |
| Pertinence géographique du contenu | n°2 du local organique | **Oui** |
| Liens entrants de qualité | n°3 du local organique | **Oui** — module backlinks |
| Cohérence des citations / NAP | ~7 % | **Oui** — via INV-31 |

**Conséquence opérationnelle, à intégrer aux décisions de backlog :** sur une requête où le pack local domine, **écrire une page de plus ne fera pas décoller les appels**. La page joue le local organique et alimente la pertinence ; le pack se gagne par la catégorie GBP, les avis et la proximité — leviers qui appartiennent au locataire. Ne jamais vendre une page comme la solution à un problème de pack local.
https://whitespark.ca/local-search-ranking-factors/

## 3.2 Ce qui fait qu'une page locale convertit en appel

Règles [MAISON], dérivées du modèle phone-first — à respecter sans dépendre de la SERP :

1. **Numéro visible sans scroll, sur mobile, sur toutes les pages.** C'est la règle non négociable du réseau.
2. **Le numéro est répété aux moments de décision**, pas de manière ornementale : après la description du service, après la réponse à une objection, en fin de page. Trois à quatre occurrences suffisent.
3. **Une raison d'appeler maintenant, honnête.** « On vous dit en deux minutes si ça se répare ou si ça se remplace » est un motif d'appel vérifiable. « Intervention en 24 h garantie » ne l'est que si le locataire s'y engage par écrit (§4).
4. **Lever l'objection avant le clic :** ce qui se passe pendant l'appel, ce qu'on demandera (modèle, plaque, photos), si c'est gratuit, si le professionnel se déplace. L'appel est intimidant ; on le désamorce.
5. **Zéro formulaire, zéro chat, zéro widget tiers.** Toute alternative au téléphone détourne un appel. Règle contractuelle du réseau.
6. **Un numéro tracké unique par locataire et par site.** Sinon l'attribution est perdue et la valeur locative devient indémontrable.

*Note sur les statistiques d'appel :* les chiffres qui circulent (« 60 % des chercheurs mobiles appellent », « X % des appels convertissent ») viennent d'éditeurs de call tracking qui vendent la conclusion — Invoca, AvidTrak, Nextiva. Les ordres de grandeur (les appels convertissent nettement mieux que les formulaires sur les métiers de service) sont cohérents entre sources, mais **aucun chiffre précis n'est à publier sur une page du réseau**. Référence de contexte, non de citation : https://invoca.com/reports/the-invoca-call-conversion-industry-benchmarks-report-2025

## 3.3 Rôle réel du GBP par rapport à la page

- Le GBP est ce qui capte la **requête d'action immédiate** (« carrossier perpignan » sur mobile) : appel direct depuis la SERP, itinéraire, horaires, avis. La page ne le remplacera jamais.
- La page capte l'**avant-décision** : le visiteur qui compare, qui cherche à comprendre son problème, qui veut savoir si c'est réparable — et qui appelle ensuite.
- **Ils s'alimentent :** la cohérence NAP page ↔ GBP, la correspondance entre les services de la page et les *Predefined Services* de la fiche (facteur en très forte progression en 2026 chez Whitespark), et les liens vers la page depuis les citations.
- **Ce que la page ne doit jamais faire :** afficher des avis ou une note qui ne proviennent pas de la fiche réelle, ou une adresse différente de celle de la fiche. Une incohérence NAP dégrade les deux à la fois.
- En contexte 2026, la part de recherches locales qui se résolvent sans clic est élevée (jusqu'à ~78 % sur les requêtes « near me » selon les données mobiles reprises par Search Engine Land). **La conséquence n'est pas d'écrire davantage, c'est de soigner ce que Google affiche sans clic** — donc le GBP — et de rendre la page décisive pour la fraction qui clique encore.
https://searchengineland.com/google-zero-click-searches-2026-study-479717

---

# 4. Anti-hallucination — le garde-fou principal

## 4.1 La règle

**Aucune affirmation factuelle ne s'écrit sans source vérifiée dans le système.** Sources admissibles, et elles seules :
`site_profiles` · `bot_settings` · une fiche produit/véhicule en base · un document écrit fourni par le locataire et archivé · un fait vérifiable publiquement et cité.

**Ce n'est pas une source :** la plausibilité, l'usage du secteur, ce que font les concurrents, une moyenne de marché, un « généralement ». Si la donnée manque, deux issues seulement : **omettre la phrase**, ou **remonter un blocage** dans le backlog pour obtenir la donnée. Jamais une troisième voie rédactionnelle.

## 4.2 Liste noire — à ne jamais écrire sans source vérifiée

| # | Affirmation interdite | Exemples de formulations à bannir | Pourquoi c'est grave |
|---|---|---|---|
| 1 | **Années d'expérience / ancienneté** | « 15 ans d'expérience », « depuis 2008 », « entreprise familiale depuis trois générations » | Vérifiable en une requête au registre du commerce ; faux = pratique commerciale trompeuse |
| 2 | **Nombre d'avis / note moyenne** | « 4,8/5 sur 120 avis », « plus de 500 clients satisfaits » | Publier un avis ou une note fictive est une **pratique commerciale trompeuse en toutes circonstances** au sens du code de la consommation ; jusqu'à 5 ans d'emprisonnement et 750 000 € d'amende quand c'est commis en ligne, plafond pouvant atteindre 10 % du CA. La DGCCRF automatise la détection (outil « Polygraphe »). |
| 3 | **Certifications, agréments, labels** | « agréé toutes assurances », « certifié RGE », « label Qualibat », « agréé constructeur » | Usurpation de qualification ; risque juridique direct pour le locataire |
| 4 | **Prix, tarifs, fourchettes** | « à partir de 150 € », « entre 300 et 600 € », « le moins cher de Perpignan » | Le cas fondateur de ce document (§0). Prix inventé = contradiction interne + engagement commercial impossible à tenir |
| 5 | **Délais garantis** | « intervention en 24 h », « devis sous 2 h », « réparé en 48 h chrono » | Promesse contractuelle prise au nom d'un tiers |
| 6 | **Garanties** | « garantie 5 ans pièces et main-d'œuvre », « satisfait ou remboursé » | Idem — engagement juridique |
| 7 | **Cas clients, témoignages, réalisations** | « Marc, de Canet, nous a confié sa Clio… » | Faux témoignage = faux avis (voir ligne 2) |
| 8 | **Noms de quartiers, rues, lieux-dits** | « nous intervenons au Vernet, à Saint-Assiscle, au Moulin-à-Vent » | Une erreur de géographie locale est immédiatement repérée par un habitant et détruit la crédibilité de la page. **N'écrire que les communes présentes dans `cities-66.ts`** et les lieux vérifiés. |
| 9 | **Effectifs, matériel, locaux** | « notre équipe de 12 techniciens », « notre cabine de peinture dernière génération », « 800 m² d'atelier » | Invérifiable, et démenti par la première visite |
| 10 | **Partenariats et marques** | « partenaire officiel Renault », « centre agréé Peugeot » | Usage non autorisé de marque |
| 11 | **Chiffres de marché, statistiques** | « 80 % des chocs sont réparables », « selon une étude, … » | Statistique sans source = invention ; si une source existe, la citer, sinon supprimer |
| 12 | **Superlatifs de position** | « n°1 à Perpignan », « le plus grand du département », « leader régional » | Allégation de supériorité invérifiable |
| 13 | **Disponibilité** | « 7j/7 24h/24 », « ouvert le dimanche » | À prendre exclusivement dans `bot_settings.horaires` ; une fausse disponibilité produit un appel perdu **et** un avis négatif |
| 14 | **Zone d'intervention** | toute commune non listée dans la zone déclarée | Contredit INV-33 et le `areaServed` du schema |

Sources : https://signal.conso.gouv.fr/fr/actualites/faux-avis · https://www.economie.gouv.fr/particuliers/mes-droits-conso/bien-consommer/peut-faire-confiance-aux-avis-en-ligne · https://developers.google.com/search/docs/fundamentals/creating-helpful-content

## 4.3 Formulations de repli autorisées

Quand une donnée manque, il existe des tournures **vraies** qui conservent la force de conversion :

| Au lieu de… | Écrire… |
|---|---|
| « À partir de 150 € » | « Le coût dépend de l'étendue du choc et de la teinte : le diagnostic au téléphone permet de le situer. » |
| « Intervention en 24 h » | « Appelez pour connaître les disponibilités de la semaine. » |
| « 15 ans d'expérience » | *(rien)* — ou décrire le **processus** de travail (INV-15), qui n'exige aucune source externe |
| « Agréé toutes assurances » | « Le dossier d'expertise se prépare avec vous : demandez comment ça se passe au téléphone. » |
| « 4,8/5 sur 120 avis » | *(rien sur la page)* — les avis vivent sur le GBP, pas dans un bloc HTML rédigé |

## 4.4 Contrôle avant publication

Refuser la publication si l'un de ces tests échoue :
1. **Test du chiffre :** tout nombre de la page (montant, durée, quantité, note, année, effectif) est-il traçable à une source du §4.1 ? Les nombres purement descriptifs (« 3 étapes ») sont exemptés.
2. **Test de la promesse :** toute phrase qui engage le locataire (délai, garantie, disponibilité, prix) est-elle adossée à un écrit ?
3. **Test du toponyme :** tout lieu cité existe-t-il dans `cities-66.ts` ou dans une liste vérifiée ?
4. **Test de cohérence interne :** deux sections de la page se contredisent-elles ? (c'est le symptôme observé lors de l'incident fondateur)
5. **Test du schema :** chaque propriété du JSON-LD a-t-elle sa contrepartie visible dans le HTML ? (INV-17)

---

# 5. Ce qui ne marche plus

Pratiques encore répandues — y compris dans des outils payants — devenues inutiles ou nuisibles.

| Pratique | Verdict | Source / statut |
|---|---|---|
| **Densité de mots-clés** (viser X % d'occurrences) | Mort. Google : « Google n'a pas de notion de densité de mots-clés optimale » — position répétée depuis plus de dix ans. Poussée à l'excès, c'est du keyword stuffing, explicitement listé dans les règles anti-spam. | [CONFIRMÉ] https://www.seroundtable.com/google-search-optimal-keyword-density-34826.html · https://developers.google.com/search/docs/essentials/spam-policies |
| **Écrire long pour être long** | Mort. « Nous n'avons pas de facteur de classement qui compte les mots d'une page » (Mueller) ; « le nombre de mots idéal… n'existe pas » (Danny Sullivan). Le délayage dégrade l'expérience et n'ajoute aucun signal. | [CONFIRMÉ] https://www.searchenginejournal.com/word-count-not-a-quality-factor/397288/ |
| **Le « texte SEO » en bas de page** (pavé sous le footer, souvent replié ou en petit) | Mort et risqué. Du contenu placé pour les moteurs et non pour les visiteurs relève au mieux du remplissage, au pire du texte caché — que Google définit comme du contenu placé « uniquement pour manipuler les moteurs de recherche et non pour être facilement visible par les visiteurs humains ». Si un contenu mérite d'exister, il mérite d'être dans le corps de page. | [CONFIRMÉ] https://developers.google.com/search/docs/essentials/spam-policies |
| **Ajouter une FAQ pour le rich result** | Mort depuis le 7 mai 2026 (dépréciation totale, après la restriction d'août 2023 aux sites gouvernementaux et de santé). Le balisage existant peut rester ; la motivation, elle, a disparu. | [CONFIRMÉ] https://developers.google.com/search/blog/2023/08/howto-faq-changes · https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/ |
| **Une page par ville en dupliquant le contenu** | Mort et dangereux. C'est la définition même du doorway page chez Google — « plusieurs domaines ou pages ciblant des régions ou villes spécifiques ». Décision déjà actée dans ce réseau : pages ville supprimées et redirigées en 301 sur carrosserie et garage. | [CONFIRMÉ] https://developers.google.com/search/docs/essentials/spam-policies |
| **Changer la date pour simuler la fraîcheur** | Mort. « Changer la date sans rien faire d'autre, c'est du bruit inutile » (Mueller) ; Google demande de ne pas rafraîchir artificiellement sans ajout significatif. | [CONFIRMÉ] https://developers.google.com/search/blog/2019/03/help-google-search-know-best-date-for |
| **Optimiser un « content score » d'outil (Surfer & co.)** | À traiter comme une hypothèse, jamais comme une consigne. Ces scores sont des moyennes de corpus qui ne sont pas la SERP visée. C'est exactement le mécanisme qui a produit l'incident du tableau de prix inventé (§0). | [MAISON] |
| **Viser le « Domain Authority » / « Authority Score »** | Sans objet. Google déclare depuis des années ne pas utiliser ces métriques tierces, et Mueller le répète en 2025. Ce sont des indicateurs d'éditeurs d'outils, pas des facteurs. | [CONFIRMÉ] https://www.searchenginejournal.com/google-on-topical-authority-dont-worry-about-it/501209/ |
| **Bourrer le nom d'établissement GBP de mots-clés** | Toujours corrélé à un gain de position (facteur n°3 chez Whitespark) **mais** en violation directe des règles de représentation Google, avec un risque de suspension. Le réseau ne le fait pas : la fiche vaut plus que la position. | [CONTESTÉ] — divergence assumée entre efficacité mesurée et conformité : https://whitespark.ca/local-search-ranking-factors/ vs https://support.google.com/business/answer/3038177 |
| **Multiplier les H1, ou en avoir peur** | Non-sujet. Google ne pénalise pas les H1 multiples. Ce qui compte est l'unicité éditoriale de l'intention (INV-05), pas le compte de balises. | [CONFIRMÉ] https://www.searchenginejournal.com/google-h1-headings-seo/328459/ |

---

# 6. Sources

**Documentation Google officielle (statut CONFIRMÉ)**
1. Créer un contenu utile, fiable et axé sur l'humain — https://developers.google.com/search/docs/fundamentals/creating-helpful-content
2. Google Search Essentials — https://developers.google.com/search/docs/essentials
3. Règles anti-spam de la recherche Google — https://developers.google.com/search/docs/essentials/spam-policies
4. Balise title / title link — https://developers.google.com/search/docs/appearance/title-link
5. Rédiger des meta descriptions / snippets — https://developers.google.com/search/docs/appearance/snippet
6. Bonnes pratiques des liens — https://developers.google.com/search/docs/crawling-indexing/links-crawlable
7. Règles générales relatives aux données structurées — https://developers.google.com/search/docs/appearance/structured-data/sd-policies
8. Données structurées LocalBusiness — https://developers.google.com/search/docs/appearance/structured-data/local-business
9. Changements sur les rich results HowTo et FAQ (août 2023) — https://developers.google.com/search/blog/2023/08/howto-faq-changes
10. FAQPage (référence courante) — https://developers.google.com/search/docs/appearance/structured-data/faqpage
11. Core Web Vitals et Google Search — https://developers.google.com/search/docs/appearance/core-web-vitals
12. Aider Google à connaître la bonne date d'une page — https://developers.google.com/search/blog/2019/03/help-google-search-know-best-date-for
13. Consolidation des URL dupliquées / canonique — https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
14. E-A-T devient E-E-A-T (blog Search Central, 2022) — https://developers.google.com/search/blog/2022/12/google-raters-guidelines-e-e-a-t
15. Fonctionnement du classement local Google — https://support.google.com/business/answer/7091
16. Règles de représentation de votre établissement sur Google — https://support.google.com/business/answer/3038177
17. Search Quality Rater Guidelines — aperçu officiel (PDF) — https://services.google.com/fh/files/misc/hsw-sqrg.pdf (version intégrale : https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf — mise à jour du 11/09/2025, 182 p.)

**Déclarations Google rapportées (statut CONFIRMÉ, source secondaire)**
18. Word count n'est pas un facteur de qualité — https://www.searchenginejournal.com/word-count-not-a-quality-factor/397288/
19. Pas de densité de mots-clés optimale — https://www.seroundtable.com/google-search-optimal-keyword-density-34826.html
20. H1 : utiles mais pas critiques, multiples acceptés — https://www.searchenginejournal.com/google-h1-headings-seo/328459/
21. Topical authority : « don't worry about it » — https://www.searchenginejournal.com/google-on-topical-authority-dont-worry-about-it/501209/
22. Dépréciation des rich results FAQ — https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/

**Études sectorielles (statut OBSERVÉ)**
23. Whitespark — Local Search Ranking Factors 2026 — https://whitespark.ca/local-search-ranking-factors/
24. BrightLocal — Local Consumer Review Survey 2025 — https://www.brightlocal.com/research/local-consumer-review-survey-2025/
25. Search Engine Land — zero-click 2026 (dont ~78 % sur les requêtes « near me ») — https://searchengineland.com/google-zero-click-searches-2026-study-479717
26. Abondance — analyse technique de SERP au-delà du volume — https://www.abondance.com/20251218-1738655-serp-analyse-technique-comment-lire-les-signaux-concurrentiels-au-dela-du-volume-de-recherche.html
27. Invoca — benchmarks de conversion des appels (contexte, non citable en page) — https://invoca.com/reports/the-invoca-call-conversion-industry-benchmarks-report-2025

**Normes et droit français**
28. WCAG 2.2 — SC 2.5.8 Target Size (Minimum), AA, 24×24 px CSS — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
29. SignalConso / DGCCRF — faux avis : pratique commerciale trompeuse — https://signal.conso.gouv.fr/fr/actualites/faux-avis
30. economie.gouv.fr — peut-on faire confiance aux avis en ligne (sanctions) — https://www.economie.gouv.fr/particuliers/mes-droits-conso/bien-consommer/peut-faire-confiance-aux-avis-en-ligne
31. economie.gouv.fr — mentions obligatoires d'un site internet — https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter
32. France Num — mentions légales d'un site professionnel — https://www.francenum.gouv.fr/guides-et-conseils/developpement-commercial/site-web/quelles-sont-les-mentions-legales-pour-un-site

---

## Annexe — Points sans source fiable (à ne pas présenter comme établis)

- **Le seuil de 60 % de contenu unique** (INV-03) : convention du réseau. Aucun seuil officiel de duplication n'est publié par Google.
- **La profondeur de clic ≤ 3** (INV-24) : consensus de praticiens, jamais chiffré par Google.
- **Le nombre optimal de rappels du numéro dans une page** (§3.2) : aucune étude publique fiable. À mesurer sur le parc via le call tracking quand il existera.
- **Les seuils de la grille SERP 70 % / 40 % / 30 %** (§2.0) : construits pour être décidables mécaniquement sur un corpus de 10 résultats. Ils n'ont aucune validation externe ; à réviser si les mesures `seo_measurements` les démentent.
- **L'impact réel des AI Overviews sur les requêtes locales françaises** : les chiffres disponibles sont majoritairement américains et publiés par des éditeurs d'outils. Ordre de grandeur seulement, jamais à citer en page.
