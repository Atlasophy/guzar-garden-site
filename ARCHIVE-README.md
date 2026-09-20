# Archive — Güzar Garden versions that predate GitHub

Four working folders that existed only on one laptop and in Google Drive,
snapshotted here on 2026-09-20 so the Drive copies could be cleared.

**This branch is a record, not a base to build on.** Nothing here is current.
The live work is on `main` and the feature branches.

| Folder | Files not found anywhere in git history |
|---|---|
| `guzar-garden-platform/` | **62** — including `app/(site)/layout.tsx` and the `.tmp/` build scripts |
| `guzar-garden-site-original/` | 13 — including `app/(site)/page.tsx`, `components/marketing/hero.tsx`, `components/marketing/sections.tsx`, `app/styles/emerald.css` |
| `guzar-garden/` | 2 — `index.html`, `menu.html` (the early static site) |
| `guzar-garden-redesign/` | 1 — `index.original-backup.html` |

Those counts are the reason this branch exists. The assumption that the old
folders were redundant copies was wrong: 78 files in them had never been
committed anywhere, so deleting the Drive copies would have destroyed them.

Excluded from the snapshot: `node_modules/`, `.next/`, `.git/`, `test-results/`,
and every real `.env` file. The `.env.example` templates are included and
contain placeholders only (`your-project-ref.supabase.co`), as do the localhost
test connection strings in `tests/helpers/database.ts` and the docs.

A fifth folder, `NEWGUZAR/`, held only design screenshots. Those are binary
assets, so they went to Google Drive under `design/site-screenshots/` rather
than into git.

## `zips/`

Six zip archives that sat beside the folders, kept byte-exact rather than
extracted. They were checked too, and they are **not** redundant with the
folders above:

| Zip | Files found nowhere else |
|---|---|
| `guzar-garden-platform-continued.zip` | 13 — different versions of `page.tsx`, `hero.tsx`, `emerald.css`, `reserve.css` |
| `guzar-garden-platform-production-2026-09-02.zip` | 12 — same files, another point in time |
| `guzar-garden.zip` / `guzargarden.zip` | 2 each — different versions of `index.html` and `menu.html` |
| `guzar-garden-redesign.zip`, `guzar-garden-site.zip` | 0 — fully redundant, kept for completeness |

None of them contains a real `.env` file; only `.env.example` templates.

To read one: download it from this branch and unzip locally. They are kept
zipped because the point is preservation, not browsing — every file that
mattered for working on the project is either on `main`, on a feature branch,
or extracted in the folders above.
