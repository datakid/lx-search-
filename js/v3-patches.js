(function (g) {
  'use strict';
  g.LX_PATCHES = [
    ['function tokenSearch(query, dataset)', 'function legacyTokenSearch(query, dataset)'],
    ['useExtendedSearch: true,', 'useExtendedSearch: true, ignoreDiacritics: true,'],
    ['lenientFuse.search(query)', 'lenientFuse.search(query, { limit: 60 })'],
    ['<h1 class="title">Lx Search a2</h1>', '<h1 class="title"><svg class="brand-mark" viewBox="0 0 150 150" aria-hidden="true" focusable="false"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="15"><path class="brand-mark-back" d="M112 44L38 68M112 80L38 104"/><path class="brand-mark-front" d="M38 22H62L112 44M38 68L112 80M38 104L112 116Q124 124 110 132L88 134"/></g></svg><span class="title-text">Lx Search</span><span class="title-version">3</span></h1>'],
    ['app-version-tag">a2<', 'app-version-tag">v3<'],
    ['<link rel="icon" type="image/x-icon" href="favicon.ico">', '<link rel="icon" type="image/svg+xml" href="favicon.svg">'],
    ['<link rel="apple-touch-icon" href="icon-192.png">', '<link rel="apple-touch-icon" href="icon-spring.jpg">'],
    ['content="#0d1117"', 'content="#0a0911"'],
    ['content="#fafbfc"', 'content="#f7f5f1"'],
    ['content="width=device-width, initial-scale=1.0"', 'content="width=device-width, initial-scale=1, viewport-fit=cover"'],
    ['id="search-input"', 'id="search-input" inputmode="search" enterkeyhint="search" autocapitalize="off" autocorrect="off" spellcheck="false"'],
    ["performSearch(q, 'user_input'), 80)", "performSearch(q, 'user_input'), 45)"],
    ['commitToHistoryIfEligible(q), 900)', 'commitToHistoryIfEligible(q), 1600)'],
    ['function initializeApp() {', 'function initializeApp() { if (window.LxData) LxData.apply(paidData, freeData);'],
    ["data-item-raw-details='${rawDetails}'", "data-item-raw-details='${escapeHTML(rawDetails)}'"],
    ["String(a.item.name || '').localeCompare(String(b.item.name || ''))", "String(a.item.name || '').localeCompare(String(b.item.name || ''), undefined, { numeric: true, sensitivity: 'base' })"],
    ["String(b.item.name || '').localeCompare(String(a.item.name || ''))", "String(b.item.name || '').localeCompare(String(a.item.name || ''), undefined, { numeric: true, sensitivity: 'base' })"],
    ["Number(a.item.price || 0) - Number(b.item.price || 0)", "(Number(a.item.price) || 0) - (Number(b.item.price) || 0)"],
    ["Number(b.item.price || 0) - Number(a.item.price || 0)", "(Number(b.item.price) || 0) - (Number(a.item.price) || 0)"],
    ["e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {", "e.code === 'KeyC' && (e.ctrlKey || e.metaKey) && !String(window.getSelection() || '')) {"],
    ["activeSecondaryFilters[key] = '';", "activeSecondaryFilters[key] = ''; invalidateFilterSearchIndex();"],
    ["window.addEventListener('resize', () => {\n            updateAvailabilityUI();", "window.addEventListener('resize', () => {"],
    ['navigator.clipboard.writeText(textToCopy).catch(() => {});', "if (navigator.clipboard) navigator.clipboard.writeText(textToCopy).catch(() => {});"]
  ];
  g.applyLxPatches = function (text) {
    let out = String(text).replace(/\r\n/g, '\n');
    const missed = [];
    for (const [from, to] of g.LX_PATCHES) {
      if (out.indexOf(from) === -1) { missed.push(from); continue; }
      out = out.replace(from, () => to);
    }
    return { text: out, missed };
  };
})(typeof window !== 'undefined' ? window : globalThis);
