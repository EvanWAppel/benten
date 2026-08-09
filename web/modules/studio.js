// The Studio module — record → (overdub) → play back, all client-side audio.
// Groups T (mic, device picker, level meter), U (record a WAV take, save it to the
// git-ignored audio/ dir, play it back), and V (loop a take as a backing track,
// overdub a lead over it, with a latency offset so the overdub lands in time).
// Session notes come next. The Web Audio plumbing lives in recorder.js.

import { MicRecorder, listInputDevices, micSupported } from "./recorder.js";
import { sessionMarkdown, riffMarkdown } from "./session.js";
import { postBlob, postJSON } from "../lib/api.js";

const today = () => new Date().toISOString().slice(0, 10);

const state = {
  supported: micSupported(),
  devices: [],
  deviceId: "",
  micOpen: false,
  recording: false,
  error: "",
  takes: [], // { id, blob, url, duration, name, role, savedPath, _buffer }
  backingId: null, // take looped underneath while overdubbing, or null
  latencyMs: 0, // overdub calibration — trimmed off the front of an overdub
  sessionTitle: "",
  sessionNotes: "",
  sessionSavedPath: null,
  _seq: 0,
};

let root;
let onStatus = () => {};
const rec = new MicRecorder();
let meterRAF = null;
let backingSrc = null; // the playing backing source during an overdub

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

  const overdubbing = state.backingId != null;
  root.innerHTML = `
    <section class="module-view studio">
      <h2>Studio</h2>
      <p class="muted">Catch a take, loop it, and jam over yourself. Audio stays
        local — it lands in the git-ignored <code>audio/</code> dir, referenced from
        your notes by path.</p>

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
          ${state.recording ? "◼ stop" : overdubbing ? "● overdub" : "● record"}
        </button>
        ${overdubbing ? `<span class="overdub-tag">over ${backingName()}</span>` : ""}
        <label class="latency" title="shift the overdub earlier to compensate for round-trip latency">
          latency
          <input id="latency" type="number" min="0" max="500" step="5" value="${state.latencyMs}" /> ms
        </label>
      </div>

      ${state.takes.length ? renderTakes() : `<p class="muted hint">No takes yet — enable the mic and record one.</p>`}
      ${state.takes.length ? renderSession() : ""}
    </section>`;

  wire();
  if (state.micOpen) startMeter();
}

function backingName() {
  const t = state.takes.find((x) => x.id === state.backingId);
  return t ? t.name || t.role : "—";
}

function renderTakes() {
  const rows = state.takes
    .map((t) => {
      const isBacking = t.id === state.backingId;
      return `
      <li class="take ${isBacking ? "is-backing" : ""}">
        <div class="take-head">
          <span class="role-tag">${t.role}</span>
          <input class="take-name" data-name="${t.id}" type="text" autocomplete="off"
                 placeholder="name this take" value="${t.name || ""}" />
          <span class="muted dur">${t.duration.toFixed(1)}s</span>
        </div>
        <audio controls src="${t.url}"></audio>
        <div class="take-ops row">
          <button class="backing-btn ${isBacking ? "is-on" : ""}" data-backing="${t.id}" type="button">
            ${isBacking ? "◼ backing" : "loop as backing"}
          </button>
          <button class="save-take" data-save="${t.id}" type="button">save to audio/</button>
          <button class="riff-take" data-riff="${t.id}" type="button" title="capture this take as a riff idea">→ riffs/</button>
          <button class="drop-take" data-drop="${t.id}" type="button" aria-label="discard take">discard</button>
          ${t.savedPath ? `<span class="muted saved">saved → <code>${t.savedPath}</code></span>` : ""}
          ${t.riffPath ? `<span class="muted saved">riff → <code>${t.riffPath}</code></span>` : ""}
        </div>
      </li>`;
    })
    .join("");
  return `<h3>Session takes</h3><ul class="takes">${rows}</ul>`;
}

function renderSession() {
  return `
    <div class="session-note">
      <h3>Session note</h3>
      <p class="muted">Write the session down while it's warm — it lands in
        <code>recording/sessions/</code> with the take list.</p>
      <input id="session-title" type="text" autocomplete="off"
             placeholder="name this session (optional)" value="${state.sessionTitle}" />
      <textarea id="session-notes" rows="3"
        placeholder="what worked, what to fix next time…">${state.sessionNotes}</textarea>
      <div class="row">
        <button id="save-session" type="button">save session note</button>
        ${state.sessionSavedPath ? `<span class="muted saved">saved → <code>${state.sessionSavedPath}</code></span>` : ""}
      </div>
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
    if (state.micOpen) openMic();
  });
  root.querySelector("#rec-btn")?.addEventListener("click", toggleRecord);
  root.querySelector("#latency")?.addEventListener("change", (e) => {
    const n = parseInt(e.target.value, 10);
    state.latencyMs = Number.isNaN(n) ? 0 : Math.min(500, Math.max(0, n));
  });

  root.querySelectorAll("[data-name]").forEach((el) =>
    el.addEventListener("input", (e) => {
      const t = takeById(el.dataset.name);
      if (t) t.name = e.target.value;
    }),
  );
  root.querySelectorAll("[data-backing]").forEach((b) =>
    b.addEventListener("click", () => toggleBacking(b.dataset.backing)),
  );
  root.querySelectorAll("[data-save]").forEach((b) =>
    b.addEventListener("click", () => saveTake(b.dataset.save)),
  );
  root.querySelectorAll("[data-riff]").forEach((b) =>
    b.addEventListener("click", () => captureRiff(b.dataset.riff)),
  );
  root.querySelectorAll("[data-drop]").forEach((b) =>
    b.addEventListener("click", () => dropTake(b.dataset.drop)),
  );

  root.querySelector("#session-title")?.addEventListener("input", (e) => {
    state.sessionTitle = e.target.value;
  });
  root.querySelector("#session-notes")?.addEventListener("input", (e) => {
    state.sessionNotes = e.target.value;
  });
  root.querySelector("#save-session")?.addEventListener("click", saveSession);
}

function takeById(id) {
  return state.takes.find((t) => t.id === id);
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

async function toggleRecord() {
  if (state.recording) return stopRecord();

  const backing = takeById(state.backingId);
  let buffer = null;
  if (backing) {
    onStatus("cueing backing…");
    buffer = backing._buffer ??= await rec.decode(backing.blob);
  }
  state.recording = true;
  backingSrc = rec.start({ backing: buffer });
  onStatus(backing ? "overdubbing — play over it" : "recording…");
  render();
}

function stopRecord() {
  const overdub = state.backingId != null;
  const trimStartSamples = overdub ? Math.round((state.latencyMs / 1000) * rec.sampleRate) : 0;
  const take = rec.stop({ trimStartSamples });

  if (backingSrc) {
    try {
      backingSrc.stop();
    } catch {
      /* already stopped */
    }
    backingSrc = null;
  }

  state.recording = false;
  state.takes.push({
    id: `t${++state._seq}`,
    blob: take.wav,
    url: URL.createObjectURL(take.wav),
    duration: take.duration,
    name: "",
    role: overdub ? "lead" : "rhythm",
    savedPath: null,
    _buffer: null,
  });
  onStatus(`take captured — ${take.duration.toFixed(1)}s`);
  render();
}

function toggleBacking(id) {
  state.backingId = state.backingId === id ? null : id;
  onStatus(state.backingId ? "backing set — record to overdub" : "backing cleared");
  render();
}

async function saveTake(id) {
  const t = takeById(id);
  if (!t) return;
  const name = t.name?.trim() || t.role;
  onStatus("saving take…");
  try {
    const res = await postBlob("/takes", t.blob, { name, ext: ".wav" });
    t.savedPath = res.path;
    onStatus(`saved → ${res.path}`);
    render();
  } catch (e) {
    onStatus(`save failed: ${e.message}`);
  }
}

// Save a take's WAV to audio/ if it isn't already there; returns its repo path.
async function ensureSaved(t) {
  if (t.savedPath) return t.savedPath;
  const res = await postBlob("/takes", t.blob, { name: t.name?.trim() || t.role, ext: ".wav" });
  t.savedPath = res.path;
  return t.savedPath;
}

async function captureRiff(id) {
  const t = takeById(id);
  if (!t) return;
  onStatus("capturing riff…");
  try {
    await ensureSaved(t); // a riff should point at a real file
    const name = t.name?.trim() || `${t.role} riff`;
    const body = riffMarkdown({ name, path: t.savedPath, date: today() });
    const res = await postJSON("/riffs", { title: name, body });
    t.riffPath = res.path;
    onStatus(`riff → ${res.path}`);
    render();
  } catch (e) {
    onStatus(`riff capture failed: ${e.message}`);
  }
}

async function saveSession() {
  onStatus("saving session…");
  try {
    // Land any unsaved takes first, so the note references real files.
    for (const t of state.takes) await ensureSaved(t);
    const title = state.sessionTitle?.trim() || "Studio session";
    const body = sessionMarkdown({
      title,
      date: today(),
      takes: state.takes,
      notes: state.sessionNotes,
    });
    const res = await postJSON("/sessions", { title, body });
    state.sessionSavedPath = res.path;
    onStatus(`session note → ${res.path}`);
    render();
  } catch (e) {
    onStatus(`session save failed: ${e.message}`);
  }
}

function dropTake(id) {
  const t = takeById(id);
  if (t?.url) URL.revokeObjectURL(t.url);
  state.takes = state.takes.filter((x) => x.id !== id);
  if (state.backingId === id) state.backingId = null;
  render();
}

// Exposed for future groups/tests.
export const _internals = { state };
