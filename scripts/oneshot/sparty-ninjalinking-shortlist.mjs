#!/usr/bin/env node
// Génère reports/sparty-ninjalinking-shortlist.md
// Extrait du scrape SERP concurrentiel les ~80 cibles ninjalinking pures
// (self-serve : annuaires, forums, Q&A, web 2.0, bookmarking, blog comments)
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('reports/sparty-ninjalinking-opportunities.json', 'utf8'));

const NINJA_CATS = new Set([
  'Annuaires prestataires événementiel',
  'Forums actifs FR',
  'Q&A — questions ouvertes',
  'Web 2.0 dans la niche',
  'Blog comments ouverts',
  'Sites musique / DJ',
  'Bookmarking / Curation',
  'Communautés mariage/event FR',
]);

// Domaines à exclure : déjà dans le kit + concurrents + médias HS + s-party lui-même
const EXCLUDE = new Set([
  // Notre site
  's-party.fr','www.s-party.fr',
  // Déjà couverts par le kit 19 backlinks
  'www.facebook.com','facebook.com',
  'www.instagram.com','instagram.com',
  'www.pinterest.com','pinterest.com','fr.pinterest.com',
  'www.linkedin.com','linkedin.com','fr.linkedin.com',
  'www.eventbrite.fr','eventbrite.fr','www.eventbrite.com',
  'www.pagesjaunes.fr','pagesjaunes.fr',
  'www.bingplaces.com','bingplaces.com',
  'www.yelp.fr','yelp.fr','www.yelp.com',
  'about.me','linktr.ee','crunchbase.com','www.crunchbase.com',
  'medium.com','wordpress.com','www.wordpress.com',
  'blogger.com','blogspot.com',
  'tumblr.com','www.tumblr.com',
  'jimdofree.com','jimdo.com','weebly.com',
  'twitter.com','x.com',
  'fr.quora.com','www.quora.com',
  'expressyourideas.quora.com','rentalsquietevents.quora.com',
  // Concurrents directs silent disco
  'silentdisco.fr','silentnativ.com','silent-disco.com','silentdiscoparis.fr',
  'www.silentdiscoparis.fr','www.silentevents.fr','silentevents.fr',
  'www.location-silent-disco.com','location-silent-disco.com',
  'silentsystem.fr','www.danslenoir.com','danslenoir.com',
  'www.evenses.fr','evenses.fr','silentdiscobox.fr','silentdis.co',
  'silentdiscoparty.uk','sales.silentdiscoking.com','silentadventures.com',
  'faire-une-silent-party.ch',
  // Médias / sites HS
  'www.lefigaro.fr','www.franceinfo.fr','www.capital.fr','www.hcch.net',
  'www.lemonde.fr','www.bfmtv.com','www.francetravail.fr',
  'fr.fiverr.com','www.merci-app.com','www.invinee.com',
  'annuaire-entreprises.data.gouv.fr',
  'www.youtube.com','youtube.com','www.dailymotion.com','dailymotion.com',
  'www.google.com','www.amazon.fr',
  // Reddit (les fils anciens sont fermés, peu rentable)
  'www.reddit.com','reddit.com',
  // Musique pure HS (artistes silent disco hors prestataires)
  'soundcloud.com','www.mixcloud.com','www.last.fm',
  'seeming.bandcamp.com','kittysolaris.bandcamp.com','neinrecords.bandcamp.com',
  'cursormajor.bandcamp.com','championmusic.bandcamp.com',
  'spidcypools.tumblr.com',
  // Sites institutionnels HS
  'www.calais.fr','www.ouest-france.fr','assouevam.fr',
  // Sous-domaine de blog Tumblr déjà couvert par le compte tumblr.com du kit
]);

// Mapping manuel domaine → inscription URL + mécanique
// (basé sur connaissance des annuaires FR + analyse des titles)
const ENRICH = {
  'communaute.mariages.net': {
    inscriptionUrl: 'https://communaute.mariages.net/forum/se-inscrire',
    methode: 'Forum — créer profil + signature avec lien',
    bio: 'bio-160',
    note: 'Très actif, fil "Animation" idéal pour poster cas client silent disco mariage',
  },
  'www.mariages.net': {
    inscriptionUrl: 'https://www.mariages.net/emp-Acceso.php',
    methode: 'Fiche prestataire payante (gratuit 1 mois trial)',
    bio: 'bio-500',
    note: 'Catégorie "Musique mariage / DJ" — fiche prestataire',
  },
  'www.mariagepresta.fr': {
    inscriptionUrl: 'https://www.mariagepresta.fr/inscription',
    methode: 'Annuaire gratuit — inscription directe',
    bio: 'bio-500',
    note: 'Annuaire majeur prestataires mariage, gratuit',
  },
  'www.agence-evenementielle-innovevents.fr': {
    inscriptionUrl: 'https://www.agence-evenementielle-innovevents.fr/contact/',
    methode: 'Page contact / forum événementiel (commentaires)',
    bio: 'bio-160',
    note: 'Pas un annuaire — laisser commentaires pertinents sur articles silent party',
  },
  'www.evenementielpourtous.com': {
    inscriptionUrl: 'https://www.evenementielpourtous.com/inscription',
    methode: 'Annuaire gratuit événementiel',
    bio: 'bio-500',
    note: 'Catégorie animation DJ / animation mariage',
  },
  'www.mariezvous.fr': {
    inscriptionUrl: 'https://www.mariezvous.fr/annuaire-prestataire-mariage/',
    methode: 'Annuaire gratuit — sélection DJ mariage',
    bio: 'bio-500',
    note: 'Catégorie "DJ de mariage" — soumettre fiche',
  },
  'www.petit-mariage-entre-amis.fr': {
    inscriptionUrl: 'https://www.petit-mariage-entre-amis.fr/blog',
    methode: 'Blog comments — articles silent party déjà publiés',
    bio: 'bio-160',
    note: 'Commenter article "Le secret d\'une ambiance qui déchire : la silent party" avec lien profil',
  },
  'lamarieeencolere.com': {
    inscriptionUrl: 'https://lamarieeencolere.com/annuaire-de-prestataires/',
    methode: 'Annuaire prestataires + blog comments',
    bio: 'bio-500',
    note: 'Annuaire mariage gros trafic, soumettre fiche DJ/animation',
  },
  'www.aufeminin.com': {
    inscriptionUrl: 'https://compte.aufeminin.com/inscription',
    methode: 'Forum mariage — créer compte + post',
    bio: 'bio-160',
    note: 'Forum mariage actif, poster sur fil DJ ou animation',
  },
  'issuu.com': {
    inscriptionUrl: 'https://issuu.com/signup',
    methode: 'Upload PDF avec liens cliquables',
    bio: 'bio-500',
    note: 'Publier brochure S-Party PDF avec lien site',
  },
  'france-effect.com': {
    inscriptionUrl: 'https://france-effect.com/inscription',
    methode: 'Annuaire DJ / événementiel',
    bio: 'bio-500',
    note: 'Catégorie DJ mariage',
  },
  'linkaband.com': {
    inscriptionUrl: 'https://linkaband.com/inscription-artiste',
    methode: 'Marketplace artistes / DJ',
    bio: 'bio-500',
    note: 'Catégorie DJ mariage / animation camping',
  },
  'lolevenements.fr': {
    inscriptionUrl: 'https://lolevenements.fr/contact',
    methode: 'Blog event — commenter ou demander mention',
    bio: 'bio-160',
    note: 'Blog animateur mariage, commenter articles animation',
  },
  'www.hosmoz.fr': {
    inscriptionUrl: 'https://www.hosmoz.fr/Inscription-prestataire',
    methode: 'Annuaire séminaires / event',
    bio: 'bio-500',
    note: 'Catégorie animation séminaire',
  },
  'www.eventsdanslaville.fr': {
    inscriptionUrl: 'https://www.eventsdanslaville.fr/inscription',
    methode: 'Annuaire événementiel France',
    bio: 'bio-500',
    note: 'Catégorie animation',
  },
  'planning.wedding': {
    inscriptionUrl: 'https://planning.wedding/fr/prestataires',
    methode: 'Plateforme mariage — fiche prestataire',
    bio: 'bio-500',
    note: 'Outil organisation mariage avec annuaire',
  },
  'www.weddingplan.fr': {
    inscriptionUrl: 'https://www.weddingplan.fr/fr/l-annuaire-pour-les-prestataires-du-mariage',
    methode: 'Annuaire prestataires mariage',
    bio: 'bio-500',
    note: 'Catégorie DJ / animation',
  },
  'www.theperfectwedding.fr': {
    inscriptionUrl: 'https://www.theperfectwedding.fr/inscription',
    methode: 'Plateforme mariage',
    bio: 'bio-500',
    note: '',
  },
  'www.queenforaday.fr': {
    inscriptionUrl: 'https://www.queenforaday.fr/blog-mariage/',
    methode: 'Blog comments + forum',
    bio: 'bio-160',
    note: 'Blog mariage influent, commenter articles animation',
  },
  'forum.doctissimo.fr': {
    inscriptionUrl: 'https://www.doctissimo.fr/inscription',
    methode: 'Forum — créer compte + post',
    bio: 'bio-160',
    note: 'Forum vie pratique mariage, poster idées animation',
  },
  'fr.audiofanzine.com': {
    inscriptionUrl: 'https://fr.audiofanzine.com/membre/inscription/',
    methode: 'Forum DJ pro — créer compte + signature',
    bio: 'bio-160',
    note: 'Forum DJ pro français très actif, créer profil + post intelligent silent disco',
  },
  'www.solidays.org': {
    inscriptionUrl: 'https://www.solidays.org/contact',
    methode: 'Page contact festival',
    bio: 'bio-160',
    note: 'Festival — pas un lien direct mais à creuser',
  },
  'www.leblogdemadamec.fr': {
    inscriptionUrl: 'https://www.leblogdemadamec.fr/contact/',
    methode: 'Blog comments mariage',
    bio: 'bio-160',
    note: 'Top blog mariage FR, commenter article animation',
  },
  'www.over-blog.com': {
    inscriptionUrl: 'https://www.over-blog.com/creer-un-blog/',
    methode: 'Web 2.0 — créer blog dédié',
    bio: 'bio-500',
    note: 'Créer blog sparty-animation.over-blog.com + 3 articles',
  },
  'www.scoop-it.fr': {
    inscriptionUrl: 'https://www.scoop.it/account/sign-up',
    methode: 'Curation — créer topic + scoops',
    bio: 'bio-160',
    note: 'Créer topic "Silent disco France" + scoop article s-party.fr',
  },
  'www.eventplanner.fr': {
    inscriptionUrl: 'https://www.eventplanner.fr/account/signup',
    methode: 'Annuaire pro événementiel',
    bio: 'bio-500',
    note: 'Catégorie animation soirée',
  },
  'fr.kompass.com': {
    inscriptionUrl: 'https://fr.kompass.com/inscription',
    methode: 'Annuaire B2B (fiche entreprise gratuite)',
    bio: 'bio-500',
    note: 'Déjà dans le kit (14) — vérifier doublon',
  },
  'www.lesmariagesdemademoisellel.fr': {
    inscriptionUrl: 'https://www.lesmariagesdemademoisellel.fr/contact',
    methode: 'Annuaire de prestataires mariage',
    bio: 'bio-500',
    note: 'Annuaire régional mariage',
  },
  'www.1001dj.com': {
    inscriptionUrl: 'https://www.1001dj.com/inscription',
    methode: 'Marketplace DJ',
    bio: 'bio-500',
    note: 'Plateforme DJ FR',
  },
  'www.popcarte.com': {
    inscriptionUrl: 'https://www.popcarte.com/contact',
    methode: 'Blog mariage comments',
    bio: 'bio-160',
    note: 'Articles animation mariage avec commentaires',
  },
  'mariagesetfetes.fr': {
    inscriptionUrl: 'https://mariagesetfetes.fr/inscription',
    methode: 'Annuaire prestataires',
    bio: 'bio-500',
    note: '',
  },
  'dj.mondevis.com': {
    inscriptionUrl: 'https://dj.mondevis.com/devenir-prestataire',
    methode: 'Plateforme demandes devis DJ',
    bio: 'bio-500',
    note: 'Inscription prestataire',
  },
  'www.livetonight.fr': {
    inscriptionUrl: 'https://www.livetonight.fr/devenir-prestataire',
    methode: 'Plateforme événementielle',
    bio: 'bio-500',
    note: '',
  },
  'organisetonseminaire.com': {
    inscriptionUrl: 'https://organisetonseminaire.com/contact',
    methode: 'Annuaire séminaire',
    bio: 'bio-500',
    note: 'Catégorie animation séminaire',
  },
  'www.annuaire-animations.fr': {
    inscriptionUrl: 'https://www.annuaire-animations.fr/inscription',
    methode: 'Annuaire animation pure',
    bio: 'bio-500',
    note: 'Annuaire dédié animation événementielle',
  },
  'www.teambuildingincentive.fr': {
    inscriptionUrl: 'https://www.teambuildingincentive.fr/annuaire/inscription',
    methode: 'Annuaire team building',
    bio: 'bio-500',
    note: 'Catégorie animation team building',
  },
  'www.aleou.fr': {
    inscriptionUrl: 'https://www.aleou.fr/inscription-prestataire',
    methode: 'Annuaire séminaire / event',
    bio: 'bio-500',
    note: 'Annuaire lieux + prestataires séminaire',
  },
  'teambuilding-teamtonic.com': {
    inscriptionUrl: 'https://teambuilding-teamtonic.com/blog-2/',
    methode: 'Blog comments team building',
    bio: 'bio-160',
    note: '',
  },
  'www.acteur-fete.com': {
    inscriptionUrl: 'https://www.acteur-fete.com/fr/inscription',
    methode: 'Annuaire animation fête',
    bio: 'bio-500',
    note: '',
  },
  'www.mariage.com': {
    inscriptionUrl: 'https://www.mariage.com/prestataire-mariage/',
    methode: 'Annuaire prestataires mariage',
    bio: 'bio-500',
    note: '',
  },
  'www.campingfrance.com': {
    inscriptionUrl: 'https://www.campingfrance.com/contact',
    methode: 'Annuaire camping (fournisseurs)',
    bio: 'bio-500',
    note: 'Catégorie animation camping',
  },
  'www.lemagdumariage.com': {
    inscriptionUrl: 'https://www.lemagdumariage.com/inscription-prestataire',
    methode: 'Annuaire prestataires mariage',
    bio: 'bio-500',
    note: '',
  },
  'www.sortiraparis.com': {
    inscriptionUrl: 'https://www.sortiraparis.com/contact',
    methode: 'Forum / agenda événements',
    bio: 'bio-160',
    note: 'Ajouter événement silent disco',
  },
  'www.tripadvisor.fr': {
    inscriptionUrl: 'https://www.tripadvisor.fr/RegistrationController',
    methode: 'Fiche activité / forum',
    bio: 'bio-500',
    note: 'Inscrire activité animation Paris',
  },
  'forum.asperansa.org': {
    inscriptionUrl: 'https://forum.asperansa.org/ucp.php?mode=register',
    methode: 'Forum — créer compte + post',
    bio: 'bio-160',
    note: 'Forum spécialisé',
  },
  'www.exo-evenements.fr': {
    inscriptionUrl: 'https://www.exo-evenements.fr/contact',
    methode: 'Annuaire animation événementielle',
    bio: 'bio-500',
    note: '',
  },
  'www.paris-event-forum.com': {
    inscriptionUrl: 'https://www.paris-event-forum.com/fr/contact',
    methode: 'Salon professionnel — inscription expo',
    bio: 'bio-160',
    note: 'Salon parisien, pitch exposant',
  },
  'www.madcityzen.fr': {
    inscriptionUrl: 'https://www.madcityzen.fr/contact',
    methode: 'Blog event comments',
    bio: 'bio-160',
    note: 'Commenter articles soirée entreprise',
  },
  'site.fourvenues.com': {
    inscriptionUrl: 'https://site.fourvenues.com/signup',
    methode: 'Plateforme événementielle',
    bio: 'bio-500',
    note: 'Création profil organisateur',
  },
  'www.tsugi.fr': {
    inscriptionUrl: 'https://www.tsugi.fr/contact',
    methode: 'Média musique électro — commenter',
    bio: 'bio-160',
    note: 'Magazine électro, commenter articles soirées',
  },
  'fr.ra.co': {
    inscriptionUrl: 'https://ra.co/signup',
    methode: 'Resident Advisor — fiche promoter',
    bio: 'bio-500',
    note: 'Créer compte + lister événements silent disco',
  },
  'www.airzen.fr': {
    inscriptionUrl: 'https://www.airzen.fr/contact',
    methode: 'Média lifestyle — commenter',
    bio: 'bio-160',
    note: 'Article silent disco existe déjà — commenter',
  },
  'www.mademoiselle-dentelle.fr': {
    inscriptionUrl: 'https://www.mademoiselle-dentelle.fr/contact/',
    methode: 'Blog mariage — commenter',
    bio: 'bio-160',
    note: '',
  },
  'www.allumee.com': {
    inscriptionUrl: 'https://www.allumee.com/contact',
    methode: 'Blog animation soirée — commenter',
    bio: 'bio-160',
    note: 'Article "5 idées animation soirée originale"',
  },
  'www.audiohead7.com': {
    inscriptionUrl: 'https://www.audiohead7.com/contact',
    methode: 'Blog audio DJ',
    bio: 'bio-160',
    note: '',
  },
};

// Compter occurrences par domaine
const tally = new Map();
for (const r of data.results) {
  if (!NINJA_CATS.has(r.category)) continue;
  for (const d of r.domains) {
    const dom = d.domain.toLowerCase();
    if (EXCLUDE.has(dom)) continue;
    if (!tally.has(dom)) {
      tally.set(dom, {
        domain: dom,
        hits: 0,
        urls: new Set(),
        titles: new Set(),
        queries: new Set(),
        categories: new Set(),
      });
    }
    const t = tally.get(dom);
    t.hits++;
    t.urls.add(d.url);
    t.titles.add(d.title);
    t.queries.add(r.query);
    t.categories.add(r.category);
  }
}

const all = [...tally.values()].sort((a, b) => b.hits - a.hits);

// Classification par mécanique (méthode acquisition)
function mechanic(d) {
  const cats = [...d.categories];
  // Si enrichi, on prend la mécanique manuelle
  if (ENRICH[d.domain]?.methode) return ENRICH[d.domain].methode;
  // Sinon on déduit de la catégorie majoritaire
  if (cats.includes('Annuaires prestataires événementiel')) return 'Annuaire — inscription self-serve';
  if (cats.includes('Web 2.0 dans la niche')) return 'Web 2.0 — créer compte + publier';
  if (cats.includes('Bookmarking / Curation')) return 'Bookmarking — créer compte + scoop';
  if (cats.includes('Forums actifs FR')) return 'Forum — créer compte + post';
  if (cats.includes('Q&A — questions ouvertes')) return 'Q&A — répondre + lien profil';
  if (cats.includes('Blog comments ouverts')) return 'Blog — commentaire pertinent + lien';
  if (cats.includes('Sites musique / DJ')) return 'Profil DJ — créer compte';
  if (cats.includes('Communautés mariage/event FR')) return 'Communauté — créer profil';
  return 'À explorer';
}

// Type de cible
function bucket(d) {
  const cats = [...d.categories];
  if (cats.includes('Annuaires prestataires événementiel')) return 'A. Annuaires self-serve';
  if (cats.includes('Web 2.0 dans la niche') || cats.includes('Bookmarking / Curation')) return 'C. Web 2.0 / Bookmarking';
  if (cats.includes('Forums actifs FR') || cats.includes('Q&A — questions ouvertes')) return 'B. Forums + Q&A';
  if (cats.includes('Blog comments ouverts')) return 'D. Blog comments';
  if (cats.includes('Sites musique / DJ')) return 'E. Profils DJ / musique';
  return 'F. Autres communautés';
}

const enriched = all.map((d, i) => ({
  rang: i + 1,
  ...d,
  urls: [...d.urls],
  titles: [...d.titles],
  queries: [...d.queries],
  categories: [...d.categories],
  bucket: bucket(d),
  methode: mechanic(d),
  inscriptionUrl: ENRICH[d.domain]?.inscriptionUrl || `https://${d.domain.replace(/^www\./, 'www.')}`,
  bio: ENRICH[d.domain]?.bio || 'bio-160',
  note: ENRICH[d.domain]?.note || '',
})).slice(0, 80);

// Grouper par bucket
const grouped = {};
for (const e of enriched) {
  grouped[e.bucket] = grouped[e.bucket] || [];
  grouped[e.bucket].push(e);
}

// Build markdown
const today = new Date().toISOString().slice(0, 10);
let md = `# S-Party — Shortlist Ninjalinking 80 cibles

Date : ${today}
Source : SERP scrape (91 requêtes, 412 domaines uniques)
Méthode : self-serve uniquement (annuaires, forums, Q&A, web 2.0, bookmarking, blog comments). **Zéro outreach email.**

## Mode d'emploi
1. Pour chaque cible : ouvrir l'URL d'inscription, créer compte ou poster, coller la bio indiquée + lien \`https://s-party.fr\`
2. Variantes des bios dans \`reports/s-party-backlinks-kit.md\` (sections "Bio profil — 3 longueurs")
3. Délai 10-15 min entre 2 inscriptions sur des plateformes similaires
4. Cocher au fur et à mesure

## Légende
- **Hits** : nombre de SERP où le domaine apparaît (plus c'est haut, plus le domaine est central dans la niche)
- **Bio** : longueur recommandée (80c / 160c / 500c, cf kit)

---

`;

const bucketOrder = [
  'A. Annuaires self-serve',
  'B. Forums + Q&A',
  'C. Web 2.0 / Bookmarking',
  'D. Blog comments',
  'E. Profils DJ / musique',
  'F. Autres communautés',
];

let totalListed = 0;
for (const b of bucketOrder) {
  const items = grouped[b];
  if (!items?.length) continue;
  md += `## ${b} (${items.length})\n\n`;
  for (const e of items) {
    totalListed++;
    md += `### ${totalListed}. ${e.domain}  ·  hits ${e.hits}\n\n`;
    md += `- [ ] **Action** : ${e.methode}\n`;
    md += `- **URL** : ${e.inscriptionUrl}\n`;
    md += `- **Bio à utiliser** : \`${e.bio}\` (cf kit)\n`;
    md += `- **Lien à placer** : \`https://s-party.fr\`\n`;
    if (e.note) md += `- **Note** : ${e.note}\n`;
    md += `- **Exemples SERP** : ${e.titles.slice(0, 2).map((t, i) => `[${t.length > 60 ? t.slice(0, 60) + '…' : t}](${e.urls[i]})`).join(' · ')}\n`;
    md += `- **Catégories SERP** : ${e.categories.join(' · ')}\n\n`;
  }
  md += '\n';
}

md += `---

## Récapitulatif

| Bucket | Nb cibles |
|---|---:|
`;
for (const b of bucketOrder) {
  if (grouped[b]?.length) md += `| ${b} | ${grouped[b].length} |\n`;
}
md += `| **TOTAL** | **${enriched.length}** |\n`;

md += `

## Plan d'exécution sur 5 jours

**Jour 1 — Annuaires gros volume (3h)**
Top 20 annuaires self-serve (A.1 à A.20) : 8-10 min par fiche

**Jour 2 — Forums + Q&A (2h)**
Tous les forums + Q&A (catégorie B) : créer compte + post initial

**Jour 3 — Annuaires longue traîne (2h)**
A.21 à A.40

**Jour 4 — Web 2.0 + bookmarking (2h)**
Catégorie C : créer profils + 1 contenu par plateforme

**Jour 5 — Blog comments + DJ profils (1h30)**
Catégories D + E : commenter articles pertinents avec lien profil

**Total : ~10h sur 5 jours pour 80 backlinks self-serve**

## Astuces anti-flag

- **Variations bio** : 3 versions de la bio (cf kit), tourner systématiquement
- **Username** : \`sparty\` partout (cohérence signal entité)
- **Email** : \`S.party.production@gmail.com\` partout
- **Photo** : même logo S-Party partout
- **Délai** : 10-15 min entre 2 inscriptions sur sites similaires
- **Anchor text** : varier — "S-Party", "Animation silent disco", "Site web", URL nue
`;

writeFileSync('reports/sparty-ninjalinking-shortlist.md', md);
console.log(`✅ Écrit reports/sparty-ninjalinking-shortlist.md`);
console.log(`   ${enriched.length} cibles ninjalinking sélectionnées`);
console.log(`   Par bucket:`);
for (const b of bucketOrder) {
  if (grouped[b]?.length) console.log(`     ${b} : ${grouped[b].length}`);
}
console.log(`   Domaines totaux dans la niche après filtrage : ${all.length}`);
