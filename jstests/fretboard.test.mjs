// Scale-degree legend helpers. Run: node --test jstests/fretboard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { degreeLabel, scaleLegend, fretboardSVG, chordBoxSVG } from "../web/modules/fretboard.js";
import { chordShape } from "../web/modules/chordshape.js";

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

test("the scale board colours by degree and tooltips every note", () => {
  const svg = fretboardSVG({ scale: "C major", chordSymbol: "C" });
  assert.match(svg, /class="fb-dot fb-deg-1 is-chord"/); // C is a chord tone → ringed
  assert.match(svg, /<title>C · degree 1 · chord tone<\/title>/);
  assert.match(svg, /<title>D · degree 2<\/title>/); // a non-chord scale note
});

test("chord-box finger dots carry a note tooltip", () => {
  const svg = chordBoxSVG(chordShape("C")); // x 3 2 0 1 0 → C E G
  assert.match(svg, /<title>[A-G][#b]? · fret \d<\/title>/);
  assert.match(svg, /<title>[A-G][#b]? · open<\/title>/);
});
