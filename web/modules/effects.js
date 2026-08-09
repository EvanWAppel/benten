// The Effects module — Phase 4. Build a chain of ready-made Web Audio blocks, load
// a Studio take, and audition it through the chain live with an A/B bypass. Save the
// chain as a named preset into production/effects/ and load it back. The audio graph
// lives in effects-audio.js, the data model in effects-model.js, the preset Markdown
// in preset.js — this module is the UI and the transport.

import { audioContext } from "./audio.js";
import { EFFECTS, EFFECT_TYPES, defaultBlock } from "./effects-model.js";
import { buildChain } from "./effects-audio.js";
import { parsePreset, presetMarkdown } from "./preset.js";
import { getJSON, postJSON } from "../lib/api.js";
import { DEMO_MSG, isDemo } from "../lib/demo.js";

const today = () => new Date().toISOString().slice(0, 10);

const state = {
  chain: [], // [{ type, params }]
  bypass: false,
  playing: false,
  buffer: null, // decoded AudioBuffer of the loaded take
  takeName: "",
  presetName: "",
  presets: [], // [{ name, body }]
};

let root;
let onStatus = () => {};
let source = null; // the playing AudioBufferSourceNode

export function mount(container, { setStatus } = {}) {
  root = container;
  onStatus = setStatus || onStatus;
  loadPresetList();
  render();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// --- rendering ------------------------------------------------------------

function render() {
  const addOptions = EFFECT_TYPES.map(
    (t) => `<option value="${t}">${EFFECTS[t].label}</option>`,
  ).join("");
  const presetOptions = state.presets
    .map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`)
    .join("");

  root.innerHTML = `
    <section class="module-view effects">
      <h2>Effects</h2>
      <p class="muted">Wire up a chain of effects and hear it on one of your takes.
        Load a WAV from the git-ignored <code>audio/</code> dir, audition it live, and
        save the chain as a preset into <code>production/effects/</code> — plain Markdown
        you can read and tweak by hand. Serious mixing still belongs in your DAW.</p>

      <div class="row source-row">
        <label class="file-btn">load take
          <input id="take-file" type="file" accept="audio/*" hidden />
        </label>
        <span class="take-label muted">${state.buffer ? escapeHtml(state.takeName) : "no take loaded"}</span>
        <button id="play-btn" ${state.buffer ? "" : "disabled"}>
          ${state.playing ? "Stop" : "Play"}</button>
        <label class="bypass"><input id="bypass" type="checkbox" ${state.bypass ? "checked" : ""} />
          bypass (A/B)</label>
      </div>

      <div class="rack">
        ${state.chain.length ? state.chain.map(renderBlock).join("") : `<p class="muted">Empty rack — add an effect below.</p>`}
      </div>

      <div class="row add-row">
        <label>add
          <select id="add-effect">${addOptions}</select>
        </label>
        <button id="add-btn">+ add to chain</button>
      </div>

      <div class="preset-bar">
        <div class="row">
          <input id="preset-name" type="text" placeholder="name this chain — e.g. ambient lead"
            value="${escapeHtml(state.presetName)}" />
          <button id="save-preset" ${state.chain.length ? "" : "disabled"}>Save preset</button>
        </div>
        <div class="row">
          <label>load
            <select id="preset-select" ${state.presets.length ? "" : "disabled"}>
              <option value="">${state.presets.length ? "— pick a preset —" : "no presets yet"}</option>
              ${presetOptions}
            </select>
          </label>
        </div>
      </div>
    </section>`;

  wire();
}

function renderBlock(block, i) {
  const def = EFFECTS[block.type];
  const controls = def.params
    .map((p) => {
      const val = block.params[p.key];
      if (p.options) {
        const opts = p.options
          .map((o) => `<option value="${o}" ${o === val ? "selected" : ""}>${o}</option>`)
          .join("");
        return `<label class="param">${p.label}
          <select data-i="${i}" data-key="${p.key}" class="param-enum">${opts}</select></label>`;
      }
      return `<label class="param">${p.label} <span class="pval" data-i="${i}" data-key="${p.key}">${val}</span>
        <input type="range" data-i="${i}" data-key="${p.key}" class="param-num"
          min="${p.min}" max="${p.max}" step="${p.step}" value="${val}" /></label>`;
    })
    .join("");

  return `
    <div class="fx-block" data-i="${i}">
      <div class="fx-head">
        <span class="fx-name">${i + 1}. ${def.label}</span>
        <span class="fx-ops">
          <button class="fx-up" data-i="${i}" ${i === 0 ? "disabled" : ""} title="move up">↑</button>
          <button class="fx-down" data-i="${i}" ${i === state.chain.length - 1 ? "disabled" : ""} title="move down">↓</button>
          <button class="fx-remove" data-i="${i}" title="remove">✕</button>
        </span>
      </div>
      <div class="fx-params">${controls}</div>
    </div>`;
}

// --- wiring ---------------------------------------------------------------

function wire() {
  root.querySelector("#take-file")?.addEventListener("change", onFile);
  root.querySelector("#play-btn")?.addEventListener("click", togglePlay);
  root.querySelector("#bypass")?.addEventListener("change", (e) => {
    state.bypass = e.target.checked;
    onStatus(state.bypass ? "bypassed (dry)" : "chain engaged");
    if (state.playing) rebuildGraph();
  });

  root.querySelector("#add-btn")?.addEventListener("click", () => {
    const type = root.querySelector("#add-effect").value;
    state.chain.push(defaultBlock(type));
    onStatus(`added ${EFFECTS[type].label}`);
    render();
    if (state.playing) rebuildGraph();
  });

  root.querySelectorAll(".fx-remove").forEach((b) =>
    b.addEventListener("click", () => mutateChain(() => state.chain.splice(Number(b.dataset.i), 1))),
  );
  root.querySelectorAll(".fx-up").forEach((b) =>
    b.addEventListener("click", () => mutateChain(() => swap(Number(b.dataset.i), Number(b.dataset.i) - 1))),
  );
  root.querySelectorAll(".fx-down").forEach((b) =>
    b.addEventListener("click", () => mutateChain(() => swap(Number(b.dataset.i), Number(b.dataset.i) + 1))),
  );

  // Params: update the label live (input), rebuild the graph on release (change) so
  // reverb/impulse regeneration doesn't crackle mid-drag.
  root.querySelectorAll(".param-num").forEach((el) => {
    el.addEventListener("input", (e) => {
      const label = root.querySelector(`.pval[data-i="${el.dataset.i}"][data-key="${el.dataset.key}"]`);
      if (label) label.textContent = e.target.value;
    });
    el.addEventListener("change", (e) => setParam(el.dataset.i, el.dataset.key, parseFloat(e.target.value)));
  });
  root.querySelectorAll(".param-enum").forEach((el) =>
    el.addEventListener("change", (e) => setParam(el.dataset.i, el.dataset.key, e.target.value)),
  );

  root.querySelector("#save-preset")?.addEventListener("click", savePreset);
  root.querySelector("#preset-name")?.addEventListener("input", (e) => (state.presetName = e.target.value));
  root.querySelector("#preset-select")?.addEventListener("change", (e) => loadPreset(e.target.value));
}

function swap(a, b) {
  [state.chain[a], state.chain[b]] = [state.chain[b], state.chain[a]];
}

function mutateChain(fn) {
  fn();
  render();
  if (state.playing) rebuildGraph();
}

function setParam(i, key, value) {
  const block = state.chain[Number(i)];
  if (!block) return;
  block.params[key] = value;
  if (state.playing) rebuildGraph();
}

// --- audio ----------------------------------------------------------------

async function onFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  onStatus(`decoding ${file.name}…`);
  try {
    const buf = await file.arrayBuffer();
    state.buffer = await audioContext().decodeAudioData(buf);
    state.takeName = file.name;
    onStatus(`loaded ${file.name} · ${state.buffer.duration.toFixed(1)}s`);
  } catch (err) {
    state.buffer = null;
    onStatus(`couldn't decode that file: ${err.message}`);
  }
  render();
}

function togglePlay() {
  if (state.playing) return stopPlay();
  if (!state.buffer) return;
  const ctx = audioContext();
  source = ctx.createBufferSource();
  source.buffer = state.buffer;
  source.loop = true;
  source.onended = () => { state.playing = false; };
  rebuildGraph();
  source.start();
  state.playing = true;
  onStatus("auditioning — looping the take through the chain");
  render();
}

function stopPlay() {
  if (source) { try { source.stop(); } catch {} source.disconnect(); source = null; }
  state.playing = false;
  onStatus("stopped");
  render();
}

// (Re)wire the source through the current chain (or straight to output when bypassed).
// Called live as blocks/params change so audition tracks edits.
function rebuildGraph() {
  if (!source) return;
  const ctx = audioContext();
  source.disconnect();
  if (state.bypass || !state.chain.length) {
    source.connect(ctx.destination);
    return;
  }
  const { input, output } = buildChain(ctx, state.chain);
  source.connect(input);
  output.connect(ctx.destination);
}

// --- presets --------------------------------------------------------------

async function loadPresetList() {
  try {
    const body = await getJSON("/presets");
    state.presets = body.presets || [];
    render();
  } catch {
    /* no presets yet, or server down — leave the list empty */
  }
}

async function savePreset() {
  if (isDemo()) return onStatus(DEMO_MSG);
  const name = (state.presetName || "").trim();
  if (!name) return onStatus("name the chain before saving");
  const body = presetMarkdown({ name, chain: state.chain, date: today() });
  onStatus(`saving “${name}”…`);
  try {
    const res = await postJSON("/presets", { title: name, body });
    onStatus(`saved → ${res.path}`);
    await loadPresetList();
  } catch (e) {
    onStatus(`save failed: ${e.message}`);
  }
}

function loadPreset(name) {
  if (!name) return;
  const preset = state.presets.find((p) => p.name === name);
  if (!preset) return;
  const { chain } = parsePreset(preset.body);
  state.chain = chain;
  onStatus(`loaded preset “${name}” · ${chain.length} block${chain.length === 1 ? "" : "s"}`);
  render();
  if (state.playing) rebuildGraph();
}
