import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderButton } from '../../scripts/lib/render/button.mjs';
import { renderSectionTitle, renderFooter } from '../../scripts/lib/render/chrome.mjs';
import { renderSnakePlaceholder } from '../../scripts/lib/render/snake.mjs';

test('each button kind renders well-formed with its label', () => {
  for (const [kind, label] of [['linkedin', 'LinkedIn'], ['email', 'Email'], ['portfolio', 'Portfolio']]) {
    const svg = renderButton({ label, kind });
    assertWellFormed(svg);
    assert.match(svg, new RegExp(label));
  }
});

test('unknown button kind throws', () => {
  assert.throws(() => renderButton({ label: 'X', kind: 'myspace' }), /kind/);
});

test('section title paints its own dark backing so the white text is readable on light themes', () => {
  const svg = renderSectionTitle('Featured Projects');
  assertWellFormed(svg);
  const backing = svg.indexOf('<rect class="title-pill"');
  const label = svg.indexOf('>Featured Projects</text>');
  assert.ok(backing !== -1, 'missing title-pill backing');
  assert.ok(backing < label, 'backing must be drawn before the text');
  assert.match(svg.slice(backing, svg.indexOf('/>', backing)), /fill="url\(#base\)"/);
});

test('section title backing stays inside the canvas for long titles', () => {
  const svg = renderSectionTitle('A very very long section title that is wide');
  const m = svg.match(/<rect class="title-pill" x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/);
  assert.ok(Number(m[1]) >= 0 && Number(m[1]) + Number(m[2]) <= 830);
});

test('section title, footer and snake placeholder are well-formed', () => {
  assertWellFormed(renderSectionTitle('Featured Projects & More'));
  assert.match(renderSectionTitle('Featured'), /Featured/);
  assertWellFormed(renderFooter());
  assertWellFormed(renderSnakePlaceholder());
});
