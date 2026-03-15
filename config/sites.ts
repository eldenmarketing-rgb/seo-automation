export interface SiteConfig {
  key: string;
  name: string;
  domain: string;
  business: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  schemaType: string;
  projectPath: string;
  dataStrategy: 'data-files' | 'config-only' | 'create-dynamic';
  serviceDataFile: string;
  cityDataFile: string;
  slugPageFile: string;
  vercelHookEnv: string;
  telegramChatEnv?: string;
  services: ServiceDef[];
  seoKeywordPatterns: string[];
}

export interface ServiceDef {
  slug: string;
  name: string;
  emoji: string;
  category: string;
  keywords: string[];
}

export const sites: Record<string, SiteConfig> = {
  garage: {
    key: 'garage',
    name: 'Garage Perpignan',
    domain: 'https://garage-perpignan.fr',
    business: 'Garage automobile - Entretien & Réparation toutes marques',
    phone: '06 23 15 35 04',
    email: 'contact@garage-perpignan.fr',
    address: 'Avenue du Commandant Soub',
    postalCode: '66000',
    city: 'Perpignan',
    schemaType: 'AutoRepair',
    projectPath: '/home/ubuntu/sites/Site_Garage',
    dataStrategy: 'data-files',
    serviceDataFile: 'data/services.ts',
    cityDataFile: 'data/cities.ts',
    slugPageFile: 'app/[slug]/page.tsx',
    vercelHookEnv: 'VERCEL_HOOK_GARAGE',
    telegramChatEnv: 'TELEGRAM_CHAT_GARAGE',
    services: [
      { slug: 'vidange', name: 'Vidange', emoji: '🛢️', category: 'entretien', keywords: ['vidange', 'huile moteur', 'vidange voiture'] },
      { slug: 'entretien-voiture', name: 'Entretien voiture', emoji: '🔧', category: 'entretien', keywords: ['entretien voiture', 'révision automobile', 'entretien auto'] },
      { slug: 'controle-technique', name: 'Pré-contrôle technique', emoji: '📋', category: 'entretien', keywords: ['contrôle technique', 'pré-contrôle'] },
      { slug: 'freins-plaquettes', name: 'Freins et plaquettes', emoji: '🛑', category: 'reparation', keywords: ['freins', 'plaquettes de frein', 'disque de frein'] },
      { slug: 'courroie-distribution', name: 'Courroie de distribution', emoji: '⚙️', category: 'reparation', keywords: ['courroie distribution', 'kit distribution'] },
      { slug: 'embrayage', name: 'Embrayage', emoji: '🔄', category: 'reparation', keywords: ['embrayage', 'kit embrayage', 'volant moteur'] },
      { slug: 'reparation-automobile', name: 'Réparation automobile', emoji: '🔩', category: 'reparation', keywords: ['réparation auto', 'panne voiture', 'mécanique'] },
      { slug: 'amortisseurs', name: 'Amortisseurs', emoji: '🏎️', category: 'reparation', keywords: ['amortisseurs', 'suspension', 'ressorts'] },
      { slug: 'echappement', name: 'Échappement', emoji: '💨', category: 'reparation', keywords: ['échappement', 'pot échappement', 'ligne échappement'] },
      { slug: 'diagnostic-auto', name: 'Diagnostic auto', emoji: '🖥️', category: 'confort', keywords: ['diagnostic auto', 'diagnostic électronique', 'voyant moteur'] },
      { slug: 'climatisation-auto', name: 'Climatisation auto', emoji: '❄️', category: 'confort', keywords: ['climatisation auto', 'recharge clim', 'clim voiture'] },
      { slug: 'pneus', name: 'Pneus et géométrie', emoji: '🛞', category: 'confort', keywords: ['pneus', 'géométrie', 'parallélisme', 'montage pneu'] },
      { slug: 'fap', name: 'Filtre à particules', emoji: '🌿', category: 'motorisation', keywords: ['filtre à particules', 'FAP', 'nettoyage FAP'] },
      { slug: 'vanne-egr', name: 'Vanne EGR', emoji: '♻️', category: 'motorisation', keywords: ['vanne EGR', 'nettoyage EGR'] },
      { slug: 'decalaminage', name: 'Décalaminage', emoji: '🧹', category: 'motorisation', keywords: ['décalaminage', 'décalaminage moteur'] },
      { slug: 'turbo', name: 'Turbo', emoji: '🚀', category: 'motorisation', keywords: ['turbo', 'turbocompresseur', 'réparation turbo'] },
      { slug: 'injecteurs', name: 'Injecteurs', emoji: '💉', category: 'motorisation', keywords: ['injecteurs', 'nettoyage injecteurs'] },
      { slug: 'boite-vitesse', name: 'Boîte de vitesse', emoji: '⚡', category: 'motorisation', keywords: ['boîte de vitesse', 'boîte auto', 'boîte manuelle'] },
    ],
    seoKeywordPatterns: [
      'garage {service} {ville}',
      '{service} {ville} pas cher',
      'meilleur garage {ville}',
      'garage automobile {ville}',
      '{service} voiture {ville}',
    ],
  },

  carrosserie: {
    key: 'carrosserie',
    name: 'Carrosserie Pro',
    domain: 'https://carrosserie-pro.fr',
    business: 'Carrosserie automobile - Réparation & Peinture',
    phone: '06 23 15 35 04',
    email: 'contact@carrosserie-pro.fr',
    address: 'Avenue du Commandant Soubielle',
    postalCode: '66000',
    city: 'Perpignan',
    schemaType: 'AutoBodyShop',
    projectPath: '/home/ubuntu/sites/Carrosserie-pro',
    dataStrategy: 'config-only',
    serviceDataFile: 'lib/config.ts',
    cityDataFile: 'lib/config.ts',
    slugPageFile: 'app/[page-slug]/page.tsx',
    vercelHookEnv: 'VERCEL_HOOK_CARROSSERIE',
    telegramChatEnv: 'TELEGRAM_CHAT_CARROSSERIE',
    services: [
      { slug: 'reparation-carrosserie', name: 'Réparation carrosserie', emoji: '🔨', category: 'carrosserie', keywords: ['réparation carrosserie', 'tôlerie', 'redressage'] },
      { slug: 'peinture-automobile', name: 'Peinture automobile', emoji: '🎨', category: 'peinture', keywords: ['peinture auto', 'peinture voiture', 'retouche peinture'] },
      { slug: 'debosselage-sans-peinture', name: 'Débosselage sans peinture', emoji: '✨', category: 'carrosserie', keywords: ['débosselage', 'DSP', 'sans peinture'] },
      { slug: 'lustrage-polissage', name: 'Lustrage et polissage', emoji: '💎', category: 'esthetique', keywords: ['lustrage', 'polissage', 'rénovation peinture'] },
      { slug: 'reparation-pare-brise', name: 'Réparation pare-brise', emoji: '🪟', category: 'vitrage', keywords: ['pare-brise', 'impact pare-brise', 'remplacement pare-brise'] },
      { slug: 'covering-wrapping', name: 'Covering / Wrapping', emoji: '🎭', category: 'esthetique', keywords: ['covering', 'wrapping', 'film vinyle'] },
      { slug: 'customisation-automobile', name: 'Customisation automobile', emoji: '🏁', category: 'esthetique', keywords: ['customisation', 'tuning', 'personnalisation'] },
      { slug: 'vehicule-accidente', name: 'Véhicule accidenté', emoji: '🚗', category: 'carrosserie', keywords: ['véhicule accidenté', 'sinistre', 'assurance'] },
      { slug: 'renovation-jantes', name: 'Rénovation jantes', emoji: '🛞', category: 'esthetique', keywords: ['rénovation jantes', 'peinture jantes'] },
      { slug: 'renovation-phares', name: 'Rénovation phares', emoji: '💡', category: 'esthetique', keywords: ['rénovation phares', 'polissage phares'] },
    ],
    seoKeywordPatterns: [
      'carrossier {service} {ville}',
      '{service} {ville}',
      'carrosserie {ville}',
      '{service} voiture {ville} devis gratuit',
    ],
  },

  massage: {
    key: 'massage',
    name: 'Elaya Rituel',
    domain: 'https://massage-domicile-perpignan.fr',
    business: 'Massage bien-être à domicile exclusivement féminin',
    phone: '06 67 91 24 43',
    email: 'contact@elayarituel.fr',
    address: '2 rue Camp Partere',
    postalCode: '66000',
    city: 'Perpignan',
    schemaType: 'HealthAndBeautyBusiness',
    projectPath: '/home/ubuntu/sites/Elayarituel',
    dataStrategy: 'create-dynamic',
    serviceDataFile: 'data/services.ts',
    cityDataFile: 'data/cities.ts',
    slugPageFile: 'app/[slug]/page.tsx',
    vercelHookEnv: 'VERCEL_HOOK_MASSAGE',
    telegramChatEnv: 'TELEGRAM_CHAT_MASSAGE',
    services: [
      { slug: 'massage-relaxant', name: 'Massage relaxant', emoji: '🧘', category: 'relaxation', keywords: ['massage relaxant', 'massage détente', 'massage bien-être'] },
      { slug: 'massage-sportif', name: 'Massage sportif', emoji: '💪', category: 'sport', keywords: ['massage sportif', 'massage musculaire', 'récupération'] },
      { slug: 'massage-prenatal', name: 'Massage prénatal', emoji: '🤰', category: 'maternite', keywords: ['massage prénatal', 'massage femme enceinte', 'massage grossesse'] },
      { slug: 'massage-aux-pierres-chaudes', name: 'Massage aux pierres chaudes', emoji: '🪨', category: 'relaxation', keywords: ['pierres chaudes', 'hot stone', 'massage pierres'] },
      { slug: 'massage-californien', name: 'Massage californien', emoji: '🌊', category: 'relaxation', keywords: ['massage californien', 'massage enveloppant'] },
      { slug: 'massage-lomi-lomi', name: 'Massage lomi-lomi', emoji: '🌺', category: 'relaxation', keywords: ['lomi-lomi', 'massage hawaïen'] },
      { slug: 'reflexologie-plantaire', name: 'Réflexologie plantaire', emoji: '🦶', category: 'therapeutique', keywords: ['réflexologie', 'réflexologie plantaire', 'massage pieds'] },
      { slug: 'massage-dos', name: 'Massage du dos', emoji: '🫳', category: 'therapeutique', keywords: ['massage dos', 'mal de dos', 'massage cervicales'] },
    ],
    seoKeywordPatterns: [
      '{service} à domicile {ville}',
      'massage à domicile {ville}',
      '{service} {ville}',
      'masseuse à domicile {ville}',
      'massage femme {ville}',
    ],
  },

  vtc: {
    key: 'vtc',
    name: 'Ideal Transport',
    domain: 'https://ideal-transport.fr',
    business: 'VTC & Taxi privé - Transferts et longue distance',
    phone: '07 81 51 19 31',
    email: 'contact@ideal-transport.fr',
    address: '2 rue Camp Partere',
    postalCode: '66000',
    city: 'Perpignan',
    schemaType: 'TaxiService',
    projectPath: '/home/ubuntu/sites/ideal-transport',
    dataStrategy: 'data-files',
    serviceDataFile: 'lib/cities.tsx',
    cityDataFile: 'lib/cities.tsx',
    slugPageFile: 'app/[slug]/page.tsx',
    vercelHookEnv: 'VERCEL_HOOK_VTC',
    telegramChatEnv: 'TELEGRAM_CHAT_VTC',
    services: [
      { slug: 'taxi-vtc', name: 'Taxi VTC', emoji: '🚗', category: 'transfert', keywords: ['taxi', 'VTC', 'chauffeur privé'] },
      { slug: 'transfert-aeroport', name: 'Transfert aéroport', emoji: '✈️', category: 'aeroport', keywords: ['transfert aéroport', 'taxi aéroport', 'navette aéroport'] },
      { slug: 'transfert-gare', name: 'Transfert gare', emoji: '🚄', category: 'gare', keywords: ['transfert gare', 'taxi gare TGV'] },
      { slug: 'longue-distance', name: 'Longue distance', emoji: '🛣️', category: 'distance', keywords: ['longue distance', 'trajet longue distance'] },
      { slug: 'mise-a-disposition', name: 'Mise à disposition', emoji: '⏰', category: 'premium', keywords: ['mise à disposition', 'chauffeur privé journée'] },
      { slug: 'transport-medical', name: 'Transport médical', emoji: '🏥', category: 'medical', keywords: ['transport médical', 'taxi conventionné'] },
    ],
    seoKeywordPatterns: [
      'taxi {ville}',
      'vtc {ville}',
      'taxi vtc {ville}',
      'chauffeur privé {ville}',
      'transfert aéroport {ville}',
      'taxi {ville} perpignan',
    ],
  },

  voitures: {
    key: 'voitures',
    name: 'Ideo Car',
    domain: 'https://www.ideo-car.fr',
    business: 'Vente de voitures d\'occasion - Perpignan & environs',
    phone: '06 23 15 35 04',
    email: 'contact@ideo-car.fr',
    address: '4 avenue André Ampère',
    postalCode: '66330',
    city: 'Cabestany',
    schemaType: 'AutoDealer',
    projectPath: '/home/ubuntu/sites/Ideo-car',
    dataStrategy: 'data-files',
    serviceDataFile: 'data/vehicles.ts',
    cityDataFile: 'data/cities.ts',
    slugPageFile: 'pages/[slug].tsx',
    vercelHookEnv: 'VERCEL_HOOK_VOITURES',
    telegramChatEnv: 'TELEGRAM_CHAT_VOITURES',
    services: [
      { slug: 'voiture-occasion', name: 'Voiture d\'occasion', emoji: '🚗', category: 'vente', keywords: ['voiture occasion', 'véhicule occasion', 'auto occasion'] },
      { slug: 'suv-occasion', name: 'SUV d\'occasion', emoji: '🚙', category: 'vente', keywords: ['SUV occasion', '4x4 occasion', 'crossover occasion'] },
      { slug: 'citadine-occasion', name: 'Citadine d\'occasion', emoji: '🏙️', category: 'vente', keywords: ['citadine occasion', 'petite voiture occasion'] },
      { slug: 'berline-occasion', name: 'Berline d\'occasion', emoji: '🚘', category: 'vente', keywords: ['berline occasion', 'familiale occasion'] },
      { slug: 'utilitaire-occasion', name: 'Utilitaire d\'occasion', emoji: '🚐', category: 'utilitaire', keywords: ['utilitaire occasion', 'fourgon occasion', 'camionnette occasion'] },
      { slug: 'reprise-vehicule', name: 'Reprise de véhicule', emoji: '🔄', category: 'service', keywords: ['reprise véhicule', 'rachat voiture', 'reprise auto'] },
      { slug: 'financement-auto', name: 'Financement auto', emoji: '💰', category: 'service', keywords: ['financement auto', 'crédit auto', 'leasing occasion'] },
      { slug: 'garantie-occasion', name: 'Garantie occasion', emoji: '🛡️', category: 'service', keywords: ['garantie occasion', 'garantie véhicule', 'extension garantie'] },
    ],
    seoKeywordPatterns: [
      'voiture occasion {ville}',
      '{service} {ville}',
      'achat voiture {ville}',
      'concessionnaire occasion {ville}',
      'voiture pas cher {ville}',
      'garage occasion {ville}',
    ],
  },

  restaurant: {
    key: 'restaurant',
    name: 'Mon Sauveur',
    domain: 'https://livraison-alcool-nuit-perpignan.com',
    business: 'Livraison d\'alcool et boissons à domicile la nuit',
    phone: '07 49 87 44 78',
    email: 'contact@livraison-alcool-nuit-perpignan.com',
    address: 'Perpignan',
    postalCode: '66000',
    city: 'Perpignan',
    schemaType: 'LocalBusiness',
    projectPath: '/home/ubuntu/sites/Mon-Sauveur',
    dataStrategy: 'data-files',
    serviceDataFile: 'data/seo-pages.ts',
    cityDataFile: 'data/seo-pages.ts',
    slugPageFile: 'pages/[slug].tsx',
    vercelHookEnv: 'VERCEL_HOOK_RESTAURANT',
    telegramChatEnv: 'TELEGRAM_CHAT_RESTAURANT',
    services: [
      { slug: 'livraison-alcool-nuit', name: 'Livraison alcool nuit', emoji: '🍾', category: 'livraison', keywords: ['livraison alcool nuit', 'alcool à domicile', 'livraison boisson nuit'] },
      { slug: 'livraison-bieres', name: 'Livraison bières', emoji: '🍺', category: 'livraison', keywords: ['livraison bières', 'bière à domicile', 'pack bière livraison'] },
      { slug: 'livraison-vin', name: 'Livraison vin', emoji: '🍷', category: 'livraison', keywords: ['livraison vin', 'vin à domicile', 'bouteille vin livraison'] },
      { slug: 'livraison-spiritueux', name: 'Livraison spiritueux', emoji: '🥃', category: 'livraison', keywords: ['livraison spiritueux', 'whisky livraison', 'vodka livraison', 'rhum livraison'] },
      { slug: 'livraison-champagne', name: 'Livraison champagne', emoji: '🥂', category: 'livraison', keywords: ['livraison champagne', 'champagne à domicile', 'champagne nuit'] },
      { slug: 'livraison-soiree', name: 'Livraison soirée', emoji: '🎉', category: 'evenement', keywords: ['livraison soirée', 'alcool soirée', 'commande soirée'] },
      { slug: 'livraison-apero', name: 'Livraison apéro', emoji: '🥨', category: 'evenement', keywords: ['livraison apéro', 'apéro à domicile', 'snacks livraison'] },
    ],
    seoKeywordPatterns: [
      'livraison alcool nuit {ville}',
      'livraison alcool {ville}',
      'alcool à domicile {ville}',
      'livraison boisson nuit {ville}',
      '{service} {ville}',
      'livraison alcool 24h {ville}',
    ],
  },
};
