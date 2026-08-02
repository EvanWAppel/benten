# benten — operating guide (for Claude)

benten is a workshop for a musical life: six Markdown **drawers** (`theory/`,
`instruments/`, `riffs/`, `composition/`, `recording/`, `production/`) plus two
practice logs, and — now being built — a small **local web app** that sits on top
of those drawers and does the things Markdown can't (hear a chord, loop a rhythm
part, catch a mic take, find a tab).

Read [`README.md`](./README.md) for the bench, [`PRD.md`](./PRD.md) for the app's
plan, and [`TASKS.md`](./TASKS.md) for the work. This file is how to *work* here.

## Where you are (read this first)

This is **benten's own git repo**, separate from the Factotum hub one directory up.
A session launched here inherits the hub's `CLAUDE.md` too — ignore its "heavy dev
doesn't run in the cockpit" rule: **you are in the tool, this is exactly where the
build happens.** Build here.

## The one rule (the bench)

**Write the thing down when it happens, not when it's finished.** Capture beats
polish. This governs the notes, and it governs the app: nothing the app does may be
slower than opening a file and typing was.

## Principles (these outrank features — PRD §2)

1. **Markdown is the source of truth.** Every durable thing the app makes is written
   back into the drawers as clean, hand-editable Markdown. If the app vanished, the
   notes survive intact.
2. **Local-first, private.** Everything runs on `127.0.0.1`. No accounts, no cloud,
   no telemetry. Built for one user; shareable later without a rewrite.
3. **Notes in git, binaries out.** Markdown is committed. Audio lives in `audio/`
   (git-ignored) and is referenced from notes by path — never checked in.
4. **Complement the DAW, don't replace it.** The Studio is a practice + capture
   companion. Serious mixing stays in Logic/Ableton. This is the load-bearing
   non-goal.
5. **The app is optional.** Every drawer must still work if the server never starts.

## The app — stack & how to run it

- **Backend:** thin **FastAPI** (Python, run with `uv`) in `src/benten/`. Its only
  jobs are serving the front-end and reading/writing the drawers. No music logic and
  no audio pass through it.
- **Front-end:** **no-build vanilla JS** (ES modules) in `web/`. No React, no
  bundler. Theory via `tonal.js`; sound (later) via the Web Audio API — all
  client-side.

```
uv sync                 # install (adds dev extras: uv sync --extra dev)
uv run benten           # serve at http://127.0.0.1:8788
uv run pytest           # the tests
```

Paths (web assets, drawers, the `audio/` working dir) resolve from the repo root
via `src/benten/paths.py`, so the server runs correctly from any cwd.

## How to work

- **TDD.** Write a failing test, make it pass, refactor. The file layer is
  I/O-injectable (pass it a target directory) so writes are testable without
  touching real drawers.
- **Follow `TASKS.md` in order.** It's grouped A→H for the silent Chords MVP, then
  Phases 1.5–4. Keep tasks small — one verifiable change each. Check them off.
- **Writing back to a drawer** means well-formed Markdown a human would be happy to
  edit by hand. Never emit machine-only sludge into `composition/` et al.
- **Prose** (READMEs, notes, docs) is in Evan's voice — the bench/drawer/luthier
  register the existing READMEs already use. If the hub's `VOICE.md` is reachable
  (`../VOICE.md`), follow it; if not, match the existing files. Never fabricate a
  quote or attribution.

## Current state

Group A (server skeleton + Factotum registration) is the scaffold in place now.
Next up is the Chords module: chord entry → chord-scale suggestions → guitar
fretboard → save to `composition/`. See `TASKS.md`.
