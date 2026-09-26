# GitHub Profile README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-updating "aurora glass" GitHub profile README for `Sohan-Narewadi`, generated from live GitHub data by a scheduled GitHub Action.

**Architecture:** A dependency-free Node ESM build script fetches the user's public repos and language stats (or reads a saved fixture offline), renders every visual as a standalone SVG (pure string functions), and assembles `README.md` from a template. A GitHub Actions workflow reruns the build every 6 hours and commits changes. Rendering is split into small pure modules so each can be unit tested with `node:test`.

**Tech Stack:** Node.js >= 22 (ESM, built-in `fetch`, `node:test`), hand-written SVG (SMIL animation), GitHub Actions, `Platane/snk` (contribution snake), `readme-typing-svg` (typing line).

**Spec:** `docs/superpowers/specs/2026-09-26-github-profile-design.md`

## Global Constraints

- Owner: Sohan Narewadi, GitHub `Sohan-Narewadi`. Display name "Sohan Narewadi".
- Typing tagline: "Software Dev · Data Explorer · Builder".
- LinkedIn: `https://www.linkedin.com/in/sohan-narewadi-2b6b51367/`; email: `sohan.n@somaiya.edu`; portfolio: dummy `https://sohan-narewadi.dev` (single value in `config.json`).
- Direction: aurora glass, midnight background, violet/cyan/pink gradients, glass cards, animated wave hero.
- Only two third-party runtime pieces: `readme-typing-svg` (typing line) and `Platane/snk` (contribution snake). Everything else is self-generated SVG.
- Zero npm dependencies. Node >= 22. Tests run with `npm test` (`node --test`).
- SVGs must be standalone: no external resources, no scripts, no `foreignObject`, no emoji, system font stack only. They must render on both light and dark GitHub themes (each card paints its own dark background).
- Static SIH cards (OceanEmbed, PRISM) carry a "SIH 2026" badge and a "Team project" marker, and only claim what their READMEs state. No accuracy numbers, awards or outcomes.
- API failure or rate limit: keep previously committed SVGs; build exits non-zero and writes nothing.
- Repo with no description: use the description from `projects.json`.
- Nothing is pushed, and no GitHub repo is created, without explicit user approval. `gh` is not installed. All work is previewed locally.
- Commit messages end with the trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Working directory for every command: `C:\Users\sohan\Sohan-Narewadi` (use `cd /c/Users/sohan/Sohan-Narewadi` in Bash).

## Review Focus

1. A repo with `null` description/language, 0 stars and unknown `pushedAt` must render a card with no literal "null"/"undefined" text (Task 5).
2. Titles/descriptions containing `&`, `<`, `>`, quotes, or a single very long unbroken word must be escaped and wrapped or truncated, keeping the SVG well-formed and inside its box (Tasks 2, 5).
3. GitHub API failure or rate limit (HTTP 403/5xx) must make the build exit non-zero and write nothing; a failure on one repo's `/languages` call must skip only that repo (Tasks 3, 7).
4. An empty account (0 repos), an account with only forks, or fewer than 3 repos must render stats of 0, "No language data yet", and fewer "Currently working on" rows without crashing (Tasks 5, 6).
5. `projects.json` referencing a repo that no longer exists or was renamed must warn and render the card without live stats instead of crashing; the profile repo itself must never appear as "currently working on" or in stats (Tasks 3, 6).

---

## File Structure

```
package.json
.gitignore
config.json                     # identity, links, stack groups, typing lines
projects.json                   # featured project cards (live + static)
scripts/
  build.mjs                     # CLI: load data -> buildSite -> write files
  preview.mjs                   # wraps README.md in GitHub-width HTML for screenshots
  check-links.mjs               # manual link checker
  README.template.md            # skeleton with {{placeholders}}
  fixtures/github.json          # saved API data for --offline
  lib/
    palette.mjs                 # colors, fonts, language colors
    svg.mjs                     # escapeXml, textWidth, wrapText, truncate, svgOpen, cardBase, text
    github.mjs                  # normalizeRepo, aggregateLanguages, computeStats, recentRepos, fetchGithub, loadData
    projects.mjs                # mergeProjects, moreBuilds
    typing.mjs                  # typingUrl
    readme.mjs                  # fillTemplate
    site.mjs                    # buildSite: everything -> {files, warnings}
    render/
      hero.mjs  about.mjs  stack.mjs  button.mjs  card.mjs
      now.mjs   stats.mjs  chrome.mjs snake.mjs
tests/
  helpers/xml.mjs  helpers/xml.test.mjs  helpers/sample.mjs
  svg.test.mjs  github.test.mjs  projects.test.mjs  typing.test.mjs
  readme.test.mjs  site.test.mjs  fixture.test.mjs
  render/*.test.mjs
.github/workflows/update.yml
```

---

### Task 1: Scaffold, data files, XML test helper

**Files:**
- Create: `package.json`, `.gitignore`, `config.json`, `projects.json`
- Create: `tests/helpers/xml.mjs`
- Test: `tests/helpers/xml.test.mjs`

**Interfaces:**
- Produces: `assertWellFormed(svgString)` in `tests/helpers/xml.mjs` (throws `Error` on malformed XML: unclosed/mismatched tags, stray `<`/`>` in text, raw `&` not part of an entity). Every renderer test uses it.
- Produces: `config.json` shape `{ user, name, tagline, typingLines[], bio, facts[{label,value}], links{linkedin,email,portfolio}, stack[{title,items[]}], nowCount }` and `projects.json` shape `[{ id, title, description, tags[], repo?, url?, badge?, team? }]`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sohan-narewadi-profile",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "node scripts/build.mjs",
    "build:offline": "node scripts/build.mjs --offline",
    "fixture": "node scripts/build.mjs --save-fixture",
    "preview": "node scripts/preview.mjs",
    "check-links": "node scripts/check-links.mjs",
    "test": "node --test \"tests/**/*.test.mjs\""
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.env
dist/
preview-*.html
*.log
```

- [ ] **Step 3: Create `config.json`**

```json
{
  "user": "Sohan-Narewadi",
  "name": "Sohan Narewadi",
  "tagline": "Software Dev · Data Explorer · Builder",
  "typingLines": [
    "Software Dev · Data Explorer · Builder",
    "Full-stack apps · ML pipelines · 3D visualisation"
  ],
  "bio": "Student software developer who likes building things end to end: full-stack web apps, a Flutter coding game, data analysis and ML pipelines, and 3D visualisations. This year I'm working on two Smart India Hackathon 2026 projects, OceanEmbed and PRISM.",
  "facts": [
    { "label": "Focus", "value": "Full-stack · Data & ML · 3D" },
    { "label": "Languages", "value": "Java · C · JavaScript · Python · Dart" },
    { "label": "Hackathon", "value": "Smart India Hackathon 2026" }
  ],
  "links": {
    "linkedin": "https://www.linkedin.com/in/sohan-narewadi-2b6b51367/",
    "email": "sohan.n@somaiya.edu",
    "portfolio": "https://sohan-narewadi.dev"
  },
  "stack": [
    { "title": "Languages", "items": ["Java", "C", "JavaScript", "Python", "Dart", "HTML", "CSS"] },
    { "title": "Web & Mobile", "items": ["Node.js", "Express", "React", "Next.js", "FastAPI", "Flutter", "MySQL"] },
    { "title": "Data & ML", "items": ["PyTorch", "YOLOv8", "Random Forest", "Apriori", "Streamlit", "Jupyter"] },
    { "title": "3D & Embedded", "items": ["Three.js", "React Three Fiber", "MapLibre GL", "Arduino"] }
  ],
  "nowCount": 3
}
```

- [ ] **Step 4: Create `projects.json`**

```json
[
  {
    "id": "oceanembed",
    "title": "OceanEmbed",
    "url": "https://github.com/arsiwalamoiz24/OceanEmbed-SIH-2026",
    "badge": "SIH 2026",
    "team": true,
    "description": "Reconstructs subsurface ocean temperature (0-1000 m) over the Bay of Bengal from satellite surface data, using a deep-learning embedding pipeline validated against Argo.",
    "tags": ["Python", "PyTorch", "FastAPI", "React", "MapLibre"]
  },
  {
    "id": "prism",
    "title": "PRISM",
    "url": "https://github.com/arsiwalamoiz24/SIH-26-internal-round",
    "badge": "SIH 2026",
    "team": true,
    "description": "Lunar south-pole water-ice screening, hazard mapping and rover traverse planning on Chandrayaan-2 radar and NASA terrain data, with a 3D dashboard.",
    "tags": ["Python", "YOLOv8", "Next.js", "Three.js"]
  },
  {
    "id": "medibridge",
    "repo": "MediBridge",
    "title": "MediBridge",
    "description": "Full-stack healthcare platform for patients, doctors and admins: appointments, medical records, prescriptions and medication reminders.",
    "tags": ["Node.js", "Express", "MySQL", "JavaScript"]
  },
  {
    "id": "codewar",
    "repo": "Flutter---Mini-Project---CodeWar",
    "title": "CodeWar",
    "description": "Game-style coding practice app in Flutter with a world map, enemy battles, XP and ranks built around coding challenges.",
    "tags": ["Flutter", "Dart", "Provider"]
  },
  {
    "id": "smart-irrigation",
    "repo": "smart_irrigation_3d",
    "title": "Smart Irrigation 3D",
    "description": "Interactive Three.js visualisation of an Arduino smart-irrigation circuit: soil moisture, a threshold dial, pump and sprinklers.",
    "tags": ["Three.js", "JavaScript", "Arduino"]
  },
  {
    "id": "quiz-battle",
    "repo": "QUIZ_BATTLE",
    "title": "Quiz Battle",
    "description": "Two-player Java Swing quiz game with a neon UI, player setup screens and a text-file question bank.",
    "tags": ["Java", "Swing"]
  },
  {
    "id": "supermarket",
    "repo": "Supermarket-Customer-Purchase-Analysis",
    "title": "Supermarket Analysis",
    "description": "Purchase-behaviour analysis with market-basket rules, RFM customer segments and a Random Forest model, shown in a Streamlit dashboard.",
    "tags": ["Python", "Apriori", "Random Forest", "Streamlit"]
  },
  {
    "id": "browser-manager",
    "repo": "DS_IA_Browser_Manager",
    "title": "Browser Manager",
    "description": "A C simulation of a browser built on data structures: linked-list tabs, stack-based history, a download queue and BST bookmarks.",
    "tags": ["C", "Linked List", "Stack", "BST"]
  }
]
```

- [ ] **Step 5: Write the failing test for the XML helper** — `tests/helpers/xml.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from './xml.mjs';

test('accepts well-formed svg with self-closing tags, comments and entities', () => {
  assertWellFormed('<svg a="1"><!-- c --><g><rect x="1"/><text>a &amp; b &#169;</text></g></svg>');
});
test('rejects an unclosed tag', () => {
  assert.throws(() => assertWellFormed('<svg><g></svg>'), /Mismatched|Unclosed/);
  assert.throws(() => assertWellFormed('<svg><g>'), /Unclosed/);
});
test('rejects a raw ampersand in text', () => {
  assert.throws(() => assertWellFormed('<svg><text>a & b</text></svg>'), /ampersand/i);
});
test('rejects a raw ampersand or < in an attribute', () => {
  assert.throws(() => assertWellFormed('<svg a="x & y"></svg>'), /ampersand/i);
  assert.throws(() => assertWellFormed('<svg a="x < y"></svg>'), /attribute/i);
});
test('rejects a stray angle bracket in text', () => {
  assert.throws(() => assertWellFormed('<svg><text>1 < 2</text></svg>'), /Stray/);
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module './xml.mjs'`.

- [ ] **Step 7: Implement `tests/helpers/xml.mjs`**

```js
// Minimal well-formedness checker for generated SVG (no XML parser is built into Node).
const TAG = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
const BAD_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

function checkText(s) {
  if (/[<>]/.test(s)) throw new Error(`Stray angle bracket near: ${s.slice(0, 40)}`);
  if (BAD_AMP.test(s)) throw new Error(`Raw ampersand in text near: ${s.slice(0, 40)}`);
}

export function assertWellFormed(svg) {
  const stack = [];
  let last = 0;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(svg))) {
    checkText(svg.slice(last, m.index));
    last = TAG.lastIndex;
    if (m[0].startsWith('<!--') || m[0].startsWith('<?')) continue;
    const [, closing, name, attrs, selfClose] = m;
    if (BAD_AMP.test(attrs)) throw new Error(`Raw ampersand in attribute of <${name}>`);
    if (attrs.includes('<')) throw new Error(`Raw < in attribute of <${name}>`);
    if (closing) {
      const top = stack.pop();
      if (top !== name) throw new Error(`Mismatched </${name}>, expected </${top}>`);
    } else if (!selfClose) {
      stack.push(name);
    }
  }
  checkText(svg.slice(last));
  if (stack.length) throw new Error(`Unclosed: ${stack.join(', ')}`);
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npm test`
Expected: PASS (5 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold profile project, data files and XML test helper" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Palette and SVG primitives

**Files:**
- Create: `scripts/lib/palette.mjs`, `scripts/lib/svg.mjs`
- Test: `tests/svg.test.mjs`

**Interfaces:**
- Produces from `palette.mjs`: `palette` (`bg0 bg1 violet cyan pink text muted`), `FONT` (string), `languageColor(name) -> '#rrggbb'`.
- Produces from `svg.mjs`:
  - `escapeXml(v) -> string`
  - `textWidth(text, size) -> number` (estimated px width, conservative)
  - `wrapText(text, maxWidth, size) -> string[]`
  - `truncate(text, maxWidth, size) -> string`
  - `clampLines(lines, maxLines, maxWidth, size) -> string[]`
  - `formatDate(iso) -> 'D Mon YYYY' | ''` (UTC, `''` for invalid/null)
  - `svgOpen(w, h, title, { defs = '' } = {}) -> string` (opens `<svg>` with `<title>` and `<defs>` containing shared gradients `aurora`, `base`, `glowV`, `glowC` plus extra defs)
  - `svgClose` (string `'</svg>'`)
  - `cardBase(w, h, r = 20) -> string` (dark rounded background, glows, aurora border)
  - `text(x, y, str, { size, weight, fill, anchor, spacing, opacity }) -> string` (escapes `str`)

- [ ] **Step 1: Write the failing tests** — `tests/svg.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from './helpers/xml.mjs';
import { languageColor } from '../scripts/lib/palette.mjs';
import {
  escapeXml, textWidth, wrapText, truncate, clampLines, formatDate,
  svgOpen, svgClose, cardBase, text,
} from '../scripts/lib/svg.mjs';

test('escapeXml escapes all five entities and tolerates null', () => {
  assert.equal(escapeXml(`a&b<c>"d"'e'`), 'a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;');
  assert.equal(escapeXml(null), '');
  assert.equal(escapeXml(undefined), '');
});

test('textWidth grows with length and size', () => {
  assert.ok(textWidth('hello world', 14) > textWidth('hello', 14));
  assert.ok(textWidth('hello', 20) > textWidth('hello', 10));
  assert.equal(textWidth('', 14), 0);
});

test('wrapText keeps every line within maxWidth and preserves all words', () => {
  const src = 'Full-stack healthcare platform for patients doctors and admins with appointments';
  const lines = wrapText(src, 200, 13.5);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(textWidth(l, 13.5) <= 200, `too wide: ${l}`);
  assert.equal(lines.join(' '), src);
});

test('wrapText hard-breaks a single overlong word without looping forever', () => {
  const word = 'x'.repeat(200);
  const lines = wrapText(word, 100, 14);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(textWidth(l, 14) <= 100);
  assert.equal(lines.join(''), word);
});

test('wrapText returns [] for empty/null input', () => {
  assert.deepEqual(wrapText('', 100, 14), []);
  assert.deepEqual(wrapText(null, 100, 14), []);
});

test('truncate adds an ellipsis only when needed and fits maxWidth', () => {
  assert.equal(truncate('short', 200, 14), 'short');
  const t = truncate('a very long project title that cannot possibly fit', 120, 14);
  assert.ok(t.endsWith('…'));
  assert.ok(textWidth(t, 14) <= 120);
});

test('clampLines caps the count and ellipsizes the last kept line', () => {
  const lines = ['one', 'two', 'three', 'four', 'five'];
  assert.deepEqual(clampLines(lines, 10, 300, 14), lines);
  const c = clampLines(lines, 3, 300, 14);
  assert.equal(c.length, 3);
  assert.equal(c[0], 'one');
  assert.ok(c[2].startsWith('three'));
  assert.ok(c[2].endsWith('…') || textWidth(c[2], 14) <= 300);
});

test('formatDate is UTC and empty for bad input', () => {
  assert.equal(formatDate('2026-09-21T23:59:00Z'), '21 Sep 2026');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('not a date'), '');
});

test('svgOpen + cardBase + text produce a well-formed svg with escaped content', () => {
  const svg = [
    svgOpen(200, 100, 'A & B <title>'),
    cardBase(200, 100),
    text(10, 20, 'x < y & "z"', { size: 12, anchor: 'middle', spacing: 2, opacity: 0.5 }),
    svgClose,
  ].join('\n');
  assertWellFormed(svg);
  assert.match(svg, /viewBox="0 0 200 100"/);
  assert.match(svg, /id="aurora"/);
  assert.match(svg, /A &amp; B &lt;title&gt;/);
});

test('languageColor falls back for unknown languages', () => {
  assert.match(languageColor('Java'), /^#[0-9a-f]{6}$/i);
  assert.match(languageColor('Brainfuck'), /^#[0-9a-f]{6}$/i);
  assert.match(languageColor(null), /^#[0-9a-f]{6}$/i);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, cannot find `scripts/lib/palette.mjs`.

- [ ] **Step 3: Implement `scripts/lib/palette.mjs`**

```js
export const palette = {
  bg0: '#0b1020',
  bg1: '#121a3a',
  violet: '#8b5cf6',
  cyan: '#22d3ee',
  pink: '#f472b6',
  text: '#e8ebff',
  muted: '#9aa4cf',
};

export const FONT = "'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif";

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  HTML: '#ff7a59',
  CSS: '#a78bfa',
  Java: '#f59e0b',
  Python: '#60a5fa',
  C: '#94a3b8',
  'C++': '#f472b6',
  Dart: '#22d3ee',
  'Jupyter Notebook': '#fb923c',
  Swift: '#fb7185',
  Kotlin: '#c084fc',
  CMake: '#64748b',
  'Objective-C': '#38bdf8',
  Other: '#64748b',
};

export function languageColor(name) {
  return LANGUAGE_COLORS[name] ?? '#a78bfa';
}
```

- [ ] **Step 4: Implement `scripts/lib/svg.mjs`**

```js
import { palette, FONT } from './palette.mjs';

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const WIDE = /[A-Z0-9MW@%#&]/;
const NARROW = /[ijlt.,:;'|!()[\]\s-]/;

// Conservative width estimate in px (SVG has no text measurement).
export function textWidth(text, size) {
  let em = 0;
  for (const ch of String(text ?? '')) em += WIDE.test(ch) ? 0.68 : NARROW.test(ch) ? 0.32 : 0.56;
  return em * size;
}

export function wrapText(text, maxWidth, size) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    let chars = [...word];
    while (textWidth(chars.join(''), size) > maxWidth && chars.length > 1) {
      let cut = chars.length;
      while (cut > 1 && textWidth(chars.slice(0, cut).join(''), size) > maxWidth) cut -= 1;
      lines.push(chars.slice(0, cut).join(''));
      chars = chars.slice(cut);
    }
    line = chars.join('');
  }
  if (line) lines.push(line);
  return lines;
}

export function truncate(text, maxWidth, size) {
  const s = String(text ?? '');
  if (textWidth(s, size) <= maxWidth) return s;
  const chars = [...s];
  while (chars.length > 1 && textWidth(chars.join('') + '…', size) > maxWidth) chars.pop();
  return chars.join('').trimEnd() + '…';
}

export function clampLines(lines, maxLines, maxWidth, size) {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncate(lines.slice(maxLines - 1).join(' '), maxWidth, size);
  return kept;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function glowDefs() {
  return [
    '<linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="0.5" stop-color="#22d3ee"/><stop offset="1" stop-color="#f472b6"/></linearGradient>',
    '<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a3a"/><stop offset="1" stop-color="#0b1020"/></linearGradient>',
    '<radialGradient id="glowV" cx="0.12" cy="0.05" r="0.85"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0.38"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="glowC" cx="0.95" cy="0.98" r="0.85"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.26"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>',
  ].join('');
}

export function svgOpen(w, h, title, { defs = '' } = {}) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `role="img" aria-label="${escapeXml(title)}" font-family="${FONT}">` +
    `<title>${escapeXml(title)}</title><defs>${glowDefs()}${defs}</defs>`
  );
}

export const svgClose = '</svg>';

export function cardBase(w, h, r = 20) {
  return [
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#base)"/>`,
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#glowV)"/>`,
    `<rect width="${w}" height="${h}" rx="${r}" fill="url(#glowC)"/>`,
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="url(#aurora)" stroke-opacity="0.55"/>`,
  ].join('');
}

export function text(x, y, str, { size = 14, weight = 400, fill = palette.text, anchor = 'start', spacing = 0, opacity = 1 } = {}) {
  return (
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"` +
    `${spacing ? ` letter-spacing="${spacing}"` : ''}${opacity !== 1 ? ` opacity="${opacity}"` : ''}>${escapeXml(str)}</text>`
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: PASS (all svg + xml tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add palette and SVG text/layout primitives" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: GitHub data layer and project merging

**Files:**
- Create: `scripts/lib/github.mjs`, `scripts/lib/projects.mjs`, `tests/helpers/sample.mjs`
- Test: `tests/github.test.mjs`, `tests/projects.test.mjs`

**Interfaces:**
- Produces from `github.mjs`:
  - `normalizeRepo(apiRepo) -> { name, description|null, language|null, stars, fork, archived, pushedAt|null, url }`
  - `aggregateLanguages(perRepo: Array<Record<string,number>>, { top = 5 } = {}) -> Array<{ name, bytes, pct }>` (sorted desc, remainder grouped as `Other`; `[]` if no bytes)
  - `computeStats({ repos, languages, profile, now }) -> { repoCount, stars, activeLast30, languages, memberSince|null }` (`languages` param is `Record<repoName, Record<lang,bytes>>`; forks excluded from counts and languages)
  - `recentRepos(repos, n) -> repo[]` (non-fork, newest `pushedAt` first, null last, does not mutate input)
  - `fetchGithub({ user, token, fetchImpl = fetch, warn = console.warn }) -> { profile:{login,createdAt}, repos, languages, fetchedAt }`; throws on any failure of the profile/repo-list calls; a failing per-repo `/languages` call is skipped with `warn`
  - `loadData({ user, offline, fixturePath, token }) -> same shape`
- Produces from `projects.mjs`:
  - `mergeProjects({ projects, repos, user, warn }) -> Array<{ id, title, description, tags[], url, badge|null, team, live, stars|null, pushedAt|null }>`
  - `moreBuilds({ projects, repos, user }) -> repo[]` (non-fork repos not featured in `projects`, excluding the profile repo named `user`, newest first)
- Produces from `tests/helpers/sample.mjs`: `sampleRepos`, `sampleData`, `sampleConfig`, `sampleProjects`, `fakeFetch(routes)`, `ok(body)`.

- [ ] **Step 1: Create `tests/helpers/sample.mjs`**

```js
export const sampleRepos = [
  { name: 'MediBridge', description: 'Smart Healthcare Access & Management Platform', language: 'HTML', stars: 1, fork: false, archived: false, pushedAt: '2026-09-21T10:00:00Z', url: 'https://github.com/Sohan-Narewadi/MediBridge' },
  { name: 'QUIZ_BATTLE', description: null, language: 'Java', stars: 1, fork: false, archived: false, pushedAt: '2025-10-26T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/QUIZ_BATTLE' },
  { name: 'Travel-and-Tourism-Webpage-1', description: null, language: 'HTML', stars: 0, fork: false, archived: false, pushedAt: '2026-08-23T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/Travel-and-Tourism-Webpage-1' },
  { name: 'some-fork', description: null, language: 'Python', stars: 5, fork: true, archived: false, pushedAt: '2026-09-25T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/some-fork' },
  { name: 'Sohan-Narewadi', description: null, language: 'JavaScript', stars: 0, fork: false, archived: false, pushedAt: '2026-09-26T08:00:00Z', url: 'https://github.com/Sohan-Narewadi/Sohan-Narewadi' },
];

export const sampleData = {
  profile: { login: 'Sohan-Narewadi', createdAt: '2025-05-24T07:21:53Z' },
  repos: sampleRepos,
  languages: {
    MediBridge: { HTML: 158382, JavaScript: 125412, CSS: 19093 },
    QUIZ_BATTLE: { Java: 32119 },
    'Travel-and-Tourism-Webpage-1': { HTML: 9000 },
    'some-fork': { Python: 999999 },
    'Sohan-Narewadi': { JavaScript: 500000 },
  },
  fetchedAt: '2026-09-26T10:00:00Z',
};

export const sampleConfig = {
  user: 'Sohan-Narewadi',
  name: 'Sohan Narewadi',
  tagline: 'Software Dev · Data Explorer · Builder',
  typingLines: ['Software Dev · Data Explorer · Builder'],
  bio: 'Student software developer who builds things end to end.',
  facts: [{ label: 'Focus', value: 'Full-stack · Data & ML' }],
  links: { linkedin: 'https://www.linkedin.com/in/x/', email: 'a@b.co', portfolio: 'https://example.dev' },
  stack: [{ title: 'Languages', items: ['Java', 'C'] }],
  nowCount: 3,
};

export const sampleProjects = [
  { id: 'static-one', title: 'Static One', url: 'https://github.com/other/static-one', badge: 'SIH 2026', team: true, description: 'A static card.', tags: ['Python'] },
  { id: 'medibridge', repo: 'MediBridge', title: 'MediBridge', description: 'Healthcare platform.', tags: ['Node.js'] },
];

export const ok = (body) => ({ ok: true, status: 200, json: async () => body });
export const fail = (status) => ({ ok: false, status, json: async () => ({}) });

// Routes are matched by substring, in insertion order (put more specific keys first).
export function fakeFetch(routes) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url, opts });
    for (const [frag, res] of Object.entries(routes)) {
      if (url.includes(frag)) return typeof res === 'function' ? res() : res;
    }
    return fail(404);
  };
  f.calls = calls;
  return f;
}
```

- [ ] **Step 2: Write `tests/github.test.mjs`**

```js
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

test('fetchGithub skips a repo whose languages call fails and warns', async () => {
  const warnings = [];
  const f = fakeFetch({
    '/users/octo/repos': ok([{ name: 'a', full_name: 'octo/a' }, { name: 'b', full_name: 'octo/b' }]),
    '/repos/octo/a/languages': fail(502),
    '/repos/octo/b/languages': ok({ C: 5 }),
    '/users/octo': ok({ login: 'octo', created_at: null }),
  });
  const data = await fetchGithub({ user: 'octo', fetchImpl: f, warn: (m) => warnings.push(m) });
  assert.deepEqual(data.languages, { b: { C: 5 } });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /a/);
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
```

- [ ] **Step 3: Write `tests/projects.test.mjs`**

```js
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
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test`
Expected: FAIL, cannot find `scripts/lib/github.mjs`.

- [ ] **Step 5: Implement `scripts/lib/github.mjs`**

```js
import { readFile } from 'node:fs/promises';

const API = 'https://api.github.com';
const DAY = 86_400_000;

export function normalizeRepo(r) {
  return {
    name: r.name,
    description: r.description ?? null,
    language: r.language ?? null,
    stars: r.stargazers_count ?? 0,
    fork: Boolean(r.fork),
    archived: Boolean(r.archived),
    pushedAt: r.pushed_at ?? null,
    url: r.html_url ?? `https://github.com/${r.full_name}`,
  };
}

export function aggregateLanguages(perRepo, { top = 5 } = {}) {
  const totals = new Map();
  for (const langs of perRepo) {
    for (const [name, bytes] of Object.entries(langs ?? {})) totals.set(name, (totals.get(name) ?? 0) + bytes);
  }
  const sorted = [...totals.entries()].map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes);
  const sum = sorted.reduce((s, l) => s + l.bytes, 0);
  if (sum === 0) return [];
  const head = sorted.slice(0, top);
  const restBytes = sorted.slice(top).reduce((s, l) => s + l.bytes, 0);
  if (restBytes > 0) head.push({ name: 'Other', bytes: restBytes });
  return head.map((l) => ({ ...l, pct: Math.round((l.bytes / sum) * 1000) / 10 }));
}

export function computeStats({ repos, languages, profile, now }) {
  const own = repos.filter((r) => !r.fork);
  const ownNames = new Set(own.map((r) => r.name));
  const perRepo = Object.entries(languages ?? {}).filter(([name]) => ownNames.has(name)).map(([, v]) => v);
  return {
    repoCount: own.length,
    stars: own.reduce((s, r) => s + r.stars, 0),
    activeLast30: own.filter((r) => r.pushedAt && now - Date.parse(r.pushedAt) <= 30 * DAY).length,
    languages: aggregateLanguages(perRepo),
    memberSince: profile?.createdAt ? new Date(profile.createdAt).getUTCFullYear() : null,
  };
}

export function recentRepos(repos, n) {
  return repos
    .filter((r) => !r.fork)
    .slice()
    .sort((a, b) => (Date.parse(b.pushedAt) || 0) - (Date.parse(a.pushedAt) || 0))
    .slice(0, n);
}

async function getJson(url, { token, fetchImpl }) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'profile-readme-builder' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
}

export async function fetchGithub({ user, token, fetchImpl = fetch, warn = console.warn }) {
  const opts = { token, fetchImpl };
  const raw = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await getJson(`${API}/users/${user}/repos?per_page=100&page=${page}&type=owner&sort=pushed`, opts);
    raw.push(...batch);
    if (batch.length < 100) break;
  }
  const profileRaw = await getJson(`${API}/users/${user}`, opts);
  const repos = raw.map(normalizeRepo);
  const languages = {};
  for (const r of repos.filter((x) => !x.fork)) {
    try {
      languages[r.name] = await getJson(`${API}/repos/${user}/${r.name}/languages`, opts);
    } catch (err) {
      warn(`languages for ${r.name} skipped: ${err.message}`);
    }
  }
  return {
    profile: { login: profileRaw.login ?? user, createdAt: profileRaw.created_at ?? null },
    repos,
    languages,
    fetchedAt: new Date().toISOString(),
  };
}

export async function loadData({ user, offline, fixturePath, token }) {
  if (offline) return JSON.parse(await readFile(fixturePath, 'utf8'));
  return fetchGithub({ user, token });
}
```

- [ ] **Step 6: Implement `scripts/lib/projects.mjs`**

```js
export function mergeProjects({ projects, repos, user, warn = () => {} }) {
  const byName = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
  return projects.map((p) => {
    const repo = p.repo ? byName.get(p.repo.toLowerCase()) : null;
    if (p.repo && !repo) warn(`projects.json: repo "${p.repo}" not found on GitHub; rendering without live stats`);
    return {
      id: p.id,
      title: p.title,
      description: p.description ?? repo?.description ?? '',
      tags: p.tags ?? (repo?.language ? [repo.language] : []),
      url: repo?.url ?? p.url ?? `https://github.com/${user}/${p.repo}`,
      badge: p.badge ?? null,
      team: Boolean(p.team),
      live: Boolean(repo),
      stars: repo ? repo.stars : null,
      pushedAt: repo?.pushedAt ?? null,
    };
  });
}

export function moreBuilds({ projects, repos, user }) {
  const featured = new Set(projects.filter((p) => p.repo).map((p) => p.repo.toLowerCase()));
  return repos
    .filter((r) => !r.fork && !featured.has(r.name.toLowerCase()) && r.name.toLowerCase() !== user.toLowerCase())
    .slice()
    .sort((a, b) => (Date.parse(b.pushedAt) || 0) - (Date.parse(a.pushedAt) || 0));
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add GitHub data layer and project merging" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Hero, About, Stack, Buttons, Section chrome

**Files:**
- Create: `scripts/lib/render/hero.mjs`, `about.mjs`, `stack.mjs`, `button.mjs`, `chrome.mjs`, `snake.mjs`; `scripts/lib/typing.mjs`
- Test: `tests/render/hero.test.mjs`, `tests/render/about-stack.test.mjs`, `tests/render/button-chrome.test.mjs`, `tests/typing.test.mjs`

**Interfaces:**
- Consumes: `svgOpen`, `svgClose`, `cardBase`, `text`, `textWidth`, `wrapText`, `escapeXml` from `scripts/lib/svg.mjs`; `palette`.
- Produces (all return a complete SVG string):
  - `renderHero({ name, handle })` — 1000x300
  - `renderAbout({ bio, facts })` — 830 wide, height computed (>= 200)
  - `renderStack(groups)` — 830 wide, height computed; `groups: [{title, items[]}]`
  - `renderButton({ label, kind })` — `kind` in `linkedin | email | portfolio`; throws `Error` on unknown kind
  - `renderSectionTitle(title)` — 830x56
  - `renderFooter()` — 1000x140
  - `renderSnakePlaceholder()` — 1000x200
- Produces `typingUrl(lines: string[]) -> string`.

- [ ] **Step 1: Write `tests/typing.test.mjs`**

```js
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
```

- [ ] **Step 2: Write `tests/render/hero.test.mjs`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderHero } from '../../scripts/lib/render/hero.mjs';

test('hero is well-formed, animated, and shows name and handle', () => {
  const svg = renderHero({ name: 'Sohan Narewadi', handle: 'Sohan-Narewadi' });
  assertWellFormed(svg);
  assert.match(svg, /viewBox="0 0 1000 300"/);
  assert.match(svg, /Sohan Narewadi/);
  assert.match(svg, /@Sohan-Narewadi/);
  assert.match(svg, /<animateTransform/);
});

test('hero shrinks the font for a very long name and escapes special characters', () => {
  const svg = renderHero({ name: 'A Very Long Display Name & Co <Ltd> That Keeps Going', handle: 'x' });
  assertWellFormed(svg);
  const size = Number(svg.match(/font-size="(\d+)"[^>]*>A Very Long/)[1]);
  assert.ok(size < 64);
});

test('hero survives an empty name', () => {
  assertWellFormed(renderHero({ name: '', handle: 'x' }));
});
```

- [ ] **Step 3: Write `tests/render/about-stack.test.mjs`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderAbout } from '../../scripts/lib/render/about.mjs';
import { renderStack } from '../../scripts/lib/render/stack.mjs';

test('about renders bio and facts, well-formed, with escaped text', () => {
  const svg = renderAbout({ bio: 'I build R&D things <fast>. '.repeat(6), facts: [{ label: 'Focus', value: 'Full-stack · Data & ML' }] });
  assertWellFormed(svg);
  assert.match(svg, /About/);
  assert.match(svg, /FOCUS/);
  assert.match(svg, /R&amp;D/);
});

test('about height grows with a long bio and has a minimum', () => {
  const h = (s) => Number(s.match(/height="(\d+)"/)[1]);
  const short = renderAbout({ bio: 'Short.', facts: [] });
  const long = renderAbout({ bio: 'word '.repeat(300), facts: [] });
  assert.ok(h(short) >= 200);
  assert.ok(h(long) > h(short));
});

test('about tolerates missing bio and facts', () => {
  assertWellFormed(renderAbout({ bio: '', facts: [] }));
  assertWellFormed(renderAbout({}));
});

test('stack lays pills out inside the card width and grows in height', () => {
  const items = Array.from({ length: 30 }, (_, i) => `Technology${i}`);
  const svg = renderStack([{ title: 'Languages', items }, { title: 'Tools', items: ['Git'] }]);
  assertWellFormed(svg);
  const width = 830;
  for (const m of svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)" height="30"/g)) {
    assert.ok(Number(m[1]) + Number(m[2]) <= width - 32 + 0.01, 'pill overflows');
  }
  assert.match(svg, /LANGUAGES/);
  assert.match(svg, /Technology29/);
});

test('stack handles an empty group list', () => {
  assertWellFormed(renderStack([]));
});
```

- [ ] **Step 4: Write `tests/render/button-chrome.test.mjs`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWellFormed } from '../helpers/xml.mjs';
import { renderButton } from '../../scripts/lib/render/button.mjs';
import { renderSectionTitle, renderFooter } from '../../scripts/lib/render/chrome.mjs';
import { renderSnakePlaceholder } from '../../scripts/lib/render/snake.mjs';

test('each button kind renders well-formed with its label', () => {
  for (const [kind, label] of [['linkedin', 'LinkedIn'], ['email', 'Email'], ['portfolio', 'Portfolio']]) {
    const svg = renderButton({ label, kind });
    assertWellFormed(svg);
    assert.match(svg, new RegExp(label));
  }
});

test('unknown button kind throws', () => {
  assert.throws(() => renderButton({ label: 'X', kind: 'myspace' }), /kind/);
});

test('section title, footer and snake placeholder are well-formed', () => {
  assertWellFormed(renderSectionTitle('Featured Projects & More'));
  assert.match(renderSectionTitle('Featured'), /Featured/);
  assertWellFormed(renderFooter());
  assertWellFormed(renderSnakePlaceholder());
});
```

- [ ] **Step 5: Run to verify failure**

Run: `npm test`
Expected: FAIL, missing modules.

- [ ] **Step 6: Implement `scripts/lib/typing.mjs`**

```js
const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+');

export function typingUrl(lines) {
  const joined = lines.map((l) => enc(String(l).replace(/;/g, ','))).join(';');
  const params = [
    'font=Segoe+UI', 'weight=600', 'size=22', 'duration=3200', 'pause=1200',
    'color=C4B5FD', 'center=true', 'vCenter=true', 'width=760', 'height=48',
    `lines=${joined}`,
  ];
  return `https://readme-typing-svg.demolab.com?${params.join('&')}`;
}
```

- [ ] **Step 7: Implement `scripts/lib/render/hero.mjs`**

```js
import { palette } from '../palette.mjs';
import { svgOpen, svgClose, text, textWidth } from '../svg.mjs';

const W = 1000;
const H = 300;

const wave = (y, amp, opacity, seconds) =>
  `<path d="M0 ${y} q125 ${-amp} 250 0${' t250 0'.repeat(7)} V${H + 10} H0 Z" fill="${palette.bg0}" fill-opacity="${opacity}">` +
  `<animateTransform attributeName="transform" type="translate" from="0 0" to="-500 0" dur="${seconds}s" repeatCount="indefinite"/></path>`;

const blob = (cx, cy, rx, ry, fill, opacity, values, seconds) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}">` +
  `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${seconds}s" repeatCount="indefinite"/></ellipse>`;

export function renderHero({ name, handle }) {
  const nameSize = Math.min(64, Math.floor(880 / textWidth(name, 1)));
  const defs =
    '<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="42"/></filter>' +
    `<clipPath id="clip"><rect width="${W}" height="${H}" rx="26"/></clipPath>`;
  return [
    svgOpen(W, H, `${name} — GitHub profile`, { defs }),
    '<g clip-path="url(#clip)">',
    `<rect width="${W}" height="${H}" fill="url(#base)"/>`,
    '<g filter="url(#blur)">',
    blob(220, 90, 260, 90, palette.violet, 0.6, '0 0;90 30;0 0', 14),
    blob(700, 60, 280, 80, palette.cyan, 0.4, '0 0;-90 40;0 0', 18),
    blob(520, 200, 300, 70, palette.pink, 0.35, '0 0;60 -30;0 0', 16),
    '</g>',
    wave(240, 26, 0.45, 11),
    wave(262, 18, 0.7, 7),
    text(W / 2, 150, name, { size: nameSize, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    `<rect x="${W / 2 - 60}" y="168" width="120" height="3" rx="1.5" fill="url(#aurora)"/>`,
    text(W / 2, 208, `@${handle}`, { size: 22, fill: '#c7d2fe', anchor: 'middle', spacing: 3 }),
    '</g>',
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="26" fill="none" stroke="url(#aurora)" stroke-opacity="0.7"/>`,
    svgClose,
  ].join('\n');
}
```

- [ ] **Step 8: Implement `scripts/lib/render/about.mjs`**

```js
import { palette } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, wrapText } from '../svg.mjs';

const W = 830;
const BIO_X = 40;
const BIO_W = 460;
const FACT_X = 548;
const FACT_W = 244;

export function renderAbout({ bio = '', facts = [] } = {}) {
  const bioLines = wrapText(bio, BIO_W, 15.5);
  const bioH = bioLines.length * 24;
  const factBlocks = facts.map((f) => ({ label: f.label, lines: wrapText(f.value, FACT_W, 14) }));
  const factsH = factBlocks.reduce((s, f) => s + 18 + f.lines.length * 20 + 14, 0);
  const H = Math.max(200, 84 + Math.max(bioH, factsH) + 28);

  const body = [text(BIO_X, 50, 'About', { size: 22, weight: 700, fill: '#ffffff' })];
  bioLines.forEach((l, i) => body.push(text(BIO_X, 90 + i * 24, l, { size: 15.5, fill: '#cfd6f6' })));

  body.push(`<rect x="${FACT_X - 24}" y="72" width="1" height="${H - 108}" fill="#ffffff" fill-opacity="0.12"/>`);
  let y = 90;
  for (const f of factBlocks) {
    body.push(text(FACT_X, y, f.label.toUpperCase(), { size: 11, weight: 700, fill: palette.muted, spacing: 2 }));
    y += 20;
    for (const l of f.lines) {
      body.push(text(FACT_X, y, l, { size: 14, fill: '#ffffff' }));
      y += 20;
    }
    y += 12;
  }
  return [svgOpen(W, H, 'About'), cardBase(W, H), ...body, svgClose].join('\n');
}
```

- [ ] **Step 9: Implement `scripts/lib/render/stack.mjs`**

```js
import { palette } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, textWidth } from '../svg.mjs';

const W = 830;
const PAD = 32;
const PILL_H = 30;
const HUES = [palette.violet, palette.cyan, palette.pink];

export function renderStack(groups = []) {
  const body = [text(PAD, 46, 'Tech stack', { size: 22, weight: 700, fill: '#ffffff' })];
  let cursor = 66;
  groups.forEach((g, gi) => {
    const hue = HUES[gi % HUES.length];
    body.push(text(PAD, cursor + 12, g.title.toUpperCase(), { size: 11, weight: 700, fill: palette.muted, spacing: 2 }));
    let rowTop = cursor + 24;
    let x = PAD;
    for (const item of g.items) {
      const w = Math.ceil(textWidth(item, 14)) + 28;
      if (x + w > W - PAD) {
        x = PAD;
        rowTop += PILL_H + 8;
      }
      body.push(
        `<rect x="${x}" y="${rowTop}" width="${w}" height="${PILL_H}" rx="15" fill="${hue}" fill-opacity="0.14" stroke="${hue}" stroke-opacity="0.65"/>`,
        text(x + w / 2, rowTop + 20, item, { size: 14, weight: 500, anchor: 'middle' }),
      );
      x += w + 10;
    }
    cursor = rowTop + PILL_H + 18;
  });
  const H = cursor + 10;
  return [svgOpen(W, H, 'Tech stack'), cardBase(W, H), ...body, svgClose].join('\n');
}
```

- [ ] **Step 10: Implement `scripts/lib/render/button.mjs`**

```js
import { svgOpen, svgClose, text, textWidth } from '../svg.mjs';

const S = '#e8ebff';
const ICONS = {
  linkedin: (x, y) =>
    `<rect x="${x}" y="${y}" width="24" height="24" rx="6" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    text(x + 12, y + 18, 'in', { size: 14, weight: 800, anchor: 'middle' }),
  email: (x, y) =>
    `<rect x="${x}" y="${y + 3}" width="24" height="18" rx="4" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    `<path d="M${x + 2} ${y + 7} L${x + 12} ${y + 14} L${x + 22} ${y + 7}" fill="none" stroke="${S}" stroke-width="1.8" stroke-linejoin="round"/>`,
  portfolio: (x, y) =>
    `<circle cx="${x + 12}" cy="${y + 12}" r="10" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    `<ellipse cx="${x + 12}" cy="${y + 12}" rx="4.5" ry="10" fill="none" stroke="${S}" stroke-width="1.8"/>` +
    `<line x1="${x + 2}" y1="${y + 12}" x2="${x + 22}" y2="${y + 12}" stroke="${S}" stroke-width="1.8"/>`,
};

export function renderButton({ label, kind }) {
  const icon = ICONS[kind];
  if (!icon) throw new Error(`Unknown button kind: ${kind}`);
  const H = 52;
  const W = Math.ceil(textWidth(label, 15)) + 84;
  return [
    svgOpen(W, H, label),
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="26" fill="url(#base)" stroke="url(#aurora)" stroke-opacity="0.75"/>`,
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="26" fill="url(#glowV)"/>`,
    icon(22, 14),
    text(58, 32, label, { size: 15, weight: 600, fill: '#ffffff' }),
    svgClose,
  ].join('\n');
}
```

- [ ] **Step 11: Implement `scripts/lib/render/chrome.mjs`**

```js
import { palette } from '../palette.mjs';
import { svgOpen, svgClose, text, textWidth } from '../svg.mjs';

export function renderSectionTitle(title) {
  const W = 830;
  const H = 56;
  const tw = textWidth(title, 22);
  const left = Math.max(0, W / 2 - tw / 2 - 20);
  const right = W / 2 + tw / 2 + 20;
  return [
    svgOpen(W, H, title),
    `<rect x="0" y="27" width="${left}" height="2" rx="1" fill="url(#aurora)" fill-opacity="0.6"/>`,
    `<rect x="${right}" y="27" width="${Math.max(0, W - right)}" height="2" rx="1" fill="url(#aurora)" fill-opacity="0.6"/>`,
    text(W / 2, 35, title, { size: 22, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    svgClose,
  ].join('\n');
}

const W = 1000;
const wave = (y, amp, opacity, seconds, fill) =>
  `<path d="M0 ${y} q125 ${-amp} 250 0${' t250 0'.repeat(7)} V150 H0 Z" fill="${fill}" fill-opacity="${opacity}">` +
  `<animateTransform attributeName="transform" type="translate" from="0 0" to="-500 0" dur="${seconds}s" repeatCount="indefinite"/></path>`;

export function renderFooter() {
  const H = 140;
  return [
    svgOpen(W, H, 'Thanks for visiting'),
    `<clipPath id="fclip"><rect width="${W}" height="${H}" rx="24"/></clipPath>`,
    '<g clip-path="url(#fclip)">',
    `<rect width="${W}" height="${H}" fill="url(#base)"/>`,
    wave(60, 26, 0.35, 12, palette.violet),
    wave(80, 20, 0.35, 9, palette.cyan),
    wave(98, 16, 0.4, 7, palette.pink),
    text(W / 2, 74, 'Thanks for visiting', { size: 24, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    text(W / 2, 102, 'Built with a GitHub Action · refreshes every 6 hours', { size: 13, fill: '#c7d2fe', anchor: 'middle' }),
    '</g>',
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="url(#aurora)" stroke-opacity="0.6"/>`,
    svgClose,
  ].join('\n');
}
```

- [ ] **Step 12: Implement `scripts/lib/render/snake.mjs`**

```js
import { palette } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text } from '../svg.mjs';

// Shown until the first workflow run replaces assets/snake.svg with the real snake.
export function renderSnakePlaceholder() {
  const W = 1000;
  const H = 200;
  return [
    svgOpen(W, H, 'Contribution snake'),
    cardBase(W, H, 24),
    text(W / 2, 96, 'Contribution snake', { size: 24, weight: 700, fill: '#ffffff', anchor: 'middle' }),
    text(W / 2, 128, 'appears after the first GitHub Action run', { size: 14, fill: palette.muted, anchor: 'middle' }),
    svgClose,
  ].join('\n');
}
```

- [ ] **Step 13: Run to verify it passes**

Run: `npm test`
Expected: PASS. If the pill-overflow assertion fails, the stack wrap check (`x + w > W - PAD`) is wrong; fix the code, not the test.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: add hero, about, stack, button and chrome renderers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Project card, chip, "now" list, stats cards

**Files:**
- Create: `scripts/lib/render/card.mjs`, `now.mjs`, `stats.mjs`
- Test: `tests/render/card.test.mjs`, `tests/render/now-stats.test.mjs`

**Interfaces:**
- Consumes: `svg.mjs` helpers, `languageColor`, `palette`; card input shape = the output of `mergeProjects` (Task 3).
- Produces:
  - `renderProjectCard(p)` — 440x250; `p = { title, description, tags[], badge|null, team, live, stars|null, pushedAt|null }`
  - `renderChip({ name, language })` — height 34, width computed
  - `renderNow(repos)` — 830 wide; `repos = [{ name, description|null, language|null, pushedAt|null }]`, height grows with rows, one placeholder row when empty
  - `renderLanguages(stats)` — 440x250
  - `renderNumbers(stats)` — 440x250; `stats` = output of `computeStats`

- [ ] **Step 1: Write `tests/render/card.test.mjs`**

```js
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
```

- [ ] **Step 2: Write `tests/render/now-stats.test.mjs`**

```js
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL, missing modules.

- [ ] **Step 4: Implement `scripts/lib/render/card.mjs`**

```js
import { palette, languageColor } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, textWidth, wrapText, truncate, clampLines, formatDate } from '../svg.mjs';

const W = 440;
const H = 250;
const PAD = 28;
const INNER = W - PAD * 2;

function smallPill(x, y, label, accent = false) {
  const w = Math.ceil(textWidth(label, 11.5)) + 20;
  const svg =
    `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${accent ? '#8b5cf6' : '#ffffff'}" fill-opacity="${accent ? 0.28 : 0.08}" stroke="${accent ? '#c4b5fd' : '#ffffff'}" stroke-opacity="${accent ? 0.7 : 0.18}"/>` +
    text(x + w / 2, y + 15, label, { size: 11.5, weight: accent ? 600 : 500, fill: accent ? '#ede9fe' : palette.muted, anchor: 'middle' });
  return { w, svg };
}

function star(cx, cy, r, fill) {
  const pts = [];
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
}

export function renderProjectCard(p) {
  const parts = [svgOpen(W, H, `${p.title} — project`), cardBase(W, H)];
  parts.push(text(PAD, 52, truncate(p.title, INNER, 22), { size: 22, weight: 700, fill: '#ffffff' }));

  const badges = [p.badge, p.team ? 'Team project' : null].filter(Boolean);
  let x = PAD;
  badges.forEach((label, i) => {
    const b = smallPill(x, 66, label, i === 0 && Boolean(p.badge));
    parts.push(b.svg);
    x += b.w + 8;
  });

  const descTop = badges.length ? 116 : 90;
  const maxLines = Math.floor((176 - descTop) / 19) + 1;
  const lines = clampLines(wrapText(p.description ?? '', INNER, 13.5), maxLines, INNER, 13.5);
  lines.forEach((l, i) => parts.push(text(PAD, descTop + i * 19, l, { size: 13.5, fill: '#cfd6f6' })));

  let tx = PAD;
  for (const tag of p.tags ?? []) {
    const t = smallPill(tx, 188, tag);
    if (tx + t.w > W - PAD) break;
    parts.push(t.svg);
    tx += t.w + 6;
  }

  parts.push(`<line x1="${PAD}" y1="224" x2="${W - PAD}" y2="224" stroke="#ffffff" stroke-opacity="0.1"/>`);
  if (p.live) {
    const stars = String(p.stars ?? 0);
    parts.push(star(PAD + 6, 238, 6, '#fbbf24'), text(PAD + 18, 242, stars, { size: 12.5, weight: 600, fill: '#ffffff' }));
    const updated = formatDate(p.pushedAt);
    if (updated) parts.push(text(PAD + 18 + textWidth(stars, 12.5) + 14, 242, `Updated ${updated}`, { size: 12.5, fill: palette.muted }));
  } else {
    parts.push(text(PAD, 242, 'Team repository', { size: 12.5, fill: palette.muted }));
  }
  parts.push(
    text(W - PAD - 14, 242, 'View repo', { size: 12.5, weight: 600, fill: '#c4b5fd', anchor: 'end' }),
    `<path d="M${W - PAD - 6} 236 l5 5 l-5 5" fill="none" stroke="url(#aurora)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  parts.push(svgClose);
  return parts.join('\n');
}

export function renderChip({ name, language }) {
  const label = truncate(name, 260, 13);
  const w = Math.ceil(textWidth(label, 13)) + 46;
  const h = 34;
  return [
    svgOpen(w, h, name),
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="17" fill="url(#base)" stroke="url(#aurora)" stroke-opacity="0.5"/>`,
    `<circle cx="18" cy="17" r="5" fill="${languageColor(language)}"/>`,
    text(32, 22, label, { size: 13, weight: 500, fill: '#e8ebff' }),
    svgClose,
  ].join('\n');
}
```

- [ ] **Step 5: Implement `scripts/lib/render/now.mjs`**

```js
import { palette, languageColor } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, truncate, formatDate } from '../svg.mjs';

const W = 830;
const ROW = 62;

export function renderNow(repos) {
  const rows = repos.length ? repos : [null];
  const H = 24 + rows.length * ROW - 12 + 24;
  const parts = [svgOpen(W, H, 'Currently working on'), cardBase(W, H)];
  rows.forEach((r, i) => {
    const y = 24 + i * ROW;
    parts.push(`<rect x="20" y="${y}" width="${W - 40}" height="50" rx="14" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1"/>`);
    if (!r) {
      parts.push(text(W / 2, y + 30, 'Nothing pushed yet — check back soon.', { size: 15, fill: palette.muted, anchor: 'middle' }));
      return;
    }
    const color = languageColor(r.language);
    parts.push(`<circle cx="42" cy="${y + 25}" r="5" fill="${color}"/>`);
    if (i === 0) {
      parts.push(
        `<circle cx="42" cy="${y + 25}" r="5" fill="${color}" opacity="0.5"><animate attributeName="r" values="5;11;5" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite"/></circle>`,
      );
    }
    parts.push(text(62, y + 22, truncate(r.name, 380, 16), { size: 16, weight: 700, fill: '#ffffff' }));
    if (r.description) parts.push(text(62, y + 40, truncate(r.description, 520, 12.5), { size: 12.5, fill: palette.muted }));
    else if (r.language) parts.push(text(62, y + 40, r.language, { size: 12.5, fill: palette.muted }));
    const date = formatDate(r.pushedAt);
    if (date) parts.push(text(W - 40, y + 31, `Pushed ${date}`, { size: 12.5, fill: '#c7d2fe', anchor: 'end' }));
  });
  parts.push(svgClose);
  return parts.join('\n');
}
```

- [ ] **Step 6: Implement `scripts/lib/render/stats.mjs`**

```js
import { palette, languageColor } from '../palette.mjs';
import { svgOpen, svgClose, cardBase, text, truncate } from '../svg.mjs';

const W = 440;
const H = 250;
const PAD = 28;
const INNER = W - PAD * 2;

export function renderLanguages({ languages }) {
  const parts = [];
  const defs = `<clipPath id="barClip"><rect x="${PAD}" y="66" width="${INNER}" height="12" rx="6"/></clipPath>`;
  parts.push(svgOpen(W, H, 'Top languages', { defs }), cardBase(W, H));
  parts.push(text(PAD, 44, 'Top languages', { size: 20, weight: 700, fill: '#ffffff' }));
  if (!languages.length) {
    parts.push(text(W / 2, 140, 'No language data yet', { size: 15, fill: palette.muted, anchor: 'middle' }));
    parts.push(svgClose);
    return parts.join('\n');
  }
  let x = PAD;
  const segs = [];
  languages.forEach((l, i) => {
    const w = i === languages.length - 1 ? PAD + INNER - x : (l.pct / 100) * INNER;
    segs.push(`<rect x="${x.toFixed(2)}" y="66" width="${Math.max(0, w).toFixed(2)}" height="12" fill="${languageColor(l.name)}"/>`);
    x += w;
  });
  parts.push(`<g clip-path="url(#barClip)">${segs.join('')}</g>`);
  const colW = INNER / 2 - 8;
  languages.slice(0, 6).forEach((l, i) => {
    const cx = PAD + (i % 2) * (INNER / 2 + 8);
    const y = 122 + Math.floor(i / 2) * 38;
    parts.push(
      `<circle cx="${cx + 5}" cy="${y - 5}" r="5" fill="${languageColor(l.name)}"/>`,
      text(cx + 18, y, truncate(l.name, colW - 70, 13.5), { size: 13.5, weight: 600, fill: '#ffffff' }),
      text(cx + colW, y, `${l.pct}%`, { size: 13, fill: palette.muted, anchor: 'end' }),
    );
  });
  parts.push(svgClose);
  return parts.join('\n');
}

export function renderNumbers({ repoCount, stars, activeLast30, memberSince }) {
  const parts = [svgOpen(W, H, 'GitHub at a glance'), cardBase(W, H)];
  parts.push(text(PAD, 44, 'At a glance', { size: 20, weight: 700, fill: '#ffffff' }));
  const tiles = [
    [String(repoCount), 'Public repos'],
    [String(stars), 'Stars earned'],
    [String(activeLast30), 'Active in 30 days'],
    [memberSince ? String(memberSince) : '—', 'On GitHub since'],
  ];
  const tw = (INNER - 12) / 2;
  tiles.forEach(([value, label], i) => {
    const x = PAD + (i % 2) * (tw + 12);
    const y = 66 + Math.floor(i / 2) * 88;
    parts.push(
      `<rect x="${x}" y="${y}" width="${tw}" height="78" rx="14" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.12"/>`,
      text(x + 18, y + 42, value, { size: 30, weight: 700, fill: '#ffffff' }),
      text(x + 18, y + 64, label, { size: 12, fill: palette.muted }),
    );
  });
  parts.push(svgClose);
  return parts.join('\n');
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npm test`
Expected: PASS. If the card overflow assertions fail, fix layout code (do not loosen the tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add project card, chip, now-list and stats renderers" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: README template and site assembly

**Files:**
- Create: `scripts/lib/readme.mjs`, `scripts/lib/site.mjs`, `scripts/README.template.md`
- Test: `tests/readme.test.mjs`, `tests/site.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 2-5, `computeStats`, `recentRepos`, `mergeProjects`, `moreBuilds`, `typingUrl`.
- Produces:
  - `fillTemplate(template, values) -> string` — replaces `{{key}}` once (single pass); throws `Error` for a placeholder with no value
  - `buildSite({ config, projects, template, data }) -> { files: Record<relativePath,string>, warnings: string[] }` — always includes `README.md`, `assets/hero.svg`, `assets/about.svg`, `assets/stack.svg`, `assets/titles/*.svg`, `assets/projects/<id>.svg`, `assets/chips/*.svg`, `assets/now.svg`, `assets/languages.svg`, `assets/numbers.svg`, `assets/buttons/*.svg`, `assets/footer.svg`. Pure: performs no I/O. Filters the profile repo (`config.user`) out of repos/languages/stats. Throws on duplicate project ids.

- [ ] **Step 1: Write `tests/readme.test.mjs`**

```js
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
```

- [ ] **Step 2: Write `tests/site.test.mjs`**

```js
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL, missing `readme.mjs` / `site.mjs` / template.

- [ ] **Step 4: Implement `scripts/lib/readme.mjs`**

```js
export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Template placeholder ${match} has no value`);
    return values[key];
  });
}
```

- [ ] **Step 5: Create `scripts/README.template.md`**

```html
<div align="center">

{{hero}}

{{typing}}

</div>

<div align="center">

{{about}}

{{stack}}

{{projectsTitle}}

{{projects}}

{{moreTitle}}

{{more}}

{{nowTitle}}

{{now}}

{{statsTitle}}

{{stats}}

{{snakeTitle}}

{{snake}}

{{connectTitle}}

{{connect}}

{{footer}}

</div>
```

- [ ] **Step 6: Implement `scripts/lib/site.mjs`**

```js
import { createHash } from 'node:crypto';
import { escapeXml } from './svg.mjs';
import { computeStats, recentRepos } from './github.mjs';
import { mergeProjects, moreBuilds } from './projects.mjs';
import { typingUrl } from './typing.mjs';
import { fillTemplate } from './readme.mjs';
import { renderHero } from './render/hero.mjs';
import { renderAbout } from './render/about.mjs';
import { renderStack } from './render/stack.mjs';
import { renderButton } from './render/button.mjs';
import { renderProjectCard, renderChip } from './render/card.mjs';
import { renderNow } from './render/now.mjs';
import { renderLanguages, renderNumbers } from './render/stats.mjs';
import { renderSectionTitle, renderFooter } from './render/chrome.mjs';

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const img = (src, alt, extra = '') => `<img src="${escapeXml(src)}" alt="${escapeXml(alt)}"${extra} />`;
const link = (href, inner) => `<a href="${escapeXml(href)}">${inner}</a>`;

export function buildSite({ config, projects, template, data }) {
  const warnings = [];
  const files = {};
  const ref = (path, svg) => {
    files[path] = svg;
    return `${path}?v=${hash(svg)}`;
  };

  const ids = new Set();
  for (const p of projects) {
    if (ids.has(p.id)) throw new Error(`projects.json: duplicate project id "${p.id}"`);
    ids.add(p.id);
  }

  const user = config.user;
  const isProfileRepo = (name) => name.toLowerCase() === user.toLowerCase();
  const repos = data.repos.filter((r) => !isProfileRepo(r.name));
  const languages = Object.fromEntries(Object.entries(data.languages ?? {}).filter(([name]) => !isProfileRepo(name)));
  const stats = computeStats({ repos, languages, profile: data.profile, now: new Date(data.fetchedAt) });

  const merged = mergeProjects({ projects, repos, user, warn: (m) => warnings.push(m) });
  const extras = moreBuilds({ projects, repos, user });
  const descByRepo = new Map(projects.filter((p) => p.repo).map((p) => [p.repo.toLowerCase(), p.description]));
  const recent = recentRepos(repos, config.nowCount ?? 3).map((r) => ({
    name: r.name,
    language: r.language,
    pushedAt: r.pushedAt,
    description: r.description ?? descByRepo.get(r.name.toLowerCase()) ?? null,
  }));

  const profileUrl = `https://github.com/${user}`;
  const reposUrl = `${profileUrl}?tab=repositories`;
  const title = (key, text) => img(ref(`assets/titles/${key}.svg`, renderSectionTitle(text)), text, ' width="830"');

  const values = {
    hero: img(ref('assets/hero.svg', renderHero({ name: config.name, handle: user })), `${config.name} — GitHub profile`, ' width="100%"'),
    typing: img(typingUrl(config.typingLines ?? [config.tagline]), config.tagline),
    about: img(ref('assets/about.svg', renderAbout({ bio: config.bio, facts: config.facts })), 'About', ' width="830"'),
    stack: img(ref('assets/stack.svg', renderStack(config.stack)), 'Tech stack', ' width="830"'),
    projectsTitle: merged.length ? title('projects', 'Featured Projects') : '',
    projects: merged
      .map((p) => link(p.url, img(ref(`assets/projects/${p.id}.svg`, renderProjectCard(p)), `${p.title} project`, ' width="405"')))
      .join('\n'),
    moreTitle: extras.length ? title('more', 'More Builds') : '',
    more: extras
      .map((r) => link(r.url, img(ref(`assets/chips/${slug(r.name)}-${hash(r.name).slice(0, 4)}.svg`, renderChip(r)), r.name)))
      .join('\n'),
    nowTitle: title('now', 'Currently Working On'),
    now: link(reposUrl, img(ref('assets/now.svg', renderNow(recent)), 'Recently pushed repositories', ' width="830"')),
    statsTitle: title('stats', 'GitHub Stats'),
    stats: [
      link(profileUrl, img(ref('assets/languages.svg', renderLanguages(stats)), 'Top languages', ' width="405"')),
      link(profileUrl, img(ref('assets/numbers.svg', renderNumbers(stats)), 'GitHub at a glance', ' width="405"')),
    ].join('\n'),
    snakeTitle: title('snake', 'Contributions'),
    snake: img('assets/snake.svg', 'Contribution snake', ' width="100%"'),
    connectTitle: title('connect', "Let's Connect"),
    connect: [
      link(config.links.linkedin, img(ref('assets/buttons/linkedin.svg', renderButton({ label: 'LinkedIn', kind: 'linkedin' })), 'LinkedIn')),
      link(`mailto:${config.links.email}`, img(ref('assets/buttons/email.svg', renderButton({ label: 'Email', kind: 'email' })), 'Email')),
      link(config.links.portfolio, img(ref('assets/buttons/portfolio.svg', renderButton({ label: 'Portfolio', kind: 'portfolio' })), 'Portfolio')),
    ].join('\n'),
    footer: img(ref('assets/footer.svg', renderFooter()), 'Thanks for visiting', ' width="100%"'),
  };

  files['README.md'] = fillTemplate(template, values);
  return { files, warnings };
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npm test`
Expected: PASS. The awkward `chips/sohan-narewadi` assertion in `REVIEW-FOCUS 5` must pass because `moreBuilds` already excludes the profile repo; if it fails, fix `site.mjs`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: assemble README and assets from data via buildSite" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Build CLI, fixture and real-data smoke test

**Files:**
- Create: `scripts/build.mjs`, `scripts/fixtures/github.json` (generated), `tests/fixture.test.mjs`
- Generated and committed: `README.md`, `assets/**`

**Interfaces:**
- Consumes: `loadData`, `buildSite`, `renderSnakePlaceholder`.
- CLI flags: `--offline` (read `scripts/fixtures/github.json`), `--save-fixture` (fetch live data and save it, then build), no flags = live fetch with `GITHUB_TOKEN` if set.
- Behavior: computes all output in memory first; writes files only after everything succeeded; on any error prints `build failed, nothing written: <message>` to stderr and exits 1. Removes stale files in `assets/projects/` and `assets/chips/`. Writes `assets/snake.svg` placeholder only when the file does not exist.

- [ ] **Step 1: Implement `scripts/build.mjs`**

```js
#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, rm, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from './lib/github.mjs';
import { buildSite } from './lib/site.mjs';
import { renderSnakePlaceholder } from './lib/render/snake.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = new Set(process.argv.slice(2));
const readJson = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));
const exists = (p) => access(p).then(() => true, () => false);

async function prune(dir, keep) {
  if (!(await exists(dir))) return;
  for (const name of await readdir(dir)) {
    if (!keep.has(join(dir, name).replace(ROOT, '').replaceAll('\\', '/').replace(/^\//, ''))) await rm(join(dir, name));
  }
}

async function main() {
  const config = await readJson('config.json');
  const projects = await readJson('projects.json');
  const template = await readFile(join(ROOT, 'scripts', 'README.template.md'), 'utf8');
  const fixturePath = join(ROOT, 'scripts', 'fixtures', 'github.json');

  const data = await loadData({ user: config.user, offline: args.has('--offline'), fixturePath, token: process.env.GITHUB_TOKEN });
  const { files, warnings } = buildSite({ config, projects, template, data });
  for (const w of warnings) console.warn(`warning: ${w}`);

  // Everything rendered successfully; only now touch the disk.
  if (args.has('--save-fixture')) {
    await mkdir(dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, JSON.stringify(data, null, 2) + '\n');
    console.log('saved fixture');
  }
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(ROOT, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content);
  }
  const keep = new Set(Object.keys(files));
  await prune(join(ROOT, 'assets', 'projects'), keep);
  await prune(join(ROOT, 'assets', 'chips'), keep);

  const snake = join(ROOT, 'assets', 'snake.svg');
  if (!(await exists(snake))) await writeFile(snake, renderSnakePlaceholder());
  console.log(`wrote ${Object.keys(files).length} files`);
}

main().catch((err) => {
  console.error(`build failed, nothing written: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Fetch the real fixture and build**

Run: `npm run fixture`
Expected: prints `saved fixture` and `wrote N files` (N around 30). Warnings, if any, are printed as `warning: ...`; none are expected because the six live repos exist. If GitHub returns a rate-limit error (403), wait a few minutes and retry; the script must print `build failed, nothing written` and exit 1 without creating `assets/` or `README.md` (confirm with `ls`).

- [ ] **Step 3: Write `tests/fixture.test.mjs`** (real-data smoke test)

```js
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
```

- [ ] **Step 4: Verify offline build is deterministic and tests pass**

Run: `npm run build:offline && git add -A && npm run build:offline && git status --short`
Expected: the second build rewrites identical bytes, so `git status --short` shows only staged (`A `) entries and no ` M` (modified-after-staging) lines. Then `npm test` passes fully.

- [ ] **Step 5: Verify failure leaves the tree untouched**

Run (Git Bash; `P` is inside the session scratchpad):
```bash
P=/c/Users/sohan/AppData/Local/Temp/claude/C--Windows-System32/d0951abd-3c1a-402d-99a9-60279b4836d3/scratchpad/probe
rm -rf "$P" && cp -r /c/Users/sohan/Sohan-Narewadi "$P" && cd "$P" \
  && rm scripts/fixtures/github.json && echo "junk" > README.md && node scripts/build.mjs --offline; echo "exit=$?"; cat README.md
```
Expected: prints `build failed, nothing written: ENOENT...`, `exit=1`, and `README.md` still contains only `junk` (the failed build did not overwrite it). Then `cd /c/Users/sohan/Sohan-Narewadi`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add build CLI, real-data fixture and generated profile" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/update.yml`

**Interfaces:**
- Consumes: `npm test`, `node scripts/build.mjs`.
- Produces: a workflow that runs every 6 hours, on manual dispatch, and on pushes that change the generator inputs; it commits changed `README.md` and `assets/**` with the built-in `GITHUB_TOKEN`.

- [ ] **Step 1: Create `.github/workflows/update.yml`**

```yaml
name: Update profile

on:
  schedule:
    - cron: "17 */6 * * *"
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - config.json
      - projects.json
      - scripts/**
      - .github/workflows/update.yml

permissions:
  contents: write

concurrency:
  group: profile-update
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Unit tests
        run: npm test

      - name: Build README and assets
        run: node scripts/build.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Generate contribution snake
        continue-on-error: true
        uses: Platane/snk/svg-only@v3
        with:
          github_user_name: ${{ github.repository_owner }}
          outputs: |
            dist/snake.svg?color_snake=#22d3ee&color_dots=#1b2140,#4c3a8f,#7c5cf0,#c084fc,#f472b6

      - name: Install snake into assets
        run: |
          if [ -f dist/snake.svg ]; then cp dist/snake.svg assets/snake.svg; fi

      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add README.md assets
          if git diff --cached --quiet; then
            echo "No changes"
          else
            git commit -m "chore: refresh profile"
            git push
          fi
```

- [ ] **Step 2: Validate the YAML parses**

Run: `python -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/update.yml')); print(list(d['jobs']['build']['steps'][0].keys()), d[True]['schedule'])"`
Expected: prints the step keys and `[{'cron': '17 */6 * * *'}]` (`on` parses as the boolean key `True` in YAML 1.1; that is expected). If PyYAML is not installed, run `pip install pyyaml` first.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: add scheduled workflow to rebuild the profile" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Local preview and visual QA

**Files:**
- Create: `scripts/preview.mjs`

**Interfaces:**
- Consumes: generated `README.md`, `assets/**`.
- Produces: `preview-dark.html` and `preview-light.html` at the repo root (gitignored), the README body wrapped in a GitHub-like page (max width 830px content, dark `#0d1117` and light `#ffffff` backgrounds), so relative asset paths resolve.

- [ ] **Step 1: Implement `scripts/preview.mjs`**

```js
#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const readme = await readFile(join(ROOT, 'README.md'), 'utf8');

const page = (bg, fg, link) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile preview</title>
<style>
  body{margin:0;background:${bg};color:${fg};font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.5}
  .markdown-body{max-width:830px;margin:0 auto;padding:24px 16px}
  img{max-width:100%;vertical-align:middle}
  a{color:${link}}
</style></head>
<body><div class="markdown-body">
${readme}
</div></body></html>`;

await writeFile(join(ROOT, 'preview-dark.html'), page('#0d1117', '#e6edf3', '#58a6ff'));
await writeFile(join(ROOT, 'preview-light.html'), page('#ffffff', '#1f2328', '#0969da'));
console.log('wrote preview-dark.html and preview-light.html');
```

- [ ] **Step 2: Build and generate previews**

Run: `npm run build:offline && npm run preview`
Expected: `wrote N files`, then `wrote preview-dark.html and preview-light.html`.

- [ ] **Step 3: Screenshot at three sizes**

Invoke the `playwright-cli` skill (Chromium is already installed under `%LOCALAPPDATA%\ms-playwright`). Open `file:///C:/Users/sohan/Sohan-Narewadi/preview-dark.html` and take full-page screenshots into the scratchpad directory at viewport widths **1012 px** (desktop GitHub), **390 px** (mobile), and open `preview-light.html` at **1012 px**. Read each screenshot image.

- [ ] **Step 4: Inspect against this checklist; fix code (not the checklist) for any failure**

For every screenshot confirm:
1. Hero: aurora blobs and waves visible, name centered and fully inside the banner, `@Sohan-Narewadi` readable. (Screenshots are static; SMIL motion is verified in Step 5.)
2. Typing line renders (it comes from an external service; if the sandbox has no network it shows alt text, which is acceptable locally).
3. About card: bio wraps inside the left column, facts inside the right column, nothing overlaps the divider.
4. Tech-stack pills: no pill crosses the right edge; group titles do not overlap pills.
5. Project cards: two per row at 1012 px, one per row at 390 px; no text touches or crosses the card edge; description never runs into the tag row; the two SIH cards show the "SIH 2026" and "Team project" pills.
6. "More Builds" chips wrap naturally.
7. "Currently Working On": three rows, the profile repo `Sohan-Narewadi` is absent.
8. Stats: language bar colors match the legend; the numbers card shows the four tiles.
9. Snake placeholder shows (real snake appears after the first Action run).
10. Connect buttons and footer render; the light-theme screenshot looks identical to dark because every card paints its own dark background.
11. No literal `null`, `undefined`, `NaN` or `{{` anywhere.

If an item fails: change the relevant renderer, add or tighten a unit test that would have caught it, rerun `npm test`, rebuild, and re-screenshot.

- [ ] **Step 5: Confirm animation runs**

In the playwright session, load `preview-dark.html`, take two screenshots of the hero 3 seconds apart, and confirm the aurora/wave region differs between them (pixel comparison by eye is enough).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add local preview script; visual QA fixes" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Link check, final verification, publish handoff

**Files:**
- Create: `scripts/check-links.mjs`

**Interfaces:**
- Consumes: generated `README.md`.
- Produces: a manual link checker (`npm run check-links`) that prints one line per URL and exits non-zero if any checked URL fails.

- [ ] **Step 1: Implement `scripts/check-links.mjs`**

```js
#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const readme = await readFile(join(ROOT, 'README.md'), 'utf8');

// Skipped on purpose: LinkedIn blocks bots (HTTP 999), the two SIH repos live under a
// teammate's account and may be private, the portfolio URL is a dummy placeholder.
const SKIP = [/linkedin\.com/, /arsiwalamoiz24\//, /sohan-narewadi\.dev/, /^mailto:/];

const urls = new Set();
for (const m of readme.matchAll(/(?:href|src)="([^"]+)"/g)) urls.add(m[1].replaceAll('&amp;', '&'));

let failed = 0;
for (const url of urls) {
  if (SKIP.some((re) => re.test(url))) {
    console.log(`SKIP  ${url}`);
    continue;
  }
  if (!/^https?:/.test(url)) {
    const path = join(ROOT, url.split('?')[0]);
    const ok = await access(path).then(() => true, () => false);
    console.log(`${ok ? 'OK   ' : 'FAIL '} ${url}`);
    if (!ok) failed += 1;
    continue;
  }
  try {
    const res = await fetch(url, { redirect: 'follow' });
    console.log(`${res.ok ? 'OK   ' : 'FAIL '} ${res.status} ${url}`);
    if (!res.ok) failed += 1;
  } catch (err) {
    console.log(`FAIL  ${url} (${err.message})`);
    failed += 1;
  }
}
// assets/snake.svg is a placeholder until the first Action run, so it must exist locally.
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run the link check**

Run: `npm run check-links`
Expected: every `assets/...` path is `OK`; every `https://github.com/Sohan-Narewadi/...` repo URL is `OK 200`; the typing-svg URL is `OK 200`; LinkedIn, the two SIH repos, the portfolio and `mailto:` are `SKIP`. Exit code 0. Any `FAIL` is fixed at its source (`config.json`, `projects.json`, or the build code), then rebuild.

- [ ] **Step 3: Run the complete verification**

Run: `npm test && npm run build:offline && git status --short`
Expected: all tests pass; the offline build leaves no unexpected changes (`git status --short` empty or only files you intend to commit).

- [ ] **Step 4: Final whole-project review**

Invoke `superpowers:verification-before-completion`, then re-read `docs/superpowers/specs/2026-09-26-github-profile-design.md` and confirm each section (hero, about, stack, featured projects, currently working on, stats, snake, connect, dynamic behavior, error handling, testing) is implemented; list any gap and fix it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add link checker and finish verification" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Hand off for publishing (do NOT push)**

Tell the user, without running any of it:
1. Create an empty **public** repo named exactly `Sohan-Narewadi` on GitHub (no README, no .gitignore).
2. From `C:\Users\sohan\Sohan-Narewadi` run:
   ```
   git branch -M main
   git remote add origin https://github.com/Sohan-Narewadi/Sohan-Narewadi.git
   git push -u origin main
   ```
3. In the repo's **Actions** tab, run "Update profile" once (`Run workflow`) so the real contribution snake and fresh stats appear.
4. Replace the dummy portfolio URL in `config.json` when the site exists; the workflow rebuilds on push.

Ask the user whether they want Claude to do the push itself once they have created the empty repo and configured git credentials.

