/**
 * Brouillons des 6 pages prestation du site Vitrier Perpignan (site_key vitrier),
 * écrits pour des pages de destination Google Ads : situation du visiteur (souvent
 * une casse), ce qui est fait, déroulé, choix du verre, assurance, FAQ, CTA. Aucun
 * fait client (prix, délai d'intervention ou de commande, disponibilité soir /
 * week-end, garantie, qualification, ancienneté, stock) : tout est à valider avant
 * ajout.
 *
 * Statut `draft` — relecture et publication depuis le dashboard (/pages?site=vitrier).
 * Idempotent : upsert sur (site_key, slug), n'écrase jamais une page publiée.
 *
 *   npx tsx scripts/oneshot/seed-vitrier-pages.ts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "vitrier";
const CONTACT = { url: "/contact", anchor: "Nous écrire", context: "Décrivez le vitrage, nous vous rappelons." };
const ZONES = "Cabestany, Canet-en-Roussillon, Saint-Estève, Bompas, Saleilles, Toulouges, Le Soler, Argelès-sur-Mer";

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
  vitre: { url: "/prestations/remplacement-vitre-cassee-perpignan", anchor: "Vitre cassée", context: "Fenêtre, porte, baie vitrée, velux." },
  depannage: { url: "/prestations/depannage-vitrier-perpignan", anchor: "Dépannage vitrier", context: "Effraction, tempête, mise en sécurité." },
  doubleVitrage: { url: "/prestations/remplacement-double-vitrage-perpignan", anchor: "Double vitrage", context: "Vitrage embué, cassé ou à isoler." },
  vitrine: { url: "/prestations/vitrine-magasin-perpignan", anchor: "Vitrine de magasin", context: "Commerce, agence, restaurant." },
  miroir: { url: "/prestations/miroir-sur-mesure-perpignan", anchor: "Miroir sur mesure", context: "Salle de bain, entrée, dressing." },
  verre: { url: "/prestations/verre-sur-mesure-perpignan", anchor: "Verre sur mesure", context: "Paroi de douche, crédence, plateau, garde-corps." },
};

const pages: Page[] = [
  {
    slug: "prestations/remplacement-vitre-cassee-perpignan",
    h1: "Vitre cassée Perpignan",
    meta_title: "Vitre cassée Perpignan : remplacement fenêtre, porte, baie",
    meta_description:
      "Vitre fêlée ou brisée à Perpignan et alentours : fenêtre, porte, baie vitrée, velux. Relevé des cotes sur place, vitrage identique ou plus isolant, pose et joints. Prix annoncé avant de poser.",
    service: "Vitre cassée",
    card: {
      title: "Vitre cassée",
      tagline: "Fenêtre, porte, baie vitrée, velux",
      description: "Vitre fêlée ou brisée sur une fenêtre, une porte ou une baie : relevé des cotes, vitrage identique ou mieux isolant, pose et étanchéité.",
      badges: ["Perpignan et alentours", "Prix annoncé avant"],
      featured: true,
    },
    intro:
      "Un ballon dans la fenêtre du salon, une porte claquée par la tramontane, un choc sur la baie vitrée, un velux fêlé par la grêle : une vitre cassée laisse entrer le froid, le bruit et le premier venu, et les éclats restés dans le cadre coupent. Nous remplaçons les vitres cassées à Perpignan et dans les communes voisines, sur tous les types de menuiserie : bois, PVC, aluminium, acier.\n\nAppelez-nous et décrivez la vitre : où elle se trouve, ses dimensions approximatives, s'il s'agit d'un simple ou d'un double vitrage. Nous fixons un créneau, nous relevons les cotes sur place et nous annonçons le prix avant de poser.",
    sections: [
      {
        title: "Les vitres que nous remplaçons",
        content:
          "- **Fenêtre** à un ou plusieurs vantaux, en simple ou double vitrage, sur menuiserie bois, PVC ou aluminium.\n- **Porte-fenêtre et baie vitrée** coulissante : grands formats, vitrage isolant, souvent feuilleté ou trempé côté sécurité.\n- **Porte d'entrée vitrée, porte de garage, porte intérieure** avec un carreau cassé.\n- **Velux et fenêtre de toit** : vitrage spécifique au modèle, pose depuis l'intérieur quand c'est possible.\n- **Fenêtre ancienne à petits carreaux** : verre posé au mastic ou sous parcloses bois, dans le respect de la menuiserie.\n- **Imposte, vasistas, châssis de cave**, verre armé, verre imprimé ou dépoli.\n- **Vitrage cassé d'un immeuble** : porte de hall, cage d'escalier, sur demande du syndic ou du propriétaire.\n\nPour une vitrine de commerce, voir notre page [vitrine de magasin](/prestations/vitrine-magasin-perpignan) ; pour un double vitrage embué sans casse, la page [double vitrage](/prestations/remplacement-double-vitrage-perpignan).",
      },
      {
        title: "Quel verre pour remplacer votre vitre",
        content:
          "Remplacer une vitre, c'est l'occasion de poser le verre qui convient à l'usage, pas seulement le même qu'avant :\n\n- **Verre clair simple** (4 ou 6 mm) : pour un châssis ancien, une porte intérieure, une dépendance.\n- **Verre feuilleté** (deux verres collés par un film) : il se fissure sans tomber en morceaux ; conseillé sur une porte, une baie, un vitrage accessible aux enfants, ou pour retarder une effraction.\n- **Verre trempé** : quatre à cinq fois plus résistant qu'un verre classique et sans éclats coupants s'il casse ; pour une porte de douche, une porte vitrée très sollicitée.\n- **Double vitrage isolant** : si la menuiserie le permet, remplacer un simple vitrage cassé par un vitrage isolant améliore l'isolation thermique et acoustique de la pièce.\n- **Verre dépoli, imprimé ou opale** : pour une salle de bain, des WC, une porte d'entrée, quand il faut laisser passer la lumière sans le regard.\n\nNous vous expliquons le choix et sa raison ; c'est vous qui décidez.",
      },
      {
        title: "Comment se passe le remplacement",
        content:
          "1. **Au téléphone**, vous décrivez la vitre cassée, sa taille, le type de menuiserie et si l'ouverture est exposée (rez-de-chaussée, porte, accès rue). Nous vous indiquons comment sécuriser en attendant.\n2. **Sur place**, nous retirons les débris et les éclats du cadre, nous vérifions l'état de la menuiserie et nous relevons les cotes exactes : dimensions, épaisseur, feuillure, type de pose (parcloses, mastic, joint).\n3. **Prix annoncé** avant de commencer, vitrage et pose compris.\n4. **Pose** : si le verre est en dimensions courantes, la vitre est remplacée dans la foulée ; s'il doit être découpé ou fabriqué (double vitrage, feuilleté, format spécial), nous fermons provisoirement l'ouverture et revenons poser au créneau convenu.\n5. **Finitions** : calage, parcloses remises, joints ou mastic, nettoyage du vitrage et des abords, débris emportés.\n\nSi la casse suit une effraction ou une tempête et qu'il faut d'abord sécuriser, voir notre page [dépannage vitrier](/prestations/depannage-vitrier-perpignan).",
      },
      {
        title: "Vitre cassée et assurance habitation",
        content:
          "La plupart des contrats d'assurance habitation comportent une garantie **bris de glace** qui couvre les vitrages du logement (fenêtres, portes, baies, parfois velux et vérandas), selon les conditions et la franchise du contrat. En location, la vitre cassée par l'occupant relève en général de son assurance ; une casse due à la vétusté ou à un événement extérieur se discute avec le propriétaire.\n\nCe que nous vous conseillons : photographier la vitre avant tout nettoyage, déclarer le sinistre à votre assureur dans le délai prévu au contrat (souvent cinq jours ouvrés), conserver les morceaux si l'assureur le demande. Nous vous remettons une facture détaillée indiquant le vitrage posé, ses dimensions et la pose, utile pour votre dossier. Les modalités de remboursement dépendent de votre contrat : nous ne nous engageons pas à leur place.",
      },
      {
        title: "Remplacement de vitre à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nMaisons de ville du centre avec menuiseries bois anciennes, appartements des années 60 en simple vitrage, villas récentes en aluminium avec grandes baies : chaque menuiserie a sa façon de recevoir un vitrage, et nous relevons les cotes en conséquence. Un doute sur ce qui est cassé ? Un appel suffit.`,
      },
    ],
    highlights: [
      "Fenêtre, porte, baie vitrée, velux, châssis anciens",
      "Verre clair, feuilleté, trempé, isolant ou dépoli selon l'usage",
      "Cotes relevées sur place par la personne qui pose",
      "Facture détaillée pour votre assurance",
    ],
    faq: [
      { question: "Combien coûte le remplacement d'une vitre cassée ?", answer: "Le prix dépend du type de verre (simple, feuilleté, trempé, double vitrage), de ses dimensions et de son épaisseur, et de la menuiserie. Nous relevons les cotes sur place et nous vous annonçons le prix avant de poser." },
      { question: "Faut-il changer toute la fenêtre ?", answer: "Non, dans la grande majorité des cas : seul le vitrage est remplacé, la menuiserie est conservée. Nous vérifions sur place que le cadre est en état de recevoir un vitrage neuf ; s'il ne l'est pas, nous vous le disons." },
      { question: "Que faire en attendant votre passage ?", answer: "Éloignez enfants et animaux, ne touchez pas aux éclats restés dans le cadre, ramassez les morceaux au sol avec des gants ou un carton, et fermez l'ouverture avec un carton épais ou une planche fixés au ruban adhésif large. Nous vous précisons ces gestes au téléphone." },
      { question: "Pouvez-vous remplacer un simple vitrage par un double vitrage ?", answer: "Souvent oui, si la feuillure de la menuiserie a la profondeur nécessaire. Nous le vérifions au relevé des cotes et nous vous proposons les deux options avec leur prix." },
      { question: "Le verre est-il posé le jour même ?", answer: "Une vitre de dimensions courantes en verre simple peut être posée à la première visite. Un double vitrage, un feuilleté ou un format particulier doit être fabriqué aux cotes : nous sécurisons l'ouverture en attendant et nous revenons poser au créneau convenu." },
    ],
    links: [L.depannage, L.doubleVitrage, L.vitrine, CONTACT],
  },

  {
    slug: "prestations/depannage-vitrier-perpignan",
    h1: "Dépannage vitrier Perpignan",
    meta_title: "Dépannage vitrier Perpignan : bris de glace, mise en sécurité",
    meta_description:
      "Vitrage brisé après une effraction, un choc ou une tempête à Perpignan et alentours : mise en sécurité, fermeture provisoire, remplacement du vitrage. Créneau fixé à l'appel, prix annoncé avant de poser.",
    service: "Dépannage vitrier",
    card: {
      title: "Dépannage et mise en sécurité",
      tagline: "Effraction, tempête, bris de glace",
      description: "Vitrage brisé après une effraction, un choc ou une tempête : mise en sécurité, fermeture provisoire si le vitrage doit être commandé, puis remplacement.",
      badges: ["Perpignan et alentours", "Prix annoncé avant"],
      featured: true,
    },
    intro:
      "Une porte-fenêtre forcée pendant votre absence, une baie brisée par une rafale, une vitrine éclatée dans la nuit, une fenêtre traversée par une branche : quand un vitrage est ouvert sur l'extérieur, la question n'est plus seulement de remplacer le verre mais de fermer, tout de suite, et proprement. Nous dépannons à Perpignan et dans les communes voisines : mise en sécurité de l'ouverture, fermeture provisoire si le vitrage doit être fabriqué, puis remplacement.\n\nAppelez-nous et décrivez ce qui est cassé et ce qui reste ouvert : nous fixons le créneau le plus proche, nous vous indiquons les gestes à faire en attendant et nous annonçons le prix avant d'intervenir.",
    sections: [
      {
        title: "Les situations que nous traitons",
        content:
          "- **Effraction ou tentative** : vitrage d'une porte, d'une fenêtre ou d'une baie cassé pour entrer ; il faut refermer avant la nuit et remplacer ensuite.\n- **Tempête, tramontane, grêle** : vitrage éclaté par un objet projeté ou une branche, velux fêlé, véranda touchée.\n- **Choc accidentel** : meuble, ballon, outil, chute sur une porte vitrée ou une paroi.\n- **Vitrine de commerce brisée** : voir aussi notre page [vitrine de magasin](/prestations/vitrine-magasin-perpignan) pour le remplacement.\n- **Vitrage fissuré qui menace de tomber** : verre simple fendu sur toute la hauteur, double vitrage dont une face a éclaté.\n- **Porte de hall d'immeuble ou de cage d'escalier** cassée, à la demande du syndic ou d'un copropriétaire.\n\nSi le vitrage est intact mais que la fenêtre ne ferme plus (gond, crémone), c'est un menuisier ou un serrurier qu'il vous faut ; nous vous le disons au téléphone.",
      },
      {
        title: "Mettre en sécurité, puis remplacer",
        content:
          "Un dépannage vitrerie se fait en deux temps quand le verre ne peut pas être remplacé immédiatement :\n\n1. **Dégagement des éclats** : les morceaux restés dans le cadre sont retirés, le sol et les abords sont nettoyés, les débris sont emportés. Personne ne doit se couper en passant.\n2. **Fermeture provisoire** : un panneau rigide (bois ou aggloméré) fixé sur la menuiserie ou dans la feuillure, ajusté aux dimensions de l'ouverture, pour fermer contre le vent, la pluie et l'intrusion en attendant le vitrage.\n3. **Relevé des cotes** : dimensions, épaisseur, type de verre, feuillure, sens de pose ; le vitrage est commandé aux mesures exactes.\n4. **Remplacement** au créneau convenu : pose, calage, joints, nettoyage, retrait du panneau provisoire.\n\nQuand le verre est en dimensions courantes (verre simple, petit carreau), le remplacement peut se faire dès la première visite, sans fermeture provisoire. Nous vous le disons au téléphone selon ce que vous décrivez.",
      },
      {
        title: "Quel vitrage reposer après une casse",
        content:
          "Une casse est souvent le moment de reposer un verre plus adapté que celui qui vient de céder :\n\n- Après une **effraction**, un **verre feuilleté** (deux verres collés par un film) retarde nettement l'intrusion : il se fissure mais reste en place.\n- Sur une **porte ou une baie accessible**, feuilleté ou trempé évitent les éclats coupants.\n- Sur un **double vitrage** dont une seule face est cassée, c'est l'ensemble du vitrage isolant qui se remplace, car le gaz et l'étanchéité entre les deux verres sont perdus ; voir notre page [double vitrage](/prestations/remplacement-double-vitrage-perpignan).\n- Sur une **menuiserie ancienne**, le verre est reposé au mastic ou sous parcloses selon l'existant.\n\nNous vous expliquons le choix, ses avantages et sa contrepartie ; vous décidez.",
      },
      {
        title: "Effraction, tempête : les démarches",
        content:
          "- **Effraction** : ne touchez à rien avant le passage de la police ou de la gendarmerie si vous déposez plainte ; le dépôt de plainte est en général demandé par l'assureur pour un vol. Nous pouvons mettre en sécurité après le constat.\n- **Déclaration à l'assureur** : le délai courant est de cinq jours ouvrés pour un bris de glace, deux jours ouvrés pour un vol, dix jours après l'arrêté pour une catastrophe naturelle ; vérifiez votre contrat.\n- **Preuves** : photos du vitrage cassé et des dégâts, morceaux conservés si demandé, facture de la mise en sécurité et du remplacement.\n- **Location** : prévenez votre propriétaire ou l'agence ; la répartition des frais dépend de la cause.\n\nNous vous remettons une facture détaillée pour chaque intervention (mise en sécurité, remplacement), avec le vitrage posé et ses dimensions. Les conditions de prise en charge dépendent de votre contrat, pas de nous.",
      },
      {
        title: "Dépannage vitrier à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nEn attendant notre passage : éloignez enfants et animaux, ne retirez pas les éclats encore en place dans le cadre, ramassez les morceaux au sol avec des gants, et fermez l'ouverture avec un carton épais ou une planche fixée au ruban adhésif large. Pour une [vitre cassée](/prestations/remplacement-vitre-cassee-perpignan) sans urgence de fermeture, le remplacement se planifie simplement au créneau qui vous convient.`,
      },
    ],
    highlights: [
      "Éclats retirés, ouverture fermée par un panneau provisoire si le vitrage doit être fabriqué",
      "Verre feuilleté conseillé après une effraction",
      "Créneau fixé à l'appel, prix annoncé avant d'intervenir",
      "Facture détaillée de chaque intervention pour votre assurance",
    ],
    faq: [
      { question: "Intervenez-vous le soir ou le week-end ?", answer: "Appelez-nous : nous vous donnons le créneau le plus proche que nous pouvons tenir et nous vous indiquons comment fermer l'ouverture en attendant. Nous ne promettons pas un délai que nous ne sommes pas certains de respecter." },
      { question: "Combien coûte une mise en sécurité ?", answer: "Elle dépend de la taille de l'ouverture et du travail de dégagement. Nous vous annonçons le prix au téléphone ou sur place avant de commencer, puis le prix du remplacement une fois les cotes relevées." },
      { question: "Faut-il attendre la police avant de fermer ?", answer: "Si vous déposez plainte pour une effraction, laissez les lieux en l'état jusqu'au constat, ou demandez aux forces de l'ordre si vous pouvez sécuriser avant. Nous intervenons ensuite." },
      { question: "Mon assurance impose-t-elle un vitrier ?", answer: "Certains contrats proposent un réseau d'artisans, la plupart laissent le choix. Vérifiez votre contrat ou appelez votre assureur ; dans tous les cas, notre facture détaillée sert au dossier." },
      { question: "Pouvez-vous remplacer le vitrage lors de la première visite ?", answer: "Oui si le verre est en dimensions courantes et disponible ; sinon nous fermons provisoirement, nous relevons les cotes et nous revenons poser le vitrage fabriqué à vos mesures." },
    ],
    links: [L.vitre, L.vitrine, L.doubleVitrage, CONTACT],
  },

  {
    slug: "prestations/remplacement-double-vitrage-perpignan",
    h1: "Double vitrage Perpignan",
    meta_title: "Double vitrage Perpignan : remplacement sans changer la fenêtre",
    meta_description:
      "Double vitrage embué, cassé ou simple vitrage à isoler à Perpignan et alentours : remplacement du vitrage seul sur menuiserie bois, PVC ou alu. Cotes relevées sur place, devis écrit avant la pose.",
    service: "Double vitrage",
    card: {
      title: "Double vitrage",
      tagline: "Vitrage embué, cassé ou à isoler",
      description: "Remplacement d'un double vitrage embué ou cassé sans changer la fenêtre, ou passage d'un simple vitrage à un double vitrage isolant sur menuiserie existante.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: true,
    },
    intro:
      "De la buée entre les deux verres qui ne part jamais, une face fissurée, un vitrage qui laisse passer le froid l'hiver et la chaleur l'été, une fenêtre en simple vitrage dans une chambre côté rue : le double vitrage se remplace ou se pose sans toucher à la menuiserie, quand celle-ci est en bon état. Nous remplaçons et posons des doubles vitrages à Perpignan et dans les communes voisines, sur fenêtres bois, PVC et aluminium.\n\nAppelez-nous et décrivez la fenêtre : nous passons relever les cotes, nous vérifions que la menuiserie peut recevoir le vitrage et nous vous remettons un devis écrit avant de commander.",
    sections: [
      {
        title: "Quand remplacer un double vitrage",
        content:
          "- **Buée ou condensation entre les deux verres** : le joint périphérique a lâché, l'air humide est entré ; le vitrage a perdu son isolation et ne se répare pas, il se remplace.\n- **Une face cassée ou fissurée** : même si l'autre tient, le gaz isolant s'est échappé et l'étanchéité est perdue.\n- **Vitrage ancien, peu isolant** : un double vitrage des années 80-90 isole bien moins qu'un vitrage isolant actuel à faible émissivité.\n- **Bruit** : côté rue, avenue ou voie ferrée, un vitrage acoustique (feuilleté avec film acoustique, épaisseurs asymétriques) réduit nettement les nuisances.\n- **Chaleur** : sur une baie exposée plein sud ou ouest, un vitrage à contrôle solaire limite la surchauffe d'été.\n- **Sécurité** : un vitrage isolant peut être feuilleté côté intérieur ou extérieur pour retarder une effraction ou éviter les éclats.\n\nSi la menuiserie elle-même est déformée, pourrie ou si les ferrures sont hors d'usage, c'est la fenêtre entière qu'il faut changer : nous vous le disons à la visite.",
      },
      {
        title: "Remplacer le vitrage, garder la fenêtre",
        content:
          "Un double vitrage est un ensemble scellé : deux verres, un intercalaire, un gaz isolant, un joint périphérique. Il se remplace comme un bloc, aux dimensions exactes de la feuillure :\n\n1. **Relevé des cotes** : largeur, hauteur, épaisseur totale du vitrage existant (par exemple 4/16/4), profondeur de la feuillure, type de parcloses, cales.\n2. **Choix du vitrage** avec vous : isolant standard, faible émissivité, acoustique, contrôle solaire, feuilleté, dépoli.\n3. **Fabrication** aux mesures, puis pose au créneau convenu : dépose des parcloses, retrait de l'ancien vitrage, calage du neuf, remise des parcloses, joints.\n4. **Contrôle** de la fermeture, de l'ouverture et de l'étanchéité, nettoyage.\n\nLa fenêtre reste en place tout au long de l'intervention ; pas de maçonnerie, pas de reprise de peinture.",
      },
      {
        title: "Passer du simple au double vitrage",
        content:
          "Sur une menuiserie en bon état, il est souvent possible de remplacer un simple vitrage par un double vitrage isolant sans changer la fenêtre :\n\n- **Menuiserie bois ancienne** : si la feuillure est assez profonde, un double vitrage mince (par exemple 4/6/4 ou 4/8/4) prend la place du verre simple ; sinon, la feuillure peut parfois être élargie.\n- **Menuiserie alu ou PVC** conçue pour un simple vitrage : le profil accepte ou non l'épaisseur ; nous le vérifions à la visite.\n- **Poids** : un double vitrage est plus lourd ; les paumelles et la traverse doivent le supporter.\n- **Survitrage** : un second verre ajouté sur le vantail existant, solution intermédiaire quand la feuillure ne permet pas un double vitrage.\n\nLe gain : moins de froid près de la fenêtre, moins de condensation sur la vitre l'hiver, moins de bruit, sans le coût ni les travaux d'une fenêtre complète. Nous vous disons franchement quand la fenêtre entière est le meilleur choix.",
      },
      {
        title: "Choisir le bon vitrage isolant",
        content:
          "Un double vitrage se lit ainsi : épaisseur du verre extérieur / lame d'air ou de gaz / épaisseur du verre intérieur, en millimètres. Les choix qui comptent :\n\n- **Faible émissivité** : une couche invisible sur le verre intérieur renvoie la chaleur dans la pièce ; c'est le standard actuel.\n- **Gaz argon** dans la lame : meilleure isolation qu'avec de l'air.\n- **Intercalaire à bord chaud** : moins de condensation sur le pourtour du vitrage.\n- **Acoustique** : verres d'épaisseurs différentes ou verre feuilleté acoustique côté bruit.\n- **Contrôle solaire** : pour les expositions sud et ouest, très demandé à Perpignan.\n- **Sécurité** : feuilleté sur une face pour les portes, baies et rez-de-chaussée.\n\nNous vous proposons une ou deux compositions adaptées à la pièce, à l'exposition et au budget, avec leur prix sur le devis.",
      },
      {
        title: "Double vitrage à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nClimat méditerranéen, tramontane et étés chauds : à Perpignan, un vitrage se choisit autant pour la chaleur que pour le froid. Une [vitre cassée](/prestations/remplacement-vitre-cassee-perpignan) sur une fenêtre en simple vitrage est aussi l'occasion de passer à l'isolant ; une [vitrine](/prestations/vitrine-magasin-perpignan) peut recevoir un vitrage isolant à contrôle solaire.`,
      },
    ],
    highlights: [
      "Vitrage remplacé seul, menuiserie conservée",
      "Faible émissivité, acoustique, contrôle solaire, feuilleté selon la pièce",
      "Simple vitrage remplacé par un isolant quand la feuillure le permet",
      "Cotes relevées sur place, devis écrit avant commande",
    ],
    faq: [
      { question: "Combien coûte le remplacement d'un double vitrage ?", answer: "Le prix dépend des dimensions, de la composition (standard, faible émissivité, acoustique, contrôle solaire, feuilleté) et de la pose. Nous relevons les cotes sur place et vous recevez un devis écrit avant toute commande." },
      { question: "La buée entre les verres peut-elle se réparer ?", answer: "Non. Une fois le joint périphérique percé, le vitrage a perdu son gaz et son étanchéité ; seul le remplacement du vitrage rend l'isolation. La menuiserie, elle, est conservée." },
      { question: "Combien de temps dure la pose ?", answer: "Le remplacement d'un vitrage sur une fenêtre standard se fait en une visite après fabrication, sans travaux dans la pièce. La durée figure sur le devis selon le nombre de vitrages." },
      { question: "Peut-on poser un double vitrage sur une vieille fenêtre en bois ?", answer: "Souvent, si le bois est sain et la feuillure assez profonde ; parfois en élargissant la feuillure ou avec un double vitrage mince. Nous le vérifions à la visite et nous vous disons si la fenêtre mérite plutôt d'être changée." },
      { question: "Existe-t-il des aides pour le double vitrage ?", answer: "Des dispositifs publics existent pour les travaux d'isolation, avec des conditions précises (type de vitrage, qualification de l'entreprise, ressources). Renseignez-vous auprès des organismes officiels ; nous ne nous prononçons pas sur votre éligibilité." },
    ],
    links: [L.vitre, L.vitrine, L.verre, CONTACT],
  },

  {
    slug: "prestations/vitrine-magasin-perpignan",
    h1: "Vitrine de magasin Perpignan",
    meta_title: "Vitrine de magasin Perpignan : remplacement, sécurité, rénovation",
    meta_description:
      "Vitrine brisée ou à rénover à Perpignan et alentours : mise en sécurité, verre feuilleté ou trempé aux dimensions, pose en journée ou hors ouverture. Devis écrit, facture pour votre assurance.",
    service: "Vitrine de magasin",
    card: {
      title: "Vitrine de magasin",
      tagline: "Commerce, agence, restaurant",
      description: "Vitrine brisée ou à rénover : mise en sécurité, vitrage feuilleté ou trempé aux bonnes dimensions, pose en journée ou hors ouverture selon votre activité.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: true,
    },
    intro:
      "Une vitrine éclatée au petit matin, une fissure qui traverse la devanture, un panneau embué qui gâche l'étalage, une agence ou un restaurant à rénover : pour un commerce, la vitrine est à la fois la façade, la sécurité et l'accueil. Nous remplaçons et posons les vitrines à Perpignan et dans les communes voisines : boutiques, agences, restaurants, cabinets, halls.\n\nAppelez-nous et décrivez la vitrine : dimensions approximatives, nombre de panneaux, ce qui est cassé, si le local est ouvert sur la rue. Nous fixons le créneau le plus proche, nous sécurisons si nécessaire et nous vous remettons un devis écrit avant de commander le vitrage.",
    sections: [
      {
        title: "Vitrine cassée : sécuriser, puis remplacer",
        content:
          "Une vitrine brisée expose le stock, la caisse et les passants. L'intervention se fait en deux temps quand le vitrage doit être fabriqué :\n\n1. **Mise en sécurité** : dégagement des éclats du cadre et du trottoir, fermeture de l'ouverture par un panneau rigide fixé sur la structure, à la dimension de la baie, pour rouvrir ou fermer boutique sans risque.\n2. **Relevé des cotes** : dimensions exactes, épaisseur, type de fixation (profilé alu, feuillure bois, parcloses, pinces), sens de pose, accès pour la manutention.\n3. **Fabrication** du vitrage aux mesures, en feuilleté ou trempé selon le cas.\n4. **Pose** au créneau qui gêne le moins votre activité : tôt le matin, en journée creuse ou hors ouverture ; ventouses de manutention, calage, joints, nettoyage.\n\nLes dimensions d'une vitrine dépassent souvent celles d'une vitre courante : l'accès (trottoir, terrasse, stationnement) se prépare à l'appel.",
      },
      {
        title: "Quel verre pour une vitrine",
        content:
          "- **Verre feuilleté** : deux ou plusieurs verres collés par des films ; en cas de choc, il se fissure mais reste en place et retarde l'intrusion. C'est le verre de référence pour une devanture donnant sur la rue.\n- **Verre trempé** : très résistant aux chocs et à la flexion, il se fragmente en petits morceaux non coupants s'il casse ; adapté aux portes vitrées et aux panneaux très sollicités, mais il laisse le local ouvert une fois brisé.\n- **Feuilleté renforcé** : plusieurs films pour les commerces exposés (bijouterie, téléphonie, tabac) ; à combiner avec le rideau ou la grille.\n- **Vitrage isolant** : pour une agence ou un restaurant chauffé et climatisé, un double vitrage feuilleté limite les pertes et la condensation.\n- **Contrôle solaire** : sur une vitrine exposée au sud, il limite l'échauffement de l'étalage et la décoloration.\n- **Dépoli ou sablé** : pour préserver l'intimité d'un cabinet ou d'une salle.\n\nNous vous proposons le verre adapté à votre activité et à l'exposition ; le devis indique la composition et l'épaisseur.",
      },
      {
        title: "Rénover une devanture",
        content:
          "Au-delà de la casse, une vitrine se change pour rajeunir la façade, agrandir la surface vitrée, isoler ou sécuriser :\n\n- **Remplacement des panneaux** dans la structure existante, avec un verre plus clair, isolant ou feuilleté.\n- **Porte vitrée** en verre trempé ou feuilleté, avec ses ferrures, poignées et serrure.\n- **Vitrage d'angle, panneaux de grande hauteur, imposte** au-dessus de la porte.\n- **Miroirs** et **verre sur mesure** à l'intérieur du local : fond de vitrine, étagères en verre, comptoir, cloison ; voir nos pages [miroir sur mesure](/prestations/miroir-sur-mesure-perpignan) et [verre sur mesure](/prestations/verre-sur-mesure-perpignan).\n\nLa structure (profilés aluminium, châssis acier, menuiserie bois) doit être en état de recevoir le vitrage neuf ; nous le vérifions à la visite et nous vous disons si un menuisier ou un métallier doit intervenir avant nous.",
      },
      {
        title: "Assurance professionnelle et démarches",
        content:
          "Les contrats multirisque professionnelle comportent en général une garantie bris de glace couvrant vitrines, enseignes vitrées et portes, selon leurs conditions et leur franchise. Après une casse :\n\n- **Photographiez** la vitrine avant tout nettoyage, de l'intérieur et de la rue.\n- **Déposez plainte** en cas de vandalisme ou d'effraction ; l'assureur le demande.\n- **Déclarez** le sinistre dans le délai du contrat (souvent cinq jours ouvrés, deux pour un vol).\n- **Conservez** les factures de mise en sécurité et de remplacement.\n\nNous vous remettons une facture détaillée pour chaque intervention, avec le vitrage posé, ses dimensions et sa composition. Les conditions de prise en charge et le montant remboursé dépendent de votre contrat ; nous ne nous engageons pas pour l'assureur.",
      },
      {
        title: "Vitrines à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nCommerces du centre-ville, agences des boulevards, restaurants des places, cellules des zones commerciales : chaque devanture a ses contraintes d'accès et d'horaires, et nous nous adaptons aux vôtres. Pour un [dépannage](/prestations/depannage-vitrier-perpignan) après une effraction ou une tempête, appelez-nous dès que possible : la mise en sécurité ne se remet pas au lendemain.`,
      },
    ],
    highlights: [
      "Mise en sécurité de la devanture, éclats retirés du trottoir",
      "Feuilleté, trempé, isolant ou contrôle solaire selon le commerce",
      "Pose au créneau qui gêne le moins l'activité",
      "Devis écrit et facture détaillée pour l'assurance",
    ],
    faq: [
      { question: "Combien coûte le remplacement d'une vitrine ?", answer: "Le prix dépend des dimensions, du type de verre (feuilleté, trempé, isolant), de l'épaisseur, de la fixation et de l'accès pour la manutention. Après le relevé des cotes, vous recevez un devis écrit avant toute commande." },
      { question: "Ma boutique peut-elle rester ouverte en attendant le vitrage ?", answer: "Oui, une fois la vitrine mise en sécurité par un panneau rigide fixé sur la structure. Vous pouvez signaler « ouvert » sur le panneau ; nous revenons poser le verre au créneau convenu." },
      { question: "Pouvez-vous poser hors des heures d'ouverture ?", answer: "Nous convenons ensemble du créneau qui gêne le moins votre activité, y compris tôt le matin ou en journée creuse. Ce qui est possible dépend de notre planning ; nous vous le disons au téléphone." },
      { question: "Feuilleté ou trempé pour une vitrine ?", answer: "Le feuilleté reste en place s'il casse et retarde l'intrusion : c'est le verre conseillé pour une devanture sur rue. Le trempé résiste mieux aux chocs mais libère l'ouverture une fois brisé ; il convient aux portes et aux panneaux très sollicités." },
      { question: "Faites-vous les enseignes et les stores ?", answer: "Non, nous nous concentrons sur le vitrage : vitrine, porte vitrée, imposte, miroirs et verre intérieur. Pour l'enseigne, le rideau ou le store, nous vous orientons vers le bon métier." },
    ],
    links: [L.depannage, L.doubleVitrage, L.verre, CONTACT],
  },

  {
    slug: "prestations/miroir-sur-mesure-perpignan",
    h1: "Miroir sur mesure Perpignan",
    meta_title: "Miroir sur mesure Perpignan : salle de bain, entrée, dressing",
    meta_description:
      "Miroir découpé aux dimensions de votre mur ou de votre meuble à Perpignan et alentours : salle de bain, entrée, dressing, salle de sport. Bords polis, pose collée ou sur pattes, remplacement d'un miroir cassé. Devis écrit.",
    service: "Miroir sur mesure",
    card: {
      title: "Miroir sur mesure",
      tagline: "Salle de bain, entrée, salle de sport, dressing",
      description: "Miroir découpé aux dimensions de votre mur ou de votre meuble, bords polis, pose collée ou sur pattes, remplacement d'un miroir cassé.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: false,
    },
    intro:
      "Un miroir qui couvre tout le mur au-dessus de la double vasque, un grand miroir d'entrée qui agrandit un couloir, un pan de dressing, un mur de salle de sport, un miroir de meuble ancien cassé à refaire à l'identique : un miroir sur mesure se découpe aux dimensions exactes, se façonne et se pose au millimètre. Nous fabriquons et posons des miroirs sur mesure à Perpignan et dans les communes voisines.\n\nAppelez-nous et décrivez l'emplacement : dimensions souhaitées, support, contraintes (prises, robinetterie, applique). Nous relevons les cotes sur place et vous recevez un devis écrit avant la découpe.",
    sections: [
      {
        title: "Les miroirs que nous réalisons",
        content:
          "- **Miroir de salle de bain** : au-dessus d'une vasque ou d'un plan, d'un mur à l'autre, avec découpes pour les appliques et les prises.\n- **Miroir d'entrée ou de couloir** : grand format vertical ou horizontal pour agrandir et éclairer.\n- **Dressing et chambre** : panneau plein, porte de placard ou pan de mur.\n- **Salle de sport, studio de danse, cabinet** : mur complet en plusieurs panneaux jointifs.\n- **Miroir de meuble, d'armoire ancienne ou de cheminée** : refait aux cotes de l'existant, y compris en forme (arrondi, cintré, ovale).\n- **Miroir de commerce** : cabine d'essayage, salon de coiffure, fond de vitrine.\n- **Miroir cassé à remplacer** : dépose de l'ancien, nettoyage du support, pose du neuf.\n\nPour une paroi, une crédence ou un plateau, voir notre page [verre sur mesure](/prestations/verre-sur-mesure-perpignan).",
      },
      {
        title: "Épaisseur, bords, finitions",
        content:
          "Un miroir se choisit au-delà de ses dimensions :\n\n- **Épaisseur** : 4 mm pour un miroir de meuble ou de petite taille, 6 mm pour un grand format collé au mur, plus stable et sans déformation de l'image.\n- **Bords** : joint plat poli (le plus courant), biseau de 10 à 40 mm pour un effet cadre, bords rodés pour un miroir encastré.\n- **Découpes et perçages** : passages de prises, d'appliques, de robinetterie murale ; angles arrondis pour la sécurité.\n- **Teinte** : argent classique, bronze, gris fumé pour un rendu plus chaud ou plus contemporain.\n- **Miroir sécurisé** : film au dos qui retient les morceaux en cas de casse ; conseillé dans une chambre d'enfant, une salle de sport, un lieu recevant du public.\n- **Anti-buée** : film chauffant collé au dos pour la salle de bain.\n\nNous vous conseillons la combinaison adaptée au lieu et à l'usage, sur devis.",
      },
      {
        title: "Comment nous posons un miroir",
        content:
          "1. **Relevé des cotes** sur place : dimensions, planéité et nature du support (carrelage, plâtre, bois), obstacles à découper, hauteur de pose.\n2. **Devis écrit** : dimensions, épaisseur, finition des bords, découpes, mode de pose.\n3. **Fabrication** : découpe, façonnage des bords, perçages, éventuel film de sécurité.\n4. **Pose** : collée au mur avec une colle adaptée aux miroirs (le mauvais mastic tache l'argenture en quelques mois), sur pattes ou profilés pour un support irrégulier ou un miroir démontable, sur crochets pour un miroir de meuble.\n5. **Contrôle** : alignement, joints silicone en salle de bain, nettoyage.\n\nSur un mur non plan ou humide, nous vous disons ce qu'il faut préparer avant la pose, pour que le miroir ne se voile pas et ne se décolle pas.",
      },
      {
        title: "Remplacer un miroir cassé",
        content:
          "Un miroir fêlé ou étoilé ne se répare pas ; il se remplace. Ce que nous faisons :\n\n- **Dépose** de l'ancien miroir, collé ou fixé, avec protection du sol et des sanitaires ; les morceaux repartent avec nous.\n- **Nettoyage du support** : résidus de colle retirés, surface reprise si besoin.\n- **Miroir neuf** aux cotes de l'ancien ou aux nouvelles dimensions si vous souhaitez en profiter pour l'agrandir.\n- **Pose** avec les fixations adaptées, en sécurisé si l'emplacement le justifie.\n\nUn miroir de meuble ou de porte d'armoire est refait à l'identique, forme comprise. Si la casse suit un choc ou un dégât plus large, notre facture détaillée sert à votre dossier d'assurance.",
      },
      {
        title: "Miroirs sur mesure à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nUn miroir s'accorde souvent avec le reste du verre d'une pièce : [paroi de douche, crédence, étagères](/prestations/verre-sur-mesure-perpignan) se relèvent et se posent dans la même visite. Pour un commerce, il complète la [vitrine](/prestations/vitrine-magasin-perpignan) et l'aménagement intérieur.`,
      },
    ],
    highlights: [
      "Découpe aux dimensions exactes, découpes pour prises et appliques",
      "Bords polis ou biseautés, film de sécurité, anti-buée",
      "Pose collée, sur pattes ou sur crochets selon le support",
      "Remplacement d'un miroir cassé, forme comprise",
    ],
    faq: [
      { question: "Combien coûte un miroir sur mesure ?", answer: "Le prix dépend des dimensions, de l'épaisseur, de la finition des bords, des découpes et du mode de pose. Nous relevons les cotes sur place et vous recevez un devis écrit avant la découpe." },
      { question: "Quelle épaisseur pour un grand miroir de salle de bain ?", answer: "6 mm pour un grand format collé au mur : plus stable, image sans déformation. 4 mm suffit pour un petit miroir ou un miroir de meuble. Nous vous conseillons selon la taille et la pose." },
      { question: "Peut-on coller un miroir sur du carrelage ?", answer: "Oui, avec une colle spéciale miroir qui ne dégrade pas l'argenture, sur un support propre, sec et plan. Si le carrelage est en relief ou irrégulier, la pose sur pattes ou profilés est préférable." },
      { question: "Faites-vous les miroirs en forme (rond, ovale, cintré) ?", answer: "Oui : découpe en forme d'après un gabarit relevé sur place ou d'après vos dimensions, bords polis. Un miroir de meuble ancien peut être refait à l'identique." },
      { question: "Le miroir est-il livré et posé le jour du relevé ?", answer: "Non : un miroir sur mesure est découpé et façonné après le relevé des cotes, puis posé au créneau convenu. Le devis précise l'organisation." },
    ],
    links: [L.verre, L.vitrine, L.vitre, CONTACT],
  },

  {
    slug: "prestations/verre-sur-mesure-perpignan",
    h1: "Verre sur mesure Perpignan",
    meta_title: "Verre sur mesure Perpignan : paroi de douche, crédence, plateau",
    meta_description:
      "Découpe et pose de verre trempé ou feuilleté à vos dimensions à Perpignan et alentours : paroi de douche, crédence de cuisine, plateau de table, étagère, garde-corps, verrière. Cotes relevées sur place, devis écrit.",
    service: "Verre sur mesure",
    card: {
      title: "Verre sur mesure",
      tagline: "Paroi de douche, crédence, plateau, garde-corps",
      description: "Découpe et pose de verre trempé ou feuilleté à vos dimensions : paroi de douche, crédence de cuisine, plateau de table, étagère, garde-corps, verrière.",
      badges: ["Perpignan et alentours", "Devis écrit"],
      featured: false,
    },
    intro:
      "Une douche à l'italienne qui attend sa paroi, une crédence de cuisine en verre laqué à la place du carrelage, un plateau pour protéger une table en bois, des étagères dans une niche, un garde-corps de mezzanine, une verrière entre la cuisine et le salon : le verre sur mesure se découpe, se façonne et se pose aux dimensions exactes de votre pièce. Nous fabriquons et posons du verre sur mesure à Perpignan et dans les communes voisines.\n\nAppelez-nous et décrivez le projet : usage, dimensions approximatives, support. Nous relevons les cotes sur place, nous vous conseillons le verre adapté et vous recevez un devis écrit avant la découpe.",
    sections: [
      {
        title: "Ce que nous réalisons en verre sur mesure",
        content:
          "- **Paroi de douche** fixe ou avec porte, en verre trempé 8 ou 10 mm, transparent, dépoli ou sérigraphié, fixée au mur et au sol par profilé ou pinces.\n- **Crédence de cuisine** en verre trempé laqué de la couleur de votre choix, ou transparent sur un mur peint, avec découpes pour les prises.\n- **Plateau de table** ou de bureau : verre clair, extra-clair ou teinté, bords polis, angles arrondis, posé sur un piètement ou sur un meuble à protéger.\n- **Étagères et tablettes** en verre, dans une niche, une salle de bain, une vitrine.\n- **Garde-corps** de balcon, mezzanine ou escalier en verre feuilleté, sur profilé ou pinces.\n- **Verrière intérieure** : verre clair, feuilleté ou dépoli dans une structure acier ou aluminium existante ou fournie par votre menuisier.\n- **Porte et cloison en verre**, **pare-vue**, **dessus de radiateur**, **plaque de protection** derrière un poêle.\n\nPour un miroir, voir notre page [miroir sur mesure](/prestations/miroir-sur-mesure-perpignan).",
      },
      {
        title: "Trempé, feuilleté, laqué : le bon verre pour chaque usage",
        content:
          "- **Verre trempé** : chauffé puis refroidi brusquement, il résiste quatre à cinq fois mieux aux chocs et se fragmente en petits morceaux non coupants. Obligatoire pour une paroi de douche, une crédence près d'une plaque de cuisson, une porte en verre. Il se découpe et se perce **avant** la trempe : les cotes doivent être justes dès la commande.\n- **Verre feuilleté** : plusieurs verres collés par des films ; il reste en place s'il casse. C'est le verre des garde-corps, des verrières hautes et des vitrages au-dessus d'un passage.\n- **Verre laqué** : peint au dos puis trempé, pour une crédence ou un fond de meuble d'une couleur unie.\n- **Verre extra-clair** : sans la teinte verte du verre courant, pour un plateau ou une paroi où la transparence compte.\n- **Dépoli, sablé, sérigraphié** : intimité et décor, sur paroi de douche, cloison, verrière.\n\nL'épaisseur dépend de l'usage et des dimensions : nous la fixons avec vous sur le devis.",
      },
      {
        title: "Du relevé à la pose",
        content:
          "1. **Relevé des cotes** sur place : dimensions, équerrage des murs (rarement d'équerre dans une salle de bain), planéité, emplacement des prises, des robinets et des fixations.\n2. **Devis écrit** : verre, épaisseur, finitions des bords, découpes et perçages, fixations, pose.\n3. **Fabrication** : découpe, façonnage, perçages, trempe ou feuilletage, laquage éventuel.\n4. **Pose** : fixations adaptées au support (profilés, pinces, colle, silicone), calage, réglage des jeux, joints d'étanchéité pour une paroi de douche ou une crédence.\n5. **Contrôle** : stabilité, étanchéité, fonctionnement d'une porte, nettoyage.\n\nUn verre trempé ne se retouche pas après fabrication : c'est pour cela que le relevé est fait par la personne qui pose, et que nous vérifions les cotes deux fois quand les murs ne sont pas droits.",
      },
      {
        title: "Ce qu'il faut prévoir de votre côté",
        content:
          "- **Paroi de douche** : receveur ou sol posé et carrelage fini avant le relevé ; le mur de fixation doit être solide (pas de plaque de plâtre seule sans renfort).\n- **Crédence** : mur peint ou lisse, prises en place, plaque de cuisson et hotte positionnées ; nous découpons autour.\n- **Garde-corps** : structure ou fixations dimensionnées pour le verre feuilleté ; nous travaillons avec votre métallier ou menuisier si la structure est à faire.\n- **Verrière** : cadre posé et d'équerre avant le relevé ; nous fournissons et posons les verres.\n- **Plateau de table** : le meuble ou le piètement sur place, pour relever les cotes réelles.\n\nAu téléphone, nous vous disons dans quel ordre faire intervenir chacun pour que la pose se fasse en une fois.",
      },
      {
        title: "Verre sur mesure à Perpignan et alentours",
        content:
          `Nous intervenons à Perpignan et dans les communes voisines : ${ZONES} et les communes proches. Pour un autre secteur, appelez-nous.\n\nUne rénovation de salle de bain réunit souvent paroi de douche et [miroir](/prestations/miroir-sur-mesure-perpignan) dans une même visite ; un commerce complète sa [vitrine](/prestations/vitrine-magasin-perpignan) avec des étagères, un comptoir ou une cloison en verre. Un [double vitrage](/prestations/remplacement-double-vitrage-perpignan) à remplacer dans la même maison se relève en même temps.`,
      },
    ],
    highlights: [
      "Paroi de douche, crédence, plateau, étagères, garde-corps, verrière",
      "Trempé, feuilleté, laqué, extra-clair ou dépoli selon l'usage",
      "Cotes relevées sur place par la personne qui pose, vérifiées deux fois",
      "Devis écrit avant toute découpe",
    ],
    faq: [
      { question: "Combien coûte une paroi de douche sur mesure ?", answer: "Le prix dépend des dimensions, de l'épaisseur (8 ou 10 mm), de la finition (transparent, dépoli, sérigraphié), des fixations et de la pose. Après le relevé des cotes, vous recevez un devis écrit." },
      { question: "Pourquoi le verre trempé ne peut-il pas être recoupé ?", answer: "La trempe met le verre sous tension : toute découpe ou perçage après coup le fait éclater. Toutes les cotes, découpes et trous sont donc réalisés avant la trempe, d'où l'importance du relevé sur place." },
      { question: "Une crédence en verre résiste-t-elle derrière une plaque de cuisson ?", answer: "Oui, en verre trempé, qui supporte la chaleur d'une plaque et se nettoie d'un coup d'éponge. Le laquage au dos ne craint ni l'eau ni la graisse. Nous respectons les distances prévues par le fabricant de la plaque." },
      { question: "Faites-vous les verrières d'atelier complètes ?", answer: "Nous fournissons et posons les verres dans une structure existante ou réalisée par votre menuisier ou métallier. Si vous n'avez pas de structure, nous vous orientons vers un artisan et nous coordonnons la pose des verres." },
      { question: "Quel délai entre le relevé et la pose ?", answer: "Le verre est fabriqué aux cotes après le relevé (découpe, façonnage, trempe ou laquage), puis posé au créneau convenu. Le devis précise l'organisation ; nous ne promettons pas de délai que nous ne maîtrisons pas." },
    ],
    links: [L.miroir, L.vitrine, L.doubleVitrage, CONTACT],
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
      brief: { source: "seed:vitrier-ads", note: "Rédigé pour Google Ads, aucun fait client (prix, délai, disponibilité, qualification, garantie, stock) — à valider avant publication" },
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
