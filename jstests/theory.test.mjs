// Theory-logic tests. Run: node --test jstests/
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  scalesForChord,
  analyzeProgression,
  isInKey,
} from "../web/modules/theory.js";

test("diatonic chords get the mode of their degree (C major)", () => {
  assert.ok(scalesForChord("Dm7", "C", "major").scales.includes("D dorian"));
  assert.ok(scalesForChord("G7", "C", "major").scales.includes("G mixolydian"));
  assert.ok(scalesForChord("Cmaj7", "C", "major").scales.includes("C ionian"));
});

test("ii–V–I in C major is all diatonic, nothing outside", () => {
  const a = analyzeProgression(["Dm7", "G7", "Cmaj7"], "C", "major");
  assert.equal(a.parent, "C major");
  assert.equal(a.allDiatonic, true);
  assert.deepEqual(a.outside, []);
});

test("a secondary dominant is flagged outside the key", () => {
  assert.equal(isInKey("A7", "C", "major"), false);
  const a = analyzeProgression(["Dm7", "A7", "Dm7", "G7"], "C", "major");
  assert.deepEqual(a.outside, ["A7"]);
  // still offers something to play: quality default (mixolydian for a dominant)
  assert.ok(scalesForChord("A7", "C", "major").scales.includes("A mixolydian"));
});

test("minor key uses aeolian on the tonic", () => {
  assert.ok(scalesForChord("Am", "A", "minor").scales.includes("A aeolian"));
});

test("an unrecognized chord is marked invalid, not crashed", () => {
  const r = scalesForChord("zzz", "C", "major");
  assert.equal(r.valid, false);
  assert.deepEqual(r.scales, []);
});
