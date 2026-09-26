(function (global) {
  'use strict';

  const FIELDS = ['name', 'activeIngredient', 'class', 'company', 'authority', 'concentration', 'form', '_type'];
  const FIELD_COST = [0, 0.35, 0.9, 1.3, 1.6, 1.1, 1.3, 1.8];
  const UNIT_WORDS = new Set(['mg', 'mcg', 'ug', 'g', 'gm', 'ml', 'l', 'iu', 'unit', 'units', 'pct', 'percent', 'mmol', 'meq']);
  const STOP_WORDS = new Set(['for', 'the', 'a', 'an', 'of', 'and', 'with', 'in', 'to', 'on', 'drug', 'drugs', 'medicine', 'medicines', 'med', 'meds', 'pill', 'pills', 'medication']);
  const ALIASES = {
    tablet: 'tab', tablets: 'tab', tabs: 'tab', tabl: 'tab', capsule: 'cap', capsules: 'cap', caps: 'cap',
    ampoule: 'amp', ampoules: 'amp', ampule: 'amp', injection: 'inj', injections: 'inj', suppository: 'supp',
    suppositories: 'supp', suspension: 'susp', solution: 'sol', soln: 'sol', syrp: 'syrup', sirup: 'syrup',
    ointment: 'oint', drops: 'drop', sachets: 'sachet', patches: 'patch', vials: 'vial', creme: 'cream',
    acetaminophen: 'paracetamol', albuterol: 'salbutamol', vit: 'vitamin', vitamine: 'vitamin', antibiotics: 'antibiotic'
  };
  const ARABIC_FOLD = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' };
  const RUN_RE = /[\p{L}\p{N}]+/gu;
  const PART_RE = /\p{N}+(?:[.,]\p{N}+)?|\p{L}+/gu;
  const DEC_RE = /\d+[.,]\d+/g;
  const QUERY_RE = /\d+(?:[.,]\d+)?\p{L}*|[\p{L}\p{N}]+/gu;
  const LETTERS_RE = /^\p{L}+$/u;
  const HAS_DIGIT = /\d/;
  const HAS_NON_DIGIT = /\D/;

  const foldCache = new Map();
  function foldChar(ch) {
    let r = foldCache.get(ch);
    if (r !== undefined) return r;
    const code = ch.charCodeAt(0);
    if (code >= 0x660 && code <= 0x669) r = String(code - 0x660);
    else if (code >= 0x6F0 && code <= 0x6F9) r = String(code - 0x6F0);
    else if (ARABIC_FOLD[ch]) r = ARABIC_FOLD[ch];
    else if (code >= 0xD800 && code <= 0xDFFF) r = ch;
    else {
      const n = ch.normalize('NFD').charAt(0).toLowerCase();
      r = n.length === 1 ? n : ch;
    }
    foldCache.set(ch, r);
    return r;
  }
  function fold(str) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 65) out += str[i];
      else if (c < 91) out += String.fromCharCode(c + 32);
      else if (c < 128) out += str[i];
      else out += foldChar(str[i]);
    }
    return out;
  }

  function skeleton(w) {
    let s = w.replace(/ph/g, 'f').replace(/th/g, 't').replace(/gh/g, 'g').replace(/c(?=[eiy])/g, 's')
      .replace(/[cq]/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's').replace(/y/g, 'i').replace(/w/g, 'v');
    s = s.charAt(0) + s.slice(1).replace(/[aeiouh]/g, '');
    return s.replace(/(.)\1+/g, '$1');
  }

  let rowA = new Int32Array(48), rowB = new Int32Array(48), rowC = new Int32Array(48);
  function osa(a, b, max) {
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    if (lb + 1 > rowA.length) { rowA = new Int32Array(lb + 1); rowB = new Int32Array(lb + 1); rowC = new Int32Array(lb + 1); }
    let p2 = rowA, p1 = rowB, cur = rowC;
    for (let j = 0; j <= lb; j++) p1[j] = j;
    for (let i = 1; i <= la; i++) {
      cur[0] = i;
      let min = i;
      const ca = a.charCodeAt(i - 1);
      const pa = i > 1 ? a.charCodeAt(i - 2) : -1;
      for (let j = 1; j <= lb; j++) {
        const cb = b.charCodeAt(j - 1);
        let v = p1[j - 1] + (ca === cb ? 0 : 1);
        const del = p1[j] + 1; if (del < v) v = del;
        const ins = cur[j - 1] + 1; if (ins < v) v = ins;
        if (j > 1 && ca === b.charCodeAt(j - 2) && pa === cb) { const tr = p2[j - 2] + 1; if (tr < v) v = tr; }
        cur[j] = v;
        if (v < min) min = v;
      }
      if (min > max) return max + 1;
      const t = p2; p2 = p1; p1 = cur; cur = t;
    }
    return p1[lb];
  }

  function lowerBound(arr, key) {
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (arr[mid] < key) lo = mid + 1; else hi = mid; }
    return lo;
  }

  function buildIndex(dataset) {
    const vocab = new Map();
    const names = new Array(dataset.length);
    const add = (w, i, f, s) => { let p = vocab.get(w); if (!p) { p = []; vocab.set(w, p); } p.push(i, f, s); };
    for (let i = 0; i < dataset.length; i++) {
      const item = dataset[i];
      for (let f = 0; f < FIELDS.length; f++) {
        const raw = item[FIELDS[f]];
        if (raw === null || raw === undefined || raw === '') continue;
        const text = fold(String(raw));
        if (f === 0) names[i] = text;
        RUN_RE.lastIndex = 0;
        let m;
        while ((m = RUN_RE.exec(text)) !== null) {
          const w = m[0];
          add(w, i, f, m.index);
          if (HAS_DIGIT.test(w) && HAS_NON_DIGIT.test(w)) {
            PART_RE.lastIndex = 0;
            let p;
            while ((p = PART_RE.exec(w)) !== null) add(p[0], i, f, m.index + p.index);
          }
        }
        DEC_RE.lastIndex = 0;
        while ((m = DEC_RE.exec(text)) !== null) add(m[0], i, f, m.index);
      }
      if (names[i] === undefined) names[i] = '';
    }
    const words = Array.from(vocab.keys()).sort();
    const skeletons = new Map();
    for (const w of words) {
      if (w.length < 4 || !LETTERS_RE.test(w)) continue;
      const k = skeleton(w);
      let list = skeletons.get(k);
      if (!list) { list = []; skeletons.set(k, list); }
      list.push(w);
    }
    return {
      size: dataset.length, first: dataset[0], vocab, words, names,
      skeletons, skeletonKeys: Array.from(skeletons.keys()),
      tokenCache: new Map(), hitCache: new Map()
    };
  }

  const indexes = new WeakMap();
  function getIndex(dataset) {
    let ix = indexes.get(dataset);
    if (!ix || ix.size !== dataset.length || ix.first !== dataset[0]) {
      ix = buildIndex(dataset);
      indexes.set(dataset, ix);
    }
    return ix;
  }

  function remember(cache, key, value, limit) {
    if (cache.size >= limit) cache.delete(cache.keys().next().value);
    cache.set(key, value);
    return value;
  }

  function hasDirect(ix, t) {
    if (ix.vocab.has(t)) return true;
    const k = lowerBound(ix.words, t);
    return k < ix.words.length && ix.words[k].startsWith(t);
  }

  function resolveToken(ix, t) {
    const cached = ix.tokenCache.get(t);
    if (cached) return cached;
    const out = new Map();
    const put = (w, cost, off, len) => {
      const prev = out.get(w);
      if (!prev || cost < prev.cost) out.set(w, { cost, off, len });
    };
    const words = ix.words;
    const isNum = HAS_DIGIT.test(t.charAt(0));
    const tl = t.length;
    if (ix.vocab.has(t)) put(t, 0, 0, tl);
    for (let k = lowerBound(words, t); k < words.length; k++) {
      const w = words[k];
      if (!w.startsWith(t)) break;
      if (w !== t) put(w, 1 + Math.min(0.8, (w.length - tl) / 12), 0, tl);
    }
    if (!isNum && tl >= 4) {
      for (let n = tl - 1; n >= Math.max(3, tl - 4); n--) {
        const w = t.slice(0, n);
        if (ix.vocab.has(w)) { put(w, 1.7, 0, n); break; }
      }
    }
    const direct = out.size > 0;
    if (!isNum && tl >= 3) {
      for (let k = 0; k < words.length; k++) {
        const w = words[k];
        if (w.length <= tl) continue;
        const at = w.indexOf(t);
        if (at > 0) put(w, 2.4, at, tl);
      }
    }
    if (!direct && !isNum && tl >= 4 && LETTERS_RE.test(t)) {
      const max = tl <= 5 ? 1 : tl <= 9 ? 2 : 3;
      const pmax = tl <= 6 ? 1 : 2;
      const c0 = t.charCodeAt(0);
      for (let k = 0; k < words.length; k++) {
        const w = words[k];
        const dl = w.length - tl;
        const firstPenalty = w.charCodeAt(0) === c0 ? 0 : 0.6;
        const lim = firstPenalty ? max - 1 : max;
        if (lim > 0 && dl >= -lim && dl <= lim) {
          const d = osa(t, w, lim);
          if (d <= lim) put(w, 3 + d + firstPenalty, 0, w.length);
        }
        if (tl >= 5 && dl > 0 && firstPenalty === 0) {
          let d = osa(t, w.slice(0, tl), pmax);
          if (d > pmax && dl > 1) d = osa(t, w.slice(0, tl + 1), pmax);
          if (d <= pmax) put(w, 3.4 + d, 0, Math.min(w.length, tl));
        }
      }
      const sk = skeleton(t);
      if (sk.length >= 3) {
        for (const key of ix.skeletonKeys) {
          if (key === sk) { for (const w of ix.skeletons.get(key)) put(w, 2.6, 0, w.length); }
          else if (tl >= 5 && key.length > sk.length && key.startsWith(sk)) { for (const w of ix.skeletons.get(key)) put(w, 3.2, 0, Math.min(w.length, tl)); }
        }
      }
    }
    return remember(ix.tokenCache, t, out, 400);
  }

  function collect(ix, t) {
    const cached = ix.hitCache.get(t);
    if (cached) return cached;
    const hits = new Map();
    const scan = (cands) => {
      for (const [w, cand] of cands) {
        const postings = ix.vocab.get(w);
        if (!postings) continue;
        const base = cand.cost * 2;
        for (let k = 0; k < postings.length; k += 3) {
          const i = postings[k], f = postings[k + 1], s = postings[k + 2];
          const c = base + FIELD_COST[f] + (s === 0 ? 0 : 0.15);
          const prev = hits.get(i);
          if (!prev || c < prev.c) hits.set(i, { c, f, s: s + cand.off, l: cand.len });
        }
      }
    };
    scan(resolveToken(ix, t));
    const alias = ALIASES[t];
    if (alias && alias !== t) scan(resolveToken(ix, alias));
    return remember(ix.hitCache, t, hits, 64);
  }

  function parseQuery(ix, query) {
    const raw = fold(String(query)).match(QUERY_RE) || [];
    const meaningful = raw.filter(t => !STOP_WORDS.has(t));
    const tokens = meaningful.length ? meaningful : raw;
    const seen = new Set();
    const terms = [];
    const push = (text, optional) => { if (!seen.has(text)) { seen.add(text); terms.push({ text, optional }); } };
    for (const tok of tokens) {
      const du = tok.match(/^(\d+(?:[.,]\d+)?)(\p{L}+)$/u);
      if (du && UNIT_WORDS.has(du[2])) {
        push(du[1], false);
        push(du[2], true);
      } else if (HAS_DIGIT.test(tok) && HAS_NON_DIGIT.test(tok) && !/^\d+[.,]\d+$/.test(tok) && !hasDirect(ix, tok)) {
        const parts = tok.match(PART_RE) || [tok];
        for (const p of parts) push(p, UNIT_WORDS.has(p));
      } else {
        push(tok, UNIT_WORDS.has(tok));
      }
    }
    if (terms.length && terms.every(t => t.optional)) terms.forEach(t => { t.optional = false; });
    return terms;
  }

  function tokenSearch(query, dataset) {
    if (!query || !dataset || dataset.length === 0) return [];
    const ix = getIndex(dataset);
    const terms = parseQuery(ix, query);
    if (!terms.length) return [];
    const req = [], optional = [];
    for (const t of terms) {
      const hits = collect(ix, t.text);
      if (t.optional) optional.push(hits); else req.push({ hits, len: t.text.length });
    }
    req.sort((a, b) => a.hits.size - b.hits.size);
    const required = req.map(r => r.hits);
    const n = required.length;
    const minHits = n >= 2 ? n - 1 : n;
    const candidates = new Map();
    let strictCount = 0;
    const smallest = required[0];
    for (const [i] of smallest) {
      let ok = true;
      for (let r = 1; r < n; r++) if (!required[r].has(i)) { ok = false; break; }
      if (ok) { candidates.set(i, 0); strictCount++; }
    }
    if (strictCount === 0 && n >= 2) {
      const missCost = req.map(r => 2 + Math.min(12, r.len) * 1.6 + 6 * (1 - Math.min(1, r.hits.size / 40)));
      const counts = new Map();
      for (const hits of required) for (const [i] of hits) counts.set(i, (counts.get(i) || 0) + 1);
      for (const [i, c] of counts) {
        if (c < minHits) continue;
        let pen = 0;
        for (let r = 0; r < n; r++) if (!required[r].has(i)) pen += missCost[r];
        candidates.set(i, pen);
      }
    }
    if (candidates.size === 0) return [];

    const phrase = terms.map(t => t.text).join(' ');
    const firstTerm = terms[0].text;
    const results = [];
    for (const [i, missing] of candidates) {
      let total = missing;
      let inName = 0;
      const byKey = {};
      const addMatch = (h) => {
        const key = FIELDS[h.f];
        (byKey[key] || (byKey[key] = [])).push([h.s, h.s + h.l - 1]);
      };
      for (const hits of required) {
        const h = hits.get(i);
        if (!h) continue;
        total += h.c;
        if (h.f === 0) inName++;
        addMatch(h);
      }
      for (const hits of optional) {
        const h = hits.get(i);
        if (h) { total -= 0.3; addMatch(h); }
      }
      const name = ix.names[i];
      if (name === phrase) total -= 3;
      else if (name.startsWith(phrase)) total -= 1.6;
      else if (name.startsWith(firstTerm)) total -= 0.8;
      if (n > 1 && inName === n) total -= 0.5;
      const t = Math.max(0, total + 3);
      const score = t / (t + 4 * Math.max(1, n));
      const matches = [];
      for (const key in byKey) matches.push({ key, indices: byKey[key] });
      results.push({ item: dataset[i], score, matches, _i: i, _nl: name.length });
    }
    results.sort((a, b) => (a.score - b.score) || (a._nl - b._nl) || (a._i - b._i));
    for (const r of results) { delete r._i; delete r._nl; }
    return results;
  }

  function warm() {
    const sets = [];
    try { if (typeof allDatasetNormalized !== 'undefined') sets.push(allDatasetNormalized); } catch (e) {}
    try { if (typeof paidData !== 'undefined') sets.push(paidData); } catch (e) {}
    try { if (typeof freeData !== 'undefined') sets.push(freeData); } catch (e) {}
    sets.forEach(s => { if (Array.isArray(s) && s.length) getIndex(s); });
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('load', () => {
      const idle = global.requestIdleCallback || ((fn) => setTimeout(fn, 200));
      idle(warm);
    });
  }

  global.LxSearch = { version: '2.1', tokenSearch, getIndex, fold, skeleton, warm };
  global.tokenSearch = tokenSearch;
})(typeof window !== 'undefined' ? window : globalThis);
