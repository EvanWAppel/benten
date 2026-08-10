// Scale-degree legend helpers. Run: node --test jstests/fretboard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { degreeLabel, scaleLegend } from "../web/modules/fretboard.js";

test("degreeLabel spells intervals with the right accidental", () => {
  assert.equal(degreeLabel("1P"), "1");
  assert.equal(degreeLabel("3M"), "3");
  assert.equal(degreeLabel("3m"), "♭3");
  assert.equal(degreeLabel("5P"), "5");
  assert.equal(degreeLabel("5d"), "♭5");
  assert.equal(degreeLabel("4A"), "♯4");
  assert.equal(degreeLabel("7m"), "♭7");
});

test("a major scale legends as 1..7 in order", () => {
  const legend = scaleLegend("C major");
  assert.deepEqual(legend.map((d) => d.label), ["1", "2", "3", "4", "5", "6", "7"]);
  assert.deepEqual(legend.map((d) => d.num), [1, 2, 3, 4, 5, 6, 7]);
});

test("a pentatonic legends by interval number, not position", () => {
  // C minor pentatonic: 1 ♭3 4 5 ♭7 — the ♭3 keeps the 3-colour, ♭7 the 7-colour.
  const legend = scaleLegend("C minor pentatonic");
  assert.deepEqual(legend.map((d) => d.label), ["1", "♭3", "4", "5", "♭7"]);
  assert.deepEqual(legend.map((d) => d.num), [1, 3, 4, 5, 7]);
});

test("an unknown scale legends empty", () => {
  assert.deepEqual(scaleLegend("not a scale"), []);
});
