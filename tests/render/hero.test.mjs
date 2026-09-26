import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderHero } from '../../scripts/lib/render/hero.mjs';

test('hero is well-formed, animated, and shows name and handle', () => {
  const svg = renderHero({ name: 'Sohan Narewadi', handle: 'Sohan-Narewadi' });
  assertWellFormed(svg);
  assert.match(svg, /viewBox="0 0 1000 300"/);
  assert.match(svg, /Sohan Narewadi/);
  assert.match(svg, /@Sohan-Narewadi/);
  assert.match(svg, /<animateTransform/);
});

test('hero shrinks the font for a very long name and escapes special characters', () => {
  const svg = renderHero({ name: 'A Very Long Display Name & Co <Ltd> That Keeps Going', handle: 'x' });
  assertWellFormed(svg);
  const size = Number(svg.match(/font-size="(\d+)"[^>]*>A Very Long/)[1]);
  assert.ok(size < 64);
});

test('hero survives an empty name', () => {
  assertWellFormed(renderHero({ name: '', handle: 'x' }));
});
