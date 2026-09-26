import { palette } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text } from '../svg.mjs';

// Shown until the first workflow run replaces assets/snake.svg with the real snake.
export function renderSnakePlaceholder() {
  const W = 1000;
  const H = 200;
  return [
    svgOpen(W, H, 'Contribution snake'),
    cardBase(W, H, 24),
    text(W / 2, 96, 'Contribution snake', { size: 24, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    text(W / 2, 128, 'appears after the first GitHub Action run', { size: 14, fill: palette.muted, anchor: 'middle' }),
    svgClose,
  ].join('\n');
}
