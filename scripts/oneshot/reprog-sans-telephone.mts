/**
 * Site Reprog Formation (site_key reprog) : le site est lancé SANS numéro de
 * téléphone (décision du 2026-10-01), tout passe par le formulaire « Recevoir
 * le programme ». Les 8 brouillons écrits le 2026-09-26 contiennent 23 formules
 * qui supposent un numéro visible (« Appelez-nous… », « Nos coordonnées
 * figurent… »). Ce script les remplace, phrase par phrase, par leur équivalent
 * sans appel — « l'entretien d'orientation » reste vrai : on rappelle ceux qui
 * laissent un numéro dans le formulaire.
 *
 * Remplacements EXACTS, écrits à la main : chaque « avant » doit apparaître une
 * fois et une seule dans la page, sinon le script s'arrête sans rien écrire
 * (une page reformulée entre-temps ne doit pas être patchée à l'aveugle).
 * Ne touche que des brouillons : une page publiée est refusée (les pages
 * publiées passent par une révision proposée, pas par une écriture directe).
 *
 * Met aussi à jour la consigne d'appel à l'action du profil (`brand.ctaStyle`)
 * pour que les prochaines générations n'écrivent plus « appelez-nous ».
 *
 *   npx tsx scripts/oneshot/reprog-sans-telephone.mts            # simulation : avant / après
 *   npx tsx scripts/oneshot/reprog-sans-telephone.mts --apply    # écrit
 */
import { getSupabase } from "../../src/db/client";

const SITE = "reprog";
const APPLY = process.argv.includes("--apply");

const D = "un entretien d'orientation";

/** slug → [avant, après][] */
const PATCHES: Record<string, [string, string][]> = {
  "devenir-reprogrammateur-automobile": [
    [`**Appelez-nous pour ${D}** depuis la page contact`, `**Demandez ${D}** depuis la page contact`],
  ],
  "formation/cartographie-moteur": [
    [
      "Appelez-nous pour le fixer et recevoir le programme complet.",
      "Demandez-le depuis la page contact pour recevoir le programme complet.",
    ],
    [`vous pouvez nous appeler dès maintenant pour ${D}`, `vous pouvez demander dès maintenant ${D}`],
    [`appelez-nous pour ${D} : le programme complet`, `demandez ${D} : le programme complet`],
  ],
  "formation/cpf": [
    [`Appelez-nous pour ${D} : nous étudierons`, `Demandez ${D} : nous étudierons`],
    [
      "Personne ne vous demandera de signer au téléphone",
      "Personne ne vous demandera de signer quoi que ce soit",
    ],
  ],
  "formation/en-ligne": [
    ["### Quand appeler", "### Quand nous écrire"],
    ["Appelez-nous dès que votre projet prend forme", "Écrivez-nous dès que votre projet prend forme"],
    ["Appelez aussi avant d'acheter un outil.", "Écrivez-nous aussi avant d'acheter un outil."],
    [
      "Nos coordonnées figurent sur la [page contact](/contact).",
      "Le formulaire se trouve sur la [page contact](/contact).",
    ],
    [`Appeler pour ${D} reste la meilleure façon`, `Demander ${D} reste la meilleure façon`],
  ],
  "formation/ethanol-e85": [
    [`appelez-nous pour ${D} : nous le détaillons`, `demandez ${D} : nous le détaillons`],
    [`- **Appeler** pour ${D} : niveau`, `- **Demander ${D}** : niveau`],
  ],
  "formation/outils": [
    [`Vous pouvez nous appeler pour ${D}.`, `Vous pouvez demander ${D}.`],
    [`[appelez-nous pour ${D}](/contact)`, `[demandez ${D}](/contact)`],
  ],
  "formation/prix": [
    [
      "un tarif élevé caché derrière un appel, ou une technique pour vous faire rappeler",
      "un tarif élevé caché derrière un formulaire, ou une technique pour vous relancer",
    ],
    [`1. Vous appelez pour ${D}.`, `1. Vous demandez ${D}.`],
  ],
  "formation/programme": [
    [`Vous pouvez nous appeler pour ${D} : c'est le bon moment`, `Vous pouvez demander ${D} : c'est le bon moment`],
    ["Vous nous appelez, puis nous faisons le point", "Vous en faites la demande, puis nous faisons le point"],
    ["1. **L'appel** : vous nous contactez", "1. **La demande** : vous nous contactez"],
    ["Vous préférez d'abord lire avant d'appeler ?", "Vous préférez d'abord lire avant d'en parler ?"],
    [`appelez pour ${D} : le programme et les conditions`, `demandez ${D} : le programme et les conditions`],
  ],
};

const CTA_STYLE =
  "un seul appel à l'action : « Recevoir le programme » (formulaire, page /contact). PAS de numéro de téléphone affiché sur le site : ne jamais écrire « appelez-nous », « au téléphone » ni « nos coordonnées ». Déroulé : demande par le formulaire → entretien d'orientation (niveau, projet, format ; on rappelle ceux qui laissent un numéro) → programme et modalités envoyés. Aucune vente en ligne, aucun prix affiché.";

/** Ce qui reste d'un vocabulaire d'appel après patch — doit être vide. */
const LEFTOVER = /appele[zr]|nous appel|vous appel|l'appel\b|téléphon|coup de fil|nos coordonnées/i;

const count = (hay: string, needle: string) => hay.split(needle).length - 1;

const sb = getSupabase();
const { data: pages, error } = await sb
  .from("seo_pages")
  .select("id, slug, status, content")
  .eq("site_key", SITE)
  .in("slug", Object.keys(PATCHES));
if (error) throw error;

let failed = false;
const writes: { id: string; slug: string; content: Record<string, unknown> }[] = [];

for (const [slug, pairs] of Object.entries(PATCHES)) {
  const page = pages?.find((p) => p.slug === slug);
  console.log(`\n## ${slug}`);
  if (!page) {
    console.log("  ✗ page introuvable");
    failed = true;
    continue;
  }
  if (page.status !== "draft") {
    console.log(`  ✗ statut « ${page.status} » : ce script ne touche que des brouillons`);
    failed = true;
    continue;
  }
  // Le contenu est patché sous sa forme sérialisée : une phrase vit dans
  // l'intro, une section, une FAQ — peu importe où. Les chaînes de remplacement
  // sont passées par JSON.stringify pour rester valides une fois sérialisées.
  const enc = (s: string) => JSON.stringify(s).slice(1, -1);
  let json = JSON.stringify(page.content);
  for (const [before, after] of pairs) {
    const n = count(json, enc(before));
    if (n !== 1) {
      console.log(`  ✗ ${n} occurrence(s) au lieu d'une : « ${before} »`);
      failed = true;
      continue;
    }
    json = json.replace(enc(before), () => enc(after));
    console.log(`  - ${before}\n  + ${after}`);
  }
  const content = JSON.parse(json) as Record<string, unknown>;
  // On ne juge que ce qui est servi : le brief garde l'ancienne consigne.
  const served = JSON.stringify({
    intro: content.intro,
    seoSections: content.seoSections,
    faq: content.faq,
    highlights: content.highlights,
  });
  const left = served.match(new RegExp(`.{0,50}(${LEFTOVER.source}).{0,50}`, "gi"));
  if (left) {
    console.log(`  ✗ il reste : ${left.join(" | ")}`);
    failed = true;
  }
  writes.push({ id: page.id, slug, content });
}

if (failed) {
  console.log("\n✗ Rien n'est écrit : corriger les remplacements ci-dessus.");
  process.exit(1);
}

if (!APPLY) {
  console.log(`\nSimulation : ${writes.length} pages prêtes, profil à mettre à jour. Relancer avec --apply pour écrire.`);
  process.exit(0);
}

for (const w of writes) {
  const { error: e } = await sb.from("seo_pages").update({ content: w.content }).eq("id", w.id).eq("status", "draft");
  if (e) throw new Error(`${w.slug} : ${e.message}`);
  console.log(`✓ ${w.slug}`);
}

const { data: profile, error: pe } = await sb.from("site_profiles").select("brand").eq("site_key", SITE).single();
if (pe) throw pe;
const old = profile.brand as Record<string, unknown>;
const proof = typeof old.experienceProof === "string" ? old.experienceProof : "";
const brand = {
  ...old,
  ctaStyle: CTA_STYLE,
  // la preuve d'expérience disait « invite à appeler pour recevoir le programme »
  experienceProof: proof.replace(
    "invite à appeler pour recevoir le programme",
    "invite à demander le programme par le formulaire",
  ),
};
const { error: ue } = await sb.from("site_profiles").update({ brand }).eq("site_key", SITE);
if (ue) throw ue;
console.log("✓ site_profiles.reprog — brand.ctaStyle, brand.experienceProof");
