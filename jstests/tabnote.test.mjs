// Tab-reference Markdown tests. Run: node --test jstests/tabnote.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { tabMarkdown, tabTitle } from "../web/modules/tabnote.js";

test("the title joins artist and song, falling back gracefully", () => {
  assert.equal(tabTitle({ artist: "The Beatles", title: "Blackbird" }), "The Beatles — Blackbird");
  assert.equal(tabTitle({ title: "Blackbird" }), "Blackbird");
  assert.equal(tabTitle({}), "Untitled tab");
});

test("a tab reference links out to the source and names the instrument", () => {
  const md = tabMarkdown({
    title: "Blackbird",
    artist: "The Beatles",
    url: "https://www.songsterr.com/a/wa/song?id=123",
    source: "Songsterr",
    instrument: "guitar",
    date: "2026-08-09",
    note: "fingerstyle, capo considerations",
  });
  assert.match(md, /^# The Beatles — Blackbird/);
  assert.match(md, /\*\*instrument:\*\* guitar/);
  assert.match(md, /\*\*saved:\*\* 2026-08-09/);
  assert.match(md, /\*\*tab:\*\* \[Songsterr\]\(https:\/\/www\.songsterr\.com\/a\/wa\/song\?id=123\)/);
  assert.match(md, /fingerstyle, capo considerations/);
  assert.match(md, /The tab lives at the linked source/);
});

test("a bare reference (no note/date) is still valid Markdown", () => {
  const md = tabMarkdown({ title: "Little Wing", artist: "Jimi Hendrix", url: "x", source: "Songsterr" });
  assert.match(md, /^# Jimi Hendrix — Little Wing/);
  assert.match(md, /\*\*tab:\*\* \[Songsterr\]\(x\)/);
});
