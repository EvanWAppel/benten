"""Storing audio takes in the local working dir.

Audio is the one thing benten does *not* commit (PRD §2, principle 4): takes are
big binaries that live in the git-ignored `audio/` dir and are referenced from the
notes by path. This writer mirrors `drawers.write_note` — auto-named, dated, never
clobbering, refusing to escape its target — but it takes raw bytes and only permits
known audio extensions. The target dir is an argument, so it's testable without
touching the real working dir.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from benten.drawers import _unique_path, slugify

# The only extensions a take may be written as. WAV/AIFF/FLAC are the DAW-friendly
# formats the PRD names; webm is what a browser MediaRecorder falls back to.
ALLOWED_AUDIO_EXTS = {".wav", ".aiff", ".flac", ".webm"}


def _normalize_ext(ext: str) -> str:
    """Lowercase, dot-prefixed, and whitelisted. Raises ValueError otherwise."""
    ext = ext.strip().lower()
    if not ext.startswith("."):
        ext = "." + ext
    if ext not in ALLOWED_AUDIO_EXTS:
        raise ValueError(f"refusing to write a non-audio take: {ext!r}")
    return ext


def store_take(
    base_dir: Path,
    name: str,
    data: bytes,
    *,
    ext: str = ".wav",
    today: date | None = None,
) -> Path:
    """Write `data` as a dated audio take in `base_dir`. Returns the path written.

    The filename is `YYYY-MM-DD-<slug><ext>`, de-duplicated so an existing take is
    never overwritten. Raises ValueError if `ext` isn't a known audio extension or
    if the resolved path would escape `base_dir` (defense in depth; the slug
    already strips separators).
    """
    ext = _normalize_ext(ext)
    base_dir = Path(base_dir)
    base_dir.mkdir(parents=True, exist_ok=True)

    stamp = (today or date.today()).isoformat()
    stem = f"{stamp}-{slugify(name)}"
    target = _unique_path(base_dir, stem, ext).resolve()

    if not target.is_relative_to(base_dir.resolve()):
        raise ValueError("refusing to write outside the audio dir")

    target.write_bytes(data)
    return target
