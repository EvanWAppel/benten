// benten front-end — no build step, plain ES modules.
// The shell: health line + module nav. Chords is the only live module (MVP).

import { getJSON } from "./lib/api.js";
import { mount as mountChords } from "./modules/chords.js";

const view = document.getElementById("view");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function checkHealth() {
  try {
    const body = await getJSON("/health");
    setStatus(`${body.app} v${body.version} · ${body.status}`);
  } catch {
    setStatus("server unreachable");
  }
}

const modules = document.querySelectorAll(".module");
modules.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    modules.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    if (btn.dataset.module === "chords") mountChords(view, { setStatus });
  });
});

mountChords(view, { setStatus });
checkHealth();
