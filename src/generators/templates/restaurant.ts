import { SiteConfig, ServiceDef } from '../../../config/sites.js';
import { City66 } from '../../../config/cities-66.js';

export function restaurantPrompt(site: SiteConfig, service: ServiceDef, city: City66): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans les services de livraison nocturne et le e-commerce local. Tu maîtrises E-E-A-T, le NLP de Google et la rédaction de contenu qui domine les SERP locales.

CONTEXTE BUSINESS :
- Service : "${service.name}" (${service.keywords.join(', ')})
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Entreprise : "${site.name}" — livraison d'alcool et boissons à domicile la nuit
- Contact : ${site.phone}
- Horaires : 7j/7 de 20h à 4h du matin
- Objectif : générer des APPELS de clients qui veulent se faire livrer

INSTRUCTIONS SEO AVANCÉES :

1. CHAMP SÉMANTIQUE : Couvre tout l'univers de "${service.name}" — types de boissons, occasions (soirée, apéro, fête, événement), avantages de la livraison à domicile, rapidité, praticité. Google évalue la profondeur thématique.

2. INTENT MATCHING :
   - Transactionnel : commander de l'alcool, se faire livrer maintenant, livraison rapide
   - Informationnel : horaires de livraison, zone desservie, comment commander, types de boissons disponibles

3. E-E-A-T :
   - EXPÉRIENCE : connaissance des soirées perpignanaises, des besoins nocturnes
   - EXPERTISE : large choix de boissons, connaissance des produits
   - FIABILITÉ : livraison rapide 30 min, service discret, prix fixes

4. CONTENU RICHE : 200-350 mots par section. Contenu total > 1500 mots.

5. LOCALISATION FORTE :
   - Mentionner ${city.name} naturellement
   - Quartiers desservis, temps de livraison estimé
   - Vie nocturne locale

6. CONVERSION : CTA vers l'appel téléphonique dans chaque section. Urgence naturelle ("on arrive en 30 min").

7. MOTS-CLÉS : ${service.keywords.map(k => `"${k} ${city.name}"`).join(', ')}

8. INTERDICTIONS : Ne PAS encourager la consommation excessive. Inclure la mention légale "L'abus d'alcool est dangereux pour la santé" dans l'intro.

RETOURNE un JSON strictement valide :
{
  "metaTitle": "string (max 60 chars — service + ville + marque)",
  "metaDescription": "string (max 155 chars — bénéfice + disponibilité + CTA)",
  "h1": "string (titre naturel orienté service de livraison)",
  "heroTitle": "string (accroche courte et percutante)",
  "heroSubtitle": "string (proposition de valeur : rapidité, choix, disponibilité)",
  "intro": "string (3-4 phrases — besoin nocturne + solution + ancrage local + mention légale)",
  "seoSections": [
    { "title": "string (H2 — question ou angle livraison)", "content": "string (200-350 mots)" }
  ],
  "faq": [
    { "question": "string (question réelle de client)", "answer": "string (60-120 mots)" }
  ],
  "highlights": ["string (avantage concret du service)"],
  "trustSignals": ["string (élément de confiance : rapidité, discrétion, choix)"],
  "internalLinks": [
    { "slug": "string", "label": "string (ancre naturelle)" }
  ]
}

QUANTITÉS : 5 seoSections, 6 FAQ, 5 highlights, 4 trustSignals, 3 internalLinks.
Retourne UNIQUEMENT le JSON valide.`;
}

export function restaurantCityOnlyPrompt(site: SiteConfig, city: City66, services: ServiceDef[]): string {
  return `Tu es un rédacteur SEO expert niveau agence, spécialisé dans les services de livraison nocturne. Tu maîtrises E-E-A-T, NLP et les pages hub locales.

CONTEXTE :
- Ville : "${city.name}" (${city.postalCode}, à ${city.distanceFromPerpignan} de Perpignan)
- Entreprise : "${site.name}" — livraison d'alcool et boissons à domicile la nuit
- Contact : ${site.phone}
- Horaires : 7j/7 de 20h à 4h
- Services : ${services.map(s => s.name).join(', ')}
- Objectif : être LE service de livraison d'alcool de référence pour ${city.name}

INSTRUCTIONS :
1. PAGE HUB : Point d'entrée pour "livraison alcool ${city.name}" — présenter tout le catalogue
2. VIE NOCTURNE LOCALE : Mentionner les occasions, événements, quartiers festifs
3. E-E-A-T : Montrer la connaissance de ${city.name}, rapidité, professionnalisme
4. CONTENU RICHE : 200-350 mots par section SEO
5. MENTION LÉGALE : Inclure "L'abus d'alcool est dangereux pour la santé" dans l'intro

RETOURNE un JSON strictement valide :
{
  "metaTitle": "string (max 60 chars)",
  "metaDescription": "string (max 155 chars)",
  "h1": "string",
  "heroTitle": "string",
  "heroSubtitle": "string",
  "intro": "string (4-5 phrases — livraison nocturne + local + mention légale)",
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
