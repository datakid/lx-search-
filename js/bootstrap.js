(async function () {
  const S = 'script';
  const tag = (src) => '<' + S + ' src="' + src + '"></' + S + '>';
  try {
    const res = await fetch('src/original.html', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let html = (await res.text()).replace(/\r\n/g, '\n');
    const fuseStart = html.indexOf('<' + S + '>/**');
    const fuseEnd = html.indexOf('</' + S + '>', fuseStart);
    if (fuseStart < 0 || fuseEnd < 0) throw new Error('Fuse block not found');
    html = html.slice(0, fuseStart) + tag('vendor/fuse.min.js') + tag('js/search-engine.js') + tag('js/data-store.js') + html.slice(fuseEnd + S.length + 3);
    const patched = window.applyLxPatches(html);
    if (patched.missed.length) console.warn('Lx v3: patches not applied', patched.missed);
    html = patched.text
      .replace('</head>', '<link rel="stylesheet" href="css/polish.css"><link rel="stylesheet" href="css/v3.css"></head>')
      .replace('</body>', tag('js/v3-ui.js') + '</body>');
    document.open();
    document.write(html);
    document.close();
  } catch (e) {
    document.body.textContent = 'Lx Search could not load (' + e.message + '). Run "node tools/modularize.mjs" to build.';
  }
})();
