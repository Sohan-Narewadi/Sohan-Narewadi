import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderNow } from '../../scripts/lib/render/now.mjs';
import { renderLanguages, renderNumbers } from '../../scripts/lib/render/stats.mjs';

const h = (s) => Number(s.match(/height="(\d+)"/)[1]);

test('now list renders one row per repo and grows in height', () => {
  const repos = [
    { name: 'MediBridge', description: 'Healthcare platform', language: 'HTML', pushedAt: '2026-09-21T10:00:00Z' },
    { name: 'QUIZ_BATTLE', description: null, language: null, pushedAt: null },
    { name: 'C&C <x>', description: 'a & b', language: 'C', pushedAt: '2025-01-02T00:00:00Z' },
  ];
  const three = renderNow(repos);
  assertWellFormed(three);
  assert.match(three, /MediBridge/);
  assert.match(three, /Pushed 21 Sep 2026/);
  assert.match(three, /C&amp;C &lt;x&gt;/);
  assert.ok(!/null|undefined/.test(three.replace(/<title>.*?<\/title>/, '')));
  assert.ok(h(three) > h(renderNow(repos.slice(0, 1))));
});

test('REVIEW-FOCUS 4: now list with zero repos shows a friendly placeholder row', () => {
  const svg = renderNow([]);
  assertWellFormed(svg);
  assert.match(svg, /Nothing pushed yet/);
});

test('languages card draws a bar and legend', () => {
  const svg = renderLanguages({ languages: [{ name: 'HTML', bytes: 60, pct: 60 }, { name: 'Java', bytes: 30, pct: 30 }, { name: 'Other', bytes: 10, pct: 10 }] });
  assertWellFormed(svg);
  assert.match(svg, /viewBox="0 0 440 250"/);
  assert.match(svg, />HTML</);
  assert.match(svg, />60%</);
  assert.match(svg, />Other</);
});

test('REVIEW-FOCUS 4: languages card with no data says so', () => {
  const svg = renderLanguages({ languages: [] });
  assertWellFormed(svg);
  assert.match(svg, /No language data yet/);
});

test('numbers card shows four stats and a dash when the join year is unknown', () => {
  const svg = renderNumbers({ repoCount: 11, stars: 4, activeLast30: 3, memberSince: 2025, languages: [] });
  assertWellFormed(svg);
  for (const v of ['>11<', '>4<', '>3<', '>2025<']) assert.ok(svg.includes(v), `missing ${v}`);
  const empty = renderNumbers({ repoCount: 0, stars: 0, activeLast30: 0, memberSince: null, languages: [] });
  assertWellFormed(empty);
  assert.match(empty, />—</);
  assert.ok(!/null|undefined|NaN/.test(empty.replace(/<title>.*?<\/title>/, '')));
});
