// WAV encoder tests (the pure part of the Studio capture path).
// Run: node --test jstests/wav.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { encodeWAV, interleave } from "../web/modules/wav.js";

function readString(view, offset, len) {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

test("header carries the RIFF/WAVE/fmt/data markers", () => {
  const buf = encodeWAV(new Float32Array([0, 0, 0, 0]), { sampleRate: 48000 });
  const v = new DataView(buf);
  assert.equal(readString(v, 0, 4), "RIFF");
  assert.equal(readString(v, 8, 4), "WAVE");
  assert.equal(readString(v, 12, 4), "fmt ");
  assert.equal(readString(v, 36, 4), "data");
});

test("sizes and format fields match a 16-bit mono PCM stream", () => {
  const samples = new Float32Array(10);
  const buf = encodeWAV(samples, { sampleRate: 44100, channels: 1 });
  const v = new DataView(buf);
  const dataBytes = 10 * 2;
  assert.equal(buf.byteLength, 44 + dataBytes);
  assert.equal(v.getUint32(4, true), 36 + dataBytes); // RIFF chunk size
  assert.equal(v.getUint16(20, true), 1); // PCM
  assert.equal(v.getUint16(22, true), 1); // channels
  assert.equal(v.getUint32(24, true), 44100); // sample rate
  assert.equal(v.getUint16(34, true), 16); // bits per sample
  assert.equal(v.getUint32(40, true), dataBytes); // data chunk size
});

test("full-scale samples clamp to the 16-bit rails", () => {
  const buf = encodeWAV(new Float32Array([1, -1, 2, -2]), {});
  const v = new DataView(buf);
  assert.equal(v.getInt16(44, true), 32767); // +1.0
  assert.equal(v.getInt16(46, true), -32768); // -1.0
  assert.equal(v.getInt16(48, true), 32767); // clamped from +2
  assert.equal(v.getInt16(50, true), -32768); // clamped from -2
});

test("interleave zips two channels frame by frame", () => {
  const left = new Float32Array([1, 3, 5]);
  const right = new Float32Array([2, 4, 6]);
  assert.deepEqual([...interleave([left, right])], [1, 2, 3, 4, 5, 6]);
});

test("interleave passes a single channel straight through", () => {
  const mono = new Float32Array([1, 2, 3]);
  assert.equal(interleave([mono]), mono);
});
