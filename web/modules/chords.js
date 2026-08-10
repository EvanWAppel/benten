// The Chords module — Group D: entering a progression.
// Suggestions (Group E), fretboard (Group F), and save (Group G) come next.

import { Key, Chord } from "../vendor/tonal.js";
import { analyzeProgression } from "./theory.js";
import { patternsFor, chordsForPattern } from "./patterns.js";
import { fretboardSVG } from "./fretboard.js";
import { progressionMarkdown } from "./compose.js";
import { postJSON } from "../lib/api.js";
import { playChord, ProgressionPlayer } from "./audio.js";

const TONICS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const state = {
  tonic: "C",
  mode: "major", // "major" | "minor"
  progression: [], // chord symbols, in order
  active: null, // { scale, chordSymbol } currently shown on the fretboard
  // practice-loop settings
  tempo: 90,
  beatsPerBar: 4,
  barsPerChord: 1,
  countIn: true,
  metronome: true,
};

let root;
let onStatus = () => {};
let player = null; // the running ProgressionPlayer, if any (survives re-renders)

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

      <div class="patterns" id="patterns">
        <span class="patterns-label muted">patterns</span>
        ${patternsFor(state.mode)
          .map((p) => {
            const chords = chordsForPattern(p.id, state.tonic, state.mode);
            return `<button class="chip pattern" data-pattern="${p.id}"
                            title="${p.note} — ${chords.join(" · ")}">${p.name}</button>`;
          })
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

      ${state.progression.length ? renderPractice() : ""}
      ${state.progression.length ? renderSuggestions() : ""}
      ${state.progression.length ? renderSave() : ""}
    </section>`;

  wire();
}

function renderPractice() {
  const playing = !!player;
  return `
    <div class="practice">
      <div class="row transport">
        <button id="play-btn" type="button" class="${playing ? "is-playing" : ""}">
          ${playing ? "◼ stop" : "▶ play loop"}
        </button>
        <label>tempo
          <input id="tempo" type="number" min="40" max="240" step="1" value="${state.tempo}" /> bpm
        </label>
        <label>feel
          <select id="beats">
            <option value="4" ${state.beatsPerBar === 4 ? "selected" : ""}>4/4</option>
            <option value="3" ${state.beatsPerBar === 3 ? "selected" : ""}>3/4</option>
            <option value="6" ${state.beatsPerBar === 6 ? "selected" : ""}>6/8</option>
          </select>
        </label>
        <label>bars/chord
          <input id="bars" type="number" min="1" max="8" step="1" value="${state.barsPerChord}" />
        </label>
        <label class="check"><input id="countin" type="checkbox" ${state.countIn ? "checked" : ""}/> count-in</label>
        <label class="check"><input id="metro" type="checkbox" ${state.metronome ? "checked" : ""}/> metronome</label>
      </div>
    </div>`;
}

function renderSave() {
  return `
    <div class="save-row row">
      <input id="title" type="text" autocomplete="off"
             placeholder="name this progression (optional)" />
      <button id="save-btn" type="button">save to composition/</button>
    </div>`;
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
        ${isValid(sym) ? `<button data-hear="${sym}" aria-label="hear chord">♪</button>` : ""}
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

  root.querySelectorAll("[data-pattern]").forEach((b) =>
    b.addEventListener("click", () => applyPattern(b.dataset.pattern)),
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

  root.querySelector("#save-btn")?.addEventListener("click", saveProgression);

  // click-to-hear on a progression chip
  root.querySelectorAll("[data-hear]").forEach((b) =>
    b.addEventListener("click", () => playChord(b.dataset.hear)),
  );

  // practice-loop transport
  root.querySelector("#play-btn")?.addEventListener("click", togglePlay);
  root.querySelector("#tempo")?.addEventListener("change", (e) => {
    state.tempo = clampInt(e.target.value, 40, 240, 90);
  });
  root.querySelector("#beats")?.addEventListener("change", (e) => {
    state.beatsPerBar = Number(e.target.value);
  });
  root.querySelector("#bars")?.addEventListener("change", (e) => {
    state.barsPerChord = clampInt(e.target.value, 1, 8, 1);
  });
  root.querySelector("#countin")?.addEventListener("change", (e) => {
    state.countIn = e.target.checked;
  });
  root.querySelector("#metro")?.addEventListener("change", (e) => {
    state.metronome = e.target.checked;
  });
}

function clampInt(v, lo, hi, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function highlightPlaying(idx) {
  root.querySelectorAll(".chip.prog").forEach((el, i) =>
    el.classList.toggle("is-playing", i === idx),
  );
}

function togglePlay() {
  if (player) {
    player.stop();
    return;
  }
  player = new ProgressionPlayer({
    progression: [...state.progression],
    tempo: state.tempo,
    beatsPerBar: state.beatsPerBar,
    barsPerChord: state.barsPerChord,
    countIn: state.countIn,
    metronome: state.metronome,
    onChord: (idx) => highlightPlaying(idx),
    onStop: () => {
      player = null;
      highlightPlaying(-1);
      onStatus("stopped");
      render();
    },
  });
  player.start();
  onStatus("looping — solo over it");
  render();
}

async function saveProgression() {
  const title = root.querySelector("#title")?.value.trim() || "Untitled progression";
  const body = progressionMarkdown({
    title,
    tonic: state.tonic,
    mode: state.mode,
    progression: state.progression,
    date: new Date().toISOString().slice(0, 10),
  });
  onStatus("saving…");
  try {
    const res = await postJSON("/compositions", { title, body });
    onStatus(`saved → ${res.path}`);
  } catch (e) {
    onStatus(`save failed: ${e.message}`);
  }
}

// Fill the progression from a named pattern, expanded for the current key + mode.
// This replaces whatever's there — a pattern is a whole progression, not an add.
function applyPattern(id) {
  const chords = chordsForPattern(id, state.tonic, state.mode);
  if (!chords.length) return;
  state.progression = chords;
  state.active = null; // the old fretboard pick no longer belongs to this progression
  const pattern = patternsFor(state.mode).find((p) => p.id === id);
  onStatus(`loaded ${pattern.name} — ${chords.join(" · ")}`);
  render();
}

function addChord(symbol) {
  state.progression.push(symbol);
  if (isValid(symbol)) {
    onStatus(`added ${symbol}`);
    playChord(symbol); // click-to-hear feedback
  } else {
    onStatus(`added "${symbol}" — flagged, unrecognized`);
  }
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
