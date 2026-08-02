// Chord-voicing tests (the pure part of audio.js). Run: node --test jstests/audio.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { voiceChord } from "../web/modules/audio.js";

test("an already-ascending chord stays in one octave", () => {
  assert.deepEqual(voiceChord("Cmaj7", 3), ["C3", "E3", "G3", "B3"]);
});

test("notes that wrap below the previous bump up an octave", () => {
  // A(9) → C(0) wraps, so C and everything after sit an octave higher.
  assert.deepEqual(voiceChord("Am7", 3), ["A3", "C4", "E4", "G4"]);
});

test("an unrecognized chord voices to nothing", () => {
  assert.deepEqual(voiceChord("zzz"), []);
});
