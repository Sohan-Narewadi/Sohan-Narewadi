import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderAbout } from '../../scripts/lib/render/about.mjs';
import { renderStack } from '../../scripts/lib/render/stack.mjs';

test('about renders bio and facts, well-formed, with escaped text', () => {
  const svg = renderAbout({ bio: 'I build R&D things <fast>. '.repeat(6), facts: [{ label: 'Focus', value: 'Full-stack · Data & ML' }] });
  assertWellFormed(svg);
  assert.match(svg, /About/);
  assert.match(svg, /FOCUS/);
  assert.match(svg, /R&amp;D/);
});

test('about height grows with a long bio and has a minimum', () => {
  const h = (s) => Number(s.match(/height="(\d+)"/)[1]);
  const short = renderAbout({ bio: 'Short.', facts: [] });
  const long = renderAbout({ bio: 'word '.repeat(300), facts: [] });
  assert.ok(h(short) >= 200);
  assert.ok(h(long) > h(short));
});

test('about tolerates missing bio and facts', () => {
  assertWellFormed(renderAbout({ bio: '', facts: [] }));
  assertWellFormed(renderAbout({}));
});

test('stack lays pills out inside the card width and grows in height', () => {
  const items = Array.from({ length: 30 }, (_, i) => `Technology${i}`);
  const svg = renderStack([{ title: 'Languages', items }, { title: 'Tools', items: ['Git'] }]);
  assertWellFormed(svg);
  const width = 830;
  for (const m of svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="30"/g)) {
    assert.ok(Number(m[1]) + Number(m[2]) <= width - 32 + 0.01, 'pill overflows');
  }
  assert.match(svg, /LANGUAGES/);
  assert.match(svg, /Technology29/);
});

test('stack handles an empty group list', () => {
  assertWellFormed(renderStack([]));
});
