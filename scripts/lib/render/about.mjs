import { palette } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, wrapText } from '../svg.mjs';

const W = 830;
const BIO_X = 40;
const BIO_W = 460;
const FACT_X = 548;
const FACT_W = 244;

export function renderAbout({ bio = '', facts = [] } = {}) {
  const bioLines = wrapText(bio, BIO_W, 18);
  const bioH = bioLines.length * 28;
  const factBlocks = facts.map((f) => ({ label: f.label, lines: wrapText(f.value, FACT_W, 16) }));
  const factsH = factBlocks.reduce((s, f) => s + 20 + f.lines.length * 22 + 14, 0);
  const H = Math.max(200, 84 + Math.max(bioH, factsH) + 28);

  const body = [text(BIO_X, 50, 'About', { size: 22, weight: 700, fill: palette.heading })];
  bioLines.forEach((l, i) => body.push(text(BIO_X, 92 + i * 28, l, { size: 18, fill: palette.body })));

  body.push(`<rect x="${FACT_X - 24}" y="72" width="1" height="${H - 108}" fill="#ffffff" fill-opacity="0.12"/>`);
  let y = 90;
  for (const f of factBlocks) {
    body.push(text(FACT_X, y, f.label.toUpperCase(), { size: 12, weight: 700, fill: palette.muted, spacing: 2 }));
    y += 22;
    for (const l of f.lines) {
      body.push(text(FACT_X, y, l, { size: 16, fill: palette.heading }));
      y += 22;
    }
    y += 12;
  }
  return [svgOpen(W, H, 'About'), cardBase(W, H), ...body, svgClose].join('\n');
}
