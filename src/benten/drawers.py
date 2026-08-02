"""Writing notes back into the drawers.

The one hard rule (PRD §2): everything the app writes is clean, hand-editable
Markdown that lands *inside* a drawer and never clobbers an existing file. The
writer takes its target directory as an argument, so it's fully testable without
touching the real drawers.
"""

from __future__ import annotations

import re
from datetime import date
from pathlib import Path

_SLUG_MAX = 60


def slugify(text: str) -> str:
    """A filename-safe slug: lowercase, alphanumerics, single hyphens."""
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = text[:_SLUG_MAX].strip("-")
    return text or "untitled"


def _unique_path(base_dir: Path, stem: str, suffix: str) -> Path:
    """First free `stem.suffix`, then `stem-2.suffix`, `stem-3.suffix`, …"""
    candidate = base_dir / f"{stem}{suffix}"
    n = 2
    while candidate.exists():
        candidate = base_dir / f"{stem}-{n}{suffix}"
        n += 1
    return candidate


def write_note(
    base_dir: Path,
    title: str,
    body: str,
    *,
    today: date | None = None,
) -> Path:
    """Write `body` as a dated Markdown note in `base_dir`. Returns the path written.

    The filename is `YYYY-MM-DD-<slug>.md`, de-duplicated so an existing file is
    never overwritten. Raises ValueError if the resolved path would escape
    `base_dir` (defense in depth; the slug already strips separators).
    """
    base_dir = Path(base_dir)
    base_dir.mkdir(parents=True, exist_ok=True)

    stamp = (today or date.today()).isoformat()
    stem = f"{stamp}-{slugify(title)}"
    target = _unique_path(base_dir, stem, ".md").resolve()

    if not target.is_relative_to(base_dir.resolve()):
        raise ValueError("refusing to write outside the drawer")

    target.write_text(body, encoding="utf-8")
    return target
