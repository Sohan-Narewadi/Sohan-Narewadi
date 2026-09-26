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

test('section title, footer and snake placeholder are well-formed', () => {
  assertWellFormed(renderSectionTitle('Featured Projects & More'));
  assert.match(renderSectionTitle('Featured'), /Featured/);
  assertWellFormed(renderFooter());
  assertWellFormed(renderSnakePlaceholder());
});
