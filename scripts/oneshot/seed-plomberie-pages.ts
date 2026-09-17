/**
 * Brouillons des 6 pages prestation du site Plombier Perpignan (site_key plomberie),
 * écrits pour des pages de destination Google Ads : besoin du visiteur (souvent en
 * urgence), ce qui est fait, déroulé, quand faire appel, FAQ, CTA. Aucun fait client
 * (prix, délai d'intervention, disponibilité soir / week-end, garantie, qualification,
 * ancienneté) : tout est à valider avant ajout.
 *
 * Statut `draft` — relecture et publication depuis le dashboard (/pages?site=plomberie).
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-plomberie-pages.ts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "plomberie";
const CONTACT = { url: "/contact", anchor: "Nous écrire", context: "Décrivez le problème, nous vous rappelons." };
const ZONES = "Cabestany, Canet-en-Roussillon, Saint-Estève, Bompas, Saleilles, Toulouges, Pollestres, Saint-Cyprien";

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
  recherche: { url: "/prestations/recherche-de-fuite-perpignan", anchor: "Recherche de fuite", context: "Localiser une fuite invisible avant d'ouvrir." },
  debouchage: { url: "/prestations/debouchage-canalisation-perpignan", anchor: "Débouchage canalisation", context: "Évier, douche, WC, colonne, regard." },
  fuite: { url: "/prestations/reparation-fuite-eau-perpignan", anchor: "Réparation de fuite d'eau", context: "Robinet, raccord, tuyau, flexible, joint." },
  chauffeEau: { url: "/prestations/depannage-chauffe-eau-perpignan", anchor: "Dépannage chauffe-eau", context: "Plus d'eau chaude, fuite au ballon, remplacement." },
  wc: { url: "/prestations/depannage-wc-perpignan", anchor: "Dépannage WC", context: "WC bouché, chasse d'eau qui fuit, mécanisme." },
  sanitaire: { url: "/prestations/installation-sanitaire-perpignan", anchor: "Installation sanitaire", context: "Robinetterie, lavabo, douche, WC, lave-linge." },
};

const pages: Page[] = [
  {
    slug: "prestations/recherche-de-fuite-perpignan",
    h1: "Recherche de fuite Perpignan",
    meta_title: "Recherche de fuite Perpignan : localiser sans tout casser",
    meta_description:
      "Fuite invisible, compteur qui tourne, tache au plafond, humidité : recherche de fuite à Perpignan et alentours, localisation avant toute ouverture, réparation et compte rendu. Tarif annoncé avant d'intervenir.",
    service: "Recherche de fuite",
    card: {
      title: "Recherche de fuite",
      tagline: "Localiser la fuite sans tout casser",
      description: "Fuite invisible, compteur qui tourne, tache au plafond, humidité : nous localisons l'origine avant toute ouverture, puis nous réparons.",
      badges: ["Perpignan et alentours", "Tarif annoncé avant"],
      featured: true,
    },
    intro:
      "Une facture d'eau qui grimpe sans raison, un compteur qui tourne quand tout est fermé, une tache qui s'élargit au plafond, un mur qui reste humide, un carrelage qui sonne creux : l'eau fuit quelque part, mais on ne voit pas où. Ouvrir au hasard coûte cher et abîme le logement. Nous recherchons les fuites à Perpignan et dans les communes voisines, nous localisons l'origine avant toute ouverture, puis nous réparons.\n\nAppelez-nous et décrivez ce que vous observez : nous fixons un créneau, nous cherchons sur place et nous vous annonçons le tarif avant d'intervenir.",
    sections: [
      {
        title: "Les signes qui doivent alerter",
        content:
          "Une fuite cachée se manifeste rarement par une flaque. Les indices les plus fréquents à Perpignan :\n\n- **Le compteur tourne** alors que tous les robinets sont fermés et qu'aucun appareil ne fonctionne.\n- **La facture d'eau augmente** sans changement d'habitudes.\n- **Une tache ou une auréole** apparaît au plafond ou en haut d'un mur, souvent sous une salle de bain ou près d'une colonne.\n- **De l'humidité persistante**, une odeur de moisi, une peinture qui cloque, un papier peint qui se décolle.\n- **Un bruit d'écoulement** dans un mur ou sous un sol quand tout est à l'arrêt.\n- **Un carrelage ou un parquet** qui se soulève, se déforme ou sonne creux.\n- **Une chaudière ou un chauffe-eau** qui perd de la pression ou dont le groupe de sécurité coule sans arrêt.\n\nUn seul de ces signes justifie un appel : plus la fuite dure, plus les dégâts s'étendent.",
      },
      {
        title: "Comment nous localisons la fuite",
        content:
          "Chercher une fuite, c'est éliminer les hypothèses une par une avant de toucher au bâti :\n\n- **Test au compteur** : tout fermé, le compteur doit être immobile. S'il tourne, la fuite est sur le réseau sous pression (arrivée d'eau) ; s'il est immobile, elle vient d'une évacuation, d'un appareil ou d'une infiltration.\n- **Mise en pression par tronçon** : nous isolons les circuits (eau froide, eau chaude, chauffage) pour savoir lequel perd.\n- **Écoute électro-acoustique** : un capteur amplifie le bruit de l'eau qui s'échappe dans une canalisation encastrée.\n- **Gaz traceur** : sur un réseau vidé, un gaz inoffensif est injecté et détecté à l'endroit où il ressort.\n- **Caméra thermique** : une canalisation d'eau chaude qui fuit laisse une signature de température dans le mur ou le sol.\n- **Colorant** et **inspection caméra des évacuations** quand la fuite vient d'une canalisation d'eaux usées ou d'un joint de douche.\n\nLa méthode dépend du cas ; l'objectif est toujours le même : ouvrir au bon endroit, une seule fois.",
      },
      {
        title: "Ce que comprend notre intervention",
        content:
          "1. **Au téléphone**, vous décrivez les signes, leur emplacement et depuis quand ils sont apparus. Si de l'eau coule, nous vous indiquons comment couper l'arrivée.\n2. **Sur place**, nous menons la recherche avec les moyens adaptés et nous vous montrons l'emplacement trouvé.\n3. **Tarif annoncé** pour la réparation, une fois la fuite localisée et la pièce identifiée.\n4. **Réparation** : remplacement du raccord, du tronçon de tuyau, du joint ou de la pièce d'appareil en cause. Voir notre page [réparation de fuite d'eau](/prestations/reparation-fuite-eau-perpignan).\n5. **Compte rendu écrit** de la localisation et de la réparation, utile pour votre dossier d'assurance.\n\nSi la fuite vient d'un appareil (chauffe-eau, WC, lave-linge), la réparation est celle de l'appareil : par exemple un [groupe de sécurité de chauffe-eau](/prestations/depannage-chauffe-eau-perpignan) ou un [mécanisme de chasse d'eau](/prestations/depannage-wc-perpignan).",
      },
      {
        title: "Dégât des eaux et assurance",
        content:
          "Une fuite qui a causé des dégâts (plafond, sol, meubles, chez le voisin) relève de l'assurance habitation. Déclarez le sinistre rapidement à votre assureur : le délai habituel est de cinq jours ouvrés à partir du moment où vous constatez les dégâts.\n\nL'assureur demande en général de savoir d'où venait la fuite et ce qui a été fait pour l'arrêter. Nous vous remettons la facture détaillée et un compte rendu de la recherche indiquant l'origine trouvée et la réparation réalisée. Les conditions de prise en charge de la recherche elle-même dépendent de votre contrat : vérifiez-le ou demandez à votre assureur.",
      },
      {
        title: "Recherche de fuite à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nMaisons anciennes du centre, appartements en copropriété, villas des lotissements des années 70 avec canalisations encastrées dans la dalle : chaque type de logement a ses fuites typiques, et nous les connaissons. Un doute ? Un appel suffit pour savoir s'il faut chercher.`,
      },
    ],
    highlights: [
      "Localisation avant toute ouverture de mur ou de sol",
      "Écoute acoustique, gaz traceur, caméra thermique, colorant selon le cas",
      "Réparation de la fuite trouvée dans la même intervention quand c'est possible",
      "Compte rendu écrit pour votre assurance",
    ],
    faq: [
      { question: "Comment savoir si j'ai une fuite cachée ?", answer: "Fermez tous les robinets et appareils, relevez le compteur, attendez une heure sans consommer et relevez à nouveau. Si le chiffre a bougé, il y a une fuite sur le réseau. Une tache, une humidité ou une facture en hausse sont d'autres signes à ne pas laisser durer." },
      { question: "Combien coûte une recherche de fuite ?", answer: "Le prix dépend de la difficulté de la recherche (canalisation apparente ou encastrée, surface concernée, moyens nécessaires) et de la réparation à faire ensuite. Nous vous annonçons le tarif avant d'intervenir." },
      { question: "Faut-il casser pour trouver la fuite ?", answer: "Non, c'est justement le but de la recherche : localiser la fuite de l'extérieur pour n'ouvrir qu'à l'endroit exact, sur une petite surface. Sans recherche, on ouvre au hasard, souvent plusieurs fois." },
      { question: "La fuite vient de chez le voisin, que faire ?", answer: "Prévenez le voisin et le syndic si vous êtes en copropriété, déclarez le sinistre à votre assureur et faites établir un constat amiable de dégât des eaux. Nous pouvons chercher l'origine si l'accès est possible." },
      { question: "Et si la fuite vient d'une infiltration et non d'une canalisation ?", answer: "Cela arrive : toiture, terrasse, joint de fenêtre, remontée d'humidité. La recherche permet justement de l'établir. Nous vous le disons clairement et vous orientons vers le bon corps de métier." },
    ],
    links: [L.fuite, L.chauffeEau, L.wc, CONTACT],
  },

  {
    slug: "prestations/debouchage-canalisation-perpignan",
    h1: "Débouchage canalisation Perpignan",
    meta_title: "Débouchage canalisation Perpignan : évier, douche, WC, colonne",
    meta_description:
      "Canalisation bouchée à Perpignan et alentours : évier, douche, baignoire, WC, colonne d'immeuble, regard extérieur. Débouchage mécanique ou hydraulique, recherche de la cause. Tarif annoncé avant d'intervenir.",
    service: "Débouchage canalisation",
    card: {
      title: "Débouchage",
      tagline: "Évier, douche, WC, colonne, regard",
      description: "Canalisation bouchée ou qui s'écoule mal : débouchage mécanique ou hydraulique adapté au bouchon, et recherche de la cause quand il revient.",
      badges: ["Perpignan et alentours", "Tarif annoncé avant"],
      featured: true,
    },
    intro:
      "L'évier ne se vide plus, la douche garde l'eau aux pieds, les WC remontent, une odeur d'égout monte du siphon, un regard déborde dans le jardin : un bouchon quelque part dans l'évacuation. Les produits chimiques attaquent les joints et n'enlèvent pas un bouchon compact ; la ventouse déplace le problème. Nous débouchons les canalisations à Perpignan et dans les communes voisines, avec le matériel adapté à l'endroit et à la nature du bouchon.\n\nAppelez-nous et dites-nous ce qui ne s'écoule plus : nous fixons un créneau et nous annonçons le tarif avant d'intervenir.",
    sections: [
      {
        title: "Les bouchons que nous traitons",
        content:
          "- **Évier de cuisine** : graisses figées et restes alimentaires, le bouchon le plus courant, souvent dans le siphon ou juste après.\n- **Lavabo et douche** : cheveux, savon et calcaire agglomérés dans le siphon ou la bonde.\n- **Baignoire** : même chose, avec une bonde plus difficile d'accès.\n- **WC** : papier en excès, lingettes (même « biodégradables »), objet tombé dans la cuvette. Voir aussi notre page [dépannage WC](/prestations/depannage-wc-perpignan).\n- **Lave-linge et lave-vaisselle** : évacuation encrassée, siphon de machine bouché.\n- **Colonne d'immeuble ou canalisation commune** : plusieurs logements touchés en même temps, remontées aux étages bas.\n- **Regard, canalisation enterrée, sortie vers le tout-à-l'égout** : racines, dépôts, affaissement de la canalisation.",
      },
      {
        title: "Les méthodes de débouchage",
        content:
          "Le bon outil dépend de l'endroit, du diamètre et de ce qui bouche :\n\n- **Démontage et nettoyage du siphon** : pour un bouchon proche de l'appareil, la solution la plus simple et la plus propre.\n- **Furet manuel ou électrique** : une tige souple qui perce et accroche le bouchon dans la canalisation, sur plusieurs mètres.\n- **Pompe à pression** : une poussée d'air ou d'eau pour déloger un bouchon compact sans démonter.\n- **Hydrocurage** : de l'eau à haute pression envoyée par une buse qui nettoie les parois sur toute la longueur, pour les canalisations principales, les colonnes et les réseaux enterrés.\n- **Inspection caméra** : quand le bouchon revient ou que la canalisation est inaccessible, la caméra montre l'obstacle, une casse, un affaissement ou des racines.\n\nNous n'utilisons pas de déboucheur chimique : il abîme les joints et les canalisations anciennes et n'enlève pas les bouchons compacts.",
      },
      {
        title: "Comment se passe l'intervention",
        content:
          "1. **Au téléphone**, vous décrivez quel appareil ne s'écoule plus, si d'autres sont touchés (ce qui indique un bouchon plus loin) et depuis quand.\n2. **Sur place**, nous repérons l'endroit du bouchon en testant les écoulements, puis nous choisissons la méthode.\n3. **Tarif annoncé** avant de commencer.\n4. **Débouchage**, puis contrôle de l'écoulement sur chaque appareil concerné.\n5. **Cause et conseils** : nous vous disons pourquoi ça a bouché et comment l'éviter. Si la canalisation elle-même est en cause (pente, casse, racines), nous vous l'expliquons et chiffrons la réparation par écrit.\n\nSols et meubles sont protégés, l'eau stagnante est évacuée, le matériel et les déchets repartent avec nous.",
      },
      {
        title: "Quand le bouchon revient toujours",
        content:
          "Une canalisation qui se rebouche tous les deux ou trois mois a un problème de fond que le débouchage seul ne règle pas :\n\n- **Pente insuffisante ou contre-pente** : l'eau stagne et les dépôts s'accumulent au même endroit.\n- **Dépôts de graisse ou de calcaire** qui réduisent le diamètre utile sur toute la longueur : un hydrocurage complet remet la canalisation à neuf.\n- **Racines** entrées par un joint défaillant sur une canalisation extérieure.\n- **Casse, affaissement ou emboîtement déboîté** sur une canalisation enterrée.\n- **Ventilation d'évacuation absente ou bouchée**, qui ralentit les écoulements et fait glouglouter les siphons.\n\nL'inspection caméra permet de voir ce qui se passe et de décider : nettoyage, réparation ponctuelle ou remplacement d'un tronçon.",
      },
      {
        title: "Débouchage à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nSi le bouchon s'accompagne d'une fuite ou d'une trace d'humidité, la [recherche de fuite](/prestations/recherche-de-fuite-perpignan) se fait dans la même intervention. Une canalisation en mauvais état peut aussi justifier une [réparation](/prestations/reparation-fuite-eau-perpignan) plutôt qu'un simple débouchage.`,
      },
    ],
    highlights: [
      "Siphon, furet, pompe, hydrocurage : la méthode adaptée au bouchon",
      "Pas de déboucheur chimique",
      "Cause expliquée et conseils pour éviter la récidive",
      "Inspection caméra quand le bouchon revient",
    ],
    faq: [
      { question: "Combien coûte un débouchage de canalisation ?", answer: "Le prix dépend de l'endroit du bouchon (siphon, canalisation d'appareil, colonne, réseau enterré) et de la méthode nécessaire. Nous vous annonçons le tarif sur place avant de commencer." },
      { question: "Puis-je essayer de déboucher moi-même avant d'appeler ?", answer: "Pour un évier ou un lavabo, démonter et nettoyer le siphon est sans risque si vous avez une bassine. Évitez les produits chimiques : ils abîment les canalisations et rendent notre intervention plus dangereuse si le bouchon reste." },
      { question: "Plusieurs appareils sont bouchés en même temps, est-ce grave ?", answer: "Cela indique que le bouchon est plus loin, sur la canalisation commune ou la colonne. En immeuble, prévenez le syndic : la colonne est une partie commune. Nous intervenons dans les deux cas." },
      { question: "Que ne faut-il pas jeter dans les canalisations ?", answer: "Graisses et huiles de cuisson, marc de café, lingettes (même dites biodégradables), cotons-tiges, protections hygiéniques, cheveux en quantité, litière, peinture. Un panier de bonde et un peu d'eau chaude après la vaisselle évitent la plupart des bouchons." },
      { question: "Faites-vous l'hydrocurage des réseaux enterrés ?", answer: "Oui pour les canalisations d'un logement jusqu'au raccordement. Les très longs réseaux ou les fosses relèvent d'une entreprise d'assainissement avec camion ; nous vous le disons si c'est votre cas." },
    ],
    links: [L.wc, L.recherche, L.fuite, CONTACT],
  },

  {
    slug: "prestations/reparation-fuite-eau-perpignan",
    h1: "Réparation fuite d'eau Perpignan",
    meta_title: "Réparation fuite d'eau Perpignan : robinet, tuyau, raccord",
    meta_description:
      "Fuite d'eau à Perpignan et alentours : robinet qui goutte, raccord sous l'évier, tuyau percé, flexible, chasse d'eau, groupe de sécurité. Réparation durable, tarif annoncé avant d'intervenir.",
    service: "Réparation fuite d'eau",
    card: {
      title: "Réparation de fuite",
      tagline: "Robinet, raccord, tuyau, chasse d'eau, joint",
      description: "Fuite visible sous un évier, à un robinet, sur un tuyau ou un flexible : réparation durable de la pièce en cause, pas de rustine.",
      badges: ["Perpignan et alentours", "Tarif annoncé avant"],
      featured: true,
    },
    intro:
      "Un robinet qui goutte toute la nuit, une flaque sous l'évier, un raccord qui perle, un tuyau qui a cédé, un flexible de douche fendu, un chauffe-eau dont le groupe de sécurité coule sans arrêt : une fuite visible est une fuite qu'on peut réparer vite, avant qu'elle n'abîme le meuble, le sol ou le plafond du dessous. Nous réparons les fuites d'eau à Perpignan et dans les communes voisines, en remplaçant la pièce en cause plutôt qu'en la colmatant.\n\nSi l'eau coule encore, fermez le robinet d'arrêt, puis appelez-nous : nous fixons un créneau et nous annonçons le tarif avant d'intervenir.",
    sections: [
      {
        title: "Les fuites que nous réparons",
        content:
          "- **Robinet ou mitigeur qui goutte** au bec ou à la base : joint, clapet ou cartouche à remplacer, ou robinet à changer s'il est trop usé.\n- **Raccord sous l'évier, le lavabo ou derrière les WC** : écrou desserré, joint fibre ou joint torique à remplacer, raccord fendu.\n- **Flexible de robinet ou de douche** : les flexibles tressés vieillissent et se fendent, on les remplace.\n- **Tuyau percé** en cuivre, en PER ou en multicouche : corrosion, gel, coup ; le tronçon est remplacé.\n- **Siphon ou évacuation qui fuit** sous un appareil : joint, bague ou siphon à changer.\n- **Chasse d'eau qui coule** dans la cuvette ou au sol : voir notre page [dépannage WC](/prestations/depannage-wc-perpignan).\n- **Groupe de sécurité de chauffe-eau** qui coule en continu ou **fuite au ballon** : voir [dépannage chauffe-eau](/prestations/depannage-chauffe-eau-perpignan).\n- **Robinet d'arrêt ou vanne** qui fuit ou ne ferme plus : remplacement.\n- **Arrivée de lave-linge ou de lave-vaisselle** : robinet, raccord ou tuyau d'alimentation.",
      },
      {
        title: "Réparer durablement, pas colmater",
        content:
          "Un ruban, une pâte ou un collier posés sur une fuite tiennent quelques semaines et cachent la dégradation qui continue derrière. Notre règle : remplacer la pièce en cause par une pièce adaptée.\n\n- Un **joint** se change avec le bon type et la bonne dimension, sur un raccord nettoyé.\n- Une **cartouche de mitigeur** se remplace par la référence du fabricant ou une compatible.\n- Un **tronçon de tuyau** percé est coupé et remplacé, avec des raccords adaptés au matériau (brasure sur cuivre, raccords à sertir ou à compression sur PER et multicouche).\n- Un **robinet** trop ancien pour être réparé est remplacé : nous vous le disons et nous chiffrons avant.\n\nAprès la réparation, nous remettons en eau, contrôlons l'absence de fuite sur l'ensemble du raccordement et nettoyons.",
      },
      {
        title: "Comment se passe l'intervention",
        content:
          "1. **Au téléphone**, vous décrivez où coule l'eau et à quel rythme. Si c'est abondant, nous vous guidons pour fermer l'arrivée.\n2. **Sur place**, nous identifions la pièce en cause et l'état du raccordement autour.\n3. **Tarif annoncé** avant de commencer.\n4. **Réparation**, remise en eau, contrôle.\n5. **Conseils** : nous vous montrons où est votre robinet d'arrêt et ce qui a provoqué la fuite (usure, calcaire, gel, choc).\n\nSi la fuite n'est pas visible et que vous ne constatez qu'une tache ou un compteur qui tourne, c'est une [recherche de fuite](/prestations/recherche-de-fuite-perpignan) qui s'impose d'abord.",
      },
      {
        title: "Les gestes à faire en attendant",
        content:
          "- **Fermez l'arrivée d'eau** : robinet d'arrêt de l'appareil (sous l'évier, derrière les WC, près du lave-linge) ou robinet général du logement (près du compteur, dans un placard technique ou à la cave).\n- **Coupez l'électricité** si l'eau approche d'une prise, d'un appareil ou du tableau.\n- **Épongez et placez un récipient** sous la fuite.\n- **Vidangez si besoin** : ouvrez un robinet en point bas pour vider la canalisation après avoir fermé l'arrivée.\n- **Prévenez le voisin du dessous** si l'eau a pu traverser.\n- **Photographiez** les dégâts pour votre assurance.\n\nAu téléphone, nous vous confirmons ces gestes selon votre situation.",
      },
      {
        title: "Réparation de fuite à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nL'eau du secteur est calcaire : les cartouches, joints et groupes de sécurité s'usent plus vite qu'ailleurs. C'est la première cause des fuites que nous réparons, et nous vous disons comment la limiter.`,
      },
    ],
    highlights: [
      "La pièce en cause est remplacée, pas colmatée",
      "Raccords adaptés au matériau : cuivre, PER, multicouche",
      "Remise en eau et contrôle après réparation",
      "Robinet d'arrêt montré, cause expliquée",
    ],
    faq: [
      { question: "Combien coûte la réparation d'une fuite ?", answer: "Cela dépend de la pièce à remplacer (joint, cartouche, flexible, tronçon de tuyau, robinet complet) et de son accessibilité. Nous vous annonçons le tarif sur place avant de commencer." },
      { question: "Un robinet qui goutte, c'est vraiment urgent ?", answer: "Ce n'est pas une urgence, mais c'est de l'eau perdue en continu et une usure qui s'aggrave. Une goutte par seconde représente plusieurs mètres cubes par an. La réparation est rapide et évite de devoir changer le robinet." },
      { question: "Peut-on réparer un tuyau en cuivre percé ?", answer: "Oui : le tronçon percé est coupé et remplacé par brasure ou raccords adaptés. Si la corrosion touche toute la longueur, nous vous conseillons le remplacement du tronçon complet plutôt qu'une série de réparations." },
      { question: "Où se trouve le robinet d'arrêt général ?", answer: "Le plus souvent près du compteur d'eau : à l'entrée du logement, dans un placard technique, à la cave ou dans un regard en limite de terrain pour une maison. Nous vous le montrons lors de notre passage." },
      { question: "Mon assurance prend-elle en charge la réparation ?", answer: "L'assurance habitation couvre en général les dégâts causés par l'eau, pas toujours la réparation de la fuite elle-même. Cela dépend de votre contrat. Nous vous remettons une facture détaillée pour votre déclaration." },
    ],
    links: [L.recherche, L.wc, L.chauffeEau, CONTACT],
  },

  {
    slug: "prestations/depannage-chauffe-eau-perpignan",
    h1: "Dépannage chauffe-eau Perpignan",
    meta_title: "Dépannage chauffe-eau Perpignan : panne, fuite, remplacement",
    meta_description:
      "Plus d'eau chaude, chauffe-eau qui fuit ou qui disjoncte à Perpignan et alentours : diagnostic du ballon, remplacement de la résistance, du thermostat ou du groupe de sécurité, changement du chauffe-eau si nécessaire.",
    service: "Dépannage chauffe-eau",
    card: {
      title: "Chauffe-eau",
      tagline: "Plus d'eau chaude, fuite au ballon, remplacement",
      description: "Diagnostic du ballon (résistance, thermostat, groupe de sécurité, cuve), réparation quand elle vaut le coup, remplacement sinon.",
      badges: ["Perpignan et alentours", "Tarif annoncé avant"],
      featured: true,
    },
    intro:
      "Douche froide ce matin, eau tiède qui ne tient pas, ballon qui fait disjoncter le tableau, groupe de sécurité qui coule sans arrêt, flaque sous le cumulus : le chauffe-eau électrique est l'appareil qui tombe le plus souvent en panne dans un logement, et l'eau calcaire du Roussillon n'aide pas. Nous dépannons et remplaçons les chauffe-eau à Perpignan et dans les communes voisines.\n\nAppelez-nous et décrivez la panne : nous fixons un créneau, nous diagnostiquons sur place et nous vous annonçons le tarif avant d'intervenir, réparation ou remplacement.",
    sections: [
      {
        title: "Les pannes les plus fréquentes",
        content:
          "- **Plus d'eau chaude du tout** : résistance grillée, thermostat en sécurité ou hors service, contacteur heures creuses défaillant, alimentation coupée.\n- **Eau tiède ou qui manque vite** : résistance entartrée qui chauffe mal, thermostat déréglé, ballon sous-dimensionné, mitigeur thermostatique qui mélange mal.\n- **Le disjoncteur saute** quand le ballon chauffe : résistance qui fuit électriquement, souvent à cause de l'humidité ou du tartre.\n- **Le groupe de sécurité coule** : normal quelques gouttes pendant la chauffe, anormal en continu (groupe entartré ou usé, pression du réseau trop élevée).\n- **Fuite au ballon** : par le bas (groupe, raccords, joint de bride) ou par la cuve elle-même, ce qui signe la fin de vie de l'appareil.\n- **Bruits de bouillonnement** : couche de tartre au fond de la cuve et sur la résistance.\n- **Eau chaude qui sent** ou colorée : cuve corrodée ou anode usée.",
      },
      {
        title: "Réparer ou remplacer : comment nous décidons",
        content:
          "Sur place, nous contrôlons l'alimentation, le thermostat, la résistance, le groupe de sécurité et l'état de la cuve. Ensuite nous vous donnons un avis clair :\n\n- **Réparation** quand la panne vient d'une pièce remplaçable sur un ballon en bon état : résistance, thermostat, groupe de sécurité, joint de bride, anode. C'est le cas le plus fréquent sur un appareil de moins d'une dizaine d'années.\n- **Détartrage** quand le ballon chauffe mal ou bruyamment : vidange, ouverture, retrait du tartre, remplacement du joint et de l'anode si besoin.\n- **Remplacement** quand la cuve fuit (irréparable), quand l'appareil cumule l'âge et plusieurs pièces à changer, ou quand le coût de la réparation approche celui d'un ballon neuf.\n\nPour un remplacement, vous recevez un **devis écrit** avec le modèle proposé (capacité, résistance stéatite ou blindée, position verticale ou horizontale) adapté à votre foyer et à votre emplacement.",
      },
      {
        title: "Ce que comprend le remplacement d'un chauffe-eau",
        content:
          "1. **Choix du modèle** avec vous : capacité selon le nombre de personnes, résistance stéatite (mieux adaptée à l'eau calcaire), dimensions compatibles avec l'emplacement.\n2. **Dépose de l'ancien ballon** : coupure de l'électricité et de l'eau, vidange, décrochage, évacuation de l'appareil.\n3. **Pose du neuf** : fixation adaptée au mur et au poids, groupe de sécurité neuf, raccordement eau froide et eau chaude avec raccords diélectriques, évacuation du groupe vers le siphon.\n4. **Raccordement électrique** sur la ligne existante, contrôle du contacteur heures creuses si présent.\n5. **Mise en eau, purge, mise en chauffe** et contrôle de l'absence de fuite.\n6. **Explication** du réglage de température et de l'entretien (manœuvre du groupe de sécurité).\n\nUn ballon qui fuit par la cuve peut aussi relever de la [recherche de fuite](/prestations/recherche-de-fuite-perpignan) si vous ne savez pas d'où vient l'eau.",
      },
      {
        title: "Prolonger la vie de votre chauffe-eau",
        content:
          "- **Manœuvrez le groupe de sécurité** une fois par mois : quelques secondes de vidange évitent qu'il se bloque au tartre.\n- **Réglez la température** autour de 55 à 60 °C : assez pour la sécurité sanitaire, sans surchauffe qui accélère l'entartrage.\n- **Détartrez** tous les quelques années selon la dureté de l'eau, et remplacez l'anode si elle est usée.\n- **Surveillez** les gouttes, les bruits et les variations de température : ce sont les signes avant-coureurs.\n- **En cas d'absence prolongée**, coupez l'alimentation électrique et l'arrivée d'eau du ballon.\n\nSi l'eau du logement est très dure, un adoucisseur protège le chauffe-eau, la robinetterie et les appareils ; nous pouvons en parler sur place.",
      },
      {
        title: "Chauffe-eau à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nLe chauffe-eau est souvent installé dans un placard, un cellier ou au-dessus des WC : nous protégeons le sol et les meubles, nous évacuons l'ancien appareil et nous laissons l'emplacement propre. Pour la [robinetterie et les sanitaires](/prestations/installation-sanitaire-perpignan) raccordés au ballon, nous intervenons dans la même visite si vous le souhaitez.`,
      },
    ],
    highlights: [
      "Diagnostic complet : alimentation, thermostat, résistance, groupe, cuve",
      "Avis clair entre réparation, détartrage et remplacement",
      "Devis écrit pour un remplacement, modèle adapté à l'eau calcaire",
      "Ancien ballon évacué, emplacement laissé propre",
    ],
    faq: [
      { question: "Combien coûte le dépannage d'un chauffe-eau ?", answer: "Cela dépend de la pièce en cause : un thermostat, un groupe de sécurité ou une résistance n'ont pas le même coût, et un remplacement complet fait l'objet d'un devis écrit. Nous vous annonçons le tarif après le diagnostic, avant d'intervenir." },
      { question: "Mon chauffe-eau coule par le bas, est-il fichu ?", answer: "Pas forcément. Si l'eau vient du groupe de sécurité ou d'un raccord, une pièce suffit. Si elle vient de la cuve ou de la bride malgré un joint neuf, la cuve est percée et le ballon doit être remplacé. Le diagnostic sur place tranche." },
      { question: "Combien de temps dure un chauffe-eau électrique ?", answer: "En général une dizaine d'années, davantage avec une eau peu calcaire et un entretien régulier, moins dans le Roussillon sans détartrage. Une résistance stéatite et une anode en bon état allongent sa durée de vie." },
      { question: "Le groupe de sécurité goutte, est-ce normal ?", answer: "Quelques gouttes pendant la chauffe sont normales : l'eau se dilate. Un écoulement continu ne l'est pas : le groupe est entartré ou usé, ou la pression du réseau est trop élevée. On le remplace, et on pose un réducteur de pression si nécessaire." },
      { question: "Quelle capacité choisir pour remplacer mon ballon ?", answer: "Elle dépend du nombre de personnes et des habitudes (douches ou bains). Nous vous conseillons sur place en tenant compte de l'emplacement disponible et de l'installation électrique existante." },
    ],
    links: [L.fuite, L.recherche, L.sanitaire, CONTACT],
  },

  {
    slug: "prestations/depannage-wc-perpignan",
    h1: "Dépannage WC Perpignan",
    meta_title: "Dépannage WC Perpignan : WC bouché, chasse d'eau qui fuit",
    meta_description:
      "WC bouchés, chasse d'eau qui coule en continu, cuvette qui se remplit mal, fuite au sol ou au réservoir à Perpignan et alentours : débouchage, remplacement du mécanisme ou du WC. Tarif annoncé avant d'intervenir.",
    service: "Dépannage WC",
    card: {
      title: "WC et chasse d'eau",
      tagline: "WC bouché, chasse qui fuit, mécanisme à remplacer",
      description: "Toilettes bouchées, chasse d'eau qui coule en continu, cuvette qui se remplit mal ou fuite au sol : réparation ou remplacement du mécanisme.",
      badges: ["Perpignan et alentours", "Tarif annoncé avant"],
      featured: false,
    },
    intro:
      "Des toilettes bouchées qui remontent, une chasse d'eau qui coule sans arrêt dans la cuvette, un réservoir qui met dix minutes à se remplir, un bouton qui ne revient plus, de l'eau au pied du WC : c'est le sanitaire dont on ne peut pas se passer, et sa panne se règle rarement seule. Nous dépannons les WC à Perpignan et dans les communes voisines, du débouchage au remplacement complet.\n\nAppelez-nous et décrivez ce qui se passe : nous fixons un créneau et nous annonçons le tarif avant d'intervenir.",
    sections: [
      {
        title: "Les pannes de WC que nous réglons",
        content:
          "- **WC bouché** : papier, lingettes, objet tombé dans la cuvette, ou bouchon plus loin dans la canalisation. Débouchage à la pompe, au furet ou par démontage selon le cas. Pour les bouchons de canalisation commune, voir notre page [débouchage](/prestations/debouchage-canalisation-perpignan).\n- **Chasse d'eau qui coule en continu** : joint de cloche usé, flotteur déréglé ou percé, robinet flotteur qui ne ferme plus, tartre sur le mécanisme.\n- **Réservoir qui se remplit lentement ou pas du tout** : robinet flotteur entartré ou bouché, robinet d'arrêt fermé ou défaillant, filtre encrassé.\n- **Bouton ou tirette bloqués** : mécanisme cassé ou déboîté, à réparer ou à remplacer.\n- **Fuite au sol ou entre le réservoir et la cuvette** : joint de réservoir, vis de fixation, pipe d'évacuation, joint de sortie.\n- **Cuvette fissurée ou WC descellé** : remplacement du WC ou refixation.\n- **WC suspendu** : mécanisme du bâti-support accessible par la plaque de commande, réparation sans casser le coffrage dans la grande majorité des cas.",
      },
      {
        title: "Réparer le mécanisme ou changer le WC ?",
        content:
          "La plupart des pannes se règlent en remplaçant une pièce du mécanisme : joint de cloche, flotteur, robinet flotteur, ou le mécanisme complet quand il est ancien. Nous utilisons des pièces adaptées au modèle de réservoir (mécanisme à câble, à tirette, double commande, bâti-support).\n\nNous conseillons le **remplacement du WC** quand :\n\n- la cuvette ou le réservoir est fissuré ;\n- le modèle est ancien et ses pièces ne se trouvent plus ;\n- l'évacuation ou la fixation est dégradée et impose de tout démonter ;\n- vous souhaitez passer à un modèle plus économe en eau ou à un WC suspendu.\n\nDans ce cas, vous recevez un **devis écrit** avec le modèle proposé. La pose comprend la dépose et l'évacuation de l'ancien WC, le raccordement à l'arrivée d'eau et à l'évacuation avec les joints adaptés, la fixation et le contrôle d'étanchéité.",
      },
      {
        title: "Comment se passe l'intervention",
        content:
          "1. **Au téléphone**, vous décrivez le symptôme. Si de l'eau coule au sol, nous vous indiquons comment fermer le robinet d'arrêt du WC.\n2. **Sur place**, nous identifions la cause : mécanisme, alimentation, évacuation ou bouchon.\n3. **Tarif annoncé** avant de commencer.\n4. **Réparation ou débouchage**, remise en eau, contrôle du remplissage, de la chasse et de l'étanchéité.\n5. **Conseils** pour éviter la récidive : ce qu'il ne faut pas jeter, comment détartrer le mécanisme.\n\nUne fuite de chasse d'eau qui a duré peut avoir abîmé le sol ou le plafond du dessous : nous vous le signalons et vous remettons une facture détaillée pour votre assurance. Si l'origine de l'eau au sol n'est pas claire, une [recherche de fuite](/prestations/recherche-de-fuite-perpignan) le détermine.",
      },
      {
        title: "Une chasse qui fuit, ce que ça coûte en eau",
        content:
          "Une chasse d'eau qui coule en continu dans la cuvette passe souvent inaperçue : un léger filet, un bruit de remplissage régulier. Pourtant, elle peut laisser passer plusieurs dizaines à plusieurs centaines de litres par jour, et se voit directement sur la facture d'eau.\n\nLe test est simple : quelques gouttes de colorant alimentaire dans le réservoir, sans tirer la chasse. Si la cuvette se colore au bout de quelques minutes, le joint de cloche ou le mécanisme fuit. Une pièce à remplacer, et l'économie sur la facture couvre vite l'intervention.",
      },
      {
        title: "Dépannage WC à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nLe calcaire du secteur bloque les mécanismes et les robinets flotteurs : c'est la première cause des chasses d'eau qui fuient ici. Si vous remplacez le WC, nous pouvons dans la même visite remplacer la [robinetterie ou le lavabo](/prestations/installation-sanitaire-perpignan) de la pièce.`,
      },
    ],
    highlights: [
      "Débouchage, mécanisme, alimentation, fuite au sol : toutes les pannes de WC",
      "Pièces adaptées au modèle, y compris WC suspendus",
      "Devis écrit pour un remplacement de WC",
      "Ce qu'il ne faut pas jeter, expliqué",
    ],
    faq: [
      { question: "Combien coûte le dépannage d'un WC ?", answer: "Cela dépend de la panne : un débouchage, un joint, un mécanisme complet ou un remplacement de WC n'ont pas le même coût. Nous vous annonçons le tarif sur place avant de commencer, et un remplacement fait l'objet d'un devis écrit." },
      { question: "Mes WC sont bouchés, puis-je faire quelque chose en attendant ?", answer: "Ne tirez plus la chasse pour éviter le débordement. Une ventouse adaptée aux WC peut suffire pour un bouchon de papier. Évitez les produits chimiques et n'utilisez pas d'objet rigide qui pourrait rayer ou fissurer la cuvette." },
      { question: "Ma chasse d'eau coule sans arrêt, est-ce urgent ?", answer: "Ce n'est pas un dégât immédiat, mais c'est de l'eau perdue en continu et une facture qui grimpe. Vous pouvez fermer le robinet d'arrêt du WC entre deux utilisations en attendant notre passage." },
      { question: "Réparez-vous les WC suspendus sans casser le coffrage ?", answer: "Oui dans la grande majorité des cas : le mécanisme, le flotteur et le robinet d'un bâti-support sont accessibles en retirant la plaque de commande. Seule une fuite sur le bâti lui-même ou l'évacuation peut demander une ouverture." },
      { question: "Faut-il changer tout le WC si la cuvette est fissurée ?", answer: "Oui : une cuvette fissurée finit par fuir ou casser, et ne se répare pas durablement. Nous vous proposons un modèle adapté à l'évacuation existante (sortie horizontale ou verticale) avec un devis écrit." },
    ],
    links: [L.debouchage, L.fuite, L.sanitaire, CONTACT],
  },

  {
    slug: "prestations/installation-sanitaire-perpignan",
    h1: "Installation sanitaire Perpignan",
    meta_title: "Installation sanitaire Perpignan : robinet, lavabo, douche, WC",
    meta_description:
      "Remplacement ou pose de robinetterie, lavabo, vasque, douche, WC, raccordement de lave-linge et lave-vaisselle à Perpignan et alentours. Visite, devis écrit, pose propre et contrôlée.",
    service: "Installation sanitaire",
    card: {
      title: "Installation sanitaire",
      tagline: "Robinetterie, lavabo, douche, WC, lave-linge",
      description: "Remplacement ou pose d'un robinet, d'un lavabo, d'une douche, d'un WC, raccordement d'un lave-linge ou d'un lave-vaisselle.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: false,
    },
    intro:
      "Un mitigeur à remplacer, un lavabo à changer pour une vasque, une baignoire à transformer en douche, un WC à poser, un lave-linge à raccorder dans une nouvelle pièce, une arrivée d'eau à créer pour un frigo américain : l'installation sanitaire, c'est tout ce qui s'ajoute ou se remplace dans un logement quand on rénove, qu'on aménage ou qu'on modernise. Nous installons et remplaçons les équipements sanitaires à Perpignan et dans les communes voisines.\n\nAppelez-nous et décrivez le projet : nous passons voir l'existant et vous recevez un devis écrit avant toute intervention.",
    sections: [
      {
        title: "Ce que nous installons ou remplaçons",
        content:
          "- **Robinetterie** : mitigeur de cuisine ou de salle de bain, mitigeur thermostatique de douche ou de baignoire, robinet de lave-linge, robinet d'arrêt.\n- **Lavabo, vasque, meuble vasque** : dépose de l'ancien, pose du neuf, siphon et raccordements.\n- **Douche** : receveur, paroi, colonne ou barre de douche, remplacement d'une baignoire par une douche.\n- **Baignoire** : pose ou remplacement, robinetterie et vidage.\n- **WC** : WC au sol ou suspendu avec bâti-support, dépose de l'ancien. Le dépannage d'un WC existant est traité sur notre page [dépannage WC](/prestations/depannage-wc-perpignan).\n- **Évier de cuisine** et robinetterie, avec ou sans meuble.\n- **Raccordements d'appareils** : lave-linge, lave-vaisselle, frigo américain, adoucisseur, avec arrivée d'eau et évacuation créées si nécessaire.\n- **Chauffe-eau** : voir notre page [dépannage et remplacement de chauffe-eau](/prestations/depannage-chauffe-eau-perpignan).",
      },
      {
        title: "Pourquoi confier la pose à un plombier",
        content:
          "Un équipement sanitaire mal posé fuit rarement le premier jour : c'est au bout de quelques semaines qu'un raccord perle sous le meuble, qu'un siphon goutte ou qu'un joint de receveur laisse passer l'eau dans la cloison. Ce que nous apportons :\n\n- **Des raccordements adaptés** au matériau existant (cuivre, PER, multicouche, PVC) avec les bons raccords et les bons joints.\n- **Une évacuation qui fonctionne** : pente, diamètre, siphon adapté, ventilation si nécessaire, pour que ça s'écoule sans bruit ni odeur.\n- **Une étanchéité vérifiée** : mise en eau, contrôle sous pression, joints silicone posés proprement là où il en faut.\n- **La conformité** des raccordements (clapets, robinets d'arrêt, raccords diélectriques) pour que l'installation dure.\n- **Le conseil sur le matériel** : nous vous disons ce qui est compatible avec votre installation et ce qui vous causera des ennuis.",
      },
      {
        title: "Comment se passe le chantier",
        content:
          "1. **Au téléphone**, vous décrivez le projet et l'existant. Si vous avez déjà acheté le matériel, dites-nous quoi : nous vérifions la compatibilité.\n2. **Visite** : nous relevons les arrivées, les évacuations, les dimensions et les contraintes (mur porteur, carrelage, meuble).\n3. **Devis écrit** détaillant la dépose, la fourniture éventuelle, la pose et les raccordements.\n4. **Chantier** : protection des sols, coupure de l'eau, dépose, pose, raccordements, remise en eau et contrôle.\n5. **Livraison** : équipement en fonctionnement, emballages et ancien matériel évacués, explication du fonctionnement (réglage d'un thermostatique, entretien d'un siphon).\n\nSi le projet touche au carrelage, à l'électricité ou aux cloisons, nous nous coordonnons avec vos artisans ou nous vous en recommandons.",
      },
      {
        title: "Matériel fourni par vous ou par nous ?",
        content:
          "Les deux sont possibles. Si vous fournissez le matériel, envoyez-nous la référence avant la visite : nous vérifions qu'il correspond à vos arrivées, à votre évacuation et à l'espace disponible, et nous vous prévenons s'il manque un accessoire (flexibles, siphon, kit de fixation, bonde).\n\nSi nous fournissons, nous proposons du matériel de marque que nous connaissons, pour lequel les pièces détachées se trouvent, et adapté à l'eau calcaire du secteur (cartouches céramiques, thermostatiques protégés). Dans les deux cas, le devis écrit précise ce qui est compris.",
      },
      {
        title: "Installation sanitaire à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nUne installation commence souvent par un dépannage : une [fuite réparée](/prestations/reparation-fuite-eau-perpignan) sur un robinet trop ancien devient un remplacement de mitigeur, un [WC](/prestations/depannage-wc-perpignan) fissuré devient un WC suspendu. Nous vous conseillons ce qui a du sens, et nous chiffrons par écrit.`,
      },
    ],
    highlights: [
      "Robinetterie, lavabo, douche, baignoire, WC, évier, raccordements d'appareils",
      "Raccords et évacuations adaptés à l'existant",
      "Étanchéité vérifiée, mise en eau et contrôle",
      "Devis écrit, matériel fourni par vous ou par nous",
    ],
    faq: [
      { question: "Combien coûte l'installation d'un équipement sanitaire ?", answer: "Le prix dépend de l'équipement, de la dépose de l'ancien, de l'état des arrivées et évacuations et du matériel fourni ou non. Nous passons voir l'existant et vous recevez un devis écrit avant toute intervention." },
      { question: "Puis-je acheter mon robinet ou ma vasque moi-même ?", answer: "Oui. Envoyez-nous la référence avant la visite : nous vérifions la compatibilité avec vos arrivées et votre évacuation, et nous vous disons s'il manque un accessoire." },
      { question: "Peut-on remplacer une baignoire par une douche ?", answer: "Oui, c'est une demande fréquente. Il faut vérifier l'évacuation (hauteur, pente) et l'état du mur et du sol derrière la baignoire. La visite permet de vous dire ce qui est possible et à quel coût." },
      { question: "Faites-vous aussi le carrelage et l'électricité ?", answer: "Non, nous nous concentrons sur la plomberie. Pour une salle de bain complète, nous nous coordonnons avec vos artisans ou nous vous en recommandons." },
      { question: "Combien de temps prend le remplacement d'un lavabo ou d'un WC ?", answer: "Le remplacement d'un équipement par un équivalent se fait dans la journée. Le devis indique la durée prévue pour votre chantier." },
    ],
    links: [L.wc, L.chauffeEau, L.fuite, CONTACT],
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
      brief: { source: "seed:plomberie-ads", note: "Rédigé pour Google Ads, aucun fait client (prix, délai, disponibilité, qualification, garantie) — à valider avant publication" },
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
