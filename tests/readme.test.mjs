import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate } from '../scripts/lib/readme.mjs';

test('fillTemplate replaces placeholders', () => {
  assert.equal(fillTemplate('a {{x}} b {{y}} {{x}}', { x: '1', y: '2' }), 'a 1 b 2 1');
});
test('fillTemplate throws on an unknown placeholder', () => {
  assert.throws(() => fillTemplate('a {{nope}}', { x: '1' }), /nope/);
});
test('fillTemplate does not re-expand placeholders inside values', () => {
  assert.equal(fillTemplate('{{a}}', { a: '{{b}}', b: 'BAD' }), '{{b}}');
});
test('fillTemplate allows empty-string values', () => {
  assert.equal(fillTemplate('[{{a}}]', { a: '' }), '[]');
});
