# Coding Conventions

**Analysis Date:** 2026-03-12

## Naming Patterns

**Files:**
- kebab-case for all JS source files: `date-and-time.js`, `auto-schedule.js`, `react-signage.js`
- kebab-case for CSS files: `clock.css`, `vertical-carousel.css`, `marquee.css`
- PascalCase for class-based JS modules: `WebsiteLimudCalendar.js`, `WebsiteCalendar.js`, `ROYZmanim.js`
- camelCase for utility data files: `n2wordsOrdinal.js`

**Functions:**
- camelCase for all function declarations: `updateTime()`, `renderFastIndex()`, `writeMourningPeriod()`, `roundDateTime()`, `zmanListToFormat()`
- camelCase for async functions: `autoSchedule()`, `calculate()`, `loadIniSchedule()`, `loadJsonSchedule()`, `loadExcelSchedule()`
- Getter functions on calendar/zmanim objects use `get` prefix by convention (inherited from KosherZmanim): `getAlotHashahar()`, `getSofZemanShemaGRA()`, `getTzetMelakha()`

**Variables:**
- camelCase for all locals and module-level consts: `scheduleSettings`, `geoLocation`, `currentZDT`, `jCal`, `zmanCalc`, `dtF`
- Abbreviated names are acceptable for domain-specific concepts: `jCal` (Jewish calendar), `zDT` (Zoned DateTime), `dtF` (DateTime format), `ZDT` suffix on ZonedDateTime instances
- `melakhaJCal`, `fastJCal`, `loopJCal`, `tempJCal` — suffix `JCal` on calendar clones to distinguish from the primary `jCal`

**Classes:**
- PascalCase: `ZemanimMathBase`, `CountDown`, `ZmanSchedule`
- Custom Elements class name mirrors the hyphenated tag name: `ZmanSchedule` → `<zman-schedule>`

**Data Attributes (HTML):**
- `data-zfFind="..."` — select a named structural container in the DOM
- `data-zfReplace="..."` — target element whose `innerHTML` will be replaced with a computed value
- `data-autoschedule*` — namespace prefix for all autoschedule element attributes: `data-autoscheduleType`, `data-autoscheduleFunction`, `data-autoschedulePlusorminus`, `data-autoscheduleHours`, `data-autoscheduleMinutes`, `data-autoscheduleRoundinterval`, `data-autoscheduleRoundmode`
- `data-sw-*` — shul-wall clock display elements: `data-sw-hour`, `data-sw-minute`, `data-sw-portion`

**CSS Classes:**
- BEM-style modifiers are not used; classes are descriptive and flat: `.blink`, `.timeDisplayWide`, `.nextDay`, `.secondShemaDispl`, `.altTzetMelakhaTime`
- Bootstrap utility classes used alongside custom classes: `list-group-item`, `d-flex`, `justify-content-between`
- Language visibility classes use `lang-` prefix: `lang-en`, `lang-hb`, `lang-en-et`, `lang-ru`; toggled with the wrapper class `langTV`

## Code Style

**Formatting:**
- No automated formatter config detected (no `.prettierrc`, `.editorconfig`, or `biome.json`)
- Mix of tabs (majority of `assets/js/shul-wall/` files) and 2/4-space indentation (`bridge.js`, `auto-schedule.js`) — **not consistent across the codebase**
- `bridge.js` uses 2-space indentation throughout
- Most `shul-wall/` files use tabs

**Linting:**
- No ESLint or other lint config detected
- All JS files begin with `// @ts-check` to opt into TypeScript's type checking via JSDoc
- `@ts-ignore` used liberally (43 total occurrences across 12 files) to suppress type errors that JSDoc types cannot fully express

## Type Annotations

**Pattern:** JSDoc `@type`, `@param`, `@returns`, `@typedef` annotations throughout all JS files — no TypeScript source files.

```js
// @ts-check

/** @typedef {{
    seconds: boolean;
    timeFormat: "h11" | "h12" | "h23" | "h24";
    ...
}} ScheduleSettings */

/** @type {ScheduleSettings} */
const scheduleSettings = JSON.parse(...)

/**
 * @param {Temporal.ZonedDateTime} dt
 * @param {number} interval
 * @param {string} mode
 */
function roundDateTime(dt, interval, mode) { ... }
```

**`@ts-ignore` usage:** Appears on lines where JSDoc cannot express the narrowing needed (e.g., dynamic method dispatch, Object.values spread into constructor args). Treat these as expected suppressions, not errors to fix blindly.

## Import Organization

**Pattern:** Named ES module imports with `import` statements at the top of every file. All imports are relative paths — no bare specifiers.

**Order (observed):**
1. External library imports from `../../libraries/` (KosherZmanim, gsap, xlsx, ini)
2. Internal utility imports from `../` (ROYZmanim.js, WebsiteLimudCalendar.js, misc/)
3. Shul-wall module imports from `./` (base.js, reload.js, auto-schedule.js, zman-schedule.js)

**Example:**
```js
import * as KosherZmanim from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { Temporal } from "../../libraries/kosherZmanim/kosher-zmanim.js";
import { zDTFromFunc } from "../ROYZmanim.js";
import WebsiteLimudCalendar from "../WebsiteLimudCalendar.js";
import { scheduleSettings, geoLocation, getCurrentZDT, getJCal, getZmanCalc, dtF } from "./base.js";
import n2wordsOrdinal from "../misc/n2wordsOrdinal.js";
```

**Re-exports:** Modules export named functions and a default class where applicable. `base.js` is the central shared state module — always import shared constants from there.

## Error Handling

**Pattern:** Errors are almost entirely silent or logged; no user-facing error UI.

- `try/catch` with empty or minimal catch bodies used when a zman may not apply:
```js
try {
    const zdt = zDTFromFunc(calcForDay[zConfig.getter]());
    // ...
} catch (e) { /* some zmanim may not apply today */ }
```

- `isValidJSON` helper duplicated in `base.js` and `times.js` to guard `JSON.parse` calls:
```js
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}
```

- Async errors in `bridge.js` are caught and logged with a module prefix:
```js
calculate().catch(e => console.error("[bridge.js] Initial calculation failed:", e));
setInterval(() => {
    calculate().catch(e => console.error("[bridge.js] Recalculation failed:", e));
}, 60_000);
```

- `scheduleOnline.js` uses a `silentFail` parameter to suppress `console.warn` when DOM elements are missing.

- No centralized error boundary or error reporting service.

## Logging

**Framework:** `console.log` and `console.warn` only — no structured logging library.

**Patterns:**
- Module-prefix convention in `bridge.js`: `console.log("[bridge.js] Recalculated at", ...)`, `console.error("[bridge.js] ...")`
- `scheduleOnline.js` warns on missing DOM elements: `console.warn('Element with id "..." not found')`
- `zman-schedule.js` logs when no autoschedule entries are found
- Most other modules emit no logs at all

## Comments

**When to Comment:**
- Section dividers using ASCII box drawings are used in `bridge.js` and `base.js` to label logical blocks:
  ```js
  // ─── 1. HEBREW DATE ───
  // ─── MAIN CALCULATION FUNCTION — runs every 60 seconds ───
  // ═══════════════════════════════════════════════════════════════
  ```
- Business logic that is non-obvious gets inline comments:
  ```js
  // Rather than figure out some way to keep the previous Tzet time while Tzet Lekhumra is reloading,
  // just reload it after our extended Tzet time
  ```
- `@ts-ignore` suppressions are generally uncommented — add a brief reason when possible

**JSDoc:**
- `@typedef` used for complex config shapes (`ScheduleSettings` in `base.js`)
- `@param` and `@returns` used on most exported/public functions
- `@import` used in `netzCountdown.js` for type-only imports from libraries: `/** @import {gsap as tsGsap} from 'gsap' */`

## Function Design

**Size:** Functions vary widely — `sidebar.js`'s `writeMourningPeriod` and `renderSeasonalRules` are 50–80 lines; `bridge.js`'s `calculate` is ~150 lines. No hard line-count rule.

**Parameters:** Prefer destructured config objects for complex options (e.g., `ZemanimMathBase` constructor). Simple functions use positional params.

**Default Parameters:** Used in class constructors for config objects. Helper functions use inline defaults:
```js
function rangeDates(start, middle, end, inclusive=true) { ... }
export async function loadIniSchedule(url, silent=false) { ... }
```

## Module Design

**Exports:**
- `base.js` exports shared state as named constants — all other shul-wall modules import from it
- Feature modules (`sidebar.js`, `parasha.js`, `limud.js`, `date-and-time.js`) run side effects on import (directly manipulate DOM) and export nothing or minimal named exports
- `auto-schedule.js` exports a single default function
- `zman-schedule.js` exports default class + named `localizedIndividual` map
- `reload.js` exports a single named async function: `export async function reload()`

**Custom Elements:**
- `ZmanSchedule` extends `HTMLElement` and is registered via `customElements.define("zman-schedule", ZmanSchedule)`
- Uses setter/getter pattern for `data` property to trigger `render()` on assignment

**Window globals:**
- `window.timers` — shared object to track all `setTimeout` handles, initialized by each module that needs it: `if (!('timers' in window)) window.timers = {}`
- `window.__SHUL_DATA__` — set by `bridge.js` to expose all computed zmanim/schedule data to the React UI

---

*Convention analysis: 2026-03-12*
