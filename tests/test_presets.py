"""Effect-preset storage — Phase 4. Writes go to an injected temp dir, never the
real production/ drawer."""

from fastapi.testclient import TestClient

from benten.server import app, presets_dir

client = TestClient(app)


def test_post_preset_writes_into_the_presets_dir(tmp_path):
    app.dependency_overrides[presets_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/presets",
            json={"title": "Ambient lead", "body": "# Ambient lead — effect chain\n"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["saved"] is True
    written = list(tmp_path.glob("*.md"))
    assert len(written) == 1
    assert written[0].read_text() == "# Ambient lead — effect chain\n"


def test_get_presets_lists_saved_presets(tmp_path):
    (tmp_path / "2026-08-09-ambient-lead.md").write_text("# Ambient lead — effect chain\n")
    (tmp_path / "2026-08-09-crunch.md").write_text("# Crunch — effect chain\n")

    app.dependency_overrides[presets_dir] = lambda: tmp_path
    try:
        res = client.get("/presets")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    presets = res.json()["presets"]
    assert [p["name"] for p in presets] == ["2026-08-09-ambient-lead", "2026-08-09-crunch"]
    assert presets[0]["body"] == "# Ambient lead — effect chain\n"


def test_get_presets_is_empty_when_the_dir_is_missing(tmp_path):
    app.dependency_overrides[presets_dir] = lambda: tmp_path / "nope"
    try:
        res = client.get("/presets")
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["presets"] == []
