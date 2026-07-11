---
name: bump-cache-version
description: Bump the PWA cache-busting version in index.html and service-worker.js together, so users do not get stale cached assets. Run after changing app.js, styles.css, index.html, or data/.
disable-model-invocation: true
---

Bump the asset cache version across both files that carry it. They must always match.

Optional argument: an explicit target version number. If `$ARGUMENTS` is empty, use current + 1.

## Steps

1. Read the current version:
   ```bash
   grep -o 'CACHE_NAME = "hoop-match-v[0-9]*"' service-worker.js
   grep -o '?v=[0-9]*' index.html | sort | uniq -c
   ```
   These must already agree. If they do not, stop and tell the user — that means a previous bump was left half-applied, and they need to decide which number is correct.

2. Compute the new version (current + 1, or `$ARGUMENTS` if given).

3. Apply both edits:
   - `index.html`: replace every `?v=<old>` with `?v=<new>` (there are currently 4 occurrences — one stylesheet, three scripts).
   - `service-worker.js`: replace `CACHE_NAME = "hoop-match-v<old>"` with the new number. Only line 1 carries the literal; the other `CACHE_NAME` references are variable uses and must not change.

4. Verify the result — every occurrence should show the new number and nothing should show the old one:
   ```bash
   grep -o '?v=[0-9]*' index.html | sort | uniq -c
   grep -n 'hoop-match-v[0-9]*' service-worker.js
   ```

5. Report the old → new version and the number of occurrences changed.

## Notes

- The `ASSETS` array in `service-worker.js` deliberately lists unversioned paths (`"./app.js"`, not `"./app.js?v=44"`). Do not add version strings there.
- Do not bump for changes that ship no asset (docs, tests, `backend/schema.sql`).
