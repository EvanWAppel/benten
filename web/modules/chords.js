// The Chords module — Group D: entering a progression.
// Suggestions (Group E), fretboard (Group F), and save (Group G) come next.

import { Key, Chord } from "../vendor/tonal.js";
import { analyzeProgression } from "./theory.js";
import { fretboardSVG } from "./fretboard.js";

const TONICS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const state = {
  tonic: "C",
  mode: "major", // "major" | "minor"
  progression: [], // chord symbols, in order
  active: null, // { scale, chordSymbol } currently shown on the fretboard
};

let root;
let onStatus = () => {};

export function mount(container, { setStatus } = {}) {
  root = container;
  onStatus = setStatus || onStatus;
  render();
}

// --- theory helpers -------------------------------------------------------

function paletteChords() {
  return state.mode === "major"
    ? Key.majorKey(state.tonic).triads
    : Key.minorKey(state.tonic).natural.triads;
}

function isValid(symbol) {
  return !Chord.get(symbol).empty;
}

// --- rendering ------------------------------------------------------------

function render() {
  root.innerHTML = `
    <section class="module-view chords">
      <h2>Chords &amp; scales</h2>

      <div class="row key-row">
        <label>Key
          <select id="tonic">
            ${TONICS.map((t) => `<option ${t === state.tonic ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </label>
        <select id="mode" aria-label="mode">
          <option value="major" ${state.mode === "major" ? "selected" : ""}>major</option>
          <option value="minor" ${state.mode === "minor" ? "selected" : ""}>minor</option>
        </select>
      </div>

      <div class="palette" id="palette">
        ${paletteChords()
          .map((c) => `<button class="chip add" data-add="${c}">${c}</button>`)
          .join("")}
      </div>

      <form class="row" id="free-form">
        <input id="free" type="text" autocomplete="off"
               placeholder="type a chord — Am7, D9, Cmaj7…" />
        <button type="submit">add</button>
      </form>

      <h3>Progression</h3>
      <ol class="progression" id="progression">
        ${
          state.progression.length === 0
            ? `<li class="empty muted">empty — click the palette or type a chord</li>`
            : state.progression.map(chordChip).join("")
        }
      </ol>

      ${state.progression.length ? renderSuggestions() : ""}
    </section>`;

  wire();
}

function renderSuggestions() {
  const a = analyzeProgression(state.progression, state.tonic, state.mode);
  const summary = a.allDiatonic
    ? `Parent scale: <strong>${a.parent}</strong> — covers the whole progression.`
    : `Parent scale: <strong>${a.parent}</strong>. Outside the key: ` +
      (a.outside.length
        ? a.outside.map((s) => `<span class="out">${s}</span>`).join(", ")
        : "—") +
      ".";

  const rows = a.perChord
    .filter((c) => c.valid)
    .map(
      (c) => `
      <li>
        <span class="sym">${c.symbol}</span>
        <span class="arrow">→</span>
        <span class="scales">
          ${c.scales
            .map(
              (sc) =>
                `<button class="scale-pick ${isActive(sc, c.symbol) ? "is-active" : ""}"
                         data-scale="${sc}" data-chord="${c.symbol}">${sc}</button>`,
            )
            .join(" ")}
        </span>
        ${c.inKey ? "" : `<span class="tag">outside</span>`}
      </li>`,
    )
    .join("");

  return `
    <h3>Scales to play over it</h3>
    <p class="summary muted">${summary}</p>
    <ul class="suggestions">${rows || `<li class="muted">no recognized chords yet</li>`}</ul>
    ${renderFretboard()}`;
}

function isActive(scale, chordSymbol) {
  return state.active && state.active.scale === scale && state.active.chordSymbol === chordSymbol;
}

function renderFretboard() {
  if (!state.active) {
    return `<p class="muted hint">Pick a scale above to see it on the fretboard.</p>`;
  }
  const { scale, chordSymbol } = state.active;
  return `
    <div class="fretboard-wrap">
      <h4>${chordSymbol} · ${scale} <span class="on-guitar muted">on guitar</span></h4>
      ${fretboardSVG({ scale, chordSymbol })}
      <p class="legend muted">
        <span class="key-dot fb-root"></span> root
        <span class="key-dot fb-chord"></span> chord tone
        <span class="key-dot fb-scale"></span> scale note
      </p>
    </div>`;
}

function chordChip(sym, i) {
  const invalid = isValid(sym) ? "" : "is-invalid";
  const title = isValid(sym) ? "" : 'title="unrecognized chord"';
  return `
    <li class="chip prog ${invalid}" ${title}>
      <span class="sym">${sym}</span>
      <span class="ops">
        <button data-move="${i}" data-dir="-1" aria-label="move left">‹</button>
        <button data-move="${i}" data-dir="1" aria-label="move right">›</button>
        <button data-remove="${i}" aria-label="remove">×</button>
      </span>
    </li>`;
}

// --- events ---------------------------------------------------------------

function wire() {
  root.querySelector("#tonic").addEventListener("change", (e) => {
    state.tonic = e.target.value;
    render();
  });
  root.querySelector("#mode").addEventListener("change", (e) => {
    state.mode = e.target.value;
    render();
  });

  root.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", () => addChord(b.dataset.add)),
  );

  root.querySelector("#free-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = root.querySelector("#free").value.trim();
    if (val) addChord(val); // re-renders, replacing the input element
    // Focus the *fresh* input (the old one is now detached); it renders empty.
    root.querySelector("#free")?.focus();
  });

  root.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      state.progression.splice(Number(b.dataset.remove), 1);
      render();
    }),
  );

  root.querySelectorAll("[data-move]").forEach((b) =>
    b.addEventListener("click", () =>
      move(Number(b.dataset.move), Number(b.dataset.dir)),
    ),
  );

  root.querySelectorAll("[data-scale]").forEach((b) =>
    b.addEventListener("click", () => {
      const next = { scale: b.dataset.scale, chordSymbol: b.dataset.chord };
      // Clicking the active scale again toggles it off.
      state.active = isActive(next.scale, next.chordSymbol) ? null : next;
      render();
    }),
  );
}

function addChord(symbol) {
  state.progression.push(symbol);
  onStatus(isValid(symbol) ? `added ${symbol}` : `added "${symbol}" — flagged, unrecognized`);
  render();
}

function move(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= state.progression.length) return;
  const p = state.progression;
  [p[i], p[j]] = [p[j], p[i]];
  render();
}

// Exposed for future modules/tests.
export const _internals = { state, paletteChords, isValid };
