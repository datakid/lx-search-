# Lx Search

Formulary lookup: coverage, price, prescribing authority and covered equivalents.

## Layout after build
```
index.html
css/styles.css          original styles
css/polish.css          UI polish layer
vendor/fuse.min.js      Fuse.js 7.2.0 (was 6.6.2)
js/search-engine.js     new indexed typo-tolerant tokenizer (replaces tokenSearch)
js/data/paid-data.js    paidData
js/data/free-data.js    freeData
js/app.js               app logic
js/embed-bridge.js      iframe title bridge
.github/workflows/build.yml
tools/modularize.mjs    splits src/original.html into the files above
```

## How to build
Push to `main` on GitHub (or run `node tools/modularize.mjs` yourself). The workflow:
1. splits `src/original.html` into modules, removes the old inline tokenizer and Fuse 6
2. runs `node --check` on every file
3. commits the modular sources and removes the monolith
4. minifies into `dist/` and deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions)

Until that first build, `index.html` + `js/bootstrap.js` run the original file with the upgrades injected, so the preview works right away.

## Search engine
- Inverted index built once per dataset (~20 ms for 1,261 items), cached queries ~0.02 ms, cold queries 0.1–3 ms
- Typo handling: OSA edit distance (swapped letters count as 1), phonetic skeleton (ph/f, c/k/s, z/s, y/i, vowels removed), prefix typos while typing, infix matches
- Handles casual input: `500mg` = `500 mg`, units optional, stop words ignored, form aliases (tablet→tab, capsule→cap…), Arabic letter and digit folding, diacritics
- If one word in a multi-word query matches nothing, you still get results for the rest
- Ranking: exact name > name prefix > field weight > typo cost > shorter name
- Fuse 7 is still used as the fallback, for suggestions (`limit: 60`, heap-based) and for filter search, with `ignoreDiacritics`

## Visual system (v2.5)
`css/polish.css` re-tokens the palette without touching `styles.css`:
- Light: warm off-white base, low-chroma violet accent `#6c58d4`, frosted white glass, soft neumorphic raise and inset shadows
- Dark: violet-tinted ink `#0a0911`, muted accent `#ab9bf7`, low-opacity glass with a thin top highlight edge
- The blurred animated orb is replaced by a static radial gradient (no ongoing GPU animation), and blur is lighter on phones
- Respects reduced transparency, reduced motion and forced colors

## Tests
`tests/search.html` benchmarks the engine against the real data.

## Not included
- Brand names that aren't in the data (e.g. Panadol, Augmentin) still rely on the existing synonym map
- `sw.js` is referenced but not in the upload (gives a harmless 404)
