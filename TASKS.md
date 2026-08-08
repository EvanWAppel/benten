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

- [x] `POST /compositions` — write a Markdown file into `composition/` from a payload.
- [x] Auto-name saved files (slug + date), never clobber an existing file.
- [x] Resolve the drawer paths relative to the repo root, not the process CWD. *(done in `paths.py`)*
- [x] Sanitize/validate paths so writes can only land inside the repo's drawers.
- [x] Unit-test the file writer with an injected temp directory (no real FS writes).

## Group C — Front-end shell

- [x] Static `index.html` with a module nav (Chords active; Studio/Tabs/Effects stubbed).
- [x] Vendor `tonal.js` as an ES module (pinned version, no bundler). *(v6.4.0, self-contained bundle)*
- [x] Base stylesheet — clean, legible, benten-flavored; mobile-friendly width.
- [x] A small fetch wrapper for the backend JSON API. *(`web/lib/api.js`)*

## Group D — Chord entry (MVP)

- [x] Key selector (root + major/minor) that seeds the palette.
- [x] In-key chord palette: click a diatonic chord to append it to the progression.
- [x] Free-text chord input parsing symbols (`Am7`, `D9`, `Cmaj7`) via `tonal.js`.
- [x] Progression editor: ordered list of chords, reorderable and removable.
- [x] Handle unparseable / out-of-key chords gracefully (flag, don't crash).

## Group E — Chord-scale suggestions (MVP)

- [x] Per-chord: compute fitting scale(s)/mode(s) (diatonic + obvious modal choice).
- [x] Whole-progression: compute the parent scale(s) covering the progression.
- [x] Flag chords that fall outside the detected key (the "outside" spots).
- [x] Render suggestions per chord and a summary for the whole progression.
- [x] Unit-test the suggestion logic against a few known progressions (ii-V-I, etc.). *(`node --test jstests/`)*

## Group F — Guitar fretboard (MVP)

- [x] Render a standard-tuning guitar fretboard (SVG or canvas), tuning-agnostic core.
- [x] Plot a given scale's notes across the neck.
- [x] Highlight chord tones vs. the rest of the scale distinctly.
- [x] Toggle which suggested scale is shown on the neck.
- [x] Label notes / degrees on the diagram. *(note names; degree toggle deferred)*

## Group G — Save to composition/ (MVP)

- [x] Render the progression + scale suggestions as clean, hand-editable Markdown.
- [x] "Save" button POSTs to the file layer and confirms the written path.
- [x] Include an auto-link back into the drawer structure so it reads like a note.
- [x] Verify a saved file opens correctly as plain Markdown outside the app.

## Group H — MVP polish & acceptance

- [x] Walk the PRD §4.4 acceptance flow end-to-end with a real progression. *(browser-verified: entry → scales → fretboard → save to composition/)*
- [x] README section: how to run benten and what the Chords module does.
- [ ] Log the first real use in `practice-log.md` (dogfood it). *(Evan's to write — a real session, not fabricated)*

---

## Phase 1.5 — Chords, audible

- [x] Web Audio setup: a shared audio context and a simple sampled/synth voice.
- [x] Click-to-hear: play a chord or a single note on click. *(palette add + ♪ button per chip)*
- [x] Practice loop: play the progression on a pad/piano, looped. *(look-ahead scheduler; chord highlight advances)*
- [x] Metronome with adjustable tempo and time signature. *(tempo bpm + 4/4·3/4·6/8 feel)*
- [x] Count-in and loop controls (start/stop, bars per chord).

## Phase 2 — Studio

Record → overdub → play back, all client-side audio; only the resulting files and
a session note touch the backend. Grouped like Phase 1: backend/storage first
(testable without a browser), then the front-end, then acceptance.

### Group S — Take storage (backend)

- [x] `store_take` file-layer fn: write audio bytes into `audio/` (git-ignored),
      auto-named, never clobbering — mirrors `write_note`, injectable dir.
- [x] Restrict to audio extensions (`.wav`/`.aiff`/`.flac`/`.webm`) and refuse any
      write that would escape `audio/` (defense in depth).
- [x] `POST /takes` — accept raw audio bytes + a name, store via `store_take`,
      return the repo-relative path.
- [x] Unit-test the take writer with an injected temp dir (no real FS writes).

### Group T — Mic & level meter (front-end)

- [x] Studio module scaffold; enable the `Studio` nav button and mount it.
- [x] `getUserMedia` mic access with a device picker (`enumerateDevices`).
- [x] Live input level meter from an `AnalyserNode` (peak/RMS).
- [x] Graceful states: permission denied, no device, not-secure-context.

### Group U — Record a take

- [x] PCM capture path: tap the mic through Web Audio and buffer Float32 samples. *(AudioWorklet)*
- [x] Encode buffered PCM to a 16-bit WAV blob client-side (no lossy intermediate).
- [x] Transport: arm → record → stop; POST the WAV to `/takes`; show saved path.
- [x] Play the just-recorded take back in the browser.
- [x] Unit-test the WAV encoder (header fields + sample count) with `node --test`. *(5 tests)*

### Group V — Backing track & overdub

- [x] Loop a recorded take as a backing track (gapless). *(looped AudioBufferSource)*
- [x] Overdub: record a new take while the backing track plays — "jam with myself."
- [x] Latency offset/calibration so overdubs land in time (PRD §8 risk). *(front-trim in ms)*
- [x] Keep the take list in the session (name, duration, role: rhythm/lead).

### Group W — Session note & capture

- [ ] Render a session note as clean Markdown (date, tempo, take list w/ paths).
- [ ] `POST` a session note into `recording/sessions/` via the file layer.
- [ ] Offer a captured idea to `riffs/` (a one-line link to the take).

### Group X — Phase 2 polish & acceptance

- [ ] Walk the PRD §5 Phase-2 flow end-to-end: record → loop → overdub → save.
- [ ] README section: what the Studio module does and how to use it.
- [ ] Log the first real Studio session in `practice-log.md`. *(Evan's to write.)*

## Phase 3 — Tabs (deferred detail)

- [ ] Decide the tab source (API / licensed / local files) — resolve PRD §8 first.
- [ ] Search UI surfaced next to the relevant `instruments/` notes.
- [ ] Save/link a found tab into the right instrument drawer.

## Phase 4 — Effects (deferred detail)

- [ ] `AudioWorklet` scaffolding for a modular effect chain.
- [ ] Core effect blocks: delay, reverb, distortion, filter.
- [ ] Wire blocks into a chain and audition on a Studio take.
- [ ] Save/load effect chains as named presets (into `production/`).
