import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertWellFormed } from './helpers/xml.mjs';
import { buildSite } from '../scripts/lib/site.mjs';

const read = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const config = await read('../config.json');
const projects = await read('../projects.json');
const data = await read('../scripts/fixtures/github.json');
const template = await readFile(new URL('../scripts/README.template.md', import.meta.url), 'utf8');

test('real fixture builds with no warnings and every SVG is well-formed', () => {
  const { files, warnings } = buildSite({ config, projects, template, data });
  assert.deepEqual(warnings, []);
  for (const [p, c] of Object.entries(files)) if (p.endsWith('.svg')) assertWellFormed(c);
  assert.ok(!/\{\{|undefined|\bnull\b|NaN/.test(files['README.md']));
});

test('every featured live repo in projects.json exists in the fixture', () => {
  const names = new Set(data.repos.map((r) => r.name.toLowerCase()));
  for (const p of projects.filter((x) => x.repo)) assert.ok(names.has(p.repo.toLowerCase()), `${p.repo} missing from fixture`);
});

test('static SIH cards keep their team-project details', () => {
  const { files } = buildSite({ config, projects, template, data });
  for (const id of ['oceanembed', 'prism']) {
    assert.match(files[`assets/projects/${id}.svg`], />SIH 2026</);
    assert.match(files[`assets/projects/${id}.svg`], />Team project</);
  }
});
