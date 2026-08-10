// Progression-pattern expansion tests. Run: node --test jstests/patterns.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { PROGRESSIONS, patternsFor, chordsForPattern } from "../web/modules/patterns.js";

test("a major pattern expands to the key's diatonic triads", () => {
  assert.deepEqual(chordsForPattern("pop", "C", "major"), ["C", "G", "Am", "F"]);
  assert.deepEqual(chordsForPattern("three", "C", "major"), ["C", "F", "G"]);
});

test("the same pattern transposes with the key", () => {
  assert.deepEqual(chordsForPattern("pop", "G", "major"), ["G", "D", "Em", "C"]);
});

test("a sevenths voicing pulls the diatonic seventh chords", () => {
  assert.deepEqual(chordsForPattern("jazz251", "C", "major"), ["Dm7", "G7", "Cmaj7"]);
});

test("blues forces every slot to a dominant 7th", () => {
  assert.deepEqual(chordsForPattern("blues12", "C", "major"), [
    "C7", "C7", "C7", "C7", "F7", "F7", "C7", "C7", "G7", "F7", "C7", "G7",
  ]);
});

test("a minor pattern uses the natural-minor diatonic triads", () => {
  // A minor triads: Am Bdim C Dm Em F G → i VI III VII = Am F C G
  assert.deepEqual(chordsForPattern("mpop", "A", "minor"), ["Am", "F", "C", "G"]);
});

test("minor jazz raises the V to a dominant 7th", () => {
  // A minor sevenths: Am7 Bm7b5 Cmaj7 Dm7 Em7 Fmaj7 G7; degree 5 forced dominant → E7
  assert.deepEqual(chordsForPattern("mjazz251", "A", "minor"), ["Bm7b5", "E7", "Am7"]);
});

test("the Andalusian cadence ends on a dominant V", () => {
  // A minor: i VII VI V → Am G F, then degree-5 forced dominant → E7
  assert.deepEqual(chordsForPattern("andalusian", "A", "minor"), ["Am", "G", "F", "E7"]);
});

test("an unknown pattern id yields an empty progression", () => {
  assert.deepEqual(chordsForPattern("nope", "C", "major"), []);
});

test("patternsFor returns the mode's catalog, minor defaulting sanely", () => {
  assert.equal(patternsFor("major"), PROGRESSIONS.major);
  assert.equal(patternsFor("minor"), PROGRESSIONS.minor);
  assert.equal(patternsFor("whatever"), PROGRESSIONS.major); // non-minor → major
});
