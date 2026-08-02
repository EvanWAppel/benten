"""Group A acceptance: the server boots and its routes answer."""

from fastapi.testclient import TestClient

from benten.server import app

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
