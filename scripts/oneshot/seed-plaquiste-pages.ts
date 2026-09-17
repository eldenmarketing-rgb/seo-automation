/**
 * Brouillons des 5 pages prestation du site Plaquiste Perpignan (site_key plaquiste),
 * écrits pour des pages de destination Google Ads : besoin du visiteur, ce qui est
 * fait, déroulé, quand faire appel, FAQ, CTA. Aucun fait client (prix, délai,
 * garantie, qualification, ancienneté, aide financière) : tout est à valider
 * avant ajout.
 *
 * Statut `draft` — relecture et publication depuis le dashboard (/pages).
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-plaquiste-pages.ts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "plaquiste";
const CONTACT = { url: "/contact", anchor: "Demander un devis", context: "Décrivez votre projet, nous vous rappelons." };
const ZONES = "Cabestany, Canet-en-Roussillon, Saint-Estève, Rivesaltes, Toulouges, Le Soler, Pia, Saint-Laurent-de-la-Salanque";

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
  cloison: { url: "/prestations/cloison-placo-perpignan", anchor: "Cloisons placo", context: "Créer, séparer, redistribuer les pièces." },
  plafond: { url: "/prestations/faux-plafond-perpignan", anchor: "Faux plafonds", context: "Plafond suspendu, rampant, décaissé." },
  isolation: { url: "/prestations/isolation-interieure-perpignan", anchor: "Isolation intérieure", context: "Doublage des murs, isolation thermique et phonique." },
  combles: { url: "/prestations/amenagement-combles-perpignan", anchor: "Aménagement de combles", context: "Isoler et habiller les rampants." },
  finitions: { url: "/prestations/bandes-enduit-placo-perpignan", anchor: "Bandes et enduit", context: "Joints, bandes, enduit, ponçage : prêt à peindre." },
};

const pages: Page[] = [
  {
    slug: "prestations/cloison-placo-perpignan",
    h1: "Cloison placo Perpignan",
    meta_title: "Cloison placo Perpignan : créer ou séparer une pièce",
    meta_description:
      "Pose de cloisons en plaques de plâtre à Perpignan et alentours : chambre, bureau, salle de bain, cloison isolée ou phonique. Visite, métré et devis écrit avant chantier.",
    service: "Cloisons placo",
    card: {
      title: "Cloisons",
      tagline: "Créer, séparer, redistribuer les pièces",
      description: "Cloisons de distribution et de séparation en plaques de plâtre sur ossature métallique, isolées si besoin, prêtes à peindre.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: true,
    },
    intro:
      "Une chambre de plus pour un enfant, un bureau fermé dans le salon, une salle de bain à créer dans une grande pièce, un garage à séparer d'un atelier : la cloison en plaques de plâtre est le moyen le plus rapide et le plus propre de redessiner un logement sans toucher à la structure. Nous posons des cloisons à Perpignan et dans les communes voisines, de l'ossature à l'enduit, prêtes à recevoir la peinture.\n\nAppelez-nous, décrivez la pièce et ce que vous voulez en faire : nous passons mesurer sur place et vous recevez un devis écrit avant tout chantier.",
    sections: [
      {
        title: "Les projets que nous réalisons le plus souvent",
        content:
          "Une cloison ne sert pas qu'à séparer : elle crée des rangements, cache des réseaux, isole du bruit. Les demandes les plus fréquentes à Perpignan :\n\n- **Créer une chambre** dans un grand séjour ou une pièce trop vaste, avec porte et interrupteur.\n- **Fermer un bureau** pour le télétravail, avec une cloison phonique entre le bureau et la pièce de vie.\n- **Aménager une salle de bain ou une buanderie** : cloisons hydrofuges, passage des évacuations et de l'eau dans l'ossature.\n- **Séparer un garage, un atelier ou un cellier** de la partie habitée.\n- **Réduire un volume** trop grand à chauffer, ou créer un dressing en fond de chambre.\n- **Remplacer une cloison ancienne** en briques plâtrières ou en carreaux de plâtre fissurée ou abîmée.\n- **Poser un doublage** sur un mur existant, quand la cloison longe une façade froide : voir notre page [isolation intérieure](/prestations/isolation-interieure-perpignan).",
      },
      {
        title: "Ce que comprend la pose d'une cloison",
        content:
          "Une cloison en plaques de plâtre est un système complet, pas seulement des plaques vissées :\n\n- **Ossature métallique** : rails au sol et au plafond, montants verticaux à entraxe régulier, dimensionnés selon la hauteur de la pièce et ce que la cloison devra porter (meuble haut, lavabo, télévision).\n- **Renforts** aux endroits qui recevront une charge, et **huisserie** de la porte posée dans l'ossature.\n- **Plaques choisies selon la pièce** : standard pour une chambre, hydrofuge dans une salle de bain, haute dureté dans un couloir ou une entrée, plaques à performance acoustique entre deux pièces de vie.\n- **Isolant** dans l'épaisseur de la cloison quand vous cherchez du confort phonique : une cloison vide résonne, une cloison remplie de laine minérale atténue nettement les voix et la télévision.\n- **Passage des gaines électriques** et des réservations pour prises et interrupteurs, en coordination avec votre électricien.\n- **Bandes, enduit et ponçage** : la cloison est livrée lisse, [prête à peindre](/prestations/bandes-enduit-placo-perpignan).",
      },
      {
        title: "Comment se passe le chantier",
        content:
          "Le déroulé est le même pour chaque cloison, et nous vous l'expliquons au fur et à mesure :\n\n1. **Au téléphone**, vous décrivez la pièce, ce que vous voulez créer et l'état du logement (sol fini ou non, plafond, électricité).\n2. **Visite et métré** : nous relevons les dimensions, repérons les réseaux existants et les contraintes du bâti, et discutons de l'emplacement de la porte et des prises.\n3. **Devis écrit** détaillant l'ossature, les plaques, l'isolant, l'huisserie et la finition.\n4. **Chantier** : protection des sols et des meubles, pose de l'ossature, des plaques et de l'isolant, puis bandes et enduit en plusieurs passes avec temps de séchage.\n5. **Livraison** : ponçage, dépoussiérage, évacuation des chutes. Il vous reste la sous-couche et la peinture, ou nous vous mettons en relation avec un peintre.\n\nSi le projet demande aussi un [faux plafond](/prestations/faux-plafond-perpignan) ou un doublage, tout est chiffré dans le même devis.",
      },
      {
        title: "Quelle cloison pour quel usage",
        content:
          "Le choix de l'épaisseur et du type de plaque se fait à la visite, en fonction de l'usage de la pièce :\n\n- **Cloison de distribution simple** (72 mm environ) pour séparer deux espaces sans forte exigence acoustique : dressing, cellier, placard.\n- **Cloison isolée** (98 mm et plus) avec laine minérale pour une chambre, un bureau ou tout ce qui touche une pièce de vie.\n- **Cloison hydrofuge** dans les pièces humides, complétée d'un système d'étanchéité sous le carrelage de la douche.\n- **Cloison haute dureté** dans les passages, les entrées et les chambres d'enfants, plus résistante aux chocs.\n- **Cloison à double ossature** quand le bruit est la priorité : deux ossatures désolidarisées et deux couches de plaques de chaque côté.\n\nNous vous conseillons la solution qui correspond au besoin réel, pas la plus chère.",
      },
      {
        title: "Cloisons à Perpignan et dans les communes voisines",
        content:
          `Nous intervenons à Perpignan et alentours : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous, nous vous répondons tout de suite.\n\nUne cloison s'accompagne souvent d'un [faux plafond](/prestations/faux-plafond-perpignan) pour refermer le volume, ou d'une [isolation des murs](/prestations/isolation-interieure-perpignan) quand la nouvelle pièce longe une façade. Dans tous les cas, un devis écrit précède les travaux.`,
      },
    ],
    highlights: [
      "Ossature métallique dimensionnée pour la hauteur et les charges",
      "Plaque adaptée à chaque pièce : standard, hydrofuge, phonique, haute dureté",
      "Livrée lisse, prête à peindre",
      "Visite, métré et devis écrit avant chantier",
    ],
    faq: [
      { question: "Combien coûte une cloison en placo ?", answer: "Le prix dépend de la surface, de la hauteur, du type de plaque, de l'isolant, de la présence d'une porte et du niveau de finition. Nous mesurons sur place et le devis écrit détaille chaque poste avant le chantier." },
      { question: "Combien de temps dure la pose d'une cloison ?", answer: "La pose de l'ossature et des plaques va vite ; ce sont les passes d'enduit et leurs temps de séchage qui rythment le chantier. La durée prévue figure sur le devis." },
      { question: "Peut-on accrocher un meuble lourd ou une télévision sur une cloison placo ?", answer: "Oui, à condition de le prévoir : nous posons des renforts dans l'ossature aux endroits que vous nous indiquez à la visite. Sur une cloison existante, des fixations adaptées aux plaques permettent aussi des charges raisonnables." },
      { question: "Faut-il une autorisation pour créer une cloison ?", answer: "Une cloison intérieure ne modifie ni la structure ni la façade. En copropriété, le règlement peut demander une information du syndic ; nous vous le signalons si votre situation le justifie." },
      { question: "Faites-vous aussi l'électricité et la peinture ?", answer: "Nous passons les gaines et prévoyons les réservations, mais le raccordement électrique et la peinture relèvent d'autres métiers. Nous nous coordonnons avec vos artisans, ou nous vous en recommandons." },
    ],
    links: [L.plafond, L.isolation, L.finitions, CONTACT],
  },

  {
    slug: "prestations/faux-plafond-perpignan",
    h1: "Faux plafond Perpignan",
    meta_title: "Faux plafond Perpignan : plafond suspendu en plaques de plâtre",
    meta_description:
      "Pose de faux plafond à Perpignan et alentours : plafond suspendu, rampant, décaissé, spots intégrés et isolation. Visite, métré et devis écrit avant chantier.",
    service: "Faux plafonds",
    card: {
      title: "Faux plafonds",
      tagline: "Plafond suspendu, rampant, décaissé",
      description: "Plafonds suspendus en plaques de plâtre sur ossature, intégration des spots et des trappes, isolation dans le plénum.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: true,
    },
    intro:
      "Un plafond fissuré ou taché, des gaines de climatisation à cacher, des spots à encastrer, une pièce trop haute et difficile à chauffer, un plafond de garage ou de combles à fermer : le faux plafond en plaques de plâtre répond à tout cela en un seul chantier. Nous posons des plafonds suspendus à Perpignan et dans les communes voisines, avec l'isolation et les réservations pour l'éclairage.\n\nAppelez-nous, décrivez la pièce et ce qui vous gêne : nous passons voir, nous mesurons, et vous recevez un devis écrit avant tout chantier.",
    sections: [
      {
        title: "Pourquoi poser un faux plafond",
        content:
          "Le faux plafond est d'abord une réponse pratique. Les raisons les plus fréquentes à Perpignan :\n\n- **Cacher des réseaux** : gaines de climatisation, VMC, câbles électriques, tuyaux passés en apparent.\n- **Encastrer des spots** ou des luminaires sans saignée dans le plafond d'origine.\n- **Isoler** une pièce sous toiture ou sous des combles perdus, pour la fraîcheur en été et la chaleur en hiver.\n- **Rénover un plafond abîmé** : fissures, plâtre qui se décolle, anciennes dalles, lambris démodé.\n- **Réduire la hauteur** d'une pièce trop haute, plus facile à chauffer et plus agréable à vivre.\n- **Améliorer l'acoustique** entre deux niveaux, quand le bruit du dessus ou du dessous gêne.\n- **Fermer un volume** créé par une nouvelle [cloison](/prestations/cloison-placo-perpignan).",
      },
      {
        title: "Les types de plafonds que nous posons",
        content:
          "Le bon système dépend de la pièce, de la hauteur disponible et de ce que le plafond doit accueillir :\n\n- **Plafond suspendu sur ossature métallique** : suspentes fixées au plafond existant ou aux solives, fourrures, plaques de plâtre. Le plus courant, adapté à toutes les pièces.\n- **Plafond rampant** sous toiture, dans les [combles aménagés](/prestations/amenagement-combles-perpignan) ou une pièce mansardée : plaques fixées sur une ossature suivant la pente, avec isolant et pare-vapeur.\n- **Décaissé ou soffite** : retombée de plafond localisée pour intégrer un éclairage indirect, une gaine ou marquer un espace (cuisine ouverte, tête de lit).\n- **Plafond hydrofuge** en salle de bain, plaques résistantes à l'humidité.\n- **Plafond acoustique** avec plaques à performance phonique et laine minérale, entre deux logements ou sous une pièce bruyante.\n- **Trappe de visite** intégrée pour accéder aux réseaux ou aux combles.",
      },
      {
        title: "Ce que comprend la pose",
        content:
          "Un plafond suspendu est un ouvrage complet :\n\n- **Relevé de niveau** au laser pour un plafond parfaitement plan, même sur un support irrégulier.\n- **Ossature** : suspentes, fourrures, rails périphériques, entraxes adaptés au poids des plaques et de l'isolant.\n- **Isolant** dans le plénum quand la pièce est sous toiture ou sous combles perdus, pare-vapeur si nécessaire.\n- **Réservations** pour les spots, les luminaires, les bouches de VMC et de climatisation, en coordination avec votre électricien ou votre climaticien.\n- **Plaques** vissées, puis **bandes, enduit et ponçage** : le plafond est livré lisse, [prêt à peindre](/prestations/bandes-enduit-placo-perpignan).\n\nLes joints d'un plafond sont les plus exposés à la lumière rasante : nous soignons particulièrement les passes d'enduit et le ponçage.",
      },
      {
        title: "Comment se passe le chantier",
        content:
          "1. **Appel** : vous décrivez la pièce, sa hauteur, ce que le plafond doit cacher ou accueillir.\n2. **Visite et métré** : contrôle du support existant, repérage des réseaux, choix de la hauteur finale et de l'emplacement des spots.\n3. **Devis écrit** détaillant l'ossature, l'isolant, les plaques, les réservations et la finition.\n4. **Chantier** : protection de la pièce, pose de l'ossature et de l'isolant, passage des gaines par les autres corps de métier, fermeture par les plaques, enduit en plusieurs passes.\n5. **Livraison** : ponçage, dépoussiérage, chutes évacuées. Il reste la peinture et la pose des luminaires.\n\nQuand le plafond fait partie d'une rénovation plus large, cloisons et doublages sont chiffrés dans le même devis.",
      },
      {
        title: "Faux plafonds à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous, nous vous répondons tout de suite.\n\nUn faux plafond isolé change le confort d'une pièce sous toiture ; pour les murs qui donnent sur l'extérieur, voyez aussi notre [isolation intérieure](/prestations/isolation-interieure-perpignan). Un devis écrit précède toujours les travaux.`,
      },
    ],
    highlights: [
      "Plafond plan, relevé au laser sur tout support",
      "Spots, VMC et climatisation intégrés dès la conception",
      "Isolation dans le plénum sous toiture ou combles perdus",
      "Visite, métré et devis écrit avant chantier",
    ],
    faq: [
      { question: "Combien de hauteur perd-on avec un faux plafond ?", answer: "Cela dépend de l'irrégularité du plafond existant, de l'épaisseur de l'isolant et de la hauteur des spots à encastrer. La hauteur finale est fixée avec vous à la visite, avant le devis." },
      { question: "Peut-on poser un faux plafond sur un plafond fissuré ?", answer: "Oui, c'est même l'un des cas les plus fréquents : le plafond suspendu est fixé au support ou aux solives et cache les fissures sans reprise du plâtre d'origine, à condition que le support tienne, ce que nous vérifions sur place." },
      { question: "Le faux plafond isole-t-il du bruit de l'étage ?", answer: "Il l'atténue, surtout avec une laine minérale dans le plénum et des plaques à performance acoustique. Les bruits d'impact (pas, chaises) demandent en plus un traitement côté étage ; nous vous disons ce qui est réaliste." },
      { question: "Combien coûte un faux plafond ?", answer: "Le prix dépend de la surface, de la hauteur de la pièce, de l'isolant, du nombre de spots et de trappes, et de la finition. Le devis écrit est établi après la visite." },
      { question: "Faites-vous le raccordement des spots ?", answer: "Nous posons les réservations et laissons le passage aux gaines ; le raccordement électrique relève de votre électricien, avec lequel nous nous coordonnons." },
    ],
    links: [L.cloison, L.isolation, L.combles, CONTACT],
  },

  {
    slug: "prestations/isolation-interieure-perpignan",
    h1: "Isolation intérieure Perpignan",
    meta_title: "Isolation intérieure Perpignan : doublage des murs, thermique et phonique",
    meta_description:
      "Isolation par l'intérieur à Perpignan et alentours : doublage des murs sur ossature ou collé, isolation thermique et phonique, plaques prêtes à peindre. Devis écrit avant chantier.",
    service: "Isolation intérieure",
    card: {
      title: "Isolation & doublage",
      tagline: "Doublage des murs, isolation thermique et phonique",
      description: "Doublage collé ou sur ossature avec isolant, pour gagner en confort l'hiver comme l'été et réduire les bruits.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: true,
    },
    intro:
      "Un mur froid au toucher en hiver, une chambre étouffante l'été, de la condensation dans les angles, les voisins ou la rue que l'on entend trop : dans un logement ancien de Perpignan, le doublage des murs par l'intérieur est souvent le geste qui change le plus le confort, sans toucher à la façade. Nous posons des doublages isolants à Perpignan et dans les communes voisines, livrés lisses et prêts à peindre.\n\nAppelez-nous, décrivez les pièces et ce qui vous gêne : nous passons voir, nous mesurons, et vous recevez un devis écrit avant tout chantier.",
    sections: [
      {
        title: "Les signes qu'un mur mérite un doublage",
        content:
          "Certains symptômes reviennent dans presque tous les appels :\n\n- **Paroi froide** : le mur donnant sur l'extérieur est nettement plus froid que les autres, la pièce semble impossible à chauffer.\n- **Chaleur l'été** : mur exposé plein sud ou ouest qui restitue la chaleur le soir, chambre invivable en juillet.\n- **Condensation et moisissures** dans les angles ou derrière les meubles, signe d'une paroi froide et mal isolée.\n- **Bruits** de la rue, du voisin mitoyen ou de la cage d'escalier.\n- **Mur abîmé** : plâtre soufflé, fissures, ancien papier peint impossible à retirer proprement, que le doublage recouvre en une seule opération.\n- **Rénovation** d'une pièce où l'on refait de toute façon l'électricité et la peinture : c'est le bon moment.",
      },
      {
        title: "Doublage collé ou sur ossature",
        content:
          "Deux techniques, choisies à la visite selon le mur et l'objectif :\n\n- **Doublage collé** : un complexe plaque de plâtre + isolant, collé directement sur le mur. Rapide, peu d'épaisseur perdue, adapté à un mur plan et sain. Bien pour le thermique, moins pour le phonique.\n- **Doublage sur ossature** : montants métalliques désolidarisés du mur, isolant en laine minérale ou biosourcée entre les montants, plaque de plâtre devant. Rattrape un mur irrégulier, laisse passer les gaines électriques, et offre les meilleures performances phoniques.\n\nDans les deux cas, la plaque est adaptée à la pièce (hydrofuge en salle de bain, haute dureté dans les passages) et le doublage est livré avec [bandes et enduit](/prestations/bandes-enduit-placo-perpignan), prêt à peindre.",
      },
      {
        title: "Isolants et performances",
        content:
          "Le choix de l'isolant et de son épaisseur se fait selon la place disponible et le résultat recherché :\n\n- **Laine de verre** : le rapport performance / épaisseur / coût le plus courant, bon comportement thermique et acoustique.\n- **Laine de roche** : plus dense, appréciée pour le phonique et la tenue au feu.\n- **Isolants biosourcés** (fibre de bois, chanvre, ouate) : bon déphasage pour le confort d'été, intéressant sur les murs exposés au soleil.\n- **Polystyrène ou polyuréthane** en doublage collé : peu d'épaisseur, très bon thermique, faible apport phonique.\n\nNous vous indiquons la résistance thermique obtenue pour chaque option et l'épaisseur totale perdue dans la pièce, pour décider en connaissance de cause. Un **pare-vapeur** est posé quand la configuration du mur le demande, pour éviter la condensation dans l'isolant.",
      },
      {
        title: "Isolation phonique entre pièces et entre logements",
        content:
          "Quand le problème est le bruit plutôt que le froid, la réponse est différente : ossature désolidarisée, laine de roche ou laine de verre dense, plaques à performance acoustique, parfois deux couches de plaques. Un mur mitoyen avec un voisin, une chambre contre le salon, un bureau contre la cuisine : le doublage phonique atténue les voix, la télévision et la musique.\n\nNous sommes honnêtes sur les limites : les bruits d'impact venant de l'étage passent par le plancher et se traitent autrement, éventuellement par un [faux plafond acoustique](/prestations/faux-plafond-perpignan). Nous vous disons à la visite ce que le doublage réglera et ce qu'il ne réglera pas.",
      },
      {
        title: "Comment se passe le chantier",
        content:
          "1. **Appel** : vous décrivez les pièces, l'exposition des murs et ce qui vous gêne (froid, chaleur, bruit, humidité).\n2. **Visite et métré** : état des murs, recherche d'une éventuelle cause d'humidité à traiter avant, épaisseur disponible, réseaux à déplacer.\n3. **Devis écrit** par pièce : technique, isolant, épaisseur, plaques, finition.\n4. **Chantier** : protection, dépose des plinthes et de l'appareillage, pose de l'ossature ou collage, isolant, plaques, bandes et enduit.\n5. **Livraison** : ponçage, dépoussiérage, chutes évacuées. Il reste la peinture et la repose des prises par votre électricien.",
      },
      {
        title: "Isolation intérieure à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nLe doublage des murs se combine souvent avec l'[aménagement de combles](/prestations/amenagement-combles-perpignan) ou un faux plafond isolé sous toiture. Tout est chiffré dans un même devis écrit avant les travaux.`,
      },
    ],
    highlights: [
      "Technique choisie à la visite : collé ou sur ossature",
      "Résistance thermique et épaisseur annoncées pour chaque option",
      "Phonique traité avec ossature désolidarisée et plaques acoustiques",
      "Visite, métré et devis écrit avant chantier",
    ],
    faq: [
      { question: "Combien d'épaisseur perd-on dans la pièce ?", answer: "De quelques centimètres en doublage collé mince à une dizaine et plus en ossature avec isolant épais. Nous vous donnons l'épaisseur exacte de chaque option à la visite, pour arbitrer entre surface et performance." },
      { question: "Le doublage règle-t-il un problème d'humidité ?", answer: "Il règle la condensation due à une paroi froide. Une infiltration ou une remontée capillaire doit être traitée avant : un doublage posé sur un mur qui prend l'eau enfermerait l'humidité. Nous le vérifions à la visite et vous le disons franchement." },
      { question: "Faut-il refaire l'électricité ?", answer: "Les prises et interrupteurs des murs doublés sont déplacés en façade du doublage. Le passage des gaines se fait dans l'ossature ; le raccordement relève de votre électricien, avec qui nous nous coordonnons." },
      { question: "Combien coûte une isolation par l'intérieur ?", answer: "Le prix dépend de la surface de mur, de la technique, de l'isolant et de son épaisseur, des reprises d'électricité et de la finition. Le devis écrit est établi après la visite, pièce par pièce." },
      { question: "Peut-on isoler une seule pièce ?", answer: "Oui. Beaucoup de chantiers portent sur une chambre exposée ou un salon sur rue. Isoler les murs qui posent problème est souvent plus raisonnable que tout reprendre." },
    ],
    links: [L.combles, L.plafond, L.cloison, CONTACT],
  },

  {
    slug: "prestations/amenagement-combles-perpignan",
    h1: "Aménagement de combles Perpignan",
    meta_title: "Aménagement de combles Perpignan : isolation et plaques de plâtre",
    meta_description:
      "Aménagement de combles à Perpignan et alentours : isolation des rampants, plafonds et cloisons en plaques de plâtre, trappes et rangements sous pente. Visite, métré et devis écrit.",
    service: "Aménagement de combles",
    card: {
      title: "Combles",
      tagline: "Isoler et habiller les rampants",
      description: "Isolation des rampants, plaques de plâtre, cloisons et trappes : des combles perdus deviennent une pièce à vivre.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: true,
    },
    intro:
      "Une chambre supplémentaire, un bureau au calme, une salle de jeux : les combles sont souvent la surface la moins chère à gagner dans une maison, à condition de bien les isoler, car sous une toiture du Roussillon l'été se fait sentir autant que l'hiver. Nous réalisons la partie plâtrerie et isolation de l'aménagement de combles à Perpignan et dans les communes voisines : rampants, pignons, plafonds, cloisons, trappes et rangements sous pente.\n\nAppelez-nous, décrivez vos combles et le projet : nous passons vérifier la faisabilité sur place, nous mesurons, et vous recevez un devis écrit avant tout chantier.",
    sections: [
      {
        title: "Ce qui rend des combles habitables",
        content:
          "Avant de parler d'isolation et de plaques, quelques conditions se vérifient sur place :\n\n- **La hauteur sous faîtage** et la pente du toit : elles déterminent la surface réellement exploitable debout.\n- **La charpente** : une charpente traditionnelle laisse le volume libre ; des fermettes industrielles demandent une modification par un charpentier avant tout aménagement.\n- **Le plancher** : il doit supporter une pièce à vivre, avec un accès par un escalier plutôt qu'une échelle.\n- **La lumière et la ventilation** : fenêtres de toit ou lucarnes, posées par un couvreur.\n- **Les réseaux** : électricité, chauffage, parfois eau si une salle d'eau est prévue.\n\nNous vous disons franchement à la visite ce qui relève de nous et ce qui demande d'autres corps de métier, et dans quel ordre intervenir.",
      },
      {
        title: "Ce que fait le plaquiste dans vos combles",
        content:
          "Notre partie commence quand la structure et les ouvertures sont prêtes, et elle fait la différence entre un grenier et une pièce :\n\n- **Isolation des rampants** : laine minérale ou biosourcée entre et sous les chevrons, souvent en deux couches croisées pour supprimer les ponts thermiques, avec **pare-vapeur** continu côté intérieur.\n- **Isolation des pignons** et des murs donnant sur l'extérieur, comme un [doublage intérieur](/prestations/isolation-interieure-perpignan).\n- **Ossature métallique** suivant les rampants et les parties droites, réglée pour des surfaces planes.\n- **Plaques de plâtre** sur rampants, plafonds et pieds-droits, hydrofuges dans une salle d'eau.\n- **Cloisons** pour découper le volume en chambres, placards ou salle de bain.\n- **Trappes** d'accès aux parties non aménagées et aux réseaux, **rangements sous pente** fermés par des cloisons basses.\n- **Bandes, enduit et ponçage** : les combles sont livrés lisses, [prêts à peindre](/prestations/bandes-enduit-placo-perpignan).",
      },
      {
        title: "Isoler pour l'hiver et pour l'été",
        content:
          "Sous une toiture exposée au soleil du Roussillon, l'isolation des rampants doit autant retenir la chaleur l'hiver que la ralentir l'été. Deux éléments comptent :\n\n- **L'épaisseur et la résistance thermique** de l'isolant, que nous annonçons pour chaque option.\n- **Le déphasage**, c'est-à-dire le temps que met la chaleur de la toiture à traverser l'isolant : les isolants denses et biosourcés (fibre de bois, ouate de cellulose) retardent l'arrivée de la chaleur jusqu'au soir, quand la nuit rafraîchit.\n\nUne lame d'air ventilée sous la couverture et un pare-vapeur bien posé évitent la condensation dans l'isolant. Nous vous proposons les options avec leurs performances, leur épaisseur et leur coût, pour choisir en connaissance de cause.",
      },
      {
        title: "Comment se passe le chantier",
        content:
          "1. **Appel** : vous décrivez les combles (accès, hauteur, type de charpente, plancher) et le projet.\n2. **Visite** : vérification de la faisabilité, relevé des surfaces, repérage des réseaux à passer, ordre d'intervention avec les autres artisans si nécessaire.\n3. **Devis écrit** par poste : isolation, ossature, plaques, cloisons, trappes, finition.\n4. **Chantier** : après la charpente, les fenêtres de toit et le passage des gaines, pose de l'isolant et du pare-vapeur, de l'ossature, des plaques et des cloisons, puis enduit en plusieurs passes.\n5. **Livraison** : ponçage, dépoussiérage, chutes évacuées. Il reste la peinture, le sol et le raccordement des équipements.",
      },
      {
        title: "Aménagement de combles à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nSi votre projet se limite à fermer un plafond sous toiture ou à créer une pièce à l'étage, voyez aussi nos [faux plafonds](/prestations/faux-plafond-perpignan) et nos [cloisons](/prestations/cloison-placo-perpignan). Un devis écrit précède toujours les travaux.`,
      },
    ],
    highlights: [
      "Faisabilité vérifiée sur place avant le devis",
      "Rampants isolés en deux couches avec pare-vapeur continu",
      "Confort d'été pris en compte dans le choix de l'isolant",
      "Cloisons, trappes et rangements sous pente compris",
    ],
    faq: [
      { question: "Mes combles sont-ils aménageables ?", answer: "Cela dépend de la hauteur sous faîtage, de la pente, du type de charpente et du plancher. Nous le vérifions à la visite et vous disons ce qui est possible, et ce qui demanderait d'abord un charpentier." },
      { question: "Combien coûte un aménagement de combles ?", answer: "Le prix dépend de la surface de rampants et de murs à isoler, de l'isolant choisi, du nombre de cloisons et de trappes, et de la finition. Notre devis écrit couvre la plâtrerie et l'isolation ; la charpente, les fenêtres de toit, l'électricité et le sol sont chiffrés par les artisans concernés." },
      { question: "Faut-il une déclaration en mairie ?", answer: "Créer de la surface habitable ou poser une fenêtre de toit peut nécessiter une déclaration préalable ou un permis selon la surface et la commune. Renseignez-vous auprès du service urbanisme de votre mairie avant le début des travaux." },
      { question: "Est-ce que l'on peut isoler sans tout casser ?", answer: "Si les combles ont déjà des plaques, il faut les déposer pour reprendre l'isolant et le pare-vapeur correctement. Sur des combles bruts, rien n'est à casser : l'isolant se pose directement sous les chevrons." },
      { question: "Combien de temps dure le chantier ?", answer: "Cela dépend de la surface, du nombre de cloisons et des temps de séchage de l'enduit. La durée prévue de notre intervention figure sur le devis, et nous nous calons avec vos autres artisans." },
    ],
    links: [L.isolation, L.plafond, L.cloison, CONTACT],
  },

  {
    slug: "prestations/bandes-enduit-placo-perpignan",
    h1: "Bandes et enduit placo Perpignan",
    meta_title: "Bandes et enduit placo Perpignan : finition prête à peindre",
    meta_description:
      "Bandes à joints, enduit et ponçage de plaques de plâtre à Perpignan et alentours : finition prête à peindre, reprise de fissures et de joints visibles. Devis écrit avant chantier.",
    service: "Bandes et enduit",
    card: {
      title: "Finitions",
      tagline: "Joints, bandes, enduit, ponçage",
      description: "Traitement des joints, bandes armées, enduit et ponçage pour un support lisse, prêt à peindre.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: false,
    },
    intro:
      "Des plaques posées mais des joints encore apparents, un plafond dont les bandes se voient à la lumière rasante, des fissures qui reviennent le long des joints, un placo posé soi-même qu'il faut finir avant le peintre : la finition est l'étape qui décide de l'aspect final d'un mur en plaques de plâtre. Nous réalisons bandes, enduit et ponçage à Perpignan et dans les communes voisines, sur nos propres chantiers comme sur des plaques déjà posées.\n\nAppelez-nous, décrivez les surfaces et leur état : nous passons voir, nous mesurons, et vous recevez un devis écrit avant tout chantier.",
    sections: [
      {
        title: "Quand faire appel à nous pour la finition",
        content:
          "Les situations les plus fréquentes :\n\n- **Plaques posées par vous-même** ou par un proche : l'ossature et les plaques tiennent, mais les joints demandent une main exercée.\n- **Chantier laissé sans finition** par un autre intervenant, ou plaques posées par un autre corps de métier (menuisier, électricien) en attente de bandes.\n- **Joints visibles** après peinture : bandes qui marquent, enduit trop mince ou mal poncé, surtout au plafond en lumière rasante.\n- **Fissures récurrentes** le long des joints ou dans les angles.\n- **Reprise avant vente ou mise en location**, pour des murs nets avant la peinture.\n- **Préparation d'un mur** pour un revêtement exigeant : peinture satinée ou brillante, papier peint fin, qui révèlent le moindre défaut.",
      },
      {
        title: "Les niveaux de finition",
        content:
          "La finition d'un ouvrage en plaques de plâtre se décrit par niveaux, du plus simple au plus soigné, et le bon niveau dépend de ce qui recouvrira le mur :\n\n- **Joints simplement traités** : suffisant derrière un carrelage ou un lambris.\n- **Joints et vis enduits, surface prête pour une peinture mate ou un papier peint épais** : le niveau courant des pièces d'habitation.\n- **Enduit tiré sur toute la surface**, ponçage fin : pour une peinture satinée, un plafond très éclairé, un mur recevant de la lumière rasante.\n\nNous vous conseillons le niveau adapté au revêtement prévu, sans surfacturer une finition inutile ni livrer un mur qui marquera sous la peinture.",
      },
      {
        title: "Ce que comprend notre intervention",
        content:
          "- **Contrôle du support** : vis enfoncées au bon niveau, plaques bien fixées, joints réguliers. Nous reprenons ce qui doit l'être avant d'enduire.\n- **Bandes à joints** : bande papier ou bande armée selon l'endroit, cueillies (jonction mur / plafond), angles sortants protégés par des cornières.\n- **Enduit en plusieurs passes** avec temps de séchage entre chaque, en élargissant à chaque fois pour fondre le joint dans la surface.\n- **Traitement des têtes de vis**, des angles et des raccords avec l'existant.\n- **Ponçage et dépoussiérage** : le mur est livré lisse et propre, prêt pour la sous-couche.\n\nSur nos propres chantiers de [cloisons](/prestations/cloison-placo-perpignan), de [faux plafonds](/prestations/faux-plafond-perpignan) ou de [doublages](/prestations/isolation-interieure-perpignan), cette finition est comprise dans le devis.",
      },
      {
        title: "Fissures et joints qui reviennent",
        content:
          "Une fissure le long d'un joint a une cause : plaques mal fixées, ossature qui bouge, bande absente ou mal collée, angle sans renfort, ou mouvement du bâti. Reboucher sans traiter la cause fait revenir la fissure au premier été. Nous ouvrons le joint, contrôlons la fixation et l'ossature, posons une bande armée si nécessaire, puis reprenons l'enduit sur une largeur suffisante pour que la réparation soit invisible une fois peinte.\n\nSi la fissure vient d'un mouvement de structure, nous vous le disons : ce n'est plus une question de finition.",
      },
      {
        title: "Bandes et enduit à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nUn petit chantier de finition se planifie comme les autres : visite, devis écrit, puis intervention en plusieurs passages courts pour respecter les temps de séchage.`,
      },
    ],
    highlights: [
      "Sur nos chantiers comme sur des plaques déjà posées",
      "Niveau de finition adapté au revêtement prévu",
      "Fissures traitées à la cause, pas seulement rebouchées",
      "Livré lisse, dépoussiéré, prêt pour la sous-couche",
    ],
    faq: [
      { question: "Combien de passes d'enduit faut-il ?", answer: "Généralement deux à trois, avec un temps de séchage entre chacune. Le nombre dépend du niveau de finition visé et de la régularité des plaques posées." },
      { question: "Pouvez-vous finir un placo que j'ai posé moi-même ?", answer: "Oui, c'est une demande courante. Nous contrôlons d'abord la fixation et l'ossature, reprenons ce qui doit l'être, puis réalisons bandes, enduit et ponçage." },
      { question: "Peut-on peindre directement après votre passage ?", answer: "Oui, après une sous-couche adaptée aux plaques de plâtre. Le mur est livré poncé et dépoussiéré ; la sous-couche uniformise l'absorption avant la peinture de finition." },
      { question: "Combien coûte la finition d'un placo ?", answer: "Le prix dépend de la surface, de l'état des plaques posées, du niveau de finition demandé et du nombre d'angles et de raccords. Le devis écrit est établi après la visite." },
      { question: "Faites-vous la peinture ?", answer: "Non, nous nous arrêtons à la surface prête à peindre. Nous pouvons vous recommander un peintre, ou nous coordonner avec le vôtre." },
    ],
    links: [L.cloison, L.plafond, L.isolation, CONTACT],
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
      brief: { source: "seed:plaquiste-ads", note: "Rédigé pour Google Ads, aucun fait client (prix, délai, qualification, aide) — à valider avant publication" },
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
