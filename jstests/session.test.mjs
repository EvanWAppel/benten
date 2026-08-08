// Session/riff Markdown rendering tests. Run: node --test jstests/session.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { riffMarkdown, sessionMarkdown } from "../web/modules/session.js";

test("a session note carries the date, take count, and a take row", () => {
  const md = sessionMarkdown({
    title: "Tuesday jam",
    date: "2026-08-07",
    takes: [{ role: "rhythm", name: "groove", duration: 12.34, savedPath: "audio/2026-08-07-groove.wav" }],
    notes: "felt good in the pocket",
  });
  assert.match(md, /^# Tuesday jam/);
  assert.match(md, /\*\*date:\*\* 2026-08-07/);
  assert.match(md, /\*\*takes:\*\* 1/);
  assert.match(md, /felt good in the pocket/);
  assert.match(md, /rhythm/);
  assert.match(md, /12\.3s/);
  assert.match(md, /`audio\/2026-08-07-groove\.wav`/);
});

test("an untitled empty session still renders valid Markdown", () => {
  const md = sessionMarkdown({});
  assert.match(md, /^# Studio session/);
  assert.match(md, /\*\*takes:\*\* 0/);
  assert.match(md, /_\(no takes captured\)_/);
});

test("an unsaved take is flagged rather than linked", () => {
  const md = sessionMarkdown({ takes: [{ role: "lead", name: "", duration: 3, savedPath: null }] });
  assert.match(md, /_\(unsaved\)_/);
});

test("a riff capture links the take by path", () => {
  const md = riffMarkdown({ name: "descending lick", path: "audio/x.wav", note: "over the ii-V", date: "2026-08-07" });
  assert.match(md, /^# descending lick/);
  assert.match(md, /\*\*take:\*\* `audio\/x\.wav`/);
  assert.match(md, /over the ii-V/);
  assert.match(md, /Filed in \[`riffs\/`\]/);
});
