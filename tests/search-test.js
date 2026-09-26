(async function () {
  const out = document.getElementById('out');
  const log = (s) => { out.textContent += s + '\n'; console.log(s); };
  let paid, free;
  if (typeof paidData !== 'undefined') {
    paid = paidData;
    free = typeof freeData !== 'undefined' ? freeData : [];
  } else {
    const html = await (await fetch('../src/original.html')).text();
    const grab = (name) => {
      const s = html.indexOf('const ' + name + ' = [');
      const e = html.indexOf('\n];', s) + 3;
      return new Function(html.slice(s, e) + '; return ' + name + ';')();
    };
    paid = grab('paidData');
    free = grab('freeData');
  }
  const all = paid.concat(free || []);
  let t0 = performance.now();
  LxSearch.getIndex(all);
  log('engine ' + LxSearch.version + ' items ' + all.length + ' index ms ' + (performance.now() - t0).toFixed(1));
  const queries = ['celebrex', 'celebrx', 'celbrex 200', 'selebrex', 'amoxcilin', 'amoxicilin 500', 'paracetamol', 'paracetmol syrup', 'panadol', 'metformin 500mg', 'metfromin', 'ibuprofin', 'omeprazol', 'antibiotic', 'antibiotc tab', 'zink', 'vitamin d', 'insuline', 'diclofenc gel', 'augmntin', 'ciprofloxacine', 'cefriaxone', 'azithromicin', 'atorvastatine 20', 'amlodipin 5 mg'];
  for (const q of queries) {
    t0 = performance.now();
    const r = tokenSearch(q, all);
    const ms = (performance.now() - t0).toFixed(1);
    log(q.padEnd(20) + ' ' + String(r.length).padStart(4) + ' ' + ms.padStart(6) + 'ms  ' + r.slice(0, 3).map(x => x.item.name).join(' | '));
  }
  const ix = LxSearch.getIndex(all);
  log('dbg: ' + ['diclofenc', 'cefriaxone', 'augmntin', 'panadol'].map(w => w + '=' + tokenSearch(w, all).slice(0, 3).map(x => x.item.name + '/' + x.item.activeIngredient).join(',')).join(' ; '));
  log('vocab: ' + ['diclofenac', 'ceftriaxone', 'augmentin', 'omeprazole'].map(w => w + '=' + ix.words.filter(x => x.startsWith(w.slice(0, 5))).join('/')).join(' '));
  t0 = performance.now();
  for (let i = 0; i < 20; i++) tokenSearch('amoxcilin 500', all);
  log('repeat avg ms ' + ((performance.now() - t0) / 20).toFixed(2));
})();
