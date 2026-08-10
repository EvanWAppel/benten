// Common chord-progression patterns — pure, so it's unit-testable (no DOM, no audio).
// A pattern is a list of scale degrees (1–7) into the current key. We expand it
// against the key's diatonic chords at apply time, so the same pattern gives you
// C · G · Am · F in C major and G · D · Em · C in G major. The catalog is grouped
// by mode; the Chords UI shows the set that fits whichever mode is selected.

import { Key, Chord } from "../vendor/tonal.js";

// Each pattern: { id, name (Roman numerals), note (plain-language hook), degrees }.
// Optional per-pattern voicing:
//   voicing: "sevenths" — pull from the diatonic seventh chords instead of triads.
//   dominant: [degrees]  — force these degrees to a dominant 7th (root + "7"), the
//     harmonic-minor / blues move a purely diatonic reading can't give you.
export const PROGRESSIONS = {
  major: [
    { id: "pop", name: "I–V–vi–IV", note: "pop / axis", degrees: [1, 5, 6, 4] },
    { id: "three", name: "I–IV–V", note: "three-chord", degrees: [1, 4, 5] },
    { id: "doowop", name: "I–vi–IV–V", note: "’50s doo-wop", degrees: [1, 6, 4, 5] },
    { id: "canon", name: "I–V–vi–iii–IV–I–IV–V", note: "Pachelbel’s canon", degrees: [1, 5, 6, 3, 4, 1, 4, 5] },
    { id: "jazz251", name: "ii–V–I", note: "jazz turnaround", degrees: [2, 5, 1], voicing: "sevenths" },
    { id: "blues12", name: "12-bar blues", note: "dominant 7ths", degrees: [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5], dominant: [1, 4, 5] },
  ],
  minor: [
    { id: "mpop", name: "i–VI–III–VII", note: "minor pop / ‘epic’", degrees: [1, 6, 3, 7] },
    { id: "mthree", name: "i–iv–v", note: "minor three-chord", degrees: [1, 4, 5] },
    { id: "mvamp", name: "i–VII–VI–VII", note: "minor vamp", degrees: [1, 7, 6, 7] },
    { id: "andalusian", name: "i–VII–VI–V", note: "Andalusian cadence", degrees: [1, 7, 6, 5], dominant: [5] },
    { id: "mjazz251", name: "ii–V–i", note: "minor jazz", degrees: [2, 5, 1], voicing: "sevenths", dominant: [5] },
  ],
};

function normalizeMode(mode) {
  return mode === "minor" ? "minor" : "major";
}

// The diatonic triads and seventh chords for a key, degree-indexed (I..vii).
function keyChords(tonic, mode) {
  if (normalizeMode(mode) === "minor") {
    const k = Key.minorKey(tonic).natural;
    return { triads: k.triads, sevenths: k.chords };
  }
  const k = Key.majorKey(tonic);
  return { triads: k.triads, sevenths: k.chords };
}

// The patterns offered for a mode.
export function patternsFor(mode) {
  return PROGRESSIONS[normalizeMode(mode)];
}

function chordForDegree(degree, pattern, triads, sevenths) {
  const i = degree - 1;
  if (pattern.dominant && pattern.dominant.includes(degree)) {
    const root = Chord.get(triads[i]).tonic; // the degree's root, made dominant
    return `${root}7`;
  }
  const src = pattern.voicing === "sevenths" ? sevenths : triads;
  return src[i];
}

// Expand a pattern into concrete chord symbols for a key + mode. Unknown id → [].
export function chordsForPattern(patternId, tonic, mode) {
  const pattern = patternsFor(mode).find((p) => p.id === patternId);
  if (!pattern) return [];
  const { triads, sevenths } = keyChords(tonic, mode);
  return pattern.degrees.map((d) => chordForDegree(d, pattern, triads, sevenths));
}
