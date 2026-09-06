/**
 * Amorçage des Chantiers depuis l'état réel du portefeuille (2026-09-06).
 *
 * Les « points de reprise » et les fiches projet accumulés en session listent ce
 * qui traîne site par site. Tant que c'était hors de l'outil, ça n'existait pas
 * pour le user : on repart d'un écran plein plutôt que d'un écran vide.
 *
 * Tout est marqué `source = 'seed:memoire'` : un seul DELETE annule l'opération.
 * Idempotent — un chantier déjà présent (même site, même titre) n'est pas dupliqué.
 *
 * Jetable (scripts/oneshot/) : à supprimer une fois passé.
 *   npx tsx scripts/oneshot/seed-chantiers.ts [--apply]
 */
import { getSupabase } from '../../src/db/supabase.js';

interface Seed {
  site: string | null;
  title: string;
  body?: string;
  status?: 'inbox' | 'todo' | 'doing' | 'blocked' | 'idea';
  blocked_by?: string;
}

const SEEDS: Seed[] = [
  // ── Garage ────────────────────────────────────────────────────────────────
  {
    site: 'garage',
    title: 'Garde-fou régénération sur site CMS',
    body: "« Régénérer » une page publiée la repasse en draft → 404 dès la purge du cache (1 h). Proposé le 30/08, pas tranché. Options : 428 comme la dépublication, ou ne plus toucher au statut à la régénération.",
    status: 'todo',
  },
  {
    site: 'garage',
    title: 'Page pneus : trancher le « Commande express sous 24h »',
    body: "Seul délai chiffré survivant, en base sur pneus-perpignan. Retirer ou garder = décision à prendre.",
    status: 'todo',
  },
  {
    site: 'garage',
    title: 'Locataire MECA DISCOUNT PRO : adresse + SIRET sur le site',
    body: "SIRET 10737779800015 valide (Luhn) mais l'établissement de Perpignan est absent du registre INSEE. Ordre décidé : note GBP réparée (fiche à 1★, 1 avis) + établissement déclaré → plan 3 couches (JSON-LD, mentions légales en index, footer) → liaison site ↔ fiche. Nom exact de la fiche encore à demander.",
    status: 'blocked',
    blocked_by: 'client',
  },
  {
    site: 'garage',
    title: 'Réanalyser les briefs fap / turbo / vanne-egr',
    status: 'todo',
  },

  // ── Ideo Car (voitures) ───────────────────────────────────────────────────
  {
    site: 'voitures',
    title: 'Lancer le scan Concurrents sur Ideo Car',
    body: "Site opt-in : rien n'est dépensé sans ligne dans `competitors`. Bouton « Analyser » sur /concurrents.",
    status: 'todo',
  },
  {
    site: 'voitures',
    title: 'Fiche Google Ideo Car : catégorie « garage » au lieu de concessionnaire',
    status: 'todo',
  },
  {
    site: 'voitures',
    title: 'Backlinks Ideo Car : 69 tâches encore en todo dans le tracker',
    status: 'todo',
  },
  {
    site: 'voitures',
    title: '2 articles Conseils par mois jusqu’à fin octobre, puis verdict',
    body: "Décision du 03/09 après le diagnostic (marque seule, 18/32 pages non indexées, 0 backlink).",
    status: 'doing',
  },
  {
    site: 'voitures',
    title: 'Première publication réelle d’un article Conseils — faire l’essai à blanc',
    body: "La chaîne dashboard → data/articles.ts est livrée mais jamais passée sur un vrai article.",
    status: 'todo',
  },
  {
    site: 'voitures',
    title: 'Crible du profil Ideo Car (faits vérifiés avant génération)',
    body: "Même recette que garage / Debarras / Mon-Sauveur : confronter site_profiles au site réel, voix dans brand.tone.",
    status: 'todo',
  },

  // ── VTC ───────────────────────────────────────────────────────────────────
  {
    site: 'vtc',
    title: 'Crible du profil VTC (ideal-transport.fr)',
    status: 'todo',
  },
  {
    site: 'vtc',
    title: 'GBP VTC — en tête du backlog',
    body: "12 domaines référents, tous spam de rang 0 ; absent du pack local sur 15 requêtes sur 25. L’entité locale passe avant les liens et le contenu.",
    status: 'todo',
  },
  {
    site: 'vtc',
    title: 'Bascule CMS d’ideal-transport (la plus dure du rollout)',
    status: 'idea',
  },

  // ── Mon-Sauveur (restaurant) ──────────────────────────────────────────────
  {
    site: 'restaurant',
    title: '6 doutes sur le site à arbitrer',
    body: "Prix faux sur la page « pas cher », en tête de liste.",
    status: 'todo',
  },
  {
    site: 'restaurant',
    title: 'Levier suivant : « livraison champagne perpignan »',
    body: "855 impressions, position 26, 0 clic — la demande est prouvée sur le domaine.",
    status: 'todo',
  },
  {
    site: 'restaurant',
    title: 'Trancher la consolidation des deux domaines',
    body: "livraison-alcool-nuit-perpignan.com actif, livraison-de-nuit.fr dormant en 522.",
    status: 'todo',
  },
  {
    site: 'restaurant',
    title: 'Police en Times New Roman sur le site en prod',
    body: "var(--font-inter) jamais définie → toute la pile font-family invalide. Décision du 17/08 : « on fait que okaz auto ». ~10 lignes à corriger si on y revient. Le site est ranké et ses visiteurs le voient en serif.",
    status: 'idea',
  },

  // ── Okaz Autos ────────────────────────────────────────────────────────────
  {
    site: 'okaz',
    title: 'Projet Vercel sur okaz-auto + hook VERCEL_HOOK_OKAZ',
    body: "Tant que le hook est vide, /voiture commite et pousse mais ne déclenche aucun déploiement.",
    status: 'todo',
  },
  {
    site: 'okaz',
    title: 'DNS o2switch → Vercel pour okaz-autos66.com',
    status: 'todo',
  },
  {
    site: 'okaz',
    title: 'Créer la fiche GBP Okaz — vérifier l’adresse',
    body: "Google épingle un « Okaz autos 66 » rue Gustave Eiffel ; l’adresse réelle est 12 rue Marcellin Berthelot, 66280 Saleilles.",
    status: 'todo',
  },

  // ── Débarras ──────────────────────────────────────────────────────────────
  {
    site: 'debarras',
    title: 'Créer les 3 clusters manquants du plan',
    body: "① Prix / devis (« débarras prix, tarif, m³ perpignan ») = plus gros intent transactionnel ② Diogène / insalubre (niche premium) ③ Enlèvement meubles & encombrants (support).",
    status: 'todo',
  },
  {
    site: 'debarras',
    title: 'GBP Débarras = levier #1',
    body: "Le Local Pack domine la SERP débarras ; l’EMD debarrasmaisonperpignan.fr bloque le top organique.",
    status: 'todo',
  },

  // ── Luvala (retraite) ─────────────────────────────────────────────────────
  {
    site: 'retraite',
    title: 'Axeptio : 3 réglages à faire côté dashboard',
    body: "① Créer un « cookies version » (essentiels / analytics / marketing) ② Activer Google Consent Mode v2 ③ Autoriser les domaines (luvala.vercel.app, localhost, futur domaine). Le SDK est chargé mais la bannière ne s’affiche pas tant que ce n’est pas fait — et aucun tracker ne fonctionnera.",
    status: 'blocked',
    blocked_by: 'moi',
  },
  {
    site: 'retraite',
    title: 'Tunnel Stripe + Klarna : configuration à finir',
    body: "Code Phase A+B livré. Restent : clés Stripe, migrations Supabase, webhook, activation Klarna. Debug paiement à reprendre.",
    status: 'blocked',
    blocked_by: 'moi',
  },
  {
    site: 'retraite',
    title: 'Exécuter le plan SEO des piliers',
    body: "Ordre par difficulté : bien-être (KD 8) → méditation (13) → yoga (25). Structure du pilier #1 déjà détaillée.",
    status: 'todo',
  },

  // ── Silent Party ──────────────────────────────────────────────────────────
  {
    site: 'silent-party',
    title: 'Web 2.0 backlinks : 8 sur 10 restants',
    body: "Telegraph et Blogger faits. Package et tracker dans reports/.",
    status: 'todo',
  },

  // ── Transverse (pas encore un site du registre, ou l'outil lui-même) ──────
  {
    site: null,
    title: 'Noïa Event : refonte UI complète depuis le template fourni',
    body: "Garder le SEO et le contenu déjà écrits. C’est la prochaine étape du projet.",
    status: 'todo',
  },
  {
    site: null,
    title: 'Noïa Event : commit initial + repo GitHub, puis rollout CMS',
    body: "Le scaffold est en local (/home/ubuntu/sites/Noia-Event), git init frais, aucun commit — on attendait le feu vert.",
    status: 'todo',
  },
  {
    site: null,
    title: 'Partager la propriété GSC des nouveaux sites avec le service account',
    body: "Puis renseigner « Domaine GSC » sur /sites. Sans ça, aucun signal ne remonte et les sites restent muets — les CREATE_PAGE retombent sur les clusters.",
    status: 'todo',
  },
  {
    site: null,
    title: 'Plan pages & produits : reste B (CMS), C (produits), D (pages modèle)',
    body: "Chantier A (éditeur / brief depuis les faits) livré le 28/08.",
    status: 'todo',
  },
  {
    site: null,
    title: 'scripts/oneshot/import-site-pages.ts modifié et non commité',
    body: "Modification antérieure aux sessions récentes, jamais tranchée : à commiter ou à jeter.",
    status: 'todo',
  },
  {
    site: null,
    title: 'Vérifier que le revalidate_secret de Carrosserie a bien été tourné',
    body: "Signalé comme compromis dans migration-rls-fermeture.sql (il était lisible par la clé anon publique). La rotation doit être simultanée dashboard /sites + variable Vercel, sinon la publication CMS casse. Jamais confirmée comme faite.",
    status: 'todo',
  },
  {
    site: null,
    title: 'Refonte du clustering — reportée, à reprendre pour un site national',
    body: "Prouvée par test (234 → 36 groupes) mais ce n’est pas le levier SEO sur des sites locaux. Candidats : retraite, ou le prochain site national.",
    status: 'idea',
  },
  {
    site: null,
    title: 'Hooks de déploiement Vercel manquants : Carrosserie, Massage',
    body: "Carrosserie est le banc d’essai (ne pas y toucher sans demande) ; Massage est inactif. À laisser tant que ces deux états tiennent.",
    status: 'idea',
  },
];

const apply = process.argv.includes('--apply');
const db = getSupabase();

const { data: existing } = await db.from('site_tasks').select('site_key, title');
const seen = new Set((existing || []).map((t) => `${t.site_key ?? ''}|${t.title}`));

const rows = SEEDS.filter((s) => !seen.has(`${s.site ?? ''}|${s.title}`)).map((s) => ({
  site_key: s.site,
  title: s.title,
  body: s.body ?? null,
  status: s.status ?? 'todo',
  blocked_by: s.blocked_by ?? null,
  source: 'seed:memoire',
}));

console.log(`${SEEDS.length} chantiers dans la liste, ${rows.length} à insérer.`);
for (const r of rows) console.log(`  [${r.status}] ${r.site_key ?? '—'} : ${r.title}`);

if (!apply) {
  console.log('\nSimulation. Relancer avec --apply pour écrire.');
} else {
  const { error } = await db.from('site_tasks').insert(rows);
  if (error) {
    console.error('Échec :', error.message);
    process.exit(1);
  }
  console.log(`\n✅ ${rows.length} chantiers insérés (source = seed:memoire).`);
}
