// The effect model — Phase 4. Ready-made Web Audio primitives, described as data:
// each block is a type plus a few named params with defaults and ranges. This module
// is pure (no audio, no DOM), so it's node-testable; the audio graph is built from
// these definitions in effects-audio.js, and presets round-trip through preset.js.

// Each param: { key, label, min, max, step, default } for numbers, or
// { key, label, options, default } for a fixed choice.
export const EFFECTS = {
  distortion: {
    label: "Distortion",
    params: [
      { key: "drive", label: "drive", min: 0, max: 1, step: 0.01, default: 0.4 },
      { key: "tone", label: "tone (Hz)", min: 500, max: 18000, step: 10, default: 8000 },
      { key: "level", label: "level", min: 0, max: 1, step: 0.01, default: 0.8 },
      { key: "type", label: "type", options: ["soft", "hard", "fuzz"], default: "soft" },
    ],
  },
  filter: {
    label: "Filter",
    params: [
      {
        key: "mode",
        label: "mode",
        options: ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch"],
        default: "lowpass",
      },
      { key: "freq", label: "freq (Hz)", min: 20, max: 18000, step: 1, default: 1000 },
      { key: "q", label: "Q", min: 0.1, max: 20, step: 0.1, default: 0.7 },
      { key: "gain", label: "gain (dB)", min: -24, max: 24, step: 0.5, default: 0 },
    ],
  },
  delay: {
    label: "Delay",
    params: [
      { key: "time", label: "time (s)", min: 0, max: 1.5, step: 0.01, default: 0.25 },
      { key: "feedback", label: "feedback", min: 0, max: 0.95, step: 0.01, default: 0.35 },
      { key: "tone", label: "tone (Hz)", min: 500, max: 18000, step: 10, default: 6000 },
      { key: "mix", label: "mix", min: 0, max: 1, step: 0.01, default: 0.3 },
    ],
  },
  reverb: {
    label: "Reverb",
    params: [
      { key: "size", label: "size", min: 0.05, max: 1, step: 0.01, default: 0.6 },
      { key: "predelay", label: "predelay (s)", min: 0, max: 0.2, step: 0.005, default: 0 },
      { key: "tone", label: "tone (Hz)", min: 500, max: 18000, step: 10, default: 10000 },
      { key: "mix", label: "mix", min: 0, max: 1, step: 0.01, default: 0.25 },
    ],
  },
};

// The canonical order effects render/serialize in, and the order the UI offers.
export const EFFECT_TYPES = ["distortion", "filter", "delay", "reverb"];

export function isEffectType(type) {
  return Object.prototype.hasOwnProperty.call(EFFECTS, type);
}

// A fresh block of `type` with every param at its default.
export function defaultBlock(type) {
  if (!isEffectType(type)) throw new Error(`unknown effect: ${type}`);
  const params = {};
  for (const p of EFFECTS[type].params) params[p.key] = p.default;
  return { type, params };
}

// Coerce/validate a param bag against the type's schema: numbers are clamped to
// range, choices snapped to a valid option, and any missing key filled from the
// default. Unknown keys are dropped. Always returns a complete, safe param bag.
export function clampParams(type, params = {}) {
  if (!isEffectType(type)) throw new Error(`unknown effect: ${type}`);
  const out = {};
  for (const p of EFFECTS[type].params) {
    const raw = params[p.key];
    if (p.options) {
      out[p.key] = p.options.includes(raw) ? raw : p.default;
    } else {
      const n = typeof raw === "number" ? raw : parseFloat(raw);
      out[p.key] = Number.isFinite(n) ? Math.min(p.max, Math.max(p.min, n)) : p.default;
    }
  }
  return out;
}

// Normalize a whole chain: keep only known types, clamp each block's params.
export function normalizeChain(chain = []) {
  return chain
    .filter((b) => b && isEffectType(b.type))
    .map((b) => ({ type: b.type, params: clampParams(b.type, b.params) }));
}
