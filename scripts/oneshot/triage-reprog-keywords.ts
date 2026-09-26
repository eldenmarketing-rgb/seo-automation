/**
 * Tri par règles des 2 482 mots-clés DataForSEO du site `reprog` (tous en `new`
 * depuis avril 2026) — applique `site_profiles.triage_instructions` sans IA :
 * approved = formation / métier / outils / cartographie / calculateur / E85 /
 * légal / prix / stages / banc / FAP-EGR ; ignored = préparateurs (marques),
 * marque + modèle, ville ou « autour de moi », clés/télécommandes, hors sujet.
 * Ce qui ne tombe dans aucune règle reste `new` pour tri humain dans le dashboard.
 *
 *   npx tsx scripts/oneshot/triage-reprog-keywords.ts            # simulation
 *   npx tsx scripts/oneshot/triage-reprog-keywords.ts --apply    # écrit
 */
import { getSupabase } from "../../src/db/client";

const APPLY = process.argv.includes("--apply");
const sb = getSupabase();

const KEEP = [
  /formation|cours|apprendre|apprentissage|devenir|m[ée]tier|salaire|ecole|école|stage de reprog|tuto|certif|dipl[oô]me|pdf/,
  /kess|ktag|k-tag|alientech|autotuner|winols|ecm titanium|ecm|dimsport|mpps|cmd flash|obd|bench|boot|bdm|checksum|logiciel|outil|interface|flasher|fichier|file service|tuning file|slave|master/,
  /cartograph|carto\b|calculateur|ecu\b|programmation calculateur|programmateur/,
  /[ée]thanol|e85|flex ?fuel|superethanol/,
  /l[ée]gal|assurance|homologu|homologation|utac|dreal|garantie|contr[oô]le technique|amende|interdit|risque|fiable|danger/,
  /prix|tarif|co[uû]t|combien/,
  /stage ?[123]\b|stage ?[123] /,
  /banc de puissance|banc puissance|dyno|puissance moteur|couple/,
  /fap|egr|adblue|d[ée]fap|anti.?pollution|decata|décata|pop.?corn|launch control|limiteur|vmax|dsg|boite auto/,
  /^reprog(rammation)?( du)?( moteur)?( auto(mobile)?)?( voiture)?$|^reprogrammer (une|un|sa|son) (voiture|moteur|calculateur)$|^reprogrammation (du )?calculateur( moteur)?$|^reprogrammation (essence|diesel|voiture|auto|automobile|moteur (essence|diesel))$|^reprogrammation moteur (diesel|essence|c'est quoi|avis|avantages? inconv[ée]nients?|risques?|fiabilit[ée]|consommation|definition|d[ée]finition)$|^optimisation moteur$|^pr[ée]paration moteur$|^pr[ée]parateur moteur$|^chiptuning$|^chip tuning$|^bo[iî]tier (additionnel|reprogrammation moteur)$|^reprogrammation moteur vs bo[iî]tier/,
];
const DROP = [
  /shiftech|br.?performance|br.?perf|digiservice|bhd|\bo2\b|ziptuning|zip tuning|rs.?tronic|motortech|mc-?r\b|felix|rstronic|1max2fun|vroomly|norauto|feu vert|speedy|midas|carter.?cash|autojm|sport.?system|chiptuning ?box|racechip|dte|jc ?performance|tuning ?box|adp|sptuning|fred auto|puissance injection|auto.?centr|reprogfacile|mtr|ems electronics|remram|digi\b|flexmoteur|biomotors|obd ?auto|outils ?obd/,
  /autour de moi|pr[eè]s de (chez )?moi|proche|\b(paris|lyon|marseille|toulouse|nice|nantes|bordeaux|lille|nancy|metz|strasbourg|rennes|montpellier|perpignan|grenoble|dijon|reims|angers|caen|rouen|tours|orl[ée]ans|nimes|nîmes|avignon|toulon|clermont|limoges|besan[cç]on|poitiers|mulhouse|colmar|brest|quimper|lorient|vannes|le mans|le havre|amiens|troyes|annecy|chamb[ée]ry|valence|pau|bayonne|tarbes|agen|b[ée]ziers|narbonne|carcassonne|albi|rodez|cahors|montauban|auch|mont de marsan|dax|la rochelle|niort|angoul[eê]me|bourges|nevers|auxerre|belfort|vesoul|[ée]pinal|charleville|laon|beauvais|compi[eè]gne|evreux|évreux|alen[cç]on|cherbourg|saint.?[a-z]+|villeurbanne|belgique|suisse|luxembourg|bruxelles|gen[eè]ve|corse|ajaccio|bastia|guadeloupe|martinique|r[ée]union|maroc|alg[ée]rie|tunisie|casablanca|alger|tunis|essonne|yvelines|oise|var|h[ée]rault|gironde|is[eè]re|moselle|rh[oô]ne|loire|nord|somme|aisne|ain\b|aude|gard|tarn|lot\b|landes|savoie|jura|doubs|manche|calvados|orne|eure|sarthe|vend[ée]e|finist[eè]re|morbihan|vosges|aube|marne|meuse|yonne|ni[eè]vre|cher\b|indre|creuse|allier|cantal|loz[eè]re|ari[eè]ge|aveyron|drome|drôme|ard[eè]che|vaucluse|alpes)\b|\b(0?[1-9]|[1-8][0-9]|9[0-5])\b(?! ?(cv|ch|db|mm|km|l|litres?|ans|jours?|%))/,
  /\b\d{3}[id]\b|\bt ?roc\b|\b(audi|bmw|mercedes|volkswagen|vw|golf|polo|passat|tiguan|t-?roc|touran|seat|leon|ibiza|skoda|octavia|fabia|peugeot|20[0-9]|30[0-9]|50[0-9]|citro[eë]n|c[1-6]\b|ds[3-7]|renault|clio|m[ée]gane|captur|kadjar|scenic|scénic|laguna|talisman|dacia|duster|sandero|ford|fiesta|focus|kuga|puma|mondeo|transit|opel|corsa|astra|insignia|mokka|fiat|500|punto|tipo|alfa|giulia|giulietta|toyota|yaris|corolla|rav4|hilux|honda|civic|nissan|qashqai|juke|micra|mazda|hyundai|kia|suzuki|swift|vitara|volvo|xc|v40|v60|mini\b|cooper|porsche|cayenne|macan|jaguar|land ?rover|range|jeep|tesla|smart|lexus|subaru|mitsubishi|abarth|cupra|dodge|chevrolet|chrysler|lancia|saab|iveco|man\b|scania|daf|master|trafic|jumper|jumpy|boxer|ducato|vivaro|sprinter|vito|caddy|crafter|amarok|berlingo|partner|kangoo|expert|tdi|hdi|dci|tsi|tfsi|tdci|cdti|multijet|blue ?hdi|dig-?t|ecoboost|puretech|gti|gtd|\brs\d?\b|\bm[2-8]\b|amg|\bs[3-8]\b|\bx[1-7]\b|série [1-7]|serie [1-7]|classe [a-e]\b|cla\b|glc|gle|q[2-8]\b|a[1-8]\b|v[3-8]\b|c[1-9] ?(hdi|vti|puretech)?\b|1[.,][0-9]|2[.,][0-9]|3[.,][0-9])\b/,
  /\bcl[ée]s?\b|t[ée]l[ée]commande|carte main libre|badge|antivol|immo\b|immobilis|airbag|compteur|kilom[ée]trage|autoradio|gps|navigation|bluetooth|si[eè]ge|vitre|phare|feux|clim|batterie|d[ée]marreur|alternateur|pneu|frein|vidange|embrayage|courroie|distribution|amortisseur|pare.?brise|carrosserie|peinture|lavage|nettoyage|contr[oô]le technique pas cher|occasion|leasing|location|assurance auto pas cher|permis|auto.?[ée]cole|emploi|offre d.emploi|indeed|recrutement|cv\b(?! fiscaux)|stage (alternance|entreprise|bts|bac)|bts|licence|cap\b|bac pro/,
  /moto|quad|scooter|jet.?ski|bateau|tracteur|camping.?car|poids lourd|camion|agricole|tondeuse|karting|drone|pc\b|ordinateur|windows|android|iphone|box internet|freebox|livebox|tv\b|t[ée]l[ée]vision|machine [àa] laver|lave.?linge|frigo|four\b|chaudi[eè]re|pompe [àa] chaleur|robot|thermostat|alarme|domotique|jeu|jeux|ps[45]|xbox|nintendo|c[ée]r[ée]brale?|cerveau|subconscient|mental|neuro|hypnose|coaching de vie|adn|g[ée]n[ée]tique|cellulaire|thermostat|reprogrammation (de la|du) (pens[ée]e|cerveau|mental)/,
];

const all: { id: string; keyword: string; volume: number | null; status: string }[] = [];
for (let p = 0; ; p++) {
  const { data, error } = await sb
    .from("discovered_keywords")
    .select("id, keyword, volume, status")
    .eq("site_key", "reprog")
    .order("id")
    .range(p * 500, p * 500 + 499);
  if (error) throw error;
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 500) break;
}

const decide = (kw: string): "approved" | "ignored" | "new" => {
  const k = kw.toLowerCase();
  if (DROP.some((r) => r.test(k))) return "ignored";
  if (KEEP.some((r) => r.test(k))) return "approved";
  return "new";
};

const buckets: Record<string, { n: number; vol: number; sample: string[] }> = {};
const updates: { id: string; status: string }[] = [];
for (const k of all) {
  const d = decide(k.keyword);
  const b = (buckets[d] ??= { n: 0, vol: 0, sample: [] });
  b.n++;
  b.vol += k.volume ?? 0;
  if (b.sample.length < 40) b.sample.push(`${k.volume ?? 0} ${k.keyword}`);
  if (d !== "new" && k.status !== d) updates.push({ id: k.id, status: d });
}
for (const [s, b] of Object.entries(buckets)) {
  console.log(`\n== ${s}: ${b.n} mots-clés, volume ${b.vol}`);
  console.log(b.sample.join(" | "));
}
console.log(`\n${updates.length} lignes à modifier — ${APPLY ? "ÉCRITURE" : "simulation (--apply pour écrire)"}`);
if (APPLY) {
  for (const status of ["approved", "ignored"]) {
    const ids = updates.filter((u) => u.status === status).map((u) => u.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await sb.from("discovered_keywords").update({ status }).in("id", ids.slice(i, i + 200));
      if (error) throw error;
    }
    console.log(status, ids.length, "écrits");
  }
}
