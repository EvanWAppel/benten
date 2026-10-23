"""Read-only demo mode (BENTEN_DEMO=1) — the public-demo safety gate."""

from fastapi.testclient import TestClient

from benten.server import app, composition_dir, presets_dir

client = TestClient(app)


def test_not_in_demo_mode_by_default():
    assert client.get("/health").json()["demo"] is False


def test_health_reports_demo_flag(monkeypatch):
    monkeypatch.setenv("BENTEN_DEMO", "1")
    assert client.get("/health").json()["demo"] is True


def test_writes_are_refused_in_demo_mode(monkeypatch, tmp_path):
    monkeypatch.setenv("BENTEN_DEMO", "1")
    app.dependency_overrides[composition_dir] = lambda: tmp_path
    try:
        res = client.post("/compositions", json={"title": "x", "body": "# x\n"})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 403
    assert list(tmp_path.glob("*.md")) == []  # nothing written


def test_reads_still_work_in_demo_mode(monkeypatch, tmp_path):
    # Listing presets is a read — it must keep working when the demo is read-only.
    monkeypatch.setenv("BENTEN_DEMO", "1")
    app.dependency_overrides[presets_dir] = lambda: tmp_path
    try:
        res = client.get("/presets")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["presets"] == []


# --- Guard completeness (W-04) ------------------------------------------------
# Rather than list the write routes by hand, enumerate app.routes: every route that
# accepts a non-GET method must refuse in demo mode. A new write route added without
# `Depends(require_writable)` fails here instead of slipping onto the public demo.

_READ_METHODS = {"GET", "HEAD", "OPTIONS"}


def _write_routes() -> list[tuple[str, str]]:
    from fastapi.routing import APIRoute

    return sorted(
        (method, route.path)
        for route in app.routes
        if isinstance(route, APIRoute)
        for method in (route.methods or set()) - _READ_METHODS
    )


def test_write_routes_are_enumerated():
    # Keeps the guard test from passing vacuously if enumeration ever finds nothing.
    routes = _write_routes()
    assert ("POST", "/compositions") in routes
    assert len(routes) >= 6


def test_every_write_route_is_refused_in_demo_mode(monkeypatch, tmp_path):
    from benten.server import (
        audio_dir,
        instruments_dir,
        riffs_dir,
        sessions_dir,
    )

    monkeypatch.setenv("BENTEN_DEMO", "1")
    # Point every drawer at the temp dir, with a payload that *would* save if the
    # guard were missing — so a 403 means refused, not merely malformed.
    (tmp_path / "guitar").mkdir()
    for dep in (
        composition_dir,
        audio_dir,
        sessions_dir,
        riffs_dir,
        instruments_dir,
        presets_dir,
    ):
        app.dependency_overrides[dep] = lambda: tmp_path
    payload = {"title": "x", "body": "# x\n", "instrument": "guitar"}

    leaks = []
    try:
        for method, path in _write_routes():
            url = path.replace("{", "").replace("}", "")  # fill any path params
            res = client.request(method, url, json=payload)
            if res.status_code != 403:
                leaks.append(f"{method} {path} -> {res.status_code}")
    finally:
        app.dependency_overrides.clear()

    assert leaks == [], f"write routes not guarded by require_writable: {leaks}"
    assert [p for p in tmp_path.rglob("*") if p.is_file()] == []  # nothing written
