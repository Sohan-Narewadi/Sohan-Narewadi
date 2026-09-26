import { palette } from '../palette.mjs';
import { svgOpen, svgClose, text, textWidth } from '../svg.mjs';

export function renderSectionTitle(title) {
  const W = 830;
  const H = 56;
  const tw = textWidth(title, 22);
  const left = Math.max(0, W / 2 - tw / 2 - 20);
  const right = W / 2 + tw / 2 + 20;
  return [
    svgOpen(W, H, title),
    `<rect x="0" y="27" width="${left}" height="2" rx="1" fill="url(#aurora)" fill-opacity="0.6"/>`,
    `<rect x="${right}" y="27" width="${Math.max(0, W - right)}" height="2" rx="1" fill="url(#aurora)" fill-opacity="0.6"/>`,
    text(W / 2, 35, title, { size: 22, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    svgClose,
  ].join('\n');
}

const W = 1000;
const wave = (y, amp, opacity, seconds, fill) =>
  `<path d="M0 ${y} q125 ${-amp} 250 0${' t250 0'.repeat(7)} V150 H0 Z" fill="${fill}" fill-opacity="${opacity}">` +
  `<animateTransform attributeName="transform" type="translate" from="0 0" to="-500 0" dur="${seconds}s" repeatCount="indefinite"/></path>`;

export function renderFooter() {
  const H = 140;
  return [
    svgOpen(W, H, 'Thanks for visiting'),
    `<clipPath id="fclip"><rect width="${W}" height="${H}" rx="24"/></clipPath>`,
    '<g clip-path="url(#fclip)">',
    `<rect width="${W}" height="${H}" fill="url(#base)"/>`,
    wave(60, 26, 0.35, 12, palette.violet),
    wave(80, 20, 0.35, 9, palette.cyan),
    wave(98, 16, 0.4, 7, palette.pink),
    text(W / 2, 74, 'Thanks for visiting', { size: 24, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    text(W / 2, 102, 'Built with a GitHub Action · refreshes every 6 hours', { size: 13, fill: '#c7d2fe', anchor: 'middle' }),
    '</g>',
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="url(#aurora)" stroke-opacity="0.6"/>`,
    svgClose,
  ].join('\n');
}
