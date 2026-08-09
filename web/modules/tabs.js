// The Tabs module — Phase 3. Search an external source (Songsterr) for tablature
// and save a found tab as a Markdown *reference* into the right instrument drawer.
// The network is on the search path only; what we keep is a link-out note, so the
// drawers still work with the server off (PRD §8, principles 1 & 5). The pure
// Markdown rendering lives in tabnote.js.

import { getJSON, postJSON } from "../lib/api.js";
import { DEMO_MSG, isDemo } from "../lib/demo.js";
import { tabMarkdown, tabTitle } from "./tabnote.js";

const today = () => new Date().toISOString().slice(0, 10);

// The instrument drawers a found tab can be filed under (instruments/<name>/tabs/).
const INSTRUMENTS = ["guitar", "bass", "ukulele", "mandolin", "piano", "saxophone"];

const state = {
  query: "",
  instrument: "guitar",
  results: [],
  searching: false,
  error: "",
};

let root;
let onStatus = () => {};

export function mount(container, { setStatus } = {}) {
  root = container;
  onStatus = setStatus || onStatus;
  render();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// --- rendering ------------------------------------------------------------

function render() {
  const options = INSTRUMENTS.map(
    (i) => `<option value="${i}" ${i === state.instrument ? "selected" : ""}>${i}</option>`,
  ).join("");

  root.innerHTML = `
    <section class="module-view tabs">
      <h2>Tabs</h2>
      <p class="muted">Find tablature fast and file it next to the instrument it's for.
        Search runs against <strong>Songsterr</strong>; saving keeps a tidy Markdown
        reference in <code>instruments/&lt;instrument&gt;/tabs/</code> that links out to
        the source — the tab itself lives there, not in your drawer.</p>

      <form id="tab-search" class="row">
        <input id="q" type="search" placeholder="song or artist — e.g. blackbird"
          value="${escapeHtml(state.query)}" autocomplete="off" />
        <label>file under
          <select id="instrument">${options}</select>
        </label>
        <button type="submit" ${state.searching ? "disabled" : ""}>Search</button>
      </form>

      ${renderResults()}
    </section>`;

  wire();
}

function renderResults() {
  if (state.searching) return `<p class="muted">searching…</p>`;
  if (state.error) return `<p class="error">${escapeHtml(state.error)}</p>`;
  if (!state.results.length) {
    return state.query
      ? `<p class="muted">No tabs found for “${escapeHtml(state.query)}”.</p>`
      : "";
  }
  const rows = state.results
    .map((r, i) => {
      const label = tabTitle({ artist: r.artist, title: r.title });
      return `
        <li class="tab-result">
          <span class="tab-name">${escapeHtml(label)}</span>
          <a class="tab-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">open</a>
          <button class="save-tab" data-i="${i}">Save to ${escapeHtml(state.instrument)}</button>
        </li>`;
    })
    .join("");
  return `<ul class="tab-results">${rows}</ul>`;
}

// --- wiring ---------------------------------------------------------------

function wire() {
  root.querySelector("#instrument")?.addEventListener("change", (e) => {
    state.instrument = e.target.value;
    render();
  });
  root.querySelector("#tab-search")?.addEventListener("submit", (e) => {
    e.preventDefault();
    state.query = root.querySelector("#q").value;
    runSearch();
  });
  root.querySelectorAll(".save-tab").forEach((b) =>
    b.addEventListener("click", () => saveTab(Number(b.dataset.i))),
  );
}

async function runSearch() {
  const q = state.query.trim();
  if (!q) return;
  state.searching = true;
  state.error = "";
  onStatus(`searching “${q}”…`);
  render();
  try {
    const body = await getJSON(`/tabs/search?q=${encodeURIComponent(q)}`);
    state.results = body.results || [];
    onStatus(`${state.results.length} result${state.results.length === 1 ? "" : "s"}`);
  } catch (e) {
    state.results = [];
    state.error = `search failed: ${e.message}`;
    onStatus(state.error);
  } finally {
    state.searching = false;
    render();
  }
}

async function saveTab(i) {
  if (isDemo()) return onStatus(DEMO_MSG);
  const r = state.results[i];
  if (!r) return;
  const btn = root.querySelector(`.save-tab[data-i="${i}"]`);
  const title = tabTitle({ artist: r.artist, title: r.title });
  const body = tabMarkdown({
    title: r.title,
    artist: r.artist,
    url: r.url,
    source: r.source,
    instrument: state.instrument,
    date: today(),
  });
  onStatus(`saving “${title}”…`);
  try {
    const res = await postJSON("/tabs", { title, body, instrument: state.instrument });
    onStatus(`saved → ${res.path}`);
    if (btn) {
      btn.textContent = "✓ Saved";
      btn.classList.add("is-saved");
      btn.disabled = true;
    }
  } catch (e) {
    onStatus(`save failed: ${e.message}`);
  }
}
