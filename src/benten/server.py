"""The benten server — a thin FastAPI app.

Its only jobs: serve the front-end and (later) read/write the Markdown drawers.
No music logic and no audio pass through here — that all lives in the browser.
"""

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from benten import __version__
from benten.paths import WEB_DIR

app = FastAPI(title="benten", version=__version__)


@app.get("/health")
def health() -> dict:
    """Liveness signal — probed by the Factotum manifest's health-ping."""
    return {"status": "ok", "app": "benten", "version": __version__}


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
