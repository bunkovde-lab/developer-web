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
const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
  .map(match => match[1]);
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
  'Source commit: ' + (process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA || 'local'),
  'PR number: ' + (process.env.PR_NUMBER || 'not specified'),
  'Build type: ' + (process.env.CF_PAGES ? 'Cloudflare Pages' : 'GitHub/local'),
  'Validated script/link references: ' + refs.length,
];
fs.writeFileSync(path.join(output, 'BUILD_INFO.txt'), details.join('\n') + '\n');
console.log('Built ' + outName + '/ — ' + details.join('; '));
