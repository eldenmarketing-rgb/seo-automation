import { SiteConfig, ServiceDef } from '../../../config/sites.js';
import { City66 } from '../../../config/cities-66.js';

export function vtcPrompt(site: SiteConfig, service: ServiceDef, city: City66): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans le transport VTC et chauffeur privé. Tu maîtrises E-E-A-T, le NLP de Google et la rédaction de contenu qui domine les SERP locales.

CONTEXTE BUSINESS :
- Service : "${service.name}" (${service.keywords.join(', ')})
- Destination : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Entreprise : "${site.name}" — chauffeur privé VTC basé à ${site.city}
- Contact : ${site.phone}
- Disponibilité : 7j/7, 24h/24
- Objectif : générer des RÉSERVATIONS par téléphone

INSTRUCTIONS SEO AVANCÉES :

1. CHAMP SÉMANTIQUE : Couvre l'univers de "${service.name}" — types de trajets, occasions (aéroport, gare, événement, médical, professionnel), confort, sécurité, alternatives au taxi/covoiturage, avantages du VTC. Google évalue la profondeur thématique.

2. INTENT MATCHING :
   - Transactionnel : réserver un VTC, prix trajet, chauffeur disponible maintenant
   - Informationnel : différence VTC/taxi, comment réserver, avantages VTC, trajet ${city.name}-Perpignan

3. E-E-A-T :
   - EXPÉRIENCE : connaissance des trajets locaux, des horaires de train/avion
   - EXPERTISE : chauffeur professionnel, véhicule récent, licence VTC
   - FIABILITÉ : prix fixe annoncé à l'avance, ponctualité, suivi par SMS

4. CONTENU RICHE : 200-350 mots par section. Contenu total > 1500 mots.

5. LOCALISATION FORTE :
   - Trajets types depuis/vers ${city.name} (gare, aéroport, centres d'intérêt)
   - Distance et temps de trajet estimé
   - Points d'intérêt et lieux desservis

6. CONVERSION : CTA vers la réservation/appel dans chaque section.

7. MOTS-CLÉS : ${service.keywords.map(k => `"${k} ${city.name}"`).join(', ')}

8. INTERDICTIONS : Ne PAS inventer de tarifs spécifiques ni d'horaires de transport.

RETOURNE un JSON strictement valide :
{
  "metaTitle": "string (max 60 chars — service + ville)",
  "metaDescription": "string (max 155 chars — bénéfice + disponibilité + CTA)",
  "h1": "string (titre naturel orienté solution de transport)",
  "heroTitle": "string (accroche courte et percutante)",
  "heroSubtitle": "string (proposition de valeur : confort, prix fixe, ponctualité)",
  "intro": "string (3-4 phrases — besoin de transport + solution VTC + ancrage local)",
  "seoSections": [
    { "title": "string (H2 — question ou angle transport)", "content": "string (200-350 mots)" }
  ],
  "faq": [
    { "question": "string (question réelle de client)", "answer": "string (60-120 mots)" }
  ],
  "highlights": ["string (avantage concret du service)"],
  "trustSignals": ["string (élément de confiance : licence, véhicule, expérience)"],
  "internalLinks": [
    { "slug": "string", "label": "string (ancre naturelle)" }
  ]
}

QUANTITÉS : 5 seoSections, 6 FAQ, 5 highlights, 4 trustSignals, 3 internalLinks.
Retourne UNIQUEMENT le JSON valide.`;
}

export function vtcCityOnlyPrompt(site: SiteConfig, city: City66, services: ServiceDef[]): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans le transport VTC. Tu maîtrises E-E-A-T, NLP et les pages hub locales.

CONTEXTE :
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- VTC : "${site.name}" basé à ${site.city}, 7j/7 24h/24
- Contact : ${site.phone}
- Services : ${services.map(s => s.name).join(', ')}
- Objectif : être LE chauffeur VTC de référence pour ${city.name}

INSTRUCTIONS :
1. PAGE HUB : Point d'entrée pour "VTC ${city.name}" / "chauffeur privé ${city.name}"
2. TRAJETS LOCAUX : Détailler les trajets types depuis ${city.name} (gares, aéroport, villes voisines)
3. E-E-A-T : Connaissance du terrain, professionnalisme, disponibilité
4. CONTENU RICHE : 200-350 mots par section SEO
5. AVANTAGE VTC vs alternatives : taxi, covoiturage, transports en commun

RETOURNE un JSON strictement valide :
{
  "metaTitle": "string (max 60 chars)",
  "metaDescription": "string (max 155 chars)",
  "h1": "string",
  "heroTitle": "string",
  "heroSubtitle": "string",
  "intro": "string (4-5 phrases — transport + local + disponibilité)",
  "seoSections": [{ "title": "string", "content": "string (200-350 mots)" }],
  "featuredServices": [{ "slug": "string", "name": "string", "description": "string (2 phrases)" }],
  "highlights": ["string"],
  "trustSignals": ["string"],
  "nearbyPlaces": ["string"],
  "faq": [{ "question": "string", "answer": "string (60-120 mots)" }]
}

QUANTITÉS : 5 seoSections, 5 featuredServices, 5 highlights, 4 trustSignals, 5 nearbyPlaces, 5 FAQ.
Retourne UNIQUEMENT le JSON valide.`;
}
