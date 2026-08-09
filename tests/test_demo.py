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
