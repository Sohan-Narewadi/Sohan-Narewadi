import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from './helpers/xml.mjs';
import { languageColor } from '../scripts/lib/palette.mjs';
import {
  escapeXml, textWidth, wrapText, truncate, clampLines, formatDate,
  svgOpen, svgClose, cardBase, text,
} from '../scripts/lib/svg.mjs';

test('escapeXml escapes all five entities and tolerates null', () => {
  assert.equal(escapeXml(`a&b<c>"d"'e'`), 'a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;');
  assert.equal(escapeXml(null), '');
  assert.equal(escapeXml(undefined), '');
});

test('textWidth grows with length and size', () => {
  assert.ok(textWidth('hello world', 14) > textWidth('hello', 14));
  assert.ok(textWidth('hello', 20) > textWidth('hello', 10));
  assert.equal(textWidth('', 14), 0);
});

test('wrapText keeps every line within maxWidth and preserves all words', () => {
  const src = 'Full-stack healthcare platform for patients doctors and admins with appointments';
  const lines = wrapText(src, 200, 13.5);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(textWidth(l, 13.5) <= 200, `too wide: ${l}`);
  assert.equal(lines.join(' '), src);
});

test('wrapText hard-breaks a single overlong word without looping forever', () => {
  const word = 'x'.repeat(200);
  const lines = wrapText(word, 100, 14);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(textWidth(l, 14) <= 100);
  assert.equal(lines.join(''), word);
});

test('wrapText returns [] for empty/null input', () => {
  assert.deepEqual(wrapText('', 100, 14), []);
  assert.deepEqual(wrapText(null, 100, 14), []);
});

test('truncate adds an ellipsis only when needed and fits maxWidth', () => {
  assert.equal(truncate('short', 200, 14), 'short');
  const t = truncate('a very long project title that cannot possibly fit', 120, 14);
  assert.ok(t.endsWith('…'));
  assert.ok(textWidth(t, 14) <= 120);
});

test('clampLines caps the count and ellipsizes the last kept line', () => {
  const lines = ['one', 'two', 'three', 'four', 'five'];
  assert.deepEqual(clampLines(lines, 10, 300, 14), lines);
  const c = clampLines(lines, 3, 300, 14);
  assert.equal(c.length, 3);
  assert.equal(c[0], 'one');
  assert.ok(c[2].startsWith('three'));
  assert.ok(c[2].endsWith('…') || textWidth(c[2], 14) <= 300);
});

test('formatDate is UTC and empty for bad input', () => {
  assert.equal(formatDate('2026-09-21T23:59:00Z'), '21 Sep 2026');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('not a date'), '');
});

test('svgOpen + cardBase + text produce a well-formed svg with escaped content', () => {
  const svg = [
    svgOpen(200, 100, 'A & B <title>'),
    cardBase(200, 100),
    text(10, 20, 'x < y & "z"', { size: 12, anchor: 'middle', spacing: 2, opacity: 0.5 }),
    svgClose,
  ].join('\n');
  assertWellFormed(svg);
  assert.match(svg, /viewBox="0 0 200 100"/);
  assert.match(svg, /id="aurora"/);
  assert.match(svg, /A &amp; B &lt;title&gt;/);
});

test('languageColor falls back for unknown languages', () => {
  assert.match(languageColor('Java'), /^#[0-9a-f]{6}$/i);
  assert.match(languageColor('Brainfuck'), /^#[0-9a-f]{6}$/i);
  assert.match(languageColor(null), /^#[0-9a-f]{6}$/i);
});
