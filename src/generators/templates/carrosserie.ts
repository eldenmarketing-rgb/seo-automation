import { SiteConfig, ServiceDef } from '../../../config/sites.js';
import { City66 } from '../../../config/cities-66.js';

export function carrosseriePrompt(site: SiteConfig, service: ServiceDef, city: City66): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans la carrosserie et la réparation automobile. Tu maîtrises E-E-A-T, le NLP de Google et la rédaction de contenu qui domine les SERP locales.

CONTEXTE BUSINESS :
- Service : "${service.name}" (${service.keywords.join(', ')})
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Carrosserie : "${site.name}" situé à ${site.address}, ${site.postalCode} ${site.city}
- Téléphone : ${site.phone}
- Objectif : générer des APPELS de clients (souvent en situation de stress post-accident)

INSTRUCTIONS SEO AVANCÉES :

1. CHAMP SÉMANTIQUE : Couvre tout l'univers sémantique de "${service.name}" — techniques de réparation, matériaux, outils, étapes du processus, normes, terminologie assurance (expertise, franchise, prise en charge). Google évalue la profondeur thématique.

2. INTENT MATCHING :
   - Transactionnel : trouver un carrossier, devis, rendez-vous, urgence après sinistre
   - Informationnel : comment se passe une réparation, que couvre l'assurance, délais, conseils

3. E-E-A-T :
   - EXPÉRIENCE : "notre atelier traite quotidiennement des cas de..."
   - EXPERTISE : vocabulaire technique précis mais accessible
   - FIABILITÉ : relation avec les assurances, devis détaillé, suivi du véhicule
   - Contexte émotionnel : le client arrive souvent après un accident, être rassurant

4. CONTENU RICHE : 200-350 mots par section. Contenu total > 1500 mots.

5. LOCALISATION : Mentionner ${city.name} naturellement, distance (${city.distanceFromPerpignan}), axes routiers, zones accidentogènes si pertinent.

6. CONVERSION : CTA subtils vers l'appel téléphonique dans chaque section.

7. MOTS-CLÉS : ${service.keywords.map(k => `"${k} ${city.name}"`).join(', ')}

8. INTERDICTIONS : Ne PAS inventer de prix, délais précis, ou certifications spécifiques.

RETOURNE un JSON strictement valide :
{
  "metaTitle": "string (max 60 chars — service + ville + marque)",
  "metaDescription": "string (max 155 chars — bénéfice + CTA + localisation)",
  "h1": "string (titre naturel orienté solution)",
  "heroTitle": "string (accroche percutante)",
  "heroSubtitle": "string (réassurance principale)",
  "intro": "string (3-4 phrases — empathie + solution + ancrage local)",
  "seoSections": [
    { "title": "string (H2 — question ou angle informatif)", "content": "string (200-350 mots)" }
  ],
  "faq": [
    { "question": "string (question réelle de client)", "answer": "string (60-120 mots)" }
  ],
  "highlights": ["string (avantage concret et différenciant)"],
  "trustSignals": ["string (élément E-E-A-T)"],
  "internalLinks": [
    { "slug": "string", "label": "string (ancre descriptive)" }
  ]
}

QUANTITÉS : 5 seoSections, 6 FAQ, 5 highlights, 4 trustSignals, 3 internalLinks.
Retourne UNIQUEMENT le JSON valide.`;
}

export function carrosserieCityOnlyPrompt(site: SiteConfig, city: City66, services: ServiceDef[]): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé en carrosserie automobile. Tu maîtrises E-E-A-T, NLP et les pages hub locales.

CONTEXTE :
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Carrosserie : "${site.name}" à ${site.city} (${site.address})
- Téléphone : ${site.phone}
- Services : ${services.map(s => s.name).join(', ')}
- Objectif : être le carrossier de référence pour ${city.name}

INSTRUCTIONS :
1. PAGE HUB : Point d'entrée pour "carrossier ${city.name}" — couvrir tous les services
2. CHAMP SÉMANTIQUE LOCAL : Références locales, axes routiers, contexte automobile de la zone
3. E-E-A-T : Montrer la connaissance du terrain et l'expertise
4. CONTENU RICHE : 200-350 mots par section SEO
5. Contexte émotionnel : rassurer le client post-accident

RETOURNE un JSON strictement valide :
{
  "metaTitle": "string (max 60 chars)",
  "metaDescription": "string (max 155 chars)",
  "h1": "string",
  "heroTitle": "string",
  "heroSubtitle": "string",
  "intro": "string (4-5 phrases — empathie + expertise + local)",
  "seoSections": [{ "title": "string", "content": "string (200-350 mots)" }],
  "featuredServices": [{ "slug": "string", "name": "string", "description": "string (2 phrases)" }],
  "highlights": ["string"],
  "trustSignals": ["string"],
  "nearbyPlaces": ["string"],
  "faq": [{ "question": "string", "answer": "string (60-120 mots)" }]
}

QUANTITÉS : 5 seoSections, 6 featuredServices, 5 highlights, 4 trustSignals, 5 nearbyPlaces, 5 FAQ.
Retourne UNIQUEMENT le JSON valide.`;
}
