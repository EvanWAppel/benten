// The Studio's mic machinery — all client-side Web Audio. Lists input devices,
// opens a mic, meters its level, captures PCM through an AudioWorklet, and can play
// a backing track underneath while recording (overdub). The pure encoding lives in
// wav.js; this file is the browser-only plumbing around it.

import { encodeWAV } from "./wav.js";

// True only where mic capture can actually work: a secure context with the API.
export function micSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    (window.isSecureContext ?? true)
  );
}

// List audio input devices. Labels are only populated once permission is granted,
// so callers typically refresh this after the first successful open().
export async function listInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((d) => d.kind === "audioinput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
}

export class MicRecorder {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.worklet = null;
    this._chunks = [];
    this._meterBuf = null;
    this.recording = false;
    this._workletLoaded = false; // addModule ran on this.ctx (once per context)
  }

  // The capture sample rate (the mic's AudioContext), or a sane default.
  get sampleRate() {
    return this.ctx?.sampleRate ?? 48000;
  }

  // One long-lived AudioContext per recorder, with the worklet module loaded
  // exactly once. Reusing the context (rather than newing one per open) avoids
  // leaking contexts and — crucially — only loads the worklet once, so a transient
  // load failure can't recur mid-session.
  async _ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._workletLoaded = false;
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (!this._workletLoaded) {
      await this._loadWorklet();
      this._workletLoaded = true;
    }
    return this.ctx;
  }

  // Load the capture worklet, retrying once. Right after the first getUserMedia
  // permission grant, Chrome's worklet loader can briefly reject addModule with an
  // AbortError ("Unable to load a worklet's module"); a short wait and one retry
  // clears it reliably.
  async _loadWorklet() {
    const url = "/static/worklets/recorder-worklet.js";
    try {
      await this.ctx.audioWorklet.addModule(url);
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
      await this.ctx.audioWorklet.addModule(url); // second attempt; let it throw if it still fails
    }
  }

  // Open the mic and wire the metering + capture graph. Idempotent per device.
  async open(deviceId) {
    if (!micSupported()) throw new Error("mic unavailable (needs a secure context)");
    await this.close();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    await this._ensureContext();
    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this._meterBuf = new Float32Array(this.analyser.fftSize);
    this.source.connect(this.analyser);

    this.worklet = new AudioWorkletNode(this.ctx, "recorder-processor");
    this.worklet.port.onmessage = (e) => {
      if (this.recording) this._chunks.push(e.data);
    };
    this.source.connect(this.worklet);
    // The worklet must pull, but we don't want to hear the mic (feedback), so
    // route it to a muted gain rather than straight to the speakers.
    const sink = this.ctx.createGain();
    sink.gain.value = 0;
    this.worklet.connect(sink).connect(this.ctx.destination);
  }

  // Current input level as {peak, rms} in 0..1 — drives the meter.
  level() {
    if (!this.analyser) return { peak: 0, rms: 0 };
    this.analyser.getFloatTimeDomainData(this._meterBuf);
    let peak = 0;
    let sumSq = 0;
    for (const v of this._meterBuf) {
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sumSq += v * v;
    }
    return { peak, rms: Math.sqrt(sumSq / this._meterBuf.length) };
  }

  // Start collecting PCM. `backing` (optional) is an AudioBuffer looped underneath
  // for overdub; returns the started backing source so the caller can stop it.
  start({ backing } = {}) {
    this._chunks = [];
    this.recording = true;
    this.worklet?.port.postMessage("start");

    let backingSrc = null;
    if (backing && this.ctx) {
      backingSrc = this.ctx.createBufferSource();
      backingSrc.buffer = backing;
      backingSrc.loop = true;
      backingSrc.connect(this.ctx.destination);
      backingSrc.start();
    }
    return backingSrc;
  }

  // Stop capture and return the take as { wav: Blob, samples, sampleRate, duration }.
  // `trimStartSamples` drops that many samples off the front before encoding — the
  // latency-compensation offset for an overdub, so it lands in time with the backing.
  stop({ trimStartSamples = 0 } = {}) {
    this.recording = false;
    this.worklet?.port.postMessage("stop");

    const total = this._chunks.reduce((n, c) => n + c.length, 0);
    const all = new Float32Array(total);
    let offset = 0;
    for (const c of this._chunks) {
      all.set(c, offset);
      offset += c.length;
    }
    this._chunks = [];

    const samples = trimStartSamples > 0 ? all.subarray(trimStartSamples) : all;
    const sampleRate = this.sampleRate;
    const wav = new Blob([encodeWAV(samples, { sampleRate, channels: 1 })], {
      type: "audio/wav",
    });
    return { wav, samples, sampleRate, duration: samples.length / sampleRate };
  }

  // Decode a WAV/blob back into an AudioBuffer for looping as a backing track.
  async decode(blob) {
    await this._ensureContext();
    const buf = await blob.arrayBuffer();
    return this.ctx.decodeAudioData(buf);
  }

  // Tear down the mic graph and release the device, but keep the AudioContext (and
  // its loaded worklet) alive so the next open() reuses it — no re-fetch, no leak.
  async close() {
    try {
      this.stream?.getTracks().forEach((t) => t.stop());
      this.worklet?.disconnect();
      this.source?.disconnect();
      this.analyser?.disconnect();
    } catch {
      /* tearing down a half-open graph is fine */
    }
    this.stream = null;
    this.worklet = null;
    this.source = null;
    this.analyser = null;
    this.recording = false;
  }
}
