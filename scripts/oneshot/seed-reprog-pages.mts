/**
 * Pages piliers du site Reprog Formation (site_key reprog) : crée les 8 brouillons
 * vides dans seo_pages puis les fait produire par le pipeline du dashboard
 * (POST /api/briefs/generate avec la requête et les consignes de chaque page,
 * puis POST /api/generate — CLI Opus, ~6 min par page, une exécution à la fois).
 * Idempotent : une page publiée n'est jamais touchée ; une page déjà rédigée
 * (seoSections présentes) est sautée sauf --force.
 *
 *   npx tsx scripts/oneshot/seed-reprog-pages.mts              # crée les brouillons seulement
 *   npx tsx scripts/oneshot/seed-reprog-pages.mts --generate   # + brief + rédaction, en séquence
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { getSupabase } from "../../src/db/client";

const SITE = "reprog";
const GENERATE = process.argv.includes("--generate");
const FORCE = process.argv.includes("--force");
const DASH = "http://localhost:3000";

const env = readFileSync("/home/ubuntu/sites/seo-dashboard/.env.local", "utf8");
const user = env.match(/^DASHBOARD_USER=(.+)$/m)?.[1]?.trim();
const pass = env.match(/^DASHBOARD_PASSWORD=(.+)$/m)?.[1]?.trim();
if (GENERATE && (!user || !pass)) throw new Error("DASHBOARD_USER / DASHBOARD_PASSWORD introuvables");

const COMMON = `Site NATIONAL (France entière) : ne jamais écrire Perpignan ni aucune ville. Ne jamais annoncer de prix, de durée, de format définitif, de formateur nommé, de nombre de stagiaires ni de certification (pas de CPF, pas de Qualiopi, pas de « certifié »). Ne JAMAIS écrire que la formation est « en construction », « pas encore fixée » ou « provisoire » : dire simplement que les modalités, les dates et le tarif sont communiqués à l'entretien d'orientation, et rester affirmatif sur le contenu enseigné. Le seul appel à l'action : appeler pour un entretien d'orientation et recevoir le programme (page /contact). Les fourchettes du MARCHÉ peuvent être citées comme repères (formations concurrentes 400 à 4 000 €, matériel de départ 8 000 à 12 000 €, prestation de reprogrammation facturée 400 à 800 € par véhicule), jamais comme nos tarifs. Vocabulaire du métier : calculateur, cartographie, OBD / bench / boot, checksum, injection, avance, pression de suralimentation, limiteurs. Lier vers les modules voisins : /formation/programme, /formation/en-ligne, /formation/prix, /formation/cpf, /formation/cartographie-moteur, /formation/ethanol-e85, /formation/outils, /devenir-reprogrammateur-automobile.`;

type Spec = {
  slug: string;
  service: string;
  page_type: "service" | "article";
  profile_id: string;
  main_keyword: string;
  secondary: { keyword: string; volume?: number }[];
  instructions: string;
};

const pages: Spec[] = [
  {
    slug: "formation/programme",
    service: "Programme de la formation reprogrammation moteur",
    page_type: "service",
    profile_id: "guide",
    main_keyword: "formation reprogrammation moteur",
    secondary: [
      { keyword: "reprogrammation moteur formation", volume: 590 },
      { keyword: "formation reprogrammation automobile", volume: 90 },
      { keyword: "formation reprogrammation voiture", volume: 70 },
      { keyword: "stage de reprogrammation moteur", volume: 10 },
      { keyword: "formation reprogrammation ecu", volume: 10 },
    ],
    instructions: `Page de référence du site : le programme module par module. Structure attendue : à qui s'adresse la formation et prérequis ; module 1 le calculateur et la gestion moteur ; module 2 lecture et écriture (OBD, bench, boot, sauvegarde du fichier d'origine, checksum) ; module 3 lire une cartographie (injection, avance, suralimentation, couple, limiteurs) ; module 4 essence, diesel, E85 ; module 5 essai, validation au banc, diagnostic des erreurs ; module 6 cadre légal et relation client ; comment se déroule l'inscription (entretien d'orientation). ${COMMON}`,
  },
  {
    slug: "formation/en-ligne",
    service: "Formation reprogrammation moteur en ligne",
    page_type: "service",
    profile_id: "guide",
    main_keyword: "formation reprogrammation moteur en ligne",
    secondary: [
      { keyword: "formation reprogrammation moteur à distance", volume: 10 },
      { keyword: "formation reprogrammation moteur pdf", volume: 90 },
      { keyword: "cours reprogrammation moteur", volume: 10 },
    ],
    instructions: `Expliquer honnêtement ce qu'une formation à distance couvre bien (théorie du calculateur, lecture de cartographies sur fichiers réels, exercices de modification, corrections commentées) et ce qui exige un véhicule et un banc (écriture réelle, essai). Comparer les formats sans dénigrer personne. Un mot sur les cours gratuits et les PDF qu'on trouve en ligne : utiles pour comprendre, insuffisants pour exercer. ${COMMON}`,
  },
  {
    slug: "formation/prix",
    service: "Prix d'une formation reprogrammation moteur",
    page_type: "service",
    profile_id: "guide",
    main_keyword: "prix formation reprogrammation moteur",
    secondary: [
      { keyword: "formation reprogrammation moteur prix", volume: 10 },
      { keyword: "formation reprogrammation moteur tarif", volume: 10 },
      { keyword: "combien coûte une formation reprogrammation moteur" },
    ],
    instructions: `Page « ce que ça coûte » : les fourchettes du marché par format (initiation en vidéo autour de 200 à 250 €, présentiel 2 à 3 jours autour de 1 000 €, présentiel 5 à 7 jours 1 500 à 4 000 €), ce qui explique les écarts (banc, véhicules d'essai, taille du groupe, suivi), le budget matériel pour exercer ensuite (interface 1 500 à 4 000 €, logiciel d'édition 2 000 à 5 000 € par an, diagnostic, banc en option 15 000 à 40 000 €), et ce qu'un reprogrammateur facture (400 à 800 € par véhicule) pour raisonner en retour sur investissement. Ne JAMAIS donner notre tarif : il est communiqué à l'entretien. ${COMMON}`,
  },
  {
    slug: "formation/cpf",
    service: "Formation reprogrammation moteur et CPF",
    page_type: "service",
    profile_id: "guide",
    main_keyword: "formation reprogrammation moteur cpf",
    secondary: [
      { keyword: "financement formation reprogrammation moteur" },
      { keyword: "formation reprogrammation moteur opco" },
    ],
    instructions: `Dire dès la première phrase que NOTRE formation n'est PAS éligible au CPF, et expliquer pourquoi : le CPF ne finance que les formations menant à une certification enregistrée au répertoire spécifique ou au RNCP de France Compétences ; très peu de formations reprog le sont. Expliquer ensuite les autres financements réels : OPCO pour un salarié de garage, FAFCEA / AGEFICE pour un artisan ou indépendant, France Travail (AIF) pour un demandeur d'emploi, autofinancement. Honnête, utile, sans tourner autour du pot. ${COMMON}`,
  },
  {
    slug: "formation/cartographie-moteur",
    service: "Formation cartographie moteur",
    page_type: "service",
    profile_id: "guide",
    main_keyword: "formation cartographie moteur",
    secondary: [
      { keyword: "formation reprogrammation calculateur automobile", volume: 40 },
      { keyword: "cours reprogrammation calculateur automobile", volume: 10 },
      { keyword: "modification cartographie", volume: 90 },
      { keyword: "cartographie moteur", volume: 720 },
    ],
    instructions: `Le cœur technique : qu'est-ce qu'une cartographie dans le fichier du calculateur (tables 2D/3D, axes régime × charge), les cartes qu'on modifie sur un stage 1 (injection, avance à l'allumage, pression de suralimentation, limiteur de couple, débit injecteurs sur diesel), les tolérances, ce qu'on ne touche pas, le rôle du fichier d'origine et du checksum, comment on vérifie au banc. Expliquer comment la formation fait pratiquer sur des fichiers réels. ${COMMON}`,
  },
  {
    slug: "formation/ethanol-e85",
    service: "Formation reprogrammation éthanol E85",
    page_type: "service",
    profile_id: "guide",
    main_keyword: "formation reprogrammation ethanol",
    secondary: [
      { keyword: "reprogrammation ethanol", volume: 390 },
      { keyword: "reprogrammation flexfuel", volume: 170 },
      { keyword: "reprogrammation flexfuel homologué", volume: 10 },
    ],
    instructions: `Ce que la conversion E85 par reprogrammation demande : richesse et temps d'injection (+ 30 à 40 % de carburant), avance, démarrage à froid, débit des injecteurs et de la pompe, compatibilité des matériaux. Distinguer boîtier flexfuel homologué (dispositif agréé, carte grise modifiable) et reprogrammation E85 (non homologuée en France sauf procédure individuelle) : un professionnel doit expliquer ce cadre à son client. Pourquoi c'est la demande la plus forte en atelier. ${COMMON}`,
  },
  {
    slug: "formation/outils",
    service: "Outils de reprogrammation moteur",
    page_type: "service",
    profile_id: "guide",
    main_keyword: "outil reprogrammation moteur",
    secondary: [
      { keyword: "formation reprogrammation moteur alientech", volume: 10 },
      { keyword: "cours reprogrammation winols", volume: 10 },
      { keyword: "kess reprogrammation", volume: 30 },
      { keyword: "autotuner reprogrammation", volume: 70 },
    ],
    instructions: `Guide du matériel : interfaces de lecture / écriture (Alientech KESS3, Autotuner, et leur logique master / slave), logiciels d'édition (WinOLS, ECM Titanium), outils de diagnostic OBD, banc de puissance ; ce que chacun fait, ordre de prix du marché, abonnements et packs de fichiers, ce qu'il faut acheter en premier et ce qui peut attendre. Préciser ce que la formation fait manipuler sans citer de partenariat ni d'agrément. ${COMMON}`,
  },
  {
    slug: "devenir-reprogrammateur-automobile",
    service: "Devenir reprogrammateur automobile",
    page_type: "article",
    profile_id: "guide",
    main_keyword: "devenir reprogrammateur automobile",
    secondary: [
      { keyword: "devenir reprogrammateur moteur", volume: 10 },
      { keyword: "reprogrammateur automobile salaire" },
      { keyword: "métier reprogrammateur moteur" },
    ],
    instructions: `Page métier : il n'existe aucun diplôme de reprogrammateur en France ; parcours habituel (bases mécanique / électronique, puis formation spécialisée, puis pratique) ; compétences indispensables ; matériel et budget de départ ; statut (micro-entreprise pour débuter, puis société), assurance RC pro, ce qu'un reprogrammateur facture (400 à 800 € par véhicule) et ce qu'il peut espérer (2 500 à 6 000 € net mensuel après 2 à 3 ans selon les sources du marché, à présenter comme des ordres de grandeur) ; les erreurs des débutants (fichiers génériques, pas de sauvegarde d'origine, ignorer le cadre légal). Lier vers /formation/programme. ${COMMON}`,
  },
];

const sb = getSupabase();
const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
const post = (path: string, body: unknown) =>
  JSON.parse(
    execFileSync(
      "curl",
      ["-s", "--max-time", "1500", "-X", "POST", "-H", `Authorization: ${auth}`, "-H", "Content-Type: application/json", "-d", JSON.stringify(body), `${DASH}${path}`],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
    ) || "{}",
  );

for (const p of pages) {
  const { data: existing } = await sb.from("seo_pages").select("id, status, content").eq("site_key", SITE).eq("slug", p.slug).maybeSingle();
  let id = existing?.id as string | undefined;
  if (existing?.status === "published") {
    console.log("publiée, non touchée :", p.slug);
    continue;
  }
  if (!existing) {
    const { data, error } = await sb
      .from("seo_pages")
      .insert({
        site_key: SITE,
        slug: p.slug,
        city: null,
        service: p.service,
        page_type: p.page_type,
        intent: "service",
        mode: "thematic",
        status: "draft",
        h1: "",
        meta_title: "",
        meta_description: "",
        content: { brief: { source: "seed:reprog", instructions: p.instructions } },
      })
      .select("id")
      .single();
    if (error) throw new Error(`${p.slug} : ${error.message}`);
    id = data.id;
    console.log("créé", p.slug, id);
  } else console.log("existe", p.slug, id, existing.status);

  if (!GENERATE) continue;
  const already = Array.isArray(existing?.content?.seoSections) && existing.content.seoSections.length > 0;
  if (already && !FORCE) {
    console.log("  déjà rédigée, sautée (--force pour refaire)");
    continue;
  }
  const t0 = Date.now();
  const job = post("/api/jobs", { kind: "page", page_id: id });
  const brief = post("/api/briefs/generate", {
    page_id: id,
    main_keyword: p.main_keyword,
    secondary_keywords: p.secondary,
    page_type: p.page_type,
    profile_id: p.profile_id,
    instructions: p.instructions,
    job_id: job.id,
  });
  if (brief.error) {
    console.log("  brief KO :", brief.error);
    continue;
  }
  console.log(`  brief OK (${Math.round((Date.now() - t0) / 1000)} s)`);
  const gen = post("/api/generate", { page_id: id, job_id: job.id });
  const dt = Math.round((Date.now() - t0) / 1000);
  if (gen.error) console.log(`  génération KO (${dt} s) :`, String(gen.error).slice(0, 200));
  else {
    const { data: row } = await sb.from("seo_pages").select("status, h1, content").eq("id", id).single();
    const words = [row?.content?.intro, ...((row?.content?.seoSections as { content: string }[] | undefined)?.map((s) => s.content) ?? [])]
      .join(" ")
      .split(/\s+/).length;
    console.log(`  rédigée (${dt} s) : ${row?.status} — ${row?.h1} — ~${words} mots`);
  }
}
console.log("fin");
