// Guitar chord-shape tests. Run: node --test jstests/chordshape.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { Chord, Note } from "../web/vendor/tonal.js";
import { chordShape, STANDARD_GUITAR } from "../web/modules/chordshape.js";

// The common open chords should come out as their textbook shapes — the whole point
// is that an unfamiliar chord shows a shape a learner would recognize when it exists.
const OPEN_SHAPES = {
  C: [-1, 3, 2, 0, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  D: [-1, -1, 0, 2, 3, 2],
  A: [-1, 0, 2, 2, 2, 0],
  E: [0, 2, 2, 1, 0, 0],
  Am: [-1, 0, 2, 2, 1, 0],
  Em: [0, 2, 2, 0, 0, 0],
  Dm: [-1, -1, 0, 2, 3, 1],
  Am7: [-1, 0, 2, 0, 1, 0],
  G7: [3, 2, 0, 0, 0, 1],
  E7: [0, 2, 0, 1, 0, 0],
  A7: [-1, 0, 2, 0, 2, 0],
  D7: [-1, -1, 0, 2, 1, 2],
  Cmaj7: [-1, 3, 2, 0, 0, 0],
  Dm7: [-1, -1, 0, 2, 1, 1],
};

for (const [symbol, voicing] of Object.entries(OPEN_SHAPES)) {
  test(`${symbol} resolves to its open shape`, () => {
    const shape = chordShape(symbol);
    assert.equal(shape.valid, true);
    assert.deepEqual(shape.voicing, voicing);
    assert.equal(shape.baseFret, 0); // open position → drawn at the nut
  });
}

// Whatever the chord, the voicing the generator returns must be a real, playable way
// to fret it. These invariants hold across keys, including barre-only chords.
const chroma = (n) => Note.chroma(n);

test("every sounded string is a chord tone, root in the bass, no interior mutes", () => {
  const symbols = ["C", "F", "Bb", "Eb", "F#m", "Bdim", "G7", "Cmaj7", "Fm", "Abm7"];
  for (const symbol of symbols) {
    const shape = chordShape(symbol);
    assert.equal(shape.valid, true, `${symbol} should voice`);
    const open = STANDARD_GUITAR.map(chroma);
    const tones = new Set(Chord.get(symbol).notes.map(chroma));

    const sounded = [];
    shape.voicing.forEach((f, s) => {
      if (f !== -1) sounded.push({ s, chroma: (open[s] + f) % 12 });
    });
    assert.ok(sounded.length >= 3, `${symbol} should sound at least three strings`);

    // all sounded notes belong to the chord
    for (const n of sounded) {
      assert.ok(tones.has(n.chroma), `${symbol}: sounded a non-chord tone`);
    }
    // the lowest sounded string is the root
    const rootChroma = chroma(Chord.get(symbol).tonic);
    assert.equal(sounded[0].chroma, rootChroma, `${symbol}: root not in the bass`);

    // muted strings only below the lowest sounded one (no interior gaps)
    const interior = shape.voicing.slice(sounded[0].s).filter((f) => f === -1);
    assert.equal(interior.length, 0, `${symbol}: has an interior muted string`);

    // fits one hand
    const fretted = shape.voicing.filter((f) => f > 0);
    if (fretted.length) {
      assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 4, `${symbol}: span too wide`);
    }
  }
});

test("a chord with no low voicing carries a position label", () => {
  // C#m7's best shape frets past the 4th, so the box shifts up and labels its start.
  const shape = chordShape("C#m7");
  assert.equal(shape.valid, true);
  assert.ok(shape.baseFret > 0, "expected a shifted box with a fret label");
  assert.equal(shape.baseFret, Math.min(...shape.voicing.filter((f) => f > 0)));
});

test("an unparseable chord returns valid:false", () => {
  assert.equal(chordShape("H7").valid, false);
  assert.equal(chordShape("").valid, false);
});
