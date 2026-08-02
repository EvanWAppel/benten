// Markdown-rendering tests. Run: node --test jstests/compose.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { progressionMarkdown } from "../web/modules/compose.js";

test("renders a clean note with title, key, progression, and a scale table", () => {
  const md = progressionMarkdown({
    title: "Autumn thing",
    tonic: "C",
    mode: "major",
    progression: ["Dm7", "G7", "Cmaj7"],
    date: "2026-08-01",
  });
  assert.ok(md.startsWith("# Autumn thing"));
  assert.match(md, /\*\*key:\*\* C major/);
  assert.match(md, /\*\*progression:\*\* Dm7 · G7 · Cmaj7/);
  assert.match(md, /\*\*captured:\*\* 2026-08-01/);
  assert.match(md, /Parent scale: \*\*C major\*\* — covers the whole progression\./);
  assert.match(md, /\| Dm7 \| D dorian \| yes \|/);
  assert.match(md, /\| G7 \| G mixolydian \| yes \|/);
});

test("falls back to a default title and flags outside chords", () => {
  const md = progressionMarkdown({
    tonic: "C",
    mode: "major",
    progression: ["A7"],
  });
  assert.ok(md.startsWith("# Untitled progression"));
  assert.match(md, /Outside the key: A7/);
  assert.match(md, /\| A7 \| A mixolydian \| no \|/);
});
