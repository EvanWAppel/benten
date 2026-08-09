"""Tab search — Phase 3.

The source is an external API (**Songsterr**), the decision resolved for PRD §8.
Only *search* touches the network; the durable artifact is a Markdown reference
written into an instrument drawer, so the drawers still work with the server off
(PRD §2, principles 1 and 5). We surface results and link out — we never scrape
or redistribute tab content.

The HTTP fetch is injected (`fetch=`), so the search/normalise logic is unit-
tested without a network. The source lives in one swappable place: change
`SONGSTERR_SEARCH` (and `_normalise`) to point benten at a different provider.
"""

from __future__ import annotations

import json
from typing import Callable
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# The single swappable source. Songsterr's public search returns a JSON array of
# song records ({songId, artist, title, …}); we normalise a stable
# {title, artist, url} shape out of it.
SONGSTERR_SEARCH = "https://www.songsterr.com/api/songs"
SONGSTERR_SONG = "https://www.songsterr.com/a/wa/song?id="
SEARCH_SIZE = 15  # cap results — one screen's worth, not a firehose

Fetch = Callable[[str], str]


def _http_get(url: str) -> str:
    """Default fetch: a plain GET returning the response text. Replaced in tests."""
    req = Request(url, headers={"User-Agent": "benten/tabs (local personal tool)"})
    with urlopen(req, timeout=10) as resp:  # noqa: S310 - fixed https host
        return resp.read().decode("utf-8")


def _artist_name(item: dict) -> str:
    """Artist is sometimes a bare string, sometimes an object with a name."""
    artist = item.get("artist")
    if isinstance(artist, dict):
        return str(artist.get("name") or "").strip()
    return str(artist or "").strip()


def _normalise(raw: list) -> list[dict]:
    """Map Songsterr records to benten's stable {title, artist, url, source} shape.

    Records missing a title or an id are dropped rather than half-rendered.
    """
    results = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        song_id = item.get("songId") or item.get("id")
        if not title or song_id is None:
            continue
        results.append(
            {
                "title": title,
                "artist": _artist_name(item),
                "url": f"{SONGSTERR_SONG}{song_id}",
                "source": "Songsterr",
            }
        )
    return results


def search_tabs(query: str, *, fetch: Fetch = _http_get) -> list[dict]:
    """Search the tab source for `query`; return normalised results.

    An empty query short-circuits to `[]` without touching the network.
    """
    query = (query or "").strip()
    if not query:
        return []
    url = f"{SONGSTERR_SEARCH}?{urlencode({'pattern': query, 'size': SEARCH_SIZE})}"
    raw = json.loads(fetch(url))
    if not isinstance(raw, list):
        return []
    return _normalise(raw)
