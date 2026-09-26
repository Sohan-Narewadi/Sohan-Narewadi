import test from 'node:test';
import assert from 'node:assert/strict';
import { typingUrl } from '../scripts/lib/typing.mjs';

test('typingUrl encodes lines, separates them with ; and has no raw spaces', () => {
  const url = typingUrl(['Software Dev · Data Explorer', 'Second & line']);
  assert.match(url, /^https:\/\/readme-typing-svg\.demolab\.com\?/);
  assert.ok(!url.includes(' '));
  const lines = new URL(url).searchParams.get('lines');
  assert.equal(lines, 'Software Dev · Data Explorer;Second & line');
  assert.match(url, /lines=Software\+Dev\+%C2%B7\+Data\+Explorer;Second\+%26\+line/);
});

test('typingUrl strips semicolons from lines so they cannot split the animation', () => {
  const lines = new URL(typingUrl(['a;b'])).searchParams.get('lines');
  assert.equal(lines, 'a,b');
});
