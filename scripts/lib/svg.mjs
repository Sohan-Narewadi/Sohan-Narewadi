import { palette, FONT } from './palette.mjs';

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const WIDE = /[A-Z0-9MW@%#&]/;
const NARROW = /[ijlt.,:;'|!()[\]\s-]/;

// Conservative width estimate in px (SVG has no text measurement).
export function textWidth(text, size) {
  let em = 0;
  for (const ch of String(text ?? '')) em += WIDE.test(ch) ? 0.68 : NARROW.test(ch) ? 0.32 : 0.56;
  return em * size;
}

export function wrapText(text, maxWidth, size) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    let chars = [...word];
    while (textWidth(chars.join(''), size) > maxWidth && chars.length > 1) {
      let cut = chars.length;
      while (cut > 1 && textWidth(chars.slice(0, cut).join(''), size) > maxWidth) cut -= 1;
      lines.push(chars.slice(0, cut).join(''));
      chars = chars.slice(cut);
    }
    line = chars.join('');
  }
  if (line) lines.push(line);
  return lines;
}

export function truncate(text, maxWidth, size) {
  const s = String(text ?? '');
  if (textWidth(s, size) <= maxWidth) return s;
  const chars = [...s];
  while (chars.length > 1 && textWidth(chars.join('') + '…', size) > maxWidth) chars.pop();
  return chars.join('').trimEnd() + '…';
}

export function clampLines(lines, maxLines, maxWidth, size) {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(lines.slice(maxLines - 1).join(' '), maxWidth, size);
  return kept;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function glowDefs() {
  return [
    '<linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="0.5" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6"/></linearGradient>',
    '<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a3a"/><stop offset="1" stop-color="#0b1020"/></linearGradient>',
    '<radialGradient id="glowV" cx="0.12" cy="0.05" r="0.85"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0.38"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="glowC" cx="0.95" cy="0.98" r="0.85"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.26"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>',
  ].join('');
}

export function svgOpen(w, h, title, { defs = '' } = {}) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `role="img" aria-label="${escapeXml(title)}" font-family="${FONT}">` +
    `<title>${escapeXml(title)}</title><defs>${glowDefs()}${defs}</defs>`
  );
}

export const svgClose = '</svg>';

export function cardBase(w, h, r = 20) {
  return [
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#base)"/>`,
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#glowV)"/>`,
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#glowC)"/>`,
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="url(#aurora)" stroke-opacity="0.55"/>`,
  ].join('');
}

export function text(x, y, str, { size = 14, weight = 400, fill = palette.text, anchor = 'start', spacing = 0, opacity = 1 } = {}) {
  return (
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"` +
    `${spacing ? ` letter-spacing="${spacing}"` : ''}${opacity !== 1 ? ` opacity="${opacity}"` : ''}>${escapeXml(str)}</text>`
  );
}
