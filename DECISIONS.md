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
