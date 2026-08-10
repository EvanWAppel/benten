// Guitar chord shapes — pure, so it's unit-testable (no DOM). tonal knows a chord's
// notes but not how to grab it on a neck, so we search the fretboard for one clean,
// playable voicing: every sounded string is a chord tone, the root sits in the bass,
// muted strings only at the bottom (no awkward interior gaps), and the whole thing
// fits under one hand. It won't always be the textbook shape, but it's always a
// correct, playable way to fret the chord — enough to learn an unfamiliar one.

import { Chord, Note } from "../vendor/tonal.js";
import { STANDARD_GUITAR } from "./fretboard.js";

export { STANDARD_GUITAR };

const SPAN = 4; // a shape spans at most four frets — one hand's reach.

// A candidate string state: a fret number, 0 (open), or -1 (muted).
const MUTED = -1;

// Score a voicing so the search prefers shapes a human would actually play.
// Higher is better; the weights are ordered so completeness beats bass-note beats
// string-count beats easy-and-low.
function scoreVoicing(voicing, open, tones, rootChroma) {
  const sounded = [];
  voicing.forEach((f, s) => {
    if (f !== MUTED) sounded.push({ s, chroma: (open[s] + f) % 12 });
  });
  if (!sounded.length) return -Infinity;

  const covered = new Set(sounded.map((n) => n.chroma));
  const frets = voicing.filter((f) => f > 0);
  const span = frets.length ? Math.max(...frets) - Math.min(...frets) : 0;
  if (span > SPAN) return -Infinity;

  // Muted strings above the lowest sounded one are interior gaps — hard to play.
  const lowest = sounded[0].s;
  const interiorMutes = voicing
    .slice(lowest)
    .filter((f) => f === MUTED).length;

  const minFret = frets.length ? Math.min(...frets) : 0;
  const opens = voicing.filter((f) => f === 0).length;
  const barreWidth = frets.filter((f) => f === minFret).length; // strings sharing the low fret

  let score = 0;
  score += covered.size === tones.size ? 1000 : 300 * covered.size; // completeness
  score += sounded[0].chroma === rootChroma ? 600 : 0; // root in the bass
  score += 25 * sounded.length; // prefer fuller shapes (mildly)
  score += 30 * opens; // open strings ring out and are easy — the beginner shapes
  score -= 400 * interiorMutes; // punish interior gaps
  score -= 35 * minFret; // strongly prefer low / open positions over barres up the neck
  score -= 15 * Math.max(0, barreWidth - 1); // a small nudge away from barres
  score -= 10 * span; // prefer compact shapes
  return score;
}

// The playable frets on one string within a window: chord tones only, plus mute.
// Keeps at most the two lowest options so the search stays small.
function stringOptions(openChroma, tones, base, allowOpen) {
  const opts = [];
  if (allowOpen && tones.has(openChroma % 12)) opts.push(0);
  for (let f = base; f < base + SPAN && opts.length < 2; f++) {
    if (f === 0) continue; // open handled above
    if (tones.has((openChroma + f) % 12)) opts.push(f);
  }
  opts.push(MUTED);
  return opts;
}

// Cartesian product of each string's options → every candidate voicing at a base.
function* voicingsAt(open, tones, base) {
  const allowOpen = base === 0;
  const perString = open.map((oc) => stringOptions(oc, tones, base, allowOpen));
  const idx = new Array(open.length).fill(0);
  while (true) {
    yield perString.map((opts, s) => opts[idx[s]]);
    let k = open.length - 1;
    while (k >= 0 && ++idx[k] >= perString[k].length) idx[k--] = 0;
    if (k < 0) break;
  }
}

// The best shape for a chord symbol, or { valid: false } if it can't be parsed.
// Returns the voicing low→high (fret | 0 open | -1 mute), the fret the box should
// start on (0 = open position, shown at the nut), and the chord's notes.
export function chordShape(symbol, { tuning = STANDARD_GUITAR } = {}) {
  const chord = Chord.get(symbol);
  if (chord.empty || chord.notes.length < 2) return { symbol, valid: false };

  const open = tuning.map((n) => Note.chroma(n));
  const tones = new Set(chord.notes.map((n) => Note.chroma(n)));
  const rootChroma = Note.chroma(chord.tonic || chord.notes[0]);

  let best = null;
  let bestScore = -Infinity;
  for (let base = 0; base <= 9; base++) {
    for (const voicing of voicingsAt(open, tones, base)) {
      const score = scoreVoicing(voicing, open, tones, rootChroma);
      if (score > bestScore) {
        bestScore = score;
        best = voicing;
      }
    }
  }
  if (!best) return { symbol, valid: false };

  const fretted = best.filter((f) => f > 0);
  const maxFret = fretted.length ? Math.max(...fretted) : 0;
  // Open position when nothing is fretted past the 4th fret; otherwise the box
  // starts at the lowest fretted note and carries a "Nfr" position label.
  const baseFret = maxFret <= SPAN ? 0 : Math.min(...fretted);

  return {
    symbol,
    valid: true,
    voicing: best,
    baseFret,
    notes: chord.notes,
    tuning,
  };
}
