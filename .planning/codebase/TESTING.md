# Testing Patterns

**Analysis Date:** 2026-03-12

## Test Framework

**Runner:** Not detected — no test framework is configured in this project.

**Assertion Library:** None.

**Config files:** None (`jest.config.*`, `vitest.config.*`, `mocha.*` — all absent).

**Run Commands:**
```bash
# No test commands available
# package.json does not exist — this is a Jekyll static site with vanilla JS
```

## Test File Organization

**Location:** None — no test files exist anywhere in the repository.

**Test file search results:**
- Zero `.test.js`, `.spec.js`, `.test.ts`, or `.spec.ts` files found
- Zero test directories (`__tests__`, `test/`, `spec/`) found

## Current State

This codebase has **no automated tests of any kind**. It is a Jekyll static site that serves vanilla JavaScript ES modules directly to the browser. All logic runs client-side against live DOM and real-time date/zmanim calculations.

**What exists instead of tests:**
- The Jekyll build pipeline (via `.GITHUB/workflows/jekyll.yml`) compiles the site to `_site/` but runs no test step
- Manual verification is the only validation mechanism
- `// @ts-check` with JSDoc types provides compile-time type guidance but no runtime assertions

## What Would Need Testing (If Tests Were Added)

**High-value units for future testing:**

**`assets/js/shul-wall/auto-schedule.js` — `roundDateTime()`**
- Pure function with no DOM or date dependencies
- Takes `(Temporal.ZonedDateTime, interval: number, mode: string)` → `Temporal.ZonedDateTime`
- Four rounding modes: `re` (earlier/floor), `rl` (later/ceil), `rc` (closer/round), `rx` (snap to nearest ±1 min)
- Ideal first candidate for unit testing

**`assets/js/shul-wall/zman-schedule.js` — `isAutoSchedule()`, `renderTitle()`, `applyAutoScheduleAttributes()`**
- `isAutoSchedule(rowTime)` is a pure regex test
- `renderTitle(rowTitle, fullWidth)` is a pure string transformation
- Both can be tested without a DOM

**`assets/js/ROYZmanim.js` — `ZemanFunctions` zmanim calculations**
- Core halachic time computation engine
- Currently validated only by visual inspection on the live display
- Could be unit-tested by providing fixed `GeoLocation` + `Temporal.PlainDate` and asserting output times

**`assets/js/shul-wall/reload.js` — `getRandomIntInclusive()`**
- Pure math utility, trivially testable

## Recommended Framework If Tests Are Added

Given the project uses vanilla JS ES modules with no build step:

- **Vitest** is the most compatible option — supports native ES modules, no transpilation needed
- Config: `vitest.config.js` at repo root, pointing at `assets/js/**/*.test.js`
- Test files should be co-located: e.g., `assets/js/shul-wall/auto-schedule.test.js`

**Minimal setup example (not yet implemented):**
```js
// assets/js/shul-wall/auto-schedule.test.js
import { describe, it, expect } from 'vitest';
// roundDateTime would need to be exported from auto-schedule.js first
import { roundDateTime } from './auto-schedule.js';

describe('roundDateTime', () => {
  it('rounds down with mode "re"', () => {
    // ...
  });
});
```

## Mocking

**Not applicable** — no test framework exists.

If tests are added, the primary mocking needs would be:
- `Temporal.Now` — mock current time for deterministic zmanim calculations
- `document` / DOM — jsdom or happy-dom for any tests touching DOM manipulation
- `fetch` — for `scheduleOnline.js`, `limud.js`, and `bridge.js` network calls

## Coverage

**Requirements:** None enforced.

**Current coverage:** 0% — no tests exist.

## Test Types

**Unit Tests:** Not present.

**Integration Tests:** Not present.

**E2E Tests:** Not present.

## CI Pipeline

The `.GITHUB/workflows/jekyll.yml` CI workflow:
- Builds the Jekyll site to `_site/`
- Does **not** run any test or lint step
- Deploys to GitHub Pages on success

---

*Testing analysis: 2026-03-12*
