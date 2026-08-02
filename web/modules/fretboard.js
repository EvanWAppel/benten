// A guitar fretboard renderer — returns an SVG string. Tuning-agnostic: pass any
// array of open-string notes (low→high), so extending to bass/uke/mandolin later
// is configuration, not a rewrite (PRD §8).

import { Scale, Chord, Note } from "../vendor/tonal.js";

export const STANDARD_GUITAR = ["E2", "A2", "D3", "G3", "B3", "E4"]; // low → high

export function fretboardSVG({
  scale,
  chordSymbol = "",
  tuning = STANDARD_GUITAR,
  frets = 12,
} = {}) {
  const sc = Scale.get(scale);
  if (sc.empty) return "";

  // chroma (0–11) → spelled note name, taken from the scale's own spelling.
  const spelling = new Map();
  sc.notes.forEach((n) => spelling.set(Note.chroma(n), n));
  const rootChroma = Note.chroma(sc.tonic || sc.notes[0]);
  const chordChroma = new Set(
    (chordSymbol ? Chord.get(chordSymbol).notes : []).map((n) => Note.chroma(n)),
  );

  const fretW = 54;
  const gap = 30;
  const padL = 46;
  const padT = 22;
  const padB = 26;
  const strings = tuning.length;
  const width = padL + frets * fretW + 18;
  const height = padT + (strings - 1) * gap + padB;

  const y = (s) => padT + (strings - 1 - s) * gap; // string 0 (low) at the bottom
  const xLine = (f) => padL + f * fretW;
  const xCell = (f) => (f === 0 ? padL - 20 : padL + (f - 0.5) * fretW);

  const p = [];

  // strings
  for (let s = 0; s < strings; s++) {
    p.push(`<line x1="${padL}" y1="${y(s)}" x2="${xLine(frets)}" y2="${y(s)}" class="fb-string"/>`);
  }
  // nut + fret wires
  p.push(`<line x1="${padL}" y1="${y(strings - 1)}" x2="${padL}" y2="${y(0)}" class="fb-nut"/>`);
  for (let f = 1; f <= frets; f++) {
    p.push(`<line x1="${xLine(f)}" y1="${y(strings - 1)}" x2="${xLine(f)}" y2="${y(0)}" class="fb-fret"/>`);
  }
  // inlays
  const midY = (y(0) + y(strings - 1)) / 2;
  for (const f of [3, 5, 7, 9]) {
    if (f <= frets) p.push(`<circle cx="${xCell(f)}" cy="${midY}" r="3" class="fb-inlay"/>`);
  }
  if (frets >= 12) {
    p.push(`<circle cx="${xCell(12)}" cy="${midY - gap * 0.6}" r="3" class="fb-inlay"/>`);
    p.push(`<circle cx="${xCell(12)}" cy="${midY + gap * 0.6}" r="3" class="fb-inlay"/>`);
  }
  // note dots
  for (let s = 0; s < strings; s++) {
    const open = Note.chroma(tuning[s]);
    for (let f = 0; f <= frets; f++) {
      const pc = (open + f) % 12;
      if (!spelling.has(pc)) continue;
      const cls = pc === rootChroma ? "fb-root" : chordChroma.has(pc) ? "fb-chord" : "fb-scale";
      const cx = xCell(f);
      const cy = y(s);
      p.push(`<circle cx="${cx}" cy="${cy}" r="10" class="fb-dot ${cls}"/>`);
      p.push(`<text x="${cx}" y="${cy + 3.5}" class="fb-label">${spelling.get(pc)}</text>`);
    }
  }
  // fret numbers
  for (let f = 1; f <= frets; f++) {
    p.push(`<text x="${xCell(f)}" y="${height - 8}" class="fb-fretnum">${f}</text>`);
  }

  return `<svg viewBox="0 0 ${width} ${height}" class="fretboard" role="img" aria-label="${scale} on a guitar fretboard">${p.join("")}</svg>`;
}
