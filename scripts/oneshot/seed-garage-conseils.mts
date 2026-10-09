/**
 * 6 articles de la rubrique Conseils du site Garage Perpignan (site_key garage), slug
 * `conseils/…`, page_type `article`, statut `draft`. Le site liste sur /conseils toute
 * page CMS dont le slug commence par `conseils/` (app/conseils/page.tsx) ; l'article est
 * rendu par ArticleTemplate (en-tête + sommaire + sections markdown + points clés + FAQ +
 * bandeau d'appel + rappel + pages liées). Les articles n'entrent ni dans le menu
 * Prestations, ni dans /services, ni dans le schéma LocalBusiness (filtrés dans lib/cms.ts).
 *
 * Sujets choisis le 2026-10-09 sur DataForSEO (France) + lecture des SERP + GSC du site :
 * les questions que l'on tape avant de chercher un garage, sur les services où le site est
 * déjà en positions 7-16 (FAP, boîte automatique, AdBlue, clim) et sur le voyant moteur.
 * Angle « symptôme, cause, prix, quand venir », jamais encyclopédique.
 *
 * Faits : règles du profil `site_profiles.garage` — « nous », jamais de personne mise en
 * scène, jamais de délai chiffré, jamais « diagnostic gratuit » (le diagnostic est facturé,
 * le devis est gratuit), pas d'ancienneté inventée. Les prix sont des ordres de grandeur
 * du marché français, présentés comme tels — à valider avant publication.
 *
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-garage-conseils.mts            # écrit
 *   npx tsx scripts/oneshot/seed-garage-conseils.mts --check    # longueurs seulement
 */
import { getSupabase } from "../../src/db/client";

const SITE = "garage";
const CONTACT = { url: "/contact", anchor: "Nous contacter", context: "Téléphone, SMS ou email, 6 jours sur 7." };
const L = {
  fap: { url: "/fap-perpignan", anchor: "FAP à Perpignan : diagnostic et nettoyage", context: "Lecture de la charge en suie, régénération, nettoyage ou remplacement." },
  boite: { url: "/boite-vitesse-perpignan", anchor: "Boîte de vitesses à Perpignan", context: "Vidange de boîte automatique, diagnostic, réparation." },
  adblue: { url: "/adblue-perpignan", anchor: "AdBlue à Perpignan", context: "Voyant allumé, remplissage et réparation du système SCR." },
  clim: { url: "/climatisation-auto-perpignan", anchor: "Climatisation auto à Perpignan", context: "Recharge, contrôle et recherche de fuite." },
  diag: { url: "/diagnostic-auto-perpignan", anchor: "Diagnostic électronique à Perpignan", context: "Lire ce que votre véhicule a enregistré avant de toucher à une pièce." },
  entretien: { url: "/entretien-voiture-perpignan", anchor: "Entretien et vidange à Perpignan", context: "Révision constructeur, vidange, contrôle avant contrôle technique." },
  egr: { url: "/vanne-egr-perpignan", anchor: "Vanne EGR à Perpignan", context: "Diagnostic, nettoyage et remplacement." },
  injecteurs: { url: "/injecteurs-perpignan", anchor: "Injecteurs à Perpignan", context: "Diagnostic avant tout remplacement." },
  decalaminage: { url: "/decalaminage-perpignan", anchor: "Décalaminage moteur à Perpignan", context: "Retirer la calamine du moteur et de l'admission." },
  turbo: { url: "/turbo-perpignan", anchor: "Turbo à Perpignan", context: "Diagnostic, réparation et remplacement." },
};
const A = {
  voyantFap: { url: "/conseils/voyant-fap-allume", anchor: "Voyant FAP allumé : que faire", context: "Ce que le voyant signale, ce qu'on peut tenter, et quand venir." },
  nettoyageFap: { url: "/conseils/nettoyage-fap-prix", anchor: "Nettoyage FAP : prix et méthodes", context: "Régénération, nettoyage sur place ou en machine, remplacement : ce que ça coûte." },
  boite: { url: "/conseils/vidange-boite-automatique", anchor: "Vidange de boîte automatique : quand et à quel prix", context: "Tous les combien, les symptômes, vidange simple ou échange complet." },
  adblue: { url: "/conseils/voyant-adblue-allume", anchor: "Voyant AdBlue allumé : que faire", context: "Niveau bas, compte à rebours, défaut système : les trois cas et leurs prix." },
  moteur: { url: "/conseils/voyant-moteur-orange", anchor: "Voyant moteur orange : peut-on rouler ?", context: "Fixe ou clignotant, les causes fréquentes, et pourquoi ne pas l'effacer soi-même." },
  clim: { url: "/conseils/recharge-clim-voiture-prix", anchor: "Recharge de clim : prix et quand la faire", context: "Souffle tiède, fuite ou simple recharge, et ce que ça coûte." },
};

type Img = { src: string; alt: string; width: number; height: number };
const hero = (file: string, alt: string): Img => ({ src: `/images/conseils/${file}.jpg`, alt, width: 1600, height: 1200 });
const wide = (file: string, alt: string): Img => ({ src: `/images/conseils/${file}.jpg`, alt, width: 1280, height: 720 });

type Section = { title: string; content: string; image?: Img };
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
  sections: Section[];
  highlights: string[];
  faq: { question: string; answer: string }[];
  links: { url: string; anchor: string; context?: string }[];
};

const articles: Article[] = [
  // ───────────────────────────── 1. Voyant FAP ─────────────────────────────
  {
    order: 1,
    slug: "conseils/voyant-fap-allume",
    heroImage: hero("voyant-fap-tableau-de-bord", "Tableau de bord de voiture avec un voyant d'avertissement allumé parmi les cadrans"),
    h1: "Voyant FAP allumé : ce qu'il signale, ce que vous pouvez faire, et quand venir au garage",
    meta_title: "Voyant FAP allumé : que faire et quand s'inquiéter",
    meta_description:
      "Voyant FAP allumé : ce qu'il veut dire, les symptômes, ce que vous pouvez tenter sur la route, ce qu'il ne faut pas faire, et les prix du marché.",
    main_keyword: "voyant fap",
    secondary_keywords: ["voyant fap allumé", "fap bouché", "fap encrassé symptômes", "regeneration fap", "fap colmaté"],
    card: { title: "Voyant FAP allumé : que faire", tagline: "Ce qu'il signale, ce qu'on peut tenter, quand venir", description: "Le voyant FAP n'est pas une panne, c'est un seuil franchi. Ce qu'il veut dire, ce qui l'accompagne, ce que vous pouvez faire sur la route, ce qu'il ne faut surtout pas faire, et ce que ça coûte.", badges: [], featured: false },
    intro:
      "Le voyant FAP est l'un des plus fréquents sur un diesel récent, et l'un des plus mal compris. Il ne dit pas « votre filtre est mort ». Il dit « le filtre a dépassé un seuil de suie et n'a pas réussi à se nettoyer seul ». Entre ces deux phrases, il y a toute la différence entre une demi-heure de route et un devis à quatre chiffres.\n\nVoici ce que le voyant signale réellement, les symptômes qui vont avec, ce que vous pouvez tenter avant de venir, ce qu'il ne faut pas faire, et les ordres de grandeur de prix du marché. Les chiffres sont ceux que l'on observe en France, pas une grille tarifaire : chez nous, le diagnostic se fait au garage et le devis détaillé est gratuit.",
    sections: [
      {
        title: "Ce que le voyant FAP signale vraiment",
        content:
          "Le filtre à particules retient les suies produites par la combustion du gasoil. Il se remplit en roulant, puis se vide tout seul par **régénération** : quand la charge atteint un seuil, le calculateur fait monter la température des gaz d'échappement à 550-650 °C, et les suies brûlent. Sur autoroute, cela se fait sans que vous le sachiez. En ville, à froid, sur des trajets de dix minutes, la température n'est jamais atteinte et la régénération démarre puis s'interrompt.\n\nLe voyant s'allume quand le calculateur a tenté plusieurs régénérations sans y parvenir, et que la charge estimée dépasse un second seuil. C'est un appel à rouler différemment, pas encore une panne. Au-delà, un troisième seuil fait passer le moteur en mode dégradé et allume souvent le voyant moteur en plus : là, la régénération en roulant est en général refusée par le calculateur, et le garage devient le seul chemin.\n\nRetenez l'ordre : voyant FAP seul, fixe, sans perte de puissance = seuil de suie à traiter vite ; voyant FAP + voyant moteur + puissance réduite = au-delà du seuil, on ne tente plus rien sur la route.",
      },
      {
        title: "Les symptômes qui l'accompagnent",
        content:
          "Un FAP qui se charge ne se signale pas seulement par le voyant. Les signes que l'on nous décrit au téléphone, dans l'ordre où ils apparaissent :\n\n- **Des régénérations de plus en plus fréquentes** : ralenti plus haut que d'habitude, ventilateur qui tourne à l'arrêt, odeur chaude à l'échappement, consommation qui monte.\n- **Une perte de reprise** sur les montées et les dépassements, parce que la contre-pression à l'échappement augmente.\n- **Un niveau d'huile moteur qui monte** sur la jauge. C'est le signe le plus sérieux : chaque régénération interrompue envoie du gasoil dans l'huile. Une huile diluée lubrifie mal et peut, dans le pire des cas, faire s'emballer le moteur.\n- **Le mode dégradé** : la puissance est bridée, parfois le régime limité à 3 000 tr/min.\n- **De la fumée** au démarrage ou à l'accélération, blanche ou grise.\n\nSi vous observez le niveau d'huile qui monte, ne faites pas de régénération en roulant. Venez, ou appelez-nous avant : une vidange est alors prioritaire sur tout le reste.",
        image: wide("voyant-fap-echappement-fumee", "Sortie d'échappement d'une voiture émettant de la fumée visible"),
      },
      {
        title: "Pourquoi il s'allume : les causes derrière la suie",
        content:
          "La suie est la conséquence. La cause est ailleurs, et c'est elle qu'il faut trouver pour que le voyant ne revienne pas trois mois plus tard. Les causes que l'on rencontre le plus souvent :\n\n1. **L'usage** : trajets courts, ville, moteur rarement chaud. C'est la cause numéro un, et la seule qui ne coûte rien à corriger.\n2. **Un capteur de pression différentielle** encrassé ou en défaut : il mesure la charge du filtre ; s'il ment, le calculateur régénère trop ou pas assez.\n3. **Une vanne EGR** encrassée, qui renvoie trop de gaz à l'admission et augmente la production de suies.\n4. **Des injecteurs** fatigués, qui pulvérisent mal et produisent une combustion incomplète : c'est un [diagnostic des injecteurs](/injecteurs-perpignan), pas un nettoyage de filtre.\n5. **Un additif** (cérine, sur de nombreux véhicules du groupe Stellantis) épuisé ou un réservoir d'additif en défaut : sans lui, la régénération ne se déclenche pas.\n6. **Une huile moteur inadaptée** : un diesel à FAP demande une huile dite « low SAPS », pauvre en cendres. Une huile classique charge le filtre en cendres qu'aucune régénération ne brûle.\n7. **Une sonde de température** d'échappement défaillante, qui empêche le calculateur de valider la régénération.\n\nC'est pour cela que l'on commence toujours par lire la mémoire du calculateur et les valeurs réelles, pas par nettoyer le filtre. Nettoyer un FAP sans traiter une [vanne EGR](/vanne-egr-perpignan) encrassée, c'est revenir dans six mois.",
      },
      {
        title: "Ce que vous pouvez tenter sur la route",
        content:
          "Si le voyant FAP est **seul**, **fixe**, sans voyant moteur, sans mode dégradé et sans niveau d'huile anormal, vous pouvez tenter une régénération en roulant. Les conditions pour qu'elle ait une chance d'aboutir :\n\n- Un trajet **d'au moins 20 à 30 minutes sans s'arrêter**, sur voie rapide ou route dégagée.\n- Un régime **soutenu et stable**, autour de 2 500 à 3 000 tr/min, en général en 4e ou 5e plutôt qu'en 6e, entre 70 et 110 km/h selon la route.\n- Le moteur **chaud** avant de commencer.\n- La clim et les gros consommateurs électriques **allumés** : cela charge le moteur et aide à monter en température.\n\nSi la régénération se déclenche, vous le sentirez : ralenti plus haut, consommation instantanée qui monte, parfois une odeur. **Ne coupez pas le moteur avant la fin**, elle dure souvent 15 à 25 minutes. Si le voyant s'éteint dans les jours qui suivent, la suie est partie ; la cause, elle, est peut-être toujours là.\n\nSi après deux tentatives le voyant reste allumé, n'insistez pas. Chaque tentative ratée dilue un peu plus l'huile. Le filtre a besoin d'être lu, puis nettoyé.",
      },
      {
        title: "Ce qu'il ne faut pas faire",
        content:
          "Trois erreurs que l'on voit chaque semaine, et qui transforment un entretien en réparation :\n\n- **Rouler des semaines avec le voyant** en se disant que « ça marche encore ». La charge continue de monter, l'huile se dilue, le turbo encaisse la contre-pression, et le filtre finit par se colmater au point où seul le remplacement reste.\n- **Effacer le voyant avec une valise** ou débrancher la batterie. Le calculateur garde sa charge estimée ; le voyant revient, et vous avez perdu les données qui auraient aidé le diagnostic.\n- **Verser un additif « nettoyant FAP » dans le réservoir** en espérant régler un filtre déjà colmaté. Ces produits aident sur un filtre légèrement chargé et un usage urbain, pas sur un voyant allumé depuis un mois.\n\nEt une quatrième, qui n'est pas une erreur mais une infraction : **retirer le FAP** ou le « désactiver » par reprogrammation. C'est interdit, détecté au contrôle technique depuis le renforcement du contrôle des émissions, et cela annule toute garantie. Nous ne le faisons pas, et nous le déconseillons même quand on nous le demande gentiment.",
      },
      {
        title: "Au garage : ce que l'on fait, et ce que ça coûte",
        content:
          "Quand un véhicule arrive avec le voyant FAP, l'ordre est toujours le même, c'est le déroulé de [notre prestation FAP à Perpignan](/fap-perpignan) :\n\n1. **Lecture du calculateur** : codes défaut, charge en suie estimée, charge en cendres, nombre de régénérations réussies et interrompues, état des capteurs. Le diagnostic est une prestation en soi, facturée ; il évite de changer une pièce pour rien.\n2. **Contrôle des causes** : capteur de pression différentielle, vanne EGR, additif, huile, sondes.\n3. **Décision** : régénération forcée à l'atelier si la charge le permet, nettoyage si elle est trop haute, remplacement si le filtre est fissuré, fondu ou saturé en cendres.\n4. **Devis détaillé, gratuit**, avant tout travail. Rien n'est fait sans votre accord.\n\nLes ordres de grandeur observés sur le marché français, hors diagnostic :\n\n| Intervention | Fourchette courante (marché) |\n| --- | --- |\n| Régénération forcée à l'atelier | 50 à 150 € |\n| Nettoyage sans dépose (produit injecté) | 100 à 250 € |\n| Nettoyage en machine, filtre déposé | 200 à 450 € plus la dépose |\n| Remplacement du FAP, pièce d'origine | 1 000 à 3 000 € |\n\nEntre un nettoyage à 300 € et un remplacement à 2 000 €, la différence se joue souvent à quelques semaines de voyant ignoré. Nous détaillons les méthodes et leurs limites dans [notre article sur le nettoyage du FAP](/conseils/nettoyage-fap-prix).",
      },
    ],
    highlights: [
      "Voyant FAP seul et fixe = seuil de suie franchi, pas encore une panne.",
      "Voyant FAP + voyant moteur + puissance réduite = on ne tente plus rien sur la route.",
      "Un niveau d'huile qui monte est le signal le plus sérieux : vidange prioritaire.",
      "La suie est la conséquence ; la cause (usage, capteur, EGR, injecteurs, additif, huile) se cherche à la valise.",
      "Nettoyer coûte quelques centaines d'euros, remplacer plusieurs milliers : le délai fait la différence.",
    ],
    faq: [
      { question: "Peut-on rouler avec le voyant FAP allumé ?", answer: "Quelques jours, oui, si le voyant est seul et fixe, sans perte de puissance ni voyant moteur. Le temps de faire une régénération en roulant ou de venir au garage. Pas des semaines : la charge monte, l'huile se dilue et le filtre finit par se colmater." },
      { question: "Comment faire une régénération du FAP en roulant ?", answer: "Moteur chaud, 20 à 30 minutes sans s'arrêter sur voie rapide, régime soutenu autour de 2 500 à 3 000 tr/min, clim allumée. Ne coupez pas le moteur avant la fin. Si le voyant reste allumé après deux tentatives, n'insistez pas." },
      { question: "Le voyant FAP peut-il s'éteindre tout seul ?", answer: "Oui, après une régénération réussie, en général dans les jours qui suivent un long trajet. S'il revient régulièrement, la cause n'est pas traitée : capteur, vanne EGR, injecteurs, additif ou huile inadaptée." },
      { question: "Quelle différence entre voyant FAP fixe et clignotant ?", answer: "Sur la plupart des véhicules, fixe signale un seuil de suie à traiter ; clignotant, ou accompagné du voyant moteur, signale un défaut du système ou une charge au-delà du seuil de régénération. Dans ce second cas, le calculateur refuse en général la régénération en roulant." },
      { question: "Un additif dans le réservoir suffit-il ?", answer: "Sur un filtre légèrement chargé par un usage urbain, un additif peut aider. Sur un voyant allumé depuis plusieurs semaines, non : il faut lire la charge réelle, traiter la cause et nettoyer ou remplacer le filtre." },
      { question: "Combien coûte le diagnostic du FAP ?", answer: "Le diagnostic est une prestation facturée : lecture du calculateur, valeurs réelles, contrôle des capteurs et des causes. Le devis détaillé des travaux qui en découlent est, lui, gratuit et sans engagement. Appelez-nous pour connaître le tarif." },
    ],
    links: [L.fap, L.egr, L.injecteurs, A.nettoyageFap, A.moteur, CONTACT],
  },
  // ───────────────────────────── 2. Nettoyage FAP : prix ─────────────────────────────
  {
    order: 2,
    slug: "conseils/nettoyage-fap-prix",
    heroImage: hero("nettoyage-fap-atelier", "Rangées de catalyseurs et filtres d'échappement usagés posés sur une étagère d'atelier"),
    h1: "Nettoyage FAP : prix, méthodes, et quand il vaut mieux remplacer",
    meta_title: "Nettoyage FAP : prix, méthodes et limites | Garage Perpignan",
    meta_description:
      "Régénération forcée, nettoyage sans dépose ou en machine, remplacement : ce que chaque méthode fait, les prix du marché, et quand nettoyer ne sert à rien.",
    main_keyword: "nettoyage fap",
    secondary_keywords: ["nettoyage fap prix", "prix nettoyage fap", "comment nettoyer un fap", "décrassage fap", "remplacement fap prix"],
    card: { title: "Nettoyage FAP : prix et méthodes", tagline: "Ce que chaque méthode fait, ce qu'elle coûte, quand elle ne sert à rien", description: "Régénération forcée, nettoyage sur le véhicule, nettoyage en machine, remplacement : les quatre réponses à un filtre encrassé, leurs prix de marché et les cas où nettoyer est de l'argent perdu.", badges: [], featured: false },
    intro:
      "« Nettoyage FAP dès 99 € » : vous avez vu la promesse sur les devantures et dans les résultats de recherche. Elle n'est pas fausse, mais elle ne dit pas ce qu'elle recouvre. Il existe quatre réponses à un filtre à particules encrassé, du quart d'heure à l'atelier au remplacement complet, et elles ne traitent pas la même chose.\n\nCet article explique ce que chaque méthode fait réellement, ce qu'elle coûte sur le marché français, et surtout dans quels cas elle est inutile. Les prix sont des ordres de grandeur, pas nos tarifs : chez nous, tout commence par une [lecture du calculateur](/fap-perpignan), suivie d'un devis détaillé et gratuit.",
    sections: [
      {
        title: "Suie ou cendres : la question qui décide de tout",
        content:
          "Un filtre à particules se charge de deux choses très différentes.\n\n**La suie** vient de la combustion. Elle brûle à haute température : c'est ce que fait la régénération, naturelle ou forcée. Un filtre chargé en suie se nettoie.\n\n**Les cendres** viennent de l'huile moteur et des additifs. Elles ne brûlent pas. Elles s'accumulent au fond des canaux du filtre, lentement, pendant des années, et réduisent sa capacité. Un filtre saturé en cendres ne se régénère plus, quelle que soit la méthode : il se nettoie en machine, ou il se remplace.\n\nLe calculateur estime les deux séparément, en grammes. La première chose que nous lisons, c'est ce couple de valeurs. Une charge en suie élevée et des cendres basses, c'est un filtre jeune mal utilisé : régénération ou nettoyage léger. Des cendres proches du seuil constructeur, souvent entre 150 000 et 250 000 km selon les moteurs, c'est un filtre en fin de vie : nettoyer la suie ne rendra pas la capacité perdue.\n\nTout devis qui ne mentionne pas ces deux valeurs est un devis à l'aveugle.",
      },
      {
        title: "Méthode 1 : la régénération forcée à l'atelier",
        content:
          "C'est la première chose que l'on tente quand la charge en suie est au-dessus du seuil de régénération en roulant, mais en dessous du seuil de sécurité. La valise de diagnostic commande au calculateur une régénération à l'arrêt : le moteur monte en régime, la température d'échappement grimpe, les suies brûlent. Elle dure 20 à 40 minutes et se surveille, parce qu'un échappement à 600 °C à l'arrêt ne se laisse pas seul.\n\nCe qu'elle fait : brûler la suie accumulée. Ce qu'elle ne fait pas : enlever les cendres, ni corriger la cause de l'encrassement.\n\nQuand elle est refusée : si la charge dépasse le seuil de sécurité fixé par le constructeur, le calculateur refuse de lancer la régénération, parce que brûler trop de suie d'un coup peut fissurer ou fondre le filtre. Dans ce cas, on passe au nettoyage.\n\nOrdre de grandeur sur le marché : **50 à 150 €**, hors diagnostic. C'est la solution la plus économique, à condition que la lecture préalable confirme qu'elle est possible.",
      },
      {
        title: "Méthode 2 : le nettoyage sans dépose",
        content:
          "Le filtre reste sur le véhicule. Un produit nettoyant est injecté dans le FAP, par la sonde de pression ou par un orifice de l'échappement, laissé agir, puis une régénération forcée brûle les suies décollées. Certains ateliers combinent un additif dans le réservoir et une régénération.\n\nCe qu'il fait : décoller et brûler une charge de suie trop élevée pour une régénération seule, sans démonter. Il est rapide, une heure à deux heures, et c'est souvent lui que couvre la promesse « dès 99 € ».\n\nSes limites, qu'il faut connaître avant de payer :\n\n- Il agit peu, voire pas, sur les **cendres**.\n- Il ne fait rien sur un filtre **colmaté par une huile inadaptée** ou **fissuré**.\n- Son efficacité dépend beaucoup du produit et de l'accès au filtre, qui varie selon les véhicules.\n- Il ne traite **aucune cause** : capteur, vanne EGR, injecteurs, additif.\n\nOrdre de grandeur sur le marché : **100 à 250 €**. Un bon usage : un filtre jeune, bien chargé en suie après des mois de ville, dont on sait que les cendres sont basses.",
        image: wide("nettoyage-fap-echappement", "Sortie d'échappement d'une voiture argentée émettant de la fumée"),
      },
      {
        title: "Méthode 3 : le nettoyage en machine, filtre déposé",
        content:
          "Le filtre est démonté et nettoyé dans une machine dédiée, par passage d'eau ou d'air sous pression et à contre-courant, parfois avec un cycle thermique. Les suies **et les cendres** sont extraites. Le filtre est pesé avant et après, et le résultat est mesuré par la contre-pression ou le débit retrouvé.\n\nC'est la seule méthode de nettoyage qui rend au filtre une capacité proche du neuf. Elle demande en revanche la dépose, c'est-à-dire du temps de main-d'œuvre, parfois des pièces (joints, colliers, sondes grippées) et une immobilisation d'une journée ou deux si le filtre part chez un spécialiste.\n\nOrdre de grandeur sur le marché : **200 à 450 € pour le nettoyage lui-même**, plus la dépose et la repose, qui varient fortement selon l'accessibilité du filtre, de une à quatre heures de main-d'œuvre.\n\nQuand elle est le bon choix : un filtre saturé en cendres, un filtre colmaté qui a refusé la régénération, ou un véhicule que l'on veut garder longtemps. Quand elle ne l'est pas : un filtre fissuré, fondu ou dont le substrat s'est effrité. On le sait au démontage, et parfois dès la lecture : un filtre qui laisse passer la suie a une contre-pression anormalement basse.",
      },
      {
        title: "Méthode 4 : le remplacement, et le piège des pièces bon marché",
        content:
          "Quand le filtre est fissuré, fondu, effrité ou simplement en fin de vie, on remplace. Deux options existent, et l'écart de prix est trompeur.\n\n**La pièce d'origine ou de qualité équivalente** : conçue pour le moteur, avec le bon volume, la bonne porosité et le bon catalyseur intégré. Ordre de grandeur sur le marché : **1 000 à 3 000 €** pose comprise, selon le véhicule.\n\n**Le FAP « adaptable » à bas prix**, parfois sous 400 € : certains sont corrects, beaucoup ont un substrat plus petit ou une porosité différente. Résultat : régénérations plus fréquentes, voyant qui revient, parfois défaut au contrôle technique sur la mesure d'opacité. L'économie à l'achat se paie en passages à l'atelier.\n\nNous posons des pièces d'origine ou de qualité équivalente, pour garder la garantie constructeur quand elle court encore. Et nous ne proposons jamais la suppression du FAP : c'est interdit, cela se voit au contrôle technique, et un moteur conçu avec un FAP ne se porte pas mieux sans.\n\nUne règle simple pour décider entre nettoyage en machine et remplacement : si le filtre est sain et seulement chargé, nettoyer coûte trois à cinq fois moins cher. S'il est endommagé, nettoyer, c'est payer deux fois.",
      },
      {
        title: "Après le nettoyage : ce qui évite de revenir dans six mois",
        content:
          "Un filtre propre dans un moteur qui l'encrasse se rebouche, et le voyant revient : [notre article sur le voyant FAP](/conseils/voyant-fap-allume) explique pourquoi. Ce que l'on vérifie ou conseille après chaque intervention :\n\n- **La cause** : capteur de pression différentielle, [vanne EGR](/vanne-egr-perpignan), [injecteurs](/injecteurs-perpignan), débitmètre, réservoir d'additif. Si une pièce est en défaut, elle est dans le devis, séparément, avec son prix.\n- **L'huile** : une huile « low SAPS » conforme à la norme du constructeur (ACEA C1 à C4 selon les moteurs), vidangée à l'intervalle prévu, parfois plus tôt si le véhicule fait de la ville.\n- **L'usage** : un trajet de 20 à 30 minutes à régime soutenu par semaine suffit, dans la plupart des cas, à laisser les régénérations aboutir.\n- **Les régénérations en cours** : si vous sentez le ralenti monter ou le ventilateur tourner à l'arrêt, ne coupez pas le moteur tout de suite.\n- **Le remplissage de l'additif** sur les véhicules qui en ont, à l'intervalle prévu.\n\nEt si le véhicule ne fait que de la ville, avec des trajets de dix minutes, il faut se poser la question honnêtement : un petit diesel à FAP n'est pas fait pour cet usage, et aucun nettoyage ne changera cela. On le dit quand c'est le cas, même si cela ne nous fait pas vendre d'intervention.",
      },
    ],
    highlights: [
      "Suie ou cendres : la lecture du calculateur décide de la méthode avant tout devis.",
      "Régénération forcée (50-150 €) et nettoyage sans dépose (100-250 €) traitent la suie, pas les cendres.",
      "Le nettoyage en machine, filtre déposé, est le seul qui rende une capacité proche du neuf.",
      "Un FAP adaptable à bas prix se paie souvent en voyants qui reviennent.",
      "Sans traiter la cause et l'huile, le filtre propre se rebouche.",
    ],
    faq: [
      { question: "Combien coûte un nettoyage de FAP ?", answer: "Sur le marché français : 50 à 150 € pour une régénération forcée, 100 à 250 € pour un nettoyage sans dépose, 200 à 450 € pour un nettoyage en machine plus la dépose. Le remplacement par une pièce d'origine se situe entre 1 000 et 3 000 €. Ce sont des ordres de grandeur ; notre devis est détaillé et gratuit après lecture du calculateur." },
      { question: "Nettoyage ou remplacement du FAP : comment choisir ?", answer: "Un filtre sain, seulement chargé en suie ou en cendres, se nettoie, pour trois à cinq fois moins cher qu'un remplacement. Un filtre fissuré, fondu ou effrité se remplace : le nettoyer, c'est payer deux fois. La lecture des charges et de la contre-pression permet de trancher avant de démonter." },
      { question: "Le nettoyage sans dépose est-il efficace ?", answer: "Oui sur un filtre jeune, bien chargé en suie après des mois de trajets urbains. Non sur les cendres, sur un filtre colmaté par une huile inadaptée ou sur un filtre endommagé. Il ne traite aucune cause : si un capteur ou la vanne EGR est en défaut, le voyant revient." },
      { question: "Peut-on nettoyer un FAP soi-même ?", answer: "Les additifs du commerce aident un filtre légèrement chargé et un usage urbain, à condition de rouler ensuite à régime soutenu. Sur un voyant allumé depuis des semaines ou un filtre saturé en cendres, ils ne font rien. Le démontage et le nettoyage en machine demandent un outillage que les particuliers n'ont pas." },
      { question: "Combien de temps dure un FAP ?", answer: "Le seuil de cendres fixé par les constructeurs se situe souvent entre 150 000 et 250 000 km avec une huile adaptée et des trajets qui laissent les régénérations aboutir. En usage urbain, avec une huile classique, il se colmate bien avant. Un nettoyage en machine prolonge sa vie ; un filtre endommagé ne se récupère pas." },
      { question: "Faites-vous la suppression du FAP ?", answer: "Non. C'est interdit, détecté au contrôle technique, et cela annule la garantie. Nous nettoyons ou remplaçons par une pièce d'origine ou de qualité équivalente, et nous traitons la cause de l'encrassement pour que le problème ne revienne pas." },
    ],
    links: [L.fap, L.decalaminage, L.egr, A.voyantFap, A.moteur, CONTACT],
  },
  // ───────────────────────────── 3. Vidange boîte automatique ─────────────────────────────
  {
    order: 3,
    slug: "conseils/vidange-boite-automatique",
    heroImage: hero("boite-auto-selecteur", "Sélecteur de boîte automatique moderne vu de près, dans l'habitacle d'une voiture"),
    h1: "Vidange de boîte automatique : tous les combien, quels symptômes, quel prix",
    meta_title: "Vidange boîte automatique : quand, symptômes et prix",
    meta_description:
      "L'huile « à vie » n'existe pas : l'intervalle réel, les symptômes qui réclament une vidange, vidange simple ou échange complet, et les prix du marché.",
    main_keyword: "vidange boite automatique",
    secondary_keywords: ["vidange boite automatique prix", "vidange boite auto", "vidange boite automatique tous les combien", "huile boite automatique", "entretien boite automatique"],
    card: { title: "Vidange de boîte automatique", tagline: "Tous les combien, quels symptômes, quel prix", description: "Pourquoi l'huile « à vie » ne l'est pas, l'intervalle réel selon le type de boîte, les symptômes qui réclament une vidange, la différence entre vidange simple et échange complet, et les prix du marché.", badges: [], featured: false },
    intro:
      "Beaucoup de carnets d'entretien ne prévoient aucune vidange de la boîte automatique. L'huile serait « à vie ». Dans la pratique, cette vie-là est souvent celle de la garantie, pas celle de la voiture : passé 100 000 km, une boîte jamais vidangée commence à accrocher, à patiner, à chauffer, et une réparation de boîte automatique coûte vingt fois une vidange.\n\nVoici l'intervalle réel selon le type de boîte, les symptômes qui réclament une vidange sans attendre, la différence entre une vidange simple et un échange complet de l'huile, et les prix pratiqués sur le marché. Les chiffres sont des ordres de grandeur ; chez nous, la boîte est lue à la valise avant toute intervention, et le devis est détaillé et gratuit.",
    sections: [
      {
        title: "Pourquoi l'huile de boîte automatique s'use",
        content:
          "Dans une boîte automatique, l'huile ne fait pas que lubrifier. Elle **transmet le couple** dans le convertisseur, elle **pilote les embrayages** internes sous pression, elle **refroidit** l'ensemble et elle **nettoie**, en gardant en suspension les particules d'usure. Quatre rôles, et chacun dégrade l'huile.\n\nAvec le temps et la chaleur, les additifs qui donnent à l'huile ses propriétés de friction s'épuisent. Les passages de rapport deviennent moins nets, les embrayages patinent une fraction de seconde de plus, la température monte, et l'huile se dégrade plus vite encore. Les particules d'usure finissent par encrasser le filtre, les électrovannes et le bloc hydraulique.\n\nC'est pour cela que l'huile de boîte « à vie » est une promesse qui ne tient pas sur la durée. Les constructeurs qui l'affichent précisent souvent, dans les notes de bas de page ou dans les conditions « sévères » (ville, remorquage, chaleur), un intervalle de 60 000 à 100 000 km. Dans les Pyrénées-Orientales, avec les étés que l'on connaît, l'usage « sévère » est la norme.",
      },
      {
        title: "Tous les combien, selon le type de boîte",
        content:
          "Il n'y a pas une boîte automatique, il y en a quatre familles, et elles ne vieillissent pas pareil.\n\n| Type de boîte | Exemples courants | Intervalle raisonnable |\n| --- | --- | --- |\n| Convertisseur classique (hydraulique) | ZF, Aisin, GM sur BMW, Audi, Toyota, Peugeot EAT6/EAT8 | 60 000 à 80 000 km ou 5 ans |\n| Double embrayage à bain d'huile | DSG6 / DQ250 (VW, Audi, Seat, Skoda), PowerShift à bain d'huile | 60 000 km, souvent prescrit par le constructeur |\n| Double embrayage à sec | DSG7 / DQ200, EDC Renault, PowerShift à sec | Huile de boîte 60 000 à 80 000 km ; les embrayages ne baignent pas |\n| CVT (variation continue) | Nissan, Honda, Toyota hybrides, Subaru | 40 000 à 60 000 km |\n\nCes intervalles sont ceux que l'on recommande en pratique, pas une prescription constructeur universelle : consultez votre carnet, et considérez que la ville, la montagne et la chaleur raccourcissent tout. Une boîte qui a dépassé 100 000 km sans jamais avoir été vidangée mérite au minimum une lecture et un contrôle de l'huile, même sans symptôme.\n\nSur les boîtes à double embrayage, le filtre et, selon les modèles, le bloc mécatronique ont leur propre huile : la vidange en tient compte.",
        image: wide("boite-auto-levier", "Levier de vitesses automatique d'une voiture moderne, vu depuis le siège conducteur"),
      },
      {
        title: "Les symptômes qui réclament une vidange sans attendre",
        content:
          "Une boîte automatique prévient avant de casser. Ce que l'on entend le plus souvent au téléphone, et ce que cela indique :\n\n- **Des à-coups au passage des rapports**, surtout à froid ou entre la 1re et la 2e : l'huile a perdu ses propriétés de friction.\n- **Un patinage** : le régime monte, la voiture n'accélère pas en proportion. Les embrayages internes glissent.\n- **Des passages lents ou hésitants**, un temps de réponse entre la pédale et la reprise.\n- **Une montée en température** signalée au tableau de bord, ou une odeur de brûlé après une côte ou un bouchon.\n- **Le mode sécurité** : la boîte reste bloquée sur un rapport, avec un message ou un voyant.\n- **Une huile sombre ou qui sent le brûlé** sur la jauge, pour les boîtes qui en ont encore une.\n\nAttention à une nuance qui compte : une vidange règle les symptômes liés à l'huile. Elle ne répare pas un embrayage usé, un convertisseur fatigué ou une électrovanne en défaut. Si la boîte patine franchement depuis des mois, l'huile neuve ne rendra pas les garnitures perdues. C'est pourquoi nous lisons la boîte à la valise avant de proposer la vidange : si les codes et les valeurs d'adaptation montrent une usure mécanique, on vous le dit avant, pas après.",
      },
      {
        title: "Vidange simple ou échange complet : la différence qui compte",
        content:
          "Une boîte automatique contient en général 7 à 10 litres d'huile. En retirant le bouchon de vidange, on n'en récupère que **40 à 60 %** : le reste est dans le convertisseur, le refroidisseur et les circuits. C'est la limite de la **vidange simple**, dite par gravité : on remplace la moitié de l'huile, on mélange du neuf à de l'usé.\n\nL'**échange dynamique**, ou vidange par machine, branche un appareil sur le circuit de refroidissement de la boîte : l'huile usée est chassée par de l'huile neuve, moteur tournant, jusqu'à ce que l'huile qui ressort soit propre. On renouvelle **90 à 95 %** du volume, filtre et joint de carter changés dans le même temps.\n\nQuand choisir l'une ou l'autre :\n\n- **Vidange simple** : boîte entretenue régulièrement, huile encore claire, intervalle court. Moins chère, suffisante en entretien courant.\n- **Échange complet** : première vidange d'une boîte à plus de 100 000 km, huile sombre, symptômes présents. C'est le seul moyen de repartir sur une huile vraiment neuve.\n\nDans tous les cas, le détail qui change tout : **la bonne huile**. Chaque boîte a une spécification précise (Dexron VI, ATF ZF Lifeguard 6 ou 8, Toyota WS, DSG G 052 182…). Une huile « multi-véhicules » qui n'est pas homologuée pour votre boîte peut créer les à-coups qu'elle est censée guérir. Le niveau, lui, se règle à une température précise de l'huile, lue à la valise, pas à l'œil.",
      },
      {
        title: "Ce que ça coûte sur le marché",
        content:
          "Les prix varient avec le volume d'huile, sa spécification, le type de boîte et la méthode. Les ordres de grandeur observés en France, hors diagnostic :\n\n| Intervention | Fourchette courante (marché) |\n| --- | --- |\n| Vidange simple par gravité, huile et joint | 150 à 300 € |\n| Échange complet par machine, filtre compris | 300 à 600 € |\n| DSG / double embrayage à bain d'huile, kit filtre et huile | 250 à 500 € |\n| Vidange d'huile de mécatronique (selon modèle) | 100 à 250 € en plus |\n| Boîte CVT, huile spécifique | 200 à 400 € |\n\nL'huile pèse lourd dans la facture : certaines spécifications dépassent 20 € le litre, et une boîte en demande huit. C'est aussi pour cela que le « vidange boîte auto à 99 € » cache souvent une vidange partielle avec une huile générique.\n\nPour comparer : une réparation de boîte automatique, selon la panne, se situe entre 1 500 et 5 000 €, et un échange standard au-delà. Une vidange à l'intervalle est l'un des entretiens les plus rentables d'une voiture récente.\n\nChez nous, [la vidange de boîte automatique](/boite-vitesse-perpignan) fait l'objet d'un devis détaillé et gratuit, avec la référence exacte de l'huile et la méthode retenue. Nous utilisons l'huile prescrite par le constructeur ou une équivalente homologuée, jamais une huile générique.",
      },
      {
        title: "Ce que l'on fait au garage avant de vidanger",
        content:
          "Une vidange de boîte automatique ne commence pas par un bouchon, elle commence par une [lecture à la valise](/diagnostic-auto-perpignan).\n\n1. **Lecture à la valise** : codes défaut mémorisés, températures atteintes, valeurs d'adaptation des embrayages, compteur de surchauffes sur les boîtes qui l'enregistrent.\n2. **Essai routier** : à froid puis à chaud, pour caractériser les symptômes, parce qu'un à-coup à froid et un patinage à chaud ne mènent pas au même diagnostic.\n3. **Contrôle de l'huile** quand c'est possible : couleur, odeur, particules métalliques sur le bouchon magnétique.\n4. **Décision et devis** : vidange simple, échange complet, ou, si l'usure est mécanique, un devis de réparation séparé, à vous de décider.\n5. **Après la vidange** : remise à zéro des adaptations si le constructeur le prévoit, essai, contrôle du niveau à température.\n\nLe diagnostic est une prestation facturée ; le devis qui en découle est gratuit. Un véhicule de prêt peut être proposé selon disponibilité pour les interventions longues. Et si le carnet dit « à vie », on vous montre les valeurs lues : c'est elles qui décident, pas la brochure.",
      },
    ],
    highlights: [
      "L'huile de boîte « à vie » ne tient pas passé 100 000 km, surtout en ville et en été.",
      "Convertisseur 60-80 000 km, DSG 60 000 km, CVT 40-60 000 km : des intervalles raisonnables.",
      "À-coups, patinage, passages lents, surchauffe : la boîte prévient avant de casser.",
      "Une vidange simple ne renouvelle que la moitié de l'huile ; l'échange par machine en renouvelle 90 %.",
      "La bonne huile, au bon niveau, à la bonne température : trois détails qui font tout.",
    ],
    faq: [
      { question: "Tous les combien faut-il vidanger une boîte automatique ?", answer: "En pratique tous les 60 000 à 80 000 km ou 5 ans pour une boîte à convertisseur, 60 000 km pour une DSG à bain d'huile, 40 000 à 60 000 km pour une CVT. Ville, montagne et chaleur raccourcissent ces intervalles. Consultez votre carnet, et faites lire la boîte si elle a dépassé 100 000 km sans vidange." },
      { question: "Combien coûte une vidange de boîte automatique ?", answer: "Sur le marché français, 150 à 300 € pour une vidange simple, 300 à 600 € pour un échange complet par machine avec filtre, 250 à 500 € pour un kit DSG. L'huile spécifique pèse lourd dans la facture. Notre devis est détaillé et gratuit, avec la référence exacte de l'huile." },
      { question: "L'huile de boîte automatique est-elle vraiment « à vie » ?", answer: "Non. La mention vise en général la durée de garantie. Les constructeurs eux-mêmes prévoient souvent un intervalle en usage sévère, qui est la norme en ville et dans le Sud. Une boîte jamais vidangée s'use plus vite et se répare beaucoup plus cher." },
      { question: "Une vidange répare-t-elle une boîte qui patine ?", answer: "Si le patinage vient d'une huile dégradée, oui, souvent. S'il vient d'embrayages usés ou d'un convertisseur fatigué, non : l'huile neuve ne rend pas les garnitures perdues. C'est pourquoi nous lisons la boîte à la valise avant de proposer la vidange." },
      { question: "Quelle différence entre vidange simple et échange complet ?", answer: "La vidange par gravité ne récupère que 40 à 60 % de l'huile, le reste restant dans le convertisseur et les circuits. L'échange par machine chasse l'huile usée par de l'huile neuve et en renouvelle 90 à 95 %, filtre compris. Pour une première vidange tardive ou une huile sombre, c'est la bonne méthode." },
      { question: "Peut-on mettre n'importe quelle huile de boîte automatique ?", answer: "Non. Chaque boîte a une spécification précise, et une huile non homologuée peut provoquer des à-coups ou du patinage. Nous utilisons l'huile prescrite par le constructeur ou une équivalente homologuée, et nous réglons le niveau à la température indiquée, lue à la valise." },
    ],
    links: [L.boite, L.entretien, L.diag, A.moteur, CONTACT],
  },
  // ───────────────────────────── 4. Voyant AdBlue ─────────────────────────────
  {
    order: 4,
    slug: "conseils/voyant-adblue-allume",
    heroImage: hero("adblue-trappe", "Trappe à carburant ouverte avec le bouchon et l'étiquette d'avertissement visibles"),
    h1: "Voyant AdBlue allumé : niveau bas, compte à rebours ou panne, et ce que ça coûte",
    meta_title: "Voyant AdBlue allumé : que faire, panne et prix",
    meta_description:
      "Niveau bas, compte à rebours, défaut système : les trois messages AdBlue, ce que vous pouvez faire seul, les pannes fréquentes et les prix du marché.",
    main_keyword: "voyant adblue",
    secondary_keywords: ["adblue c'est quoi", "problème adblue", "panne adblue", "défaut adblue", "adblue cristallisé", "injecteur adblue"],
    card: { title: "Voyant AdBlue allumé : que faire", tagline: "Niveau bas, compte à rebours ou défaut : trois cas, trois réponses", description: "Ce qu'est l'AdBlue, les trois messages que le tableau de bord peut afficher, ce que vous pouvez faire seul, les pannes fréquentes du système SCR et les prix du marché.", badges: [], featured: false },
    intro:
      "Le voyant AdBlue fait peur parce qu'il s'accompagne souvent d'un compte à rebours : « Démarrage impossible dans 800 km ». Pourtant, dans la majorité des cas, il demande simplement un plein de liquide. Dans les autres, il signale une panne du système de dépollution, et là il faut savoir distinguer ce qui se règle en dix minutes de ce qui demande un diagnostic.\n\nVoici ce qu'est l'AdBlue, les trois messages que votre tableau de bord peut afficher, ce que vous pouvez faire vous-même, les pannes que l'on rencontre le plus et les ordres de grandeur de prix. Les chiffres sont ceux du marché ; chez nous, le système est lu à la valise avant toute intervention, et le devis est détaillé et gratuit.",
    sections: [
      {
        title: "L'AdBlue, c'est quoi, et pourquoi la voiture refuse de démarrer sans",
        content:
          "L'AdBlue est une solution d'urée à 32,5 % dans de l'eau déminéralisée. Elle est injectée dans l'échappement, en amont d'un catalyseur appelé **SCR**, où elle se transforme en ammoniac et réduit les oxydes d'azote (NOx) en azote et en eau. C'est le dispositif qui permet aux diesels récents, depuis la norme Euro 6, de respecter les limites d'émissions.\n\nCe n'est ni un carburant, ni un additif du gasoil. Il a **son propre réservoir**, de 10 à 25 litres selon les véhicules, et **sa propre trappe**, en général à côté du bouchon de carburant, parfois dans le coffre ou sous le capot. La consommation est de l'ordre de 1 litre pour 600 à 1 000 km : un plein dure plusieurs mois.\n\nLa réglementation impose au constructeur de garantir que le système fonctionne. C'est pour cela que, réservoir vide ou système en défaut non traité, le calculateur **interdit le redémarrage** du moteur après un compte à rebours. Il ne coupe jamais le moteur en roulant : vous finissez votre trajet, mais une fois le contact coupé, il faut avoir réglé le problème. C'est ce compte à rebours que le voyant annonce.",
      },
      {
        title: "Les trois messages, et ce que chacun demande",
        content:
          "Le tableau de bord ne dit pas « AdBlue » tout court. Il affiche l'un de trois messages, et la réponse n'est pas la même.\n\n1. **« Niveau AdBlue bas, autonomie X km »**. Le réservoir arrive à sa réserve, le calculateur annonce la distance restante, souvent 2 400 km puis des paliers. Réponse : faire le plein d'AdBlue, vous-même ou chez nous. Rien d'autre.\n2. **« Démarrage impossible dans X km »**, avec ou sans voyant moteur. Soit le réservoir est presque vide et l'autonomie descend, soit le système a détecté un défaut et lance le compte à rebours réglementaire, souvent 1 000 km ou moins. Réponse : si le niveau est bas, remplir ; si le message persiste après un plein, lire le défaut sans attendre la fin du compte à rebours.\n3. **« Défaut antipollution » ou « Défaut système AdBlue »**, [voyant moteur](/conseils/voyant-moteur-orange) allumé, parfois mode dégradé. Le système ne mesure plus, ne chauffe plus ou n'injecte plus correctement. Réponse : [diagnostic à la valise](/diagnostic-auto-perpignan). Un plein ne changera rien.\n\nUne précision qui évite des rendez-vous inutiles : après un plein, le message de niveau bas peut mettre quelques kilomètres, voire un cycle de contact, à disparaître. Si au bout de 50 km il est toujours là, ou s'il est revenu, ce n'est plus une question de niveau.",
        image: wide("adblue-remplissage-atelier", "Mécanicien en tenue bleue versant un liquide dans un réservoir sous le capot, dans un atelier"),
      },
      {
        title: "Faire le plein soi-même : les règles qui évitent la panne",
        content:
          "Le plein d'AdBlue est à la portée de tous, mais le liquide est capricieux, et un plein raté crée exactement les pannes du paragraphe suivant.\n\n- **Ne jamais mettre d'AdBlue dans le réservoir de gasoil**, ni de gasoil dans le réservoir d'AdBlue. Dans le premier cas, le système d'injection diesel est en danger ; dans le second, le système SCR. Les bouchons sont bleus et le goulot de l'AdBlue est plus étroit, mais l'erreur arrive.\n- **Utiliser un produit conforme à la norme ISO 22241**, en bidon scellé ou à la pompe dédiée des stations. Un AdBlue douteux, trop vieux ou dilué cristallise et bouche l'injecteur.\n- **Remplir de 5 litres au minimum** : en dessous, beaucoup de calculateurs ne détectent pas le plein et laissent le message affiché.\n- **Ne pas faire déborder** sur la carrosserie ou les plastiques : l'urée est corrosive en séchant et laisse des traces blanches. Rincer à l'eau si cela arrive.\n- **Stocker à l'abri** : un bidon entamé, exposé à la chaleur ou au gel, se dégrade en quelques mois.\n\nLe prix du liquide est faible : de l'ordre de 1 à 2 € le litre à la pompe, un peu plus en bidon. Si vous préférez, nous faisons le plein pendant un entretien ou sur simple passage.",
      },
      {
        title: "Le voyant reste allumé après le plein : les pannes fréquentes",
        content:
          "Quand le niveau n'est pas en cause, le système SCR a une demi-douzaine de points faibles, et ils ne se valent pas en prix.\n\n- **L'AdBlue cristallisé dans l'injecteur** ou sur la tuyauterie : le liquide a séché et formé des cristaux blancs. Cause classique après des trajets courts ou un produit de mauvaise qualité. Nettoyage ou remplacement de l'injecteur.\n- **Le capteur de niveau ou de qualité** dans le réservoir, qui ne voit plus le plein ou déclare un liquide non conforme.\n- **Le réchauffeur du réservoir**, parce que l'AdBlue gèle à -11 °C et doit être réchauffé en hiver. Son défaut déclenche souvent le compte à rebours, même ici où il gèle peu.\n- **La pompe** du module de réservoir, qui n'envoie plus la pression attendue.\n- **Le capteur NOx**, en amont ou en aval du catalyseur SCR, qui mesure si le traitement fonctionne. C'est la panne la plus fréquente après 100 000 km, et l'une des plus chères.\n- **Le catalyseur SCR lui-même**, rarement, quand il est encrassé ou endommagé.\n\nSur beaucoup de véhicules, le réservoir, la pompe, le réchauffeur et le capteur de niveau forment **un seul module**, et le constructeur ne le vend qu'entier. C'est ce qui explique certains devis élevés pour « un capteur ». Nous cherchons d'abord si une pièce seule existe, en origine ou en qualité équivalente, avant de proposer le module complet.",
      },
      {
        title: "Le compte à rebours : ce qui se passe à zéro, et comment le gérer",
        content:
          "Le compte à rebours est réglementaire, et il n'est pas négociable : à zéro, le moteur ne redémarre plus après coupure du contact, jusqu'à ce que le défaut soit corrigé et validé par le calculateur. Quelques points pour le traverser sans panique :\n\n- **Il ne coupe jamais le moteur en marche.** Vous arrivez toujours à destination. Le risque est d'être bloqué au prochain redémarrage.\n- **Il ne se remet pas à zéro par un plein** si la cause est un défaut système. Il faut la réparation, puis l'effacement du défaut et parfois un cycle de validation en roulant.\n- **Il descend vite** : 1 000 km, c'est deux semaines de trajets quotidiens. Appelez dès le premier message, pas au dernier.\n- **Il ne se contourne pas légalement.** Les boîtiers et reprogrammations qui « suppriment l'AdBlue » existent ; ils sont interdits, détectés au contrôle technique, et ils annulent la garantie. Nous n'en posons pas.\n\nSi vous êtes à quelques dizaines de kilomètres de zéro, venez sans rendez-vous : [notre prestation AdBlue à Perpignan](/adblue-perpignan) prend les urgences. Le diagnostic lit le défaut et sa cause ; le devis détaillé, gratuit, vous dit ce que coûte la remise en conformité avant que vous décidiez.",
      },
      {
        title: "Ce que ça coûte sur le marché",
        content:
          "Les prix dépendent beaucoup du véhicule et de ce que le constructeur vend séparément. Les ordres de grandeur observés en France, pièce et pose, hors diagnostic :\n\n| Intervention | Fourchette courante (marché) |\n| --- | --- |\n| Plein d'AdBlue (10 à 20 L) | 15 à 40 € de liquide |\n| Nettoyage ou remplacement de l'injecteur AdBlue | 150 à 500 € |\n| Capteur NOx | 300 à 800 € |\n| Réchauffeur ou capteur de niveau (pièce seule, si disponible) | 200 à 500 € |\n| Module de réservoir complet (pompe, réchauffeur, capteurs) | 800 à 2 000 € |\n| Catalyseur SCR | 1 000 à 2 500 € |\n\nUn conseil qui vaut de l'argent : avant d'accepter un module complet, demandez si la pièce défaillante existe seule. Et avant toute pièce, demandez la lecture des valeurs : un injecteur cristallisé se nettoie parfois, un capteur NOx déclaré en défaut peut l'être à cause d'un faisceau ou d'un connecteur.\n\nChez nous, le diagnostic est facturé et le devis est gratuit, avec les pièces d'origine ou de qualité équivalente pour préserver la garantie quand elle court encore.",
      },
    ],
    highlights: [
      "L'AdBlue a son réservoir et sa trappe : ce n'est ni un carburant, ni un additif du gasoil.",
      "Trois messages : niveau bas (remplir), compte à rebours (remplir ou lire), défaut système (diagnostic).",
      "Le compte à rebours ne coupe jamais le moteur en marche, mais interdit le redémarrage à zéro.",
      "Cristallisation, capteur NOx, réchauffeur, pompe : les pannes fréquentes ne se valent pas en prix.",
      "Supprimer l'AdBlue est interdit, détecté au contrôle technique, et annule la garantie.",
    ],
    faq: [
      { question: "Peut-on rouler avec le voyant AdBlue allumé ?", answer: "Oui, jusqu'à la fin du compte à rebours affiché : le moteur ne se coupe jamais en roulant. À zéro, il ne redémarrera plus après coupure du contact. Si le message est un niveau bas, faites le plein ; s'il persiste après le plein, faites lire le système sans attendre la fin du décompte." },
      { question: "Le voyant AdBlue reste allumé après le plein : pourquoi ?", answer: "Soit le plein était trop petit pour être détecté (il faut souvent 5 litres au minimum), soit le message a besoin de quelques kilomètres ou d'un cycle de contact, soit le système est en défaut : capteur de niveau, réchauffeur, pompe, injecteur cristallisé. Au-delà de 50 km, c'est un diagnostic." },
      { question: "Que se passe-t-il si on met de l'AdBlue dans le gasoil ?", answer: "Ne démarrez pas le moteur. L'urée endommage le système d'injection diesel. Le réservoir doit être vidangé et le circuit rincé avant tout démarrage. Appelez-nous, c'est une urgence que nous prenons sans rendez-vous." },
      { question: "L'AdBlue peut-il geler ou se dégrader ?", answer: "Il gèle à -11 °C, c'est pourquoi le réservoir a un réchauffeur. Il se dégrade à la chaleur et avec le temps : un bidon entamé depuis des mois ou stocké en plein soleil peut cristalliser dans le système. Utilisez un produit conforme ISO 22241, en bidon scellé ou à la pompe." },
      { question: "Combien coûte une réparation du système AdBlue ?", answer: "Sur le marché français, de 150 à 500 € pour un injecteur, 300 à 800 € pour un capteur NOx, et 800 à 2 000 € pour un module de réservoir complet quand le constructeur ne vend pas la pièce seule. Notre devis est détaillé et gratuit après lecture du système." },
      { question: "Peut-on supprimer l'AdBlue par reprogrammation ?", answer: "Non. C'est interdit, détecté au contrôle technique, et cela annule la garantie. Nous remettons le système en conformité avec des pièces d'origine ou de qualité équivalente, et nous cherchons d'abord la pièce seule avant de proposer un module complet." },
    ],
    links: [L.adblue, L.diag, L.fap, A.voyantFap, A.moteur, CONTACT],
  },
  // ───────────────────────────── 5. Voyant moteur orange ─────────────────────────────
  {
    order: 5,
    slug: "conseils/voyant-moteur-orange",
    heroImage: hero("voyant-moteur-compteur", "Compteur de voiture avec plusieurs témoins d'avertissement allumés"),
    h1: "Voyant moteur orange allumé : peut-on rouler, que faire, et pourquoi ne pas l'effacer soi-même",
    meta_title: "Voyant moteur orange allumé : rouler ou pas, que faire",
    meta_description:
      "Fixe ou clignotant, avec ou sans perte de puissance : ce que le voyant moteur signale, les causes fréquentes, quand s'arrêter, et s'il faut l'effacer.",
    main_keyword: "voyant moteur orange",
    secondary_keywords: ["voyant orange moteur", "voyant moteur allumé", "voyant moteur allumé que faire", "diagnostic voiture prix", "voyant moteur clignote"],
    card: { title: "Voyant moteur orange : peut-on rouler ?", tagline: "Fixe ou clignotant, les causes fréquentes, et quand s'arrêter", description: "Le voyant moteur signale un défaut enregistré, pas une panne précise. Fixe ou clignotant, avec ou sans symptôme : comment décider si vous pouvez rouler, les causes les plus courantes, et pourquoi ne pas l'effacer soi-même.", badges: [], featured: false },
    intro:
      "Un petit moteur orange s'allume au tableau de bord, la voiture roule normalement, et la question arrive tout de suite : est-ce grave ? La réponse honnête : on ne sait pas encore, et c'est précisément ce que le voyant dit. Il ne nomme pas une panne, il signale que le calculateur a enregistré un défaut, le plus souvent sur une pièce qui touche aux émissions.\n\nVoici comment lire ce voyant selon qu'il est fixe ou clignotant, seul ou accompagné de symptômes, les causes que l'on rencontre le plus à l'atelier, les cas où il faut s'arrêter, et pourquoi l'effacer avec une valise achetée en ligne fait perdre du temps et de l'argent. Les prix cités sont ceux du marché ; chez nous, le diagnostic est une prestation facturée, et le devis des réparations est gratuit.",
    sections: [
      {
        title: "Ce que signale le voyant moteur, et ce qu'il ne dit pas",
        content:
          "Le voyant moteur, appelé MIL dans le jargon (« malfunction indicator lamp »), s'allume quand le calculateur du moteur détecte une valeur hors tolérance et l'enregistre sous forme de **code défaut**. Depuis les normes antipollution OBD, il est surtout chargé de surveiller tout ce qui influence les émissions : combustion, sondes, catalyseur, EGR, FAP, turbo, injection.\n\nTrois choses qu'il ne dit pas :\n\n- **Quelle pièce est en cause.** Un code « mélange trop pauvre » peut venir d'un débitmètre, d'une prise d'air, d'une sonde lambda ou d'un injecteur. Le code est un point de départ, pas un verdict.\n- **Si c'est grave.** Un bouchon de réservoir mal serré et un catalyseur en fin de vie allument le même voyant.\n- **Si ça va passer.** Certains défauts sont intermittents : le voyant s'éteint après quelques cycles de contact sans que le défaut ait disparu de la mémoire.\n\nÀ distinguer absolument des **voyants rouges** : pression d'huile, température, batterie, freins. Ceux-là demandent de s'arrêter dès que possible, moteur coupé. L'orange dit « à vérifier », le rouge dit « maintenant ».",
      },
      {
        title: "Fixe ou clignotant : la seule règle à retenir",
        content:
          "Un voyant moteur a deux états, et ils n'appellent pas la même réaction.\n\n**Fixe**, c'est le cas le plus fréquent. Un défaut est enregistré, le moteur fonctionne, parfois en mode dégradé. Vous pouvez rouler prudemment jusqu'au garage, en évitant les longs trajets et les fortes charges si vous sentez une perte de puissance.\n\n**Clignotant**, c'est différent. Sur la quasi-totalité des véhicules, il signale des **ratés d'allumage ou de combustion** en cours : un cylindre ne brûle pas correctement, et le carburant imbrûlé part dans l'échappement, où il peut **détruire le catalyseur** en quelques dizaines de kilomètres par surchauffe. Dans ce cas : réduire immédiatement la charge, s'arrêter dès que possible en sécurité, et ne pas reprendre la route sans diagnostic. Un catalyseur se chiffre en centaines, parfois en milliers d'euros ; une bobine ou une bougie, en dizaines.\n\nLes symptômes à prendre au sérieux, même avec un voyant fixe : ralenti irrégulier, secousses, perte franche de puissance, fumée, odeur d'essence ou de gasoil, bruit anormal, température qui monte. Avec l'un de ces signes, on ne « finit pas la semaine », on appelle.",
        image: wide("voyant-moteur-compte-tours", "Compte-tours de voiture avec un témoin d'avertissement allumé"),
      },
      {
        title: "Les causes que l'on rencontre le plus",
        content:
          "Sans valise, impossible de dire laquelle ; avec, on sait vite où chercher. Les causes les plus fréquentes à l'atelier, à peu près dans l'ordre :\n\n1. **Un bouchon de réservoir** mal fermé ou dont le joint est usé, surtout sur les essences : le système détecte une fuite de vapeurs. Le cas le moins cher, et pourtant fréquent.\n2. **Une sonde lambda** fatiguée, qui mesure mal l'oxygène dans l'échappement : surconsommation, mélange faussé.\n3. **Une bobine, une bougie ou un câble d'allumage** sur les essences : voyant souvent clignotant, à-coups, ralenti irrégulier.\n4. **Un débitmètre d'air** encrassé ou en défaut : perte de puissance, à-coups, mode dégradé.\n5. **La vanne EGR** encrassée ou bloquée, très courante sur diesel : ralenti instable, fumée, perte de puissance, voir [nettoyage ou remplacement de la vanne EGR](/vanne-egr-perpignan).\n6. **Le filtre à particules** chargé, avec ou sans son propre voyant, voir [voyant FAP allumé : que faire](/conseils/voyant-fap-allume).\n7. **Un capteur de pression de suralimentation** ou une fuite sur le circuit du turbo : mode dégradé, manque de puissance franche.\n8. **Des injecteurs** fatigués : démarrage difficile, fumée, claquement.\n9. **Le catalyseur** en fin de vie : perte de rendement mesurée par les sondes, parfois après des mois de ratés ignorés.\n10. **Un faisceau ou un connecteur** oxydé, qui fait apparaître un défaut sur une pièce parfaitement saine.\n\nLe dernier point explique pourquoi un bon diagnostic ne se contente pas du code : il vérifie les valeurs réelles, le faisceau et le contexte dans lequel le défaut a été enregistré avant de nommer une pièce.",
      },
      {
        title: "Peut-on rouler ? Les quatre situations",
        content:
          "Pour décider sans se tromper, croisez l'état du voyant et ce que vous ressentez.\n\n| Situation | Ce que vous pouvez faire |\n| --- | --- |\n| Voyant fixe, aucun symptôme | Rouler normalement, prendre rendez-vous dans la semaine, éviter les longs trajets d'ici là |\n| Voyant fixe, perte de puissance ou mode dégradé | Rouler doucement jusqu'au garage, sans autoroute ni charge lourde |\n| Voyant fixe + autre voyant (FAP, AdBlue, préchauffage) | Lire le message associé : il précise souvent le système en cause |\n| Voyant clignotant, ou secousses, fumée, bruit, odeur | S'arrêter dès que possible, ne pas reprendre la route sans diagnostic |\n\nDeux gestes utiles avant d'appeler, qui ne remplacent pas le diagnostic mais aident :\n\n- **Vérifier le bouchon de réservoir**, le resserrer. Sur une essence, c'est une cause classique, et le voyant peut s'éteindre après quelques trajets.\n- **Noter le contexte** : à quel moment le voyant s'est allumé (démarrage à froid, après le plein, en côte, sous la pluie), si un symptôme l'accompagne, si c'est la première fois. Ces détails valent souvent plus qu'un code.\n\nEt une chose à ne pas faire : continuer des semaines « parce que ça roule ». Un défaut d'allumage ignoré finit en catalyseur, un débitmètre ignoré finit en encrassement, un FAP ignoré finit en remplacement.",
      },
      {
        title: "Pourquoi effacer le voyant soi-même est une mauvaise idée",
        content:
          "Les valises de lecture à 20 € et les applications sur téléphone lisent les codes et proposent un bouton « effacer ». La tentation est grande. Trois raisons de ne pas appuyer dessus :\n\n- **Le voyant reviendra.** Effacer un code n'efface pas la cause. Le calculateur refera la mesure, trouvera la même valeur hors tolérance, et rallumera le voyant, souvent après quelques cycles de conduite.\n- **Vous perdez les données qui servent au diagnostic.** Avec le code, le calculateur enregistre un instantané des conditions au moment du défaut : régime, température, charge, vitesse. Ces données, dites « freeze frame », permettent de reproduire et de localiser la panne. Effacées, le technicien repart de zéro et le diagnostic coûte plus cher.\n- **Vous masquez un défaut au contrôle technique, sans le faire passer.** Depuis le durcissement du contrôle, un voyant moteur allumé est une défaillance majeure, donc une contre-visite. Mais un calculateur fraîchement effacé a aussi ses « moniteurs » de surveillance non prêts, ce que le contrôleur lit et sanctionne de la même manière. Effacer la veille ne sert à rien.\n\nLire les codes avec une petite valise pour savoir de quoi il s'agit, oui, c'est utile. Les effacer, non. Et une lecture ne vaut pas un diagnostic : le code dit où le calculateur a vu un problème, pas ce qui le provoque.",
      },
      {
        title: "Au garage : ce qu'est un vrai diagnostic, et ce qu'il coûte",
        content:
          "Un [diagnostic électronique](/diagnostic-auto-perpignan) ne se résume pas à brancher une valise. Ce que l'on fait, dans l'ordre :\n\n1. **Lecture complète** : codes actuels et mémorisés, sur tous les calculateurs, avec les instantanés enregistrés.\n2. **Valeurs réelles** : sondes, pressions, températures, débits, corrections de mélange, lus moteur tournant et comparés aux valeurs attendues.\n3. **Contrôles physiques** selon le code : faisceau, connecteurs, prises d'air, fumée, test d'actionneurs.\n4. **Interprétation** : la pièce en cause, ou la liste courte des pièces possibles, avec ce qu'il faut pour trancher.\n5. **Devis détaillé, gratuit**, pièce par pièce, avant tout travail. Aucune intervention sans votre accord.\n\nLe diagnostic est une prestation facturée : c'est du temps de technicien et un outillage constructeur, et c'est ce qui évite de remplacer trois pièces pour en trouver une. Sur le marché français, une lecture simple se situe entre 40 et 100 €, un diagnostic complet avec recherche entre 80 et 150 €, davantage sur une panne intermittente.\n\nSi le voyant clignote, venez sans rendez-vous : nous prenons les urgences. Pour les autres cas, un appel suffit pour fixer un créneau, et un véhicule de prêt peut être proposé selon disponibilité si l'intervention est longue.",
      },
    ],
    highlights: [
      "Le voyant moteur signale un défaut enregistré, pas une panne nommée : le code est un point de départ.",
      "Fixe : rouler prudemment jusqu'au garage. Clignotant : s'arrêter, le catalyseur est en jeu.",
      "Bouchon de réservoir, sonde lambda, allumage, débitmètre, EGR : les causes les plus fréquentes.",
      "Effacer le voyant soi-même fait perdre les données du défaut et ne passe pas le contrôle technique.",
      "Le diagnostic est facturé ; le devis des réparations est gratuit, pièce par pièce.",
    ],
    faq: [
      { question: "Peut-on rouler avec le voyant moteur orange allumé ?", answer: "S'il est fixe et sans symptôme, oui, prudemment, le temps de prendre rendez-vous dans la semaine. S'il clignote, ou s'il s'accompagne de secousses, de fumée ou d'une perte franche de puissance, non : arrêtez-vous dès que possible, le catalyseur peut être détruit en quelques dizaines de kilomètres." },
      { question: "Pourquoi le voyant moteur s'allume-t-il ?", answer: "Parce que le calculateur a enregistré une valeur hors tolérance, le plus souvent sur une pièce liée aux émissions : bouchon de réservoir, sonde lambda, allumage, débitmètre, vanne EGR, FAP, pression de turbo, injecteurs, catalyseur. Seule la lecture des codes et des valeurs réelles dit laquelle." },
      { question: "Le voyant moteur peut-il s'éteindre tout seul ?", answer: "Oui, si le défaut était intermittent ou corrigé, par exemple un bouchon de réservoir resserré. Le code reste en mémoire plusieurs cycles. Si le voyant revient régulièrement, la cause n'est pas réglée." },
      { question: "Combien coûte un diagnostic électronique ?", answer: "Sur le marché français, entre 40 et 100 € pour une lecture simple et 80 à 150 € pour un diagnostic complet avec recherche de panne, davantage sur un défaut intermittent. Chez nous, le diagnostic est facturé et le devis des réparations est gratuit. Appelez-nous pour le tarif." },
      { question: "Le voyant moteur fait-il échouer le contrôle technique ?", answer: "Oui. Un voyant moteur allumé est une défaillance majeure, donc une contre-visite. L'effacer juste avant ne sert à rien : les moniteurs du calculateur ne sont pas prêts, et le contrôleur le voit. Il faut réparer la cause, puis rouler assez pour que le système se valide." },
      { question: "Que faire si le voyant moteur clignote ?", answer: "Réduire la charge immédiatement, vous arrêter dès que possible en sécurité et ne pas reprendre la route sans diagnostic. Le clignotement signale des ratés de combustion qui envoient du carburant imbrûlé dans le catalyseur. Venez sans rendez-vous, nous prenons les urgences." },
    ],
    links: [L.diag, L.egr, L.injecteurs, L.turbo, A.voyantFap, A.adblue, CONTACT],
  },
  // ───────────────────────────── 6. Recharge clim ─────────────────────────────
  {
    order: 6,
    slug: "conseils/recharge-clim-voiture-prix",
    heroImage: hero("clim-aerateurs", "Aérateurs et commandes de climatisation sur le tableau de bord d'une voiture"),
    h1: "Recharge de clim voiture : prix, quand la faire, et pourquoi elle ne refroidit plus",
    meta_title: "Recharge clim voiture : prix, quand et fuite ou recharge",
    meta_description:
      "Clim qui souffle tiède : recharge ou fuite ? Les symptômes, tous les combien recharger, R134a ou R1234yf, et les prix du marché.",
    main_keyword: "recharge clim voiture",
    secondary_keywords: ["recharge clim voiture prix", "recharge clim auto", "clim voiture ne fait plus de froid", "entretien clim voiture", "recharge clim tous les combien"],
    card: { title: "Recharge de clim : prix et quand la faire", tagline: "Souffle tiède : recharge ou fuite ?", description: "Comment fonctionne la clim, les symptômes d'un circuit qui faiblit, la différence entre une recharge d'entretien et une fuite à chercher, tous les combien recharger, R134a ou R1234yf, et les prix du marché.", badges: [], featured: false },
    intro:
      "La clim souffle tiède, l'été arrive, et la première idée est « une recharge ». Parfois c'est la bonne. Parfois c'est jeter 100 € dans un circuit qui fuit, et qui sera vide à nouveau en août. La différence tient à une question simple : où est passé le gaz ?\n\nVoici comment fonctionne une climatisation de voiture, les symptômes qui disent qu'elle faiblit, quand une recharge suffit et quand il faut chercher une fuite, à quel rythme entretenir le circuit, ce que change le passage du gaz R134a au R1234yf, et les prix pratiqués sur le marché. Les chiffres sont des ordres de grandeur ; chez nous, le circuit est contrôlé avant toute recharge, et le devis est détaillé et gratuit.",
    sections: [
      {
        title: "Comment fonctionne la clim, et pourquoi elle perd du gaz",
        content:
          "Une climatisation est un circuit fermé dans lequel un gaz frigorigène change d'état en boucle. Le **compresseur**, entraîné par le moteur, le comprime ; le **condenseur**, devant le radiateur, le refroidit et le liquéfie ; le **détendeur** le fait brutalement chuter en pression ; l'**évaporateur**, derrière le tableau de bord, absorbe la chaleur de l'air de l'habitacle en le vaporisant. L'air ressort froid et déshumidifié, ce qui explique le filet d'eau sous la voiture à l'arrêt et le désembuage plus rapide.\n\nLe circuit est étanche, mais pas parfaitement : les joints, les raccords et le compresseur laissent passer une petite quantité de gaz, de l'ordre de **10 à 15 % par an**. C'est normal. Au bout de deux ou trois ans, la quantité manquante devient sensible : la clim refroidit moins, le compresseur travaille plus, et l'huile qui circule avec le gaz lubrifie moins bien. D'où l'entretien périodique.\n\nCe qui n'est pas normal : un circuit vide ou presque en moins d'un an. Là, il y a une fuite, et la recharge seule ne la règle pas.",
      },
      {
        title: "Les symptômes d'une clim qui faiblit",
        content:
          "Une climatisation prévient avant de s'arrêter. Les signes, du plus bénin au plus sérieux :\n\n- **Un air moins froid qu'avant**, surtout à l'arrêt et en plein soleil, alors que ça fonctionne encore sur route. Le circuit manque un peu de gaz.\n- **Un froid intermittent** : la clim coupe puis repart. Souvent un circuit trop bas, parfois un pressostat ou un capteur.\n- **Une mauvaise odeur** au démarrage de la ventilation : des bactéries et moisissures sur l'évaporateur, humide et sombre. Ce n'est pas le gaz, c'est l'hygiène du circuit d'air, et cela se traite par une désinfection et un filtre d'habitacle neuf.\n- **Un bruit au compresseur** quand la clim s'enclenche : grincement, claquement, sifflement. Manque d'huile, embrayage de compresseur fatigué ou compresseur en fin de vie.\n- **Un compresseur qui ne s'enclenche plus du tout** : circuit vide (la sécurité interdit le démarrage sans gaz), fusible, relais, ou compresseur bloqué.\n- **Des vitres qui s'embuent** et ne se désembuent plus : la clim ne déshumidifie plus, parce qu'elle ne refroidit plus.\n\nUne clim qui a baissé progressivement sur trois ans est un entretien. Une clim qui est passée de froide à tiède en un été est une fuite ou une panne.",
        image: wide("clim-commandes", "Panneau de commande de la climatisation d'une voiture, avec les réglages de température"),
      },
      {
        title: "Recharge ou fuite : la question avant de payer",
        content:
          "Une recharge sur un circuit qui fuit, c'est du gaz qui repart dans l'atmosphère et de l'argent perdu. C'est aussi, pour le R134a comme pour le R1234yf, une pratique que la réglementation sur les gaz fluorés interdit : un professionnel doit contrôler l'étanchéité avant de recharger.\n\nComment on sait :\n\n- **La quantité récupérée.** Avant de recharger, la station récupère le gaz restant et le pèse. Un circuit qui contenait 500 g et en rend 350 après trois ans, c'est une perte normale. Un circuit qui en rend 50 après un an, c'est une fuite.\n- **Le tirage au vide.** Le circuit est mis sous vide et on observe s'il tient. Un vide qui remonte signale une fuite importante.\n- **Le traceur UV.** Un colorant est ajouté au gaz ; à la lampe UV, la fuite apparaît sur le raccord, le condenseur ou le compresseur. C'est la méthode la plus fiable pour les petites fuites.\n- **L'azote** sous pression, parfois, pour localiser une fuite lente.\n\nLes points de fuite fréquents : le **condenseur**, exposé aux gravillons devant le radiateur ; les **joints** des raccords, qui sèchent quand la clim ne tourne pas l'hiver ; le **joint d'arbre du compresseur** ; et, plus rarement, l'évaporateur, difficile d'accès.\n\nUne recharge qui se fait sans récupération ni contrôle d'étanchéité n'est pas une recharge, c'est un remplissage. On vous dira ce que le circuit contenait avant de vous proposer quoi que ce soit.",
      },
      {
        title: "Quand faire la recharge, et comment faire durer la clim",
        content:
          "Le bon rythme, en usage courant : **un contrôle et une recharge tous les deux ans**, avant l'été, idéalement au printemps quand les ateliers ne sont pas encore débordés. Sur un véhicule qui roule beaucoup en ville ou qui a plus de dix ans, tous les ans ne fait pas de mal.\n\nEt entre deux recharges, les gestes qui prolongent la vie du circuit :\n\n- **Faire tourner la clim toute l'année**, y compris l'hiver, une dizaine de minutes par semaine. Le gaz transporte l'huile ; un compresseur qui ne tourne pas six mois voit ses joints sécher, et c'est la première cause de fuite au printemps.\n- **Changer le filtre d'habitacle chaque année**, ou à chaque [révision](/entretien-voiture-perpignan). Un filtre colmaté réduit le débit d'air et donne l'impression que la clim ne refroidit pas.\n- **Couper la clim quelques minutes avant d'arriver**, en laissant la ventilation : l'évaporateur sèche, les odeurs ne s'installent pas.\n- **Ne pas rouler vitres ouvertes avec la clim** : le compresseur travaille pour rien.\n- **Ne pas la mettre au plus froid dès le départ** en plein été : ventiler l'habitacle une minute, puis enclencher.\n\nLes kits de recharge en bombe vendus en magasin ? Ils ajoutent du gaz sans récupérer ni contrôler, sans mesurer la quantité, parfois avec un produit « anti-fuite » qui colmate aussi le détendeur. Sur un circuit sain, c'est inutile ; sur un circuit qui fuit, c'est reculer pour mieux payer.",
      },
      {
        title: "R134a ou R1234yf : ce que change le gaz",
        content:
          "Deux gaz coexistent, et le vôtre dépend de l'année de votre voiture.\n\n**Le R134a** équipe la plupart des véhicules jusqu'en 2016 environ. Il est peu coûteux, mais son effet de serre élevé a conduit l'Union européenne à l'interdire sur les véhicules neufs. Il reste disponible pour l'entretien des véhicules qui en ont.\n\n**Le R1234yf** équipe les véhicules récents, en général depuis 2017. Son impact climatique est très inférieur, mais il coûte **plusieurs fois plus cher** au kilo, et il demande une station de recharge dédiée. C'est la raison principale pour laquelle une recharge sur un véhicule récent coûte le double d'une recharge sur un véhicule de 2012.\n\nCe qu'il faut savoir :\n\n- Les deux gaz **ne se mélangent pas** et les raccords sont différents : un circuit R1234yf ne se recharge pas au R134a, même « un peu ».\n- L'étiquette sous le capot indique le gaz et la **quantité exacte** en grammes. C'est cette quantité, pesée, que la station remet, ni plus ni moins. Trop de gaz refroidit mal et fatigue le compresseur.\n- L'**huile** du circuit est elle aussi spécifique au gaz et au compresseur.\n\nQuel que soit le gaz, la méthode est la même : récupération, pesée, tirage au vide, contrôle d'étanchéité, recharge à la quantité constructeur avec l'huile adaptée.",
      },
      {
        title: "Ce que ça coûte sur le marché",
        content:
          "Les prix varient avec le gaz, la quantité, et ce que l'intervention comprend réellement. Les ordres de grandeur observés en France :\n\n| Intervention | Fourchette courante (marché) |\n| --- | --- |\n| Recharge R134a, avec récupération et contrôle | 60 à 120 € |\n| Recharge R1234yf, avec récupération et contrôle | 120 à 250 € |\n| Recherche de fuite au traceur UV ou à l'azote | 50 à 100 € |\n| Désinfection du circuit d'air + filtre d'habitacle | 40 à 90 € |\n| Remplacement du condenseur, pose comprise | 250 à 600 € |\n| Remplacement du compresseur, pose comprise | 500 à 1 200 € |\n\nUne recharge affichée « à partir de 30 € » couvre rarement la récupération, le vide et le contrôle d'étanchéité, et presque jamais le R1234yf. Demandez ce que le prix comprend, et la quantité de gaz remise.\n\nChez nous, sur [la climatisation auto à Perpignan](/climatisation-auto-perpignan) : contrôle du circuit avant toute recharge, pesée du gaz récupéré et du gaz remis, recherche de fuite si les quantités ne collent pas, et devis détaillé gratuit avant de remplacer une pièce. Le filtre d'habitacle et la désinfection peuvent se faire dans le même rendez-vous. Et si votre clim fonctionne encore, le printemps est le bon moment pour un contrôle, avant la file d'attente de juillet.",
      },
    ],
    highlights: [
      "Un circuit perd 10 à 15 % de gaz par an : la recharge tous les deux ans est un entretien normal.",
      "Une clim passée de froide à tiède en un été a une fuite : recharger sans chercher, c'est payer deux fois.",
      "Récupération, pesée, vide, étanchéité, recharge à la quantité exacte : la méthode qui fait la différence.",
      "R1234yf (véhicules récents) : même méthode, gaz plusieurs fois plus cher.",
      "Faire tourner la clim l'hiver et changer le filtre d'habitacle chaque année évite la plupart des pannes.",
    ],
    faq: [
      { question: "Combien coûte une recharge de clim ?", answer: "Sur le marché français, 60 à 120 € en R134a et 120 à 250 € en R1234yf, récupération et contrôle d'étanchéité compris. Une recherche de fuite se situe entre 50 et 100 €. Notre devis est détaillé et gratuit, avec la quantité de gaz récupérée et remise." },
      { question: "Tous les combien faut-il recharger la clim ?", answer: "Un contrôle et une recharge tous les deux ans suffisent en usage courant, de préférence au printemps. Un circuit perd naturellement 10 à 15 % de gaz par an. S'il se vide en moins d'un an, ce n'est plus de l'entretien, c'est une fuite." },
      { question: "Pourquoi ma clim ne fait plus de froid ?", answer: "Le plus souvent par manque de gaz, progressif (entretien) ou brutal (fuite). Parfois à cause d'un filtre d'habitacle colmaté, d'un pressostat, d'un fusible, ou d'un compresseur qui ne s'enclenche plus. Le contrôle du circuit dit lequel avant de recharger." },
      { question: "Peut-on recharger la clim soi-même avec un kit ?", answer: "Les kits en bombe ajoutent du gaz sans récupérer, sans faire le vide, sans mesurer la quantité ni contrôler l'étanchéité, parfois avec un anti-fuite qui colmate le détendeur. Sur un circuit sain c'est inutile, sur un circuit qui fuit c'est de l'argent perdu. Un professionnel est tenu de contrôler l'étanchéité avant de recharger." },
      { question: "Ma clim sent mauvais : est-ce un problème de gaz ?", answer: "Non. L'odeur vient des bactéries et moisissures sur l'évaporateur, humide et sombre. Elle se traite par une désinfection du circuit d'air et un filtre d'habitacle neuf, et se prévient en coupant la clim quelques minutes avant d'arriver, ventilation maintenue." },
      { question: "Faut-il faire tourner la clim en hiver ?", answer: "Oui, une dizaine de minutes par semaine. Le gaz transporte l'huile qui lubrifie le compresseur et les joints ; un circuit qui ne tourne pas six mois voit ses joints sécher, et c'est la première cause de fuite au printemps. La clim aide aussi à désembuer." },
    ],
    links: [L.clim, L.entretien, L.diag, A.moteur, CONTACT],
  },
];

// ─── Contrôles ────────────────────────────────────────────────────────
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const FORBIDDEN = [/diagnostic gratuit/i, /diagnostic offert/i, /sous 24/i, /en 10 min/i, /\d+ ans d['’]exp/i, /le patron/i, /chef mécano/i, /pas cher/i, /meilleur prix/i, /numéro 1/i];
function report(a: Article) {
  const body = [a.intro, ...a.sections.map((s) => s.content)].join("\n");
  const faq = a.faq.map((f) => f.question + " " + f.answer).join(" ");
  const all = body + " " + faq + " " + a.highlights.join(" ");
  const slugs = new Set(articles.map((x) => "/" + x.slug));
  const links = [...body.matchAll(/\]\((\/[^)]+)\)/g)].map((m) => m[1]);
  const known = new Set([...Object.values(L).map((l) => l.url), "/contact", ...slugs]);
  const bad = links.filter((l) => !known.has(l));
  const forbidden = FORBIDDEN.filter((r) => r.test(all)).map(String);
  console.log(
    `${a.order}. ${a.slug}\n   title ${a.meta_title.length} car · meta ${a.meta_description.length} car · corps ${words(body)} mots · FAQ ${words(faq)} mots · ${a.sections.length} sections · ${a.faq.length} questions` +
      (bad.length ? `\n   LIENS INCONNUS : ${bad.join(", ")}` : "") +
      (forbidden.length ? `\n   !! MOTS INTERDITS : ${forbidden.join(" ")}` : ""),
  );
  if (a.meta_title.length > 60) console.log("   !! titre > 60");
  if (a.meta_description.length > 155) console.log("   !! meta > 155");
}

for (const a of articles) report(a);
if (process.argv.includes("--check")) process.exit(0);

// ─── Écriture ─────────────────────────────────────────────────────────
const sb = getSupabase();
for (const a of articles) {
  const { data: existing } = await sb
    .from("seo_pages")
    .select("id, status")
    .eq("site_key", SITE)
    .eq("slug", a.slug)
    .maybeSingle();
  if (existing && existing.status === "published") {
    console.log(`skip (published) ${a.slug}`);
    continue;
  }
  const row = {
    site_key: SITE,
    slug: a.slug,
    city: "Perpignan",
    service: null,
    page_type: "article",
    intent: "informational",
    h1: a.h1,
    meta_title: a.meta_title,
    meta_description: a.meta_description,
    status: "draft",
    content: {
      intro: a.intro,
      heroImage: a.heroImage,
      seoSections: a.sections,
      highlights: a.highlights,
      faq: a.faq,
      internalLinks: a.links,
      card: a.card,
      brief: {
        source: "seed:garage-conseils",
        main_keyword: a.main_keyword,
        secondary_keywords: a.secondary_keywords,
        publish_order: a.order,
        note:
          "Article rédigé le 2026-10-09 sur requête nationale (DataForSEO + SERP) liée à un service où le site a déjà du signal GSC. Fourchettes de prix = ordres de grandeur du marché, pas nos tarifs. Diagnostic facturé, devis gratuit. Aucune personne mise en scène. À valider avant publication.",
      },
    },
  };
  const q = existing ? sb.from("seo_pages").update(row).eq("id", existing.id) : sb.from("seo_pages").insert(row);
  const { error } = await q;
  console.log(error ? `ERREUR ${a.slug}: ${error.message}` : `${existing ? "màj" : "créé"} ${a.slug}`);
}
