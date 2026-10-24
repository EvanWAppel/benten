# benten — PRIMER

## Next session — 2026-10-24 weekend

**Goal (2 lines).** benten is Evan's musical workshop: six Markdown drawers plus a small
local FastAPI + no-build vanilla-JS app (Chords, Studio, Tabs, Effects) that writes clean,
hand-editable Markdown back into the drawers. Markdown stays the source of truth; the app is optional.

**Current state (2026-10-23, `master` @ 6d1393e).** Every build task in `TASKS.md`
(Groups A–H, Phase 1.5, 2, 3, 4/FF) is done, and so is the whole "Weekend 2026-10-24" group
(W-01…W-06, merged in PR #19). PR #21 cleared the stale Railway blockers and PR #20 synced the
blocker protocol. The only open `TASKS.md` items are Evan's own dogfood logs (H, X, Phase 3).
On `master` (measured 2026-10-24), `pytest` 41 passed, `node --test` 85 passed, and ruff and ty
are clean. One starlette/httpx deprecation warning is harmless. The public read-only demo
is live at https://benten-production.up.railway.app/ (`/health` returns `demo: true`).
No PRs are open. Per `BLOCKED.md`, the local checkout `~/Documents/portfolio/benten` still has an
unmerged WIP commit on `feat/favicon` (a2003c3: `AGENTS.md` and a CLAUDE.md ROCRLL tweak). That is
Evan's work, so don't redo it and don't touch that checkout.

**Work in a fresh worktree off `origin/master`, one branch + one PR per task.** Open PRs,
**never merge**. Railway is GitHub-connected, so a merge to `master` redeploys the public demo.

### Autonomous tasks

**None queued.** The "Weekend 2026-10-24" tasks W-01…W-06 all merged in PR #19 (docs refresh,
draft Ledger entries, degree-label toggle, demo-guard test, tunings catalog, piano keyboard).
Every remaining open item in `TASKS.md` is Evan's dogfood log, and everything in `BLOCKED.md`
is his to do (dogfood logs, confirming the two W-02 draft Ledger entries, the `feat/favicon` WIP,
verifying `project.toml`). Don't start new work without a task from Evan in `TASKS.md`.

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
