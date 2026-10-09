/**
 * Pose les liens contextuels dans le corps des deux articles Conseils déjà publiés
 * par le user (garage `conseils/nettoyage-fap-prix`, noia `conseils/tendances-mariage-2027`)
 * sous forme de RÉVISION EN ATTENTE (`seo_page_revisions.status = 'pending'`), sans
 * toucher à la page servie — même garde-fou que la régénération d'une page publiée.
 * À appliquer depuis l'historique de /pages/[id] (« Appliquer » → /rollback, qui
 * revalide le CMS et vérifie en ligne).
 *
 *   npx tsx scripts/oneshot/propose-conseils-links.mts
 */
import { getSupabase } from "../../src/db/client";

const EDITS: Record<string, [string, string][]> = {
  "garage:conseils/nettoyage-fap-prix": [
    ["chez nous, tout commence par une lecture du calculateur, suivie d'un devis détaillé et gratuit.", "chez nous, tout commence par une [lecture du calculateur](/fap-perpignan), suivie d'un devis détaillé et gratuit."],
    ["- **La cause** : capteur de pression différentielle, vanne EGR, injecteurs, débitmètre, réservoir d'additif.", "- **La cause** : capteur de pression différentielle, [vanne EGR](/vanne-egr-perpignan), [injecteurs](/injecteurs-perpignan), débitmètre, réservoir d'additif."],
    ["Un filtre propre dans un moteur qui l'encrasse se rebouche. Ce que l'on vérifie", "Un filtre propre dans un moteur qui l'encrasse se rebouche, et le voyant revient : [notre article sur le voyant FAP](/conseils/voyant-fap-allume) explique pourquoi. Ce que l'on vérifie"],
  ],
  "noia:conseils/tendances-mariage-2027": [
    ["C'est le travail que nous appelons scénographie :", "C'est le travail que nous appelons [scénographie](/prestations/wedding-designer-decoration-mariage-perpignan) :"],
    ["C'est précisément pour cela que nos coordinations jour J se pensent par journée.", "C'est précisément pour cela que [nos coordinations jour J](/prestations/coordination-jour-j-perpignan) se pensent par journée."],
  ],
};

const sb = getSupabase();
for (const [key, pairs] of Object.entries(EDITS)) {
  const [site, slug] = key.split(":");
  const { data: page, error } = await sb
    .from("seo_pages")
    .select("id, site_key, slug, status, version, h1, meta_title, meta_description, content, schema_org")
    .eq("site_key", site)
    .eq("slug", slug)
    .single();
  if (error || !page) { console.log(`ERREUR ${key}: ${error?.message ?? "introuvable"}`); continue; }
  if (page.status !== "published") { console.log(`skip ${key}: ${page.status} (le seed l'a déjà mis à jour)`); continue; }

  const content = JSON.parse(JSON.stringify(page.content)) as Record<string, unknown>;
  let applied = 0;
  const fix = (text: string): string => {
    for (const [a, b] of pairs) if (text.includes(a)) { text = text.replace(a, b); applied++; }
    return text;
  };
  if (typeof content.intro === "string") content.intro = fix(content.intro);
  if (Array.isArray(content.seoSections))
    content.seoSections = (content.seoSections as { content: string }[]).map((s) => ({ ...s, content: fix(s.content) }));
  if (applied !== pairs.length) { console.log(`ERREUR ${key}: ${applied}/${pairs.length} remplacements trouvés — page modifiée depuis ?`); continue; }

  const { data: last } = await sb
    .from("seo_page_revisions")
    .select("revision_number")
    .eq("page_id", page.id)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: rev, error: insErr } = await sb
    .from("seo_page_revisions")
    .insert({
      page_id: page.id,
      revision_number: (last?.revision_number ?? 0) + 1,
      page_version: page.version,
      site_key: page.site_key,
      slug: page.slug,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      h1: page.h1,
      content,
      schema_org: page.schema_org,
      status: "pending",
      change_reason: `Liens contextuels dans le corps (${pairs.length}) vers les pages service et les articles liés — proposé le 2026-10-09`,
      change_author: "elden",
    })
    .select("id, revision_number")
    .single();
  console.log(insErr ? `ERREUR ${key}: ${insErr.message}` : `révision pending n°${rev.revision_number} proposée pour ${key} (page ${page.id}, ${applied} liens)`);
}
