// Piano keyboard diagram (W-06). Run: node --test jstests/keyboard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { keyboardSVG } from "../web/modules/keyboard.js";

// Every highlighted key, as { note, cls, title } — read off the scale dots.
function dots(svg) {
  return [...svg.matchAll(/<circle [^>]*class="(fb-dot [^"]*)" data-note="([^"]+)"[^>]*><title>([^<]*)<\/title>/g)].map(
    (m) => ({ cls: m[1], note: m[2], title: m[3] }),
  );
}
const keys = (svg, colour) => [...svg.matchAll(new RegExp(`class="kb-key kb-${colour}" data-note="([^"]+)"`, "g"))].map((m) => m[1]);

test("an unknown scale draws nothing", () => {
  assert.equal(keyboardSVG({ scale: "not a scale" }), "");
  assert.equal(keyboardSVG(), "");
});

test("two octaves from C by default: 14 white keys, 10 black", () => {
  const svg = keyboardSVG({ scale: "C major" });
  assert.equal(keys(svg, "white").length, 14);
  assert.equal(keys(svg, "black").length, 10);
  assert.equal(keys(svg, "white")[0], "C4");
  assert.equal(keys(svg, "white").at(-1), "B5");
  assert.match(svg, /^<svg [^>]*class="keyboard" role="img" aria-label="C major on a piano keyboard"/);
});

test("octaves widens the keyboard", () => {
  const svg = keyboardSVG({ scale: "C major", octaves: 3 });
  assert.equal(keys(svg, "white").length, 21);
  assert.equal(keys(svg, "black").length, 15);
});

test("C major highlights every white key and no black key", () => {
  const svg = keyboardSVG({ scale: "C major" });
  const lit = dots(svg).map((d) => d.note);
  assert.deepEqual(lit, keys(svg, "white"));
});

test("C minor pentatonic lights C Eb F G Bb in each octave, coloured by degree", () => {
  const svg = keyboardSVG({ scale: "C minor pentatonic" });
  const d = dots(svg);
  assert.deepEqual(
    d.map((x) => x.note),
    ["C4", "Eb4", "F4", "G4", "Bb4", "C5", "Eb5", "F5", "G5", "Bb5"],
  );
  const eb = d.find((x) => x.note === "Eb4");
  assert.match(eb.cls, /\bfb-deg-3\b/); // ♭3 keeps the 3-colour, same as the fretboard
  assert.match(d.find((x) => x.note === "Bb4").cls, /\bfb-deg-7\b/);
  assert.match(d.find((x) => x.note === "C4").cls, /\bfb-deg-1\b/);
});

test("chord tones get the is-chord ring, other scale notes don't", () => {
  const svg = keyboardSVG({ scale: "C major", chordSymbol: "G" });
  const ringed = dots(svg)
    .filter((x) => /\bis-chord\b/.test(x.cls))
    .map((x) => x.note);
  assert.deepEqual(ringed, ["D4", "G4", "B4", "D5", "G5", "B5"]);
  assert.equal(dots(svg).find((x) => x.note === "G4").title, "G · degree 5 · chord tone");
  assert.equal(dots(svg).find((x) => x.note === "C4").title, "C · degree 1");
});

test("flat-key spellings come from the scale (Bb, not A#)", () => {
  const svg = keyboardSVG({ scale: "F major" });
  const notes = dots(svg).map((x) => x.note);
  assert.ok(notes.includes("Bb4"));
  assert.ok(!notes.some((n) => n.startsWith("A#")));
});

test("labels: note by default, degree on request", () => {
  const plain = keyboardSVG({ scale: "C minor pentatonic", chordSymbol: "Cm" });
  assert.equal(keyboardSVG({ scale: "C minor pentatonic", chordSymbol: "Cm", labels: "note" }), plain);
  const labelsOf = (svg) => [...svg.matchAll(/class="fb-label">([^<]*)<\/text>/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(labelsOf(plain))], ["C", "Eb", "F", "G", "Bb"]);
  const deg = keyboardSVG({ scale: "C minor pentatonic", chordSymbol: "Cm", labels: "degree" });
  assert.deepEqual([...new Set(labelsOf(deg))], ["1", "♭3", "4", "5", "♭7"]);
});
