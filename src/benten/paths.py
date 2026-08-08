"""Where things live on disk.

Everything is resolved relative to the repo root, computed from this file's
location — so the server finds the web assets and the Markdown drawers no matter
what directory it's launched from.
"""

from pathlib import Path

# src/benten/paths.py -> parents[0]=benten, [1]=src, [2]=repo root
REPO_ROOT = Path(__file__).resolve().parents[2]

WEB_DIR = REPO_ROOT / "web"

# The Markdown drawers (the source of truth). The file layer writes here.
COMPOSITION_DIR = REPO_ROOT / "composition"
THEORY_DIR = REPO_ROOT / "theory"
RIFFS_DIR = REPO_ROOT / "riffs"
RECORDING_DIR = REPO_ROOT / "recording"
SESSIONS_DIR = RECORDING_DIR / "sessions"

# Local working dir for audio takes — git-ignored, never committed (PRD §2).
AUDIO_DIR = REPO_ROOT / "audio"
