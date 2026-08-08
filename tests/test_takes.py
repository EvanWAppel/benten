"""Group S: the take-storage layer writes audio bytes into the working dir,
auto-named, extension-whitelisted, and never clobbering or escaping the dir."""

from datetime import date

import pytest

from benten.takes import ALLOWED_AUDIO_EXTS, store_take


def test_store_take_uses_date_slug_and_ext(tmp_path):
    path = store_take(tmp_path, "Rhythm Take", b"RIFF....", today=date(2026, 8, 1))
    assert path.name == "2026-08-01-rhythm-take.wav"
    assert path.read_bytes() == b"RIFF...."
    assert path.parent == tmp_path


def test_store_take_honors_explicit_extension(tmp_path):
    path = store_take(tmp_path, "idea", b"\x00\x01", ext=".flac", today=date(2026, 8, 1))
    assert path.suffix == ".flac"
    assert path.name == "2026-08-01-idea.flac"


def test_store_take_normalizes_extension(tmp_path):
    # A bare or upper-cased extension is accepted and normalized.
    a = store_take(tmp_path, "a", b"x", ext="WAV", today=date(2026, 8, 1))
    b = store_take(tmp_path, "b", b"x", ext=".AIFF", today=date(2026, 8, 1))
    assert a.suffix == ".wav"
    assert b.suffix == ".aiff"


def test_store_take_rejects_non_audio_extension(tmp_path):
    with pytest.raises(ValueError):
        store_take(tmp_path, "sneaky", b"x", ext=".exe", today=date(2026, 8, 1))


def test_store_take_never_clobbers(tmp_path):
    a = store_take(tmp_path, "same", b"first", today=date(2026, 8, 1))
    b = store_take(tmp_path, "same", b"second", today=date(2026, 8, 1))
    assert a != b
    assert b.name == "2026-08-01-same-2.wav"
    assert a.read_bytes() == b"first"
    assert b.read_bytes() == b"second"


def test_store_take_neutralizes_path_traversal(tmp_path):
    path = store_take(tmp_path, "../../etc/evil", b"x", today=date(2026, 8, 1))
    assert path.parent == tmp_path
    assert path.is_relative_to(tmp_path)


def test_allowed_exts_are_the_expected_set():
    assert ALLOWED_AUDIO_EXTS == {".wav", ".aiff", ".flac", ".webm"}
