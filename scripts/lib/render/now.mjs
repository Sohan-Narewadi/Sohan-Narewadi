import { palette, languageColor } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, truncate, formatDate } from '../svg.mjs';

const W = 830;
const ROW = 70;

export function renderNow(repos) {
  const rows = repos.length ? repos : [null];
  const H = 24 + rows.length * ROW - 12 + 24;
  const parts = [svgOpen(W, H, 'Currently working on'), cardBase(W, H)];
  rows.forEach((r, i) => {
    const y = 24 + i * ROW;
    parts.push(`<rect x="20" y="${y}" width="${W - 40}" height="58" rx="14" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1"/>`);
    if (!r) {
      parts.push(text(W / 2, y + 35, 'Nothing pushed yet — check back soon.', { size: 17, fill: palette.muted, anchor: 'middle' }));
      return;
    }
    const color = languageColor(r.language);
    parts.push(`<circle cx="42" cy="${y + 29}" r="6" fill="${color}"/>`);
    if (i === 0) {
      parts.push(
        `<circle cx="42" cy="${y + 29}" r="6" fill="${color}" opacity="0.5"><animate attributeName="r" values="6;13;6" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite"/></circle>`,
      );
    }
    parts.push(text(64, y + 26, truncate(r.name, 400, 19), { size: 19, weight: 700, fill: palette.heading }));
    if (r.description) parts.push(text(64, y + 47, truncate(r.description, 470, 14), { size: 14, fill: palette.muted }));
    else if (r.language) parts.push(text(64, y + 47, r.language, { size: 14, fill: palette.muted }));
    const date = formatDate(r.pushedAt);
    if (date) parts.push(text(W - 40, y + 36, `Pushed ${date}`, { size: 14, fill: palette.soft, anchor: 'end' }));
  });
  parts.push(svgClose);
  return parts.join('\n');
}
