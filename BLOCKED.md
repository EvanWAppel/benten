# BLOCKED — what I need from Evan

- [ ] 🟡 **Dogfood the Chords module (H-001)** — log your first real practice session in `practice-log.md`. Only you can do the real-world validation.
- [ ] 🟡 **First real Studio session log (X-002)** — capture a real overdub take and log the session in `practice-log.md`.
- [ ] 🟡 **First real tab find (Phase 3)** — document your first Songsterr tab search in an instrument `practice-log.md`.
- [ ] 🟡 **Confirm the two W-02 draft Ledger entries in `DECISIONS.md`** (Songsterr tabs; native Web Audio effects, both dated 2026-08-09). The CI entry was confirmed in blocker triage 2026-10-23. Read each one and replace its "Draft — awaiting Evan's confirmation" line with "Confirmed" if it matches what you decided, or edit it.
- [ ] 🟡 **Unmerged WIP on local branch `feat/favicon`.** Commit a2003c3 (`AGENTS.md` + a ROCRLL tweak in CLAUDE.md) sits on `feat/favicon`, but PR #18 already merged without it. In `~/Documents/portfolio/benten`, either open a PR for it (`git switch -c docs/agents-md a2003c3 && git push -u origin HEAD && gh pr create`) or drop it.
- [ ] 🟡 **Verify `project.toml`.** The draft fills `services = ["benten"]` from the origin URL, and leaves `auth.target = "unknown"`. Check the Railway service name in the dashboard, decide whether the read-only demo should ever sit behind Cloudflare Access, then set `verified = true`.

