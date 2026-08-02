# benten — Product Requirements

*Benten is the goddess of everything that flows: music, language, water. This
document is the plan for turning her workshop from a drawer of notes into a
bench with tools on it — without losing the thing that made the drawers work.*

Status: **draft** · Owner: Evan · Last updated: 2026-08-01

---

## 1. What benten is becoming

Today benten is plain Markdown: six drawers (`theory/`, `instruments/`, `riffs/`,
`composition/`, `recording/`, `production/`) and two practice logs, governed by one
rule — *write the thing down when it happens, not when it's finished.* No build,
nothing to run.

That stays. What we're adding is a **small local web app that sits on top of the
same drawers** and does the things Markdown can't: hear a chord, loop a rhythm
part so you can solo over it, catch a mic take, find a tab. The notes remain the
source of truth; the app is capture, retrieval, and practice layered on top.

The luthier metaphor still holds. The drawers were the offcuts and the sketches.
The app is the jig — the thing that lets you actually cut the wood, still sitting
on the same bench, next to the same drawers.

## 2. Principles (the constraints that outrank features)

1. **Markdown is the source of truth.** Every durable artifact the app produces —
   a progression, a session note — is written back into the drawers as Markdown a
   human can read and edit by hand. If the app disappeared tomorrow, the notes
   survive intact.
2. **Capture beats polish.** The app must never make it slower to write something
   down than opening a file did. Friction is the enemy.
3. **Local-first, private now, shareable later.** Runs entirely on `127.0.0.1`.
   No accounts, no cloud, no telemetry. Structure it so a drawer *could* be
   published later without a rewrite, but ship for one user: Evan.
4. **Notes in git, binaries out.** Markdown, tabs, and small text artifacts are
   committed. Audio (`.wav`/`.aiff`/`.flac`) lives in a local working directory,
   git-ignored, and is referenced from the notes by path — never checked in.
5. **Complement the DAW, don't replace it.** benten's Studio is a practice
   companion and quick-capture bench. Serious mixing and mastering stay in the
   external DAW. This is the single most important non-goal (see §7).
6. **The app is optional.** Every drawer must still work if you never launch the
   server. The tools add reach; they are never a prerequisite for the bench.

## 3. Architecture

**Shape:** one modular web app, not a suite of separate tools. A single server, a
single UI, modules that share an audio engine and a file layer.

**Stack:**
- **Backend** — a thin **FastAPI** (Python, run via `uv`) server. Its only jobs:
  serve the front-end, and read/write files in the drawers. No music logic and no
  audio pass through it. Consistent with the rest of Factotum.
- **Front-end** — **no-build vanilla JS** (ES modules), served static. No React,
  no bundler; matches benten's "open a file, no framework" ethos.
- **Music theory** — [`tonal.js`](https://github.com/tonaljs/tonal) in the
  browser, so we don't reimplement scales/chords/keys.
- **Audio** (later modules) — the **Web Audio API** in the browser: `getUserMedia`
  for mic capture, `MediaRecorder`/`AudioWorklet` for recording, overdub, and
  effects. All audio is client-side; the backend only stores the resulting files.

**Runtime & Factotum integration:**
- Runs at `http://127.0.0.1:8788` (distinct from todo-dashboard's `:8787`).
- Registered in the hub's `tools.yaml` with `setup`/`run`/`test` commands and a
  liveness signal (HTTP 200 on `/`), then wired via `factotum vscode`.
- `uv run benten` (or `factotum run benten`) starts the server.

**Modules:**

| Module | Drawer(s) it touches | State |
|---|---|---|
| **Chords** — progression + scale helper | `composition/`, `theory/` | MVP |
| **Studio** — record → overdub → play back | `recording/`, `riffs/` | Phase 2 |
| **Tabs** — tablature & reference search | `instruments/`, `theory/` | Phase 3 |
| **Effects** — custom effect-chain builder | `production/` | Phase 4 |

## 4. The MVP — Chord + Scale Helper (v1, silent)

The first thing built, and the proof that benten-as-app is worth running. **No
audio in v1** — it earns its keep on theory and diagrams alone. It answers one
question fast: *given this progression, what can I play over it, and where is that
on the neck?*

### 4.1 User flow

1. Pick a key (or leave it open) and **enter a chord progression** — by typing
   symbols (`Am7`, `D9`, `Cmaj7`) and/or clicking chords from a **palette** built
   from the chosen key.
2. The app suggests, using **practical chord-scale theory**:
   - for **each chord**, the fitting scale(s)/mode(s) to play over it (diatonic
     plus the obvious modal choices — e.g. Dorian over a `ii`), and
   - for the **whole progression**, the parent scale(s) that cover it and any
     spots where a chord pulls outside the key.
3. Each suggested scale (and the chord tones) renders on a **guitar fretboard**
   diagram.
4. **Save** the progression + its scale suggestions to `composition/` as a Markdown
   file, auto-named and auto-linked, so it lands in the drawer where songs grow up.

### 4.2 v1 scope (in)

- Chord entry: typed symbols **and** an in-key palette.
- Chord-scale suggestions per chord and over the whole progression (practical
  depth — enough to actually solo; no deep reharmonization).
- Guitar fretboard rendering of scales and chord tones (standard tuning).
- Save-to-`composition/` as clean, hand-editable Markdown.

### 4.3 v1 scope (out — deliberately deferred)

- **All audio / playback** — clicking to hear a chord, the practice loop, the
  metronome. This is the *very next* increment (§5, Phase 1.5), not v1.
- Piano keyboard diagram (fretboard only for v1).
- Other fretted instruments (bass, ukulele, mandolin) — one tuning, guitar, first.
- Deep theory: modal interchange, secondary dominants, tension/avoid-note maps,
  substitutions.

### 4.4 Done when

You can enter a real progression you're working on, read the scales you'd actually
use, see them on the neck, and find the saved Markdown file waiting in
`composition/` afterward — without touching a text editor.

## 5. Roadmap

Phases are sequential; each ends with something usable, not a half-built layer.

- **Phase 1 — Chords (silent MVP).** §4. Ships the app skeleton: FastAPI server,
  static front-end, `tonal.js`, file-write layer, Factotum registration.
- **Phase 1.5 — Chords, audible.** Add Web Audio: click-to-hear chords/notes, then
  a **practice loop** — the progression on a pad/piano with a metronome, looped, so
  you can solo over it live. The first audio in the app.
- **Phase 2 — Studio.** Mic capture via `getUserMedia`. Record a rhythm take, loop
  it, and **overdub a lead over it** — "jam with myself." Takes save as audio files
  in the local working dir, with a session note written to `recording/sessions/`
  and captured ideas offered to `riffs/`.
- **Phase 3 — Tabs.** Search for tablature and reference material fast, surfaced
  next to the relevant `instruments/` notes. (Source/ToS is an open question — §8.)
- **Phase 4 — Effects.** A modular **effect-chain builder** over Web Audio
  (`AudioWorklet`): wire up delay/reverb/distortion/filter blocks, audition them on
  Studio takes, and save chains as presets. The hardest DSP work; last on purpose.

## 6. Non-goals

- **Not a DAW.** No mixing console, automation lanes, mastering chain, or MIDI
  sequencing. Serious production stays in Logic/Ableton. benten complements it.
- **Not a theory textbook or course.** It answers *what fits here, now*; it doesn't
  teach harmony from first principles.
- **Not cloud, multi-user, or an account system.** Local, single-user, private.
- **Not a replacement for the drawers.** The Markdown workshop stands on its own;
  the app never becomes a prerequisite for using benten.

## 7. Success measures

This is a personal tool, so the only honest metric is use.

- The chord helper is opened while actually practicing, not just while building it.
- Progressions accumulate in `composition/` that were created *through* the app.
- Once Studio ships: overdub takes exist that wouldn't have been captured otherwise.
- The drawers stay hand-editable — nothing the app writes is something you couldn't
  read and fix by hand.

## 8. Open questions & risks

- **Tab search source (Phase 3).** Most tab sites have scraping/ToS constraints.
  Decide the source (an API, a licensed source, or user-supplied local tab files)
  before building. Flag, don't assume.
- **Effects scope (Phase 4).** "Design my own effects" = a modular chain of DSP
  *primitives* wired and saved as presets, not authoring novel DSP algorithms from
  scratch. Confirm before Phase 4.
- **Audio latency (Phase 2).** Browser overdub latency (monitoring + round-trip)
  may need a manual offset/calibration step to keep overdubs in time.
- **Fretboard reuse.** Build the fretboard renderer tuning-agnostic from the start
  so extending to bass/uke/mandolin later is configuration, not a rewrite.
