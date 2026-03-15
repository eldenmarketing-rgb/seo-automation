import { SiteConfig, ServiceDef } from '../../../config/sites.js';
import { City66 } from '../../../config/cities-66.js';

export function voituresPrompt(site: SiteConfig, service: ServiceDef, city: City66): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans l'automobile et la vente de véhicules d'occasion. Tu maîtrises E-E-A-T, le NLP de Google et la rédaction de contenu qui domine les SERP locales.

CONTEXTE BUSINESS :
- Service : "${service.name}"
- Mots-clés : ${service.keywords.join(', ')}
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Entreprise : "${site.name}" — ${site.business}
- Adresse : ${site.address}, ${site.postalCode} ${site.city}
- Téléphone : ${site.phone}
- Objectif : générer des APPELS de clients qui cherchent un véhicule d'occasion

INSTRUCTIONS SEO AVANCÉES :

1. CHAMP SÉMANTIQUE : Couvre l'univers de "${service.name}" — types de véhicules, critères d'achat (kilométrage, année, motorisation), financement, garantie, contrôle technique, reprise, essai routier, documents nécessaires. Google évalue la profondeur thématique.

2. INTENT MATCHING :
   - Transactionnel : acheter une voiture occasion, trouver un concessionnaire, voir le stock
   - Informationnel : comment bien acheter une occasion, points à vérifier, garantie légale, financement

3. E-E-A-T :
   - EXPÉRIENCE : "nous sélectionnons chaque véhicule avec..."
   - EXPERTISE : connaissance des marques, motorisations, critères de qualité
   - FIABILITÉ : transparence (historique véhicule, CT à jour), garantie, pas de vice caché

4. CONTENU RICHE : 200-350 mots par section. Contenu total > 1500 mots.

5. LOCALISATION :
   - Proximité avec ${city.name} (${city.distanceFromPerpignan})
   - Showroom à ${site.city}, livraison/déplacement possible à ${city.name}
   - Mentionner que les clients de ${city.name} viennent régulièrement

6. CONVERSION : CTA vers l'appel, la visite du showroom, la demande d'information.

7. MOTS-CLÉS À INTÉGRER :
${service.keywords.map(k => `- "${k} ${city.name.toLowerCase()}"`).join('\n')}
- "achat ${service.name.toLowerCase()} ${city.name}"

8. INTERDICTIONS : Ne PAS inventer de prix, de stock, de modèles spécifiques, de promotions.

RETOURNE un JSON VALIDE :
{
  "metaTitle": "max 60 chars — ${service.name} ${city.name} | ${site.name}",
  "metaDescription": "max 155 chars — bénéfice + CTA + localisation",
  "h1": "titre H1 naturel avec ${service.name} et ${city.name}",
  "heroTitle": "accroche courte et impactante",
  "heroSubtitle": "proposition de valeur (garantie, transparence, choix)",
  "intro": "3-4 phrases — besoin client + solution + ancrage local",
  "seoSections": [
    { "title": "H2 optimisé (question ou angle d'achat)", "content": "200-350 mots de contenu expert" }
  ],
  "highlights": ["avantage concret et différenciant"],
  "trustSignals": ["élément E-E-A-T : transparence, garantie, process qualité"],
  "faq": [
    { "question": "question naturelle d'acheteur", "answer": "réponse détaillée 60-120 mots" }
  ],
  "internalLinks": [
    { "slug": "slug-existant", "anchor": "texte du lien naturel" }
  ]
}

QUANTITÉS : 5 seoSections, 5 highlights, 4 trustSignals, 6 FAQ, 3 internalLinks.
Retourne UNIQUEMENT le JSON valide, sans markdown ni commentaire.`;
}

export function voituresCityOnlyPrompt(site: SiteConfig, city: City66, services: ServiceDef[]): string {
  const serviceList = services.map(s => `- ${s.name} (${s.keywords.slice(0, 2).join(', ')})`).join('\n');

  return `Tu es un rédacteur SEO expert niveau agence, spécialisé en automobile et véhicules d'occasion. Tu maîtrises E-E-A-T, NLP et les pages hub locales.

CONTEXTE :
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Entreprise : "${site.name}" — ${site.business}
- Adresse : ${site.address}, ${site.postalCode} ${site.city}
- Téléphone : ${site.phone}

SERVICES PROPOSÉS :
${serviceList}

OBJECTIF : Page hub SEO pour "${site.name.toLowerCase()} ${city.name.toLowerCase()}" — couvrir tous les services, générer des appels.

INSTRUCTIONS :
1. PAGE HUB : Point d'entrée pour "voiture occasion ${city.name}" — présenter l'ensemble de l'offre
2. CHAMP SÉMANTIQUE : Couvrir l'achat auto occasion sous tous les angles (choix, financement, garantie, reprise)
3. E-E-A-T : Montrer l'expertise, la transparence, la connaissance du marché local
4. CONTENU RICHE : 200-350 mots par section SEO
5. MAILLAGE : Les featuredServices servent de liens vers les pages détaillées

MOTS-CLÉS PRINCIPAUX :
- "voiture occasion ${city.name.toLowerCase()}"
- "achat voiture ${city.name.toLowerCase()}"
- "concessionnaire occasion ${city.name.toLowerCase()}"

RETOURNE un JSON VALIDE :
{
  "metaTitle": "max 60 chars",
  "metaDescription": "max 155 chars avec CTA",
  "h1": "titre avec voiture occasion et ${city.name}",
  "heroTitle": "accroche impactante",
  "heroSubtitle": "proposition de valeur",
  "intro": "4-5 phrases — marché auto local + expertise + confiance",
  "seoSections": [
    { "title": "H2 SEO", "content": "200-350 mots" }
  ],
  "featuredServices": [
    { "slug": "service-slug", "name": "Nom du service", "description": "2 phrases — ce qu'on propose + pourquoi c'est important" }
  ],
  "highlights": ["avantage concret"],
  "trustSignals": ["élément E-E-A-T"],
  "nearbyPlaces": ["Ville desservie"],
  "faq": [
    { "question": "question naturelle d'acheteur", "answer": "réponse 60-120 mots" }
  ],
  "internalLinks": [
    { "slug": "slug-existant", "anchor": "texte naturel" }
  ]
}

QUANTITÉS : 5 seoSections, 6 featuredServices, 5 highlights, 4 trustSignals, 5 nearbyPlaces, 6 FAQ, 3 internalLinks.
Retourne UNIQUEMENT le JSON valide.`;
}
