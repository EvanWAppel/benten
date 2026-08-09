// benten front-end — no build step, plain ES modules.
// The shell: health line + module nav. Chords is the only live module (MVP).

import { getJSON } from "./lib/api.js";
import { setDemo } from "./lib/demo.js";
import { mount as mountChords } from "./modules/chords.js";
import { mount as mountStudio } from "./modules/studio.js";
import { mount as mountTabs } from "./modules/tabs.js";
import { mount as mountEffects } from "./modules/effects.js";

const view = document.getElementById("view");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function checkHealth() {
  try {
    const body = await getJSON("/health");
    setStatus(`${body.app} v${body.version} · ${body.status}`);
    if (body.demo) {
      setDemo(true);
      showDemoBanner();
    }
  } catch {
    setStatus("server unreachable");
  }
}

// A single, quiet banner for the public read-only demo — everything works, but
// nothing is written back to the drawers.
function showDemoBanner() {
  if (document.querySelector(".demo-banner")) return;
  const bar = document.createElement("div");
  bar.className = "demo-banner";
  bar.innerHTML =
    "🎧 <strong>Live demo.</strong> Play, record, build a chain, search tabs — it all works. " +
    "Saving is off, so nothing is written back. Built by Evan Appel · " +
    '<a href="https://github.com/EvanWAppel/benten" target="_blank" rel="noopener">source</a>.';
  document.body.insertBefore(bar, document.body.firstChild);
}

const modules = document.querySelectorAll(".module");
modules.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    modules.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    if (btn.dataset.module === "chords") mountChords(view, { setStatus });
    else if (btn.dataset.module === "studio") mountStudio(view, { setStatus });
    else if (btn.dataset.module === "tabs") mountTabs(view, { setStatus });
    else if (btn.dataset.module === "effects") mountEffects(view, { setStatus });
  });
});

mountChords(view, { setStatus });
checkHealth();
