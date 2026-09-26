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
