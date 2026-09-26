import { palette } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, textWidth } from '../svg.mjs';

const W = 830;
const PAD = 32;
const PILL_H = 30;
const HUES = [palette.violet, palette.cyan, palette.pink];

export function renderStack(groups = []) {
  const body = [text(PAD, 46, 'Tech stack', { size: 22, weight: 700, fill: '#ffffff' })];
  let cursor = 66;
  groups.forEach((g, gi) => {
    const hue = HUES[gi % HUES.length];
    body.push(text(PAD, cursor + 12, g.title.toUpperCase(), { size: 11, weight: 700, fill: palette.muted, spacing: 2 }));
    let rowTop = cursor + 24;
    let x = PAD;
    for (const item of g.items) {
      const w = Math.ceil(textWidth(item, 14)) + 28;
      if (x + w > W - PAD) {
        x = PAD;
        rowTop += PILL_H + 8;
      }
      body.push(
        `<rect x="${x}" y="${rowTop}" width="${w}" height="${PILL_H}" rx="15" fill="${hue}" fill-opacity="0.14" stroke="${hue}" stroke-opacity="0.65"/>`,
        text(x + w / 2, rowTop + 20, item, { size: 14, weight: 500, anchor: 'middle' }),
      );
      x += w + 10;
    }
    cursor = rowTop + PILL_H + 18;
  });
  const H = cursor + 10;
  return [svgOpen(W, H, 'Tech stack'), cardBase(W, H), ...body, svgClose].join('\n');
}
