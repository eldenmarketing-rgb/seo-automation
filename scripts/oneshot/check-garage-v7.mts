/** Jetable — contrôle d'une version condensée : longueur, sections, blocs, densité géo. */
import { readFileSync } from 'fs';
const f = process.argv[2];
const v = JSON.parse(readFileSync(f, 'utf8'));
const w = (s: string) => String(s ?? '').split(/\s+/).filter(Boolean).length;
const perp = (s: string) => (String(s ?? '').replace(/]([^)]*)/g, ']').match(/perpignan/gi) ?? []).length;
const geo = (s: string) => (String(s ?? '').match(/\b(narbonne|toulouse|montpellier|catalan|roussillon|pyr[ée]n[ée]es|66)\b/gi) ?? []).length;
const ko: string[] = [];
const chk = (cond: boolean, msg: string) => { if (!cond) ko.push(msg); };

chk(w(v.h1) <= 10, `h1 ${w(v.h1)} mots > 10`);
chk(perp(v.h1) === 1, `h1 perpignan ×${perp(v.h1)}`);
chk((v.metaTitle ?? '').length <= 60, `metaTitle ${v.metaTitle?.length} car. > 60`);
chk((v.metaDescription ?? '').length <= 155, `metaDescription ${v.metaDescription?.length} car. > 155`);
for (const k of ['heroSubtitle', 'educationalTitle', 'ctaTitle']) chk(perp(v[k]) === 0, `${k} contient Perpignan`);
chk(!/perpignan/i.test(String(v.intro).split(/(?<=[.!?])\s/)[0]), 'intro : Perpignan dans la 1re phrase');
chk(perp(v.intro) <= 1, `intro perpignan ×${perp(v.intro)}`);
chk(w(v.educationalContent) >= 70 && w(v.educationalContent) <= 130, `educationalContent ${w(v.educationalContent)} mots`);
chk(Array.isArray(v.process) && v.process.length === 3, `process ${v.process?.length} étapes`);
chk(Array.isArray(v.seoSections) && v.seoSections.length >= 5 && v.seoSections.length <= 6, `sections ${v.seoSections?.length}`);
chk(Array.isArray(v.faq) && v.faq.length === 6, `faq ${v.faq?.length}`);
let body = w(v.intro);
for (const s of v.seoSections ?? []) {
  body += w(s.content);
  chk(perp(s.title) === 0, `H2 avec Perpignan : ${s.title}`);
  chk(w(s.title) <= 12, `H2 ${w(s.title)} mots : ${s.title}`);
  chk(perp(s.content) <= 1, `section « ${s.title} » perpignan ×${perp(s.content)}`);
  chk(/^###\s/m.test(s.content), `section « ${s.title} » sans intertitre`);
  chk(/^[-*]\s/m.test(s.content), `section « ${s.title} » sans liste`);
}
chk(body >= 1250 && body <= 1550, `corps ${body} mots hors 1 300-1 500`);
const all = JSON.stringify(v);
chk(geo(all) === 0, `autre lieu ×${geo(all)}`);
chk(!/\d+\s?(€|euros?)/i.test(all), 'prix chiffré');
chk(!/\b\d+\s?points\b/i.test(all), 'nombre de points de contrôle');
chk(!/\bans d.exp/i.test(all), 'ancienneté');
chk(!/\b(sous|en)\s\d+\s?(h|min|heures?|minutes?|jours?)\b/i.test(all), 'délai chiffré');
for (const l of (v.internalLinks ?? []).map((x: any) => x.url)) chk(all.includes(`](${l})`), `lien manquant ${l}`);

const total = body + w(v.educationalContent) + (v.process ?? []).reduce((n: number, p: any) => n + w(p.title) + w(p.description), 0) + (v.faq ?? []).reduce((n: number, q: any) => n + w(q.question) + w(q.answer), 0);
console.log(`corps ${body} mots · ${v.seoSections?.length} sections (${(v.seoSections ?? []).map((s: any) => w(s.content)).join('/')}) · FAQ ${v.faq?.length} · texte total ${total} mots · perpignan ×${perp(all)} (corps ×${perp(v.intro) + (v.seoSections ?? []).reduce((n: number, s: any) => n + perp(s.content), 0)})`);
console.log(ko.length ? `KO :\n - ${ko.join('\n - ')}` : 'OK — toutes les règles passent');
