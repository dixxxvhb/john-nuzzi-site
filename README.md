# John Nuzzi site

Live: https://dixxxvhb.github.io/john-nuzzi-site/ (GitHub Pages, main branch, no build step).

- `index.html` home · `media.html` every photo and video (plus uploads) · `next.html` John's Plan (Today / Explore / My plan / Roadmap / Get ready, detail sheets, compare)
- Brand: John's locked kit (`~/Code/john-brand/BRAND.md`). Butter is the wordmark color only.
- Data lives in `data/*.json`; pages read it at load, so refreshing data never touches the HTML.
  - `media.json` photos (`images/photos`, `media/photos`, `media/photos/library`) and videos (`media/video` self-hosted, or `youtube` id)
  - `colleges.json`, `auditions.json`, `careers.json`: researched 2026-10-13 from official pages; `verified:false` items show a "Confirm dates" tag
- Library photos came from Dixon's Photos (person "John Nuzzi", Malik-tagged excluded) via osxphotos derivatives on the Neo; EXIF/GPS stripped on save.
- Public site of a minor: only add group shots where every other kid has `students.photo_release_granted = true`.
- Preview locally: `python -m http.server 5517` here (or the `john-site` launch config).

## Shared plan + uploads (backend: figgg Supabase project, schema `johnplan`)
- `js/plan-store.js` syncs stars, statuses, notes and checklists through token-gated RPCs (`supabase/001_john_plan.sql`).
- Calendar feed: edge function `plan-ics` (read-only feed key, no notes).
- Uploads: `js/uploads.js` + edge function `plan-media` (`supabase/002_john_media.sql`). Private bucket `john-media`, 50 MB per file, 600 MB cap,
  abandoned uploads swept after a day. Photos are re-encoded in the browser (no location data). Uploaded videos can never be public.
- The plan link is a secret: it lives only in `~/_drafts/john-plan/LINK.txt`, never in this public repo.
