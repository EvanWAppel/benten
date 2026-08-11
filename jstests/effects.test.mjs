// Effect model + preset round-trip tests. Run: node --test jstests/effects.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { clampParams, defaultBlock, normalizeChain } from "../web/modules/effects-model.js";
import { parsePreset, presetMarkdown } from "../web/modules/preset.js";

test("a default block carries every param at its default", () => {
  assert.deepEqual(defaultBlock("delay"), {
    type: "delay",
    params: { time: 0.25, feedback: 0.35, tone: 6000, mix: 0.3 },
  });
});

test("distortion defaults include tone/level/type", () => {
  assert.deepEqual(defaultBlock("distortion"), {
    type: "distortion",
    params: { drive: 0.4, tone: 8000, level: 0.8, type: "soft" },
  });
});

test("defaultBlock rejects an unknown effect", () => {
  assert.throws(() => defaultBlock("flanger"), /unknown effect/);
});

test("clampParams clamps numbers, snaps choices, and fills gaps", () => {
  const p = clampParams("filter", { mode: "wobble", freq: 99999, q: -5 });
  assert.equal(p.mode, "lowpass"); // invalid choice -> default
  assert.equal(p.freq, 18000); // clamped to max
  assert.equal(p.q, 0.1); // clamped to min
  assert.equal(p.gain, 0); // missing -> default
});

test("filter accepts the shelf/peaking/notch modes and clamps gain", () => {
  const p = clampParams("filter", { mode: "peaking", gain: 99 });
  assert.equal(p.mode, "peaking"); // now a valid choice
  assert.equal(p.gain, 24); // clamped to max dB
});

test("distortion type snaps to a valid curve and fills the rest", () => {
  const p = clampParams("distortion", { drive: 0.6, type: "screaming" });
  assert.equal(p.type, "soft"); // invalid choice -> default
  assert.equal(p.tone, 8000);
  assert.equal(p.level, 0.8);
});

test("clampParams coerces numeric strings (as parsed from Markdown)", () => {
  const p = clampParams("delay", { time: "0.4", feedback: "0.5", mix: "0.2" });
  assert.deepEqual(p, { time: 0.4, feedback: 0.5, tone: 6000, mix: 0.2 });
});

test("normalizeChain drops unknown blocks and cleans the rest", () => {
  const chain = normalizeChain([
    { type: "distortion", params: { drive: 0.6 } },
    { type: "bogus", params: {} },
    { type: "reverb", params: {} },
  ]);
  assert.deepEqual(chain.map((b) => b.type), ["distortion", "reverb"]);
  assert.equal(chain[1].params.mix, 0.25); // reverb default filled
});

test("a preset renders a readable table with the chain summary", () => {
  const md = presetMarkdown({
    name: "Ambient lead",
    date: "2026-08-09",
    chain: [defaultBlock("distortion"), defaultBlock("delay"), defaultBlock("reverb")],
  });
  assert.match(md, /^# Ambient lead — effect chain/);
  assert.match(md, /\*\*chain:\*\* Distortion → Delay → Reverb/);
  assert.match(md, /\| 1 \| distortion \| drive=0\.4, tone=8000, level=0\.8, type=soft \|/);
  assert.match(md, /Filed in \[`production\/`\]/);
});

test("an empty chain still renders valid Markdown", () => {
  const md = presetMarkdown({ name: "", chain: [] });
  assert.match(md, /^# Untitled chain — effect chain/);
  assert.match(md, /_\(empty\)_/);
});

test("parsePreset round-trips presetMarkdown exactly", () => {
  const chain = [
    { type: "distortion", params: { drive: 0.55 } },
    { type: "filter", params: { mode: "highpass", freq: 800, q: 1.2 } },
    { type: "delay", params: { time: 0.3, feedback: 0.4, mix: 0.25 } },
    { type: "reverb", params: { size: 0.7, mix: 0.3 } },
  ];
  const md = presetMarkdown({ name: "Round Trip", date: "2026-08-09", chain });
  const parsed = parsePreset(md);
  assert.equal(parsed.name, "Round Trip");
  assert.deepEqual(parsed.chain, normalizeChain(chain));
});

test("parsePreset ignores prose and only reads real effect rows", () => {
  const md = [
    "# My Chain — effect chain",
    "",
    "some notes a human typed here",
    "",
    "| # | effect | params |",
    "|---|--------|--------|",
    "| 1 | filter | mode=lowpass, freq=1200, q=0.7 |",
    "",
    "and a closing thought",
  ].join("\n");
  const { name, chain } = parsePreset(md);
  assert.equal(name, "My Chain");
  assert.equal(chain.length, 1);
  assert.equal(chain[0].type, "filter");
  assert.equal(chain[0].params.freq, 1200);
});
