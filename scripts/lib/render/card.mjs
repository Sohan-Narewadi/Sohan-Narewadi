import { palette, languageColor } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, textWidth, wrapText, truncate, clampLines, formatDate } from '../svg.mjs';

const W = 440;
const H = 250;
const MARGIN = 12; // transparent gap below the card so stacked cards do not touch
const PAD = 28;
const INNER = W - PAD * 2;

function smallPill(x, y, label, accent = false) {
  const w = Math.ceil(textWidth(label, 11.5)) + 20;
  const svg =
    `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${accent ? '#8b5cf6' : '#ffffff'}" fill-opacity="${accent ? 0.28 : 0.08}" stroke="${accent ? '#c4b5fd' : '#ffffff'}" stroke-opacity="${accent ? 0.7 : 0.18}"/>` +
    text(x + w / 2, y + 15, label, { size: 11.5, weight: accent ? 600 : 500, fill: accent ? '#ede9fe' : palette.muted, anchor: 'middle' });
  return { w, svg };
}

function star(cx, cy, r, fill) {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
}

export function renderProjectCard(p) {
  const parts = [svgOpen(W, H + MARGIN, `${p.title} — project`), cardBase(W, H)];
  parts.push(text(PAD, 52, truncate(p.title, INNER, 22), { size: 22, weight: 700, fill: '#ffffff' }));

  const badges = [p.badge, p.team ? 'Team project' : null].filter(Boolean);
  let x = PAD;
  badges.forEach((label, i) => {
    const b = smallPill(x, 66, label, i === 0 && Boolean(p.badge));
    parts.push(b.svg);
    x += b.w + 8;
  });

  const descTop = badges.length ? 116 : 90;
  const maxLines = Math.floor((176 - descTop) / 19) + 1;
  const lines = clampLines(wrapText(p.description ?? '', INNER, 13.5), maxLines, INNER, 13.5);
  lines.forEach((l, i) => parts.push(text(PAD, descTop + i * 19, l, { size: 13.5, fill: '#cfd6f6' })));

  let tx = PAD;
  for (const tag of p.tags ?? []) {
    const t = smallPill(tx, 188, tag);
    if (tx + t.w > W - PAD) break;
    parts.push(t.svg);
    tx += t.w + 6;
  }

  parts.push(`<line x1="${PAD}" y1="224" x2="${W - PAD}" y2="224" stroke="#ffffff" stroke-opacity="0.1"/>`);
  if (p.live) {
    const stars = String(p.stars ?? 0);
    parts.push(star(PAD + 6, 238, 6, '#fbbf24'), text(PAD + 18, 242, stars, { size: 12.5, weight: 600, fill: '#ffffff' }));
    const updated = formatDate(p.pushedAt);
    if (updated) parts.push(text(PAD + 18 + textWidth(stars, 12.5) + 14, 242, `Updated ${updated}`, { size: 12.5, fill: palette.muted }));
  } else {
    parts.push(text(PAD, 242, 'Team repository', { size: 12.5, fill: palette.muted }));
  }
  parts.push(
    text(W - PAD - 14, 242, 'View repo', { size: 12.5, weight: 600, fill: '#c4b5fd', anchor: 'end' }),
    `<path d="M${W - PAD - 6} 236 l5 5 l-5 5" fill="none" stroke="url(#aurora)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  parts.push(svgClose);
  return parts.join('\n');
}

export function renderChip({ name, language }) {
  const label = truncate(name, 260, 13);
  const w = Math.ceil(textWidth(label, 13)) + 46;
  const h = 34;
  return [
    svgOpen(w, h, name),
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="17" fill="url(#base)" stroke="url(#aurora)" stroke-opacity="0.5"/>`,
    `<circle cx="18" cy="17" r="5" fill="${languageColor(language)}"/>`,
    text(32, 22, label, { size: 13, weight: 500, fill: '#e8ebff' }),
    svgClose,
  ].join('\n');
}
