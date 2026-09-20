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
