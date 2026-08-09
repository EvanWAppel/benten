// The audio engine — Phase 4. Build a live Web Audio graph from a chain of blocks,
// each a ready-made native node (the "primitives" of PRD §8 — no hand-written DSP).
// Pure audio plumbing, no DOM; driven by the data model in effects-model.js and
// browser-verified (Web Audio has no node-test harness, like the rest of our audio).

import { normalizeChain } from "./effects-model.js";

// A classic waveshaper curve — `drive` (0..1) sets how hard it bends.
function distortionCurve(drive) {
  const k = drive * 100;
  const n = 2048;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
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
  distortion(ctx, { drive }) {
    const ws = ctx.createWaveShaper();
    ws.curve = distortionCurve(drive);
    ws.oversample = "2x";
    return { input: ws, output: ws };
  },

  filter(ctx, { mode, freq, q }) {
    const f = ctx.createBiquadFilter();
    f.type = mode;
    f.frequency.value = freq;
    f.Q.value = q;
    return { input: f, output: f };
  },

  delay(ctx, { time, feedback, mix }) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = time;
    const fb = ctx.createGain();
    fb.gain.value = feedback;
    const wet = ctx.createGain();
    wet.gain.value = mix;

    input.connect(output); // dry
    input.connect(delay);
    delay.connect(fb).connect(delay); // feedback loop
    delay.connect(wet).connect(output); // wet
    return { input, output };
  },

  reverb(ctx, { size, mix }) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = impulseResponse(ctx, size);
    const wet = ctx.createGain();
    wet.gain.value = mix;

    input.connect(output); // dry
    input.connect(conv).connect(wet).connect(output); // wet
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
