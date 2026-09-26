import { svgOpen, svgClose, text, textWidth } from '../svg.mjs';

const S = '#e8ebff';
const ICONS = {
  linkedin: (x, y) =>
    `<rect x="${x}" y="${y}" width="24" height="24" rx="6" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    text(x + 12, y + 18, 'in', { size: 14, weight: 800, anchor: 'middle' }),
  email: (x, y) =>
    `<rect x="${x}" y="${y + 3}" width="24" height="18" rx="4" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    `<path d="M${x + 2} ${y + 7} L${x + 12} ${y + 14} L${x + 22} ${y + 7}" fill="none" stroke="${S}" stroke-width="1.8" stroke-linejoin="round"/>`,
  portfolio: (x, y) =>
    `<circle cx="${x + 12}" cy="${y + 12}" r="10" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    `<ellipse cx="${x + 12}" cy="${y + 12}" rx="4.5" ry="10" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    `<line x1="${x + 2}" y1="${y + 12}" x2="${x + 22}" y2="${y + 12}" stroke="${S}" stroke-width="1.8"/>`,
};

export function renderButton({ label, kind }) {
  const icon = ICONS[kind];
  if (!icon) throw new Error(`Unknown button kind: ${kind}`);
  const H = 52;
  const W = Math.ceil(textWidth(label, 15)) + 84;
  return [
    svgOpen(W, H, label),
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="26" fill="url(#base)" stroke="url(#aurora)" stroke-opacity="0.75"/>`,
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="26" fill="url(#glowV)"/>`,
    icon(22, 14),
    text(58, 32, label, { size: 15, weight: 600, fill: '#ffffff' }),
    svgClose,
  ].join('\n');
}
