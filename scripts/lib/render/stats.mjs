import { palette, languageColor } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, truncate } from '../svg.mjs';

const W = 440;
const H = 250;
const PAD = 28;
const INNER = W - PAD * 2;

export function renderLanguages({ languages }) {
  const parts = [];
  const defs = `<clipPath id="barClip"><rect x="${PAD}" y="66" width="${INNER}" height="12" rx="6"/></clipPath>`;
  parts.push(svgOpen(W, H, 'Top languages', { defs }), cardBase(W, H));
  parts.push(text(PAD, 44, 'Top languages', { size: 20, weight: 700, fill: palette.heading }));
  if (!languages.length) {
    parts.push(text(W / 2, 140, 'No language data yet', { size: 15, fill: palette.muted, anchor: 'middle' }));
    parts.push(svgClose);
    return parts.join('\n');
  }
  let x = PAD;
  const segs = [];
  languages.forEach((l, i) => {
    const w = i === languages.length - 1 ? PAD + INNER - x : (l.pct / 100) * INNER;
    segs.push(`<rect x="${x.toFixed(2)}" y="66" width="${Math.max(0, w).toFixed(2)}" height="12" fill="${languageColor(l.name)}"/>`);
    x += w;
  });
  parts.push(`<g clip-path="url(#barClip)">${segs.join('')}</g>`);
  const colW = INNER / 2 - 8;
  languages.slice(0, 6).forEach((l, i) => {
    const cx = PAD + (i % 2) * (INNER / 2 + 8);
    const y = 122 + Math.floor(i / 2) * 38;
    parts.push(
      `<circle cx="${cx + 5}" cy="${y - 5}" r="5" fill="${languageColor(l.name)}"/>`,
      text(cx + 18, y, truncate(l.name, colW - 70, 13.5), { size: 13.5, weight: 600, fill: palette.heading }),
      text(cx + colW, y, `${l.pct}%`, { size: 13, fill: palette.muted, anchor: 'end' }),
    );
  });
  parts.push(svgClose);
  return parts.join('\n');
}

export function renderNumbers({ repoCount, stars, activeLast30, memberSince }) {
  const parts = [svgOpen(W, H, 'GitHub at a glance'), cardBase(W, H)];
  parts.push(text(PAD, 44, 'At a glance', { size: 20, weight: 700, fill: palette.heading }));
  const tiles = [
    [String(repoCount), 'Public repos'],
    [String(stars), 'Stars earned'],
    [String(activeLast30), 'Active in 30 days'],
    [memberSince ? String(memberSince) : '—', 'On GitHub since'],
  ];
  const tw = (INNER - 12) / 2;
  tiles.forEach(([value, label], i) => {
    const x = PAD + (i % 2) * (tw + 12);
    const y = 66 + Math.floor(i / 2) * 88;
    parts.push(
      `<rect x="${x}" y="${y}" width="${tw}" height="78" rx="14" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.12"/>`,
      text(x + 18, y + 42, value, { size: 30, weight: 700, fill: palette.heading }),
      text(x + 18, y + 64, label, { size: 12, fill: palette.muted }),
    );
  });
  parts.push(svgClose);
  return parts.join('\n');
}
