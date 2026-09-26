import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from './xml.mjs';

test('accepts well-formed svg with self-closing tags, comments and entities', () => {
  assertWellFormed('<svg a="1"><!-- c --><g><rect x="1"/><text>a &amp; b &#169;</text></g></svg>');
});
test('rejects an unclosed tag', () => {
  assert.throws(() => assertWellFormed('<svg><g></svg>'), /Mismatched|Unclosed/);
  assert.throws(() => assertWellFormed('<svg><g>'), /Unclosed/);
});
test('rejects a raw ampersand in text', () => {
  assert.throws(() => assertWellFormed('<svg><text>a & b</text></svg>'), /ampersand/i);
});
test('rejects a raw ampersand or < in an attribute', () => {
  assert.throws(() => assertWellFormed('<svg a="x & y"></svg>'), /ampersand/i);
  assert.throws(() => assertWellFormed('<svg a="x < y"></svg>'), /attribute/i);
});
test('rejects a stray angle bracket in text', () => {
  assert.throws(() => assertWellFormed('<svg><text>1 < 2</text></svg>'), /Stray/);
});
