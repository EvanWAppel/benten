"""Group B: the file layer writes clean, safe, non-clobbering notes."""

from datetime import date

import pytest

from benten.drawers import slugify, write_note


def test_slugify_basic():
    assert slugify("  ii-V-I in C major!  ") == "ii-v-i-in-c-major"


def test_slugify_empty_falls_back():
    assert slugify("///") == "untitled"


def test_write_note_uses_date_and_slug(tmp_path):
    path = write_note(tmp_path, "My Progression", "# hi\n", today=date(2026, 8, 1))
    assert path.name == "2026-08-01-my-progression.md"
    assert path.read_text() == "# hi\n"
    assert path.parent == tmp_path


def test_write_note_never_clobbers(tmp_path):
    a = write_note(tmp_path, "same", "first", today=date(2026, 8, 1))
    b = write_note(tmp_path, "same", "second", today=date(2026, 8, 1))
    assert a != b
    assert b.name == "2026-08-01-same-2.md"
    assert a.read_text() == "first"
    assert b.read_text() == "second"


def test_write_note_neutralizes_path_traversal(tmp_path):
    # A malicious title must not escape the drawer; the slug strips separators.
    path = write_note(tmp_path, "../../etc/passwd", "x", today=date(2026, 8, 1))
    assert path.parent == tmp_path
    assert path.is_relative_to(tmp_path)
