# John Nuzzi site

Live: https://dixxxvhb.github.io/john-nuzzi-site/ (GitHub Pages, main branch, no build step).

- `index.html` home · `media.html` every photo and video · `next.html` What's Next hub
- Brand: John's locked kit (`~/Code/john-brand/BRAND.md`). Butter is the wordmark color only.
- Data lives in `data/*.json`; pages read it at load, so refreshing data never touches the HTML.
  - `media.json` photos (`images/photos`, `media/photos`, `media/photos/library`) and videos (`media/video` self-hosted, or `youtube` id)
  - `colleges.json`, `auditions.json`, `careers.json`: researched 2026-10-13 from official pages; `verified:false` items show a "Confirm dates" tag
- Library photos came from Dixon's Photos (person "John Nuzzi", Malik-tagged excluded) via osxphotos derivatives on the Neo; EXIF/GPS stripped on save.
- Public site of a minor: only add group shots where every other kid has `students.photo_release_granted = true`.
- Preview locally: `python -m http.server 5517` here (or the `john-site` launch config).
