# DECISIONS — the Ledger

The durable *why*. One entry per decision with a **real trade-off** — what was chosen, what was rejected, and why. Append-only; newest at the bottom. The agent drafts the entry; the human confirms it.

---

## 2026-09-26 — Dark "stage mode" UI, replacing the light studio-journal look

**Chosen:** Re-skin the app as a dark *stage console* built to be read across a
room mid-jam — near-black ground (`#14161a`), one bright red-rust accent
(`#e85835`, the "red pencil" brightened for dark), amber (`#e8b24a`) for chord
roots and the "now playing" glow, oversized glanceable progression chords
(`clamp(38px, 5.4vw, 60px)`), and a luminous fretboard on the darkest surface.
The left journal **sidebar became a slim sticky top bar** (brand · module tabs ·
live/workspace status), freeing the full page width for the chords.

**Rejected:**
- *Dark recolor only* (keep the journal layout, just invert the palette) — lower
  effort, but the sidebar + big decorative serif heading + `harmony-art` eat the
  horizontal and vertical space the jam use-case needs for large chords. The point
  was glanceability, not just a darker paint.
- *Amber-primary or cyan/electric accent* — both read well on dark, but keeping the
  existing red/rust preserves benten's identity; amber is kept as the secondary
  "stage light" (roots + now-playing) rather than the primary.

**Why it's safe / how it was done:** Pure presentation change — `index.html` shell
+ `web/style.css` only, no module JS touched. `app.js`'s four hooks
(`.module[data-module]`, `#workspace-name`, `#status`, `#view`) were all preserved
in the new top bar; every class the modules emit still resolves (compound classes
like `param-num`/`fx-up` inherit from `.param`/`.fx-ops button` exactly as before).
The decorative journal chrome (`harmony-art`) is hidden rather than removed, so the
DOM the JS builds is unchanged. Verified: `node --test jstests/theory.test.mjs`
(5/5 pass) and `curl` against `uv run benten` (health ok, index + `style.css` 200,
dark tokens present).


## 2026-09-26 — GitHub Actions CI: lint + typecheck + test on every PR

**Draft — awaiting Evan's confirmation.**

**Chosen:** A three-job workflow (`.github/workflows/ci.yml`) — `lint` (ruff check +
ruff format --check + ty), `test` (pytest across a Python 3.11/3.12/3.13 matrix), and
`frontend` (`node --test jstests/*.mjs`) — on every push to `master` and every PR into
it, with badges (CI, Ruff, Python) in the README. ruff + ty are pinned as **dev
dependencies** (via `uv add --optional dev`) and a repo-local **`ruff.toml`** fixes the
rule set (`E,F,W,I,UP,B`) so local and CI agree.

**Rejected / trade-offs:**
- *Ephemeral `uvx ruff`/`uvx ty` in CI* instead of pinned dev-deps — simpler, but the
  version floats, so a new ruff release could redden CI on unchanged code. Pinning in
  `uv.lock` makes runs reproducible.
- *Relying on ruff's default rules / ambient parent config* — the exotic findings we saw
  locally (DTZ, S) leaked from a parent-dir config that won't exist on the runner, so CI
  would have been non-deterministic. A repo-local `ruff.toml` pins the exact rule set.
- *"Fixing" the B008 findings by rewriting routes* — rejected. `Depends()` in argument
  defaults is FastAPI's intended idiom; `flake8-bugbear.extend-immutable-calls` whitelists
  it rather than distorting every handler.
- *`uv run pytest`* — the bare console script fails to spawn in this env even though pytest
  is installed; `uv run python -m pytest` is robust, so CI uses the module form.
- *Single-version test job* — a 3.11–3.13 matrix costs a little more CI time but proves the
  `requires-python >=3.11` claim rather than asserting it.

**Follow-up:** once the first run reports, make the `lint` / `test` / `frontend` checks
**required** in `master` branch protection (they're currently advisory).


## 2026-08-09 — Tabs come from Songsterr (external API), saved as link-out references

**Draft — awaiting Evan's confirmation.** *(Drafted 2026-10-22 for W-02 from the
`TASKS.md` Phase 3 notes and PRD §8; the decision shipped in Phase 3, PR #4.)*

**Chosen:** Tab search uses an external API, **Songsterr**. The network is touched
only on the search path (`GET /tabs/search` proxies Songsterr). Saving a find
(`POST /tabs`) writes a Markdown reference that links out into
`instruments/<instrument>/tabs/`, so no tab content is scraped or stored. The source
is one swappable constant in `src/benten/tabs.py`, and the HTTP fetch is injected so
the search logic tests without a network.

**Rejected / alternatives (PRD §8):**
- *A licensed tab source.* This was one of the three options PRD §8 left open. The
  Phase 3 notes don't record why it lost to Songsterr. **Evan to confirm.**
- *User-supplied local tab files.* This was also left open in PRD §8 and not chosen.
  The rationale isn't written down either. **Evan to confirm.**
- *Scraping tab sites.* PRD §8 notes that most tab sites have scraping/ToS
  constraints. That is why the source had to be decided before building, and why
  saving stores a link-out reference rather than the tab itself.

**Why it's safe / how it was done:** The network dependency stays on the search path.
Everything written to a drawer is a plain, hand-editable Markdown link, and swapping
the source means changing one constant. Live-verified in Phase 3: a real Songsterr
search, a valid link-out URL (it 301s to the tab page), and a clean Markdown reference
on disk.


## 2026-08-09 — Effects are native Web Audio nodes, not hand-written AudioWorklet DSP

**Draft — awaiting Evan's confirmation.** *(Drafted 2026-10-22 for W-02 from the
`TASKS.md` Phase 4 notes and PRD §8; the decision shipped in Phase 4, PR #6, and was
extended by PR #9.)*

**Chosen:** "Design my own effects" means a modular chain of ready-made Web Audio
**primitives**, wired together and saved as presets. It does not mean authoring
novel DSP algorithms. The four core blocks map onto native nodes: distortion is a
`WaveShaper`, filter is a `BiquadFilter`, delay is a `Delay` with feedback, and reverb
is a `Convolver` with a generated impulse. The native nodes *are* the primitives.
Presets render to clean, hand-editable Markdown in `production/effects/`, and they
round-trip.

**Rejected / alternatives:**
- *Hand-written `AudioWorklet` sample math (novel DSP).* PRD §8 settled the scope as
  primitives, not new algorithms. Because the four blocks map onto native nodes, none
  is needed. (`AudioWorklet` is still used in Studio for PCM capture. That is a
  separate use, not an effect.)

**Why it's safe / how it was done:** Adding a control stays cheap. Each one is a
`params` entry in `effects-model.js` plus wiring in the matching `BUILDERS` factory,
and the UI, clamping and preset round-trip follow from the model (Group FF added
tone/level/type, shelf/peaking/notch + gain, feedback-loop tone, and
predelay/damping this way). The audio stays client-side, as the PRD requires. The
flow was walked end-to-end in Group EE: build a chain, audition it on a take, save,
reload.
