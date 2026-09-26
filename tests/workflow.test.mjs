import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');

test('THEME: the contribution snake uses the teal palette, not the old aurora colours', async () => {
  const yml = await read('../.github/workflows/update.yml');
  assert.match(yml, /color_snake=#5eead4/i);
  assert.ok(!/#22d3ee|#c084fc|#f472b6|#7c5cf0|#4c3a8f/i.test(yml));
});

test('FIX-4: CI runs only the fixture-independent unit tests so editing projects.json cannot block a rebuild', async () => {
  const pkg = JSON.parse(await read('../package.json'));
  const yml = await read('../.github/workflows/update.yml');
  assert.ok(pkg.scripts['test:unit'], 'missing test:unit script');
  assert.ok(!/smoke/.test(pkg.scripts['test:unit']), 'test:unit must not include smoke tests');
  assert.match(pkg.scripts.test, /smoke/, 'npm test still runs the smoke tests locally');
  assert.match(yml, /run: npm run test:unit/);
  assert.ok(!/run: npm test/.test(yml), 'workflow must not run the full npm test');
});
