// The audio engine — Phase 4. Build a live Web Audio graph from a chain of blocks,
// each a ready-made native node (the "primitives" of PRD §8 — no hand-written DSP).
// Pure audio plumbing, no DOM; driven by the data model in effects-model.js and
// browser-verified (Web Audio has no node-test harness, like the rest of our audio).

import { normalizeChain } from "./effects-model.js";

// Waveshaper curves, one per `type`. `drive` (0..1) sets how hard each bends.
//   soft — the classic arctan-ish bend: warm, rounds the peaks.
//   hard — flat clip against a drive-shrinking threshold: aggressive, square-ish.
//   fuzz — a steep tanh, asymmetric (positive half hotter) for a gritty octave-y bite.
function distortionCurve(drive, type = "soft") {
  const k = drive * 100;
  const n = 2048;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (type === "hard") {
      const t = 1 - drive * 0.9; // threshold shrinks with drive: 1.0 → 0.1
      curve[i] = Math.max(-t, Math.min(t, x)) / t; // clip, then normalize to ±1
    } else if (type === "fuzz") {
      const g = 1 + k * 0.5;
      const bias = x < 0 ? 0.7 : 1; // asymmetry — quieter on the negative half
      curve[i] = Math.tanh(x * g) * bias;
    } else {
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x)); // soft
    }
  }
  return curve;
}

// A synthetic reverb impulse: exponentially-decaying stereo noise. `size` (0..1)
// scales the tail length.
function impulseResponse(ctx, size) {
  const seconds = Math.max(0.1, size * 3);
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  return buf;
}

// Each builder returns { input, output } — the endpoints to wire into the chain.
const BUILDERS = {
  distortion(ctx, { drive, tone, level, type }) {
    const ws = ctx.createWaveShaper();
    ws.curve = distortionCurve(drive, type);
    ws.oversample = "2x";
    const lp = ctx.createBiquadFilter(); // tame the fizz the shaper adds up top
    lp.type = "lowpass";
    lp.frequency.value = tone;
    const out = ctx.createGain(); // makeup: shaping changes loudness a lot
    out.gain.value = level;

    ws.connect(lp).connect(out);
    return { input: ws, output: out };
  },

  filter(ctx, { mode, freq, q, gain }) {
    const f = ctx.createBiquadFilter();
    f.type = mode;
    f.frequency.value = freq;
    f.Q.value = q;
    f.gain.value = gain; // native node ignores gain for lowpass/highpass/bandpass/notch
    return { input: f, output: f };
  },

  delay(ctx, { time, feedback, tone, mix }) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = time;
    const fb = ctx.createGain();
    fb.gain.value = feedback;
    const damp = ctx.createBiquadFilter(); // darken each repeat — tape/analog feel
    damp.type = "lowpass";
    damp.frequency.value = tone;
    const wet = ctx.createGain();
    wet.gain.value = mix;

    input.connect(output); // dry
    input.connect(delay);
    delay.connect(damp).connect(fb).connect(delay); // feedback loop, filtered each pass
    delay.connect(wet).connect(output); // wet
    return { input, output };
  },

  reverb(ctx, { size, predelay, tone, mix }) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const pre = ctx.createDelay(1.0); // gap between the dry note and its tail
    pre.delayTime.value = predelay;
    const conv = ctx.createConvolver();
    conv.buffer = impulseResponse(ctx, size);
    const damp = ctx.createBiquadFilter(); // soften a brittle tail
    damp.type = "lowpass";
    damp.frequency.value = tone;
    const wet = ctx.createGain();
    wet.gain.value = mix;

    input.connect(output); // dry
    input.connect(pre).connect(conv).connect(damp).connect(wet).connect(output); // wet
    return { input, output };
  },
};

// Build a chain graph from a block list. Returns { input, output }; connect a
// source to `input` and `output` to the destination. An empty chain is a
// passthrough (input === output).
export function buildChain(ctx, chain) {
  const blocks = normalizeChain(chain);
  const nodes = blocks.map((b) => BUILDERS[b.type](ctx, b.params));
  if (!nodes.length) {
    const g = ctx.createGain();
    return { input: g, output: g };
  }
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].output.connect(nodes[i + 1].input);
  return { input: nodes[0].input, output: nodes[nodes.length - 1].output };
}
