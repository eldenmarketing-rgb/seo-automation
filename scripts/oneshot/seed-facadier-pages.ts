/**
 * Brouillons des 6 pages prestation du site Façadier 66 (site_key facadier),
 * écrits comme pages de destination SEO + Ads : besoin du visiteur, ce qui est
 * fait, déroulé, quand faire appel, FAQ, CTA. Aucun fait client (prix, délai,
 * garantie, qualification RGE, ancienneté, aide financière) : tout est à
 * valider avant ajout.
 *
 * Statut `draft` — relecture et publication depuis le dashboard (/pages).
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-facadier-pages.ts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "facadier";
const CONTACT = { url: "/contact", anchor: "Demander un devis", context: "Décrivez votre façade, nous vous rappelons." };
const ZONES = "Cabestany, Canet-en-Roussillon, Saint-Cyprien, Argelès-sur-Mer, Saint-Estève, Toulouges, Thuir, Rivesaltes";

type Page = {
  slug: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  service: string;
  card: { title: string; tagline: string; description: string; badges: string[]; featured: boolean };
  intro: string;
  sections: { title: string; content: string }[];
  highlights: string[];
  faq: { question: string; answer: string }[];
  links: { url: string; anchor: string; context: string }[];
};

const L = {
  ravalement: { url: "/prestations/ravalement-facade-perpignan", anchor: "Ravalement de façade", context: "Remettre la façade à neuf, du nettoyage à la finition." },
  enduit: { url: "/prestations/enduit-facade-perpignan", anchor: "Enduit de façade", context: "Monocouche, traditionnel à la chaux, gratté ou taloché." },
  peinture: { url: "/prestations/peinture-facade-perpignan", anchor: "Peinture de façade", context: "Préparer le fond, protéger et colorer." },
  nettoyage: { url: "/prestations/nettoyage-facade-perpignan", anchor: "Nettoyage de façade", context: "Démoussage, nettoyage basse pression, hydrofuge." },
  ite: { url: "/prestations/isolation-exterieure-perpignan", anchor: "Isolation par l'extérieur", context: "Isoler et rénover la façade en un seul chantier." },
  fissures: { url: "/prestations/reparation-fissures-facade-perpignan", anchor: "Réparation de fissures", context: "Diagnostiquer, ouvrir, traiter, reboucher." },
};

const pages: Page[] = [
  {
    slug: "prestations/ravalement-facade-perpignan",
    h1: "Ravalement de façade Perpignan",
    meta_title: "Ravalement de façade Perpignan : façadier, devis écrit",
    meta_description:
      "Ravalement de façade à Perpignan et dans le 66 : diagnostic du support, nettoyage, fissures, enduit ou peinture, protection. Visite sur place et devis écrit avant chantier.",
    service: "Ravalement de façade",
    card: {
      title: "Ravalement",
      tagline: "Remettre la façade à neuf, du nettoyage à la finition",
      description: "Diagnostic du support, nettoyage, réparation des fissures, enduit ou peinture, protection : une façade saine et propre pour des années.",
      badges: ["Perpignan et 66", "Devis écrit"],
      featured: true,
    },
    intro:
      "Un enduit qui se fissure et sonne creux, une peinture qui farine, des coulures noires sous les appuis de fenêtre, des mousses sur le mur nord : à Perpignan, entre soleil, tramontane et pluies d'automne, une façade vieillit vite. Le ravalement remet l'ensemble en état : on nettoie, on répare, on reprend l'enduit ou la peinture, on protège. Nous ravalons des façades de maisons et de petits immeubles à Perpignan et dans tout le département.\n\nAppelez-nous et décrivez ce que vous voyez sur le mur : nous passons examiner la façade, et vous recevez un devis écrit, poste par poste, avant tout chantier.",
    sections: [
      {
        title: "Quand un ravalement s'impose",
        content:
          "Tous les signes ne se valent pas : certains appellent un simple nettoyage, d'autres une reprise complète. Ce que nous rencontrons le plus souvent à Perpignan :\n\n- **Enduit qui se décolle ou sonne creux** quand on le frappe : il n'adhère plus au mur, il faut le piquer et le refaire.\n- **Fissures** qui s'ouvrent, surtout aux angles des fenêtres et aux jonctions de matériaux : à traiter avant toute finition, voir notre page [réparation de fissures](/prestations/reparation-fissures-facade-perpignan).\n- **Peinture qui farine, cloque ou s'écaille** : le fond n'est plus protégé.\n- **Taches d'humidité, salpêtre, mousses et lichens** : l'eau rentre ou stagne.\n- **Façade simplement sale ou ternie** : un [nettoyage](/prestations/nettoyage-facade-perpignan) suivi d'un hydrofuge peut suffire, sans ravalement complet.\n- **Obligation de la mairie ou décision de copropriété** : certaines communes imposent un ravalement périodique.",
      },
      {
        title: "Ce que comprend un ravalement complet",
        content:
          "Un ravalement est une suite d'étapes, chacune conditionnant la suivante :\n\n- **Diagnostic du support** : sondage de l'enduit, repérage des fissures, mesure de l'humidité, identification du matériau du mur (brique, pierre, parpaing, béton).\n- **Installation du chantier** : échafaudage ou nacelle selon la hauteur, bâches, protection des menuiseries, des volets et des abords.\n- **Nettoyage** adapté : basse pression, brossage, traitement anti-mousse, décapage de l'ancienne peinture si elle ne tient plus.\n- **Réparations** : ouverture et traitement des fissures, piquage des zones creuses, reprise des appuis et des bandeaux, joints autour des menuiseries.\n- **Finition** : [enduit](/prestations/enduit-facade-perpignan) monocouche ou traditionnel, ou [peinture de façade](/prestations/peinture-facade-perpignan) sur un enduit sain.\n- **Protection** : hydrofuge si le support s'y prête, remise en état des descentes d'eau et des abords.",
      },
      {
        title: "Comment se passe le chantier",
        content:
          "1. **Au téléphone**, vous décrivez la façade : maison ou immeuble, nombre d'étages, ce que vous voyez, l'accès.\n2. **Visite** : nous sondons l'enduit, regardons les fissures et les points d'eau, mesurons les surfaces et repérons les contraintes (voisinage, trottoir, lignes électriques).\n3. **Devis écrit** détaillant l'accès, le nettoyage, les réparations, la finition et la protection, avec la durée prévue.\n4. **Démarches** : nous vous indiquons si une déclaration préalable est nécessaire dans votre commune.\n5. **Chantier** : installation, nettoyage, réparations, finition en plusieurs couches avec leurs temps de séchage, puis dépose de l'échafaudage et nettoyage des abords.\n\nLa météo rythme un chantier de façade : on n'applique ni enduit ni peinture sous la pluie, ni par forte tramontane, ni en plein soleil sur un mur brûlant. Nous vous prévenons si une étape doit être décalée.",
      },
      {
        title: "Enduit ou peinture : le choix se fait sur le mur",
        content:
          "La finition dépend de l'état du support, pas du catalogue :\n\n- **Enduit existant sain**, juste sale ou terni : nettoyage puis peinture de façade adaptée (pliolite, siloxane ou acrylique selon le support et l'exposition).\n- **Enduit localement abîmé** : reprises à l'identique puis peinture d'ensemble pour unifier.\n- **Enduit décollé sur de grandes surfaces** : piquage et nouvel enduit, monocouche sur maçonnerie récente, traditionnel à la chaux sur les murs anciens en brique ou en galets, fréquents dans le vieux Perpignan et les villages.\n- **Mur froid ou mal isolé** : c'est le moment de penser à une [isolation par l'extérieur](/prestations/isolation-exterieure-perpignan), qui remplace l'enduit et l'isolant en un seul chantier.\n\nNous posons un échantillon de teinte et de finition sur le mur avant de décider.",
      },
      {
        title: "Ravalement à Perpignan et dans les Pyrénées-Orientales",
        content:
          `Nous intervenons à Perpignan et dans tout le département : ${ZONES}, le littoral, la plaine du Roussillon, les Aspres et le Vallespir. Les maisons du bord de mer, exposées au sel et au vent, demandent des finitions plus résistantes que celles de la plaine : nous en tenons compte dans le choix des produits.\n\nPour une copropriété, nous travaillons avec le syndic et le conseil syndical : état des lieux, devis par poste et planning tenant compte des occupants. Dans tous les cas, un devis écrit précède les travaux.`,
      },
    ],
    highlights: [
      "Diagnostic du support avant tout devis : sondage, fissures, humidité",
      "Nettoyage, réparations, enduit ou peinture, protection : toute la chaîne",
      "Chaux sur les murs anciens, monocouche sur le récent",
      "Visite sur place et devis écrit, poste par poste",
    ],
    faq: [
      { question: "Combien coûte un ravalement de façade ?", answer: "Le prix dépend de la surface et de la hauteur, de l'accès (échafaudage ou nacelle), de l'état du support, des réparations à faire et de la finition retenue. Nous mesurons et sondons la façade sur place : le devis écrit détaille chaque poste avant le chantier." },
      { question: "Faut-il une autorisation pour ravaler ?", answer: "Un ravalement demande en général une déclaration préalable de travaux en mairie, et des contraintes supplémentaires s'appliquent en secteur protégé ou si l'aspect change (couleur, isolation par l'extérieur). Nous vous indiquons les démarches à faire pour votre commune." },
      { question: "Combien de temps dure un ravalement ?", answer: "Cela dépend de la surface, des réparations et des temps de séchage entre les couches, qui varient avec la météo. La durée prévue figure sur le devis et nous vous prévenons si la pluie ou le vent décale une étape." },
      { question: "Peut-on ravaler une façade en hiver ?", answer: "Oui, à Perpignan les hivers sont doux ; on évite seulement les jours de gel, de pluie et de forte tramontane. L'été, on travaille tôt pour ne pas enduire ou peindre un mur brûlant." },
      { question: "Faites-vous les façades d'immeubles ?", answer: "Oui, pour les petits immeubles et les copropriétés, avec échafaudage ou nacelle selon la hauteur et l'accès. Le devis se fait avec le syndic ou le conseil syndical." },
    ],
    links: [L.enduit, L.peinture, L.nettoyage, L.fissures, CONTACT],
  },

  {
    slug: "prestations/enduit-facade-perpignan",
    h1: "Enduit de façade Perpignan",
    meta_title: "Enduit de façade Perpignan : monocouche, chaux, finitions",
    meta_description:
      "Enduit de façade à Perpignan et dans le 66 : monocouche sur maçonnerie récente, traditionnel à la chaux sur les murs anciens, finition grattée, talochée ou lissée. Devis écrit.",
    service: "Enduit de façade",
    card: {
      title: "Enduit",
      tagline: "Monocouche, traditionnel à la chaux, gratté ou taloché",
      description: "Enduit projeté ou appliqué à la main sur maçonnerie neuve ou ancienne, finition gratté, taloché, lissé, teinté dans la masse.",
      badges: ["Perpignan et 66", "Devis écrit"],
      featured: true,
    },
    intro:
      "L'enduit est la peau de la maison : il protège la maçonnerie de la pluie, laisse sortir l'humidité du mur et donne à la façade sa couleur et son grain. Un enduit mal choisi, trop rigide sur un mur ancien ou posé sur un fond poudreux, se fissure et se décolle en quelques années. Nous réalisons des enduits de façade à Perpignan et dans le département, en monocouche sur les maçonneries récentes et à la chaux sur le bâti ancien.\n\nAppelez-nous et décrivez votre mur : nous venons le voir, et vous recevez un devis écrit avant tout chantier.",
    sections: [
      {
        title: "Monocouche ou enduit traditionnel : le mur décide",
        content:
          "Deux familles d'enduit, deux usages :\n\n- **Enduit monocouche** : un mortier prêt à l'emploi, projeté à la machine en une ou deux passes, teinté dans la masse. Rapide et régulier, il convient aux maçonneries récentes en parpaing ou en brique creuse, c'est-à-dire à la plupart des maisons construites depuis les années 70 autour de Perpignan.\n- **Enduit traditionnel à la chaux** : appliqué en trois couches (gobetis, corps d'enduit, finition), il reste souple et laisse respirer les murs anciens en pierre, en galets de rivière ou en brique pleine. C'est l'enduit du vieux Perpignan, des mas et des villages de la plaine. Un enduit ciment sur ce type de mur emprisonne l'humidité et finit par éclater.\n\nÀ la visite, nous identifions le matériau du mur avant de proposer l'un ou l'autre.",
      },
      {
        title: "Les finitions possibles",
        content:
          "La finition se choisit sur échantillon, posé sur le mur et regardé à la lumière du jour :\n\n- **Gratté** : la surface est grattée après prise, grain régulier, la finition la plus courante en monocouche.\n- **Taloché** : lissé à la taloche, aspect plus fin et plus traditionnel, courant sur la chaux.\n- **Lissé** : surface serrée, très plane, pour une façade contemporaine.\n- **Projeté ou écrasé** : relief marqué, cache mieux les irrégularités d'un support.\n- **Teinte dans la masse** ou enduit clair destiné à recevoir une [peinture de façade](/prestations/peinture-facade-perpignan).\n\nEn secteur protégé ou sur un bâtiment ancien, la commune peut imposer une teinte et un grain : nous vous le signalons avant le devis.",
      },
      {
        title: "Ce que comprend la pose d'un enduit",
        content:
          "- **Préparation du support** : piquage de l'ancien enduit s'il ne tient plus, dépoussiérage, lavage, traitement des [fissures](/prestations/reparation-fissures-facade-perpignan) et des parties creuses, reprise des angles et des appuis.\n- **Accrochage** : gobetis ou primaire selon le support, armature en fibre de verre sur les jonctions de matériaux et les zones fragiles.\n- **Corps d'enduit** : une ou plusieurs passes selon le système, avec les temps de séchage entre elles.\n- **Finition** : grattage, talochage ou lissage, baguettes d'angle, arrêts d'enduit autour des menuiseries, joints souples aux jonctions.\n- **Protection** : bâches sur les menuiseries et le sol pendant les travaux, nettoyage des abords à la fin.\n\nUn enduit s'applique sur un mur sec, ni sous la pluie ni par forte chaleur : la météo peut décaler une passe, nous vous prévenons.",
      },
      {
        title: "Enduit neuf ou reprise d'enduit existant",
        content:
          "Tout ne se refait pas en entier :\n\n- **Façade neuve ou extension** : enduit monocouche complet sur la maçonnerie brute.\n- **Enduit décollé par plaques** : piquage des zones creuses, reprise à l'identique, puis peinture d'ensemble pour unifier si les reprises restent visibles.\n- **Enduit fissuré mais adhérent** : traitement des fissures et finition par peinture ou enduit mince.\n- **Enduit ancien sur mur en pierre** : reprise à la chaux, parfois avec rejointoiement des pierres si vous souhaitez les laisser apparentes.\n- **Mur froid** : l'[isolation par l'extérieur](/prestations/isolation-exterieure-perpignan) remplace l'enduit par un isolant recouvert d'un enduit de finition.\n\nDans le cadre d'un [ravalement complet](/prestations/ravalement-facade-perpignan), l'enduit est chiffré dans le même devis que le nettoyage et les réparations.",
      },
      {
        title: "Enduits de façade à Perpignan et dans le 66",
        content:
          `Nous intervenons à Perpignan et dans tout le département : ${ZONES} et les communes voisines. Le climat local compte dans le choix : les façades exposées à la tramontane sèchent vite et demandent une application soignée ; en bord de mer, le sel attaque plus vite les finitions.\n\nDécrivez-nous votre mur au téléphone, nous passons le voir et le devis écrit précède les travaux.`,
      },
    ],
    highlights: [
      "Monocouche sur maçonnerie récente, chaux sur les murs anciens",
      "Finition gratté, taloché, lissé ou projeté, choisie sur échantillon",
      "Préparation du support et traitement des fissures compris",
      "Visite sur place et devis écrit avant chantier",
    ],
    faq: [
      { question: "Quelle différence entre enduit et crépi ?", answer: "Crépi est le mot courant pour désigner un enduit de façade à relief, souvent un monocouche projeté ou gratté. Techniquement, c'est le même ouvrage : un mortier appliqué sur la maçonnerie pour la protéger et la décorer." },
      { question: "Peut-on mettre un enduit monocouche sur une vieille maison en pierre ?", answer: "C'est déconseillé : trop rigide et peu perméable à la vapeur d'eau, il bloque l'humidité du mur ancien et finit par se fissurer ou se décoller. Sur la pierre, la brique pleine et les galets, nous posons un enduit à la chaux." },
      { question: "Combien coûte un enduit de façade au m² ?", answer: "Le prix dépend du type d'enduit, de la finition, de l'état du support (préparation, piquage, fissures), de la hauteur et de l'accès. Nous mesurons et sondons le mur sur place et le devis écrit détaille chaque poste." },
      { question: "Faut-il peindre un enduit monocouche ?", answer: "Non, il est teinté dans la masse et se suffit à lui-même. On le peint seulement si l'on veut changer de couleur plus tard ou unifier des reprises." },
      { question: "Combien de temps un enduit doit-il sécher ?", answer: "Chaque passe a son temps de séchage, qui dépend de la température, de l'humidité et du vent. Le planning du devis en tient compte, et nous ne posons pas la finition sur une couche encore humide." },
    ],
    links: [L.ravalement, L.peinture, L.fissures, L.ite, CONTACT],
  },

  {
    slug: "prestations/peinture-facade-perpignan",
    h1: "Peinture de façade Perpignan",
    meta_title: "Peinture de façade Perpignan : préparation, protection, couleur",
    meta_description:
      "Peinture de façade à Perpignan et dans le 66 : lavage, rebouchage, impression puis peinture adaptée au support et à l'exposition. Visite sur place et devis écrit.",
    service: "Peinture de façade",
    card: {
      title: "Peinture",
      tagline: "Préparer le fond, protéger et colorer",
      description: "Lavage, rebouchage, impression puis peinture adaptée au support et à l'exposition : façade protégée et couleur durable.",
      badges: ["Perpignan et 66", "Devis écrit"],
      featured: true,
    },
    intro:
      "Une peinture de façade qui tient, c'est d'abord un fond bien préparé. Sous le soleil de Perpignan, une peinture posée sur un enduit sale, farinant ou humide cloque et s'écaille en deux saisons. Nous peignons des façades de maisons et de petits immeubles à Perpignan et dans le département : nettoyage, réparations, impression puis la peinture qui convient au support et à son exposition.\n\nAppelez-nous et décrivez votre façade : nous passons la voir, et vous recevez un devis écrit avant toute intervention.",
    sections: [
      {
        title: "Pourquoi repeindre une façade",
        content:
          "Au-delà de la couleur, la peinture protège l'enduit de l'eau et des UV. Les demandes les plus fréquentes :\n\n- **Peinture qui farine** : la main blanchit quand on frotte le mur, le film ne protège plus.\n- **Cloques et écailles** : humidité sous le film ou peinture incompatible avec le fond.\n- **Façade ternie, tachée, verdie** au nord : un [nettoyage](/prestations/nettoyage-facade-perpignan) puis une peinture redonnent une façade propre.\n- **Reprises d'enduit visibles** après des réparations : la peinture d'ensemble unifie.\n- **Changement de couleur** à l'occasion d'une rénovation, dans le respect des teintes admises par la commune.\n- **Microfissures et faïençage** : certaines peintures souples les pontent, voir notre page [fissures](/prestations/reparation-fissures-facade-perpignan).",
      },
      {
        title: "Quelle peinture pour quelle façade",
        content:
          "Le produit se choisit sur le support, l'exposition et l'état du mur :\n\n- **Acrylique** : la plus courante sur enduit sain, bonne tenue des couleurs, séchage rapide.\n- **Pliolite** : très adhérente, applicable sur fonds difficiles ou légèrement farinants, pratique en saison fraîche.\n- **Siloxane** : perméable à la vapeur d'eau et hydrofuge en surface, adaptée aux murs qui doivent respirer et aux façades très exposées à la pluie.\n- **Peinture à la chaux ou silicate** sur les enduits à la chaux et le bâti ancien, pour ne pas bloquer le mur.\n- **Revêtement semi-épais ou souple** quand le fond est faïencé ou microfissuré.\n\nNous posons un échantillon de deux ou trois teintes sur le mur, regardé au soleil et à l'ombre, avant de commander.",
      },
      {
        title: "Ce que comprend un chantier de peinture",
        content:
          "- **Lavage** de la façade, traitement anti-mousse si nécessaire, séchage.\n- **Préparation** : grattage et brossage des parties qui n'adhèrent plus, rebouchage des trous et des fissures, reprise des appuis de fenêtre, ponçage des reprises.\n- **Impression** ou fixateur, indispensable sur fond poudreux ou neuf : c'est ce qui fait tenir la peinture.\n- **Deux couches de finition**, au rouleau ou à la machine selon le grain de l'enduit, avec le temps de séchage entre elles.\n- **Protection** : menuiseries, volets, gouttières, sols et plantations bâchés ; nettoyage des abords à la fin.\n\nOn ne peint ni sous la pluie, ni par vent fort, ni sur un mur chauffé par le soleil : l'été, nous suivons l'ombre autour de la maison.",
      },
      {
        title: "Peinture seule ou ravalement complet",
        content:
          "La peinture suffit quand l'enduit est sain. Si l'enduit sonne creux, se décolle par plaques ou présente des fissures ouvertes, il faut d'abord le reprendre : voir [enduit de façade](/prestations/enduit-facade-perpignan) et [ravalement complet](/prestations/ravalement-facade-perpignan). Nous vous le disons à la visite, échantillon et sondage à l'appui, plutôt que de peindre par-dessus un problème qui ressortira.\n\nSur une maison dont les murs sont froids, la question de l'[isolation par l'extérieur](/prestations/isolation-exterieure-perpignan) se pose avant de repeindre : on ne repeint pas deux fois.",
      },
      {
        title: "Peinture de façade à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans tout le département : ${ZONES} et les communes voisines. Sur le littoral, l'air salin impose des produits plus résistants ; dans les centres anciens, la mairie peut imposer un nuancier.\n\nDécrivez-nous votre façade, nous passons la voir et le devis écrit précède les travaux.`,
      },
    ],
    highlights: [
      "Fond préparé : lavage, rebouchage, impression avant la couleur",
      "Acrylique, pliolite, siloxane ou chaux selon le support",
      "Échantillons posés sur le mur avant de décider",
      "Visite sur place et devis écrit avant chantier",
    ],
    faq: [
      { question: "Combien coûte la peinture d'une façade ?", answer: "Le prix dépend de la surface, de la hauteur et de l'accès, de l'état du fond (préparation, rebouchage), du type de peinture et du nombre de couches. Nous mesurons sur place et le devis écrit détaille chaque poste." },
      { question: "Peut-on peindre sur un enduit fissuré ?", answer: "Sur des microfissures et un faïençage, un revêtement souple ou semi-épais peut suffire après traitement. Sur des fissures ouvertes ou un enduit décollé, il faut d'abord réparer l'enduit : peindre par-dessus ne tient pas." },
      { question: "Combien de temps dure une peinture de façade ?", answer: "Elle dépend de la préparation, du nombre de couches et de la météo : chaque couche sèche avant la suivante. La durée prévue figure sur le devis." },
      { question: "Faut-il une autorisation pour changer la couleur de sa façade ?", answer: "Un changement de couleur demande en général une déclaration préalable en mairie, et certaines communes imposent un nuancier, surtout en centre ancien ou en secteur protégé. Nous vous indiquons les démarches pour votre commune." },
      { question: "Peut-on peindre une façade en été à Perpignan ?", answer: "Oui, en évitant les murs en plein soleil et les heures les plus chaudes : la peinture sècherait trop vite et accrocherait mal. Nous organisons le chantier en suivant l'ombre." },
    ],
    links: [L.ravalement, L.enduit, L.nettoyage, L.fissures, CONTACT],
  },

  {
    slug: "prestations/nettoyage-facade-perpignan",
    h1: "Nettoyage de façade Perpignan",
    meta_title: "Nettoyage de façade Perpignan : démoussage, hydrofuge",
    meta_description:
      "Nettoyage et démoussage de façade à Perpignan et dans le 66 : nettoyage basse pression adapté au support, traitement anti-mousse, hydrofuge. Visite et devis écrit.",
    service: "Nettoyage de façade",
    card: {
      title: "Nettoyage",
      tagline: "Démoussage, nettoyage basse pression, hydrofuge",
      description: "Nettoyage adapté au support, traitement anti-mousse et hydrofuge pour retarder le prochain ravalement.",
      badges: ["Perpignan et 66", "Devis écrit"],
      featured: true,
    },
    intro:
      "Une façade noircie par la pollution, verdie par les mousses sur le mur nord, tachée de coulures sous les appuis : souvent, l'enduit dessous est sain et un nettoyage bien fait suffit à retrouver une façade propre, sans ravalement. Mal fait, en revanche, un nettoyage à haute pression creuse l'enduit, ouvre les joints et fait entrer l'eau. Nous nettoyons les façades à Perpignan et dans le département avec la méthode adaptée au support, puis nous les protégeons.\n\nAppelez-nous et décrivez l'état du mur : nous passons voir, et vous recevez un devis écrit.",
    sections: [
      {
        title: "Ce qui salit une façade à Perpignan",
        content:
          "- **Mousses, algues et lichens** sur les faces nord et les parties qui restent humides : murs de jardin, bas de façade, dessous de gouttières.\n- **Pollution et poussières** portées par le vent, qui noircissent les reliefs et les appuis.\n- **Coulures** sous les fenêtres, les balcons et les gouttières qui débordent.\n- **Salpêtre et efflorescences** blanches, signes d'humidité qui remonte ou traverse.\n- **Traces de rouille** sous les ferronneries, **graffitis** en ville.\n\nLe nettoyage retire la salissure ; si l'origine est une fuite ou une remontée d'humidité, nous vous le disons, car elle reviendra tant que la cause n'est pas traitée.",
      },
      {
        title: "Les méthodes de nettoyage selon le support",
        content:
          "Il n'y a pas une méthode mais plusieurs, choisies à la visite :\n\n- **Nettoyage basse pression** à l'eau, avec produit adapté, sur enduit et peinture : efficace sans abîmer le support.\n- **Traitement anti-mousse** appliqué avant ou après le lavage, laissé agir, puis rinçage : il détruit les spores pour retarder la repousse.\n- **Brossage et nettoyage manuel** sur les parties fragiles, les enduits à la chaux et les moulures.\n- **Nettoyage chimique doux** sur les salissures tenaces, avec rinçage soigneux.\n- **Hydrogommage ou gommage basse pression** sur la pierre et la brique, qui décrasse sans attaquer la surface.\n\nLa haute pression sur un enduit est réservée aux cas où l'on va de toute façon le reprendre : voir [enduit de façade](/prestations/enduit-facade-perpignan).",
      },
      {
        title: "Protéger après avoir nettoyé",
        content:
          "Une façade propre se salit de nouveau si elle reste poreuse. Après le nettoyage et un séchage complet :\n\n- **Hydrofuge de surface** : incolore, il fait perler l'eau sans empêcher le mur de respirer et limite mousses et coulures. Sur enduit, pierre et brique, quand le support s'y prête.\n- **Peinture de façade** si l'enduit est sain mais terni : voir [peinture de façade](/prestations/peinture-facade-perpignan).\n- **Reprise des points d'entrée d'eau** : joints autour des menuiseries, appuis de fenêtre, descentes de gouttière.\n\nNous vous conseillons la protection qui correspond au support et à l'exposition, pas la plus chère.",
      },
      {
        title: "Comment se passe l'intervention",
        content:
          "1. **Appel** : vous décrivez la façade, sa hauteur, ce qui vous gêne (mousses, noir, coulures).\n2. **Visite** : nous identifions le support, testons le nettoyage sur une petite zone, repérons les fissures et les points d'eau.\n3. **Devis écrit** : accès, méthode, produits, protection éventuelle.\n4. **Chantier** : bâchage des menuiseries, des sols et des plantations, nettoyage, rinçage, séchage, puis hydrofuge ou peinture si prévus.\n5. **Fin de chantier** : abords nettoyés, conseils d'entretien.\n\nUn nettoyage révèle parfois des défauts cachés par la salissure : fissures, enduit creux. Nous vous les montrons avant d'aller plus loin, voir [réparation de fissures](/prestations/reparation-fissures-facade-perpignan).",
      },
      {
        title: "Nettoyage de façade à Perpignan et dans le 66",
        content:
          `Nous intervenons à Perpignan et dans tout le département : ${ZONES} et les communes voisines, y compris les maisons du littoral où le sel et l'humidité favorisent les algues.\n\nSi le nettoyage ne suffit pas, nous vous le disons à la visite et le [ravalement complet](/prestations/ravalement-facade-perpignan) est chiffré dans un devis distinct.`,
      },
    ],
    highlights: [
      "Basse pression, brossage ou gommage : la méthode qui respecte le support",
      "Traitement anti-mousse et hydrofuge pour retarder la repousse",
      "Essai sur une petite zone avant le devis",
      "Visite sur place et devis écrit",
    ],
    faq: [
      { question: "Combien coûte un nettoyage de façade ?", answer: "Le prix dépend de la surface, de la hauteur et de l'accès, du type de salissure, de la méthode retenue et de la protection appliquée ensuite. Nous faisons un essai sur place et le devis écrit détaille chaque poste." },
      { question: "Le nettoyeur haute pression abîme-t-il la façade ?", answer: "Oui sur un enduit, une peinture ou une pierre tendre : il creuse la surface, ouvre les joints et fait entrer l'eau. Nous travaillons à basse pression, au brossage ou au gommage selon le support." },
      { question: "À quelle fréquence nettoyer une façade ?", answer: "Cela dépend de l'exposition : un mur nord ombragé verdit plus vite qu'une façade sud. Un hydrofuge après nettoyage espace nettement les interventions." },
      { question: "Le démoussage suffit-il contre les taches vertes ?", answer: "Le traitement anti-mousse détruit mousses et algues et retarde leur retour, mais si l'humidité qui les nourrit persiste (gouttière, remontée, ombre permanente), elles reviendront : nous cherchons la cause avec vous." },
      { question: "Peut-on nettoyer une façade avant de la peindre ?", answer: "C'est même obligatoire : une peinture posée sur un fond sale ou moussu ne tient pas. Le nettoyage est la première étape de tout chantier de peinture ou de ravalement." },
    ],
    links: [L.ravalement, L.peinture, L.fissures, L.enduit, CONTACT],
  },

  {
    slug: "prestations/isolation-exterieure-perpignan",
    h1: "Isolation thermique par l'extérieur Perpignan",
    meta_title: "Isolation par l'extérieur Perpignan (ITE) : façadier",
    meta_description:
      "Isolation thermique par l'extérieur à Perpignan et dans le 66 : isolant posé sur la façade puis enduit de finition. Moins de chaleur l'été, moins de pertes l'hiver. Visite et devis écrit.",
    service: "Isolation thermique par l'extérieur",
    card: {
      title: "Isolation extérieure",
      tagline: "Isoler et rénover la façade en un seul chantier",
      description: "Isolant posé sur la façade puis enduit ou bardage de finition : moins de chaleur l'été, moins de pertes l'hiver, façade neuve.",
      badges: ["Perpignan et 66", "Devis écrit"],
      featured: false,
    },
    intro:
      "À Perpignan, l'isolation sert autant contre la chaleur de l'été que contre le froid de l'hiver. L'isolation thermique par l'extérieur (ITE) enveloppe la maison d'un isolant posé sur la façade, recouvert d'un enduit de finition : les murs ne chauffent plus au soleil, les ponts thermiques disparaissent, et la façade est refaite dans le même chantier, sans perdre de surface à l'intérieur. Nous réalisons des ITE sous enduit à Perpignan et dans le département.\n\nAppelez-nous et décrivez la maison : nous passons voir la façade, et vous recevez un devis écrit avant tout chantier.",
    sections: [
      {
        title: "Quand l'isolation par l'extérieur est le bon choix",
        content:
          "- **Façade à ravaler de toute façon** : plutôt que de refaire seulement l'enduit, on isole et on finit en une fois.\n- **Maison des années 60 à 90** en parpaing ou brique creuse, sans isolation des murs ou avec un doublage mince.\n- **Murs chauds l'été, froids l'hiver**, pièces à l'étage inconfortables, factures de climatisation et de chauffage élevées.\n- **Pas envie de perdre de la place** ni de refaire les pièces : tout se passe dehors, vous restez chez vous.\n- **Ponts thermiques** aux planchers et aux refends, que l'isolation intérieure ne traite pas.\n\nL'ITE se discute moins sur une maison ancienne en pierre ou en galets dont les murs doivent respirer, en secteur protégé, ou quand les débords de toit et les ouvertures ne permettent pas d'ajouter l'épaisseur : nous vous le disons à la visite.",
      },
      {
        title: "Ce que comprend une ITE sous enduit",
        content:
          "- **Préparation du support** : nettoyage, reprise des parties creuses, traitement des [fissures](/prestations/reparation-fissures-facade-perpignan) et des points d'humidité, car on n'isole pas un mur mouillé.\n- **Rail de départ** et profilés d'angle, d'arrêt et de jonction avec les menuiseries et la toiture.\n- **Panneaux isolants** collés et chevillés : polystyrène expansé le plus souvent, laine de roche ou fibre de bois selon le mur, l'exposition au feu et le budget ; épaisseur choisie selon le gain visé et les contraintes de la maison.\n- **Couche de base armée** d'une trame en fibre de verre, qui fait la résistance aux chocs.\n- **Enduit de finition** : minéral, organique ou silicone, gratté ou taloché, teinté, comme un [enduit de façade](/prestations/enduit-facade-perpignan) classique.\n- **Reprise des détails** : appuis de fenêtre rallongés, descentes d'eau, seuils, évents, boîtes aux lettres et éclairages déplacés.",
      },
      {
        title: "Comment se passe le chantier",
        content:
          "1. **Appel** : vous décrivez la maison, son année, ses murs, ce qui vous gêne (chaleur, froid, factures, façade).\n2. **Visite** : relevé des façades, des ouvertures, des débords de toit et des réseaux en façade ; sondage du support ; repérage des contraintes (limites de propriété, trottoir, voisinage).\n3. **Devis écrit** : accès, préparation, isolant et épaisseur, finition, détails, durée.\n4. **Démarches** : l'ITE change l'aspect et l'épaisseur de la façade, une déclaration préalable est nécessaire ; nous vous indiquons la marche à suivre pour votre commune.\n5. **Chantier** : échafaudage, préparation, pose de l'isolant, couche armée, finition, reprise des détails, nettoyage des abords.\n\nVous habitez la maison pendant les travaux : tout se passe à l'extérieur.",
      },
      {
        title: "Ce que nous ne promettons pas",
        content:
          "Une ITE est un ouvrage sérieux et nous préférons être clairs :\n\n- **Pas de chiffre de gain** avancé sans étude : le résultat dépend des murs, de la toiture, des fenêtres et de la ventilation de votre maison.\n- **Pas de promesse d'aide financière** : les aides publiques ont leurs conditions propres, qui changent, et dépendent de qualifications et de démarches que nous ne traitons pas sur ce site. Renseignez-vous auprès des services officiels avant de signer quoi que ce soit.\n- **Pas d'isolation sur un mur humide** ni sur un support qui ne tient pas : on traite d'abord, voir [ravalement](/prestations/ravalement-facade-perpignan).\n\nSi l'ITE n'est pas la bonne réponse pour votre maison, nous vous proposons l'enduit ou la peinture qui convient.",
      },
      {
        title: "ITE à Perpignan et dans les Pyrénées-Orientales",
        content:
          `Nous intervenons à Perpignan et dans tout le département : ${ZONES} et les communes voisines. Les lotissements des années 70-90 de l'agglomération, aux murs en parpaing non isolés, sont les maisons où l'ITE apporte le plus.\n\nDécrivez-nous votre maison, nous passons la voir et le devis écrit précède les travaux.`,
      },
    ],
    highlights: [
      "Isolant posé sur la façade, enduit de finition : façade neuve et isolée en un chantier",
      "Polystyrène, laine de roche ou fibre de bois selon le mur",
      "Tout se passe dehors, vous restez chez vous",
      "Visite sur place et devis écrit, sans promesse de gain ni d'aide",
    ],
    faq: [
      { question: "Combien coûte une isolation par l'extérieur ?", answer: "Le prix dépend de la surface des façades, de l'isolant et de son épaisseur, de la finition, du nombre d'ouvertures et de détails à reprendre, de l'accès. Nous relevons la maison sur place et le devis écrit détaille chaque poste." },
      { question: "L'ITE est-elle utile contre la chaleur à Perpignan ?", answer: "Oui : l'isolant empêche les murs de chauffer au soleil et de restituer cette chaleur la nuit. Le confort d'été est l'un des premiers bénéfices constatés dans la région, en complément de la protection des fenêtres." },
      { question: "Faut-il une autorisation pour une ITE ?", answer: "Oui, une déclaration préalable au minimum, car l'aspect et l'épaisseur de la façade changent ; en secteur protégé, l'ITE peut être refusée. Nous vous indiquons les démarches pour votre commune." },
      { question: "Peut-on isoler par l'extérieur une maison en pierre ?", answer: "C'est rarement adapté : les murs anciens doivent respirer et l'isolant les en empêche. Sur ce type de maison, nous proposons un enduit à la chaux et une réflexion sur les autres postes (toiture, fenêtres)." },
      { question: "Quelle épaisseur d'isolant choisir ?", answer: "Elle se décide selon le gain visé, le matériau et les contraintes de la maison : débords de toit, seuils, limites de propriété. Nous en discutons à la visite avec les mesures en main." },
    ],
    links: [L.ravalement, L.enduit, L.fissures, L.peinture, CONTACT],
  },

  {
    slug: "prestations/reparation-fissures-facade-perpignan",
    h1: "Réparation de fissures de façade Perpignan",
    meta_title: "Fissure de façade Perpignan : diagnostic et réparation",
    meta_description:
      "Réparation de fissures de façade à Perpignan et dans le 66 : faïençage, microfissures, fissures traversantes. Diagnostic de la cause, traitement adapté, finition. Devis écrit.",
    service: "Réparation de fissures",
    card: {
      title: "Fissures",
      tagline: "Diagnostiquer, ouvrir, traiter, reboucher",
      description: "Faïençage, microfissures ou fissures traversantes : chaque fissure reçoit le traitement qui convient avant toute finition.",
      badges: ["Perpignan et 66", "Devis écrit"],
      featured: false,
    },
    intro:
      "Une fissure sur une façade inquiète, et c'est normal : certaines ne sont qu'un défaut d'enduit, d'autres racontent un mouvement du mur. Les sols argileux de la plaine du Roussillon, qui gonflent l'hiver et se rétractent l'été, en provoquent beaucoup. Avant de reboucher, il faut comprendre. Nous diagnostiquons et réparons les fissures de façade à Perpignan et dans le département, puis nous refaisons la finition pour qu'il n'en reste pas de trace.\n\nAppelez-nous, décrivez la fissure (où, dans quel sens, depuis quand) : nous passons la voir, et vous recevez un devis écrit.",
    sections: [
      {
        title: "Lire une fissure avant de la boucher",
        content:
          "- **Faïençage** : réseau de fines craquelures en surface, comme une assiette ancienne. C'est l'enduit ou la peinture qui a séché trop vite ou s'est rigidifié ; pas de danger, mais l'eau s'y infiltre.\n- **Microfissures** de moins d'un millimètre, souvent verticales ou en diagonale aux angles des ouvertures : retrait de l'enduit ou légers mouvements de la maçonnerie.\n- **Fissures ouvertes** de plusieurs millimètres, qui suivent les joints de parpaings en escalier ou traversent le mur : mouvement du bâti, tassement, sol argileux. Elles demandent une surveillance et parfois l'avis d'un bureau d'études ou d'un maçon avant la réparation de façade.\n- **Fissures aux jonctions** entre deux matériaux (extension, linteau, poutre béton) : les deux parties ne bougent pas pareil.\n\nNous posons des témoins si une fissure semble évoluer : on ne masque pas un mouvement en cours.",
      },
      {
        title: "Les traitements selon le type de fissure",
        content:
          "- **Faïençage et microfissures** : nettoyage, fixateur, puis revêtement souple ou semi-épais qui ponte les craquelures, ou enduit mince de rénovation, suivi d'une [peinture de façade](/prestations/peinture-facade-perpignan).\n- **Fissures d'enduit** : ouverture en V, dépoussiérage, mastic ou mortier adapté, bande d'armature en fibre de verre noyée dans l'enduit de reprise, puis finition.\n- **Fissures structurelles stabilisées** : agrafage ou couture du mur par des armatures scellées dans des saignées, reprise en mortier, armature d'enduit, finition.\n- **Fissures aux jonctions de matériaux** : joint souple ou pont d'armature, pour que le mouvement différentiel ne rouvre pas la fissure.\n- **Fissures évolutives** : témoins, puis orientation vers les professionnels concernés avant tout bouchage.\n\nUne fois traitées, les fissures sont intégrées dans l'[enduit](/prestations/enduit-facade-perpignan) ou la peinture d'ensemble pour qu'elles ne se voient plus.",
      },
      {
        title: "Ce que comprend l'intervention",
        content:
          "1. **Appel** : vous décrivez la fissure, son emplacement, sa taille, son ancienneté, et si elle bouge.\n2. **Visite** : examen des fissures, de l'enduit autour, des points d'eau, de l'environnement (arbres, terrain, extension récente) ; pose de témoins si nécessaire.\n3. **Devis écrit** : traitement par fissure, reprise d'enduit, finition d'ensemble ou locale.\n4. **Chantier** : ouverture, traitement, armature, reprise, séchage, puis finition raccordée à l'existant.\n5. **Fin de chantier** : abords nettoyés, conseils de surveillance.\n\nSi la fissure vient de l'eau (gouttière, remontée, appui mal conçu), nous traitons aussi la cause, sinon elle revient.",
      },
      {
        title: "Réparation locale ou ravalement",
        content:
          "Quelques fissures sur une façade saine se traitent localement, avec une peinture de raccord. Quand les fissures sont nombreuses, que l'enduit sonne creux par endroits ou que la façade est de toute façon à rafraîchir, la réparation locale laisse des traces visibles : il vaut mieux intégrer le traitement dans un [ravalement complet](/prestations/ravalement-facade-perpignan), avec [nettoyage](/prestations/nettoyage-facade-perpignan) et finition d'ensemble.\n\nNous vous proposons les deux options chiffrées quand les deux se défendent.",
      },
      {
        title: "Fissures de façade à Perpignan et dans le 66",
        content:
          `Nous intervenons à Perpignan et dans tout le département : ${ZONES} et les communes voisines. Les terrains argileux de la plaine et les épisodes de sécheresse puis de fortes pluies expliquent une bonne part des fissures que nous voyons ; les maisons sur terrain en pente et près de grands arbres sont aussi concernées.\n\nDécrivez-nous la fissure au téléphone, nous passons la voir et le devis écrit précède les travaux.`,
      },
    ],
    highlights: [
      "Diagnostic de la cause avant tout rebouchage",
      "Témoins posés sur les fissures qui semblent évoluer",
      "Armature, mastic ou agrafage selon le type de fissure",
      "Finition raccordée à l'existant, visite et devis écrit",
    ],
    faq: [
      { question: "Une fissure sur ma façade est-elle grave ?", answer: "Pas forcément : le faïençage et les microfissures sont des défauts d'enduit. Une fissure ouverte, en escalier ou traversante peut signaler un mouvement du bâti et mérite un diagnostic avant réparation. Nous vous disons à la visite dans quel cas vous êtes." },
      { question: "Peut-on simplement reboucher une fissure ?", answer: "Reboucher sans traiter revient à la voir réapparaître. Une fissure se nettoie, s'ouvre, se traite avec le produit et l'armature adaptés, puis se finit ; une fissure qui bouge se surveille d'abord." },
      { question: "Combien coûte la réparation d'une fissure de façade ?", answer: "Le prix dépend du nombre et du type de fissures, du traitement nécessaire, de la hauteur et de l'accès, et de l'étendue de la finition (locale ou façade entière). Le devis écrit détaille chaque poste après la visite." },
      { question: "Les fissures viennent-elles de la sécheresse ?", answer: "Souvent, oui, dans la plaine du Roussillon : les sols argileux se rétractent en été et gonflent en hiver, ce qui fait travailler les fondations. Dans ce cas, la réparation de façade s'accompagne d'une surveillance et parfois d'un avis sur les fondations." },
      { question: "Faut-il prévenir l'assurance ?", answer: "Pour des fissures importantes liées à la sécheresse, un dossier peut relever de la reconnaissance de catastrophe naturelle de votre commune ; renseignez-vous auprès de votre assureur et de la mairie avant les travaux. Nous ne nous substituons pas à eux." },
    ],
    links: [L.ravalement, L.enduit, L.peinture, L.nettoyage, CONTACT],
  },
];

const sb = getSupabase();
for (const p of pages) {
  const { data: existing } = await sb
    .from("seo_pages")
    .select("id, status")
    .eq("site_key", SITE)
    .eq("slug", p.slug)
    .maybeSingle();
  if (existing && existing.status === "published") {
    console.log("publiée, non touchée :", p.slug);
    continue;
  }
  const row = {
    site_key: SITE,
    slug: p.slug,
    city: "Perpignan",
    service: p.service,
    page_type: "service",
    intent: "service",
    mode: "local",
    status: "draft",
    h1: p.h1,
    meta_title: p.meta_title,
    meta_description: p.meta_description,
    content: {
      intro: p.intro,
      seoSections: p.sections,
      highlights: p.highlights,
      faq: p.faq,
      internalLinks: p.links,
      card: p.card,
      updatedDate: new Date().toISOString().slice(0, 10),
      brief: { source: "seed:facadier", note: "Rédigé au lancement, aucun fait client (prix, délai, qualification RGE, aide, ancienneté) — à valider avant publication" },
    },
  };
  const q = existing
    ? sb.from("seo_pages").update(row).eq("id", existing.id)
    : sb.from("seo_pages").insert(row);
  const { error } = await q;
  if (error) throw new Error(`${p.slug} : ${error.message}`);
  const words = [p.intro, ...p.sections.map((s) => s.content)].join(" ").split(/\s+/).length;
  console.log(existing ? "mis à jour" : "créé", p.slug, `~${words} mots`);
}
