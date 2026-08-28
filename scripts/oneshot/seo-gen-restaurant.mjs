import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const pages = [
  {
    id: 'f129abc4-2ac8-46f7-8242-634eeb04e801',
    label: 'Le Soler',
    content: {
      metaTitle: 'Livraison Alcool Nuit Le Soler | Mon Sauveur',
      metaDescription: 'Livraison alcool nuit Le Soler (66270). Bière, vin, rosé livrés à domicile jusqu\'à 3h. Service rapide en vallée de la Têt. Appelez maintenant.',
      h1: 'Livraison d\'alcool la nuit au Soler (66270)',
      updatedDate: '2026-04-13',
      intro: 'Vous êtes au Soler et il vous manque quelque chose pour votre soirée ? Mon Sauveur livre l\'alcool à domicile dans toute la commune, que vous habitiez côté pavillons vers la D612 ou dans les lotissements plus récents. Bières, vins, rosés, spiritueux — on arrive chez vous en moins de 30 minutes, en pleine nuit si besoin. Un coup de fil suffit.',
      highlights: [
        'Livraison en 20-30 min au Soler et ses quartiers',
        'Disponible jusqu\'à 3h du matin',
        'Large choix : bières, vins, rosés, spiritueux, apéros',
        'Pas de minimum de commande imposé',
        'Service fiable hors des horaires des supermarchés'
      ],
      trustSignals: [
        'Service connu des habitants de la vallée de la Têt',
        'Livreurs locaux connaissant les rues du Soler',
        'Zéro attente inutile — on vous confirme par téléphone',
        'Tarifs clairs, annoncés avant la livraison'
      ],
      seoSections: [
        {
          title: 'Livraison alcool nuit au Soler : le service qu\'il vous faut',
          content: 'Le Soler, c\'est une commune de 8 000 habitants installée tranquillement en vallée de la Têt, à un quart d\'heure de Perpignan. Les commerces ferment tôt, le supermarché aussi — et quand une soirée s\'improvise ou que les invités arrivent en retard, il n\'y a plus grand-chose d\'ouvert. C\'est exactement le créneau que Mon Sauveur couvre.\n\nNotre service de livraison alcool nuit au Soler fonctionne tous les soirs et jusqu\'à 3h du matin. Vous appelez, vous donnez votre adresse, vous choisissez ce qu\'il vous faut parmi notre sélection — et un livreur part aussitôt. Que vous soyez côté village ancien, vers la zone pavillonnaire le long de la D612 ou dans les rues résidentielles proches de l\'Agouille, on vient jusqu\'à vous. Pas besoin de sortir de chez soi ni de chercher une épicerie encore ouverte à cette heure-là.'
        },
        {
          title: 'Ce qu\'on livre au Soler et comment ça marche',
          content: 'La commande est simple : un appel téléphonique. Vous nous dites ce qu\'il vous faut — une caisse de bières, une bouteille de rosé frais, du whisky, du champagne, ou un kit apéro complet — et on s\'occupe du reste. Pas d\'application à télécharger, pas de compte à créer, pas de carte bancaire à saisir sur un écran à 1h du matin.\n\nNos livraisons au Soler couvrent l\'ensemble de la commune : les rues du centre, les lotissements vers la sortie D612 direction Ille-sur-Têt, ou les quartiers résidentiels proches de la voie ferrée. On connaît le coin, on sait où se garer, on ne perd pas de temps. La livraison prend généralement entre 20 et 30 minutes depuis notre départ. On vous appelle si on a le moindre doute sur l\'adresse.\n\nNotre sélection inclut : bières artisanales et industrielles (33cl, 50cl, pack), vins locaux et nationaux, rosés des Corbières ou du Languedoc, spiritueux (rhum, vodka, gin, whisky, pastis), jus et sodas pour couper, glace si besoin.'
        },
        {
          title: 'Soirées improvisées et apéros tardifs au Soler',
          content: 'La vallée de la Têt, c\'est un bassin de vie animé entre Perpignan et Prades. Le Soler est bien placé — accès rapide à l\'A9, à la N116 — mais ça n\'aide pas quand le dernier Carrefour a baissé le rideau et que vos amis viennent d\'arriver. Mon Sauveur a été lancé exactement pour ces moments-là.\n\nOn reçoit régulièrement des commandes depuis le Soler le vendredi ou samedi soir, quand une soirée qui devait rester tranquille se prolonge plus que prévu. Parfois c\'est une bouteille oubliée lors des courses, parfois c\'est un groupe qui grossit à la dernière minute. Dans tous les cas, l\'appel prend deux minutes et la livraison suit. Pas de stress, pas de voiture à prendre après avoir bu, pas de discussion pour savoir qui va aller au supermarché suivant — il n\'y en a plus d\'ouvert de toute façon.\n\nOn livre aussi les soirées à thème, les anniversaires nocturnes, les repas entre collègues qui finissent tard. Le Soler a une vraie vie de quartier — on en fait partie, à notre façon.'
        },
        {
          title: 'Allo apéro et SOS alcool au Soler : vocabulaire de la nuit',
          content: 'Vous avez peut-être cherché "allo apéro Le Soler", "SOS alcool livraison 66", "livreur alcool nuit" ou "épicerie de nuit Le Soler" — vous êtes au bon endroit. Mon Sauveur, c\'est le service que tout le monde cherche sans toujours savoir qu\'il existe en dehors des grandes villes.\n\nContrairement aux plateformes de livraison généraliste qui ne couvrent souvent que Perpignan centre, nous desservons les communes autour : Le Soler, mais aussi les autres villes de la plaine et de la côte. Si vous avez de la famille ou des amis dans d\'autres communes du 66, ils peuvent aussi compter sur nous.\n\nLe principe reste le même partout : appel direct, livraison rapide, pas de mauvaise surprise sur les prix. On vous annonce le tarif au téléphone, on confirme l\'heure de livraison, et on arrive. Aucune application, aucun intermédiaire numérique superflu. La nuit, la simplicité, c\'est ce qui compte.'
        },
        {
          title: 'Pourquoi choisir Mon Sauveur pour la livraison alcool au Soler',
          content: 'Il y a peu d\'alternatives sérieuses pour la livraison d\'alcool la nuit dans une commune de 8 000 habitants comme Le Soler. Les grandes plateformes s\'arrêtent à Perpignan. Les épiceries de nuit, il faut les trouver et s\'y rendre. Mon Sauveur comble ce vide : on vient chez vous, de nuit, dans les 30 minutes.\n\nOn est un service local, pas une multinationale. Nos livreurs connaissent les quartiers du Soler — pas besoin de GPS pendant dix minutes pour trouver votre rue. On sait que la D612 traverse la commune du nord au sud, que la gare du Soler est côté est, et que certaines rues sont des impasses. Ça compte pour ne pas faire attendre le client inutilement.\n\nNous fonctionnons uniquement sur appel téléphonique. C\'est un choix : on préfère parler à nos clients plutôt que les laisser naviguer sur une interface mobile bancale à minuit. Un appel, une commande, une livraison. C\'est ça, Mon Sauveur au Soler.'
        }
      ],
      faq: [
        {
          question: 'Mon Sauveur livre-t-il bien au Soler (66270) ?',
          answer: 'Oui, Mon Sauveur dessert toute la commune du Soler, y compris les quartiers résidentiels, les zones pavillonnaires et les rues proches de la D612. Que vous soyez côté centre-bourg ou dans les lotissements périphériques, notre livreur vient jusqu\'à votre adresse. Il suffit d\'appeler pour vérifier la disponibilité du soir et passer votre commande directement au téléphone.'
        },
        {
          question: 'Jusqu\'à quelle heure peut-on commander de l\'alcool la nuit au Soler ?',
          answer: 'Notre service fonctionne jusqu\'à 3h du matin tous les soirs de la semaine. Après minuit, les demandes sont nombreuses les week-ends — mieux vaut appeler un peu en avance pour s\'assurer d\'une livraison rapide. En dehors de ces horaires, ou pour une commande très matinale, contactez-nous directement pour connaître les disponibilités du moment.'
        },
        {
          question: 'Combien de temps prend la livraison d\'alcool au Soler ?',
          answer: 'Le Soler est à environ 15 minutes de Perpignan, ce qui nous permet d\'assurer des livraisons en 20 à 30 minutes en général. Ce délai peut légèrement varier selon le trafic nocturne et le volume de commandes simultanées, surtout le vendredi et samedi soir. On vous donne une estimation précise au moment de l\'appel.'
        },
        {
          question: 'Quels types d\'alcool peut-on commander pour une livraison nuit au Soler ?',
          answer: 'Notre sélection comprend les bières (packs, bouteilles), les vins (rouge, blanc, rosé), les spiritueux (whisky, rhum, vodka, gin, pastis, tequila), le champagne et les eaux pétillantes. On dispose aussi de sodas et jus pour les mélanges. Si vous avez une marque spécifique en tête, mentionnez-la lors de l\'appel et on vérifie la disponibilité immédiatement.'
        },
        {
          question: 'Peut-on commander un kit apéro complet livré la nuit au Soler ?',
          answer: 'Absolument. On peut composer un kit apéro sur mesure selon vos besoins : bouteilles choisies, bières variées, glaçons. Dites-nous combien vous êtes et quel type de soirée vous organisez, et on vous conseille sur les quantités. Le tout est livré en une seule fois, directement à votre porte, sans que vous ayez à quitter votre soirée.'
        },
        {
          question: 'Y a-t-il un minimum de commande pour une livraison au Soler ?',
          answer: 'Il n\'y a pas de minimum imposé à proprement parler, mais les frais de livraison sont calculés en fonction de la distance et du volume. Pour une commande très petite, un frais de déplacement peut s\'appliquer — on vous informe du montant exact lors de l\'appel, avant de confirmer la livraison. Aucune mauvaise surprise à la livraison.'
        }
      ],
      internalLinks: [
        { slug: 'livraison-alcool-nuit-perpignan', label: 'Livraison alcool nuit à Perpignan' },
        { slug: 'livraison-alcool-nuit-rivesaltes', label: 'Livraison alcool nuit à Rivesaltes' },
        { slug: 'epicerie-de-nuit-perpignan', label: 'Épicerie de nuit à Perpignan' }
      ]
    }
  },
  {
    id: 'd4656ef3-e1cb-49c1-8be5-9f5b81864d5e',
    label: 'Elne',
    content: {
      metaTitle: 'Livraison Alcool Nuit Elne | Mon Sauveur',
      metaDescription: 'Livraison alcool nuit Elne (66200). Bières, vins, spiritueux livrés à domicile jusqu\'à 3h. Près de la cathédrale Sainte-Eulalie. Appelez Mon Sauveur.',
      h1: 'Livraison d\'alcool la nuit à Elne (66200)',
      updatedDate: '2026-04-13',
      intro: 'Elne endormie, mais vous, non. Mon Sauveur assure la livraison d\'alcool la nuit à Elne et dans sa plaine du Tech, jusqu\'à 3h du matin. Peu importe que vous soyez dans le centre historique près de la cathédrale ou dans un quartier résidentiel plus excentré — on vient jusqu\'à vous, rapide et sans chichi. Un appel, c\'est parti.',
      highlights: [
        'Livraison alcool nuit à Elne en 25-35 min',
        'Service actif jusqu\'à 3h du matin',
        'Bières, vins, rosés, spiritueux disponibles',
        'Commande par téléphone uniquement — simple et direct',
        'Tarif annoncé avant livraison, aucune surprise'
      ],
      trustSignals: [
        'Connu dans la plaine du Tech et ses environs',
        'Livreurs familiers avec les rues d\'Elne et ses accès',
        'Confirmation de délai systématique à chaque appel',
        'Pas d\'application, pas de compte — juste un coup de fil'
      ],
      seoSections: [
        {
          title: 'Livraison d\'alcool la nuit à Elne : comment ça fonctionne',
          content: 'Elne est une ville à part dans les Pyrénées-Orientales. Son histoire millénaire, sa cathédrale Sainte-Eulalie qui domine la plaine, ses ruelles pavées — tout ça fait d\'Elne un endroit avec du caractère. Mais la nuit, quand les commerces sont fermés depuis des heures, ce caractère ne vous aide pas à trouver un rosé frais ou une bouteille de rhum pour prolonger la soirée.\n\nMon Sauveur intervient là où les supermarchés et caves à vins s\'arrêtent : après leur fermeture. On livre à domicile dans toute la commune d\'Elne, que vous habitiez dans le quartier historique en hauteur, près de la D914 qui relie Perpignan à Argelès, ou dans les zones pavillonnaires de la plaine. La commande se fait par téléphone, le délai moyen est de 25 à 35 minutes, et on vous confirme tout dès le début de l\'appel.'
        },
        {
          title: 'Elne by night : les occasions de commander chez Mon Sauveur',
          content: 'Elne, c\'est environ 8 000 habitants, un tissu associatif actif, des fêtes de quartier l\'été, des soirées entre voisins qui se prolongent plus que prévu. C\'est aussi une commune avec une population touristique non négligeable en saison — les campeurs et résidences secondaires côté plaine du Tech ne sont jamais très loin.\n\nDans ces contextes, Mon Sauveur répond à des demandes très variées : la bouteille oubliée pour le repas du soir, le pack de bières pour un groupe d\'amis arrivé à l\'improviste, le champagne de dernière minute pour fêter quelque chose. On ne juge pas l\'occasion — on livre. Vendredi, samedi, jours fériés, en plein mois d\'août ou un mardi de mars : le service est disponible chaque soir jusqu\'à 3h.\n\nOn sait aussi qu\'à Elne, certaines rues médiévales sont étroites. Nos livreurs s\'adaptent — on gare le véhicule au plus proche et on fait les derniers mètres à pied si nécessaire. L\'essentiel, c\'est que vous receviez votre commande.'
        },
        {
          title: 'Notre sélection pour une livraison alcool à Elne',
          content: 'Ce que vous pouvez commander chez Mon Sauveur pour une livraison à Elne couvre l\'essentiel des besoins nocturnes : bières pression et bouteilles (artisanales ou grandes marques), vins de pays et AOC (rouge, blanc, rosé), spiritueux (rhum, vodka, whisky, gin, tequila, pastis), champagne et prosecco pour les occasions, sodas et jus pour les mélanges, glaçons.\n\nOn n\'est pas une cave spécialisée, mais on couvre largement ce qu\'une soirée standard nécessite. Si vous avez une préférence pour une marque précise, demandez lors de l\'appel — on vous confirme si on l\'a en stock. En cas d\'indisponibilité, on propose une alternative équivalente et vous décidez.\n\nPour les apéros en groupe, on peut composer des assortiments selon le nombre de personnes. Donnez-nous un ordre de grandeur et on vous conseille les quantités appropriées pour une soirée sans rupture de stock.'
        },
        {
          title: 'SOS alcool livraison Elne : le numéro à garder dans son téléphone',
          content: 'Beaucoup de nos clients à Elne nous ont trouvés en cherchant "SOS alcool livraison Elne", "allo apéro Elne", "livreur alcool nuit 66200" ou encore "épicerie ouverte la nuit Elne". Ces recherches mènent toutes au même endroit : Mon Sauveur.\n\nOn vous recommande de sauvegarder notre numéro dans vos contacts dès maintenant — comme ça, quand le besoin se présente à 23h30, vous n\'avez pas à chercher. Un appel, c\'est réglé. C\'est d\'ailleurs comme ça que la plupart de nos habitués fonctionnent : ils ont le numéro, ils appellent, on livre. Pas d\'interface, pas de délai dû à une application qui plante.\n\nElne est bien desservie depuis Perpignan via la D914. Nos livreurs connaissent ce trajet. La plaine du Tech est familière. On sait aussi que les parkings côté porte d\'Espagne sont commodes pour accéder au centre. Ces détails font gagner du temps à tout le monde.'
        },
        {
          title: 'Livraison boisson nuit Elne : nos engagements envers les clients',
          content: 'Mon Sauveur, c\'est un service sur lequel on mise sur la confiance et la répétition. On ne cherche pas à faire un coup de livraison isolé — on veut que vous nous rappeliez la prochaine fois, et celle d\'après. Pour ça, on s\'engage sur quelques points simples mais non négociables.\n\nPremier engagement : transparence des tarifs. Le prix vous est annoncé avant de confirmer la commande. Pas de frais cachés découverts à la livraison. Deuxième engagement : ponctualité. On vous donne un créneau et on le tient — si jamais un imprévu retarde le livreur, vous êtes prévenu par téléphone. Troisième engagement : discrétion. On sonne, on remet la commande, on repart. Pas de bruit inutile dans la nuit elneoise.\n\nCe sont ces engagements concrets qui font revenir les clients. Elne mérite un service fiable — c\'est ce qu\'on s\'efforce d\'être, soir après soir.'
        }
      ],
      faq: [
        {
          question: 'Mon Sauveur livre-t-il à Elne (66200) ?',
          answer: 'Oui, Mon Sauveur livre de l\'alcool à domicile à Elne, qu\'il s\'agisse du centre historique, des quartiers en bas de la ville ou des zones résidentielles de la plaine du Tech. La commande se fait uniquement par téléphone. On vous confirme la disponibilité et le délai dès le début de l\'appel, avant que vous validiez quoi que ce soit.'
        },
        {
          question: 'Quels sont les horaires de livraison alcool à Elne ?',
          answer: 'Mon Sauveur est disponible chaque soir jusqu\'à 3h du matin à Elne. Les soirs de week-end et les veilles de jours fériés sont les plus chargés — appelez un peu en avance pour réduire les délais. Si vous avez besoin d\'une livraison en tout début de soirée ou très tôt le matin, contactez-nous directement pour vérifier les disponibilités de ce créneau particulier.'
        },
        {
          question: 'Quel délai de livraison alcool à Elne la nuit ?',
          answer: 'Elne se trouve à environ 20-25 km de Perpignan via la D914, ce qui représente un délai de livraison estimé entre 25 et 40 minutes selon le trafic. Les soirs de forte demande, ce délai peut être un peu plus long. On vous communique systématiquement une estimation honnête au téléphone avant de confirmer votre commande, sans vous promettre l\'impossible.'
        },
        {
          question: 'Peut-on se faire livrer du vin local lors d\'une commande nuit à Elne ?',
          answer: 'Notre sélection inclut des vins de la région, notamment des rosés du Languedoc et des références locales du Roussillon. Pour des cuvées très spécifiques ou des domaines particuliers, il vaut mieux appeler à l\'avance. En dehors de ça, on dispose régulièrement de bons rosés et rouges locaux adaptés à toutes les soirées, été comme hiver.'
        },
        {
          question: 'Livrez-vous aussi dans les hameaux autour d\'Elne ?',
          answer: 'Mon Sauveur peut intervenir dans les zones proches d\'Elne selon la distance. Appelez-nous en indiquant votre adresse précise et on vous confirme immédiatement si la livraison est possible ce soir-là. Certains écarts ou hameaux isolés peuvent nécessiter un point de rencontre intermédiaire — on s\'organise ensemble si c\'est le cas.'
        },
        {
          question: 'Comment payer la livraison alcool nuit à Elne ?',
          answer: 'Le paiement s\'effectue à la livraison, en espèces ou selon les modalités discutées lors de l\'appel. On vous indique le montant total avant de partir, pas de surprise à la porte. On vous conseille de préparer la monnaie si possible pour faciliter la transaction, surtout en pleine nuit quand le rendu de monnaie peut prendre un peu de temps.'
        }
      ],
      internalLinks: [
        { slug: 'livraison-alcool-nuit-perpignan', label: 'Livraison alcool nuit à Perpignan' },
        { slug: 'livraison-alcool-nuit-saint-cyprien', label: 'Livraison alcool nuit à Saint-Cyprien' },
        { slug: 'livraison-alcool-nuit-argeles-sur-mer', label: 'Livraison alcool nuit à Argelès-sur-Mer' }
      ]
    }
  },
  {
    id: '5d48644b-9ce2-4aa6-8bad-23eb0d1e479f',
    label: 'Le Barcarès',
    content: {
      metaTitle: 'Livraison Alcool Nuit Le Barcarès | Mon Sauveur',
      metaDescription: 'Livraison alcool nuit Le Barcarès (66420). Bières, vins, apéros livrés jusqu\'à 3h. Station balnéaire, front de mer, Le Lydia. Appelez Mon Sauveur.',
      h1: 'Livraison d\'alcool la nuit au Barcarès (66420)',
      updatedDate: '2026-04-13',
      intro: 'Le Barcarès la nuit, c\'est le bruit des vagues, les terrasses qui se vident et les soirées qui continuent dans les appartements et bungalows. Mon Sauveur livre l\'alcool à domicile au Barcarès jusqu\'à 3h du matin — front de mer, campings, résidences, tout le monde y a droit. Appelez, on arrive.',
      highlights: [
        'Livraison alcool nuit au Barcarès jusqu\'à 3h',
        'Couvre le front de mer, les campings et les résidences',
        'Bières, vins, rosés, spiritueux sur appel',
        'Délai moyen 30-40 min depuis Perpignan',
        'Service de saison ET hors saison'
      ],
      trustSignals: [
        'Expérience des livraisons en station balnéaire l\'été',
        'Connaissance du réseau viaire du Barcarès et de ses accès',
        'Prix annoncé avant confirmation de la commande',
        'Contact téléphonique direct — pas d\'application intermédiaire'
      ],
      seoSections: [
        {
          title: 'Mon Sauveur au Barcarès : livraison alcool en station balnéaire',
          content: 'Le Barcarès, c\'est la station balnéaire au nord de Perpignan, connue pour son front de mer, ses campings XXL et le Lydia — ce paquebot échoué sur la plage qui est devenu un symbole local. L\'été, la population de la commune multiplie par dix. Les bars et restaurants font le plein, mais ferment. Les supermarchés ont des horaires décalés mais pas infinis. Et quand la soirée se prolonge dans un camping, une résidence saisonnière ou un appartement loué pour la semaine, les options d\'approvisionnement se font rares.\n\nMon Sauveur répond exactement à ce besoin. On livre de l\'alcool la nuit au Barcarès, jusqu\'à 3h du matin, que vous soyez sur l\'avenue de la Méditerranée, dans l\'un des nombreux campings côté étang, dans le port, ou dans les lotissements plus calmes côté D83. Un appel, on vous dit dans combien de temps on arrive, et on livre.'
        },
        {
          title: 'Livraison alcool camping et résidences au Barcarès',
          content: 'La spécificité du Barcarès, c\'est que beaucoup de clients ne sont pas des résidents permanents. Ils sont là pour une semaine, un week-end, ou une nuit. Ils ne connaissent pas les commerces locaux. Ils n\'ont pas de voiture garée à proximité (ou ne peuvent pas la prendre). Ils ont besoin d\'un service rapide, sans compte à créer, sans appli à télécharger.\n\nC\'est ça, Mon Sauveur. On livre dans les campings du Barcarès — La Presqu\'île, Le Soleil, Mar i Sol, et les autres — à condition que l\'accès soit indiqué correctement. Donnez-nous le nom du camping, votre emplacement ou votre numéro de bungalow, et on fait le reste. On livre aussi dans les résidences face à la mer et les appartements en location saisonnière. Aucun accès ne nous fait peur — on demande les détails au téléphone avant de partir.\n\nHors saison, on continue à livrer au Barcarès, même si la commune est beaucoup plus calme entre octobre et avril. Le service reste disponible pour les résidents permanents et les week-ends prolongés.'
        },
        {
          title: 'Allo apéro Barcarès : commander son alcool depuis la plage ou le camping',
          content: 'On reçoit souvent des commandes au Barcarès dans deux configurations : soit en pleine journée pour une livraison en soirée (les gens anticipent), soit en milieu de nuit quand tout est fermé et qu\'on n\'a plus rien. Dans les deux cas, le numéro à appeler est le même.\n\nEn saison estivale, les commandes depuis le Barcarès ont tendance à être plus volumineuses : packs de bières, plusieurs bouteilles de vin, sacs de glaçons. Normal — les groupes sont plus grands. On s\'y adapte : on peut faire des livraisons en plusieurs colis si besoin, et on prévoit les quantités avec vous au téléphone.\n\nLe Lydia reste une référence géographique utile pour nos livreurs — si vous êtes dans sa zone, dites-le. De même pour le port de plaisance ou les accès par la D83 depuis Leucate ou Le Barcarès nord. On connaît les deux côtés de l\'étang de Salses-Leucate et les voies d\'accès à la commune.'
        },
        {
          title: 'SOS alcool Barcarès : livraison boisson nuit en station',
          content: 'Vous cherchiez "SOS alcool Le Barcarès", "livraison boisson nuit 66420", "allo apéro camping Barcarès" ou "épicerie de nuit Le Barcarès" — vous avez trouvé. Mon Sauveur est le service qui couvre ce vide, en pleine saison comme hors saison.\n\nEn été, la concurrence est rude côté offre nocturne — mais les épiceries de plage ferment quand même à des horaires raisonnables, et aucune ne livre à domicile. Mon Sauveur si. C\'est cette différence qui compte quand vous avez 8 personnes autour d\'un barbecue à 23h et plus une bière.\n\nOn livre aussi depuis le Barcarès vers des communes voisines si vous êtes en transit ou si vos amis sont à Leucate ou Canet — appelez pour qu\'on évalue la faisabilité. Notre zone principale reste le Barcarès et ses alentours immédiats, mais on essaie de s\'adapter dans la mesure du possible.'
        },
        {
          title: 'Ce qu\'on livre au Barcarès et pour combien',
          content: 'Notre sélection couvre l\'essentiel : bières en bouteille et en pack (de la Kronenbourg classique aux IPA artisanales), vins blancs et rosés frais parfaits pour l\'été, vins rouges pour les soirées plus fraîches, spiritueux (rhum pour les cocktails de plage, vodka, gin, pastis local), champagne et prosecco pour les fêtes improvisées, sodas et jus pour les sans-alcool ou les mixages.\n\nOn gère aussi les commandes de glaçons — indispensable en été au Barcarès. Si vous avez besoin de plusieurs sacs, précisez-le lors de l\'appel.\n\nConcernant les tarifs : ils vous sont communiqués avant confirmation. Le prix inclut la livraison. Pas de frais cachés, pas de supplément surprise. En été, pendant les périodes de forte demande, les délais peuvent être légèrement plus longs — on préfère vous prévenir honnêtement plutôt que de vous promettre 20 minutes et arriver en 45.'
        }
      ],
      faq: [
        {
          question: 'Mon Sauveur livre-t-il dans les campings du Barcarès ?',
          answer: 'Oui, Mon Sauveur livre dans les campings du Barcarès. Lors de votre appel, précisez le nom du camping et votre numéro d\'emplacement ou de bungalow. Nos livreurs connaissent les principaux accès et peuvent se repérer facilement. Si un camping a des entrées particulières ou des horaires de portail, signalez-le — on s\'organise en conséquence pour que la livraison se passe sans accroc.'
        },
        {
          question: 'Livrez-vous au Barcarès hors saison ?',
          answer: 'Oui. Même si la fréquentation touristique chute fortement d\'octobre à avril, Mon Sauveur continue de livrer au Barcarès pour les résidents permanents et les week-ends de passage. Les délais peuvent être légèrement différents selon les disponibilités livreur. Appelez pour confirmer la disponibilité le soir en question.'
        },
        {
          question: 'Quel délai pour une livraison alcool nuit au Barcarès ?',
          answer: 'Le Barcarès se trouve à environ 30-35 km de Perpignan. Le délai moyen de livraison est de 30 à 45 minutes selon le trafic et la localisation précise dans la commune. En été, les routes côtières peuvent être plus chargées en soirée — on vous donne une estimation honnête à chaque appel.'
        },
        {
          question: 'Quels alcools sont disponibles pour une livraison nuit au Barcarès ?',
          answer: 'On livre bières (bouteilles, packs, variétés artisanales), vins (rouge, blanc, rosé), spiritueux complets (rhum, vodka, gin, whisky, tequila, pastis), champagne, prosecco et boissons sans alcool pour les mélanges. On peut aussi livrer des glaçons en sac. Pour une sélection précise ou une marque particulière, demandez lors de l\'appel et on confirme la disponibilité.'
        },
        {
          question: 'Peut-on commander de l\'alcool en grande quantité pour une soirée de groupe au Barcarès ?',
          answer: 'Tout à fait. Les commandes en volume pour des groupes sont fréquentes au Barcarès en été. Dites-nous combien vous êtes et quel type de soirée vous organisez — on vous conseille sur les quantités. Les livraisons volumineuses sont gérées normalement ; si plusieurs trajets sont nécessaires, on en discute lors de l\'appel.'
        },
        {
          question: 'Mon Sauveur livre-t-il aussi à Leucate depuis le Barcarès ?',
          answer: 'Notre zone principale de livraison est le Barcarès et ses alentours immédiats. Pour Leucate ou Port-Leucate, appelez-nous en indiquant votre adresse — on évalue la faisabilité selon nos disponibilités du moment. Si la livraison directe n\'est pas possible, on vous orientera vers la solution la plus proche.'
        }
      ],
      internalLinks: [
        { slug: 'livraison-alcool-nuit-leucate', label: 'Livraison alcool nuit à Leucate' },
        { slug: 'livraison-alcool-nuit-canet-en-roussillon', label: 'Livraison alcool nuit à Canet-en-Roussillon' },
        { slug: 'livraison-alcool-nuit-perpignan', label: 'Livraison alcool nuit à Perpignan' }
      ]
    }
  },
  {
    id: '526c7dc1-0332-46b6-a76a-c188876831f4',
    label: 'Argelès-sur-Mer',
    content: {
      metaTitle: 'Livraison Alcool Nuit Argelès-sur-Mer | Mon Sauveur',
      metaDescription: 'Livraison alcool nuit Argelès-sur-Mer (66700). Bières, vins, apéros livrés jusqu\'à 3h. Campings, plages nord et sud, Albères. Appelez Mon Sauveur.',
      h1: 'Livraison d\'alcool la nuit à Argelès-sur-Mer (66700)',
      updatedDate: '2026-04-13',
      intro: 'Argelès-sur-Mer, capitale européenne du camping, ne dort pas vraiment. Mais les commerces, eux, ferment. Mon Sauveur livre l\'alcool à domicile à Argelès-sur-Mer la nuit — plage nord, plage sud, village, campings, résidences — jusqu\'à 3h du matin. En plein été comme hors saison. Un appel, on arrive.',
      highlights: [
        'Livraison alcool nuit à Argelès jusqu\'à 3h du matin',
        'Couvre toute la commune : village, plages nord et sud, campings',
        'Idéal pour les groupes en vacances et les soirées de camping',
        'Bières, vins, spiritueux, glaçons disponibles',
        'Pas d\'appli, pas de compte — juste votre téléphone'
      ],
      trustSignals: [
        'Expérience des livraisons dans les plus grands campings de France',
        'Connaissance des voies d\'accès côté Albères et D914',
        'Service été comme hiver — pas uniquement saisonnier',
        'Tarifs communiqués avant confirmation, pas de mauvaise surprise'
      ],
      seoSections: [
        {
          title: 'Livraison alcool nuit à Argelès-sur-Mer : capital du camping, service nocturne',
          content: 'Argelès-sur-Mer est connue comme étant le plus grand site de camping d\'Europe. Avec ses dizaines de campings entre la plage et le massif des Albères, la commune accueille chaque été des centaines de milliers de vacanciers. Les commerces et supermarchés saisonniers ont des horaires étendus — mais pas infinis. Après 22h, 23h au mieux, les options se réduisent drastiquement.\n\nC\'est là qu\'intervient Mon Sauveur. Notre service de livraison d\'alcool nuit à Argelès-sur-Mer couvre toute la commune : la plage nord avec ses campings en bord de mer, la plage sud côté col de Banyuls, le village historique autour du château de Valmy, et les zones résidentielles plus tranquilles. On livre jusqu\'à 3h du matin, tous les soirs, saison et hors-saison.'
        },
        {
          title: 'Livraison alcool en camping à Argelès-sur-Mer',
          content: 'Les campings d\'Argelès-sur-Mer, ce sont des villes dans la ville en juillet-août. Des milliers de personnes, des bungalows, des mobil-homes, des tentes — et des soirées qui peuvent s\'étirer jusqu\'au petit matin. Quand le bar du camping ferme et que l\'épicerie de réception est éteinte, Mon Sauveur prend le relais.\n\nPour une livraison dans un camping d\'Argelès, donnez-nous le nom du camping, votre allée ou votre numéro d\'emplacement, et votre téléphone. On appelle à l\'arrivée devant l\'entrée si le portail est fermé. On connaît les grands campings de la plage nord — Les Criques, Californie-Plage, La Sirène, Le Roussillon et les autres — et leurs configurations. On sait aussi que certains sont accessibles uniquement depuis la route de la Mer.\n\nNos livraisons en camping prennent un peu plus de temps à organiser logistiquement, mais on s\'y adapte. L\'important c\'est que votre soirée se passe bien.'
        },
        {
          title: 'Toute la commune d\'Argelès couverte : village, plages, Albères',
          content: 'Argelès-sur-Mer n\'est pas que ses campings. C\'est aussi un village avec ses habitants permanents, ses rues médiévales et son château de Valmy. C\'est la plage sud plus résidentielle, côté Col de Banyuls. C\'est aussi les hauteurs des Albères pour ceux qui habitent ou séjournent côté montagne.\n\nMon Sauveur livre dans toute la commune. Les zones plus excentrées ou enclavées — vers Sorède, vers les hauteurs du massif — peuvent nécessiter un point de rencontre selon l\'accès. On évalue ça lors de l\'appel. Pour les adresses standard du village ou de la plage, la livraison est directe à domicile.\n\nL\'été, la D914 entre Argelès et Saint-Cyprien peut être chargée en soirée. On prévoit ça dans notre estimation de délai. L\'hiver, la commune est beaucoup plus calme — les délais sont généralement plus courts. Dans tous les cas, on vous dit honnêtement combien de temps ça prend avant que vous confirmiez.'
        },
        {
          title: 'Allo apéro Argelès : ce qu\'on livre et comment',
          content: 'Notre sélection pour une livraison à Argelès-sur-Mer : bières (bouteilles individuelles, packs 6 et 24, artisanales et grandes marques), rosés et blancs frais (parfaits pour l\'été), rouges et vins de table, spiritueux complets (rhum, vodka, gin, whisky, tequila, pastis), champagne et bulles pour les anniversaires improvisés sur la plage, sodas, jus, eaux pétillantes et glaçons en sac.\n\nLes commandes en volume sont les bienvenues. Si vous avez 15 personnes autour d\'un feu de camp (là où c\'est autorisé), dites-le-nous et on calcule les quantités avec vous. Pour les groupes en camping qui commandent régulièrement, certains prennent l\'habitude d\'appeler un peu avant le pic de soirée pour éviter les délais du samedi soir à 22h.\n\nLe mode de commande reste simple et invariable : un appel téléphonique. On prend la commande, on confirme le total et le délai, on livre. Pas d\'appli à télécharger même si vous êtes sous les étoiles avec 3% de batterie.'
        },
        {
          title: 'SOS alcool Argelès-sur-Mer : le service nocturne que les vacanciers cherchent',
          content: 'On voit régulièrement des recherches comme "SOS alcool Argelès", "livraison alcool camping Argelès nuit", "livreur alcool 66700", "allo apéro Argelès-sur-Mer" — c\'est pour nous. On est le service que vous cherchez.\n\nArgelès-sur-Mer est l\'une des communes du 66 où la demande nocturne est la plus forte, surtout entre juin et septembre. Des dizaines de milliers de vacanciers, peu de solutions après 23h, des supermarchés saisonniers qui ont leurs limites. Mon Sauveur couvre ce créneau que personne d\'autre ne couvre vraiment.\n\nSi vous passez la semaine à Argelès, sauvegardez notre numéro dès votre arrivée. Idem si vous venez régulièrement en résidence secondaire. C\'est le genre de contact qui s\'avère utile exactement au moment où vous ne vous attendez plus à en avoir besoin. Un samedi soir, à 23h45, quand il ne reste plus rien dans le frigo de camping.'
        }
      ],
      faq: [
        {
          question: 'Mon Sauveur livre-t-il dans les campings d\'Argelès-sur-Mer ?',
          answer: 'Oui. Mon Sauveur livre dans les campings d\'Argelès-sur-Mer. Lors de votre appel, indiquez le nom du camping et votre numéro d\'emplacement ou de bungalow. Si le portail est fermé à votre heure de livraison, on vous appelle depuis l\'entrée. On connaît les principaux campings de la plage nord et de la plage sud et leurs configurations d\'accès.'
        },
        {
          question: 'Livrez-vous à Argelès-sur-Mer en dehors de la saison estivale ?',
          answer: 'Oui, Mon Sauveur livre à Argelès-sur-Mer toute l\'année, pas seulement l\'été. Hors saison, la commune est plus calme et les délais de livraison sont souvent plus courts. Le service s\'adresse autant aux résidents permanents et aux propriétaires de résidences secondaires qui viennent en week-end qu\'aux vacanciers estivaux.'
        },
        {
          question: 'Quel est le délai de livraison alcool nuit à Argelès-sur-Mer ?',
          answer: 'Argelès-sur-Mer est à environ 25 km de Perpignan via la D914. Le délai moyen de livraison est de 30 à 45 minutes. En été, la D914 peut être chargée le soir, ce qui peut allonger légèrement ce délai. On vous communique une estimation précise au téléphone avant de confirmer la commande — on préfère être honnêtes sur le temps réel plutôt que de vous promettre l\'impossible.'
        },
        {
          question: 'Peut-on commander des glaçons avec la livraison alcool à Argelès ?',
          answer: 'Oui, les glaçons en sac font partie de notre catalogue de livraison. Précisez la quantité dont vous avez besoin lors de l\'appel. En été, la demande en glaçons est forte — si vous en avez besoin de plusieurs sacs pour un grand groupe, dites-le dès le début de la commande pour qu\'on puisse charger la quantité suffisante.'
        },
        {
          question: 'Livrez-vous côté plage sud et Albères à Argelès ?',
          answer: 'On couvre l\'ensemble de la commune d\'Argelès-sur-Mer, y compris la plage sud et les zones proches du massif des Albères. Les adresses dans les hauteurs ou les chemins moins accessibles peuvent nécessiter un point de rencontre — on en discute lors de l\'appel. Pour les zones standard en bord de mer ou dans le village, la livraison est directe à domicile.'
        },
        {
          question: 'Comment commander de l\'alcool la nuit à Argelès depuis un mobile avec peu de batterie ?',
          answer: 'Mon Sauveur fonctionne uniquement par appel téléphonique — pas d\'application, pas de site web à charger, pas de compte à créer. Un appel de 2-3 minutes suffit pour passer votre commande. Même avec un téléphone à 5% de batterie, c\'est largement gérable. C\'est l\'un des avantages volontaires de notre mode de fonctionnement : on reste simple pour être accessible à tous.'
        }
      ],
      internalLinks: [
        { slug: 'livraison-alcool-nuit-saint-cyprien', label: 'Livraison alcool nuit à Saint-Cyprien' },
        { slug: 'livraison-alcool-nuit-elne', label: 'Livraison alcool nuit à Elne' },
        { slug: 'livraison-alcool-nuit-perpignan', label: 'Livraison alcool nuit à Perpignan' }
      ]
    }
  },
  {
    id: 'a1f5fbba-bc90-4192-890c-627dc71140ff',
    label: 'Cabestany',
    content: {
      metaTitle: 'Livraison Alcool Nuit Cabestany | Mon Sauveur',
      metaDescription: 'Livraison alcool nuit Cabestany (66330). Bières, vins, apéros livrés jusqu\'à 3h. Banlieue est de Perpignan, zone commerciale, D22. Appelez Mon Sauveur.',
      h1: 'Livraison d\'alcool la nuit à Cabestany (66330)',
      updatedDate: '2026-04-13',
      intro: 'Cabestany, c\'est la banlieue est de Perpignan — 10 000 habitants, une zone commerciale bien fournie le jour, mais morte la nuit. Mon Sauveur livre l\'alcool à domicile à Cabestany jusqu\'à 3h du matin. Que vous soyez côté zone commerciale, dans un quartier résidentiel ou près de la D22, on vient directement chez vous. Appelez.',
      highlights: [
        'Livraison alcool nuit Cabestany en 15-25 min',
        'Disponible jusqu\'à 3h du matin tous les soirs',
        'Bières, vins, rosés, spiritueux et plus',
        'Proche de Perpignan — délais parmi les plus courts du réseau',
        'Zéro formulaire, zéro appli — juste un appel téléphonique'
      ],
      trustSignals: [
        'Service rapide grâce à la proximité avec Perpignan',
        'Connaissance de la zone commerciale et des quartiers résidentiels',
        'Tarif annoncé au téléphone avant tout départ livreur',
        'Discrétion garantie — livraison silencieuse de nuit'
      ],
      seoSections: [
        {
          title: 'Livraison alcool la nuit à Cabestany : le service du soir pour la banlieue est',
          content: 'Cabestany est l\'une des communes les mieux situées de l\'agglomération perpignanaise — à l\'est, en bordure de ville, avec un accès direct à la D22 et à la rocade. C\'est une commune dynamique le jour : grande zone commerciale, commerces, enseignes nationales. Mais la nuit, tout ferme, et les 10 000 habitants de Cabestany se retrouvent dans la même situation que partout ailleurs — sans solution d\'approvisionnement en alcool après 22h.\n\nMon Sauveur résout ce problème. On livre à Cabestany depuis Perpignan en 15 à 25 minutes, ce qui en fait l\'une des communes les mieux desservies de notre réseau de livraison nocturne. Vous appelez, on vous demande l\'adresse, on part. Que vous soyez dans un quartier pavillonnaire calme, dans une résidence plus dense côté nord de la commune ou près de la Maison du Maître de Cabestany, on vient.'
        },
        {
          title: 'Cabestany by night : quand la zone commerciale dort',
          content: 'La zone commerciale de Cabestany, c\'est l\'une des plus importantes du département. Le jour, on peut tout y trouver. La nuit, c\'est un désert éclairé aux néons. Les hypermarchés ont fermé leurs portes, les drives aussi. Pas de solution pour remplir le frigo de dernière minute ou trouver une bouteille pour une soirée improvisée.\n\nPourtant, Cabestany est une commune vivante. Des soirées entre voisins, des apéros entre collègues après le boulot, des fêtes d\'anniversaire dans des maisons avec jardin — tout ça se passe à Cabestany comme partout. Et quand la soirée tourne bien et qu\'on manque de stock, c\'est Mon Sauveur qu\'on appelle.\n\nLe Maître de Cabestany — ce sculpteur roman du XIIe siècle dont le musée local garde la mémoire — ne livrait pas d\'alcool la nuit. Nous, si. On est là pour les soirées qui continuent après la fermeture des commerces, pour les apéros qui durent plus longtemps que prévu, pour ceux qui ont oublié quelque chose lors de leurs courses.'
        },
        {
          title: 'Notre sélection livrée à Cabestany',
          content: 'Pour une livraison d\'alcool à Cabestany, Mon Sauveur propose une sélection large adaptée à tous types de soirées : bières en bouteille et en pack (grandes marques, artisanales, blondes, ambrées, brunes), vins de table et bouteilles sélectionnées (rouge, blanc, rosé), spiritueux (rhum, vodka, gin, whisky, pastis, tequila), champagne et eaux pétillantes pour les occasions spéciales, sodas et jus pour les mélanges ou les non-buveurs d\'alcool.\n\nOn livre également des glaçons en sac pour les soirées chaudes. Si vous avez une marque préférée ou une demande spécifique, mentionnez-la lors de l\'appel — on vérifie notre stock et on vous dit immédiatement si on peut satisfaire la demande ou si on propose une alternative.\n\nPas de minimum de commande fixe, mais pour les très petites commandes, un frais de livraison minimal peut s\'appliquer. On vous informe du montant total avant de partir — toujours.'
        },
        {
          title: 'Livraison rapide à Cabestany : avantage de la proximité',
          content: 'L\'avantage principal de Cabestany pour notre service, c\'est la proximité avec Perpignan. Notre zone de préparation et de départ est en ville, et Cabestany est juste à côté — 10 à 15 minutes en voiture selon l\'heure. Ça se traduit concrètement par des délais de livraison parmi les plus courts de notre zone de couverture dans le 66.\n\nLe vendredi soir à 23h, quand les commandes se multiplient, les clients de Cabestany sont souvent parmi les premiers servis — leur temps d\'attente est naturellement réduit par la distance. C\'est un vrai avantage par rapport aux communes plus éloignées de la côte ou de l\'intérieur.\n\nNos livreurs connaissent bien les rues de Cabestany : le plan en damier de certains quartiers résidentiels, les impasses, les accès via la D22 ou la D614. On ne perd pas de temps à naviguer — on connaît. Ça compte quand vous attendez votre livraison à 1h du matin.'
        },
        {
          title: 'SOS alcool Cabestany : nos engagements pour la livraison nuit',
          content: 'Vous avez peut-être cherché "SOS alcool Cabestany", "livraison alcool nuit 66330", "allo apéro Cabestany", "livreur boisson nuit Cabestany" ou "épicerie de nuit banlieue Perpignan" — Mon Sauveur est la réponse à toutes ces recherches.\n\nOn livre à Cabestany avec les mêmes standards qu\'à Perpignan : rapidité, transparence sur les prix, discrétion. Pas de sonnerie intempestive, pas de livreur qui crie votre prénom dans la rue — on sonne une fois, on attend, on remet la commande proprement.\n\nPour les résidents de Cabestany qui commandent régulièrement, garder notre numéro dans les contacts est le meilleur réflexe. Quand le besoin se présente, l\'appel prend deux minutes. On s\'occupe du reste. C\'est notre rôle : être là quand personne d\'autre n\'est disponible, proche, et fiable.'
        }
      ],
      faq: [
        {
          question: 'Mon Sauveur livre-t-il à Cabestany (66330) ?',
          answer: 'Oui, Mon Sauveur livre de l\'alcool à domicile à Cabestany, dans tous les quartiers de la commune — zones résidentielles, secteur proche de la zone commerciale, rues côté D22 et D614. Cabestany étant proche de Perpignan, les délais de livraison sont généralement parmi les plus courts de notre zone. Appelez pour passer commande directement.'
        },
        {
          question: 'Jusqu\'à quelle heure peut-on se faire livrer de l\'alcool à Cabestany ?',
          answer: 'Le service Mon Sauveur fonctionne jusqu\'à 3h du matin à Cabestany. Les soirs de week-end, on enregistre plus de commandes — il vaut mieux appeler un peu tôt pour garantir un délai court. En dehors de ces horaires habituels, contactez-nous directement pour connaître les disponibilités du moment.'
        },
        {
          question: 'Combien de temps prend une livraison alcool nuit à Cabestany ?',
          answer: 'Cabestany est l\'une des communes les plus proches de notre zone de départ — les livraisons prennent généralement entre 15 et 25 minutes. Ce délai est parmi les plus courts de notre réseau dans le 66. Il peut légèrement varier selon le volume de commandes simultanées, notamment les vendredi et samedi soir. On vous donne une estimation précise à l\'appel.'
        },
        {
          question: 'Y a-t-il un minimum de commande pour Cabestany ?',
          answer: 'Pas de minimum fixe imposé. Pour les très petites commandes, un frais de déplacement minimal peut s\'appliquer — on vous en informe avant de confirmer. Pour la plupart des commandes classiques (une à plusieurs bouteilles, un pack de bières), il n\'y a pas de problème. Le montant total vous est toujours annoncé au téléphone avant que le livreur parte.'
        },
        {
          question: 'Livrez-vous aussi dans les rues proches de la zone commerciale de Cabestany ?',
          answer: 'Oui, on couvre bien la zone commerciale et ses alentours immédiats, ainsi que les quartiers résidentiels qui l\'entourent. La zone commerciale elle-même étant fermée la nuit, nos livraisons concernent les adresses domiciliaires autour. Si vous êtes dans un immeuble ou une résidence avec code d\'accès, précisez-le lors de l\'appel pour faciliter l\'entrée du livreur.'
        },
        {
          question: 'Comment passer commande chez Mon Sauveur pour une livraison à Cabestany ?',
          answer: 'La commande se fait uniquement par téléphone — pas d\'application, pas de site web à remplir, pas de compte à créer. Vous appelez, vous donnez votre adresse à Cabestany, vous choisissez parmi notre sélection, on vous annonce le total et le délai estimé, et on part. C\'est aussi simple que ça. En 2-3 minutes d\'appel, tout est calé.'
        }
      ],
      internalLinks: [
        { slug: 'livraison-alcool-nuit-perpignan', label: 'Livraison alcool nuit à Perpignan' },
        { slug: 'apero-perpignan', label: 'Apéro Perpignan — livraison à domicile' },
        { slug: 'livraison-alcool-nuit-canet-en-roussillon', label: 'Livraison alcool nuit à Canet-en-Roussillon' }
      ]
    }
  }
];

async function updateAll() {
  for (const page of pages) {
    const schemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.content.faq.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer }
      }))
    };
    const { error } = await sb.from('seo_pages').update({
      content: page.content,
      meta_title: page.content.metaTitle,
      meta_description: page.content.metaDescription,
      h1: page.content.h1,
      schema_org: schemaOrg,
      status: 'draft',
      version: 2,
      updated_at: new Date().toISOString()
    }).eq('id', page.id);
    if (error) {
      console.log(page.label + ': ERROR — ' + error.message);
    } else {
      console.log(page.label + ': OK');
    }
  }
}

updateAll();
