// The Studio module — record → (overdub) → play back, all client-side audio.
// Groups T (mic access, device picker, level meter) and U (record a WAV take,
// save it to the git-ignored audio/ dir, play it back). Overdub + session notes
// come next. The Web Audio plumbing lives in recorder.js; this is the UI over it.

import { MicRecorder, listInputDevices, micSupported } from "./recorder.js";
import { postBlob } from "../lib/api.js";

const state = {
  supported: micSupported(),
  devices: [],
  deviceId: "",
  micOpen: false,
  recording: false,
  error: "",
  lastTake: null, // { url, duration, name, savedPath }
};

let root;
let onStatus = () => {};
const rec = new MicRecorder();
let meterRAF = null;

export function mount(container, { setStatus } = {}) {
  root = container;
  onStatus = setStatus || onStatus;
  render();
}

// --- rendering ------------------------------------------------------------

function render() {
  stopMeter();

  if (!state.supported) {
    root.innerHTML = `
      <section class="module-view studio">
        <h2>Studio</h2>
        <p class="muted">
          The mic needs a secure context. Reach benten at
          <code>http://127.0.0.1:8788</code> (localhost counts as secure) and use a
          browser with Web Audio.
        </p>
      </section>`;
    return;
  }

  root.innerHTML = `
    <section class="module-view studio">
      <h2>Studio</h2>
      <p class="muted">Catch a take. Audio stays local — it lands in the git-ignored
        <code>audio/</code> dir, referenced from your notes by path.</p>

      <div class="row mic-row">
        <label>input
          <select id="device" ${state.devices.length ? "" : "disabled"}>
            ${
              state.devices.length
                ? state.devices
                    .map(
                      (d) =>
                        `<option value="${d.deviceId}" ${d.deviceId === state.deviceId ? "selected" : ""}>${d.label}</option>`,
                    )
                    .join("")
                : `<option>— enable the mic to list devices —</option>`
            }
          </select>
        </label>
        <button id="mic-btn" type="button" class="${state.micOpen ? "is-open" : ""}">
          ${state.micOpen ? "mic on" : "enable mic"}
        </button>
      </div>

      ${state.error ? `<p class="mic-error">${state.error}</p>` : ""}

      <div class="meter-wrap ${state.micOpen ? "" : "muted"}">
        <div class="meter"><div class="meter-fill" id="meter-fill"></div></div>
        <span class="meter-label" id="meter-label">${state.micOpen ? "" : "level"}</span>
      </div>

      <div class="row transport studio-transport">
        <button id="rec-btn" type="button"
                class="${state.recording ? "is-recording" : ""}"
                ${state.micOpen ? "" : "disabled"}>
          ${state.recording ? "◼ stop" : "● record"}
        </button>
      </div>

      ${state.lastTake ? renderLastTake() : ""}
    </section>`;

  wire();
  if (state.micOpen) startMeter();
}

function renderLastTake() {
  const t = state.lastTake;
  return `
    <div class="take">
      <h3>Last take <span class="muted">· ${t.duration.toFixed(1)}s</span></h3>
      <audio controls src="${t.url}"></audio>
      <div class="save-row row">
        <input id="take-name" type="text" autocomplete="off"
               placeholder="name this take (optional)" value="${t.name || ""}" />
        <button id="save-take" type="button">save to audio/</button>
      </div>
      ${t.savedPath ? `<p class="muted saved">saved → <code>${t.savedPath}</code></p>` : ""}
    </div>`;
}

// --- level meter ----------------------------------------------------------

function startMeter() {
  const fill = root.querySelector("#meter-fill");
  const label = root.querySelector("#meter-label");
  if (!fill) return;
  const tick = () => {
    const { peak, rms } = rec.level();
    fill.style.width = `${Math.min(100, peak * 100)}%`;
    fill.classList.toggle("is-hot", peak > 0.95);
    if (label) label.textContent = rms > 0.001 ? `${Math.round(rms * 100)}%` : "silent";
    meterRAF = requestAnimationFrame(tick);
  };
  tick();
}

function stopMeter() {
  if (meterRAF) cancelAnimationFrame(meterRAF);
  meterRAF = null;
}

// --- events ---------------------------------------------------------------

function wire() {
  root.querySelector("#mic-btn")?.addEventListener("click", toggleMic);
  root.querySelector("#device")?.addEventListener("change", (e) => {
    state.deviceId = e.target.value;
    if (state.micOpen) openMic(); // reopen on the newly chosen device
  });
  root.querySelector("#rec-btn")?.addEventListener("click", toggleRecord);
  root.querySelector("#save-take")?.addEventListener("click", saveTake);
  root.querySelector("#take-name")?.addEventListener("input", (e) => {
    if (state.lastTake) state.lastTake.name = e.target.value;
  });
}

async function toggleMic() {
  if (state.micOpen) {
    await rec.close();
    state.micOpen = false;
    onStatus("mic off");
    render();
    return;
  }
  await openMic();
}

async function openMic() {
  state.error = "";
  onStatus("opening mic…");
  try {
    await rec.open(state.deviceId || undefined);
    state.micOpen = true;
    // Labels only populate after permission — refresh the device list now.
    state.devices = await listInputDevices();
    if (!state.deviceId && state.devices[0]) state.deviceId = state.devices[0].deviceId;
    onStatus("mic on — arm and record");
  } catch (e) {
    state.micOpen = false;
    state.error = micErrorMessage(e);
    onStatus("mic failed");
  }
  render();
}

function micErrorMessage(e) {
  if (e?.name === "NotAllowedError") return "Mic permission denied. Allow it in the browser and try again.";
  if (e?.name === "NotFoundError") return "No input device found. Plug in a mic and retry.";
  return `Couldn't open the mic: ${e?.message || e}`;
}

function toggleRecord() {
  if (state.recording) {
    const take = rec.stop();
    state.recording = false;
    if (state.lastTake?.url) URL.revokeObjectURL(state.lastTake.url);
    state.lastTake = {
      blob: take.wav,
      url: URL.createObjectURL(take.wav),
      duration: take.duration,
      name: "",
      savedPath: null,
    };
    onStatus(`take captured — ${take.duration.toFixed(1)}s`);
    render();
    return;
  }
  state.recording = true;
  rec.start();
  onStatus("recording…");
  render();
}

async function saveTake() {
  if (!state.lastTake) return;
  const name = state.lastTake.name?.trim() || "take";
  onStatus("saving take…");
  try {
    const res = await postBlob("/takes", state.lastTake.blob, { name, ext: ".wav" });
    state.lastTake.savedPath = res.path;
    onStatus(`saved → ${res.path}`);
    render();
  } catch (e) {
    onStatus(`save failed: ${e.message}`);
  }
}

// Exposed for future groups/tests.
export const _internals = { state };
