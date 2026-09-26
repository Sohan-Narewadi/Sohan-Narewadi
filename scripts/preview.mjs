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
