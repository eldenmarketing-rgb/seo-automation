/**
 * 7 guides de la rubrique Conseils de Maison Cirelle (site_key `poopy`, 2026-10-28),
 * slug `conseils/…`, page_type `article`, statut `draft`. Le site liste sur /conseils
 * toute page CMS publiée dont le slug commence par `conseils/` ; l'article est rendu par
 * CmsArticle (hero + sommaire + sections markdown + encart du 1er produit cité + FAQ).
 *
 * Sujets validés par Elden le 2026-10-28 — DataForSEO FR (suggestions + volumes Google Ads
 * + SERP mobile du jour) : ① utiliser un fondant parfumé (SERP Instagram/Facebook, la plus
 * facile) ② idées cadeaux de Noël (coffret cadeau bougie 480, saison) ③ bougie qui creuse
 * (SERP Instagram/Reddit) ④ brûle-parfum 4 400 + brûleur fondant 1 300 (SERP de boutiques,
 * un seul guide en 7e) ⑤ cire de soja / paraffine / cire d'abeille (1 600 / 1 000 / 2 400)
 * ⑥ parfum de Grasse bougie 720 ⑦ enlever une tache de cire (≈ 530, trafic, peu de ventes).
 * Ordre de publication = ordre du tableau.
 *
 * Faits : catalogue (attributs des produits, lus en base le 2026-10-28) — bougie 115-125 g
 * ≈ 20 h ; coffret = 8 fondants, 8 à 10 h par fondant ; Snapbar 50 g sécable, ≈ 10 h par
 * segment, 12 parfums ; gourmandes = cire de soja + gel pour bougie, durée INCONNUE (jamais
 * écrite) ; cire de soja, parfums de Grasse partout ; fait main par petites séries. FAQ du
 * site : un ou deux cubes, mèche coupée à 5 mm, première combustion jusqu'à surface fondue.
 * Expédition : préparée sous 1 à 2 jours ouvrés, Colissimo 2 à 3 jours ouvrés (CGV).
 * Le reste = conseils d'usage courants, présentés comme tels (« règle souvent citée »).
 * Interdits : prix, bijou, crémeux, « non toxique » / promesse santé, marque de brûle-parfum
 * (on n'en vend pas), nom de parfumeur grassois (non fourni).
 *
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-cirelle-conseils.mts            # écrit
 *   npx tsx scripts/oneshot/seed-cirelle-conseils.mts --check    # contrôles seulement
 */
import { getSupabase } from "../../src/db/client";

const SITE = "poopy";
const DATE = new Date().toISOString().slice(0, 10);
const IMG = "https://guytyggojrhqdfadgtve.supabase.co/storage/v1/object/public/page-images/poopy/produits/";

type Img = { src: string; alt: string; width: number; height: number };
const img = (dir: string, alt: string, width: number, height: number): Img => ({
  src: `${IMG}${dir}/${dir}-1.webp`,
  alt,
  width,
  height,
});
type Link = { url: string; anchor: string; context?: string };
type Article = {
  order: number;
  slug: string;
  heroImage: Img;
  h1: string;
  meta_title: string;
  meta_description: string;
  main_keyword: string;
  secondary_keywords: string[];
  card: { title: string; tagline: string; description: string; badges: string[]; featured: boolean };
  intro: string;
  sections: { title: string; content: string }[];
  highlights: string[];
  faq: { question: string; answer: string }[];
  links: Link[];
};

const P = (slug: string, anchor: string, context: string): Link => ({ url: `/produit/${slug}`, anchor, context });
const C = (slug: string, anchor: string, context: string): Link => ({ url: `/categorie/${slug}`, anchor, context });
const A = (slug: string, anchor: string, context: string): Link => ({ url: `/conseils/${slug}`, anchor, context });

const CAT = {
  bougies: C("bougies-parfumees", "Bougies parfumées", "La collection en cire de soja, parfums de Grasse."),
  gourmandes: C("bougies-gourmandes", "Bougies gourmandes", "Milkshakes, smoothies et tasses dessert."),
  fondants: C("fondants-parfumes", "Fondants parfumés", "Coffrets de 8 fondants et Snapbar sécable."),
};
const G = {
  fondant: A("comment-utiliser-fondant-parfume", "Comment utiliser un fondant parfumé", "La dose, la durée, le changement de parfum."),
  noel: A("idees-cadeaux-noel-bougies-fondants", "Idées cadeaux de Noël : bougies et fondants", "Quoi offrir selon la personne, et quand commander."),
  tunnel: A("bougie-qui-creuse-effet-tunnel", "Bougie qui creuse un trou : causes et solutions", "Rattraper une bougie qui fait un tunnel, et l'éviter."),
  brule: A("brule-parfum-choisir-utiliser", "Brûle-parfum : lequel choisir et comment l'utiliser", "Bougie chauffe-plat ou électrique, les bons critères."),
  cire: A("cire-de-soja-paraffine-cire-abeille", "Cire de soja, paraffine ou cire d'abeille", "Ce qui change vraiment d'une cire à l'autre."),
  grasse: A("parfum-de-grasse-bougie", "Parfum de Grasse : ce que ça veut dire", "D'où vient le parfum de nos bougies et fondants."),
  tache: A("enlever-tache-cire-bougie", "Enlever une tache de cire de bougie", "Tissu, bois, moquette, pot en verre : la bonne méthode."),
};

const articles: Article[] = [
  // ───────────────────────────── 1. Utiliser un fondant parfumé ─────────────────────────
  {
    order: 1,
    slug: "conseils/comment-utiliser-fondant-parfume",
    heroImage: img(
      "coffret-fondant-parfume-ambre-gris-bois-de-santal",
      "Fondants parfumés ambre gris et bois de santal posés à côté d'un brûle-parfum",
      1600,
      1203,
    ),
    h1: "Comment utiliser un fondant parfumé : le guide pas à pas",
    meta_title: "Comment utiliser un fondant parfumé : le guide pas à pas",
    meta_description:
      "Combien de fondants mettre, combien de temps ils parfument, comment changer de parfum et nettoyer la coupelle. Le mode d'emploi complet.",
    main_keyword: "comment utiliser un fondant parfumé",
    secondary_keywords: ["fondant parfumé", "fondants parfumés", "fondant cire parfumée", "combien de temps dure un fondant parfumé"],
    card: {
      title: "Comment utiliser un fondant parfumé",
      tagline: "Le mode d'emploi",
      description: "La dose, la durée, le changement de parfum : tout ce qu'on explique le plus souvent.",
      badges: ["Fondants"],
      featured: true,
    },
    intro:
      "Un fondant parfumé, c'est de la cire parfumée sans mèche. Posé dans la coupelle d'un brûle-parfum, il fond doucement à la chaleur et diffuse son parfum dans la pièce, sans qu'aucune flamme ne touche la cire. C'est la façon la plus simple de parfumer une maison pendant des heures, et de changer de parfum aussi souvent qu'on le veut.\n\nVoici comment on s'en sert, combien en mettre, combien de temps il dure, et les petites erreurs qui gâchent un parfum.",
    sections: [
      {
        title: "Le principe : de la cire qui fond, pas qui brûle",
        content:
          "Une bougie brûle sa cire : la flamme consomme la mèche et la cire qui remonte dedans. Un fondant, lui, **ne brûle pas**. Il fond simplement, chauffé par-dessous, et c'est la cire tiède qui libère le parfum.\n\nDeux conséquences très concrètes :\n\n- **le parfum se diffuse plus largement** qu'avec une petite bougie, parce que toute la surface de cire est chaude en même temps ;\n- **la cire ne disparaît pas** : quand elle refroidit, elle redurcit dans la coupelle. Vous la refaites fondre la fois suivante, jusqu'à ce qu'elle ne sente plus rien.\n\nNos [fondants parfumés](/categorie/fondants-parfumes) sont coulés à la main en cire de soja, avec des parfums de Grasse. La cire de soja fond à basse température : une petite source de chaleur suffit à la rendre liquide et parfumée.",
      },
      {
        title: "Mode d'emploi en 5 étapes",
        content:
          "1. **Posez le brûle-parfum sur une surface stable**, plane et qui supporte la chaleur, loin des rideaux, des courants d'air, des enfants et des animaux.\n2. **Mettez un fondant dans la coupelle** (ou un segment de [Snapbar](/produit/fondant-parfume-snapbar)). Pas d'eau : l'eau sert aux huiles, jamais à la cire.\n3. **Allumez la bougie chauffe-plat** et glissez-la sous la coupelle. Avec un brûle-parfum électrique, allumez-le simplement.\n4. **Attendez quelques minutes** : la cire devient liquide et transparente, le parfum monte. Dans une pièce de taille normale, on sent nettement la différence en un quart d'heure environ.\n5. **Éteignez quand la pièce est parfumée.** Ne laissez jamais la flamme sans surveillance, et ne déplacez pas le brûle-parfum tant que la cire est liquide : elle est chaude.\n\nLa fois suivante, rallumez simplement : la cire de la veille refond et reprend du parfum.",
      },
      {
        title: "Combien de fondants mettre, et combien de temps ça dure",
        content:
          "**Un fondant à la fois suffit** dans la plupart des pièces. Dans un grand séjour ouvert, ou si vous aimez un parfum très présent, ajoutez-en un second. Au-delà, la coupelle déborde et le parfum ne gagne rien.\n\nCôté durée, voici ce qu'on mesure sur nos produits :\n\n| Produit | Parfum diffusé |\n|---|---|\n| Un fondant de nos coffrets | 8 à 10 h |\n| Un segment de Snapbar | environ 10 h |\n\nCes heures s'additionnent sur plusieurs utilisations : un fondant ne se consomme pas en une soirée. Vous le refaites fondre jour après jour, et vous le changez quand **vous ne sentez presque plus rien**, même cire liquide. C'est le seul vrai signal : la cire, elle, est toujours là.\n\nUn [coffret de 8 fondants](/produit/coffret-fondants-ambre-gris-santal) tient donc plusieurs semaines si vous parfumez une pièce chaque soir.",
      },
      {
        title: "Changer de parfum et nettoyer la coupelle",
        content:
          "Pour passer d'un parfum à l'autre, il faut retirer l'ancienne cire. Le plus simple :\n\n- **laissez la cire refroidir complètement**, jusqu'à ce qu'elle soit dure et opaque ;\n- **appuyez sur un bord** : un disque de cire froide se décolle souvent d'un bloc ;\n- s'il résiste, **mettez la coupelle dix minutes au congélateur** (si elle est amovible) : la cire se rétracte et sort toute seule ;\n- autre méthode : **faites fondre la cire et absorbez-la** avec un disque de coton ou du papier absorbant, puis essuyez.\n\nJetez la cire usagée à la poubelle, **jamais dans l'évier** : elle redurcit dans les canalisations.\n\nVous pouvez aussi **mélanger deux parfums** volontairement : un fondant [fleur de coton et jasmin](/produit/coffret-fondants-fleur-de-coton-jasmin) se marie bien avec un fondant linge propre, par exemple. Restez sur deux parfums proches : au-delà, l'odeur devient confuse.",
      },
      {
        title: "Fondant ou bougie : lequel choisir ?",
        content:
          "Les deux parfument, mais pas de la même façon.\n\n- **Le fondant** diffuse plus fort et plus large, permet de changer de parfum chaque jour, et se dose : un fondant, deux fondants, une demi-heure ou toute la soirée. Il demande un brûle-parfum.\n- **La [bougie parfumée](/categorie/bougies-parfumees)** se suffit à elle-même, apporte la lumière d'une vraie flamme et fait un objet de décoration. Le parfum est plus doux, plus proche.\n\nBeaucoup de gens utilisent les deux : fondants dans la pièce à vivre pour parfumer, bougie sur la table pour l'ambiance. Si vous hésitez entre deux familles de parfums, la [Snapbar](/produit/fondant-parfume-snapbar) se casse en segments : c'est la façon la plus économique de tester un parfum avant d'en prendre un coffret.\n\nPour choisir le brûle-parfum lui-même, on a écrit un guide à part : [bougie chauffe-plat ou électrique](/conseils/brule-parfum-choisir-utiliser).",
      },
    ],
    highlights: [
      "Un fondant à la fois suffit dans la plupart des pièces.",
      "Jamais d'eau dans la coupelle : l'eau sert aux huiles, pas à la cire.",
      "La cire ne disparaît pas : changez-la quand elle ne sent plus.",
      "Pour la retirer : cire froide, ou dix minutes au congélateur.",
    ],
    faq: [
      {
        question: "Combien de temps dure un fondant parfumé ?",
        answer:
          "Nos fondants diffusent leur parfum 8 à 10 heures, et un segment de Snapbar environ 10 heures. Ces heures se cumulent sur plusieurs utilisations : vous refaites fondre la même cire jusqu'à ce qu'elle ne sente plus.",
      },
      {
        question: "Faut-il mettre de l'eau avec un fondant ?",
        answer:
          "Non. L'eau sert à diluer les huiles parfumées. Un fondant se pose seul dans la coupelle sèche : la cire fond et diffuse sans rien ajouter.",
      },
      {
        question: "Peut-on réutiliser un fondant ?",
        answer:
          "Oui, c'est même le principe. La cire redurcit en refroidissant et refond à l'utilisation suivante. On la remplace quand le parfum devient trop faible.",
      },
      {
        question: "Comment enlever la cire du brûle-parfum ?",
        answer:
          "Laissez-la refroidir et décollez-la d'un bloc, ou passez la coupelle au congélateur dix minutes. Vous pouvez aussi l'absorber encore liquide avec un coton. Ne la versez jamais dans l'évier.",
      },
      {
        question: "Peut-on mélanger deux fondants de parfums différents ?",
        answer:
          "Oui, deux parfums d'une même famille se marient bien, par exemple deux notes fleuries ou deux notes propres. Au-delà de deux, le parfum devient brouillé.",
      },
      {
        question: "Un fondant parfume-t-il plus qu'une bougie ?",
        answer:
          "En général, oui : toute la surface de cire est chaude en même temps, le parfum se diffuse plus largement. La bougie apporte en plus la flamme et la lumière.",
      },
    ],
    links: [
      P("fondant-parfume-snapbar", "Fondant parfumé Snapbar", "Sécable en segments, 12 parfums au choix."),
      CAT.fondants,
      P("coffret-fondants-ambre-gris-santal", "Coffret Ambre gris et bois de santal", "8 fondants, deux parfums chauds."),
      G.brule,
      G.cire,
    ],
  },

  // ───────────────────────────── 2. Idées cadeaux de Noël ─────────────────────────
  {
    order: 2,
    slug: "conseils/idees-cadeaux-noel-bougies-fondants",
    heroImage: img(
      "coffret-fondant-parfume-duo-fleur-de-coton-et-jasmin",
      "Coffret de fondants parfumés fleur de coton et jasmin, idée cadeau de Noël",
      1600,
      1200,
    ),
    h1: "Idées cadeaux de Noël : quelle bougie ou quel fondant offrir ?",
    meta_title: "Idées cadeaux de Noël : bougies et fondants à offrir",
    meta_description:
      "Coffret de fondants, bougie parfumée ou bougie gourmande : quoi offrir selon la personne, quel parfum choisir, et quand commander pour Noël.",
    main_keyword: "idée cadeau bougie noël",
    secondary_keywords: ["coffret cadeau bougie", "bougie parfumée noël", "bougie cadeau noël", "cadeau bougie parfumée"],
    card: {
      title: "Idées cadeaux de Noël",
      tagline: "Offrir sans se tromper",
      description: "Quoi offrir selon la personne, quel parfum choisir, et quand commander.",
      badges: ["Cadeau", "Noël"],
      featured: true,
    },
    intro:
      "Une bougie ou un coffret de fondants, c'est le cadeau qu'on offre quand on veut faire plaisir sans connaître la taille, la couleur préférée ou la bibliothèque de la personne. Encore faut-il choisir le bon format et le bon parfum.\n\nVoici comment on s'y prend, profil par profil, avec les parfums qui plaisent le plus largement et les délais à garder en tête pour que le paquet arrive avant le réveillon.",
    sections: [
      {
        title: "Pour quelqu'un qui a déjà un brûle-parfum : le coffret de fondants",
        content:
          "Si la personne utilise déjà des fondants, ou si vous voyez un brûle-parfum chez elle, le **coffret de 8 fondants** est le cadeau le plus sûr. Chaque coffret réunit deux parfums qui vont ensemble, ce qui permet de varier sans risque.\n\nNos coffrets, du plus consensuel au plus marqué :\n\n- [Fleur de coton et jasmin](/produit/coffret-fondants-fleur-de-coton-jasmin) : doux et fleuri, il plaît à presque tout le monde ;\n- [Linge propre et poudre de riz](/produit/coffret-fondants-linge-propre-poudre-de-riz) : l'odeur de propre, pour ceux qui n'aiment pas les parfums sucrés ;\n- [Lavande et rose ancienne](/produit/coffret-fondants-lavande-rose) : un classique floral, plus marqué ;\n- [Ambre gris et bois de santal](/produit/coffret-fondants-ambre-gris-santal) : chaud et enveloppant, très hiver ;\n- [Eucalyptus et patchouli](/produit/coffret-fondants-eucalyptus-patchouli) : frais et boisé ;\n- [Monoï](/produit/coffret-fondants-monoi) : pour les amoureux de l'été.\n\nChaque fondant diffuse 8 à 10 heures : un coffret dure plusieurs semaines.",
      },
      {
        title: "Pour quelqu'un qui aime les bougies : la bougie parfumée",
        content:
          "La bougie parfumée reste le cadeau le plus simple : elle n'a besoin de rien d'autre qu'une allumette, elle décore et elle parfume. Les nôtres pèsent 115 à 125 g et brûlent environ 20 heures.\n\nPour choisir le parfum quand on ne connaît pas bien les goûts de la personne :\n\n- **la valeur sûre** : [Cachemire et soie](/produit/bougie-cachemire-et-soie), doux et poudré, sans note trop sucrée ni trop florale ;\n- **pour une amatrice de fleurs** : [Jasmin](/produit/bougie-jasmin) ;\n- **pour une maison qui sent le propre** : [Adoucissant, linge propre](/produit/bougie-adoucissant-linge-propre) ;\n- **pour quelqu'un qui préfère le frais** : [Eucalyptus](/produit/bougie-eucalyptus) ;\n- **pour réchauffer l'hiver avec un air de vacances** : [Monoï](/produit/bougie-monoi).\n\nSi vous hésitez vraiment, restez sur les notes douces : un parfum trop typé divise, un parfum doux se fait oublier dans le bon sens.",
      },
      {
        title: "Pour faire sourire : la bougie gourmande",
        content:
          "Les [bougies gourmandes](/categorie/bougies-gourmandes) sont le cadeau qui fait réagir au moment de l'ouvrir : un milkshake avec ses faux glaçons, un smoothie, une tasse dessert. Elles sont coulées en cire de soja et en gel pour bougie, et elles se posent sur une étagère autant qu'elles s'allument.\n\nQuelques idées selon la personne :\n\n- **une ado ou une jeune adulte** : la [bougie milkshake Cerise](/produit/bougie-milkshake-cerise) ou la [Pêche](/produit/bougie-milkshake-peche) ;\n- **une gourmande** : la [Cookie chocolat latte](/produit/bougie-cookie-chocolat) ;\n- **une amatrice de déco** : la [tasse dessert Fleur de coton](/produit/bougie-tasse-fleur-de-coton), plus discrète.\n\nC'est aussi un bon cadeau de Secret Santa ou de collègue : original, sans être personnel.",
      },
      {
        title: "Petit cadeau, calendrier ou fond de hotte : la Snapbar",
        content:
          "Pour un petit cadeau, un complément dans un colis ou un cadeau de collègue, la [Snapbar](/produit/fondant-parfume-snapbar) est la bonne taille : une plaquette de 50 g qui se casse en segments, à choisir parmi 12 parfums. Chaque segment parfume environ 10 heures.\n\nOn l'utilise beaucoup :\n\n- **pour accompagner un brûle-parfum** que vous offrez : la personne peut l'utiliser dès le jour même ;\n- **pour composer un assortiment** : plusieurs Snapbars de parfums différents, la personne découvre et choisit ses préférés ;\n- **dans un calendrier de l'Avent fait maison**, cassée en segments.\n\nUn point à ne pas oublier : **un fondant ne sert à rien sans brûle-parfum**. Si vous n'êtes pas sûr que la personne en ait un, offrez plutôt une bougie, ou ajoutez le brûle-parfum au cadeau. Notre guide [pour choisir un brûle-parfum](/conseils/brule-parfum-choisir-utiliser) vous aide à le trouver.",
      },
      {
        title: "Quand commander pour Noël",
        content:
          "Chaque commande est préparée sous **1 à 2 jours ouvrés**, puis remise à Colissimo pour une livraison à domicile en **2 à 3 jours ouvrés** en France métropolitaine. Comptez donc environ une semaine entre la commande et la réception, week-end compris.\n\nEn décembre, les transporteurs sont très chargés et les délais s'allongent souvent dans les derniers jours avant Noël. Nos conseils :\n\n- **commandez dès la fin novembre** si vous voulez être tranquille ;\n- **au plus tard autour du 15 décembre** pour une livraison avant le réveillon ;\n- **faites livrer chez vous** plutôt que chez la personne si vous voulez emballer ou glisser un mot.\n\nLes produits fabriqués à la main par petites séries partent vite en fin d'année : si un parfum vous plaît, ne le gardez pas trop longtemps dans le panier. Et si un cadeau ne convient pas, vous avez **14 jours après réception** pour nous le retourner non utilisé.",
      },
    ],
    highlights: [
      "Brûle-parfum chez la personne : offrez un coffret de fondants.",
      "Pas de brûle-parfum : une bougie, ou ajoutez-en un au cadeau.",
      "Si vous hésitez sur le parfum, restez sur les notes douces.",
      "Commandez fin novembre, au plus tard vers le 15 décembre.",
    ],
    faq: [
      {
        question: "Quel parfum de bougie offrir quand on ne connaît pas les goûts de la personne ?",
        answer:
          "Les notes douces et poudrées, comme Cachemire et soie, ou propres, comme le linge propre, plaisent le plus largement. Évitez les parfums très sucrés ou très typés si vous ne connaissez pas bien la personne.",
      },
      {
        question: "Fondant ou bougie : quoi offrir ?",
        answer:
          "Si la personne a un brûle-parfum, le coffret de fondants est idéal : deux parfums, plusieurs semaines d'utilisation. Sinon, offrez une bougie, qui se suffit à elle-même.",
      },
      {
        question: "Jusqu'à quand commander pour recevoir avant Noël ?",
        answer:
          "Comptez 1 à 2 jours ouvrés de préparation puis 2 à 3 jours ouvrés de Colissimo. Commandez de préférence fin novembre, et au plus tard autour du 15 décembre, les délais des transporteurs s'allongeant souvent avant les fêtes.",
      },
      {
        question: "Que contient un coffret de fondants ?",
        answer:
          "8 fondants coulés à la main en cire de soja, autour de deux parfums qui vont ensemble. Chaque fondant diffuse 8 à 10 heures.",
      },
      {
        question: "Peut-on retourner un cadeau qui ne plaît pas ?",
        answer:
          "Oui, vous disposez de 14 jours après réception pour nous retourner un article non utilisé, dans son emballage d'origine. Écrivez-nous et nous vous indiquons la marche à suivre.",
      },
      {
        question: "Quel petit cadeau offrir à une collègue ?",
        answer:
          "La Snapbar, une plaquette de fondants sécable à choisir parmi 12 parfums, ou une bougie gourmande pour un cadeau qui fait sourire sans être trop personnel.",
      },
    ],
    links: [
      P("coffret-fondants-fleur-de-coton-jasmin", "Coffret Fleur de coton et jasmin", "Le coffret qui plaît au plus grand nombre."),
      CAT.fondants,
      CAT.bougies,
      CAT.gourmandes,
      G.fondant,
    ],
  },

  // ───────────────────────────── 3. Bougie qui creuse ─────────────────────────
  {
    order: 3,
    slug: "conseils/bougie-qui-creuse-effet-tunnel",
    heroImage: img(
      "bougie-parfumee-senteur-cachemire-et-soie",
      "Bougie parfumée Cachemire et soie en cire de soja dans son pot",
      1054,
      1600,
    ),
    h1: "Bougie qui creuse un trou au milieu : causes et solutions",
    meta_title: "Bougie qui creuse (effet tunnel) : causes et solutions",
    meta_description:
      "Pourquoi une bougie creuse un trou au milieu, comment la rattraper, et les trois gestes qui l'évitent dès le premier allumage.",
    main_keyword: "bougie qui creuse",
    secondary_keywords: ["effet tunnel bougie", "bougie tunnel", "première combustion bougie", "bougie qui fait un trou"],
    card: {
      title: "Bougie qui creuse un trou",
      tagline: "Rattraper l'effet tunnel",
      description: "Pourquoi ça arrive, comment rattraper la bougie, et comment l'éviter dès le départ.",
      badges: ["Bougies", "Entretien"],
      featured: false,
    },
    intro:
      "Vous allumez votre bougie, et au fil des soirées un puits se creuse autour de la mèche pendant que la cire reste intacte sur les bords. C'est l'effet tunnel. La bougie brûle moins longtemps, la mèche finit noyée et une bonne partie du parfum reste prisonnière de la cire.\n\nLa bonne nouvelle : c'est presque toujours une question d'habitude, pas un défaut de la bougie. Voici pourquoi ça arrive, comment rattraper une bougie déjà creusée, et comment l'éviter dès le premier allumage.",
    sections: [
      {
        title: "Pourquoi une bougie creuse un tunnel",
        content:
          "La cire d'une bougie a de la mémoire : **elle a tendance à refondre jusqu'à la limite atteinte la première fois**. Si la première combustion s'arrête avant que la surface ait fondu jusqu'aux bords, la bougie creusera ensuite toujours au même diamètre. C'est de loin la cause la plus fréquente.\n\nLes autres causes :\n\n- **des allumages trop courts et répétés** : dix minutes par-ci, dix minutes par-là, la cire n'a jamais le temps de fondre en largeur ;\n- **un courant d'air** qui couche la flamme d'un côté : la bougie creuse de travers ;\n- **une mèche trop petite pour le diamètre du pot**, ce qui relève de la fabrication.\n\nDans la grande majorité des cas, c'est la première : la bougie n'a simplement pas eu le temps de bien démarrer.",
      },
      {
        title: "La première combustion : le geste qui évite tout",
        content:
          "La toute première fois que vous allumez une bougie, **laissez-la brûler jusqu'à ce que toute la surface soit liquide**, d'un bord à l'autre. Pas seulement autour de la mèche : jusqu'au verre.\n\nCombien de temps ? La règle souvent citée est **environ une heure par tranche de 2,5 cm de diamètre**. Une bougie de 7 à 8 cm de large demande donc souvent deux à trois heures la première fois. Le plus simple reste de regarder : quand la cire liquide touche le bord du pot sur tout le tour, c'est bon.\n\nAllumez donc votre nouvelle bougie **un soir où vous restez à la maison**, pas cinq minutes avant de partir. Ensuite, à chaque utilisation, essayez de la laisser jusqu'à ce que la surface fonde à nouveau en entier.\n\nÀ l'inverse, évitez de la laisser brûler plus de quatre heures d'affilée : la mèche s'allonge, la flamme grossit et le pot chauffe trop.",
      },
      {
        title: "Rattraper une bougie qui a déjà creusé",
        content:
          "Si le tunnel est peu profond, **une longue combustion suffit souvent** : la flamme finit par faire fondre les bords. S'il est plus marqué, voici la méthode de la feuille d'aluminium, la plus connue :\n\n1. allumez la bougie ;\n2. **entourez le haut du pot d'une feuille d'aluminium**, en la repliant vers l'intérieur pour couvrir les bords de cire, et en laissant **une ouverture au centre** pour la flamme ;\n3. la chaleur est renvoyée vers les bords, qui fondent peu à peu ;\n4. surveillez sans vous éloigner, et retirez l'aluminium avec précaution quand la surface est de niveau (il est chaud).\n\nAutre solution : **égaliser la surface à l'air chaud**, bougie éteinte, avec un sèche-cheveux réglé fort, jusqu'à ce que la cire des bords fonde et redescende. Laissez refroidir avant de rallumer.\n\nSi la mèche est noyée dans un puits de cire, retirez délicatement un peu de cire liquide autour d'elle avec du papier absorbant pour la dégager.",
      },
      {
        title: "Les trois gestes à chaque allumage",
        content:
          "Une bougie qui brûle bien, c'est une bougie qu'on entretient un peu. Trois gestes suffisent :\n\n- **Coupez la mèche à 5 mm avant chaque allumage.** Une mèche trop longue fait une grande flamme qui fume noir, noircit le verre et consomme la cire trop vite.\n- **Posez la bougie à l'abri des courants d'air**, loin d'une fenêtre ouverte ou d'une porte qui bat : la flamme reste droite et la cire fond régulièrement.\n- **Éteignez sans souffler** : un éteignoir, ou la mèche couchée dans la cire liquide puis redressée. Souffler projette de la cire et fait fumer la mèche.\n\nNos [bougies parfumées](/categorie/bougies-parfumees) brûlent environ 20 heures quand ces gestes sont respectés. Ce sont aussi ceux qui gardent le parfum le plus net jusqu'au fond du pot.",
      },
      {
        title: "Et avec la cire de soja ?",
        content:
          "La cire de soja, celle de toutes nos bougies, fond à plus basse température que la paraffine. Elle forme facilement une belle surface liquide, à condition de lui laisser le temps la première fois, comme toute bougie.\n\nDeux particularités sans gravité, qui inquiètent parfois :\n\n- **des marbrures ou un voile blanc** sur la cire (le « givrage ») : ce sont de petits cristaux naturels de la cire végétale. Ils ne changent ni le parfum ni la combustion ;\n- **une surface pas tout à fait lisse** après refroidissement : la cire de soja se rétracte un peu en durcissant. Elle refond normalement au prochain allumage.\n\nPour aller plus loin sur les différences entre cires, on a écrit un guide à part : [cire de soja, paraffine ou cire d'abeille](/conseils/cire-de-soja-paraffine-cire-abeille). Et si une bougie qui creuse vous agace vraiment, les [fondants parfumés](/categorie/fondants-parfumes) n'ont pas ce souci : sans mèche, ils fondent toujours en entier.",
      },
    ],
    highlights: [
      "Premier allumage : laissez fondre la surface jusqu'aux bords.",
      "Environ une heure par tranche de 2,5 cm de diamètre, la première fois.",
      "Mèche coupée à 5 mm avant chaque allumage.",
      "Tunnel déjà creusé : feuille d'aluminium autour du pot, sous surveillance.",
    ],
    faq: [
      {
        question: "Pourquoi ma bougie fait un trou au milieu ?",
        answer:
          "Le plus souvent, la première combustion a été trop courte : la cire n'a pas fondu jusqu'aux bords et garde ensuite ce diamètre. Des allumages courts et répétés ou un courant d'air donnent le même résultat.",
      },
      {
        question: "Combien de temps laisser brûler une bougie la première fois ?",
        answer:
          "Jusqu'à ce que toute la surface soit liquide, d'un bord à l'autre. La règle souvent citée est d'environ une heure par tranche de 2,5 cm de diamètre, soit deux à trois heures pour une bougie de taille courante.",
      },
      {
        question: "Comment rattraper une bougie qui a creusé ?",
        answer:
          "Entourez le haut du pot d'une feuille d'aluminium en laissant une ouverture au centre, bougie allumée et sous surveillance : la chaleur fait fondre les bords. Vous pouvez aussi égaliser la surface au sèche-cheveux, bougie éteinte.",
      },
      {
        question: "Pourquoi ma bougie fume noir ?",
        answer:
          "La mèche est trop longue. Coupez-la à 5 mm avant chaque allumage et éloignez la bougie des courants d'air.",
      },
      {
        question: "Combien de temps peut-on laisser une bougie allumée ?",
        answer:
          "Évitez de dépasser quatre heures d'affilée : la mèche s'allonge et le pot chauffe trop. Ne la laissez jamais sans surveillance.",
      },
      {
        question: "Ma bougie en cire de soja a des traces blanches, est-ce normal ?",
        answer:
          "Oui, c'est le givrage, de petits cristaux naturels de la cire végétale. Il ne change ni le parfum ni la combustion.",
      },
    ],
    links: [
      P("bougie-cachemire-et-soie", "Bougie Cachemire et soie", "Cire de soja, environ 20 heures."),
      CAT.bougies,
      G.cire,
      G.tache,
    ],
  },

  // ───────────────────────────── 4. Brûle-parfum ─────────────────────────
  {
    order: 4,
    slug: "conseils/brule-parfum-choisir-utiliser",
    heroImage: img(
      "fondant-parfume-snapbar",
      "Fondant parfumé Snapbar sécable à poser dans un brûle-parfum",
      1128,
      1600,
    ),
    h1: "Brûle-parfum : lequel choisir et comment l'utiliser",
    meta_title: "Brûle-parfum : lequel choisir et comment l'utiliser",
    meta_description:
      "Brûle-parfum à bougie chauffe-plat ou électrique : les différences, les critères qui comptent vraiment, et comment l'utiliser avec des fondants.",
    main_keyword: "brûle parfum",
    secondary_keywords: ["brûleur fondant", "brûle parfum électrique", "brûle parfum bougie", "brûle parfum céramique", "comment utiliser un brûle parfum"],
    card: {
      title: "Brûle-parfum : lequel choisir",
      tagline: "Chauffe-plat ou électrique",
      description: "Les deux familles, les critères qui comptent, et le bon usage avec des fondants.",
      badges: ["Fondants", "Guide d'achat"],
      featured: false,
    },
    intro:
      "Le brûle-parfum est le petit objet qui transforme un fondant de cire en parfum d'intérieur. Il en existe des centaines de modèles, en céramique, en verre, en pierre, à bougie ou électriques, et tous ne se valent pas.\n\nNous ne vendons pas de brûle-parfum : ce guide ne vous pousse vers aucune marque. Il explique les deux grandes familles, les détails qui font qu'un brûle-parfum fonctionne bien ou mal, et comment s'en servir avec des fondants.",
    sections: [
      {
        title: "Les deux familles : à bougie ou électrique",
        content:
          "**Le brûle-parfum à bougie chauffe-plat** est le plus répandu : une coupelle posée au-dessus d'un petit espace où l'on glisse une bougie chauffe-plat. C'est la flamme qui chauffe la coupelle par-dessous.\n\n- pour : l'ambiance d'une petite flamme, aucun fil, des modèles pour tous les styles ;\n- contre : une flamme à surveiller, des chauffe-plats à racheter, une chaleur qui varie selon la bougie.\n\n**Le brûle-parfum électrique** chauffe la cire par une plaque chauffante ou une ampoule, branché sur secteur.\n\n- pour : pas de flamme, une chaleur régulière, souvent une minuterie, pratique pour parfumer longtemps ;\n- contre : un fil et une prise, un style souvent plus « appareil ».\n\nLes deux fonctionnent très bien avec des fondants en cire de soja, qui fondent à basse température. Le choix est surtout une question d'usage : une ambiance le soir, ou un parfum de fond toute la journée.",
      },
      {
        title: "Les critères qui comptent vraiment",
        content:
          "Au-delà du style, quelques détails font la différence entre un brûle-parfum agréable et un brûle-parfum qui déçoit :\n\n- **La distance entre la flamme et la coupelle.** Trop proche, la cire chauffe trop, le parfum « cuit » et s'épuise vite. Trop loin, la cire fond mal. Un bon modèle laisse un espace suffisant et des ouvertures pour l'air.\n- **Une coupelle large et peu profonde.** Plus la surface de cire liquide est grande, mieux le parfum se diffuse. Une coupelle profonde et étroite garde le parfum au fond.\n- **Une coupelle amovible**, ou au moins lisse : c'est ce qui permet de changer de cire facilement.\n- **La stabilité.** Une base large et lourde, qui ne bascule pas quand on la frôle.\n- **Des ouvertures d'aération** sur le corps du brûle-parfum à bougie : sans air, la flamme du chauffe-plat faiblit et s'éteint.\n\nCéramique, verre ou pierre : la matière compte surtout pour le nettoyage. Une coupelle émaillée ou en verre se nettoie bien plus facilement qu'une pierre poreuse.",
      },
      {
        title: "Comment utiliser un brûle-parfum avec des fondants",
        content:
          "1. **Posez-le sur une surface stable** qui supporte la chaleur, loin des rideaux, des étagères basses, des enfants et des animaux.\n2. **Mettez un fondant dans la coupelle sèche.** Pas d'eau : l'eau sert aux huiles, jamais à la cire.\n3. **Allumez le chauffe-plat** et glissez-le dessous, ou branchez et allumez le modèle électrique.\n4. **Laissez fondre** : en quelques minutes, la cire devient liquide et le parfum monte.\n5. **Éteignez quand la pièce est parfumée**, et laissez refroidir avant de toucher la coupelle.\n\nUn fondant de nos [coffrets](/categorie/fondants-parfumes) diffuse 8 à 10 heures, un segment de [Snapbar](/produit/fondant-parfume-snapbar) environ 10 heures, cumulées sur plusieurs utilisations. Le mode d'emploi détaillé, avec les doses et le changement de parfum, est dans notre guide [comment utiliser un fondant parfumé](/conseils/comment-utiliser-fondant-parfume).",
      },
      {
        title: "Les erreurs qui gâchent le parfum",
        content:
          "- **Mettre de l'eau avec la cire.** C'est l'habitude des brûle-parfums à huile, mais avec un fondant, l'eau éclabousse et n'apporte rien.\n- **Laisser le chauffe-plat finir sous une coupelle vide.** La coupelle chauffe à sec et peut se fendre. Retirez la cire usée, ou éteignez.\n- **Remplir la coupelle à ras bord.** Un ou deux fondants suffisent ; au-delà, la cire déborde quand elle fond.\n- **Garder trop longtemps une cire épuisée.** Quand elle ne sent plus, elle ne sentira pas davantage en chauffant plus fort : remplacez-la.\n- **Déplacer le brûle-parfum cire liquide.** Elle est chaude, attendez qu'elle fige.\n- **Utiliser un chauffe-plat trop puissant** dans un petit brûle-parfum : la cire bout presque, le parfum s'évapore en une heure et le reste de la soirée, plus rien.",
      },
      {
        title: "Entretenir son brûle-parfum",
        content:
          "Un brûle-parfum propre diffuse mieux, et les parfums ne se mélangent pas malgré vous. Pour le garder en bon état :\n\n- **entre deux parfums**, retirez la cire froide d'un bloc, ou mettez la coupelle amovible dix minutes au congélateur : la cire se rétracte et se décolle ;\n- **essuyez le film restant** avec du papier absorbant pendant que la coupelle est encore tiède, puis un chiffon doux ;\n- **nettoyez la suie** que la flamme laisse parfois sous la coupelle, à l'eau chaude savonneuse, une fois le tout refroidi ;\n- **ne versez jamais la cire dans l'évier** : elle redurcit dans les canalisations. À la poubelle.\n\nSi un peu de cire a coulé sur un meuble ou une nappe, notre guide pour [enlever une tache de cire](/conseils/enlever-tache-cire-bougie) donne la méthode support par support.",
      },
    ],
    highlights: [
      "Chauffe-plat pour l'ambiance, électrique pour parfumer longtemps sans flamme.",
      "Une coupelle large et peu profonde diffuse mieux le parfum.",
      "Jamais d'eau avec un fondant de cire.",
      "Ne laissez pas un chauffe-plat brûler sous une coupelle vide.",
    ],
    faq: [
      {
        question: "Brûle-parfum électrique ou à bougie : lequel choisir ?",
        answer:
          "À bougie chauffe-plat pour l'ambiance d'une petite flamme le soir ; électrique pour une chaleur régulière, sans flamme, quand on veut parfumer longtemps. Les deux conviennent aux fondants en cire de soja.",
      },
      {
        question: "Comment fonctionne un brûle-parfum ?",
        answer:
          "Une source de chaleur, bougie chauffe-plat ou résistance électrique, chauffe une coupelle par-dessous. La cire posée dedans fond et libère son parfum dans la pièce.",
      },
      {
        question: "Faut-il mettre de l'eau dans un brûle-parfum ?",
        answer:
          "Seulement avec des huiles parfumées. Avec un fondant de cire, jamais : la cire se pose seule dans la coupelle sèche.",
      },
      {
        question: "Combien de fondants mettre dans un brûle-parfum ?",
        answer:
          "Un fondant suffit dans la plupart des pièces, deux dans une grande pièce ou pour un parfum plus présent. Au-delà, la coupelle déborde.",
      },
      {
        question: "Comment nettoyer un brûle-parfum ?",
        answer:
          "Retirez la cire froide d'un bloc ou après dix minutes au congélateur, essuyez le film restant avec du papier absorbant, puis lavez à l'eau chaude savonneuse une fois refroidi.",
      },
      {
        question: "Vendez-vous des brûle-parfums ?",
        answer:
          "Non, nous fabriquons les fondants. Tout brûle-parfum prévu pour la cire convient, à bougie chauffe-plat ou électrique.",
      },
    ],
    links: [
      P("fondant-parfume-snapbar", "Fondant parfumé Snapbar", "Sécable en segments, environ 10 heures par segment."),
      CAT.fondants,
      G.fondant,
      G.tache,
    ],
  },

  // ───────────────────────────── 5. Cires ─────────────────────────
  {
    order: 5,
    slug: "conseils/cire-de-soja-paraffine-cire-abeille",
    heroImage: img(
      "bougie-parfumee-senteur-eucalyptus",
      "Bougie parfumée Eucalyptus coulée en cire de soja",
      1200,
      1600,
    ),
    h1: "Cire de soja, paraffine ou cire d'abeille : quelles différences pour une bougie ?",
    meta_title: "Cire de soja, paraffine ou cire d'abeille : que choisir ?",
    meta_description:
      "Origine, parfum, combustion, aspect : ce qui change vraiment entre une bougie en cire de soja, en paraffine et en cire d'abeille.",
    main_keyword: "bougie cire de soja",
    secondary_keywords: ["cire de soja ou paraffine", "bougie cire végétale", "paraffine bougie", "bougie cire d'abeille", "cire naturelle bougie"],
    card: {
      title: "Cire de soja, paraffine ou cire d'abeille",
      tagline: "Ce qui change vraiment",
      description: "Origine, parfum, combustion et aspect : les trois cires comparées, sans discours marketing.",
      badges: ["Matières"],
      featured: false,
    },
    intro:
      "« Cire de soja », « cire végétale », « 100 % naturelle »… Les étiquettes de bougies parlent beaucoup de leur cire, et pas toujours clairement. Toutes nos bougies et nos fondants sont coulés en cire de soja ; ce guide explique pourquoi, mais aussi ce que les autres cires font bien.\n\nOn compare ici les trois cires les plus courantes, la paraffine, la cire de soja et la cire d'abeille, sur ce qui compte quand on achète une bougie : d'où elles viennent, comment elles portent le parfum, comment elles brûlent, et à quoi elles ressemblent.",
    sections: [
      {
        title: "D'où vient chaque cire",
        content:
          "- **La paraffine** est un dérivé du pétrole, issue du raffinage. C'est la cire la plus répandue et la moins chère : la grande majorité des bougies du commerce en contiennent.\n- **La cire de soja** est obtenue à partir de l'huile de graines de soja, hydrogénée pour devenir solide à température ambiante. C'est une cire végétale, issue d'une plante cultivée chaque année.\n- **La cire d'abeille** est produite par les abeilles pour construire les rayons de la ruche, puis récupérée et filtrée par l'apiculteur. Elle est rare et chère.\n\nIl existe aussi d'autres cires végétales, comme la cire de colza ou de coco, souvent mélangées entre elles ou avec de la paraffine. **Une bougie « végétale » peut donc contenir plusieurs cires** : seule la composition exacte vous dit ce qu'il y a dedans.\n\nNos bougies et nos fondants sont en cire de soja, et la mention figure sur chaque fiche produit.",
      },
      {
        title: "Le parfum : comment chaque cire le porte",
        content:
          "- **La paraffine** retient beaucoup de parfum et le diffuse fort, y compris bougie éteinte. C'est l'une des raisons de son succès dans les bougies très parfumées.\n- **La cire de soja** fond à plus basse température. Elle diffuse un parfum plus doux bougie éteinte, mais forme rapidement une large surface liquide, d'où le parfum se libère bien une fois allumée. C'est aussi ce qui la rend idéale pour les **fondants** : une petite chaleur suffit à la faire fondre.\n- **La cire d'abeille** a sa propre odeur, légèrement miellée. Elle se parfume moins facilement : on la choisit souvent nature, pour cette odeur justement.\n\nLe parfum lui-même compte autant que la cire. Les nôtres sont des parfums de Grasse, composés pour tenir à la chaleur de la cire : on en parle dans notre guide [parfum de Grasse : ce que ça veut dire](/conseils/parfum-de-grasse-bougie).",
      },
      {
        title: "La combustion et l'entretien",
        content:
          "Ce qui fait une bougie qui brûle proprement, c'est d'abord **l'accord entre la cire, la mèche et le pot**, puis la façon dont on s'en sert. Une mèche trop longue fera fumer n'importe quelle cire.\n\nQuelques différences quand même :\n\n- **la paraffine** brûle de façon très régulière ; elle peut produire une fumée noire si la mèche n'est pas entretenue ;\n- **la cire de soja** a la réputation de brûler lentement et de laisser peu de traces noires sur le verre quand la mèche est bien coupée. Comme elle fond bas, il faut lui laisser le temps de fondre jusqu'aux bords au premier allumage ;\n- **la cire d'abeille** brûle lentement, avec une flamme vive et chaude, ce qui demande une mèche adaptée.\n\nQuelle que soit la cire, les règles sont les mêmes : couper la mèche à 5 mm, éviter les courants d'air, aérer la pièce de temps en temps. Notre guide sur la [bougie qui creuse](/conseils/bougie-qui-creuse-effet-tunnel) détaille ces gestes.",
      },
      {
        title: "L'aspect : givrage, couleurs, surface",
        content:
          "- **La paraffine** donne une surface lisse et brillante, et prend très bien les couleurs vives.\n- **La cire de soja** est plus mate, d'un blanc crème. Elle peut présenter des **marbrures blanches**, le « givrage » : de petits cristaux naturels qui se forment quand la cire refroidit. Ce n'est pas un défaut, et ça ne change rien au parfum ni à la combustion. Sa surface peut aussi être un peu irrégulière après une utilisation, elle refond normalement la fois suivante.\n- **La cire d'abeille** a une teinte jaune doré naturelle et un aspect légèrement satiné.\n\nC'est aussi pour cet aspect naturel que la cire de soja convient bien aux formes travaillées comme nos [bougies gourmandes](/categorie/bougies-gourmandes), où elle est associée à du gel pour bougie pour imiter les glaçons et les boissons.",
      },
      {
        title: "Pourquoi nous avons choisi la cire de soja",
        content:
          "Pour ce que nous fabriquons, des bougies parfumées et surtout des fondants, la cire de soja coche les cases qui comptent :\n\n- **elle est végétale**, issue d'une plante cultivée, sans dérivé du pétrole ;\n- **elle fond à basse température**, ce qui est exactement ce qu'on attend d'un fondant posé sur un brûle-parfum ;\n- **elle se coule bien à la main**, par petites séries, comme nous travaillons ;\n- **elle est vegan**, contrairement à la cire d'abeille.\n\nUn point d'honnêteté : une cire végétale ne rend pas une bougie inoffensive par magie. Toute flamme produit de la chaleur et des fumées si la mèche est mal entretenue ; aérez la pièce et suivez les consignes de l'étiquette, quelle que soit la cire.\n\nToute la collection est en cire de soja : [bougies parfumées](/categorie/bougies-parfumees), [bougies gourmandes](/categorie/bougies-gourmandes) et [fondants parfumés](/categorie/fondants-parfumes).",
      },
    ],
    highlights: [
      "Paraffine = pétrole ; soja = huile végétale ; abeille = ruche.",
      "Une bougie « végétale » peut mélanger plusieurs cires : lisez la composition.",
      "La cire de soja fond bas : idéale pour les fondants.",
      "Les traces blanches sur la cire de soja sont naturelles.",
    ],
    faq: [
      {
        question: "Cire de soja ou paraffine : laquelle choisir ?",
        answer:
          "La paraffine, dérivée du pétrole, diffuse fort et coûte peu. La cire de soja est végétale, fond à plus basse température et convient très bien aux fondants. Le choix dépend de ce que vous privilégiez : origine végétale ou parfum très puissant à froid.",
      },
      {
        question: "Qu'est-ce que la cire de soja ?",
        answer:
          "Une cire végétale obtenue à partir de l'huile de graines de soja, hydrogénée pour devenir solide. Elle est vegan et fond à basse température.",
      },
      {
        question: "La cire de soja sent-elle moins fort ?",
        answer:
          "Bougie éteinte, souvent un peu moins que la paraffine. Allumée, elle forme vite une large surface liquide qui libère bien le parfum.",
      },
      {
        question: "Pourquoi ma bougie en cire de soja a des traces blanches ?",
        answer:
          "C'est le givrage : de petits cristaux naturels qui se forment au refroidissement de la cire végétale. Il ne change ni le parfum ni la combustion.",
      },
      {
        question: "La cire d'abeille est-elle meilleure ?",
        answer:
          "Elle est naturelle et brûle lentement, mais elle est chère, a sa propre odeur de miel, se parfume moins facilement et n'est pas vegan.",
      },
      {
        question: "Vos bougies contiennent-elles de la paraffine ?",
        answer:
          "Nos bougies parfumées et nos fondants sont coulés en cire de soja. Les bougies gourmandes associent cire de soja et gel pour bougie, comme l'indique chaque fiche.",
      },
    ],
    links: [
      P("bougie-eucalyptus", "Bougie Eucalyptus", "Cire de soja, parfum de Grasse."),
      CAT.bougies,
      CAT.fondants,
      G.grasse,
      G.tunnel,
    ],
  },

  // ───────────────────────────── 6. Parfum de Grasse ─────────────────────────
  {
    order: 6,
    slug: "conseils/parfum-de-grasse-bougie",
    heroImage: img(
      "coffret-fondant-parfume-lavande-rose-ancienne",
      "Coffret de fondants parfumés lavande et rose ancienne, parfums de Grasse",
      1600,
      1200,
    ),
    h1: "Parfum de Grasse dans une bougie : ce que ça veut dire",
    meta_title: "Parfum de Grasse pour bougie : ce que ça veut dire",
    meta_description:
      "Pourquoi Grasse est la capitale du parfum, ce qu'est un parfum pour bougie, et ce que la mention « parfum de Grasse » garantit, ou pas.",
    main_keyword: "parfum de grasse bougie",
    secondary_keywords: ["parfum de grasse pour bougie", "parfum de grasse", "bougie parfum de grasse", "parfum pour bougie"],
    card: {
      title: "Parfum de Grasse : ce que ça veut dire",
      tagline: "D'où vient le parfum",
      description: "La ville, le savoir-faire, et ce que la mention garantit vraiment sur une bougie.",
      badges: ["Matières"],
      featured: false,
    },
    intro:
      "« Parfum de Grasse » figure sur toutes nos fiches, et sur beaucoup d'autres bougies artisanales. La mention évoque la Provence, les champs de jasmin et les grands parfumeurs. Mais concrètement, qu'est-ce qu'elle veut dire, et qu'est-ce qu'elle ne veut pas dire ?\n\nVoici ce qu'il faut savoir sur Grasse, sur la façon dont on parfume une bougie ou un fondant, et sur ce que vous pouvez attendre d'un parfum de Grasse dans votre salon.",
    sections: [
      {
        title: "Grasse, la capitale mondiale du parfum",
        content:
          "Grasse est une ville des Alpes-Maritimes, sur les hauteurs de la Côte d'Azur. Son climat a permis d'y cultiver des fleurs à parfum, comme le jasmin, la rose centifolia ou la tubéreuse, et la ville s'est fait une spécialité de leur transformation dès le XVIIIe siècle, en passant de la ganterie parfumée à la parfumerie.\n\nAujourd'hui, Grasse et ses environs réunissent des maisons de composition, des usines d'extraction de matières premières et des écoles de parfumeurs. En 2018, **les savoir-faire liés au parfum en Pays de Grasse** ont été inscrits au patrimoine culturel immatériel de l'humanité par l'UNESCO : la culture de la plante à parfum, la connaissance des matières premières et leur transformation, et l'art de composer un parfum.\n\nC'est cette réputation que porte la mention « parfum de Grasse » : un parfum composé par des professionnels de la parfumerie.",
      },
      {
        title: "Ce qu'est un parfum pour bougie",
        content:
          "Un parfum de bougie n'est ni un parfum pour la peau, ni une huile essentielle pure. C'est une **composition parfumée conçue pour la cire** : elle doit se mélanger à la cire fondue, tenir pendant le refroidissement, puis se libérer à la chaleur de la flamme ou du brûle-parfum sans se dégrader.\n\nComme un parfum classique, il se construit en notes :\n\n- **les notes de tête**, qu'on sent tout de suite (agrumes, notes fraîches) ;\n- **les notes de cœur**, le caractère du parfum (fleurs, épices) ;\n- **les notes de fond**, qui tiennent le plus longtemps (bois, ambre, musc).\n\nUne composition peut associer des matières naturelles et des molécules de synthèse : c'est la synthèse qui permet des parfums comme « linge propre » ou « cachemire », qui n'existent pas dans la nature, et une odeur stable d'une fabrication à l'autre.",
      },
      {
        title: "Ce que la mention garantit, et ce qu'elle ne garantit pas",
        content:
          "Sur une bougie, « parfum de Grasse » signifie que **le parfum a été composé et fourni par la parfumerie grassoise**. C'est une indication d'origine du parfum, pas une appellation contrôlée.\n\nCe qu'elle dit :\n\n- le parfum vient d'un savoir-faire reconnu, et non d'une fragrance générique sans origine ;\n- il est formulé pour l'usage en bougie ou en fondant.\n\nCe qu'elle ne dit pas :\n\n- **ce n'est pas une huile essentielle pure** ni une garantie de matières 100 % naturelles ;\n- elle ne dit rien de la cire ni de la fabrication de la bougie elle-même.\n\nPour savoir ce que contient vraiment une bougie, regardez **la composition et l'étiquette de sécurité** : les allergènes présents dans le parfum y sont obligatoirement indiqués. Chez nous, la cire est de la cire de soja, la fabrication est faite à la main par petites séries, et le parfum vient de Grasse : trois informations distinctes, toutes écrites sur chaque fiche.",
      },
      {
        title: "Les familles de parfums de notre collection",
        content:
          "Nos parfums se rangent en quelques grandes familles, pour vous aider à choisir sans les sentir :\n\n| Famille | Nos parfums |\n|---|---|\n| Propre et poudré | [Adoucissant, linge propre](/produit/bougie-adoucissant-linge-propre), [Cachemire et soie](/produit/bougie-cachemire-et-soie), linge propre et poudre de riz |\n| Floral | [Jasmin](/produit/bougie-jasmin), fleur de coton, [lavande et rose ancienne](/produit/coffret-fondants-lavande-rose) |\n| Frais et boisé | [Eucalyptus](/produit/bougie-eucalyptus), eucalyptus et patchouli |\n| Chaud et ambré | [Ambre gris et bois de santal](/produit/coffret-fondants-ambre-gris-santal) |\n| Solaire | [Monoï](/produit/bougie-monoi) |\n| Gourmand | cerise, pêche, myrtille, cookie chocolat latte : nos [bougies gourmandes](/categorie/bougies-gourmandes) |\n\nSi vous ne savez pas par où commencer, les familles « propre » et « floral » sont celles qui plaisent le plus largement. Les notes ambrées et boisées sont plus enveloppantes, parfaites en hiver.",
      },
      {
        title: "Bien profiter d'un parfum de Grasse chez soi",
        content:
          "Un beau parfum se gâche vite s'il est mal diffusé. Quelques conseils pour en profiter pleinement :\n\n- **un parfum par pièce** : deux bougies de parfums différents dans la même pièce se brouillent ;\n- **le bon format pour la pièce** : une bougie pour une ambiance proche, un [fondant](/categorie/fondants-parfumes) dans un brûle-parfum pour parfumer une grande pièce ;\n- **ne surchauffez pas** : une flamme trop grande ou un brûle-parfum trop chaud fait s'évaporer les notes de tête trop vite. Coupez la mèche à 5 mm ;\n- **aérez entre deux utilisations** : le nez se lasse d'un parfum constant, et il le redécouvre après une pause ;\n- **alternez les familles selon les saisons** : frais et floral au printemps, solaire en été, ambré en hiver.\n\nEnfin, gardez vos bougies et fondants à l'abri de la lumière et de la chaleur, couvercle fermé si le pot en a un : le parfum se conserve mieux.",
      },
    ],
    highlights: [
      "Savoir-faire du parfum en Pays de Grasse inscrit à l'UNESCO en 2018.",
      "« Parfum de Grasse » = origine du parfum, pas une appellation contrôlée.",
      "Ce n'est pas une huile essentielle pure : lisez composition et étiquette.",
      "Un parfum par pièce, mèche coupée à 5 mm pour ne pas le brûler.",
    ],
    faq: [
      {
        question: "Que veut dire « parfum de Grasse » sur une bougie ?",
        answer:
          "Que le parfum a été composé et fourni par la parfumerie de Grasse, ville réputée pour son savoir-faire. C'est une indication d'origine du parfum, pas une appellation contrôlée.",
      },
      {
        question: "Un parfum de Grasse est-il naturel ?",
        answer:
          "Pas forcément. Une composition peut associer matières naturelles et molécules de synthèse. Ce n'est pas une huile essentielle pure.",
      },
      {
        question: "Pourquoi Grasse est-elle la capitale du parfum ?",
        answer:
          "Son climat a permis la culture des fleurs à parfum et la ville s'est spécialisée dans leur transformation dès le XVIIIe siècle. Ses savoir-faire liés au parfum sont inscrits au patrimoine immatériel de l'UNESCO depuis 2018.",
      },
      {
        question: "Les parfums de vos bougies gourmandes viennent-ils aussi de Grasse ?",
        answer:
          "Oui, toutes nos bougies et tous nos fondants, gourmands compris, sont parfumés avec des parfums de Grasse.",
      },
      {
        question: "Où trouver les allergènes d'un parfum de bougie ?",
        answer:
          "Sur l'étiquette de sécurité du produit : les substances allergisantes présentes dans le parfum doivent y être indiquées.",
      },
      {
        question: "Quel parfum choisir pour une première bougie ?",
        answer:
          "Les familles propre et poudrée, comme Cachemire et soie, ou florale, comme Jasmin, plaisent le plus largement.",
      },
    ],
    links: [
      P("coffret-fondants-lavande-rose", "Coffret Lavande et rose ancienne", "Deux grands classiques de la parfumerie."),
      CAT.bougies,
      CAT.fondants,
      G.cire,
    ],
  },

  // ───────────────────────────── 7. Tache de cire ─────────────────────────
  {
    order: 7,
    slug: "conseils/enlever-tache-cire-bougie",
    heroImage: img(
      "bougie-parfumee-senteur-adoucissant",
      "Bougie parfumée Adoucissant, linge propre en cire de soja",
      1079,
      1600,
    ),
    h1: "Comment enlever une tache de cire de bougie, support par support",
    meta_title: "Enlever une tache de cire de bougie : tissu, bois, verre",
    meta_description:
      "Vêtement, nappe, canapé, moquette, meuble en bois, pot en verre : la bonne méthode pour enlever la cire de bougie sans abîmer le support.",
    main_keyword: "enlever cire de bougie",
    secondary_keywords: ["enlever cire de bougie sur tissu", "comment enlever de la cire de bougie", "tache de cire", "nettoyer pot de bougie"],
    card: {
      title: "Enlever une tache de cire",
      tagline: "Support par support",
      description: "Tissu, canapé, moquette, bois, verre : la bonne méthode sans abîmer.",
      badges: ["Entretien"],
      featured: false,
    },
    intro:
      "Une bougie renversée, un brûle-parfum déplacé trop tôt, une coulure sur la nappe : la cire finit toujours par atterrir là où il ne faut pas. Pas de panique, elle s'enlève presque toujours, à condition de ne pas frotter tout de suite.\n\nLe principe est le même partout : **laisser durcir, retirer le gros, puis faire fondre le reste dans un papier absorbant**. Voici la méthode adaptée à chaque support.",
    sections: [
      {
        title: "La règle d'or : attendre que la cire durcisse",
        content:
          "Le réflexe, c'est d'essuyer la cire encore chaude. C'est la pire idée : la cire liquide pénètre plus profondément dans les fibres et s'étale.\n\n- **Laissez la cire refroidir et durcir complètement.** Pour accélérer, posez dessus un glaçon dans un sachet de congélation : la cire devient cassante.\n- **Retirez le gros à la main ou avec un outil non coupant** : une carte en plastique, le dos d'une cuillère, une spatule en bois. Sur un tissu, pliez-le pour faire craquer la cire.\n- **Ne grattez jamais avec une lame** sur un tissu délicat ou un meuble verni.\n\nCe premier geste enlève souvent l'essentiel. Le reste, un film gras incrusté, se traite selon le support.",
      },
      {
        title: "Sur un vêtement, une nappe ou un drap",
        content:
          "Une fois le gros de la cire retiré :\n\n1. **Placez du papier absorbant** (essuie-tout, papier kraft non imprimé ou buvard) dessus et dessous la tache.\n2. **Passez un fer à repasser tiède, sans vapeur**, sur le papier. La chaleur fait fondre la cire, que le papier absorbe.\n3. **Déplacez le papier** sur une partie propre à chaque passage, et recommencez jusqu'à ce qu'il ne se marque plus.\n4. S'il reste une **auréole grasse**, appliquez un peu de liquide vaisselle ou de détachant avant lavage, laissez agir, puis lavez selon l'étiquette du vêtement.\n\nRéglez le fer selon le tissu : tiède pour le synthétique, plus chaud pour le coton et le lin. **Testez toujours sur une partie cachée.** Pour la soie, le velours, le cuir ou un vêtement précieux, confiez-le plutôt à un pressing.\n\nUne cire colorée peut laisser une trace de couleur : traitez-la rapidement avec un détachant adapté avant de passer en machine, la chaleur du séchage la fixerait.",
      },
      {
        title: "Sur un canapé, un tapis ou une moquette",
        content:
          "La méthode est la même que pour un vêtement, avec deux précautions : on ne peut pas glisser de papier dessous, et le tissu ne passe pas en machine.\n\n- **Durcissez la cire au glaçon**, puis cassez-la et aspirez les morceaux.\n- **Posez du papier absorbant sur la tache** et passez le fer tiède sans vapeur, sans appuyer, en changeant de papier souvent.\n- **Sur une moquette ou un tapis à poils longs**, démêlez les fibres avec une brosse après coup.\n- **Terminez avec un nettoyant pour tissu d'ameublement**, tamponné et non frotté, pour l'auréole grasse.\n\nSur un canapé en velours, en microfibre ou en cuir, testez d'abord sur une zone cachée, et n'hésitez pas à demander conseil à un professionnel du nettoyage : la chaleur peut marquer ces matières.",
      },
      {
        title: "Sur un meuble en bois, une table ou du carrelage",
        content:
          "Sur une surface dure, la cire se retire assez facilement, mais il faut protéger le vernis ou la finition.\n\n- **Laissez durcir**, puis soulevez la cire avec une carte en plastique ou une spatule en bois, jamais un couteau.\n- **Pour le film restant**, chauffez doucement au sèche-cheveux, température moyenne : la cire ramollit et s'essuie avec un chiffon doux.\n- **Finissez avec un chiffon légèrement humide**, puis séchez. Sur un bois ciré ou huilé, un peu de cire ou d'huile d'entretien redonne l'aspect d'origine.\n\nSur le **carrelage, le verre ou la pierre** non poreuse, c'est encore plus simple : durcir, décoller, puis un nettoyant ménager habituel. Sur une **pierre poreuse** (marbre, travertin), évitez les produits acides et agissez vite, la cire grasse peut laisser une ombre.",
      },
      {
        title: "Vider un pot de bougie ou une coupelle de brûle-parfum",
        content:
          "Une bougie finie laisse souvent un fond de cire, et un joli pot qu'on aimerait garder. Pour le récupérer :\n\n- **Le congélateur** : mettez le pot quelques heures au congélateur. La cire se rétracte en refroidissant et se décolle du verre ; un petit coup avec une cuillère suffit à la faire sortir.\n- **L'eau chaude** : versez de l'eau très chaude dans le pot posé dans l'évier (sur un torchon, pour éviter le choc thermique). La cire fond, remonte à la surface et durcit en refroidissant : il n'y a plus qu'à retirer le disque.\n- **Retirez la pastille métallique** de la mèche, puis lavez le pot à l'eau chaude savonneuse.\n\nMême principe pour la **coupelle d'un brûle-parfum** : cire froide décollée d'un bloc, ou dix minutes au congélateur si elle est amovible (tout est expliqué dans notre guide [comment utiliser un fondant parfumé](/conseils/comment-utiliser-fondant-parfume)).\n\nDans tous les cas, **jetez la cire à la poubelle, jamais dans l'évier** : elle redurcit dans les canalisations. Et pour éviter les coulures, rien ne vaut un pot posé sur une surface stable, comme nos [bougies parfumées](/categorie/bougies-parfumees).",
      },
    ],
    highlights: [
      "Ne frottez pas la cire chaude : laissez-la durcir.",
      "Tissu : papier absorbant + fer tiède sans vapeur, en changeant de papier.",
      "Bois : carte en plastique, puis sèche-cheveux et chiffon doux.",
      "Pot en verre : quelques heures au congélateur, la cire se décolle.",
    ],
    faq: [
      {
        question: "Comment enlever de la cire de bougie sur un vêtement ?",
        answer:
          "Laissez durcir, retirez le gros, puis passez un fer tiède sans vapeur sur du papier absorbant placé dessus et dessous la tache, en changeant de papier. Traitez l'auréole grasse au liquide vaisselle avant lavage.",
      },
      {
        question: "Comment enlever de la cire sur un canapé ?",
        answer:
          "Durcissez la cire au glaçon, cassez-la et aspirez, puis passez le fer tiède sur du papier absorbant sans appuyer. Testez sur une zone cachée, surtout sur du velours, de la microfibre ou du cuir.",
      },
      {
        question: "Comment enlever de la cire sur du bois ?",
        answer:
          "Soulevez la cire durcie avec une carte en plastique, ramollissez le film restant au sèche-cheveux et essuyez avec un chiffon doux. Jamais de couteau sur un bois verni.",
      },
      {
        question: "Comment récupérer le pot d'une bougie finie ?",
        answer:
          "Mettez-le quelques heures au congélateur : la cire se rétracte et se décolle. Ou versez de l'eau très chaude, la cire remonte et durcit en surface. Lavez ensuite à l'eau savonneuse.",
      },
      {
        question: "Peut-on jeter de la cire dans l'évier ?",
        answer:
          "Non, elle redurcit dans les canalisations et peut les boucher. Jetez-la à la poubelle.",
      },
      {
        question: "La cire de soja est-elle plus facile à enlever ?",
        answer:
          "Elle fond à basse température, ce qui facilite la méthode du fer tiède et de l'eau chaude. Les mêmes précautions restent valables.",
      },
    ],
    links: [
      P("bougie-adoucissant-linge-propre", "Bougie Adoucissant, linge propre", "Cire de soja, environ 20 heures."),
      CAT.bougies,
      G.fondant,
      G.brule,
    ],
  },
];

// ─── Contrôles ─────────────────────────────────────────────────────────
const sb = getSupabase();
const [{ data: prods }, { data: cats }] = await Promise.all([
  sb.from("products").select("slug").eq("site_key", SITE),
  sb.from("product_categories").select("slug").eq("site_key", SITE),
]);
const known = new Set([
  ...(prods ?? []).map((p) => `/produit/${p.slug}`),
  ...(cats ?? []).map((c) => `/categorie/${c.slug}`),
  ...articles.map((a) => `/${a.slug}`),
]);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
// Prix, bijou, crémeux, promesse santé, durée des gourmandes, huile essentielle revendiquée.
const FORBIDDEN =
  /\d+[,.]?\d*\s?€|bijou|crémeux|non toxique|sans danger|inoffensi(f|ve) (?!par magie)|bonne pour la santé|gourmandes? (brûlent|durent)|huiles? essentielles? (de|d')/i;
let failed = false;
for (const a of articles) {
  const body = [a.intro, ...a.sections.map((s) => s.content)].join("\n");
  const faq = a.faq.map((f) => f.question + " " + f.answer).join(" ");
  const all = [a.h1, a.meta_title, a.meta_description, body, faq, ...a.highlights].join("\n");
  const links = [...body.matchAll(/\]\((\/[^)]+)\)/g)].map((m) => m[1]).concat(a.links.map((l) => l.url));
  const bad = links.filter((l) => !known.has(l));
  const hit = all.match(FORBIDDEN);
  const firstProduct = a.links[0]?.url.startsWith("/produit/");
  const problems = [
    a.meta_title.length > 60 && `titre ${a.meta_title.length} car.`,
    a.meta_description.length > 155 && `meta ${a.meta_description.length} car.`,
    bad.length && `liens inconnus : ${bad.join(", ")}`,
    hit && `interdit : « ${hit[0]} »`,
    !firstProduct && "le 1er lien doit être un produit (encart du milieu)",
    a.faq.length !== 6 && "FAQ ≠ 6",
  ].filter(Boolean);
  console.log(
    `${a.order}. ${a.slug} — title ${a.meta_title.length} · meta ${a.meta_description.length} · corps ${words(body)} mots · FAQ ${words(faq)} mots · ${a.sections.length} sections` +
      (problems.length ? `\n   !! ${problems.join(" · ")}` : ""),
  );
  if (problems.length) failed = true;
}
if (failed) process.exit(1);
if (process.argv.includes("--check")) process.exit(0);

// ─── Écriture ─────────────────────────────────────────────────────────
for (const a of articles) {
  const { data: existing } = await sb.from("seo_pages").select("id, status").eq("site_key", SITE).eq("slug", a.slug).maybeSingle();
  if (existing && existing.status === "published") {
    console.log(`publiée, non touchée : ${a.slug}`);
    continue;
  }
  const row = {
    site_key: SITE,
    slug: a.slug,
    city: "France",
    service: null,
    page_type: "article",
    intent: "informational",
    mode: "product",
    parent_id: null,
    status: "draft",
    h1: a.h1,
    meta_title: a.meta_title,
    meta_description: a.meta_description,
    content: {
      intro: a.intro,
      heroImage: a.heroImage,
      seoSections: a.sections,
      highlights: a.highlights,
      faq: a.faq,
      internalLinks: a.links,
      card: a.card,
      updatedDate: DATE,
      brief: {
        source: "seed:cirelle-conseils",
        main_keyword: a.main_keyword,
        secondary_keywords: a.secondary_keywords,
        publish_order: a.order,
        note: "Guide écrit le 2026-10-28 (DataForSEO FR + SERP du jour). Chiffres = attributs du catalogue (bougie ≈ 20 h, fondant 8-10 h, segment Snapbar ≈ 10 h) + FAQ du site (mèche 5 mm, 1er allumage jusqu'aux bords) + CGV (1-2 j de préparation, Colissimo 2-3 j). Conseils d'usage courants présentés comme tels. Aucun prix, aucune durée pour les gourmandes, aucune marque de brûle-parfum. À relire avant publication.",
      },
    },
  };
  const q = existing ? sb.from("seo_pages").update(row).eq("id", existing.id) : sb.from("seo_pages").insert(row);
  const { error } = await q;
  console.log(error ? `ERREUR ${a.slug} : ${error.message}` : `${existing ? "màj" : "créé"} ${a.slug}`);
}
