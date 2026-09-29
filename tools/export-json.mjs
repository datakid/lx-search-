import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const html = readFileSync(resolve(root, 'src/original.html'), 'utf8').replace(/\r\n/g, '\n');
const grab = (name) => {
  const s = html.indexOf('const ' + name + ' = [');
  const e = html.indexOf('\n];', s) + 3;
  return new Function(html.slice(s, e) + '; return ' + name + ';')();
};
const PH = new Set(['---', '--', '-', '', 'n/a', 'na', 'null', 'undefined']);
const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const dec1 = (s) => String(s).replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (named[e] || m));
const clean = (v) => { if (v == null) return null; const s = dec1(dec1(v)).replace(/\s+/g, ' ').trim(); return PH.has(s.toLowerCase()) ? null : s; };
const shape = (r, type) => {
  const o = { name: clean(r.name) || String(r.name) };
  for (const k of ['activeIngredient', 'concentration', 'form']) { const v = clean(r[k]); if (v) o[k] = v; }
  if (type === 'paid' && Number.isFinite(Number(r.price))) o.price = Number(r.price);
  for (const k of ['company', 'class', 'authority']) { const v = clean(r[k]); if (v) o[k] = v; }
  if (r._uniqueId) o.id = r._uniqueId;
  return o;
};
const data = {
  version: process.argv[2] || 'v3.0',
  updated: new Date().toISOString().slice(0, 10),
  paid: grab('paidData').map(r => shape(r, 'paid')),
  free: grab('freeData').map(r => shape(r, 'free'))
};
const out = resolve(root, 'data/formulary.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
console.log('wrote data/formulary.json', data.paid.length, 'paid', data.free.length, 'free');
