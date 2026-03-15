import { SiteConfig, ServiceDef } from '../../../config/sites.js';
import { City66 } from '../../../config/cities-66.js';

export function garagePrompt(site: SiteConfig, service: ServiceDef, city: City66): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans le référencement local pour les garages automobiles en France. Tu connais parfaitement les algorithmes de Google (E-E-A-T, helpful content, NLP entities) et tu rédiges du contenu qui surpasse les concurrents en top 3.

CONTEXTE BUSINESS :
- Service : "${service.name}"
- Mots-clés principaux : ${service.keywords.join(', ')}
- Ville cible : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Garage : "${site.name}" situé à ${site.address}, ${site.postalCode} ${site.city}
- Téléphone : ${site.phone}
- Objectif : générer des APPELS téléphoniques de clients qui cherchent ce service

INSTRUCTIONS SEO AVANCÉES :

1. CHAMP SÉMANTIQUE : Ne te limite pas au mot-clé exact. Intègre naturellement tout le champ sémantique lié à "${service.name}" — termes techniques, pièces concernées, processus, normes, symptômes qui amènent le client à chercher ce service. Google utilise le NLP pour comprendre la couverture thématique.

2. INTENT MATCHING : Couvre les deux intentions de recherche :
   - Transactionnelle : "trouver un garage pour ${service.name} à ${city.name}", devis, rendez-vous
   - Informationnelle : quand faire ce service, signes d'usure, conseils d'entretien, ce qu'il faut savoir

3. E-E-A-T (Expérience, Expertise, Autorité, Fiabilité) :
   - Montrer l'EXPÉRIENCE : "nos mécaniciens interviennent quotidiennement sur..."
   - Montrer l'EXPERTISE : utiliser un vocabulaire technique précis (mais accessible)
   - Montrer la FIABILITÉ : devis transparent, pas de surprise, pièces de qualité

4. CONTENU RICHE : Chaque section SEO doit faire 200-350 mots minimum. Le contenu total doit dépasser 1500 mots. Plus le contenu est complet et utile, mieux il ranke.

5. LOCALISATION FORTE :
   - Mentionner ${city.name} naturellement (pas de bourrage)
   - Citer la distance/trajet (${city.distanceFromPerpignan})
   - Mentionner des repères locaux ou axes routiers quand pertinent
   - Montrer qu'on connaît la zone

6. CONVERSION : Chaque section doit subtilement ramener vers l'action (appeler, demander un devis). Utilise des micro-CTA naturels dans le texte.

7. MOTS-CLÉS NATURELS à intégrer : ${service.keywords.map(k => `"${k} ${city.name}"`).join(', ')}

8. INTERDICTIONS : Ne PAS inventer de prix, promotions, certifications spécifiques ou garanties chiffrées.

RETOURNE un JSON strictement valide avec cette structure :
{
  "metaTitle": "string (max 60 chars — format: ${service.name} ${city.name} | ${site.name})",
  "metaDescription": "string (max 155 chars — inclure bénéfice + CTA + localisation — doit donner envie de cliquer)",
  "h1": "string (titre principal naturel — ${service.name} à ${city.name} + angle de valeur)",
  "heroTitle": "string (accroche courte et percutante pour le hero, orientée bénéfice client)",
  "heroSubtitle": "string (sous-titre qui lève l'objection principale ou renforce la confiance)",
  "intro": "string (3-4 phrases d'introduction — poser le problème du client, présenter la solution, ancrer localement)",
  "seoSections": [
    {
      "title": "string (H2 — utilise une question naturelle ou un angle informatif fort)",
      "content": "string (200-350 mots — contenu expert, utile, avec vocabulaire technique accessible)"
    }
  ],
  "faq": [
    {
      "question": "string (question que les vrais clients posent — inclure ville ou service quand naturel)",
      "answer": "string (réponse complète 60-120 mots — apporter une vraie valeur, pas du remplissage)"
    }
  ],
  "highlights": ["string (avantage concret et différenciant, pas de générique)"],
  "trustSignals": ["string (élément de réassurance E-E-A-T : expérience, équipement, process qualité)"],
  "internalLinks": [
    {
      "slug": "string",
      "label": "string (ancre naturelle et descriptive, pas de 'cliquez ici')"
    }
  ]
}

QUANTITÉS EXACTES :
- 5 seoSections (couvrant : présentation du service, processus/déroulement, quand/pourquoi consulter, avantages de notre garage, zone géographique desservie)
- 6 FAQ (mix questions transactionnelles + informationnelles + locales)
- 5 highlights
- 4 trustSignals
- 3 internalLinks

Retourne UNIQUEMENT le JSON valide, sans markdown, sans backticks, sans explication.`;
}

export function garageCityOnlyPrompt(site: SiteConfig, city: City66, services: ServiceDef[]): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans le référencement local pour les garages automobiles. Tu maîtrises E-E-A-T, le NLP de Google et la rédaction de pages hub locales qui dominent les SERP.

CONTEXTE :
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Garage : "${site.name}" à ${site.city} (${site.address})
- Téléphone : ${site.phone}
- Services : ${services.map(s => s.name).join(', ')}
- Objectif : être LA référence garage pour les habitants de ${city.name} — générer des appels

INSTRUCTIONS SEO AVANCÉES :

1. PAGE HUB : Cette page doit servir de point d'entrée principal pour "${city.name} + garage/mécanique/auto". Elle doit couvrir l'ensemble des services tout en donnant envie d'explorer les pages spécifiques.

2. CHAMP SÉMANTIQUE LOCAL : Intégrer des références à la vie automobile locale — types de véhicules courants, problématiques locales (climat, routes), habitudes des automobilistes de la zone.

3. E-E-A-T : Démontrer la connaissance de ${city.name} et de ses environs. Montrer qu'on est un garage de proximité qui connaît ses clients.

4. MAILLAGE INTERNE : Les featuredServices servent de maillage vers les pages service×ville. Chaque description doit donner envie de cliquer.

5. CONTENU RICHE : Les sections SEO doivent faire 200-350 mots chacune.

RETOURNE un JSON strictement valide :
{
  "metaTitle": "string (max 60 chars — Garage ${city.name} | ${site.name})",
  "metaDescription": "string (max 155 chars — tous services + CTA)",
  "h1": "string (Votre garage de confiance proche de ${city.name})",
  "heroTitle": "string (accroche courte)",
  "heroSubtitle": "string (proposition de valeur)",
  "intro": "string (4-5 phrases — ancrage local fort, présentation du garage, pourquoi nous choisir)",
  "seoSections": [
    { "title": "string (H2)", "content": "string (200-350 mots)" }
  ],
  "featuredServices": [
    { "slug": "string", "name": "string", "description": "string (2 phrases — ce qu'on fait + pourquoi c'est important)" }
  ],
  "highlights": ["string (avantage concret)"],
  "trustSignals": ["string (élément E-E-A-T)"],
  "nearbyPlaces": ["string (villes proches desservies)"],
  "faq": [
    { "question": "string", "answer": "string (60-120 mots)" }
  ]
}

QUANTITÉS : 5 seoSections, 6 featuredServices, 5 highlights, 4 trustSignals, 5 nearbyPlaces, 5 FAQ.
Retourne UNIQUEMENT le JSON valide.`;
}
