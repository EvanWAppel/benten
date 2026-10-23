// Instrument tunings catalog + the scale board on each. Run: node --test jstests/tunings.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { TUNINGS, DEFAULT_INSTRUMENT, STANDARD_GUITAR, fretboardSVG } from "../web/modules/fretboard.js";

// Open-string labels (fret 0 sits at x = padL - 20 = 26), read low → high (bottom → top).
const openLabels = (svg) =>
  [...svg.matchAll(/<text x="26" y="([\d.]+)" class="fb-label">([^<]*)<\/text>/g)]
    .map((m) => ({ y: Number(m[1]), text: m[2] }))
    .sort((a, b) => b.y - a.y)
    .map((m) => m.text);
const stringCount = (svg) => (svg.match(/class="fb-string"/g) || []).length;

test("the catalog holds guitar, bass, ukulele and mandolin, low → high", () => {
  assert.deepEqual(Object.keys(TUNINGS), ["guitar", "bass", "ukulele", "mandolin"]);
  assert.deepEqual(TUNINGS.guitar.notes, ["E2", "A2", "D3", "G3", "B3", "E4"]);
  assert.deepEqual(TUNINGS.bass.notes, ["E1", "A1", "D2", "G2"]);
  assert.deepEqual(TUNINGS.ukulele.notes, ["G4", "C4", "E4", "A4"]); // re-entrant high G
  assert.deepEqual(TUNINGS.mandolin.notes, ["G3", "D4", "A4", "E5"]);
  for (const t of Object.values(TUNINGS)) assert.equal(typeof t.label, "string");
});

test("guitar stays the default instrument", () => {
  assert.equal(DEFAULT_INSTRUMENT, "guitar");
  assert.equal(TUNINGS.guitar.notes, STANDARD_GUITAR);
  const plain = fretboardSVG({ scale: "C major" });
  assert.equal(fretboardSVG({ scale: "C major", tuning: TUNINGS.guitar.notes }), plain);
  assert.equal(stringCount(plain), 6);
  assert.match(plain, /aria-label="C major on a guitar fretboard"/);
});

const cases = [
  ["bass", 4, ["E", "A", "D", "G"]],
  ["ukulele", 4, ["G", "C", "E", "A"]],
  ["mandolin", 4, ["G", "D", "A", "E"]],
  ["guitar", 6, ["E", "A", "D", "G", "B", "E"]],
];
for (const [name, count, opens] of cases) {
  test(`${name}: ${count} strings, open strings ${opens.join(" ")}`, () => {
    // C major covers every open note here, so each string shows its open-string dot.
    const svg = fretboardSVG({ scale: "C major", tuning: TUNINGS[name].notes });
    assert.equal(stringCount(svg), count);
    assert.deepEqual(openLabels(svg), opens);
  });
}

test("the aria label names the instrument when given one", () => {
  const svg = fretboardSVG({ scale: "A minor", tuning: TUNINGS.ukulele.notes, instrument: "ukulele" });
  assert.match(svg, /aria-label="A minor on a ukulele fretboard"/);
});
