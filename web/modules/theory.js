// Chord→scale suggestions — pure functions, no DOM, so they're unit-testable.
// Practical chord-scale theory (PRD §4): each diatonic chord gets its mode of the
// parent key, plus a quality-based default; the whole progression gets its parent
// scale, and chords that fall outside the key are flagged.

import { Chord, Scale, Note } from "../vendor/tonal.js";

// Modes of the major scale, by scale degree (0-indexed).
const MAJOR_MODES = [
  "ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian",
];
// Modes of the natural-minor scale, by degree (aeolian on the tonic).
const MINOR_MODES = [
  "aeolian", "locrian", "ionian", "dorian", "phrygian", "lydian", "mixolydian",
];

const unique = (arr) => [...new Set(arr)];

export function keyScaleNotes(tonic, mode) {
  return Scale.get(`${tonic} ${mode === "minor" ? "minor" : "major"}`).notes;
}

function chromaSet(notes) {
  return new Set(notes.map((n) => Note.chroma(n)));
}

// Are all of a chord's notes contained in the key? (enharmonic-agnostic)
export function isInKey(symbol, tonic, mode) {
  const chord = Chord.get(symbol);
  if (chord.empty || !chord.notes.length) return false;
  const keys = chromaSet(keyScaleNotes(tonic, mode));
  return chord.notes.every((n) => keys.has(Note.chroma(n)));
}

// The go-to scale for a chord's quality, independent of key — the fallback that
// still gives you something to play over a borrowed or secondary chord.
function qualityScale(chord) {
  const t = (chord.type || "").toLowerCase();
  if (t.includes("dominant")) return "mixolydian";
  if (t.includes("half-diminished")) return "locrian";
  if (t.includes("diminished")) return "locrian";
  if (t.includes("augmented")) return "whole tone";
  if (t.includes("minor")) return "dorian";
  if (t.includes("major")) return "ionian";
  if (chord.quality === "Minor") return "dorian";
  if (chord.quality === "Diminished") return "locrian";
  return "ionian";
}

// Suggested scale(s) to play over one chord, in the context of a key.
export function scalesForChord(symbol, tonic, mode) {
  const chord = Chord.get(symbol);
  if (chord.empty) return { symbol, valid: false, scales: [] };

  const root = chord.tonic || chord.notes[0];
  const inKey = isInKey(symbol, tonic, mode);
  const scaleNotes = keyScaleNotes(tonic, mode);
  const degree = scaleNotes.findIndex(
    (n) => Note.chroma(n) === Note.chroma(root),
  );

  const scales = [];
  // 1) The diatonic mode built on this chord's degree (only when it fits the key).
  if (inKey && degree >= 0) {
    const modes = mode === "minor" ? MINOR_MODES : MAJOR_MODES;
    scales.push(`${root} ${modes[degree]}`);
  }
  // 2) The quality-based default — always offered.
  scales.push(`${root} ${qualityScale(chord)}`);

  return { symbol, valid: true, root, inKey, scales: unique(scales) };
}

// Analyze a whole progression against the chosen key.
export function analyzeProgression(symbols, tonic, mode) {
  const parent = `${tonic} ${mode === "minor" ? "minor" : "major"}`;
  const perChord = symbols.map((s) => scalesForChord(s, tonic, mode));
  const outside = perChord.filter((c) => c.valid && !c.inKey).map((c) => c.symbol);
  const allDiatonic =
    perChord.length > 0 && perChord.every((c) => c.valid && c.inKey);
  return { parent, perChord, outside, allDiatonic };
}
