// The first audio in benten — Web Audio, all client-side. A shared context, a
// simple synth voice, chord voicing, a metronome click, and a look-ahead scheduler
// that loops a progression so you can solo over it.

import { Chord, Note } from "../vendor/tonal.js";

let ctx = null;

// Lazily create/resume the context. Must be called from a user gesture (a click)
// the first time, per the browser autoplay policy.
export function audioContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Voice a chord as ascending note names with octaves, starting near baseOctave —
// each note bumped up an octave when it would otherwise fall below the previous.
export function voiceChord(symbol, baseOctave = 3) {
  const c = Chord.get(symbol);
  if (c.empty || !c.notes.length) return [];
  const out = [];
  let oct = baseOctave;
  let prev = -1;
  for (const n of c.notes) {
    const chroma = Note.chroma(n);
    if (chroma <= prev) oct += 1;
    prev = chroma;
    out.push(`${n}${oct}`);
  }
  return out;
}

// A single synth note with a short attack/release envelope.
export function playNote(
  noteName,
  { time, duration = 0.5, gain = 0.15, type = "triangle" } = {},
) {
  const ac = audioContext();
  const t = time ?? ac.currentTime;
  const freq = Note.freq(noteName);
  if (!freq) return;

  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const attack = 0.01;
  const release = 0.12;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, duration - release));
  g.gain.linearRampToValueAtTime(0, t + duration);

  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

// Play all notes of a chord together as a pad.
export function playChord(symbol, { time, duration = 0.8, gain = 0.09 } = {}) {
  const ac = audioContext();
  const t = time ?? ac.currentTime;
  for (const n of voiceChord(symbol)) playNote(n, { time: t, duration, gain });
}

// A metronome click — accented on the downbeat.
export function click(accent = false, time) {
  const ac = audioContext();
  const t = time ?? ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.frequency.value = accent ? 2000 : 1000;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.3 : 0.14, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

// Loops a chord progression with a metronome and an optional count-in bar. Uses
// the standard Web Audio look-ahead pattern (schedule slightly ahead of the clock),
// and fires onChord/onBeat UI callbacks timed to when each event actually sounds.
export class ProgressionPlayer {
  constructor({
    progression,
    tempo = 90,
    beatsPerBar = 4,
    barsPerChord = 1,
    countIn = true,
    metronome = true,
    onChord,
    onBeat,
    onStop,
  }) {
    Object.assign(this, {
      progression,
      tempo,
      beatsPerBar,
      barsPerChord,
      countIn,
      metronome,
      onChord,
      onBeat,
      onStop,
    });
    this._timer = null;
    this._playing = false;
  }

  start() {
    const ac = audioContext();
    this._playing = true;

    const spb = 60 / this.tempo; // seconds per beat
    const beatsPerChord = this.beatsPerBar * this.barsPerChord;
    const countInBeats = this.countIn ? this.beatsPerBar : 0;
    const scheduleAhead = 0.2; // seconds
    const tick = 0.05; // scheduler wake interval

    let nextTime = ac.currentTime + 0.15;
    let beat = 0;

    const scheduler = () => {
      if (!this._playing) return;
      while (nextTime < ac.currentTime + scheduleAhead) {
        const inCountIn = beat < countInBeats;
        const playBeat = beat - countInBeats;
        const beatInBar = inCountIn
          ? beat
          : ((playBeat % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar;
        const accent = beatInBar === 0;

        if (this.metronome || inCountIn) click(accent, nextTime);

        if (!inCountIn && playBeat % beatsPerChord === 0) {
          const idx = (playBeat / beatsPerChord) % this.progression.length;
          const sym = this.progression[idx];
          if (sym) playChord(sym, { time: nextTime, duration: spb * beatsPerChord * 0.95 });
          this._fireUI(nextTime, ac, () => this.onChord?.(idx));
        }
        this._fireUI(nextTime, ac, () => this.onBeat?.(beat, inCountIn));

        nextTime += spb;
        beat += 1;
      }
      this._timer = setTimeout(scheduler, tick * 1000);
    };
    scheduler();
  }

  _fireUI(time, ac, fn) {
    setTimeout(fn, Math.max(0, (time - ac.currentTime) * 1000));
  }

  stop() {
    this._playing = false;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
    this.onStop?.();
  }
}
