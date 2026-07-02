# Hoop Match

Hoop Match is a local-first prototype for matching amateur basketball teams.

The first version intentionally avoids a hosted backend so monthly server cost can stay at 0 yen while the product concept is being validated.

## Included in this prototype

- Listing type filters: opponent, member, helper, pickup, joint practice
- Team/opponent listing creation
- Facility notes with reservation method and official URL field
- Local browser storage
- JSON export/import for sharing or backup
- PWA manifest and service worker for offline use after first load
- Legal and safety checklist in `docs/legal-checklist.md`

## How to use

Open `index.html` in a browser.

For PWA installation and service worker behavior, serve the folder through a local static server:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/HoopMatch/`.

## Cost policy

The default architecture does not require a persistent server. Data stays in the user's browser through `localStorage`.

If public matching is needed later, add it as an optional sync layer:

- Static hosting for the app
- Supabase/Firebase free tier or a small VPS for public listings
- Explicit opt-in before any personal data leaves the device
- Separate legal review before public release
