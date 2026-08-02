# benten — Task backlog

Small, specific tasks that build toward [`PRD.md`](./PRD.md). Grouped by phase;
check them off as they land. Phase 1 (the silent Chords MVP) is broken down in
detail because it's what gets built first — later phases are sketched and will be
expanded when their turn comes.

Convention: one task = one small, verifiable change. Keep them that size.

---

## Group A — Project skeleton & Factotum wiring

- [x] Add a `pyproject.toml` (managed by `uv`) with `fastapi` and `uvicorn` deps.
- [x] Create `src/benten/` package with a `server.py` FastAPI app.
- [x] Serve a static `web/` directory (HTML + ES-module JS) from the FastAPI app.
- [x] Add a `benten` entry point so `uv run benten` starts uvicorn on `127.0.0.1:8788`.
- [x] Add a `/` route returning the app shell (HTTP 200 — the liveness signal).
- [x] Add a `GET /health` route for probes.
- [x] Register benten in the hub `tools.yaml` (path, runtime, setup/run/test, port,
      liveness), then run `factotum vscode` to wire its VS Code claude terminal.
- [x] Update `.gitignore` to exclude the local audio working dir and `__pycache__/`.
- [x] Write a minimal test that the server boots and `/health` returns 200.
- [x] Add a `CLAUDE.md` so benten sessions load their own context.

## Group B — File layer (read/write the drawers)

- [ ] `POST /compositions` — write a Markdown file into `composition/` from a payload.
- [ ] Auto-name saved files (slug + date), never clobber an existing file.
- [x] Resolve the drawer paths relative to the repo root, not the process CWD. *(done in `paths.py`)*
- [ ] Sanitize/validate paths so writes can only land inside the repo's drawers.
- [ ] Unit-test the file writer with an injected temp directory (no real FS writes).

## Group C — Front-end shell

- [x] Static `index.html` with a module nav (Chords active; Studio/Tabs/Effects stubbed).
- [ ] Vendor `tonal.js` as an ES module (pinned version, no bundler).
- [x] Base stylesheet — clean, legible, benten-flavored; mobile-friendly width.
- [ ] A small fetch wrapper for the backend JSON API.

## Group D — Chord entry (MVP)

- [ ] Key selector (root + major/minor) that seeds the palette.
- [ ] In-key chord palette: click a diatonic chord to append it to the progression.
- [ ] Free-text chord input parsing symbols (`Am7`, `D9`, `Cmaj7`) via `tonal.js`.
- [ ] Progression editor: ordered list of chords, reorderable and removable.
- [ ] Handle unparseable / out-of-key chords gracefully (flag, don't crash).

## Group E — Chord-scale suggestions (MVP)

- [ ] Per-chord: compute fitting scale(s)/mode(s) (diatonic + obvious modal choice).
- [ ] Whole-progression: compute the parent scale(s) covering the progression.
- [ ] Flag chords that fall outside the detected key (the "outside" spots).
- [ ] Render suggestions per chord and a summary for the whole progression.
- [ ] Unit-test the suggestion logic against a few known progressions (ii-V-I, etc.).

## Group F — Guitar fretboard (MVP)

- [ ] Render a standard-tuning guitar fretboard (SVG or canvas), tuning-agnostic core.
- [ ] Plot a given scale's notes across the neck.
- [ ] Highlight chord tones vs. the rest of the scale distinctly.
- [ ] Toggle which suggested scale is shown on the neck.
- [ ] Label notes / degrees on the diagram.

## Group G — Save to composition/ (MVP)

- [ ] Render the progression + scale suggestions as clean, hand-editable Markdown.
- [ ] "Save" button POSTs to the file layer and confirms the written path.
- [ ] Include an auto-link back into the drawer structure so it reads like a note.
- [ ] Verify a saved file opens correctly as plain Markdown outside the app.

## Group H — MVP polish & acceptance

- [ ] Walk the PRD §4.4 acceptance flow end-to-end with a real progression.
- [ ] README section: how to run benten and what the Chords module does.
- [ ] Log the first real use in `practice-log.md` (dogfood it).

---

## Phase 1.5 — Chords, audible (deferred detail)

- [ ] Web Audio setup: a shared audio context and a simple sampled/synth voice.
- [ ] Click-to-hear: play a chord or a single note on click.
- [ ] Practice loop: play the progression on a pad/piano, looped.
- [ ] Metronome with adjustable tempo and time signature.
- [ ] Count-in and loop controls (start/stop, bars per chord).

## Phase 2 — Studio (deferred detail)

- [ ] Mic access via `getUserMedia` with a device picker and level meter.
- [ ] Record a take with `MediaRecorder`; save audio to the local working dir.
- [ ] Loop a rhythm take as a backing track.
- [ ] Overdub: record a lead while the backing track plays.
- [ ] Latency offset/calibration so overdubs land in time.
- [ ] Write a session note to `recording/sessions/`; offer capture to `riffs/`.

## Phase 3 — Tabs (deferred detail)

- [ ] Decide the tab source (API / licensed / local files) — resolve PRD §8 first.
- [ ] Search UI surfaced next to the relevant `instruments/` notes.
- [ ] Save/link a found tab into the right instrument drawer.

## Phase 4 — Effects (deferred detail)

- [ ] `AudioWorklet` scaffolding for a modular effect chain.
- [ ] Core effect blocks: delay, reverb, distortion, filter.
- [ ] Wire blocks into a chain and audition on a Studio take.
- [ ] Save/load effect chains as named presets (into `production/`).
