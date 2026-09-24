# Design studio inbox

Materials for **ATLAS** designer mode. Say `ATLAS` (or type `/atlas`) in a
Claude Code session and Claude designs and builds from the project folder
here. The mode itself is defined in `.claude/skills/atlas/SKILL.md`.

## Easiest: the Atlas Designer

Open **<https://claude.ai/artifact/CKTXmsqvsGrgUxpgmYMsn7>**, press **New
project** (or open an older one), and fill its three layers:

1. **Design ideas**: your direction in your own words, plus moodboard images.
2. **What the client wants**: the kind of site, why we're building it, what
   it does for the client and for us.
3. **Materials**: photos, logos, copy, links. Can stay empty.

Press **Ready for ATLAS**, then tell Claude `ATLAS — project <name>`. Claude
pulls everything into `design/<slug>/` and starts.

Use the repo folders below for files the Designer can't hold: 3D models
(`.glb`, `.fbx`), HDRIs, and anything over 20 MB.

## Or: keep a project in the repo

1. Copy `_template/` to `design/<project-name>/`.
2. Fill in `brief.md` (the same three layers).
3. Put files in `ideas/`, `client/` and `materials/`.
4. Say **ATLAS**.

Big files (3D models, HDRIs, over 20 MB) can always go in
`design/<project-name>/materials/` alongside a Designer project.
