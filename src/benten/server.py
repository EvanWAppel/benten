"""The benten server — a thin FastAPI app.

Its only jobs: serve the front-end and (later) read/write the Markdown drawers.
No music logic and no audio pass through here — that all lives in the browser.
"""

from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from benten import __version__
from benten.drawers import write_note
from benten.paths import (
    AUDIO_DIR,
    COMPOSITION_DIR,
    REPO_ROOT,
    RIFFS_DIR,
    SESSIONS_DIR,
    WEB_DIR,
)
from benten.takes import store_take

app = FastAPI(title="benten", version=__version__)


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


def _repo_relative(path: Path) -> str:
    """A repo-relative path for display, falling back to the bare filename."""
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return path.name


class NotePayload(BaseModel):
    title: str
    body: str


@app.get("/health")
def health() -> dict:
    """Liveness signal — probed by the Factotum manifest's health-ping."""
    return {"status": "ok", "app": "benten", "version": __version__}


@app.post("/compositions")
def create_composition(
    note: NotePayload,
    comp_dir: Path = Depends(composition_dir),
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
) -> dict:
    """Save a Studio session note into recording/sessions/; return where it landed."""
    path = write_note(sess_dir, note.title, note.body)
    return {"saved": True, "path": _repo_relative(path)}


@app.post("/riffs")
def create_riff(
    note: NotePayload,
    riff_dir: Path = Depends(riffs_dir),
) -> dict:
    """Capture a riff idea into riffs/; return where it landed."""
    path = write_note(riff_dir, note.title, note.body)
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
    """Console-script entry point: `uv run benten`."""
    import uvicorn

    uvicorn.run("benten.server:app", host="127.0.0.1", port=8788, reload=False)
