# benten — container image for the public read-only demo (Railway).
# Local use never needs this: `uv run benten` binds 127.0.0.1:8788. This image is
# only for the shareable demo, which runs read-only (BENTEN_DEMO=1) and binds to
# 0.0.0.0 on the platform's $PORT.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Dependencies first, for layer caching. hatchling builds benten from src/, so the
# source has to be present when we sync.
COPY pyproject.toml uv.lock ./
COPY src ./src
RUN uv sync --frozen --no-dev

# Front-end assets + the Markdown drawers, so the demo shows real notes.
COPY web ./web
COPY composition ./composition
COPY theory ./theory
COPY riffs ./riffs
COPY recording ./recording
COPY instruments ./instruments
COPY production ./production
COPY README.md PRD.md ./

# Demo defaults. Override via Railway variables for a private, writable deploy.
ENV HOST=0.0.0.0
ENV BENTEN_DEMO=1
# $PORT is injected by the platform; run() reads it (falls back to 8788).

CMD ["uv", "run", "benten"]
