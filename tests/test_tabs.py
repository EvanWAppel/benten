"""Tab search + save — Phase 3. The network fetch is injected, so nothing here
touches Songsterr or the real drawers."""

import json

import pytest

from benten.tabs import search_tabs

# A canned Songsterr-shaped response: one string-artist record, one object-artist
# record, and two malformed records that must be dropped.
CANNED = json.dumps(
    [
        {"songId": 123, "title": "Blackbird", "artist": "The Beatles"},
        {"id": 456, "title": "Little Wing", "artist": {"name": "Jimi Hendrix"}},
        {"songId": 789, "artist": "No Title Here"},  # no title -> dropped
        {"title": "No Id Here", "artist": "Nobody"},  # no id -> dropped
    ]
)


def test_search_normalises_songsterr_records():
    results = search_tabs("wing", fetch=lambda url: CANNED)
    assert len(results) == 2
    first, second = results
    assert first == {
        "title": "Blackbird",
        "artist": "The Beatles",
        "url": "https://www.songsterr.com/a/wa/song?id=123",
        "source": "Songsterr",
    }
    # Object-shaped artist is flattened to its name; `id` works like `songId`.
    assert second["artist"] == "Jimi Hendrix"
    assert second["url"].endswith("id=456")


def test_search_passes_the_query_as_the_pattern_param():
    seen = {}

    def spy(url):
        seen["url"] = url
        return "[]"

    search_tabs("black bird", fetch=spy)
    assert "pattern=black+bird" in seen["url"]


def test_empty_query_never_touches_the_network():
    def boom(url):
        raise AssertionError("fetch should not be called for an empty query")

    assert search_tabs("   ", fetch=boom) == []


def test_non_list_payload_yields_no_results():
    assert search_tabs("x", fetch=lambda url: '{"error": "nope"}') == []


# --- endpoints ------------------------------------------------------------

from fastapi.testclient import TestClient

from benten.server import app, instruments_dir, tab_fetcher

client = TestClient(app)


def test_search_endpoint_returns_normalised_results():
    app.dependency_overrides[tab_fetcher] = lambda: (lambda url: CANNED)
    try:
        res = client.get("/tabs/search", params={"q": "wing"})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    body = res.json()
    assert body["query"] == "wing"
    assert [r["title"] for r in body["results"]] == ["Blackbird", "Little Wing"]


def test_search_endpoint_reports_upstream_failure_as_502():
    def boom():
        def fetch(url):
            raise RuntimeError("upstream down")

        return fetch

    app.dependency_overrides[tab_fetcher] = boom
    try:
        res = client.get("/tabs/search", params={"q": "x"})
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 502


def test_post_tab_writes_a_reference_into_the_instrument_drawer(tmp_path):
    (tmp_path / "guitar").mkdir()
    app.dependency_overrides[instruments_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/tabs",
            json={
                "title": "The Beatles — Blackbird",
                "body": "# Blackbird\n",
                "instrument": "guitar",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["saved"] is True
    written = list((tmp_path / "guitar" / "tabs").glob("*.md"))
    assert len(written) == 1
    assert written[0].read_text() == "# Blackbird\n"


def test_post_tab_rejects_an_unknown_instrument(tmp_path):
    app.dependency_overrides[instruments_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/tabs",
            json={"title": "x", "body": "x", "instrument": "kazoo"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 400
    assert list(tmp_path.glob("**/*.md")) == []
