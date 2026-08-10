// Scale-degree legend helpers. Run: node --test jstests/fretboard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  degreeLabel, scaleLegend, fretboardSVG, chordBoxSVG, ordinal, chordRingLegend,
} from "../web/modules/fretboard.js";
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

test("ordinal names chord roles", () => {
  assert.equal(ordinal(1), "root");
  assert.equal(ordinal(3), "3rd");
  assert.equal(ordinal(5), "5th");
  assert.equal(ordinal(7), "7th");
  assert.equal(ordinal(9), "9th");
});

test("chordRingLegend folds chord degrees into ring intensities", () => {
  assert.deepEqual(chordRingLegend("C"), [
    { deg: 1, label: "root" },
    { deg: 3, label: "3rd" },
    { deg: 5, label: "5th" },
  ]);
  // a 9th chord folds the 9 back to the 2-ring but still reads "9th"
  const g9 = chordRingLegend("C9");
  assert.ok(g9.some((r) => r.label === "9th" && r.deg === 2));
});

test("the scale board rings chord tones by role and tooltips every note", () => {
  const svg = fretboardSVG({ scale: "C major", chordSymbol: "C" });
  // C is the chord root → root ring; E the 3rd; G the 5th
  assert.match(svg, /class="fb-dot fb-deg-1 is-chord is-chord-1"/);
  assert.match(svg, /class="fb-dot fb-deg-3 is-chord is-chord-3"/);
  assert.match(svg, /class="fb-dot fb-deg-5 is-chord is-chord-5"/);
  assert.match(svg, /<title>C · degree 1 · chord root<\/title>/);
  assert.match(svg, /<title>G · degree 5 · chord 5th<\/title>/);
  assert.match(svg, /<title>D · degree 2<\/title>/); // a non-chord scale note, no ring
});

test("chord-box finger dots carry a note tooltip", () => {
  const svg = chordBoxSVG(chordShape("C")); // x 3 2 0 1 0 → C E G
  assert.match(svg, /<title>[A-G][#b]? · fret \d<\/title>/);
  assert.match(svg, /<title>[A-G][#b]? · open<\/title>/);
});
