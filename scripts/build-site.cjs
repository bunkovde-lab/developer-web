'use strict';
// Produce an isolated static build from the current checkout.
// Shared by GitHub Actions downloadable previews and Cloudflare Pages previews.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const arg = process.argv.indexOf('--out');
const outName = arg === -1 ? 'dist' : process.argv[arg + 1];
if (!outName || path.isAbsolute(outName) || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(outName)) {
  throw new Error('Output must be a simple relative directory name, e.g. dist');
}
const output = path.join(root, outName);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const copy = name => fs.copyFileSync(path.join(root, name), path.join(output, name));
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Missing game entrypoint index.html');
copy('index.html');
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && /\.(?:js|css)$/i.test(entry.name)) copy(entry.name);
}
if (fs.existsSync(path.join(root, 'assets'))) {
  fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
}
// Portal: the public front door lives at the site root; the game moves next to it as game.html,
// so every relative asset path of the game keeps working unchanged.
const portal = path.join(root, 'portal');
const pages = ['index.html'];
if (fs.existsSync(path.join(portal, 'index.html'))) {
  fs.renameSync(path.join(output, 'index.html'), path.join(output, 'game.html'));
  fs.copyFileSync(path.join(portal, 'index.html'), path.join(output, 'index.html'));
  for (const rootFile of ['sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(portal, rootFile), path.join(output, rootFile));
  fs.mkdirSync(path.join(output, 'portal'), { recursive: true });
  for (const entry of fs.readdirSync(portal, { withFileTypes: true })) {
    if (entry.isFile() && !['index.html', 'sw.js', 'manifest.webmanifest'].includes(entry.name)) {
      fs.copyFileSync(path.join(portal, entry.name), path.join(output, 'portal', entry.name));
    }
  }
  pages.push('game.html');
}
const refs = pages.flatMap(page => [...fs.readFileSync(path.join(output, page), 'utf8')
  .matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]));
const missing = [];
for (const ref of refs) {
  const clean = ref.split('?')[0].split('#')[0];
  if (!clean || /^(?:https?:|data:|\/\/)/i.test(clean)) continue;
  let local;
  try { local = decodeURIComponent(clean); }
  catch { missing.push(ref + ' (invalid encoding)'); continue; }
  if (local.startsWith('/') || local.split('/').includes('..') || local.includes('\\')) {
    missing.push(ref + ' (unsafe path)');
    continue;
  }
  if (!fs.existsSync(path.join(output, local))) missing.push(ref);
}
if (missing.length) {
  console.error('Missing/unsafe local references:\n' + missing.join('\n'));
  process.exit(1);
}
const details = [
  'Game version: 0.27.0 — Online Rooms',
  'Source commit: ' + (process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || 'local'),
  'PR number: ' + (process.env.PR_NUMBER || 'not specified'),
  'Build type: ' + (process.env.CF_PAGES ? 'Cloudflare Pages' : 'GitHub/local'),
  'Validated script/link references: ' + refs.length,
];
fs.writeFileSync(path.join(output, 'BUILD_INFO.txt'), details.join('\n') + '\n');
console.log('Built ' + outName + '/ — ' + details.join('; '));
