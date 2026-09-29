(async function () {
  const out = document.getElementById('out');
  const btn = document.getElementById('download');
  const html = await (await fetch('../src/original.html')).text();
  const grab = (name) => {
    const s = html.indexOf('const ' + name + ' = [');
    const e = html.indexOf('\n];', s) + 3;
    return new Function(html.slice(s, e) + '; return ' + name + ';')();
  };
  const PH = new Set(['---', '--', '-', '', 'n/a', 'na', 'null', 'undefined']);
  const ta = document.createElement('textarea');
  const dec = (s) => { ta.innerHTML = String(s); return ta.value; };
  const clean = (v) => { if (v == null) return null; const s = dec(dec(v)).replace(/\s+/g, ' ').trim(); return PH.has(s.toLowerCase()) ? null : s; };
  const shape = (r, type) => {
    const o = { name: clean(r.name) || String(r.name) };
    ['activeIngredient', 'concentration', 'form'].forEach(k => { const v = clean(r[k]); if (v) o[k] = v; });
    if (type === 'paid' && Number.isFinite(Number(r.price))) o.price = Number(r.price);
    ['company', 'class', 'authority'].forEach(k => { const v = clean(r[k]); if (v) o[k] = v; });
    if (r._uniqueId) o.id = r._uniqueId;
    return o;
  };
  const data = {
    version: 'v3.0',
    updated: new Date().toISOString().slice(0, 10),
    paid: grab('paidData').map(r => shape(r, 'paid')),
    free: grab('freeData').map(r => shape(r, 'free'))
  };
  const text = JSON.stringify(data, null, 1);
  out.textContent = data.paid.length + ' paid + ' + data.free.length + ' free rows · ' + (text.length / 1024).toFixed(0) + ' KB';
  btn.disabled = false;
  btn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = 'formulary.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
})();
