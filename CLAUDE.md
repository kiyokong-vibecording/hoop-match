# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hoop Match is a dependency-free vanilla-JavaScript PWA (Japanese basketball matching app). There is no package.json, no build tool, no bundler, and no linter. Do not introduce npm dependencies or a build step without asking.

## Commands

- Serve locally: `python3 -m http.server 4173` (then open `http://localhost:4173`)
- Run all tests: `bash tests/run.sh`
- Run a single test: `bash tests/run.sh test-sync` (test name without `.js`)
- Validate facility data: `node scripts/check-facilities.js`
- Regenerate facility data: `node scripts/build-facilities.js`

Tests need headless Chrome. The runner auto-detects `chrome-headless-shell` / `google-chrome` / `chromium`; override with `CHROME_BIN=/path/to/chrome`.

## Cache version bump (do this on every asset change)

`index.html` loads assets with `?v=NN` query strings (4 occurrences) and `service-worker.js` sets `CACHE_NAME = "hoop-match-vNN"`. **After changing `app.js`, `styles.css`, `index.html`, or anything under `data/`, bump both to the same new number.** Bumping only one serves users stale cached files. The `/bump-cache-version` skill does this.

## Generated and sensitive files

- `data/facilities.js` is auto-generated — never hand-edit it. Edit `data/facilities.json`, then run `node scripts/build-facilities.js`. (The generated `.js` exists because `file://` pages cannot `fetch()` JSON. It is committed to git.)
- `data/config.js` holds `window.HOOP_CONFIG`. Only the Supabase **anon/publishable** key belongs there. Never write a `service_role` key into it.

## Architecture

- No ES modules. Everything is a global, and script order in `index.html` matters: `data/config.js` → `data/facilities.js` → `app.js`. `app.js` holds nearly all logic and manipulates the DOM directly via an `elements` object.
- State is local-first, persisted to `localStorage` under `hoop-match-v1` (`STORAGE_KEY`), loaded through `loadState()` → `normalizeState()` and written via `saveState()`.
- Supabase is optional. `publicApiEnabled()` gates all server access; when `supabaseUrl`/`supabaseAnonKey` are empty the app runs fully offline. Server rows pass through `mapPublicRow()`. The backend (`backend/schema.sql`) enforces an approval workflow: youth (U12/U15/U18), PII-like, and spam-suspect posts wait for admin approval.

## Style

- 2-space indentation, double-quoted strings, semicolons. Node scripts use CommonJS `require`.
- All user-facing text and code comments are written in Japanese. Match that when adding UI strings.

## Test conventions

Tests are plain scripts in `tests/`, registered in the `TESTS=(...)` array in `tests/run.sh`. A test runs inside `window.addEventListener("load", ...)`, writes `PASS`/`FAIL` lines to `#test-output`, and calls `flush()` after each step. A test may pair a `pre-*.js` setup script (fetch stubs, config overrides, loaded before `app.js`) using `test-name:pre-name` syntax. `test-layout` is intentionally excluded from the runner — it is manual and viewport-dependent.
