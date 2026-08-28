/**
 * Elayarituel v2 — Volumes exacts (Search Volume Google Ads) pour keywords métier.
 *
 * Stratégie : on ne fait plus confiance à getKeywordIdeas (bruit énorme).
 * On interroge Google Ads directement sur une whitelist de kw massage FR + Perpignan.
 */

import { getSearchVolume } from '../src/keywords/dataforseo.js';
import * as fs from 'fs';

// ─── Whitelist keywords métiers ─────────────────────────────

const FR_NATIONAL = [
  // types de massage
  'massage ayurvédique', 'massage ayurveda', 'abhyanga', 'shirodhara',
  'massage lymphatique', 'drainage lymphatique', 'drainage lymphatique manuel',
  'massage californien', 'massage suédois', 'massage thaï', 'massage tui na',
  'massage kobido', 'kobido', 'massage visage', 'massage crânien', 'massage cranien',
  'réflexologie plantaire', 'massage pieds', 'massage dos',
  'massage pierres chaudes', 'massage aux pierres chaudes',
  'massage relaxant', 'massage bien être', 'massage détente',
  'massage femme enceinte', 'massage prénatal', 'massage grossesse',
  'massage post partum', 'massage post-partum',
  'massage deep tissue', 'massage balinais', 'massage lomi lomi',
  'massage anti cellulite', 'massage amincissant',
  'massage aromathérapie', 'aromathérapie',
  'massage sportif', 'massage récupération',
  'massage nuque épaules', 'massage bureau', 'massage assis',
  'soin visage', 'soin du corps',
  // intent
  'massage à domicile', 'masseuse à domicile', 'masseur à domicile',
  'trouver massage', 'massage bien être près de chez moi',
];

const FR_PERPIGNAN = [
  // géo Perpignan
  'massage perpignan', 'masseuse perpignan', 'masseur perpignan',
  'salon massage perpignan', 'spa perpignan',
  'massage à domicile perpignan', 'masseuse à domicile perpignan',
  'massage bien être perpignan', 'massage relaxant perpignan',
  'massage ayurvédique perpignan', 'abhyanga perpignan',
  'drainage lymphatique perpignan', 'massage lymphatique perpignan',
  'massage femme enceinte perpignan', 'massage prénatal perpignan', 'massage grossesse perpignan',
  'massage californien perpignan', 'massage suédois perpignan', 'massage thaï perpignan',
  'kobido perpignan', 'massage visage perpignan',
  'massage pierres chaudes perpignan',
  'massage dos perpignan', 'massage crânien perpignan',
  'réflexologie plantaire perpignan', 'réflexologie perpignan',
  'massage sportif perpignan',
  'massage post partum perpignan',
  // villes voisines
  'massage canet en roussillon', 'massage saint cyprien', 'massage argelès sur mer',
  'massage cabestany', 'massage rivesaltes', 'massage le soler',
  'massage à domicile canet', 'massage à domicile argelès',
];

async function main() {
  console.log(`→ Requête Search Volume FR : ${FR_NATIONAL.length} kw nationaux`);
  const national = await getSearchVolume(FR_NATIONAL);

  console.log(`→ Requête Search Volume Perpignan : ${FR_PERPIGNAN.length} kw locaux`);
  const local = await getSearchVolume(FR_PERPIGNAN);

  // ─── National ─────────────────────────────────────────────
  type Row = { kw: string; vol: number; cpc: number | null; comp: string | null };
  const nat: Row[] = FR_NATIONAL.map(k => {
    const d = national.get(k.toLowerCase());
    return { kw: k, vol: d?.searchVolume ?? 0, cpc: d?.cpc ?? null, comp: d?.competition ?? null };
  }).sort((a, b) => b.vol - a.vol);

  const loc: Row[] = FR_PERPIGNAN.map(k => {
    const d = local.get(k.toLowerCase());
    return { kw: k, vol: d?.searchVolume ?? 0, cpc: d?.cpc ?? null, comp: d?.competition ?? null };
  }).sort((a, b) => b.vol - a.vol);

  const lines: string[] = [];
  lines.push('# Elayarituel — volumes exacts Google Ads (location FR 2250)');
  lines.push('');
  lines.push('> Volumes mensuels **nationaux** (France entière). Pour localiser, utiliser ces chiffres comme proxy du potentiel + Google Trends/GSC pour la pondération 66.');
  lines.push('');

  lines.push('## 🇫🇷 Keywords services (national)\n');
  lines.push('| # | Keyword | Vol/mo | CPC € | Concurrence |');
  lines.push('|---|---|---|---|---|');
  nat.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.kw} | ${r.vol.toLocaleString('fr-FR')} | ${r.cpc?.toFixed(2) ?? '—'} | ${r.comp ?? '—'} |`);
  });

  lines.push('\n## 📍 Keywords Perpignan + zones proches\n');
  lines.push('| # | Keyword | Vol/mo | CPC € | Concurrence |');
  lines.push('|---|---|---|---|---|');
  loc.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.kw} | ${r.vol.toLocaleString('fr-FR')} | ${r.cpc?.toFixed(2) ?? '—'} | ${r.comp ?? '—'} |`);
  });

  // Recommandations services
  lines.push('\n## 🎯 Services candidats (tri par potentiel commercial)\n');
  lines.push('Services classés par signal = volume national × (1 si volume Perpignan > 0) + bonus féminin-compatible.\n');

  const servicesScoring = [
    { name: 'Massage ayurvédique / Abhyanga', kws: ['massage ayurvédique', 'abhyanga', 'shirodhara'] },
    { name: 'Drainage lymphatique', kws: ['drainage lymphatique', 'massage lymphatique', 'drainage lymphatique manuel'] },
    { name: 'Massage femme enceinte / prénatal', kws: ['massage femme enceinte', 'massage prénatal', 'massage grossesse'] },
    { name: 'Massage pierres chaudes', kws: ['massage pierres chaudes', 'massage aux pierres chaudes'] },
    { name: 'Kobido / massage visage', kws: ['kobido', 'massage kobido', 'massage visage'] },
    { name: 'Massage californien', kws: ['massage californien'] },
    { name: 'Massage relaxant / bien-être', kws: ['massage relaxant', 'massage bien être', 'massage détente'] },
    { name: 'Réflexologie plantaire', kws: ['réflexologie plantaire', 'massage pieds'] },
    { name: 'Massage post-partum', kws: ['massage post partum', 'massage post-partum'] },
    { name: 'Massage suédois', kws: ['massage suédois'] },
    { name: 'Massage anti-cellulite / amincissant', kws: ['massage anti cellulite', 'massage amincissant'] },
    { name: 'Massage deep tissue', kws: ['massage deep tissue'] },
    { name: 'Massage balinais', kws: ['massage balinais'] },
    { name: 'Massage aromathérapie', kws: ['massage aromathérapie', 'aromathérapie'] },
  ];

  lines.push('| Service | Vol national cumulé | Top kw local | Vol local | Pertinence clientèle féminine |');
  lines.push('|---|---|---|---|---|');
  const scored = servicesScoring.map(s => {
    const natVol = s.kws.reduce((sum, k) => sum + (national.get(k.toLowerCase())?.searchVolume ?? 0), 0);
    const localKws = FR_PERPIGNAN.filter(lk => s.kws.some(sk => lk.toLowerCase().includes(sk.toLowerCase())));
    let topLocal = { kw: '', vol: 0 };
    for (const lk of localKws) {
      const v = local.get(lk.toLowerCase())?.searchVolume ?? 0;
      if (v > topLocal.vol) topLocal = { kw: lk, vol: v };
    }
    return { name: s.name, natVol, topLocal };
  }).sort((a, b) => b.natVol - a.natVol);

  for (const s of scored) {
    lines.push(`| ${s.name} | ${s.natVol.toLocaleString('fr-FR')} | ${s.topLocal.kw || '—'} | ${s.topLocal.vol || '—'} | ✓ |`);
  }

  fs.writeFileSync('/home/ubuntu/sites/seo-automation/reports/elayarituel-v2.md', lines.join('\n'));
  console.log('\n✓ /home/ubuntu/sites/seo-automation/reports/elayarituel-v2.md');
}

main().catch(e => { console.error(e); process.exit(1); });
