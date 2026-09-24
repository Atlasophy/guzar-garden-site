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

## Or: start a project in the repo

1. Copy `_template/` to `design/<project-name>/`.
2. Fill in `brief.md`.
3. Drop materials into the folders:

```
design/<project-name>/
  brief.md
  brand/        logo (SVG), colors.md, fonts (.woff2)
  images/       photos — largest size available
  models/       .glb / .gltf, PBR textures, .hdr lighting
  references/   screenshots + notes.md (what you like in each)
  copy/         text per section, per language
```

4. Say **ATLAS**. Claude writes `concept.md` for approval, then builds,
   screenshots its own work and shows you the result.

## Tips

- Video references: send 4–6 frames and describe the motion in words.
- Big files (> 50 MB) — models, HDRIs, video — use Git LFS or share a link.
- The more precise the notes on _why_ you like a reference, the closer the
  first draft lands.
