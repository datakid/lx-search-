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
    html = html.replace('</head>', '<link rel="stylesheet" href="css/polish.css"></head>');
    document.open();
    document.write(html);
    document.close();
  } catch (e) {
    document.body.textContent = 'Run "node tools/modularize.mjs" to build the app (' + e.message + ').';
  }
})();
