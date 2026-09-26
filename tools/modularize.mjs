import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const srcPath = resolve(root, process.argv[2] || 'src/original.html');
const html = readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');

const out = (p, content) => {
  const full = resolve(root, p);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content.replace(/\s+$/, '') + '\n');
  console.log('wrote', p, (Buffer.byteLength(content) / 1024).toFixed(1) + ' KB');
};
const fail = (msg) => { console.error(msg); process.exit(1); };

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) fail('style block not found');

const bodyOpen = html.indexOf('<body>');
const dataScript = html.match(/<script>\s*(const paidData = \[[\s\S]*?)<\/script>\s*<\/body>/);
if (bodyOpen < 0 || !dataScript) fail('body or main script not found');

const markup = html.slice(bodyOpen + 6, dataScript.index).replace(/\s+$/, '');
const mainJs = dataScript[1];

const freeStart = mainJs.indexOf('\nconst freeData = [');
if (freeStart < 0) fail('freeData not found');
const paidEnd = mainJs.lastIndexOf('\n];', freeStart) + 3;
const freeEnd = mainJs.indexOf('\n];', freeStart) + 3;
const paidJs = mainJs.slice(0, paidEnd);
const freeJs = mainJs.slice(freeStart + 1, freeEnd);
let appJs = mainJs.slice(freeEnd).replace(/^\s*\n/, '');

const tokStart = appJs.indexOf('const TOKEN_SEARCH_FIELD_PRIORITY');
const tokEnd = appJs.indexOf('function getUniqueValues');
if (tokStart < 0 || tokEnd < tokStart) fail('legacy tokenizer block not found');
appJs = appJs.slice(0, appJs.lastIndexOf('\n', tokStart) + 1) + appJs.slice(appJs.lastIndexOf('\n', tokEnd) + 1);

appJs = appJs.replace('useExtendedSearch: true,', 'useExtendedSearch: true,\n            ignoreDiacritics: true,');
appJs = appJs.replace('lenientFuse.search(query)', 'lenientFuse.search(query, { limit: 60 })');
appJs = appJs.split('\n').map(l => l.replace(/^ {8}/, '')).join('\n');

const tail = html.slice(html.indexOf('</body>') + 7);
const bridge = (tail.match(/<script>([\s\S]*?)<\/script>/) || [, ''])[1].trim();

const headInner = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'))
  .replace(/\s*<script>\/\*\*[\s\S]*?Fuse\.js[\s\S]*?<\/script>/, '')
  .replace(/\s*<style>[\s\S]*?<\/style>/, '')
  .replace(/\s+$/, '');

const index = `<!DOCTYPE html>
<html lang="en">
<head>${headInner}
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/polish.css">
</head>

<body>${markup}

    <script src="vendor/fuse.min.js"></script>
    <script src="js/search-engine.js"></script>
    <script src="js/data/paid-data.js"></script>
    <script src="js/data/free-data.js"></script>
    <script src="js/app.js"></script>
${bridge ? '    <script src="js/embed-bridge.js"></script>\n' : ''}</body>
</html>
`;

out('css/styles.css', styleMatch[1].split('\n').map(l => l.replace(/^ {8}/, '')).join('\n').trim());
out('js/data/paid-data.js', paidJs);
out('js/data/free-data.js', freeJs);
out('js/app.js', appJs);
if (bridge) out('js/embed-bridge.js', bridge);
out('index.html', index);
if (!existsSync(resolve(root, 'css/polish.css'))) console.warn('css/polish.css missing');
console.log('done');
