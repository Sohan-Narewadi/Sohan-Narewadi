import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertWellFormed } from './helpers/xml.mjs';
import { buildSite } from '../scripts/lib/site.mjs';
import { sampleConfig, sampleProjects, sampleData } from './helpers/sample.mjs';

const template = await readFile(new URL('../scripts/README.template.md', import.meta.url), 'utf8');
const build = (over = {}) => buildSite({ config: sampleConfig, projects: sampleProjects, template, data: sampleData, ...over });

test('buildSite returns README and expected assets, all SVGs well-formed', () => {
  const { files, warnings } = build();
  assert.deepEqual(warnings, []);
  for (const key of ['README.md', 'assets/hero.svg', 'assets/about.svg', 'assets/stack.svg', 'assets/now.svg', 'assets/languages.svg', 'assets/numbers.svg', 'assets/footer.svg', 'assets/projects/static-one.svg', 'assets/projects/medibridge.svg', 'assets/buttons/linkedin.svg', 'assets/buttons/email.svg', 'assets/buttons/portfolio.svg']) {
    assert.ok(key in files, `missing ${key}`);
  }
  for (const [path, content] of Object.entries(files)) if (path.endsWith('.svg')) assertWellFormed(content);
});

test('README links every asset it references and leaves no placeholders or null text', () => {
  const { files } = build();
  const readme = files['README.md'];
  assert.ok(!/\{\{|\}\}/.test(readme));
  assert.ok(!/undefined|\bnull\b|NaN/.test(readme));
  for (const m of readme.matchAll(/src="(assets\/[^"?]+)/g)) {
    if (m[1] === 'assets/snake.svg') continue; // produced by the snake action / placeholder step
    assert.ok(m[1] in files, `README references missing asset ${m[1]}`);
  }
  assert.match(readme, /mailto:a@b\.co/);
  assert.match(readme, /https:\/\/www\.linkedin\.com\/in\/x\//);
  assert.match(readme, /readme-typing-svg\.demolab\.com/);
});

test('asset URLs carry a content hash that changes when content changes', () => {
  const a = build().files['README.md'].match(/assets\/hero\.svg\?v=(\w+)/)[1];
  const b = build({ config: { ...sampleConfig, name: 'Someone Else' } }).files['README.md'].match(/assets\/hero\.svg\?v=(\w+)/)[1];
  assert.notEqual(a, b);
  assert.equal(build().files['README.md'].match(/assets\/hero\.svg\?v=(\w+)/)[1], a);
});

test('REVIEW-FOCUS 5: the profile repo never appears as recent work or in stats', () => {
  const { files } = build();
  assert.ok(!/Sohan-Narewadi<\/text>/.test(files['assets/now.svg']));
  assert.ok(!Object.keys(files).some((k) => k.startsWith('assets/chips/sohan-narewadi')));
  // JavaScript from the profile repo (500000 bytes) and Python from the fork must not dominate
  assert.ok(!/>Python</.test(files['assets/languages.svg']));
});

test('REVIEW-FOCUS 5: a project pointing at a missing repo warns but still builds', () => {
  const { files, warnings } = build({ projects: [...sampleProjects, { id: 'ghost', repo: 'Renamed', title: 'Ghost', description: 'x', tags: [] }] });
  assert.equal(warnings.length, 1);
  assert.ok('assets/projects/ghost.svg' in files);
});

test('duplicate project ids throw', () => {
  assert.throws(() => build({ projects: [sampleProjects[0], sampleProjects[0]] }), /duplicate/i);
});

test('REVIEW-FOCUS 4: an empty account builds a valid profile', () => {
  const { files } = build({ data: { profile: { login: 'Sohan-Narewadi', createdAt: null }, repos: [], languages: {}, fetchedAt: '2026-09-26T10:00:00Z' } });
  assert.match(files['assets/languages.svg'], /No language data yet/);
  assert.match(files['assets/now.svg'], /Nothing pushed yet/);
  assert.ok(!/\{\{/.test(files['README.md']));
  for (const [p, c] of Object.entries(files)) if (p.endsWith('.svg')) assertWellFormed(c);
});

test('REVIEW-FOCUS 4: an account with only forks behaves like an empty one', () => {
  const forkOnly = sampleData.repos.filter((r) => r.fork);
  const { files } = build({ data: { ...sampleData, repos: forkOnly } });
  assert.match(files['assets/now.svg'], /Nothing pushed yet/);
});

test('fewer than nowCount repos renders fewer rows', () => {
  const two = { ...sampleData, repos: sampleData.repos.filter((r) => ['MediBridge', 'QUIZ_BATTLE'].includes(r.name)) };
  const { files } = build({ data: two });
  assert.equal((files['assets/now.svg'].match(/Pushed /g) ?? []).length, 2);
});
