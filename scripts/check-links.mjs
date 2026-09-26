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
