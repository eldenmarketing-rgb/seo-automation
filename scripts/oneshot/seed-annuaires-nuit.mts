/**
 * Kit d'inscription de « Livraison de Nuit » (site_key `nuit`) :
 *   1. textes d'inscription (description courte / longue) dans site_profiles, copiables depuis /backlinks ;
 *   2. cibles manquantes au catalogue backlink_targets — plateformes et annuaires qui RANKENT sur les
 *      requêtes du marché (analyse SERP du 2026-10-18 : Uber Eats 26 apparitions, Pages Jaunes 18,
 *      Instagram 21, Facebook 10, Koifaire 10, Deliveroo 6, epiciersdefrance.org #2 sur « épicerie de nuit ») ;
 *   3. tâches backlink_tasks du site, dans l'ordre d'impact.
 * Idempotent.
 *   npx tsx scripts/oneshot/seed-annuaires-nuit.mts
 */
import { getSupabase } from "../../src/db/client";

const SITE = "nuit";
const HOME = "https://livraison-de-nuit.fr/";
const db = getSupabase();

// 1. Textes d'inscription (NAP et descriptions). Faits du service uniquement.
const description_short =
  "Livraison de Nuit livre alcool, apéro et épicerie de nuit à domicile à Perpignan et dans les communes voisines (15 km), tous les soirs de 20h à 4h. Commande par téléphone au 09 73 92 08 28, livraison en une trentaine de minutes, paiement à la livraison. Réservé aux majeurs.";
const description_long =
  "Livraison de Nuit est un service de livraison à domicile d'alcool, d'apéro et d'épicerie de nuit à Perpignan et dans les communes voisines dans un rayon d'environ 15 km (Cabestany, Canet-en-Roussillon, Saint-Cyprien, Rivesaltes, Bompas, Saint-Estève, Toulouges, Le Soler, Pia, Claira, Villeneuve-de-la-Raho, Thuir, Elne, Argelès-sur-Mer, Sainte-Marie-la-Mer, Torreilles, Le Barcarès, Leucate).\n\nOuvert tous les soirs de 20h à 4h du matin, 7 jours sur 7, jours fériés compris, quand les supermarchés et les épiceries ont fermé. Au catalogue : vodkas (Poliakov, Absolut), whiskys (Label 5, Johnnie Walker), rhum Captain Morgan, apéritifs et liqueurs (Ricard, Get 27, Malibu, Baileys), bières Heineken livrées fraîches, cava, snacks (Pringles, M&M's, Haribo, Snickers, Mars) et formules bouteille + soft.\n\nLa commande se passe par téléphone au 09 73 92 08 28 : vous dites ce qu'il vous faut et votre adresse, le total et le délai sont confirmés avant le départ, la livraison arrive en une trentaine de minutes (un peu plus vers le littoral) et se règle à la porte, par carte bancaire ou en espèces. Pas d'application ni de compte à créer.\n\nLa vente d'alcool est interdite aux mineurs : une pièce d'identité peut être demandée à la livraison. L'abus d'alcool est dangereux pour la santé, à consommer avec modération.";

{
  const { error } = await db.from("site_profiles").update({ description_short, description_long }).eq("site_key", SITE);
  if (error) throw error;
  console.log("site_profiles.nuit : descriptions posées");
}

// 2. Cibles qui rankent sur le marché, absentes du catalogue
type NewTarget = {
  name: string;
  base_url: string;
  signup_url: string;
  type: "annuaire" | "gbp" | "web2" | "autre";
  dr?: number;
  priority: "critical" | "high" | "medium" | "low";
  notes: string;
};
const NEW_TARGETS: NewTarget[] = [
  { name: "Google Business Profile — Livraison de Nuit", base_url: "business.google.com", signup_url: "https://business.google.com/create", type: "gbp", dr: 100, priority: "critical", notes: "Fiche au nom « Livraison de Nuit », entreprise de service à domicile (sans adresse publique), zone 30 km autour de Perpignan, horaires 20h-4h 7j/7, catégorie « Service de livraison d'alcool » (+ « Service de livraison »), téléphone 09 73 92 08 28, site livraison-de-nuit.fr. Objectif 20 avis réels en 60 jours (SMS après livraison). Le pack local passe avant l'organique sur 12 requêtes sur 22." },
  { name: "Uber Eats (fiche marchand)", base_url: "ubereats.com", signup_url: "https://merchants.ubereats.com/fr/fr/", type: "autre", dr: 92, priority: "critical", notes: "1re plateforme de la SERP (26 apparitions sur 22 requêtes, top 3 sur « livraison alcool perpignan », « apéro de nuit perpignan »). Même nom de marque « Livraison de Nuit » que le site et la fiche Google. En cours de paramétrage (18/10)." },
  { name: "Deliveroo (partenaire)", base_url: "deliveroo.fr", signup_url: "https://restaurants.deliveroo.com/fr-fr/", type: "autre", dr: 88, priority: "high", notes: "Top 3 sur « livraison alcool 66 » et « livraison boisson nuit perpignan » (fiche Express Apéro). Catégorie alcool / épicerie." },
  { name: "Facebook — page Livraison de Nuit Perpignan", base_url: "facebook.com", signup_url: "https://www.facebook.com/pages/create", type: "web2", dr: 96, priority: "high", notes: "Une page nommée « discountaperoperpignan » est 1re sur « apéro de nuit ». Nommer la page « Livraison de Nuit Perpignan », catégorie Service de livraison, horaires, téléphone, lien site." },
  { name: "Instagram — Livraison de Nuit Perpignan", base_url: "instagram.com", signup_url: "https://www.instagram.com/accounts/emailsignup/", type: "web2", dr: 95, priority: "high", notes: "Instagram apparaît 21 fois dans le top 10 (reels « livraison alcool perpignan »). Compte pro, nom et bio avec la requête, lien site, téléphone." },
  { name: "Épiciers de France", base_url: "epiciersdefrance.org", signup_url: "https://www.epiciersdefrance.org/", type: "annuaire", priority: "high", notes: "2e résultat organique sur « épicerie de nuit perpignan » et « épicerie de nuit ». Demander l'ajout d'une fiche épicerie de nuit (livraison)." },
  { name: "Apple Business Connect", base_url: "businessconnect.apple.com", signup_url: "https://businessconnect.apple.com/", type: "gbp", dr: 100, priority: "medium", notes: "Fiche Plans Apple / Siri, mêmes infos que la fiche Google (NAP identique)." },
  { name: "Bing Places", base_url: "bingplaces.com", signup_url: "https://www.bingplaces.com/", type: "gbp", dr: 95, priority: "medium", notes: "Import possible depuis la fiche Google. NAP identique." },
  { name: "Yelp France", base_url: "yelp.fr", signup_url: "https://biz.yelp.fr/", type: "annuaire", dr: 90, priority: "medium", notes: "Fiche gratuite, catégorie Livraison / Alcool. NAP identique." },
];

for (const t of NEW_TARGETS) {
  const { data: found } = await db.from("backlink_targets").select("id").eq("base_url", t.base_url).eq("name", t.name).maybeSingle();
  if (found) { console.log(`= catalogue : ${t.name}`); continue; }
  const { error } = await db.from("backlink_targets").insert({ ...t, source: "kit_nuit" });
  if (error) throw new Error(`${t.name}: ${error.message}`);
  console.log(`+ catalogue : ${t.name}`);
}

// 3. Tâches du site : nouvelles cibles + annuaires généralistes déjà au catalogue (par nom exact)
const EXISTING_BY_NAME: { name: string; note: string }[] = [
  { name: "PagesJaunes", note: "18 apparitions dans le top 10, 1re sur « livraison champagne perpignan ». Fiche gratuite, catégorie livraison à domicile / épicerie, horaires 20h-4h." },
  { name: "koifaire.com", note: "10 apparitions (fiches Apéro Drink, Perpi Drink). Fiche « Livraison de Nuit », livraison à domicile, Perpignan." },
  { name: "118000", note: "Annuaire généraliste, fiche gratuite, NAP identique." },
  { name: "Hoodspot", note: "Annuaire local, fiche gratuite." },
  { name: "Alentoor", note: "Annuaire local, fiche gratuite." },
  { name: "Cylex France", note: "Annuaire généraliste, fiche gratuite." },
];

const wanted = [
  ...NEW_TARGETS.map((t) => ({ name: t.name, note: t.notes })),
  ...EXISTING_BY_NAME,
];
let created = 0;
for (const w of wanted) {
  const { data: target } = await db.from("backlink_targets").select("id, name").eq("name", w.name).limit(1).maybeSingle();
  if (!target) { console.log(`? introuvable au catalogue : ${w.name}`); continue; }
  const { data: existing } = await db.from("backlink_tasks").select("id").eq("site_key", SITE).eq("target_id", target.id).maybeSingle();
  if (existing) { console.log(`= tâche : ${w.name}`); continue; }
  const { error } = await db.from("backlink_tasks").insert({ site_key: SITE, target_id: target.id, target_name: target.name, target_page: HOME, anchor_text: "Livraison de Nuit", notes: w.note });
  if (error) throw new Error(`${w.name}: ${error.message}`);
  created++;
  console.log(`+ tâche : ${w.name}`);
}
console.log(`\n${created} tâche(s) créée(s) pour ${SITE}`);
