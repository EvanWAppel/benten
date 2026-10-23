# benten — PRIMER

## Next session — 2026-10-24 weekend

**Goal (2 lines).** benten is Evan's musical workshop: six Markdown drawers plus a small
local FastAPI + no-build vanilla-JS app (Chords, Studio, Tabs, Effects) that writes clean,
hand-editable Markdown back into the drawers. Markdown stays the source of truth; the app is optional.

**Current state (2026-10-22, `master` @ 42d20e5).** Every build task in `TASKS.md`
(Groups A–H, Phase 1.5, 2, 3, 4/FF) is done. The only open items left are Evan's own
dogfood logs (H, X, Phase 3). On `master`, everything passes: `pytest` 39 passed, `node --test` 67
passed, and ruff and ty are clean. One starlette/httpx deprecation warning is harmless. The public read-only demo
is live at https://benten-production.up.railway.app/ (`/health` returns `demo: true`).
No PRs are open. The local checkout `~/Documents/portfolio/benten` is on `feat/favicon` with an
unmerged WIP snapshot commit (a2003c3: `AGENTS.md` and a CLAUDE.md ROCRLL tweak). That is Evan's
work, so don't redo it and don't touch that checkout.

**Work in a fresh worktree off `origin/master`, one branch + one PR per task.** Open PRs,
**never merge**. Railway is GitHub-connected, so a merge to `master` redeploys the public demo.

### Autonomous tasks, in order (ids are in `TASKS.md` → "Weekend 2026-10-24")

| # | Task | Done when | Test |
|---|---|---|---|
| W-01 | Docs refresh: fix CLAUDE.md's stale "Current state" (still says Group A). Bump the PRD status/date and mark the §8 open questions resolved (tabs = Songsterr, effects = native primitives, latency = front-trim offset), with pointers to TASKS/DECISIONS | No doc claims work is "next" when it has already shipped | `uv run python -m pytest -q` (no regressions) |
| W-02 | DECISIONS.md: draft two Ledger entries, **marked "Draft — awaiting Evan's confirmation"**: Songsterr as tab source (vs licensed/local files) and Effects = native Web Audio nodes (vs hand-written AudioWorklet DSP). Source them only from TASKS.md/PRD text and don't invent rationale | Two entries appended in the existing format | none (docs) |
| W-03 | Fretboard degree-label toggle (the "degree toggle deferred" note in Group F): `fretboardSVG({labels: "note"\|"degree"})` + a toggle in the Chords UI | New node tests pass; the default output is unchanged | `node --test jstests/*.mjs` |
| W-04 | Demo-guard completeness test: enumerate `app.routes` and assert that every non-GET route returns 403 under `BENTEN_DEMO=1`, so a future write route can't slip past `require_writable` | Test passes and fails if the guard is removed from any route | `uv run python -m pytest -q` |
| W-05 | Instrument tunings (PRD §4.3/§8): a `TUNINGS` catalog (guitar, bass EADG, ukulele GCEA re-entrant, mandolin GDAE) + a selector feeding `fretboardSVG({tuning})`. Keep chord boxes guitar-only unless tests prove otherwise | Tests check string count and open-string notes per tuning; guitar is still the default | `node --test jstests/*.mjs` |
| W-06 | Piano keyboard diagram (PRD §4.3 deferred): a pure `keyboardSVG({scale, chordSymbol})` with the same degree colours and chord-tone ring as the fretboard, plus a view toggle | Node tests for the highlighted keys, plus a README line | `node --test jstests/*.mjs` |

Each PR must leave the full CI set green: `uv run ruff check . && uv run ruff format --check . && uv run ty check && uv run python -m pytest -q && node --test jstests/*.mjs`.
Install with `uv sync --extra dev --frozen`. Use `python -m pytest`, because the bare `pytest` script won't spawn here.
For UI changes, verify the server with `uv run benten` + `curl` (index, the module JS and the `/health` route return 200). Don't use a browser.

### House rules (from CLAUDE.md)
- **TDD**: write the failing test first. The file layer is I/O-injectable, so pass a temp dir.
- One task = one small, verifiable change. Check it off in `TASKS.md` in the same PR.
- Front-end is **no-build vanilla ES modules**: no React, no bundler, no new deps. Theory comes from vendored `tonal.js`.
- Backend stays thin. Music and audio logic belongs client-side.
- Anything written to a drawer must be clean, hand-editable Markdown. Prose follows Evan's bench/drawer voice.
- Every decision with a real trade-off goes into DECISIONS.md as a *draft*. Evan confirms it.
- If something is unclear, stop and record it in `BLOCKED.md`. Don't guess.

### Do NOT
- Merge any PR, push to `master`, or touch Railway. A merge **is** a deploy here.
- Write the dogfood logs (H, X-002, Phase-3 tab find). They must be Evan's real sessions and are never fabricated.
- Use browser automation to "walk the flow". Verify with tests and curl only.
- Edit the `~/Documents/portfolio/benten` checkout or the `feat/favicon` WIP (AGENTS.md).
- Read `.env*`, add paid API keys, or change the Songsterr source (that's an Evan decision).
- Flip `verified = true` in `project.toml`. Evan's own benten session does that.
- No `.gitattributes`/git-crypt paths exist in this repo. If one appears, leave it alone.
