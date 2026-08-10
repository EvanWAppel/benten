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

  // chroma (0–11) → spelled note name and scale-degree number, from the scale's own
  // spelling. Degree keys off the interval number (1–7), so a fifth is coloured the
  // same in every scale and a pentatonic's ♭3/♭7 share the 3/7 colours.
  const spelling = new Map();
  const degreeOf = new Map();
  const labelOf = new Map(); // chroma → scale-degree label ("1", "♭3", …) for tooltips
  sc.notes.forEach((n, i) => {
    const chroma = Note.chroma(n);
    spelling.set(chroma, n);
    degreeOf.set(chroma, parseInt(sc.intervals[i], 10) || i + 1);
    labelOf.set(chroma, degreeLabel(sc.intervals[i] || ""));
  });
  // chroma → this note's degree within the current chord (1, 3, 5, 7, …), so the
  // ring can colour by chord role: root brightest, then 3rd, 5th, 7th, descending.
  const chordDegOf = new Map();
  const chord = chordSymbol ? Chord.get(chordSymbol) : null;
  if (chord && !chord.empty) {
    chord.notes.forEach((n, i) =>
      chordDegOf.set(Note.chroma(n), parseInt(chord.intervals[i], 10) || 0),
    );
  }

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
      // Colour by scale degree; ring chord tones, the ring coloured by chord role.
      const inChord = chordDegOf.has(pc);
      const ringDeg = inChord ? ((chordDegOf.get(pc) - 1) % 7) + 1 : 0; // fold 9→2, 13→6
      const cls = `fb-deg-${degreeOf.get(pc)}${inChord ? ` is-chord is-chord-${ringDeg}` : ""}`;
      const cx = xCell(f);
      const cy = y(s);
      // Hover tooltip: note, its scale degree, and its role in the current chord.
      const tip = `${spelling.get(pc)} · degree ${labelOf.get(pc)}${inChord ? ` · chord ${ordinal(chordDegOf.get(pc))}` : ""}`;
      p.push(`<circle cx="${cx}" cy="${cy}" r="10" class="fb-dot ${cls}"><title>${tip}</title></circle>`);
      p.push(`<text x="${cx}" y="${cy + 3.5}" class="fb-label">${spelling.get(pc)}</text>`);
    }
  }
  // fret numbers
  for (let f = 1; f <= frets; f++) {
    p.push(`<text x="${xCell(f)}" y="${height - 8}" class="fb-fretnum">${f}</text>`);
  }

  return `<svg viewBox="0 0 ${width} ${height}" class="fretboard" role="img" aria-label="${scale} on a guitar fretboard">${p.join("")}</svg>`;
}

// A chord degree as an ordinal role: 1→"root", 3→"3rd", 7→"7th", 9→"9th".
export function ordinal(n) {
  if (n === 1) return "root";
  const rem10 = n % 10;
  const rem100 = n % 100;
  const suffix =
    rem10 === 1 && rem100 !== 11 ? "st"
    : rem10 === 2 && rem100 !== 12 ? "nd"
    : rem10 === 3 && rem100 !== 13 ? "rd"
    : "th";
  return `${n}${suffix}`;
}

// The ring key for a chord: one { deg, label } per chord tone, in chord order, so the
// legend can show which ring intensity means root vs 3rd vs 5th vs 7th.
export function chordRingLegend(symbol) {
  const c = Chord.get(symbol);
  if (c.empty) return [];
  return c.notes.map((n, i) => {
    const num = parseInt(c.intervals[i], 10) || 0;
    return { deg: ((num - 1) % 7) + 1, label: ordinal(num) };
  });
}

// A short scale-degree label for an interval, e.g. "1P"→"1", "3m"→"♭3", "4A"→"♯4".
export function degreeLabel(interval) {
  const num = interval.match(/\d+/)?.[0] ?? "";
  const quality = interval.replace(/\d+/g, "");
  const acc = quality === "m" || quality === "d" ? "♭" : quality === "A" ? "♯" : "";
  return acc + num;
}

// The legend for a scale: one { num, label } per degree, in scale order — pairs with
// the fb-deg-N colours the fretboard paints, so the key reads 1 ♭3 4 5 ♭7, etc.
export function scaleLegend(scale) {
  const sc = Scale.get(scale);
  if (sc.empty) return [];
  return sc.notes.map((n, i) => {
    const interval = sc.intervals[i] || "";
    return { num: parseInt(interval, 10) || i + 1, label: degreeLabel(interval) };
  });
}

// A compact chord-box diagram — the vertical grid a player reads to fret one chord.
// Takes a shape from chordShape() ({ voicing low→high, baseFret, symbol }) and draws
// strings as columns (low string on the left), an O/X marker over each, finger dots,
// and a nut (open position) or a "Nfr" label (shifted up the neck).
export function chordBoxSVG(shape) {
  if (!shape || !shape.valid) return "";
  const { voicing, baseFret, symbol = "", notes = [], tuning = STANDARD_GUITAR } = shape;

  // Spell the note under each string/fret for the hover tooltips.
  const openChr = tuning.map((t) => Note.chroma(t));
  const spell = new Map(notes.map((n) => [Note.chroma(n), n]));
  const noteAt = (s, f) => spell.get((openChr[s] + f) % 12) || "";

  const open = baseFret === 0;
  const firstFret = open ? 1 : baseFret;
  const fretted = voicing.filter((f) => f > 0);
  const maxFret = fretted.length ? Math.max(...fretted) : firstFret;
  const rows = Math.max(4, open ? maxFret : maxFret - firstFret + 1);

  const colW = 20;
  const rowH = 24;
  const padL = 26;
  const padT = 24;
  const padR = 12;
  const padB = 14;
  const cols = voicing.length; // strings
  const width = padL + (cols - 1) * colW + padR;
  const height = padT + rows * rowH + padB;

  const sx = (s) => padL + s * colW;
  const gridTop = padT;
  const gridBot = padT + rows * rowH;

  const p = [];

  // strings (vertical) and fret wires (horizontal)
  for (let s = 0; s < cols; s++) {
    p.push(`<line x1="${sx(s)}" y1="${gridTop}" x2="${sx(s)}" y2="${gridBot}" class="fb-string"/>`);
  }
  for (let r = 0; r <= rows; r++) {
    const yy = padT + r * rowH;
    const cls = r === 0 && open ? "fb-nut" : "fb-fret";
    p.push(`<line x1="${sx(0)}" y1="${yy}" x2="${sx(cols - 1)}" y2="${yy}" class="${cls}"/>`);
  }

  // position label for a shifted box
  if (!open) {
    p.push(`<text x="${padL - 10}" y="${padT + rowH * 0.5 + 3}" class="cb-pos">${firstFret}fr</text>`);
  }

  // O / X markers above the nut, and finger dots in the grid
  for (let s = 0; s < cols; s++) {
    const f = voicing[s];
    const my = padT - 9;
    if (f === -1) {
      p.push(`<text x="${sx(s)}" y="${my}" class="fb-marker"><title>muted</title>×</text>`);
    } else if (f === 0) {
      p.push(`<circle cx="${sx(s)}" cy="${my - 3}" r="4" class="fb-open"><title>${noteAt(s, 0)} · open</title></circle>`);
    } else {
      const space = f - firstFret; // 0-based fret space from the top of the box
      const cy = padT + (space + 0.5) * rowH;
      p.push(`<circle cx="${sx(s)}" cy="${cy}" r="7.5" class="fb-dot fb-chord"><title>${noteAt(s, f)} · fret ${f}</title></circle>`);
    }
  }

  const fingering = voicing.map((f) => (f === -1 ? "x" : f)).join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" class="chord-box" role="img" aria-label="${symbol} chord shape: ${fingering}">${p.join("")}</svg>`;
}
