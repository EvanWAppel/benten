"""The benten server — a thin FastAPI app.

Its only jobs: serve the front-end and (later) read/write the Markdown drawers.
No music logic and no audio pass through here — that all lives in the browser.
"""

from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from benten import __version__
from benten.drawers import write_note
from benten.paths import COMPOSITION_DIR, REPO_ROOT, WEB_DIR

app = FastAPI(title="benten", version=__version__)


def composition_dir() -> Path:
    """Injectable so tests can point writes at a temp dir."""
    return COMPOSITION_DIR


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
    try:
        where = str(path.relative_to(REPO_ROOT))
    except ValueError:
        where = path.name
    return {"saved": True, "path": where}


@app.get("/")
def index() -> FileResponse:
    """The app shell."""
    return FileResponse(WEB_DIR / "index.html")


# Static assets (JS modules, CSS). The shell references these under /static.
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")


def run() -> None:
    """Console-script entry point: `uv run benten`."""
    import uvicorn

    uvicorn.run("benten.server:app", host="127.0.0.1", port=8788, reload=False)
