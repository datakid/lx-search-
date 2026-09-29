# Lx Search v3

Formulary lookup: coverage, price, prescribing authority and covered equivalents for 1,261 medications (155 paid, 1,106 free).

## What's new in v3
- **Hybrid data**: the data is still built into the app, so it works offline and loads instantly. Tapping **Refresh** in the footer downloads `data/formulary.json`, checks it, caches it on the device, and reloads. Long-press or right-click Refresh to go back to the built-in data.
- **Faster**:
  - Indexed search engine replaces the old per-item linear scan (~0.1–3 ms per query).
  - Fuse 7 is loaded as a cacheable file instead of 30 KB of inline script.
  - Search waits 45 ms after typing (was 80 ms).
  - No glass blur on phones, and cards don't lift on hover on touch screens.
- **Service worker**: loads the app shell from the network first and falls back to the cache, so updates show up immediately. The old worker cached `lx-search-v2.html`, which no longer exists. `formulary.json` is never cached by the worker.
- **Mobile**:
  - `viewport-fit=cover` and safe-area padding.
  - The search field gets a search keyboard with no autocorrect or auto-capitalisation.
  - 16 px input text so iOS doesn't zoom in.
  - The Refresh button collapses to an icon.
- **Bug fixes**:
  - Table "More actions" menu broke on names containing `'` (unescaped attribute).
  - Removing a filter chip left the filter-search index out of date.
  - Ctrl/⌘+C on a focused card replaced text you had selected yourself.
  - Name sort was not numeric-aware ("Amaryl 10" sorted before "Amaryl 2").
  - Price sort treated missing prices incorrectly.
  - Changing the window size re-rendered the availability UI every time.
  - Copy crashed when the clipboard API was unavailable.

## Files
```
index.html               entry point: loads js/v3-patches.js + js/bootstrap.js
src/original.html        source app (markup, styles, built-in data, logic)
js/v3-patches.js         list of v3 fixes applied to the source at load time
js/bootstrap.js          loads the source, swaps inline Fuse 6 for vendor Fuse 7 + engine, applies patches
js/search-engine.js      indexed, typo-tolerant search (LxSearch)
js/data-store.js         LxData: validate, cache and apply formulary.json
js/v3-ui.js              Refresh button, data-source label, toasts
css/polish.css           v2.5 visual system
css/v3.css               v3 refinements and mobile performance
vendor/fuse.min.js       Fuse.js 7.2.0
favicon.svg              spring logo (favicon, title mark, PWA icon)
icon-spring.jpg          spring logo raster (apple-touch-icon)
sw.js                    offline service worker (cache lx-search-v3-2)
data/formulary.json      your editable data file (create it, see below)
tools/export-json.mjs    node tools/export-json.mjs [version]  -> writes data/formulary.json
tools/export-json.html   same thing in the browser (download button)
tools/modularize.mjs     legacy v2.5 splitter (does not apply v3 patches)
tests/search.html        search engine benchmark against the real data
```

## Updating the data
1. Create the file once: `node tools/export-json.mjs v3.0`, or open `tools/export-json.html` and save the download as `data/formulary.json`.
2. Edit it. Format:
```json
{ "version": "v3.1", "updated": "2026-10-01",
  "paid": [{ "name": "Celebrex 200", "activeIngredient": "Celecoxib", "concentration": "200 mg", "form": "10 Tab", "price": 51.5, "company": "…", "class": "…", "authority": "Con" }],
  "free": [{ "name": "Celecoxib", "concentration": "200 mg", "form": "Tab", "class": "…", "authority": "Con" }] }
```
   - Only `name` is required.
   - `id` is optional. If you leave it out, it's built from type + name + concentration, which keeps pins valid.
   - Free rows are always priced 0.
3. Deploy, then tap **Refresh** in the app. A bad or missing file shows a message and the app keeps its current data.

## Entry points
- `index.html` with `?q=` (search), `?avail=paid|free`, `?sort=relevance|name-asc|name-desc|price-asc|price-desc`, `?density=cards|table`, `?f_class=` / `?f_form=` / `?f_authority=` / `?f_company=` (filters), `?item=<id>` (single item), `?debug=data` (data quality report)
- Search operators: `under 50`, `over 20`, `class:cardio`, `auth:gp`, `form:tab`

## Storage
- `localStorage`:
  - `lxDataV3` — downloaded dataset
  - `pinnedItems`, `searchHistory` — pins and recent searches
  - `theme`, `lxSortMode`, `lxDensityMode`, `panelDockSides`, `preferredSearchEngine` — preferences
- No server or database is used.

## Next steps
- Commit a generated `data/formulary.json`.
- Fully modularise `src/original.html` so the patch layer is no longer needed.
