// A tiny, dependency-free WAV encoder. Takes the Float32 PCM the browser captures
// and writes a canonical 16-bit little-endian WAV — the DAW-friendly format the
// PRD asks for, with no lossy intermediate. Pure and side-effect-free, so it runs
// under `node --test` as happily as in the browser.

const BYTES_PER_SAMPLE = 2; // 16-bit

// Interleave N channel buffers (each a Float32Array of the same length) into one.
export function interleave(channels) {
  if (channels.length === 1) return channels[0];
  const frames = channels[0].length;
  const out = new Float32Array(frames * channels.length);
  let j = 0;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels.length; c++) out[j++] = channels[c][i];
  }
  return out;
}

// Encode interleaved Float32 samples (-1..1) as a WAV file. Returns an ArrayBuffer.
export function encodeWAV(samples, { sampleRate = 48000, channels = 1 } = {}) {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const byteRate = sampleRate * channels * BYTES_PER_SAMPLE;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true); // chunk size
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // subchunk1 size (PCM)
  view.setUint16(20, 1, true); // audio format: 1 = PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, channels * BYTES_PER_SAMPLE, true); // block align
  view.setUint16(34, 8 * BYTES_PER_SAMPLE, true); // bits per sample

  writeString(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  // Float [-1,1] -> signed 16-bit, clamped.
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += BYTES_PER_SAMPLE;
  }
  return buffer;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
