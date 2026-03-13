# Technology Stack

**Analysis Date:** 2026-03-12

## Languages

**Primary:**
- Ruby - Jekyll static site generator, build tooling only (not runtime)
- JavaScript (ES Modules) - All client-side logic, calculation engine, UI

**Secondary:**
- JSX - React component source in `signage-build/src/` (compiled to IIFE bundle before deployment)
- Liquid - Jekyll templating for `.html` pages in `pages/` and `_layouts/`
- YAML - Data files in `_data/`, Jekyll configuration
- CSS - Custom styles in `assets/css/shul-wall/`

## Runtime

**Environment:**
- Browser (client-side only) — all computation runs in the visitor's browser
- No server-side runtime at page-serve time; Jekyll generates static HTML

**Package Manager:**
- Bundler (Ruby gems) for Jekyll build — `Gemfile.lock` present
- npm (Node.js) for the React signage build in `signage-build/` — `package.json` present at `signage-build/package.json`

## Frameworks

**Core:**
- Jekyll 4.3.4 - Static site generator; builds HTML from Liquid templates + YAML data
- React 18.2.0 - Shul-wall signage UI, compiled to IIFE bundle at `assets/js/shul-wall/react-signage.js`

**Build/Dev:**
- Vite 5.4.0 - Bundles the React signage app; config at `signage-build/vite.config.js`
- @vitejs/plugin-react 4.2.0 - Vite plugin enabling JSX compilation
- Rollup (via Vite) - Output format is `iife` named `ShulSignage`; output file `react-signage.js`
- ruby/setup-ruby via GitHub Actions - Ruby 3.1 used in CI

## Key Dependencies

**Halachic Calculation Engine:**
- `kosher-zmanim` (vendored) - Core Jewish time calculation library; bundled at `assets/libraries/kosherZmanim/kosher-zmanim.js`. Provides `GeoLocation`, `Temporal`, `HiloulahYomiCalculator`, `Makam` classes.
- `zmanim-binding` (vendored) - WebAssembly-based astronomical calculator binding; at `assets/libraries/zmanim-binding/index.js`. Contains compiled WASM (`ubrn_uniffi_zmanim_core`).
- `luxon.min.js` (vendored) - Date/time library bundled alongside `zmanim-binding` at `assets/libraries/zmanim-binding/luxon.min.js`

**Schedule Parsing:**
- `xlsx` (vendored or referenced) - Excel workbook parser used in `scheduleOnline.js` for reading Google Sheets `.xlsx` exports; imported from `../../libraries/xlsx.js`
- `ini` (vendored or referenced) - INI file parser used in `scheduleOnline.js`; imported from `../../libraries/ini.js`

**Firebase SDK:**
- `firebase` ^12.10.0 - Used in `signage-build/src/ShulSignagePro.jsx` for Firebase Realtime Database (`getDatabase`, `ref`, `set`, `onValue`) to sync signage admin settings across displays

**React Ecosystem:**
- `react` 18.2.0
- `react-dom` 18.2.0

**Ruby Gems (build only):**
- `jekyll` ~> 4.3.4
- `jekyll-sass-converter` 3.1.0 (sass-embedded ~> 1.75)
- `kramdown` 2.5.2 (GFM parser)
- `liquid` ~> 4.0 (Liquid template engine)
- `csv`, `logger`, `base64` — Ruby standard library supplements for Jekyll

**CSS Libraries (vendored in `_site`):**
- Bootstrap (CSS reboot + bundle JS) — loaded via `_layouts/nothing.html`
- Bootstrap Icons

## Configuration

**Jekyll:**
- `_config.yml` — site URL (`https://ateretmarjan.org`), site title, markdown settings, HTML compression, page defaults
- `_data/tv/listTVZman.yml` — ordered list of zmanim IDs/names rendered into hidden DOM by Liquid at build time
- `_data/tv/config/ish-matzliach.json`, `_data/tv/config/charm-circle.json` — per-synagogue configuration presets

**Shul-Wall Runtime Config:**
- Embedded as `<script id="zy-scheduleScreen-config" type="application/json">` in each page HTML
- Contains: location (lat/long/timezone), halachic toggles, custom candle-lighting offsets, schedule URL + type
- Read at runtime by `assets/js/shul-wall/base.js` via `document.getElementById("zy-scheduleScreen-config").textContent`

**Vite:**
- `signage-build/vite.config.js` — IIFE output named `ShulSignage`, entry `src/main.jsx`, output `dist/react-signage.js`

**Environment:**
- No `.env` files detected
- Firebase API key and config are hardcoded in `signage-build/src/ShulSignagePro.jsx` lines 124–132 (public web app config)

## Platform Requirements

**Development:**
- Ruby 3.1 + Bundler for Jekyll (`bundle exec jekyll serve`)
- Node.js + npm for React signage build (`cd signage-build && npm run build`)
- Built React IIFE must be manually copied to `assets/js/shul-wall/react-signage.js` (script alias `build:copy` targets a sibling `royzmanimwebsite/` directory)

**Production:**
- GitHub Pages — deployed via GitHub Actions workflow at `.GITHUB/workflows/jekyll.yml`
- CI: push to `main` triggers Jekyll build (Ruby 3.1, `bundle exec jekyll build`) then deploy via `actions/deploy-pages@v4`
- No server-side compute required at runtime

---

*Stack analysis: 2026-03-12*
