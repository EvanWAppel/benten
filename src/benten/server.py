"""The benten server — a thin FastAPI app.

Its only jobs: serve the front-end and (later) read/write the Markdown drawers.
No music logic and no audio pass through here — that all lives in the browser.
"""

import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from benten import __version__
from benten.drawers import slugify, write_note
from benten.paths import (
    AUDIO_DIR,
    COMPOSITION_DIR,
    INSTRUMENTS_DIR,
    PRESETS_DIR,
    REPO_ROOT,
    RIFFS_DIR,
    SESSIONS_DIR,
    WEB_DIR,
)
from benten.tabs import Fetch, _http_get, search_tabs
from benten.takes import store_take

app = FastAPI(title="benten", version=__version__)

# Read-only demo mode (for the public Railway demo). benten is local-first and
# single-user by design (PRD §2); a public demo departs from that, so when
# BENTEN_DEMO=1 every write is refused server-side — the interactive, client-side
# features (playback, fretboard, effects audition, mic, tab search) all still work.
DEMO_MSG = "benten is running as a read-only live demo — saving is disabled."


def is_demo() -> bool:
    return os.environ.get("BENTEN_DEMO") == "1"


def require_writable() -> None:
    """Guard for write routes: refuse in demo mode (defense in depth — the client
    also gates saves, but a direct API call must not be able to write either)."""
    if is_demo():
        raise HTTPException(status_code=403, detail=DEMO_MSG)


def composition_dir() -> Path:
    """Injectable so tests can point writes at a temp dir."""
    return COMPOSITION_DIR


def audio_dir() -> Path:
    """Injectable so tests can point take writes at a temp dir."""
    return AUDIO_DIR


def sessions_dir() -> Path:
    """Injectable so tests can point session-note writes at a temp dir."""
    return SESSIONS_DIR


def riffs_dir() -> Path:
    """Injectable so tests can point riff-capture writes at a temp dir."""
    return RIFFS_DIR


def instruments_dir() -> Path:
    """Injectable so tests can point tab-reference writes at a temp dir."""
    return INSTRUMENTS_DIR


def presets_dir() -> Path:
    """Injectable so tests can point effect-preset writes at a temp dir."""
    return PRESETS_DIR


def tab_fetcher() -> Fetch:
    """Injectable so tests can search without touching the network."""
    return _http_get


def _repo_relative(path: Path) -> str:
    """A repo-relative path for display, falling back to the bare filename."""
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return path.name


class NotePayload(BaseModel):
    title: str
    body: str


class TabNotePayload(NotePayload):
    instrument: str = "guitar"


@app.get("/health")
def health() -> dict:
    """Liveness signal — probed by the Factotum manifest's health-ping.

    Also reports `demo` so the front-end can show a read-only banner and skip saves.
    """
    return {"status": "ok", "app": "benten", "version": __version__, "demo": is_demo()}


@app.post("/compositions")
def create_composition(
    note: NotePayload,
    comp_dir: Path = Depends(composition_dir),
    _: None = Depends(require_writable),
) -> dict:
    """Save a Markdown note into the composition/ drawer; return where it landed."""
    path = write_note(comp_dir, note.title, note.body)
    return {"saved": True, "path": _repo_relative(path)}


@app.post("/takes")
async def create_take(
    request: Request,
    name: str = "take",
    ext: str = ".wav",
    audio: Path = Depends(audio_dir),
    _: None = Depends(require_writable),
) -> dict:
    """Store an audio take (raw bytes in the body) in the git-ignored audio/ dir.

    The take name and extension come in as query params; the body is the audio
    itself. Only known audio extensions are accepted (400 otherwise).
    """
    data = await request.body()
    try:
        path = store_take(audio, name, data, ext=ext)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"saved": True, "path": _repo_relative(path)}


@app.post("/sessions")
def create_session(
    note: NotePayload,
    sess_dir: Path = Depends(sessions_dir),
    _: None = Depends(require_writable),
) -> dict:
    """Save a Studio session note into recording/sessions/; return where it landed."""
    path = write_note(sess_dir, note.title, note.body)
    return {"saved": True, "path": _repo_relative(path)}


@app.post("/riffs")
def create_riff(
    note: NotePayload,
    riff_dir: Path = Depends(riffs_dir),
    _: None = Depends(require_writable),
) -> dict:
    """Capture a riff idea into riffs/; return where it landed."""
    path = write_note(riff_dir, note.title, note.body)
    return {"saved": True, "path": _repo_relative(path)}


@app.post("/presets")
def create_preset(
    note: NotePayload,
    pdir: Path = Depends(presets_dir),
    _: None = Depends(require_writable),
) -> dict:
    """Save an effect-chain preset (Markdown) into production/effects/."""
    path = write_note(pdir, note.title, note.body)
    return {"saved": True, "path": _repo_relative(path)}


@app.get("/presets")
def list_presets(pdir: Path = Depends(presets_dir)) -> dict:
    """List saved presets (filename stem + raw Markdown body) for loading back in."""
    presets = []
    if pdir.is_dir():
        for f in sorted(pdir.glob("*.md")):
            presets.append({"name": f.stem, "body": f.read_text(encoding="utf-8")})
    return {"presets": presets}


@app.get("/tabs/search")
def tabs_search(
    q: str = "",
    fetch: Fetch = Depends(tab_fetcher),
) -> dict:
    """Search the external tab source (Songsterr). Network on the search path only —
    saving a result writes a Markdown reference into a drawer (see POST /tabs)."""
    try:
        results = search_tabs(q, fetch=fetch)
    except Exception as e:  # network/parse failure from an upstream we don't own
        raise HTTPException(status_code=502, detail=f"tab search failed: {e}") from e
    return {"query": q.strip(), "results": results}


@app.post("/tabs")
def create_tab(
    note: TabNotePayload,
    instr_root: Path = Depends(instruments_dir),
    _: None = Depends(require_writable),
) -> dict:
    """Save a tab *reference* (Markdown, links out) into instruments/<instrument>/tabs/.

    The instrument must be an existing drawer under the instruments root — this both
    picks the right drawer and keeps the write from escaping it.
    """
    slug = slugify(note.instrument)
    drawer = (instr_root / slug).resolve()
    if not drawer.is_relative_to(instr_root.resolve()) or not drawer.is_dir():
        raise HTTPException(status_code=400, detail=f"unknown instrument: {note.instrument}")
    path = write_note(drawer / "tabs", note.title, note.body)
    return {"saved": True, "path": _repo_relative(path)}


@app.get("/")
def index() -> FileResponse:
    """The app shell."""
    return FileResponse(WEB_DIR / "index.html")


class NoCacheStaticFiles(StaticFiles):
    """Serve static assets with `Cache-Control: no-cache` so the browser always
    revalidates. This is a no-build, edit-and-reload app — stale JS/CSS from the
    browser cache would silently serve old code after an edit (it bit us once).
    `no-cache` still allows 304s, so unchanged files stay cheap.
    """

    def file_response(self, *args, **kwargs) -> Response:
        resp = super().file_response(*args, **kwargs)
        resp.headers["Cache-Control"] = "no-cache"
        return resp


# Static assets (JS modules, CSS). The shell references these under /static.
app.mount("/static", NoCacheStaticFiles(directory=WEB_DIR), name="static")


def run() -> None:
    """Console-script entry point: `uv run benten`.

    Local default stays 127.0.0.1:8788 (private, per PRD §2). A host like Railway
    overrides via env: HOST=0.0.0.0 to accept traffic, PORT from the platform.
    """
    import uvicorn

    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8788"))
    uvicorn.run("benten.server:app", host=host, port=port, reload=False)
