"""Group A acceptance: the server boots and its routes answer."""

from fastapi.testclient import TestClient

from benten.server import app, composition_dir

client = TestClient(app)


def test_health_returns_ok():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["app"] == "benten"


def test_index_serves_the_shell():
    res = client.get("/")
    assert res.status_code == 200
    assert "benten" in res.text.lower()


def test_static_assets_are_served():
    res = client.get("/static/app.js")
    assert res.status_code == 200


def test_post_composition_writes_to_the_drawer(tmp_path):
    # Override the drawer so the test never touches the real composition/ dir.
    app.dependency_overrides[composition_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/compositions",
            json={"title": "Blues in A", "body": "# Blues in A\n"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["saved"] is True
    written = list(tmp_path.glob("*.md"))
    assert len(written) == 1
    assert written[0].read_text() == "# Blues in A\n"
