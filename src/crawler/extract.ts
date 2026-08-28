/**
 * Reconstruction du contenu **tel qu'il est rendu**, dans la forme que le
 * Quality Score sait déjà lire (`intro`, `seoSections`, `faq`, `internalLinks`).
 *
 * Raison d'être : le score notait `seo_pages.content`, c'est-à-dire ce que le
 * CMS croit avoir écrit. Sur 156 pages en ligne ce champ est vide — le contenu
 * est rendu par le code du site — et le score annonçait 0 mot sur des pages de
 * 1 800 mots. On note désormais ce que le visiteur voit.
 *
 * Deux règles guident l'extraction :
 *
 *  1. La structure ne vient que des vraies balises HTML (`<h2>`, `<ul>`,
 *     `<table>`, `<a>`). Un `###` ou un `|---|` trouvé dans du **texte** est du
 *     texte : il est neutralisé avant d'être recopié. Sans ça une page qui
 *     affiche son markdown en clair — le bug de `reparation-pare-chocs` —
 *     serait créditée de titres, de tableaux et de liens qu'aucun lecteur ne
 *     voit.
 *  2. Rien n'est déduit ni jugé ici. L'extrait est un fait, comme le reste de
 *     `parse.ts`.
 */
import type { CheerioAPI } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

export interface RenderedExtract {
  /** Texte avant le premier H2. */
  intro: string;
  /** Une entrée par H2, contenu en markdown reconstruit. */
  seoSections: Array<{ title: string; content: string }>;
  faq: Array<{ question: string; answer: string }>;
  /** Liens internes hors corps rédactionnel : le bloc de maillage. */
  internalLinks: Array<{ label: string; url: string }>;
  /** Dimensions de la première image du corps, quand elles sont déclarées. */
  heroImage: { width: number; height: number } | null;
  /**
   * L'espace de la première image est-il réservé avant chargement ? Vrai aussi
   * pour une image `fill` (Next.js) : le conteneur porte les dimensions, donc
   * la page ne saute pas. Sans ce fait, une page sans CLS serait pénalisée pour
   * un CLS qu'elle n'a pas.
   */
  heroImageReserved: boolean;
}

/** Au-delà, on tronque : aucun critère ne se joue à ce volume. */
const MAX_CHARS = 20_000;

/** Longueur au-delà de laquelle une ancre trahit une carte, pas un lien. */
const ANCHOR_MAX = 80;

/**
 * Du markdown trouvé dans du texte rendu n'est pas du markdown : c'est une
 * fuite du générateur, et le lecteur la voit telle quelle. On la désamorce
 * pour que le score ne la compte pas comme de la structure.
 */
function neutralize(text: string): string {
  return text
    .replace(/\]\(/g, '] (')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/\|/g, '/')
    .replace(/\*\*/g, '');
}

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const isTag = (n: AnyNode): n is Element => n.type === 'tag';
const tagOf = (n: Element) => n.name.toLowerCase();

/** Blocs dont le texte forme un paragraphe autonome. */
const PROSE = new Set(['p', 'blockquote', 'dd', 'figcaption']);
/** Conteneurs qu'on traverse sans rien en déduire. */
const SKIP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe']);

export function extractRendered($: CheerioAPI, origin: string): RenderedExtract {
  const $body = $('body').clone();
  $body.find('script, style, noscript, nav, header, footer, svg').remove();

  const sections: Array<{ title: string; blocks: string[] }> = [];
  const introBlocks: string[] = [];
  const menuLinks: Array<{ label: string; url: string }> = [];
  const seenMenu = new Set<string>();
  let budget = MAX_CHARS;

  const current = () => (sections.length ? sections[sections.length - 1] : null);

  const registerMenuLink = (pathname: string, label: string) => {
    if (!label || seenMenu.has(pathname)) return;
    seenMenu.add(pathname);
    menuLinks.push({ label, url: pathname });
  };

  const emit = (block: string) => {
    const b = block.trim();
    if (!b || budget <= 0) return;
    const clipped = b.length > budget ? b.slice(0, budget) : b;
    budget -= clipped.length;
    const cur = current();
    if (cur) cur.blocks.push(clipped);
    else introBlocks.push(clipped);
  };

  /**
   * Rend le contenu d'un bloc en markdown inline. Un lien interne devient
   * `[ancre](/chemin)` — c'est ce que le critère « liens contextuels » compte,
   * et il ne doit compter que de vrais liens cliquables.
   */
  const inline = (node: AnyNode): string => {
    if (node.type === 'text') return neutralize(node.data || '');
    if (!isTag(node)) return '';
    const tag = tagOf(node);
    if (SKIP.has(tag)) return '';

    const inner = (node.children || []).map(inline).join('');
    if (tag !== 'a') return inner;

    const href = (node.attribs?.href || '').trim();
    const label = squash(inner);
    if (!href || !label) return inner;
    if (href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return inner;
    try {
      const abs = new URL(href, origin);
      if (abs.origin !== origin) return inner;
      // Une ancre de cette longueur n'est pas une ancre : c'est une carte
      // cliquable qui a avalé un titre, un descriptif et un « Découvrir ». La
      // compter comme lien contextuel ferait passer un bloc de maillage pour
      // du maillage rédactionnel.
      if (label.length > ANCHOR_MAX) {
        registerMenuLink(abs.pathname, label.slice(0, 60));
        return label;
      }
      return `[${label}](${abs.pathname})`;
    } catch {
      return inner;
    }
  };

  /** Un lien hors prose : c'est du maillage, pas un lien contextuel. */
  const collectMenuLink = (node: Element) => {
    const href = (node.attribs?.href || '').trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    let abs: URL;
    try {
      abs = new URL(href, origin);
    } catch {
      return;
    }
    if (abs.origin !== origin) return;
    const label = squash((node.children || []).map(inline).join('')).replace(/\[|\]\([^)]*\)/g, '');
    registerMenuLink(abs.pathname, label.slice(0, 60));
  };

  const walk = (node: AnyNode) => {
    if (budget <= 0) return;

    if (node.type === 'text') {
      const t = squash(neutralize(node.data || ''));
      // Un texte nu dans un `div` reste du contenu : on ne le perd pas, mais on
      // ignore les miettes de mise en page.
      if (t.length > 40) emit(t);
      return;
    }
    if (!isTag(node)) return;

    const tag = tagOf(node);
    if (SKIP.has(tag)) return;

    // Le H1 est déjà un fait à part (`facts.h1`) : le recopier dans l'intro
    // ferait croire que le keyword y figure alors qu'il vient du titre.
    if (tag === 'h1') return;

    if (tag === 'h2') {
      const title = squash((node.children || []).map(inline).join('')).replace(
        /\[([^\]]*)\]\([^)]*\)/g,
        '$1',
      );
      sections.push({ title, blocks: [] });
      return;
    }

    if (tag === 'h3' || tag === 'h4') {
      const title = squash((node.children || []).map(inline).join('')).replace(
        /\[([^\]]*)\]\([^)]*\)/g,
        '$1',
      );
      if (title) emit(`### ${title}`);
      return;
    }

    if (PROSE.has(tag)) {
      emit(squash((node.children || []).map(inline).join('')));
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = $(node)
        .children('li')
        .toArray()
        .map((li) => squash((li.children || []).map(inline).join('')))
        .filter(Boolean);
      if (items.length) emit(items.map((i) => `- ${i}`).join('\n'));
      return;
    }

    if (tag === 'table') {
      const rows = $(node)
        .find('tr')
        .toArray()
        .map((tr) =>
          $(tr)
            .children('th, td')
            .toArray()
            .map((c) => squash((c.children || []).map(inline).join(''))),
        )
        .filter((cells) => cells.length > 0);
      if (rows.length) {
        const md = [
          `| ${rows[0].join(' | ')} |`,
          `|${rows[0].map(() => '---').join('|')}|`,
          ...rows.slice(1).map((r) => `| ${r.join(' | ')} |`),
        ].join('\n');
        emit(md);
      }
      return;
    }

    // Une FAQ en accordéon : la question porte le rôle d'un titre.
    if (tag === 'details') {
      const summary = $(node).children('summary').first();
      const q = squash(summary.text());
      if (q) emit(`### ${q}`);
      for (const child of node.children || []) {
        if (isTag(child) && tagOf(child) === 'summary') continue;
        walk(child);
      }
      return;
    }

    if (tag === 'a') {
      collectMenuLink(node);
      return;
    }

    for (const child of node.children || []) walk(child);
  };

  for (const child of $body.get(0)?.children || []) walk(child);

  const images = $body.find('img').toArray();
  const hero = images
    .map((img) => ({
      width: Number(img.attribs?.width || 0),
      height: Number(img.attribs?.height || 0),
    }))
    .find((d) => d.width > 0 && d.height > 0);
  // Une image `fill` est posée en absolu dans un conteneur qui porte déjà sa
  // hauteur : rien ne saute au chargement, l'espace est réservé.
  const reserved =
    !!hero ||
    images.some((img) => {
      const style = (img.attribs?.style || '').replace(/\s/g, '');
      return (
        img.attribs?.['data-nimg'] === 'fill' ||
        style.includes('aspect-ratio') ||
        (style.includes('position:absolute') && style.includes('height:100%'))
      );
    });

  return {
    intro: introBlocks.join('\n\n').slice(0, 2000),
    seoSections: sections
      .filter((s) => s.title || s.blocks.length)
      .map((s) => ({ title: s.title, content: s.blocks.join('\n\n') })),
    faq: extractFaq($),
    internalLinks: menuLinks.slice(0, 30),
    heroImage: hero ?? null,
    heroImageReserved: reserved,
  };
}

/**
 * La FAQ est lue dans le JSON-LD quand il existe : c'est la source que Google
 * lit lui-même, et elle donne la question et la réponse sans heuristique.
 */
function extractFaq($: CheerioAPI): Array<{ question: string; answer: string }> {
  const out: Array<{ question: string; answer: string }> = [];

  const collect = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const n of node) collect(n);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;

    const type = obj['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes('Question')) {
      const answer = obj.acceptedAnswer as Record<string, unknown> | undefined;
      const q = squash(String(obj.name ?? ''));
      const a = squash(String(answer?.text ?? '').replace(/<[^>]*>/g, ' '));
      if (q && a) out.push({ question: q, answer: a });
    }

    if (obj['@graph']) collect(obj['@graph']);
    if (obj.mainEntity) collect(obj.mainEntity);
    if (obj.itemListElement) collect(obj.itemListElement);
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      collect(JSON.parse($(el).contents().text()));
    } catch {
      // JSON-LD invalide : pas de FAQ exploitable, ce qui est la vérité.
    }
  });

  return out;
}
