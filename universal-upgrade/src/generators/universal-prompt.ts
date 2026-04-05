/**
 * Universal Prompt Builder
 * 
 * Replaces garage.ts, carrosserie.ts, massage.ts, vtc.ts, voitures.ts, restaurant.ts
 * with a single intelligent prompt builder that adapts to any niche and mode.
 * 
 * Architecture:
 *   buildPrompt(page) → { system: string, user: string }
 *   
 *   System prompt = rôle + règles SEO immuables (cached across calls)
 *   User prompt   = contexte business + instructions mode + format JSON
 */

import { UniversalPage, SiteModeConfig, BrandVoice, PageIntent } from '../../config/site-modes.js';

export interface PromptPair {
  system: string;
  user: string;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Stable across all calls, cacheable
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(brand: BrandVoice, language: string): string {
  return `Tu es un rédacteur SEO senior niveau agence (10+ ans d'expérience), spécialisé en content marketing et référencement. Tu maîtrises parfaitement :

- Les algorithmes Google : E-E-A-T (Expérience, Expertise, Autorité, Fiabilité), Helpful Content Update, NLP entities, passage ranking
- La rédaction persuasive orientée conversion (appels téléphoniques, demandes de devis)
- Le champ sémantique et le maillage thématique (cocon sémantique)
- Les Featured Snippets, People Also Ask, et la position zéro

═══ TON & PERSONNALITÉ DE MARQUE ═══

Ton : ${brand.tone}
Personnalité : ${brand.personality}
Style CTA : ${brand.ctaStyle}
Preuve d'expérience : ${brand.experienceProof}

Mots à privilégier : ${brand.wordsToUse.join(', ')}
Mots INTERDITS (ne jamais utiliser) : ${brand.wordsToAvoid.join(', ')}

Arguments différenciants à intégrer naturellement :
${brand.uniqueSellingPoints.map((usp, i) => `${i + 1}. ${usp}`).join('\n')}

═══ RÈGLES SEO IMMUABLES ═══

1. CHAMP SÉMANTIQUE : Ne te limite jamais au mot-clé exact. Couvre l'intégralité du champ sémantique — termes techniques, synonymes, concepts liés, processus, normes, problématiques associées. Google utilise le NLP pour évaluer la couverture thématique d'une page.

2. INTENT MATCHING : Chaque page doit couvrir AU MINIMUM deux intentions de recherche :
   - Transactionnelle : trouver, réserver, appeler, demander un devis
   - Informationnelle : comprendre, comparer, savoir quand/pourquoi/comment

3. E-E-A-T OBLIGATOIRE dans chaque page :
   - EXPÉRIENCE : montrer une pratique concrète ("nous intervenons quotidiennement sur...", "en 10 ans de pratique...")
   - EXPERTISE : vocabulaire technique précis mais accessible
   - AUTORITÉ : mentions d'expérience, de volume de clients, de spécialisations
   - FIABILITÉ : transparence (pas de promesses vagues), processus clair, réassurance

4. CONTENU RICHE : Chaque section SEO = 200-400 mots minimum. Contenu total > 1200 mots. Un contenu complet et utile surpasse toujours un contenu superficiel.

5. CONVERSION SUBTILE : Chaque section ramène naturellement vers l'action (appeler, demander un devis). Micro-CTA naturels dans le texte, pas de blocs publicitaires agressifs.

6. FRAÎCHEUR : Intègre des références temporelles naturelles ("en ${new Date().getFullYear()}", "les dernières normes", "aujourd'hui").

7. INTERDICTIONS ABSOLUES :
   - Ne JAMAIS inventer de prix, promotions, certifications spécifiques ou garanties chiffrées
   - Ne JAMAIS bourrer de mots-clés — intégration naturelle uniquement
   - Ne JAMAIS utiliser de superlatifs vides ("le meilleur", "le plus grand") sans preuve
   - Ne JAMAIS faire de contenu générique qui pourrait s'appliquer à n'importe quelle entreprise
   - Ne JAMAIS générer de faux avis, faux témoignages ou fausses statistiques

8. FORMAT : Retourne UNIQUEMENT du JSON valide. Pas de markdown, pas de backticks, pas de texte avant/après. Le JSON doit être parseable directement par JSON.parse().

Langue de rédaction : ${language === 'fr' ? 'français' : 'anglais'}`;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT BUILDERS — Mode-specific context blocks
// ═══════════════════════════════════════════════════════════════

function buildLocalContext(page: UniversalPage): string {
  const { city, service, site } = page;
  const parts: string[] = [];

  parts.push(`═══ CONTEXTE BUSINESS LOCAL ═══`);
  parts.push(`Entreprise : "${site.name}" — ${site.address}, ${site.postalCode} ${site.city}`);
  parts.push(`Téléphone : ${site.phone}`);
  if (site.email) parts.push(`Email : ${site.email}`);
  parts.push(`Secteur d'activité : ${site.business || site.schemaType}`);
  parts.push(`Objectif principal : générer des APPELS téléphoniques (zéro formulaire)`);

  if (city) {
    parts.push(`\n═══ CONTEXTE GÉOGRAPHIQUE ═══`);
    parts.push(`Ville cible : "${city.name}" (${city.postalCode})`);
    if (city.distanceFromBase) parts.push(`Distance depuis la base : ${city.distanceFromBase}`);
    if (city.population) parts.push(`Population : ${city.population.toLocaleString('fr-FR')} habitants`);
    if (city.department) parts.push(`Département : ${city.department}`);
    parts.push(`\nINSTRUCTIONS LOCALISATION :`);
    parts.push(`- Mentionner "${city.name}" naturellement (3-5 fois max, pas de bourrage)`);
    parts.push(`- Citer la distance/trajet si pertinent`);
    parts.push(`- Mentionner des axes routiers ou repères locaux quand naturel`);
    parts.push(`- Montrer une connaissance concrète de la zone`);
  }

  if (service) {
    parts.push(`\n═══ SERVICE CIBLÉ ═══`);
    parts.push(`Service : "${service.name}"`);
    parts.push(`Mots-clés principaux : ${service.keywords.join(', ')}`);
    if (service.parentService) parts.push(`Catégorie parente : ${service.parentService}`);
    if (city) {
      parts.push(`Mots-clés localisés : ${service.keywords.map(k => `"${k} ${city.name}"`).join(', ')}`);
    }
  }

  return parts.join('\n');
}

function buildThematicContext(page: UniversalPage): string {
  const { topic, modeConfig } = page;
  const thematic = modeConfig.thematic!;
  const parts: string[] = [];

  parts.push(`═══ CONTEXTE THÉMATIQUE ═══`);
  parts.push(`Sujet : "${topic!.name}"`);
  parts.push(`Mots-clés principaux : ${topic!.keywords.join(', ')}`);
  if (topic!.parentTopic) parts.push(`Topic parent (cocon) : ${topic!.parentTopic}`);
  if (topic!.difficulty) parts.push(`Difficulté SEO : ${topic!.difficulty}`);

  parts.push(`\n═══ AUTORITÉ & EXPERTISE ═══`);
  parts.push(`Expertise : ${thematic.authority.expertise}`);
  if (thematic.authority.certifications?.length) {
    parts.push(`Certifications : ${thematic.authority.certifications.join(', ')}`);
  }
  if (thematic.authority.socialProof) parts.push(`Preuve sociale : ${thematic.authority.socialProof}`);
  parts.push(`Public cible : ${thematic.targetAudience}`);
  parts.push(`Profondeur de contenu : ${thematic.contentDepth}`);

  parts.push(`\nEntreprise : "${page.site.name}"`);
  parts.push(`Téléphone : ${page.site.phone}`);
  if (page.site.domain) parts.push(`Site : ${page.site.domain}`);
  parts.push(`Objectif : générer des APPELS ou inscriptions`);

  return parts.join('\n');
}

function buildProductContext(page: UniversalPage): string {
  const { product, modeConfig } = page;
  const prodConfig = modeConfig.product!;
  const parts: string[] = [];

  parts.push(`═══ CONTEXTE PRODUIT ═══`);
  parts.push(`Type de produit : ${prodConfig.productType}`);
  if (product) {
    parts.push(`Produit : "${product.name}"`);
    const attrs = Object.entries(product.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    parts.push(`Attributs : ${attrs}`);
  }

  if (prodConfig.affiliateConfig) {
    parts.push(`\nModèle : affiliation ${prodConfig.affiliateConfig.platform} (${prodConfig.affiliateConfig.commission})`);
  }

  parts.push(`\nEntreprise : "${page.site.name}"`);
  parts.push(`Téléphone : ${page.site.phone}`);
  parts.push(`Objectif : générer des APPELS ou des clics vers les fiches produit`);

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// INTENT INSTRUCTIONS — What makes each page type unique
// ═══════════════════════════════════════════════════════════════

function buildIntentInstructions(intent: PageIntent, page: UniversalPage): string {
  const subject = page.service?.name || page.topic?.name || page.product?.name || page.site.business;
  const location = page.city?.name || '';

  const instructions: Record<PageIntent, string> = {
    service: `
═══ MISSION : PAGE SERVICE ═══
Page de référence pour le service "${subject}"${location ? ` à ${location}` : ''}.
- Couvrir : présentation du service, processus/déroulement, quand/pourquoi consulter, avantages de notre entreprise, zone desservie
- Chaque section doit être substantielle (250-400 mots)
- Inclure des micro-CTA naturels ("contactez-nous pour un diagnostic", "appelez pour un devis")
- Montrer l'expertise technique tout en restant accessible au client lambda`,

    city_hub: `
═══ MISSION : PAGE HUB VILLE ═══
Page d'entrée principale pour ${location}. Doit servir de carrefour vers toutes les pages service de cette ville.
- Présenter TOUS les services disponibles avec un court résumé chacun
- Ancrage local fort : montrer qu'on connaît ${location} et ses spécificités
- Chaque service mentionné = lien interne vers la page dédiée
- Le contenu doit donner envie d'explorer les pages spécifiques
- Plus orientée "confiance + découverte" que "conversion directe"`,

    prix: `
═══ MISSION : PAGE INTENTION PRIX ═══
Cette page cible les recherches "prix/tarif/coût/combien coûte ${subject}${location ? ` ${location}` : ''}".
L'internaute cherche une indication de prix AVANT de prendre sa décision.

STRATÉGIE :
- NE PAS donner de prix fixes (interdit) — donner des FOURCHETTES indicatives ou des facteurs qui influencent le prix
- Expliquer POURQUOI le prix varie (complexité, pièces, véhicule, urgence...)
- Rassurer sur la transparence : devis gratuit, pas de surprise, facturation claire
- Comparer implicitement avec la concurrence (sans les nommer) : rapport qualité-prix
- CTA fort : "Appelez pour un devis personnalisé gratuit"
- Inclure une section "Ce qui est inclus dans notre prestation"`,

    urgence: `
═══ MISSION : PAGE INTENTION URGENCE ═══
Cette page cible : "dépannage ${subject} urgent", "${subject} dimanche/nuit/24h", "urgence ${subject}${location ? ` ${location}` : ''}".
L'internaute a un problème MAINTENANT et cherche une solution IMMÉDIATE.

STRATÉGIE :
- H1 doit contenir "urgence" ou "dépannage" + le service + la ville
- heroTitle = phrase rassurante et orientée action immédiate
- Mettre en avant : réactivité, disponibilité, délai d'intervention
- Première section = "Comment nous contacter en urgence" (numéro de téléphone proéminent)
- Expliquer le processus d'intervention d'urgence étape par étape
- FAQ orientées urgence : "Intervenez-vous le dimanche ?", "Quel est votre délai ?"
- trustSignals centrés sur la rapidité et la disponibilité`,

    avis: `
═══ MISSION : PAGE INTENTION AVIS/COMPARATIF ═══
Cible : "meilleur ${subject}${location ? ` ${location}` : ''}", "avis ${subject}", "${subject} recommandé".
L'internaute compare les options avant de choisir.

STRATÉGIE :
- Contenu orienté "pourquoi nous choisir" avec des arguments factuels
- Mettre en avant les éléments vérifiables : années d'expérience, nombre de clients, spécialisations
- Section "Ce qui nous différencie" avec des points concrets (pas de générique)
- Inclure des critères objectifs pour choisir un bon prestataire (éduquer le client)
- Intégrer naturellement les signaux Google Reviews (nombre d'avis, note moyenne) SI disponibles
- CTA : "Vérifiez nos avis Google" / "Appelez pour juger par vous-même"`,

    faq: `
═══ MISSION : PAGE FAQ THÉMATIQUE ═══
Page qui répond aux questions les plus fréquentes sur "${subject}".
Cible les recherches informationnelles et "People Also Ask".

STRATÉGIE :
- 10-15 questions/réponses complètes (pas 6)
- Chaque réponse = 80-150 mots (assez pour le Featured Snippet)
- Mix de questions : pratiques, techniques, tarifaires, comparatives
- Structurer en catégories (Questions générales, Questions techniques, Questions pratiques)
- Chaque réponse doit subtilement ramener vers notre service
- Les questions doivent être celles que les VRAIS clients posent (pas du remplissage SEO)`,

    guide: `
═══ MISSION : PAGE GUIDE EXPERT ═══
Contenu pilier (pillar content) de type guide complet sur "${subject}".
Objectif : devenir LA référence sur ce sujet pour Google.

STRATÉGIE :
- Contenu long (2000-3000 mots minimum)
- Structure type "Guide complet" avec sommaire implicite via les H2
- Couvrir le sujet de A à Z : définition, fonctionnement, types, avantages, inconvénients, comment choisir, erreurs à éviter
- Intégrer des conseils d'expert qui ne se trouvent pas ailleurs
- Tons éducatif et autoritaire — c'est du contenu de référence
- Liens internes vers toutes les pages service/topic liées (cocon sémantique)
- CTA doux : "Pour aller plus loin, contactez-nous" / "Besoin de conseils personnalisés ?"`,

    formation: `
═══ MISSION : PAGE FORMATION ═══
Page de vente pour une formation/cours sur "${subject}".
Objectif : convertir des prospects en inscrits/appelants.

STRATÉGIE :
- Présenter clairement le programme et les objectifs
- Mettre en avant les résultats concrets attendus après la formation
- Détailler les prérequis et le public cible
- Inclure le format (présentiel/en ligne, durée, rythme)
- Signaux d'autorité du formateur (expérience, certifications)
- Témoignages types de participants (sans inventer de noms)
- CTA : "Appelez pour réserver votre place" / "Demandez le programme complet"`,

    comparatif: `
═══ MISSION : PAGE COMPARATIF ═══
Contenu objectif comparant les options autour de "${subject}".
Cible : "comparatif", "vs", "différence entre", "lequel choisir".

STRATÉGIE :
- Présenter 3-5 options/méthodes/produits de manière factuelle
- Tableau comparatif implicite (avantages/inconvénients de chaque option)
- Verdict honnête avec recommandation argumentée
- Montrer qu'on maîtrise TOUTES les options (pas juste la nôtre)
- Orienter subtilement vers notre solution quand c'est pertinent
- CTA : "Besoin d'aide pour choisir ? Appelez un expert"`,

    product_page: `
═══ MISSION : FICHE PRODUIT ═══
Page produit optimisée pour "${page.product?.name || subject}".
Objectif : conversion directe (appel ou clic vers fiche détaillée).

STRATÉGIE :
- Description détaillée avec tous les attributs techniques
- Points forts mis en avant visuellement (highlights)
- Section "À qui s'adresse ce produit ?"
- Comparaison implicite avec les alternatives
- FAQ spécifiques au produit (compatibilité, garantie, disponibilité)
- CTA direct vers l'action (appel ou lien produit)`,

    category: `
═══ MISSION : PAGE CATÉGORIE ═══
Page hub pour une catégorie de produits/services : "${subject}".
Objectif : maillage interne et positionnement sur les requêtes catégorie.

STRATÉGIE :
- Introduction de la catégorie (200-300 mots)
- Présentation de chaque sous-catégorie/produit avec description courte
- Guide de choix : comment choisir dans cette catégorie
- Contenu éducatif sur la catégorie (tendances, innovations)
- Liens internes vers chaque fiche/page individuelle`,

    landing: `
═══ MISSION : LANDING PAGE CONVERSION ═══
Page 100% orientée conversion pour "${subject}${location ? ` à ${location}` : ''}".
Objectif : maximiser le taux d'appel.

STRATÉGIE :
- H1 ultra-accrocheur avec bénéfice client immédiat
- Hero avec CTA proéminent (numéro de téléphone)
- 3-4 blocs de réassurance rapides (highlights)
- Processus en 3 étapes (simplicité)
- Preuves sociales condensées (trustSignals forts)
- FAQ courte (3-4 questions max, réponses de 40-60 mots)
- Tout doit tenir "above the fold" conceptuellement`
  };

  const base = instructions[intent] || instructions.service;
  return base + `\n\nIMPORTANT : Chaque seoSection DOIT contenir MINIMUM 250 mots. Compte tes mots. Une section de 150 mots sera rejetée par le validateur.`;
}

// ═══════════════════════════════════════════════════════════════
// JSON OUTPUT FORMAT — Adapts to page type and intent
// ═══════════════════════════════════════════════════════════════

function buildOutputFormat(page: UniversalPage): string {
  const { intent, modeConfig } = page;
  const cfg = modeConfig.content;

  // Base structure commune à TOUS les modes
  const baseFields = `
  "metaTitle": "string (max 60 chars — mot-clé principal + angle de valeur + marque)",
  "metaDescription": "string (DOIT faire entre 130 et 154 caractères. JAMAIS 155 ou plus. Bénéfice concret + CTA + localisation si local — maximiser le CTR)",
  "h1": "string (titre principal naturel — mot-clé principal + angle différenciant)",
  "heroTitle": "string (accroche courte et percutante, orientée bénéfice client immédiat)",
  "heroSubtitle": "string (sous-titre qui lève l'objection principale ou renforce la confiance)",
  "intro": "string (3-5 phrases — poser le problème client, présenter la solution, ancrer le contexte)",
  "seoSections": [
    {
      "title": "string (H2 — question naturelle ou angle informatif fort, inclure mot-clé variant)",
      "content": "string (${cfg.minWordCount >= 1200 ? '250-400' : '200-300'} mots — contenu expert, utile, avec vocabulaire technique accessible)"
    }
  ],
  "faq": [
    {
      "question": "string (question que les vrais clients posent — naturelle, pas suroptimisée)",
      "answer": "string (réponse complète 60-150 mots — vraie valeur, pas du remplissage)"
    }
  ],
  "highlights": ["string (avantage CONCRET et SPÉCIFIQUE, pas de générique type 'équipe qualifiée')"],
  "trustSignals": ["string (élément E-E-A-T vérifiable : expérience chiffrée, équipement précis, process qualité nommé)"],
  "internalLinks": [
    {
      "slug": "string (slug de la page liée)",
      "label": "string (ancre descriptive et naturelle, JAMAIS 'cliquez ici' ou 'en savoir plus')"
    }
  ]`;

  // Champs spécifiques selon le mode et l'intent
  let modeFields = '';

  if (page.pageType === 'city' || intent === 'city_hub') {
    modeFields = `,
  "featuredServices": [
    { "slug": "string", "name": "string", "description": "string (2 phrases — ce qu'on fait + pourquoi c'est important)" }
  ],
  "nearbyPlaces": ["string (villes proches desservies — aide au maillage géographique)"]`;
  }

  if (intent === 'prix') {
    modeFields += `,
  "priceFactors": [
    { "factor": "string (facteur qui influence le prix)", "explanation": "string (pourquoi ça fait varier le coût)" }
  ],
  "includedInService": ["string (ce qui est inclus dans la prestation — transparence)"]`;
  }

  if (intent === 'urgence') {
    modeFields += `,
  "emergencyProcess": [
    { "step": "number", "title": "string", "description": "string (étape du processus d'urgence)" }
  ],
  "availability": "string (disponibilités : 7j/7, horaires, etc.)"`;
  }

  if (intent === 'formation') {
    modeFields += `,
  "program": [
    { "module": "string (nom du module)", "description": "string", "duration": "string" }
  ],
  "prerequisites": ["string"],
  "outcomes": ["string (compétence acquise après la formation)"],
  "format": "string (présentiel/en ligne/hybride, durée totale)"`;
  }

  if (intent === 'comparatif') {
    modeFields += `,
  "comparisonItems": [
    {
      "name": "string (option comparée)",
      "pros": ["string"],
      "cons": ["string"],
      "bestFor": "string (à qui ça convient le mieux)"
    }
  ],
  "verdict": "string (recommandation argumentée)"`;
  }

  if (intent === 'product_page') {
    modeFields += `,
  "specifications": [
    { "label": "string", "value": "string" }
  ],
  "targetAudience": "string (à qui s'adresse ce produit)",
  "alternatives": ["string (alternatives mentionnées pour le SEO comparatif)"]`;
  }

  // Quantités
  const quantities = buildQuantities(intent, cfg);

  return `
═══ FORMAT DE SORTIE (JSON STRICT) ═══

Retourne un JSON avec cette structure exacte :
{
${baseFields}${modeFields}
}

${quantities}

RAPPEL : Retourne UNIQUEMENT le JSON valide. Pas de markdown, pas de backticks \`\`\`, pas de texte explicatif.`;
}

function buildQuantities(intent: PageIntent, cfg: { seoSectionCount: number; faqCount: number }): string {
  const base = `QUANTITÉS EXACTES :`;
  
  const seoSections = intent === 'guide' ? '7-8' : 
                      intent === 'landing' ? '3-4' : 
                      intent === 'faq' ? '3' :
                      `${cfg.seoSectionCount}`;
  
  const faqCount = intent === 'faq' ? '12-15' : 
                   intent === 'landing' ? '3-4' :
                   `${cfg.faqCount}`;

  const parts = [
    base,
    `- ${seoSections} seoSections`,
    `- ${faqCount} FAQ (mix transactionnelles + informationnelles)`,
    `- 5 highlights (avantages CONCRETS et SPÉCIFIQUES)`,
    `- 4 trustSignals (preuves E-E-A-T VÉRIFIABLES)`,
    `- 3-5 internalLinks (maillage sémantique pertinent)`,
  ];

  if (intent === 'city_hub') {
    parts.push(`- 6 featuredServices (tous les services principaux)`);
    parts.push(`- 5 nearbyPlaces (villes proches)`);
  }
  if (intent === 'prix') {
    parts.push(`- 4-6 priceFactors`);
    parts.push(`- 5-8 includedInService`);
  }
  if (intent === 'urgence') {
    parts.push(`- 4-5 emergencyProcess steps`);
  }
  if (intent === 'formation') {
    parts.push(`- 4-6 modules de programme`);
    parts.push(`- 3-5 prerequisites`);
    parts.push(`- 5-7 outcomes`);
  }
  if (intent === 'comparatif') {
    parts.push(`- 3-4 comparisonItems`);
  }
  if (intent === 'product_page') {
    parts.push(`- 6-10 specifications`);
  }

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUILDER — Assembles the complete prompt
// ═══════════════════════════════════════════════════════════════

export function buildPrompt(page: UniversalPage, extraContext?: string): PromptPair {
  const { modeConfig, site } = page;
  const brand = modeConfig.brand;
  const language = modeConfig.content.language;

  // 1. System prompt (stable, cacheable)
  const system = buildSystemPrompt(brand, language);

  // 2. User prompt (varies per page)
  const userParts: string[] = [];

  // Context block — depends on mode
  switch (modeConfig.mode) {
    case 'local':
      userParts.push(buildLocalContext(page));
      break;
    case 'thematic':
      userParts.push(buildThematicContext(page));
      break;
    case 'product':
      userParts.push(buildProductContext(page));
      break;
  }

  // Intent-specific instructions
  userParts.push(buildIntentInstructions(page.intent, page));

  // Cocooning context
  if (modeConfig.cocooning.pillarPages.length > 0) {
    userParts.push(`\n═══ COCON SÉMANTIQUE ═══`);
    userParts.push(`Pages pilier du site : ${modeConfig.cocooning.pillarPages.join(', ')}`);
    userParts.push(`Stratégie de maillage : chaque page doit lier vers sa page pilier ET vers 2-3 pages sœurs`);
    userParts.push(`Profondeur du cocon : ${modeConfig.cocooning.clusterDepth} niveau(x)`);
    userParts.push(`Max liens internes : ${modeConfig.cocooning.maxInternalLinks}`);
  }

  // Extra context (internal links, keywords from page-generator.ts)
  if (extraContext) {
    userParts.push(`\n${extraContext}`);
  }

  // Output format
  userParts.push(buildOutputFormat(page));

  return {
    system,
    user: userParts.join('\n\n'),
  };
}

// ═══════════════════════════════════════════════════════════════
// OPTIMIZATION PROMPT — For pages position 5-15
// ═══════════════════════════════════════════════════════════════

export function buildOptimizationPrompt(
  currentContent: Record<string, unknown>,
  topQueries: Array<{ query: string; position: number; impressions: number }>,
  siteKey: string,
  pageUrl: string,
  brand: BrandVoice
): PromptPair {
  const queriesList = topQueries
    .slice(0, 15)
    .map(q => `- "${q.query}" (position: ${q.position.toFixed(1)}, impressions: ${q.impressions})`)
    .join('\n');

  const system = `Tu es un consultant SEO senior spécialisé en optimisation de contenu pour le top 3 Google. Tu analyses les données GSC avec précision et tu enrichis le contenu pour maximiser le CTR et améliorer les positions.

TON : ${brand.tone}
MOTS INTERDITS : ${brand.wordsToAvoid.join(', ')}`;

  const user = `PAGE : ${pageUrl}
SITE : ${siteKey}

═══ DONNÉES GOOGLE SEARCH CONSOLE ═══
${queriesList}

═══ CONTENU ACTUEL (JSON) ═══
${JSON.stringify(currentContent, null, 2).slice(0, 8000)}

═══ MISSION : PASSER EN TOP 3 ═══

1. ANALYSE : Identifie la requête #1 (plus d'impressions) et les secondaires. Le contenu doit répondre PARFAITEMENT à chaque intention.

2. RENFORCEMENT SÉMANTIQUE :
   - Enrichir avec le champ sémantique complet des requêtes
   - Ajouter les entités NLP manquantes
   - Chaque requête GSC doit être couverte naturellement

3. TITLE & META : Reformuler pour maximiser le CTR (chiffre, bénéfice, urgence douce)

4. SECTIONS : Allonger à 300-400 mots, ajouter des sections manquantes si les requêtes révèlent des sujets non couverts

5. FAQ : Reformuler pour matcher les requêtes GSC, ajouter des FAQ "People Also Ask", viser 8 FAQ minimum

6. E-E-A-T : Renforcer les trustSignals avec des preuves concrètes

RÈGLES :
- GARDER la même structure JSON
- Ne JAMAIS réduire — seulement enrichir
- Préserver les internalLinks existants
- Ajouter "trustSignals" (array de 5 strings) si absent
- Mettre à jour le champ "updatedDate" à "${new Date().toISOString().split('T')[0]}"

Retourne UNIQUEMENT le JSON enrichi, même structure.`;

  return { system, user };
}
