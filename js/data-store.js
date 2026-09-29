(function (global) {
  'use strict';
  const KEY = 'lxDataV3';
  const URL_JSON = 'data/formulary.json';
  const FIELDS = ['name', 'activeIngredient', 'concentration', 'form', 'price', 'company', 'class', 'authority', '_uniqueId'];

  function autoId(type, r) {
    return type + '_' + (String(r.name) + ' ' + (r.concentration == null || r.concentration === '' ? '---' : String(r.concentration))).toLowerCase().replace(/\s+/g, '_');
  }

  function normalizeRow(r, type) {
    if (!r || typeof r !== 'object' || !r.name) return null;
    const o = {};
    for (const f of FIELDS) if (r[f] !== undefined && r[f] !== null) o[f] = r[f];
    if (r.id && !o._uniqueId) o._uniqueId = String(r.id);
    if (!o._uniqueId) o._uniqueId = autoId(type, o);
    if (type === 'free') o.price = 0;
    for (const f of ['activeIngredient', 'concentration', 'form', 'company', 'class', 'authority']) if (o[f] === undefined) o[f] = '---';
    return o;
  }

  function validate(json) {
    if (!json || !Array.isArray(json.paid) || !Array.isArray(json.free)) throw new Error('JSON must contain "paid" and "free" arrays');
    const paid = json.paid.map(r => normalizeRow(r, 'paid')).filter(Boolean);
    const free = json.free.map(r => normalizeRow(r, 'free')).filter(Boolean);
    if (!paid.length && !free.length) throw new Error('JSON contains no rows');
    return { version: String(json.version || ''), updated: String(json.updated || ''), paid, free };
  }

  function readCache() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function apply(paidArr, freeArr) {
    const c = readCache();
    if (!c || !Array.isArray(c.paid) || !Array.isArray(c.free)) { state.source = 'baked'; return; }
    paidArr.length = 0; Array.prototype.push.apply(paidArr, c.paid);
    freeArr.length = 0; Array.prototype.push.apply(freeArr, c.free);
    state.source = 'remote';
    state.version = c.version;
    state.updated = c.updated;
    state.fetchedAt = c.fetchedAt;
  }

  async function refresh() {
    const res = await fetch(URL_JSON + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 404 ? 'No data/formulary.json published yet' : 'HTTP ' + res.status);
    const data = validate(await res.json());
    const prev = readCache();
    const same = prev && JSON.stringify(prev.paid) === JSON.stringify(data.paid) && JSON.stringify(prev.free) === JSON.stringify(data.free);
    data.fetchedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { throw new Error('Browser storage is full or disabled'); }
    return { changed: !same, rows: data.paid.length + data.free.length };
  }

  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} }

  const state = { source: 'baked', version: '', updated: '', fetchedAt: 0 };
  global.LxData = { state, apply, refresh, reset, validate };
})(window);
