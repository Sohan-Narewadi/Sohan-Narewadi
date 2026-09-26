import { palette } from '../palette.mjs';
import { svgOpen, svgClose, text, textWidth } from '../svg.mjs';

const W = 1000;
const H = 300;

const wave = (y, amp, opacity, seconds) =>
  `<path d="M0 ${y} q125 ${-amp} 250 0${' t250 0'.repeat(7)} V${H + 10} H0 Z" fill="${palette.bg0}" fill-opacity="${opacity}">` +
  `<animateTransform attributeName="transform" type="translate" from="0 0" to="-500 0" dur="${seconds}s" repeatCount="indefinite"/></path>`;

const blob = (cx, cy, rx, ry, fill, opacity, values, seconds) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}">` +
  `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${seconds}s" repeatCount="indefinite"/></ellipse>`;

export function renderHero({ name, handle }) {
  const nameSize = Math.min(64, Math.floor(880 / textWidth(name, 1)));
  const defs =
    '<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="42"/></filter>' +
    `<clipPath id="clip"><rect width="${W}" height="${H}" rx="26"/></clipPath>`;
  return [
    svgOpen(W, H, `${name} — GitHub profile`, { defs }),
    '<g clip-path="url(#clip)">',
    `<rect width="${W}" height="${H}" fill="url(#base)"/>`,
    '<g filter="url(#blur)">',
    blob(220, 90, 260, 90, palette.violet, 0.6, '0 0;90 30;0 0', 14),
    blob(700, 60, 280, 80, palette.cyan, 0.4, '0 0;-90 40;0 0', 18),
    blob(520, 200, 300, 70, palette.pink, 0.35, '0 0;60 -30;0 0', 16),
    '</g>',
    wave(240, 26, 0.45, 11),
    wave(262, 18, 0.7, 7),
    text(W / 2, 150, name, { size: nameSize, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    `<rect x="${W / 2 - 60}" y="168" width="120" height="3" rx="1.5" fill="url(#aurora)"/>`,
    text(W / 2, 208, `@${handle}`, { size: 22, fill: '#c7d2fe', anchor: 'middle', spacing: 3 }),
    '</g>',
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="26" fill="none" stroke="url(#aurora)" stroke-opacity="0.7"/>`,
    svgClose,
  ].join('\n');
}
