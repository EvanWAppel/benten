// A piano keyboard renderer — the fretboard's sibling, returns an SVG string. Same
// visual language: scale notes get a dot coloured by scale degree (fb-deg-N), chord
// tones get the bright ring (is-chord), and every dot carries the same tooltip. The
// keyboard starts on C and runs a whole number of octaves (PRD §4.3, deferred in v1).

import { Scale, Chord, Note } from "../vendor/tonal.js";
import { degreeLabel } from "./fretboard.js";

const WHITE_CHROMAS = [0, 2, 4, 5, 7, 9, 11];
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function keyboardSVG({
  scale,
  chordSymbol = "",
  octaves = 2,
  startOctave = 4, // the first key is C in this octave (C4 = middle C)
  labels = "note", // "note" → spelled names on the dots; "degree" → 1, ♭3, 5…
} = {}) {
  const sc = Scale.get(scale || "");
  if (sc.empty) return "";

  // chroma → spelling / degree number / degree label, exactly as the fretboard does it.
  const spelling = new Map();
  const degreeOf = new Map();
  const labelOf = new Map();
  sc.notes.forEach((n, i) => {
    const chroma = Note.chroma(n);
    spelling.set(chroma, n);
    degreeOf.set(chroma, parseInt(sc.intervals[i], 10) || i + 1);
    labelOf.set(chroma, degreeLabel(sc.intervals[i] || ""));
  });
  const chordChroma = new Set(
    (chordSymbol ? Chord.get(chordSymbol).notes : []).map((n) => Note.chroma(n)),
  );

  const whiteW = 26;
  const whiteH = 120;
  const blackW = 16;
  const blackH = 74;
  const pad = 6;
  const nOct = Math.max(1, Math.floor(octaves) || 1);
  const startMidi = (startOctave + 1) * 12; // C of startOctave
  const whites = nOct * 7;
  const width = pad * 2 + whites * whiteW;
  const height = pad * 2 + whiteH;

  // Lay out every key in the range, low → high, with its x and colour.
  const all = [];
  let whiteIdx = 0;
  for (let midi = startMidi; midi < startMidi + nOct * 12; midi++) {
    const pc = midi % 12;
    const white = WHITE_CHROMAS.includes(pc);
    const x = white ? pad + whiteIdx * whiteW : pad + whiteIdx * whiteW - blackW / 2;
    all.push({ midi, pc, white, x, name: noteName(midi, spelling.get(pc)) });
    if (white) whiteIdx++;
  }

  const p = [];
  // whites first, then blacks on top of them
  for (const k of all.filter((k) => k.white)) {
    p.push(`<rect x="${k.x}" y="${pad}" width="${whiteW}" height="${whiteH}" rx="3" class="kb-key kb-white" data-note="${k.name}"/>`);
  }
  for (const k of all.filter((k) => !k.white)) {
    p.push(`<rect x="${k.x}" y="${pad}" width="${blackW}" height="${blackH}" rx="2" class="kb-key kb-black" data-note="${k.name}"/>`);
  }
  // scale dots, low → high
  for (const k of all) {
    if (!spelling.has(k.pc)) continue;
    const cls = `fb-deg-${degreeOf.get(k.pc)}${chordChroma.has(k.pc) ? " is-chord" : ""}`;
    const cx = k.white ? k.x + whiteW / 2 : k.x + blackW / 2;
    const cy = k.white ? pad + whiteH - 16 : pad + blackH - 13;
    const tip = `${spelling.get(k.pc)} · degree ${labelOf.get(k.pc)}${chordChroma.has(k.pc) ? " · chord tone" : ""}`;
    p.push(`<circle cx="${cx}" cy="${cy}" r="${k.white ? 9 : 7}" class="fb-dot ${cls}" data-note="${k.name}"><title>${tip}</title></circle>`);
    const text = labels === "degree" ? labelOf.get(k.pc) : spelling.get(k.pc);
    p.push(`<text x="${cx}" y="${cy + 3}" class="fb-label">${text}</text>`);
  }

  return `<svg viewBox="0 0 ${width} ${height}" class="keyboard" role="img" aria-label="${scale} on a piano keyboard">${p.join("")}</svg>`;
}

// Name a key: the scale's own spelling when it has one (Eb, not D#), else the sharp
// name. The octave follows the spelling, so a B# or Cb still lands on the right key.
function noteName(midi, spelled) {
  const pc = spelled || SHARP_NAMES[midi % 12];
  const oct = Math.floor(midi / 12) - 1;
  for (const o of [oct, oct + 1, oct - 1]) {
    if (Note.midi(pc + o) === midi) return pc + o;
  }
  return SHARP_NAMES[midi % 12] + oct;
}
