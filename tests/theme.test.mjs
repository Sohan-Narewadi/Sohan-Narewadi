import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertWellFormed } from './helpers/xml.mjs';
import { palette } from '../scripts/lib/palette.mjs';
import { renderHero } from '../scripts/lib/render/hero.mjs';
import { renderAbout } from '../scripts/lib/render/about.mjs';
import { renderStack } from '../scripts/lib/render/stack.mjs';
import { renderButton } from '../scripts/lib/render/button.mjs';
import { renderProjectCard } from '../scripts/lib/render/card.mjs';
import { renderNow } from '../scripts/lib/render/now.mjs';
import { renderNumbers } from '../scripts/lib/render/stats.mjs';
import { renderSectionTitle, renderFooter } from '../scripts/lib/render/chrome.mjs';
import { renderSnakePlaceholder } from '../scripts/lib/render/snake.mjs';

const readJson = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));

// The old violet/cyan/pink aurora. Language dot colours are semantic and intentionally excluded
// (those renderers are not part of this check).
const LEGACY = ['#8b5cf6', '#c4b5fd', '#ede9fe', '#c7d2fe', '#cfd6f6', '#e8ebff', '#22d3ee', '#f472b6', '#121a3a', '#0b1020', '#a78bfa'];

const structural = () => ({
  hero: renderHero({ name: 'Sohan Narewadi', handle: 'Sohan-Narewadi' }),
  about: renderAbout({ bio: 'Short bio.', facts: [{ label: 'Focus', value: 'Full-stack' }] }),
  stack: renderStack([{ title: 'A', items: ['x'] }, { title: 'B', items: ['y'] }, { title: 'C', items: ['z'] }, { title: 'D', items: ['w'] }]),
  linkedin: renderButton({ label: 'LinkedIn', kind: 'linkedin' }),
  email: renderButton({ label: 'Email', kind: 'email' }),
  portfolio: renderButton({ label: 'Portfolio', kind: 'portfolio' }),
  title: renderSectionTitle('Featured Projects'),
  footer: renderFooter(),
  snake: renderSnakePlaceholder(),
  cardTeam: renderProjectCard({ title: 'T', description: 'd', tags: ['a'], badge: 'SIH 2026', team: true, live: false, stars: null, pushedAt: null }),
  cardLive: renderProjectCard({ title: 'T', description: 'd', tags: ['a'], badge: null, team: false, live: true, stars: 2, pushedAt: '2026-01-01T00:00:00Z' }),
  numbers: renderNumbers({ repoCount: 1, stars: 1, activeLast30: 1, memberSince: 2025, languages: [] }),
  nowEmpty: renderNow([]),
});

test('THEME: palette is the midnight-slate theme', () => {
  assert.equal(palette.bg0, '#0f1419');
  assert.equal(palette.bg1, '#161c26');
  assert.equal(palette.accent, '#5eead4');
  assert.equal(palette.sky, '#7dd3fc');
  assert.equal(palette.heading, '#f1f5f9');
  assert.equal(palette.body, '#b6c2d1');
  assert.equal(palette.muted, '#7d8a9c');
});

test('THEME: no legacy violet/cyan/pink colours remain in any structural renderer', () => {
  for (const [name, svg] of Object.entries(structural())) {
    assertWellFormed(svg);
    for (const hex of LEGACY) assert.ok(!svg.toLowerCase().includes(hex), `${name} still contains ${hex}`);
  }
});

test('THEME: cards paint the new charcoal-navy base', () => {
  const svg = structural().about;
  assert.ok(svg.includes('#0f1419') && svg.includes('#161c26'));
  assert.ok(svg.includes('#5eead4'), 'accent gradient missing');
});

test('COPY: About, facts and typing lines stay generic (no hackathon, Flutter or 3D)', async () => {
  const config = await readJson('../config.json');
  const copy = [config.bio, config.tagline, ...config.typingLines, ...config.facts.flatMap((f) => [f.label, f.value])].join(' | ');
  assert.ok(!/hackathon|\bSIH\b|flutter|dart|3d|three\.js/i.test(copy), `forbidden term in: ${copy}`);
  assert.match(copy, /full-stack/i);
  assert.match(copy, /\bML\b|machine learning/i);
});
