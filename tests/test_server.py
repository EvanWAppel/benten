"""Group A acceptance: the server boots and its routes answer."""

from fastapi.testclient import TestClient

from benten.server import app, audio_dir, composition_dir, riffs_dir, sessions_dir

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


def test_post_take_stores_audio_bytes(tmp_path):
    app.dependency_overrides[audio_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/takes",
            params={"name": "Rhythm Take", "ext": ".wav"},
            content=b"RIFFfake-wav-bytes",
            headers={"Content-Type": "audio/wav"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    body = res.json()
    assert body["saved"] is True
    written = list(tmp_path.glob("*.wav"))
    assert len(written) == 1
    assert written[0].read_bytes() == b"RIFFfake-wav-bytes"
    # The returned path points at the file that was written.
    assert body["path"].endswith(written[0].name)


def test_post_take_rejects_non_audio_extension(tmp_path):
    app.dependency_overrides[audio_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/takes",
            params={"name": "sneaky", "ext": ".exe"},
            content=b"x",
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 400
    assert list(tmp_path.glob("*")) == []


def test_post_session_writes_to_recording_sessions(tmp_path):
    app.dependency_overrides[sessions_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/sessions",
            json={"title": "Tuesday jam", "body": "# Tuesday jam\n"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    assert res.json()["saved"] is True
    written = list(tmp_path.glob("*.md"))
    assert len(written) == 1
    assert written[0].read_text() == "# Tuesday jam\n"


def test_post_riff_writes_to_the_riffs_drawer(tmp_path):
    app.dependency_overrides[riffs_dir] = lambda: tmp_path
    try:
        res = client.post(
            "/riffs",
            json={"title": "descending lick", "body": "# descending lick\n"},
        )
    finally:
        app.dependency_overrides.clear()

    assert res.status_code == 200
    written = list(tmp_path.glob("*.md"))
    assert len(written) == 1
    assert written[0].read_text() == "# descending lick\n"
