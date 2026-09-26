import { palette } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, textWidth } from '../svg.mjs';

const W = 830;
const PAD = 32;
const PILL_H = 34;
const HUES = [palette.accent, palette.sky, palette.slate];

export function renderStack(groups = []) {
  const body = [text(PAD, 46, 'Tech stack', { size: 22, weight: 700, fill: palette.heading })];
  let cursor = 66;
  groups.forEach((g, gi) => {
    const hue = HUES[gi % HUES.length];
    body.push(text(PAD, cursor + 12, g.title.toUpperCase(), { size: 12, weight: 700, fill: palette.muted, spacing: 2 }));
    let rowTop = cursor + 26;
    let x = PAD;
    for (const item of g.items) {
      const w = Math.ceil(textWidth(item, 16)) + 30;
      if (x + w > W - PAD) {
        x = PAD;
        rowTop += PILL_H + 8;
      }
      body.push(
        `<rect x="${x}" y="${rowTop}" width="${w}" height="${PILL_H}" rx="17" fill="${hue}" fill-opacity="0.14" stroke="${hue}" stroke-opacity="0.65"/>`,
        text(x + w / 2, rowTop + 22, item, { size: 16, weight: 500, anchor: 'middle' }),
      );
      x += w + 10;
    }
    cursor = rowTop + PILL_H + 20;
  });
  const H = cursor + 10;
  return [svgOpen(W, H, 'Tech stack'), cardBase(W, H), ...body, svgClose].join('\n');
}
