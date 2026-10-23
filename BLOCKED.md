# BLOCKED — what I need from Evan

- [ ] 🟡 **Public demo deploy to Railway** — the read-only demo is fully configured (`Dockerfile` + `railway.json` in place, no API keys needed). Sign in to railway.app, create a project from the GitHub repo, generate a public domain. See `DEPLOY.md`. The only action is pressing the button.
- [ ] 🟡 **Dogfood the Chords module (H-001)** — log your first real practice session in `practice-log.md`. Only you can do the real-world validation.
- [ ] 🟡 **First real Studio session log (X-002)** — capture a real overdub take and log the session in `practice-log.md`.
- [ ] 🟡 **First real tab find (Phase 3)** — document your first Songsterr tab search in an instrument `practice-log.md`.
- [ ] 🟡 **Stale item check: the Railway demo is already live.** `https://benten-production.up.railway.app/health` returned 200 `{"demo": true}` on 2026-10-22, so the "Public demo deploy to Railway" item above looks done. Tick it in this file if you agree.
- [ ] 🟡 **Confirm the draft Ledger entries in `DECISIONS.md`.** The 2026-09-26 CI entry is marked "Draft — awaiting Evan's confirmation" (weekend task W-02 adds two more drafts). Read each one and delete the "Draft" line if it matches what you decided, or edit it.
- [ ] 🟡 **Unmerged WIP on local branch `feat/favicon`.** Commit a2003c3 (`AGENTS.md` + a ROCRLL tweak in CLAUDE.md) sits on `feat/favicon`, but PR #18 already merged without it. In `~/Documents/portfolio/benten`, either open a PR for it (`git switch -c docs/agents-md a2003c3 && git push -u origin HEAD && gh pr create`) or drop it.
- [ ] 🟡 **Verify `project.toml`.** The draft fills `services = ["benten"]` from the origin URL, and leaves `auth.target = "unknown"`. Check the Railway service name in the dashboard, decide whether the read-only demo should ever sit behind Cloudflare Access, then set `verified = true`.

