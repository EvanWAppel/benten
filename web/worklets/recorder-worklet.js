// An AudioWorklet processor that ships captured PCM back to the main thread.
// It does no encoding — it just copies mono input frames and posts them out while
// armed. The main thread (recorder.js) collects the chunks and encodes to WAV on
// stop. Using a worklet keeps capture off the main thread and off the deprecated
// ScriptProcessorNode path, so this doesn't need a rewrite to survive.

class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._recording = false;
    this.port.onmessage = (e) => {
      if (e.data === "start") this._recording = true;
      else if (e.data === "stop") this._recording = false;
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (this._recording && input && input[0]) {
      // Copy — the underlying buffer is reused across process() calls.
      this.port.postMessage(input[0].slice(0));
    }
    return true; // keep the processor alive
  }
}

registerProcessor("recorder-processor", RecorderProcessor);
