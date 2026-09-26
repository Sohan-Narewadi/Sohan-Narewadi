import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeProjects, moreBuilds } from '../scripts/lib/projects.mjs';
import { sampleRepos, sampleProjects } from './helpers/sample.mjs';

test('live projects take stats and url from GitHub; static keep their own url', () => {
  const out = mergeProjects({ projects: sampleProjects, repos: sampleRepos, user: 'Sohan-Narewadi' });
  const [stat, live] = out;
  assert.equal(stat.live, false);
  assert.equal(stat.url, 'https://github.com/other/static-one');
  assert.equal(stat.stars, null);
  assert.equal(stat.badge, 'SIH 2026');
  assert.equal(stat.team, true);
  assert.equal(live.live, true);
  assert.equal(live.stars, 1);
  assert.equal(live.pushedAt, '2026-09-21T10:00:00Z');
  assert.equal(live.description, 'Healthcare platform.'); // projects.json wins over repo description
  assert.equal(live.badge, null);
  assert.equal(live.team, false);
});

test('falls back to the repo description and language when projects.json omits them', () => {
  const out = mergeProjects({ projects: [{ id: 'q', repo: 'QUIZ_BATTLE', title: 'Quiz' }, { id: 'm', repo: 'MediBridge', title: 'M' }], repos: sampleRepos, user: 'u' });
  assert.equal(out[0].description, ''); // repo has null description
  assert.deepEqual(out[0].tags, ['Java']);
  assert.equal(out[1].description, 'Smart Healthcare Access & Management Platform');
});

test('a missing repo warns and renders without live stats instead of throwing', () => {
  const warnings = [];
  const out = mergeProjects({ projects: [{ id: 'gone', repo: 'Renamed-Repo', title: 'Gone', description: 'x' }], repos: sampleRepos, user: 'Sohan-Narewadi', warn: (m) => warnings.push(m) });
  assert.equal(out[0].live, false);
  assert.equal(out[0].url, 'https://github.com/Sohan-Narewadi/Renamed-Repo');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Renamed-Repo/);
});

test('repo matching is case-insensitive', () => {
  const out = mergeProjects({ projects: [{ id: 'm', repo: 'medibridge', title: 'M' }], repos: sampleRepos, user: 'u' });
  assert.equal(out[0].live, true);
});

test('moreBuilds excludes featured repos, forks and the profile repo, newest first', () => {
  const out = moreBuilds({ projects: sampleProjects, repos: sampleRepos, user: 'Sohan-Narewadi' });
  assert.deepEqual(out.map((r) => r.name), ['Travel-and-Tourism-Webpage-1', 'QUIZ_BATTLE']);
});
