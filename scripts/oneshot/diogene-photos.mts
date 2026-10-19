// Oneshot 2026-10-19 — pose 7 photos de section sur l'article Conseils « syndrome de Diogène » (Debarras),
// puis purge le cache CMS. Simulation par défaut, `--apply` écrit.
import { getSupabase } from "../../src/db/client.ts";

const APPLY = process.argv.includes("--apply");
const PAGE_ID = "04c333c4-64dd-4ffd-ab94-29f914bb9e79";
const SLUG = "conseils/syndrome-de-diogene-vider-nettoyer-logement";
const img = (file: string, alt: string) => ({ src: `/images/${file}.webp`, alt, width: 1280, height: 853 });

// index de section (0-based) → photo
const PHOTOS: Record<number, ReturnType<typeof img>> = {
  1: img("logement-envahi", "Pièce envahie du sol au plafond par des piles d'objets, de papiers et de cartons"),
  3: img("main-tendue", "Main posée sur celle d'une personne âgée assise, en signe de soutien"),
  4: img("equipe-protection", "Intervenants en combinaison blanche et gants bleus dans un logement à vider"),
  6: img("camion-evacuation", "Camion de débarras portes ouvertes, chargé de meubles et de cartons à évacuer"),
  7: img("desinfection", "Désinfection d'une surface avec gants et combinaison de protection"),
  14: img("placard-deborde", "Placard débordant de vêtements et d'objets entassés sur les étagères"),
  16: img("piece-vide", "Pièce entièrement vidée et nettoyée, parquet et grandes fenêtres"),
};

const sb = getSupabase();
const { data, error } = await sb.from("seo_pages").select("id, slug, status, content").eq("id", PAGE_ID).single();
if (error || !data) throw error ?? new Error("page introuvable");
if (data.slug !== SLUG) throw new Error(`slug inattendu : ${data.slug}`);
const content = data.content as { seoSections: { title: string; content: string; image?: unknown }[] };
const sections = content.seoSections.map((s, i) => (PHOTOS[i] ? { ...s, image: PHOTOS[i] } : s));
for (const [i, p] of Object.entries(PHOTOS)) console.log(`§${Number(i) + 1} ${sections[Number(i)].title} ← ${p.src}`);
if (!APPLY) { console.log("\n(simulation — relancer avec --apply)"); process.exit(0); }

const { error: upErr } = await sb
  .from("seo_pages")
  .update({ content: { ...content, seoSections: sections }, updated_at: new Date().toISOString() })
  .eq("id", PAGE_ID);
if (upErr) throw upErr;
console.log("page mise à jour");

const { data: sp } = await sb.from("site_profiles").select("revalidate_url, revalidate_secret").eq("site_key", "debarras").single();
const res = await fetch(sp!.revalidate_url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(sp!.revalidate_secret ? { Authorization: `Bearer ${sp!.revalidate_secret}` } : {}) },
  body: JSON.stringify({ tags: [`page:debarras:${SLUG}`, "pages:debarras"], paths: [`/${SLUG}`] }),
  signal: AbortSignal.timeout(20_000),
});
console.log(`revalidate HTTP ${res.status} : ${(await res.text()).slice(0, 200)}`);
