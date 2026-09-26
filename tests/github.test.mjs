import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  normalizeRepo, aggregateLanguages, computeStats, recentRepos, fetchGithub, loadData,
} from '../scripts/lib/github.mjs';
import { sampleRepos, sampleData, fakeFetch, ok, fail } from './helpers/sample.mjs';

test('normalizeRepo maps API fields and defaults nulls', () => {
  const r = normalizeRepo({ name: 'a', full_name: 'u/a', html_url: 'https://github.com/u/a', stargazers_count: 3, fork: false, pushed_at: '2026-01-01T00:00:00Z' });
  assert.deepEqual(r, { name: 'a', description: null, language: null, stars: 3, fork: false, archived: false, pushedAt: '2026-01-01T00:00:00Z', url: 'https://github.com/u/a' });
  const bare = normalizeRepo({ name: 'b', full_name: 'u/b' });
  assert.equal(bare.stars, 0);
  assert.equal(bare.pushedAt, null);
  assert.equal(bare.url, 'https://github.com/u/b');
});

test('aggregateLanguages sums, sorts, groups the tail as Other', () => {
  const out = aggregateLanguages([{ A: 100, B: 50 }, { A: 100, C: 25, D: 10, E: 5 }], { top: 2 });
  assert.deepEqual(out.map((l) => l.name), ['A', 'B', 'Other']);
  assert.equal(out[0].bytes, 200);
  assert.equal(out[2].bytes, 40);
  const total = out.reduce((s, l) => s + l.pct, 0);
  assert.ok(Math.abs(total - 100) < 0.5);
});

test('aggregateLanguages returns [] when there is nothing', () => {
  assert.deepEqual(aggregateLanguages([]), []);
  assert.deepEqual(aggregateLanguages([{}, {}]), []);
});

test('computeStats excludes forks and counts activity in the last 30 days', () => {
  const s = computeStats({ repos: sampleRepos, languages: sampleData.languages, profile: sampleData.profile, now: new Date('2026-09-26T10:00:00Z') });
  assert.equal(s.repoCount, 4); // 5 repos minus the fork
  assert.equal(s.stars, 2); // fork's 5 stars excluded
  assert.equal(s.activeLast30, 2); // MediBridge (21 Sep) + Sohan-Narewadi (26 Sep)
  assert.equal(s.memberSince, 2025);
  assert.ok(!s.languages.some((l) => l.name === 'Python')); // fork's language excluded
});

test('computeStats handles an empty account', () => {
  const s = computeStats({ repos: [], languages: {}, profile: { login: 'x', createdAt: null }, now: new Date() });
  assert.deepEqual(s, { repoCount: 0, stars: 0, activeLast30: 0, languages: [], memberSince: null });
});

test('recentRepos skips forks, sorts newest first, nulls last, does not mutate', () => {
  const input = [
    { ...sampleRepos[0], name: 'old', pushedAt: '2020-01-01T00:00:00Z' },
    { ...sampleRepos[0], name: 'never', pushedAt: null },
    { ...sampleRepos[0], name: 'new', pushedAt: '2026-01-01T00:00:00Z' },
    { ...sampleRepos[0], name: 'fork', fork: true, pushedAt: '2030-01-01T00:00:00Z' },
  ];
  const copy = structuredClone(input);
  assert.deepEqual(recentRepos(input, 3).map((r) => r.name), ['new', 'old', 'never']);
  assert.deepEqual(recentRepos(input, 1).map((r) => r.name), ['new']);
  assert.deepEqual(input, copy);
  assert.deepEqual(recentRepos([], 3), []);
});

test('fetchGithub gathers repos + languages and sends the token', async () => {
  const f = fakeFetch({
    '/users/octo/repos': ok([{ name: 'a', full_name: 'octo/a', stargazers_count: 1, fork: false }]),
    '/repos/octo/a/languages': ok({ Java: 10 }),
    '/users/octo': ok({ login: 'octo', created_at: '2024-01-01T00:00:00Z' }),
  });
  const data = await fetchGithub({ user: 'octo', token: 'tok', fetchImpl: f, warn: () => {} });
  assert.equal(data.profile.login, 'octo');
  assert.equal(data.repos.length, 1);
  assert.deepEqual(data.languages, { a: { Java: 10 } });
  assert.match(data.fetchedAt, /^\d{4}-\d\d-\d\dT/);
  assert.ok(f.calls.every((c) => c.opts.headers.Authorization === 'Bearer tok'));
});

test('fetchGithub skips a repo whose languages call is 404/409 (deleted or empty) and warns', async () => {
  const warnings = [];
  const f = fakeFetch({
    '/users/octo/repos': ok([{ name: 'a', full_name: 'octo/a' }, { name: 'b', full_name: 'octo/b' }]),
    '/repos/octo/a/languages': fail(409),
    '/repos/octo/b/languages': ok({ C: 5 }),
    '/users/octo': ok({ login: 'octo', created_at: null }),
  });
  const data = await fetchGithub({ user: 'octo', fetchImpl: f, warn: (m) => warnings.push(m) });
  assert.deepEqual(data.languages, { b: { C: 5 } });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /a/);
});

test('FIX-1: a rate limit, 5xx or network error on a languages call aborts instead of degrading the chart', async () => {
  const routes = (langRes) => ({
    '/users/octo/repos': ok([{ name: 'a', full_name: 'octo/a' }, { name: 'b', full_name: 'octo/b' }]),
    '/repos/octo/a/languages': langRes,
    '/repos/octo/b/languages': ok({ C: 5 }),
    '/users/octo': ok({ login: 'octo' }),
  });
  for (const status of [403, 429, 500, 502]) {
    await assert.rejects(() => fetchGithub({ user: 'octo', fetchImpl: fakeFetch(routes(fail(status))), warn: () => {} }), new RegExp(String(status)));
  }
  const boom = () => { throw new Error('socket hang up'); };
  await assert.rejects(() => fetchGithub({ user: 'octo', fetchImpl: fakeFetch(routes(boom)), warn: () => {} }), /socket hang up/);
});

test('fetchGithub throws on rate limit (403) of the repo list', async () => {
  const f = fakeFetch({ '/users/octo/repos': fail(403) });
  await assert.rejects(() => fetchGithub({ user: 'octo', fetchImpl: f, warn: () => {} }), /403/);
});

test('fetchGithub paginates until a short page', async () => {
  const page = (n) => Array.from({ length: n }, (_, i) => ({ name: `r${i}`, full_name: `octo/r${i}` }));
  let calls = 0;
  const f = fakeFetch({
    '/users/octo/repos': () => ok(++calls === 1 ? page(100) : page(3)),
    '/languages': ok({}),
    '/users/octo': ok({ login: 'octo' }),
  });
  const data = await fetchGithub({ user: 'octo', fetchImpl: f, warn: () => {} });
  assert.equal(data.repos.length, 103);
});

test('loadData offline reads the fixture and never touches the network', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fx-'));
  const path = join(dir, 'github.json');
  await writeFile(path, JSON.stringify(sampleData));
  const data = await loadData({ user: 'x', offline: true, fixturePath: path });
  assert.deepEqual(data, sampleData);
});
