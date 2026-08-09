# Deploying the benten demo

benten runs locally on `127.0.0.1` and is private by design. This file covers the
one exception: the **public, read-only demo** — the same app with saving turned off
so it can live in a portfolio without a rewrite. It deploys to
[Railway](https://railway.app) from the files already in this repo.

## What's in the repo for this

- **`Dockerfile`** — builds the image with `uv` (Python 3.12), installs from the
  lockfile, copies the web assets and the Markdown drawers.
- **`.dockerignore`** — keeps the image lean (no `audio/`, `.venv`, tests, `.git`).
- **`railway.json`** — tells Railway to build from the Dockerfile and health-check
  `/health`.
- **Read-only mode** — `BENTEN_DEMO=1` makes every write endpoint refuse (`403`) and
  the front-end show a "live demo — saving is off" banner. The Dockerfile sets this
  (and `HOST=0.0.0.0`) by default, so the demo image is read-only out of the box.

## The environment variables

| Var | Value | Why |
|---|---|---|
| `BENTEN_DEMO` | `1` | Read-only mode (baked into the Dockerfile; safe default). |
| `HOST` | `0.0.0.0` | Accept traffic in the container (baked in). |
| `PORT` | *(set by Railway)* | The app reads it automatically. |

You don't have to set any of these by hand — the Dockerfile bakes in the demo
defaults, and Railway injects `PORT`. They're listed so you know what's in play.

## Deploy it — GitHub-connected (recommended)

This repo is already on GitHub, so let Railway watch it and redeploy on every push.

1. Sign in at [railway.app](https://railway.app) (GitHub login is easiest).
2. **New Project → Deploy from GitHub repo →** pick `EvanWAppel/benten`.
3. Railway detects `railway.json` + the `Dockerfile` and builds. First build takes a
   couple of minutes.
4. **Settings → Networking → Generate Domain.** That's your public URL.
5. Put that URL in the README's **Live demo** line (top of the file), commit, push.

Every push to the deployed branch now rebuilds the demo automatically.

## Deploy it — Railway CLI (alternative)

The CLI login is interactive, so run these yourself. In this Claude session you can
prefix a command with `!` to run it here and capture the output.

```
! npm i -g @railway/cli      # or: brew install railway
! railway login              # opens a browser
railway init                 # create/link a project (run from this repo)
railway up                   # build & deploy from the Dockerfile
railway domain               # generate/print the public URL
```

`railway up` uploads the local build context, so it respects `.dockerignore`.

## After it's live — a quick check

- Visit the URL: the **🎧 Live demo** banner should be at the top.
- Build a progression and hit **save** — the status line should read *"Live demo —
  changes aren't saved here."* and nothing is written.
- `GET /health` returns `{"demo": true}`.
- The mic (Studio) needs a secure context — Railway's HTTPS domain provides it, so
  `getUserMedia` works in the demo.

## Going private / writable later

If you ever want a private, writable deploy instead, override `BENTEN_DEMO=0` in the
Railway variables (and gate access some other way — the app has no auth). For most
purposes, keep the public demo read-only.
