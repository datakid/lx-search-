(async function () {
  const S = 'script';
  const open = '<' + S;
  const close = '</' + S + '>';
  try {
    const res = await fetch('src/original.html', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let html = await res.text();
    html = html.replace(new RegExp(open + '>\\/\\*\\*[\\s\\S]*?Fuse\\.js[\\s\\S]*?' + close.replace('/', '\\/')),
      open + ' src="vendor/fuse.min.js">' + close + open + ' src="js/search-engine.js">' + close);
    html = html.replace('function tokenSearch(query, dataset)', 'function legacyTokenSearch(query, dataset)');
    html = html.replace('useExtendedSearch: true,', 'useExtendedSearch: true, ignoreDiacritics: true,');
    html = html.replace('lenientFuse.search(query)', 'lenientFuse.search(query, { limit: 60 })');
    html = html.replace('Lx Search a2</h1>', 'Lx Search <span class="title-version">2.5</span></h1>')
      .replace('app-version-tag">a2<', 'app-version-tag">v2.5<')
      .replace('<link rel="icon" type="image/x-icon" href="favicon.ico">', '<link rel="icon" href="favicon.ico" sizes="32x32"><link rel="icon" type="image/svg+xml" href="favicon.svg">')
      .replace('content="#0d1117"', 'content="#0a0911"').replace('content="#fafbfc"', 'content="#f7f5f1"');
    html = html.replace('</head>', '<link rel="stylesheet" href="css/polish.css"></head>');
    document.open();
    document.write(html);
    document.close();
  } catch (e) {
    document.body.textContent = 'Run "node tools/modularize.mjs" to build the app (' + e.message + ').';
  }
})();
