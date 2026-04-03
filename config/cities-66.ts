export interface City66 {
  name: string;
  slug: string;
  postalCode: string;
  population: number;
  distanceFromPerpignan: string;
  zone: 'perpignan' | 'proche' | 'peripherie' | 'eloigne';
}

// Villes du département 66 (Pyrénées-Orientales) triées par pertinence SEO
export const cities66: City66[] = [
  // Zone Perpignan
  { name: 'Perpignan', slug: 'perpignan', postalCode: '66000', population: 121875, distanceFromPerpignan: '0 min', zone: 'perpignan' },

  // Zone proche (< 10 min)
  { name: 'Cabestany', slug: 'cabestany', postalCode: '66330', population: 9800, distanceFromPerpignan: '5 min', zone: 'proche' },
  { name: 'Saint-Estève', slug: 'saint-esteve', postalCode: '66240', population: 11800, distanceFromPerpignan: '7 min', zone: 'proche' },
  { name: 'Pia', slug: 'pia', postalCode: '66380', population: 8600, distanceFromPerpignan: '8 min', zone: 'proche' },
  { name: 'Bompas', slug: 'bompas', postalCode: '66430', population: 7900, distanceFromPerpignan: '7 min', zone: 'proche' },
  { name: 'Saleilles', slug: 'saleilles', postalCode: '66280', population: 5400, distanceFromPerpignan: '8 min', zone: 'proche' },
  { name: 'Canohès', slug: 'canohes', postalCode: '66680', population: 5200, distanceFromPerpignan: '8 min', zone: 'proche' },
  { name: 'Toulouges', slug: 'toulouges', postalCode: '66350', population: 7100, distanceFromPerpignan: '8 min', zone: 'proche' },
  { name: 'Le Soler', slug: 'le-soler', postalCode: '66270', population: 7800, distanceFromPerpignan: '10 min', zone: 'proche' },
  { name: 'Pollestres', slug: 'pollestres', postalCode: '66450', population: 4500, distanceFromPerpignan: '10 min', zone: 'proche' },
  { name: 'Claira', slug: 'claira', postalCode: '66530', population: 4100, distanceFromPerpignan: '10 min', zone: 'proche' },

  // Zone périphérie (10-20 min)
  { name: 'Rivesaltes', slug: 'rivesaltes', postalCode: '66600', population: 8700, distanceFromPerpignan: '12 min', zone: 'peripherie' },
  { name: 'Canet-en-Roussillon', slug: 'canet-en-roussillon', postalCode: '66140', population: 13300, distanceFromPerpignan: '12 min', zone: 'peripherie' },
  { name: 'Saint-Cyprien', slug: 'saint-cyprien', postalCode: '66750', population: 10800, distanceFromPerpignan: '15 min', zone: 'peripherie' },
  { name: 'Elne', slug: 'elne', postalCode: '66200', population: 8300, distanceFromPerpignan: '14 min', zone: 'peripherie' },
  { name: 'Thuir', slug: 'thuir', postalCode: '66300', population: 7700, distanceFromPerpignan: '15 min', zone: 'peripherie' },
  { name: 'Saint-Laurent-de-la-Salanque', slug: 'saint-laurent-de-la-salanque', postalCode: '66250', population: 10000, distanceFromPerpignan: '15 min', zone: 'peripherie' },
  { name: 'Le Barcarès', slug: 'le-barcares', postalCode: '66420', population: 4500, distanceFromPerpignan: '18 min', zone: 'peripherie' },
  { name: 'Argelès-sur-Mer', slug: 'argeles-sur-mer', postalCode: '66700', population: 10600, distanceFromPerpignan: '20 min', zone: 'peripherie' },
  { name: 'Sainte-Marie-la-Mer', slug: 'sainte-marie-la-mer', postalCode: '66470', population: 4800, distanceFromPerpignan: '15 min', zone: 'peripherie' },
  { name: 'Torreilles', slug: 'torreilles', postalCode: '66440', population: 3500, distanceFromPerpignan: '15 min', zone: 'peripherie' },
  { name: 'Villeneuve-de-la-Raho', slug: 'villeneuve-de-la-raho', postalCode: '66180', population: 4800, distanceFromPerpignan: '10 min', zone: 'peripherie' },

  // Zone éloignée (20-40 min)
  { name: 'Collioure', slug: 'collioure', postalCode: '66190', population: 2900, distanceFromPerpignan: '25 min', zone: 'eloigne' },
  { name: 'Port-Vendres', slug: 'port-vendres', postalCode: '66660', population: 4100, distanceFromPerpignan: '28 min', zone: 'eloigne' },
  { name: 'Banyuls-sur-Mer', slug: 'banyuls-sur-mer', postalCode: '66650', population: 4800, distanceFromPerpignan: '32 min', zone: 'eloigne' },
  { name: 'Céret', slug: 'ceret', postalCode: '66400', population: 7900, distanceFromPerpignan: '30 min', zone: 'eloigne' },
  { name: 'Prades', slug: 'prades', postalCode: '66500', population: 6100, distanceFromPerpignan: '35 min', zone: 'eloigne' },
  { name: 'Ille-sur-Têt', slug: 'ille-sur-tet', postalCode: '66130', population: 5600, distanceFromPerpignan: '25 min', zone: 'eloigne' },
  { name: 'Amélie-les-Bains', slug: 'amelie-les-bains', postalCode: '66110', population: 3800, distanceFromPerpignan: '35 min', zone: 'eloigne' },
  { name: 'Leucate', slug: 'leucate', postalCode: '11370', population: 4500, distanceFromPerpignan: '30 min', zone: 'eloigne' },
  { name: 'Cerbère', slug: 'cerbere', postalCode: '66290', population: 1400, distanceFromPerpignan: '40 min', zone: 'eloigne' },
  { name: 'Vernet-les-Bains', slug: 'vernet-les-bains', postalCode: '66820', population: 1400, distanceFromPerpignan: '45 min', zone: 'eloigne' },
  { name: 'Font-Romeu', slug: 'font-romeu', postalCode: '66120', population: 2000, distanceFromPerpignan: '55 min', zone: 'eloigne' },
];

// Villes pertinentes par type de site
export const citiesBySite: Record<string, string[]> = {
  garage: [
    'perpignan', 'cabestany', 'saint-esteve', 'pia', 'bompas', 'saleilles',
    'canohes', 'toulouges', 'le-soler', 'pollestres', 'claira', 'rivesaltes',
    'canet-en-roussillon', 'elne', 'thuir', 'saint-laurent-de-la-salanque',
    'argeles-sur-mer', 'saint-cyprien', 'le-barcares', 'collioure',
    'port-vendres', 'ceret', 'prades', 'ille-sur-tet',
  ],
  carrosserie: [
    'perpignan', 'cabestany', 'saint-esteve', 'pia', 'bompas', 'saleilles',
    'canohes', 'toulouges', 'le-soler', 'pollestres', 'rivesaltes',
    'canet-en-roussillon', 'elne', 'thuir', 'saint-cyprien',
    'argeles-sur-mer', 'ceret', 'prades', 'ille-sur-tet',
    'saint-laurent-de-la-salanque', 'le-barcares', 'claira', 'collioure',
  ],
  massage: [
    'perpignan', 'cabestany', 'saint-esteve', 'pia', 'toulouges',
    'le-soler', 'pollestres', 'rivesaltes', 'canet-en-roussillon',
    'elne', 'thuir', 'saint-cyprien', 'argeles-sur-mer', 'collioure',
    'bompas', 'saleilles', 'canohes', 'claira',
  ],
  vtc: [
    'perpignan', 'canet-en-roussillon', 'argeles-sur-mer', 'collioure',
    'port-vendres', 'banyuls-sur-mer', 'cerbere', 'saint-cyprien',
    'le-barcares', 'leucate', 'rivesaltes', 'thuir', 'ceret', 'prades',
    'amelie-les-bains', 'vernet-les-bains', 'font-romeu', 'ille-sur-tet',
    'elne', 'cabestany', 'saint-esteve', 'saint-laurent-de-la-salanque',
  ],
  voitures: [
    'perpignan', 'cabestany', 'saint-esteve', 'pia', 'bompas', 'saleilles',
    'canohes', 'toulouges', 'le-soler', 'pollestres', 'rivesaltes',
    'canet-en-roussillon', 'elne', 'thuir', 'saint-cyprien',
    'argeles-sur-mer', 'ceret', 'prades', 'ille-sur-tet', 'claira',
  ],
  restaurant: [
    'perpignan', 'cabestany', 'saint-esteve', 'pia', 'bompas',
    'toulouges', 'le-soler', 'claira', 'rivesaltes',
    'canet-en-roussillon', 'saint-cyprien', 'elne', 'thuir',
    'argeles-sur-mer', 'le-barcares', 'sainte-marie-la-mer',
    'torreilles', 'villeneuve-de-la-raho', 'leucate',
  ],
};
