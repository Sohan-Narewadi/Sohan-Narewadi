import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderProjectCard, renderChip } from '../../scripts/lib/render/card.mjs';

const live = { title: 'MediBridge', description: 'Full-stack healthcare platform for patients, doctors and admins with appointments, records and reminders.', tags: ['Node.js', 'Express', 'MySQL'], badge: null, team: false, live: true, stars: 3, pushedAt: '2026-09-21T10:00:00Z' };

test('live card shows title, stars, updated date and tags', () => {
  const svg = renderProjectCard(live);
  assertWellFormed(svg);
  assert.match(svg, /viewBox="0 0 440 250"/);
  assert.match(svg, />MediBridge</);
  assert.match(svg, />3</);
  assert.match(svg, /Updated 21 Sep 2026/);
  assert.match(svg, />MySQL</);
});

test('static team card shows badge and team marker, no stars line', () => {
  const svg = renderProjectCard({ ...live, live: false, stars: null, pushedAt: null, badge: 'SIH 2026', team: true });
  assertWellFormed(svg);
  assert.match(svg, />SIH 2026</);
  assert.match(svg, />Team project</);
  assert.match(svg, /Team repository/);
  assert.ok(!/Updated/.test(svg));
});

test('REVIEW-FOCUS 1: null description/language, 0 stars, unknown date never print null/undefined', () => {
  const svg = renderProjectCard({ title: 'Bare', description: null, tags: [], badge: null, team: false, live: true, stars: 0, pushedAt: null });
  assertWellFormed(svg);
  assert.ok(!/null|undefined|NaN/.test(svg.replace(/<title>.*?<\/title>/, '')));
  assert.match(svg, />0</);
  assert.ok(!/Updated/.test(svg));
});

test('REVIEW-FOCUS 2: special characters are escaped and long text stays inside the card', () => {
  const svg = renderProjectCard({ ...live, title: 'R&D <Lab> "Pro" ' + 'X'.repeat(80), description: 'AAA&BBB<CCC> ' + 'z'.repeat(300) + ' ' + 'word '.repeat(80), tags: Array.from({ length: 12 }, (_, i) => `Tag-number-${i}`) });
  assertWellFormed(svg);
  for (const m of svg.matchAll(/<text x="([\d.]+)" y="[\d.]+"[^>]*>([^<]*)<\/text>/g)) {
    assert.ok(Number(m[1]) < 440, 'text starts outside card');
  }
  // pills never extend beyond the right padding
  for (const m of svg.matchAll(/<rect x="([\d.]+)" y="\d+" width="([\d.]+)" height="22"/g)) {
    assert.ok(Number(m[1]) + Number(m[2]) <= 440 - 28 + 0.01);
  }
  // description is clamped: no more than 5 description lines
  const descLines = [...svg.matchAll(/font-size="13.5"/g)].length;
  assert.ok(descLines <= 5);
});

test('chip is well-formed, colored by language, and truncates long names', () => {
  const svg = renderChip({ name: 'Flutter---Mini-Project---CodeWar-With-A-Ridiculously-Long-Name', language: 'Dart' });
  assertWellFormed(svg);
  assert.match(svg, /height="34"/);
  assert.match(svg, /…/);
  assertWellFormed(renderChip({ name: 'x', language: null }));
});
