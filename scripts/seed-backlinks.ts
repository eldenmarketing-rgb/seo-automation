// Seed du module Backlinks :
// 1. importe les lignes de l'ancienne table `directories` dans `backlink_targets`
// 2. ajoute le catalogue issu des kits S-Party / VTC (reports/*.md)
// 3. crée les tâches pour les sites prioritaires (carrosserie, vtc, garage)
// 4. importe l'historique S-Party (web 2.0 déjà publiés)
// Idempotent : relançable sans créer de doublons.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const PRIORITY_SITES = ['carrosserie', 'vtc', 'garage'];

type Target = {
  name: string;
  base_url: string;
  signup_url?: string;
  type: string;
  niche?: string | null;
  dr?: number | null;
  dofollow?: boolean | null;
  priority?: string;
  notes?: string;
  source: string;
};

const CATALOG: Target[] = [
  // — Web 2.0 (kit S-Party)
  { name: 'Medium', base_url: 'medium.com', signup_url: 'https://medium.com', type: 'web2', priority: 'medium', dr: 94, source: 'kit_sparty' },
  { name: 'Telegraph', base_url: 'telegra.ph', signup_url: 'https://telegra.ph', type: 'web2', priority: 'medium', dr: 91, dofollow: true, source: 'kit_sparty' },
  { name: 'Blogger', base_url: 'blogger.com', signup_url: 'https://blogger.com', type: 'web2', priority: 'medium', dr: 98, dofollow: true, source: 'kit_sparty' },
  { name: 'Google Sites', base_url: 'sites.google.com', signup_url: 'https://sites.google.com', type: 'web2', priority: 'medium', dr: 98, dofollow: true, source: 'kit_sparty' },
  { name: 'WordPress.com', base_url: 'wordpress.com', signup_url: 'https://wordpress.com/start', type: 'web2', priority: 'medium', dr: 94, source: 'kit_sparty' },
  { name: 'Tumblr', base_url: 'tumblr.com', signup_url: 'https://tumblr.com/register', type: 'web2', priority: 'low', dr: 86, source: 'kit_sparty' },
  { name: 'Notion', base_url: 'notion.site', signup_url: 'https://notion.so', type: 'web2', priority: 'low', dr: 91, source: 'kit_sparty' },
  { name: 'Substack', base_url: 'substack.com', signup_url: 'https://substack.com', type: 'web2', priority: 'low', dr: 90, source: 'kit_sparty' },
  { name: 'Issuu', base_url: 'issuu.com', signup_url: 'https://issuu.com', type: 'web2', priority: 'low', dr: 90, source: 'kit_sparty' },
  { name: 'LinkedIn Articles', base_url: 'linkedin.com', signup_url: 'https://linkedin.com', type: 'web2', priority: 'low', dr: 98, source: 'kit_sparty' },

  // — Annuaires FR self-serve (kit VTC)
  { name: 'Indexa', base_url: 'indexa.fr', signup_url: 'https://indexa.fr/register', type: 'annuaire', priority: 'medium', source: 'kit_vtc' },
  { name: 'TopLien', base_url: 'toplien.fr', signup_url: 'https://toplien.fr/submit_site.html', type: 'annuaire', priority: 'low', notes: 'Description doit être unique', source: 'kit_vtc' },
  { name: 'Webwiki', base_url: 'webwiki.fr', signup_url: 'https://webwiki.fr/info/inscription-de-site-internet.html', type: 'annuaire', priority: 'low', source: 'kit_vtc' },
  { name: 'AnnuaireFrancais', base_url: 'annuairefrancais.fr', signup_url: 'https://annuairefrancais.fr/proposer-un-site', type: 'annuaire', priority: 'low', source: 'kit_vtc' },
  { name: 'Yably', base_url: 'yably.fr', signup_url: 'https://yably.fr', type: 'annuaire', priority: 'low', source: 'kit_vtc' },
  { name: 'Yoys', base_url: 'yoys.fr', signup_url: 'https://yoys.fr/add-listing', type: 'annuaire', priority: 'low', source: 'kit_vtc' },
  { name: 'Justacote', base_url: 'justacote.com', signup_url: 'https://justacote.com/inscription-entreprise', type: 'annuaire', priority: 'medium', source: 'kit_vtc' },
  { name: 'Pages Pro', base_url: 'pagespro.com', signup_url: 'https://pagespro.com/inscription', type: 'annuaire', priority: 'medium', source: 'kit_vtc' },
  { name: 'Gowork', base_url: 'gowork.fr', signup_url: 'https://gowork.fr/ajouter-entreprise', type: 'annuaire', priority: 'low', source: 'kit_vtc' },
  { name: 'Horaires Ouverture 24', base_url: 'horaires-douverture24.fr', signup_url: 'https://horaires-douverture24.fr/ajouter-entreprise', type: 'annuaire', priority: 'low', source: 'kit_vtc' },
  { name: 'Annuaire Mairie', base_url: 'annuaire-mairie.fr', signup_url: 'https://annuaire-mairie.fr/perpignan.html', type: 'annuaire', priority: 'medium', source: 'kit_vtc' },
  { name: 'Annuaire-Annuaire', base_url: 'annuaire-annuaire.com', signup_url: 'https://annuaire-annuaire.com/proposer-site', type: 'annuaire', priority: 'low', source: 'kit_vtc' },

  // — Avis / maps / plateformes
  { name: 'Yelp Business', base_url: 'yelp.fr', signup_url: 'https://biz.yelp.fr/signup', type: 'annuaire', priority: 'medium', dr: 93, source: 'kit_vtc' },
  { name: 'Foursquare Business', base_url: 'foursquare.com', signup_url: 'https://foursquare.com/business', type: 'annuaire', priority: 'low', dr: 92, source: 'kit_vtc' },
  { name: 'TripAdvisor', base_url: 'tripadvisor.com', signup_url: 'https://tripadvisor.com/Owners', type: 'annuaire', niche: 'vtc', priority: 'medium', dr: 93, notes: 'Catégorie Transport', source: 'kit_vtc' },
  { name: 'Bing Places', base_url: 'bingplaces.com', signup_url: 'https://bingplaces.com', type: 'gbp', priority: 'high', source: 'kit_vtc' },
  { name: 'Apple Maps Connect', base_url: 'mapsconnect.apple.com', signup_url: 'https://mapsconnect.apple.com', type: 'gbp', priority: 'high', source: 'kit_vtc' },
  { name: 'Waze Local', base_url: 'business.waze.com', signup_url: 'https://business.waze.com', type: 'gbp', priority: 'medium', source: 'kit_vtc' },

  // — Profils sociaux (lien de bio, NAP)
  { name: 'Facebook Page Pro', base_url: 'facebook.com', signup_url: 'https://facebook.com/pages/create', type: 'autre', priority: 'medium', source: 'kit_vtc' },
  { name: 'Instagram Business', base_url: 'instagram.com', signup_url: 'https://instagram.com', type: 'autre', priority: 'low', notes: 'Lien en bio', source: 'kit_vtc' },
  { name: 'LinkedIn Company Page', base_url: 'linkedin.com/company', signup_url: 'https://linkedin.com/company/setup/new', type: 'autre', priority: 'low', source: 'kit_vtc' },
  { name: 'YouTube Channel', base_url: 'youtube.com', signup_url: 'https://youtube.com', type: 'autre', priority: 'low', notes: 'Description + bannière', source: 'kit_vtc' },
  { name: 'Pinterest Business', base_url: 'business.pinterest.com', signup_url: 'https://business.pinterest.com', type: 'autre', priority: 'low', notes: 'Claim site', source: 'kit_vtc' },

  // — Institutionnel / presse / niveau 1
  { name: 'CMA 66', base_url: 'cma66.fr', signup_url: 'https://cma66.fr', type: 'institutionnel', priority: 'high', notes: 'Chambre de métiers — annuaire artisans', source: 'manual' },
  { name: "L'Indépendant", base_url: 'lindependant.fr', type: 'presse', priority: 'high', notes: 'Pitch angle local (pénurie pièces, prix, réglementation)', source: 'manual' },
  { name: 'Made in Perpignan', base_url: 'madeinperpignan.com', type: 'presse', priority: 'high', notes: 'Média local — angle artisan/commerce de proximité', source: 'manual' },
  { name: 'Fournisseurs — pages "trouver un pro"', base_url: '', type: 'fournisseur', priority: 'high', notes: 'Marques peinture, réseaux pièces, plateformes type Vroomly/iDGarages : annuaires installateurs agréés', source: 'manual' },
  { name: 'Témoignages fournisseurs/outils', base_url: '', type: 'temoignage', priority: 'high', notes: 'Écrire un témoignage client aux fournisseurs utilisés → lien depuis leur site', source: 'manual' },
];

const domain = (u: string) => (u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

async function seedTargets(): Promise<Map<string, string>> {
  // 1. Import de l'ancienne table directories
  const { data: dirs, error: dirErr } = await db.from('directories').select('name, url, type, priority, dofollow, dr');
  if (dirErr) throw dirErr;

  const typeMap: Record<string, string> = { annuaire: 'annuaire', institutionnel: 'institutionnel', gmb: 'gbp' };
  const catalogDomains = new Set(CATALOG.map((t) => domain(t.base_url)).filter(Boolean));

  const imported: Target[] = (dirs || [])
    .filter((d) => !catalogDomains.has(domain(d.url)))
    .map((d) => ({
      name: d.name,
      base_url: domain(d.url),
      signup_url: `https://${domain(d.url)}`,
      type: typeMap[d.type] || 'annuaire',
      dr: d.dr,
      dofollow: d.dofollow,
      priority: d.priority === 'critical' ? 'critical' : d.priority,
      source: 'import_directories',
    }));

  const all = [...imported, ...CATALOG].map((t) => ({
    name: t.name,
    base_url: t.base_url,
    signup_url: t.signup_url || null,
    type: t.type,
    niche: t.niche || null,
    dr: t.dr ?? null,
    dofollow: t.dofollow ?? null,
    priority: t.priority || 'medium',
    notes: t.notes || null,
    source: t.source,
  }));

  const { error } = await db.from('backlink_targets').upsert(all, { onConflict: 'name,base_url', ignoreDuplicates: true });
  if (error) throw error;

  const { data: rows, error: selErr } = await db.from('backlink_targets').select('id, name, base_url, type, niche');
  if (selErr) throw selErr;
  console.log(`✅ backlink_targets : ${rows!.length} cibles au total`);

  return new Map(rows!.map((r) => [r.name, r.id]));
}

async function seedTasks(targetIds: Map<string, string>) {
  const { data: rows } = await db.from('backlink_targets').select('id, name, type, niche');
  const { data: existing } = await db.from('backlink_tasks').select('site_key, target_id');
  const have = new Set((existing || []).map((t) => `${t.site_key}:${t.target_id}`));

  const tasks: Array<Record<string, unknown>> = [];
  for (const site of PRIORITY_SITES) {
    for (const t of rows || []) {
      if (t.niche && t.niche !== site) continue;
      if (have.has(`${site}:${t.id}`)) continue;
      tasks.push({ site_key: site, target_id: t.id, target_name: t.name });
    }
  }
  if (tasks.length) {
    const { error } = await db.from('backlink_tasks').insert(tasks);
    if (error) throw error;
  }
  console.log(`✅ backlink_tasks : ${tasks.length} nouvelles tâches (${PRIORITY_SITES.join(', ')})`);
  return have;
}

async function seedSpartyHistory(have: Set<string>) {
  // Historique du tracker reports/sparty-web2-tracker.md (2026-05-20)
  const done = [
    { name: 'Medium', published_url: 'https://medium.com/@tilkik947/silent-disco-en-france-en-2026-ce-quon-a-appris-apr%C3%A8s-180-mariages-organis%C3%A9s-f04408deaa8b', anchor_text: `L'équipe S-Party documente la niche + voir ici`, dofollow: null, notes: 'Dofollow à vérifier (DevTools)' },
    { name: 'Telegraph', published_url: 'https://telegra.ph/Silent-disco--10-questions-quon-nous-pose-tout-le-temps-05-20', anchor_text: 'S-Party — animation silent disco partout en France', dofollow: true, notes: null },
    { name: 'Blogger', published_url: 'https://spartyanimation.blogspot.com/2026/05/silent-disco-camping-soiree-animation.html', anchor_text: 'S-Party × 2', dofollow: true, notes: 'Anchors à diversifier sur les prochains' },
    { name: 'Google Sites', published_url: 'https://sites.google.com/view/silent-disco-france-guide', anchor_text: 'URL nue + long tail + marque+activité (3 liens)', dofollow: true, notes: null },
  ];
  const todo = ['LinkedIn Articles', 'WordPress.com', 'Tumblr', 'Notion', 'Substack', 'Issuu'];

  const { data: rows } = await db.from('backlink_targets').select('id, name').in('name', [...done.map((d) => d.name), ...todo]);
  const ids = new Map((rows || []).map((r) => [r.name, r.id]));

  let inserted = 0;
  for (const d of done) {
    const targetId = ids.get(d.name);
    if (!targetId || have.has(`silent-party:${targetId}`)) continue;
    const { error } = await db.from('backlink_tasks').insert({
      site_key: 'silent-party', target_id: targetId, target_name: d.name, status: 'live',
      published_url: d.published_url, anchor_text: d.anchor_text, dofollow: d.dofollow,
      target_page: 'https://s-party.fr/', submitted_at: '2026-05-20T12:00:00Z', notes: d.notes,
    });
    if (error) throw error;
    inserted++;
  }
  for (const name of todo) {
    const targetId = ids.get(name);
    if (!targetId || have.has(`silent-party:${targetId}`)) continue;
    const { error } = await db.from('backlink_tasks').insert({ site_key: 'silent-party', target_id: targetId, target_name: name });
    if (error) throw error;
    inserted++;
  }
  console.log(`✅ Historique S-Party : ${inserted} tâches importées`);
}

async function run() {
  const targetIds = await seedTargets();
  const have = await seedTasks(targetIds);
  await seedSpartyHistory(have);

  const { count: nTargets } = await db.from('backlink_targets').select('*', { count: 'exact', head: true });
  const { count: nTasks } = await db.from('backlink_tasks').select('*', { count: 'exact', head: true });
  console.log(`\nTotal : ${nTargets} cibles, ${nTasks} tâches`);
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
