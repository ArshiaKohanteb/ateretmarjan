# Architecture

**Analysis Date:** 2026-03-12

## Pattern Overview

**Overall:** Static Site with Client-Side React Signage Layer

This is a Jekyll-generated static site that serves dedicated shul (synagogue) wall-display pages. Each display page loads a layered JavaScript pipeline: a KosherZmanim calculation engine, a bridge module that exposes results via a global event, and a React IIFE bundle that consumes those results to render the UI.

**Key Characteristics:**
- Jekyll handles static HTML templating and YAML data injection at build time
- All runtime logic runs entirely in the browser — no server-side computation
- The React UI and the KosherZmanim engine are decoupled via a `window.__SHUL_DATA__` global and the `shul-data-ready` custom event
- Prayer schedules are fetched live at runtime from external sources (Google Sheets / remote `.db` files)
- The site auto-reloads daily at midnight to refresh zmanim calculations

## Layers

**Template / Build Layer:**
- Purpose: Produces static HTML files with data from YAML fixtures baked in at build time
- Location: `_layouts/`, `_includes/`, `pages/`, `_data/`
- Contains: Liquid templates (`.html`), Jekyll layout wrappers, YAML data files
- Depends on: Jekyll 4.3.4, Ruby, YAML data files
- Used by: Browser (served as static files)

**Configuration Layer:**
- Purpose: Per-page JSON blob that declares location (lat/long/timezone), halachic toggles, and schedule source URL
- Location: Inline `<script id="zy-scheduleScreen-config" type="application/json">` block in each page (`pages/shul-wall/ateret-marjan.html`, `pages/shul-wall/ateret-marjan-tv.html`)
- Contains: Location name, coordinates, elevation, timezone, calendarToggle flags, customTimes, schedule URL and type
- Depends on: Nothing (plain JSON, no external fetch)
- Used by: `base.js` (read once on page load)

**KosherZmanim Calculation Layer:**
- Purpose: Computes all halachic times (zmanim) for the configured location and date
- Location: `assets/libraries/kosherZmanim/kosher-zmanim.js` (vendored library), `assets/js/ROYZmanim.js` (extension layer), `assets/js/WebsiteLimudCalendar.js` (calendar wrapper)
- Contains: Astronomical calculation classes (`ZemanFunctions`, `WebsiteLimudCalendar`), ROY (Rabbi Ovadia Yosef) halachic opinion overrides
- Depends on: `kosher-zmanim.js`, `Temporal` polyfill, `tekufot.js`
- Used by: `base.js`, `bridge.js`, `auto-schedule.js`

**Base / Initialization Layer:**
- Purpose: Reads the JSON config, constructs shared instances of `GeoLocation`, `WebsiteLimudCalendar`, and `ZemanFunctions`, and exports live getter functions for recalculation
- Location: `assets/js/shul-wall/base.js`
- Contains: `scheduleSettings`, `geoLocation`, `getCurrentZDT()`, `getJCal()`, `getZmanCalc()`, `dtF` (locale format args)
- Depends on: `zy-scheduleScreen-config` JSON block in the page DOM, `kosher-zmanim.js`, `ROYZmanim.js`, `WebsiteLimudCalendar.js`
- Used by: `bridge.js`, `auto-schedule.js`, `reset.js`, `scheduleOnline.js`

**Bridge Layer:**
- Purpose: Runs all zmanim calculations and packages results into `window.__SHUL_DATA__`, then dispatches the `shul-data-ready` event so the React app can hydrate
- Location: `assets/js/shul-wall/bridge.js`
- Contains: `calculate()` function (runs every 60 seconds), Hebrew date, parasha, candle lighting, havdalah, zmanim array, limudim, hiloulot, makam
- Depends on: `base.js`, `ROYZmanim.js`, `WebsiteLimudCalendar.js`, `kosher-zmanim.js`, `n2wordsOrdinal.js`
- Used by: React signage bundle (`react-signage.js`) via `window.__SHUL_DATA__` and the `shul-data-ready` event

**Schedule Layer:**
- Purpose: Fetches the synagogue's prayer schedule from an external source and injects it into `<zman-schedule>` Web Components in the hidden `#dataGrid` DOM element
- Location: `assets/js/shul-wall/scheduleOnline.js`, `assets/js/shul-wall/zman-schedule.js`, `assets/js/shul-wall/auto-schedule.js`
- Contains: `loadExcelSchedule()`, `loadIniSchedule()`, `loadJsonSchedule()`, `ZmanSchedule` custom element, `autoSchedule()` time calculator
- Depends on: `base.js`, `assets/libraries/xlsx.js`, `assets/libraries/ini.js`, `ROYZmanim.js`
- Used by: The `#dataGrid` hidden container (data relay point for the bridge to pick up and forward to React)

**React UI Layer:**
- Purpose: Renders the full-screen signage display (zmanim table, Hebrew date, parasha, schedule, etc.)
- Location: `assets/js/shul-wall/react-signage.js` (built IIFE bundle, ~426 KB)
- Contains: Self-contained React app with all dependencies bundled; listens for `shul-data-ready` event; mounts into `#react-root`
- Depends on: `window.__SHUL_DATA__`, `shul-data-ready` event
- Used by: End-user TV/browser display

**Lifecycle / Reset Layer:**
- Purpose: Schedules a page reload at midnight so zmanim refresh without manual intervention
- Location: `assets/js/shul-wall/reset.js`, `assets/js/shul-wall/reload.js`
- Contains: `reload()` (DOM-swap reload strategy with cache-busting), midnight timer
- Depends on: `base.js` (for `currentZDT`), `navigator.onLine`
- Used by: Both display pages

## Data Flow

**Zmanim Calculation and Display:**

1. Jekyll builds static HTML; YAML from `_data/tv/listTVZman.yml` is rendered into hidden `<article>` elements inside `#dataGrid`
2. Browser loads page; `base.js` reads `#zy-scheduleScreen-config` JSON to construct `GeoLocation` and calendar objects
3. `bridge.js` calls `calculate()` immediately and every 60 seconds
4. `calculate()` uses `getJCal()` / `getZmanCalc()` to produce fresh objects, then computes all zmanim, parasha, limudim, hiloulot, and makam
5. Results are stored on `window.__SHUL_DATA__` and dispatched as `shul-data-ready` CustomEvent
6. `react-signage.js` listens for `shul-data-ready`, reads `window.__SHUL_DATA__`, and re-renders the display

**Schedule Injection Flow:**

1. `scheduleOnline.js` reads `scheduleSettings.schedule.url` from `base.js`
2. Fetches Excel/INI/JSON schedule from the external URL (e.g. Google Sheets export or remote `.db`)
3. Maps columns into `{ title: time }` records, passes to `ZmanSchedule.data` setter
4. `ZmanSchedule` custom element renders `<li>` items; times formatted with `autoSchedule()` where values match the auto-schedule DSL pattern
5. Bridge (or React) reads the resulting DOM to relay schedule data to the React UI

**Midnight Reset Flow:**

1. `reset.js` computes time-until-midnight using `currentZDT`
2. `setTimeout` fires; `reload.js` fetches the current page URL, DOM-swaps the document, and re-executes all scripts with cache-busting query params

## Key Abstractions

**`ScheduleSettings` (typed in `base.js`):**
- Purpose: Typed interface for the inline JSON config block; single source of truth for location, halachic toggles, and schedule source
- Examples: `assets/js/shul-wall/base.js` (typedef), `pages/shul-wall/ateret-marjan.html` (instance), `_data/tv/config/charm-circle.json` (alternative config file)
- Pattern: JSON blob parsed from a `<script type="application/json">` tag; read once at startup

**`ZemanFunctions` / `ZemanimMathBase` (ROY layer):**
- Purpose: Extends the vendored KosherZmanim library with Rabbi Ovadia Yosef halachic opinions
- Examples: `assets/js/ROYZmanim.js`
- Pattern: Class extension; instantiated in `base.js` and re-instantiated per recalculation in `bridge.js`

**`WebsiteLimudCalendar`:**
- Purpose: Wraps the Jewish calendar with limud tracking, parasha retrieval, and Israel/diaspora awareness
- Examples: `assets/js/WebsiteLimudCalendar.js`
- Pattern: Class wrapping KosherZmanim calendar; instantiated fresh on every `calculate()` call

**`ZmanSchedule` (Web Component):**
- Purpose: Custom HTML element `<zman-schedule>` that accepts a `data` object and renders a list of prayer times with auto-schedule DSL support
- Examples: `assets/js/shul-wall/zman-schedule.js`
- Pattern: `HTMLElement` subclass, `customElements.define("zman-schedule", ZmanSchedule)`

**`window.__SHUL_DATA__`:**
- Purpose: Global state object written by `bridge.js` and read by the React app; serves as the contract between the calculation engine and the UI
- Examples: Set in `assets/js/shul-wall/bridge.js`; consumed by `assets/js/shul-wall/react-signage.js`
- Pattern: Plain object on `window`; supplemented by `shul-data-ready` CustomEvent for push notification

## Entry Points

**`pages/shul-wall/ateret-marjan.html`:**
- Location: `pages/shul-wall/ateret-marjan.html`
- Triggers: Browser navigating to `/shul-wall/ateret-marjan`
- Responsibilities: Full-screen responsive display; loads `bridge.js`, `scheduleOnline.js`, `reset.js`, `react-signage.js`

**`pages/shul-wall/ateret-marjan-tv.html`:**
- Location: `pages/shul-wall/ateret-marjan-tv.html`
- Triggers: Browser navigating to `/shul-wall/ateret-marjan-tv`
- Responsibilities: Fixed 960x480px TV display (scaled down from 1920x960 via CSS `transform: scale(0.5)`); same script stack as above

**`_layouts/nothing.html`:**
- Location: `_layouts/nothing.html`
- Triggers: Any Jekyll page declaring `layout: nothing`
- Responsibilities: Minimal HTML shell (doctype, head with title/meta, body) with no navigation or site chrome; used by all shul-wall display pages

## Error Handling

**Strategy:** Silent-fail with console logging; pages do not show error UI to the end user

**Patterns:**
- `bridge.js` wraps `calculate()` in `.catch(e => console.error(...))` for both initial call and interval
- Individual zmanim calculations are wrapped in `try/catch` with silent skip (some zmanim don't apply every day)
- `scheduleOnline.js` uses `silentFail` parameter; missing DOM elements emit `console.warn` rather than throwing
- `reload.js` checks `navigator.onLine` before reloading; defers until the `online` event if offline
- Makam fetch failure in `bridge.js` silently sets `computedMakam` to empty string

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` / `console.error` used directly; prefixed with module name in brackets (e.g. `[bridge.js]`)

**Validation:** `base.js` uses `isValidJSON()` guard for localStorage reads; `scheduleOnline.js` checks element existence before DOM mutation

**Authentication:** None — all external data sources are public URLs (Google Sheets export, public `.db` endpoints)

---

*Architecture analysis: 2026-03-12*
