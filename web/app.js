// benten front-end — no build step, plain ES modules.
// Group A: the shell wiring only. The Chords module (entry, suggestions,
// fretboard, save) arrives in Groups C–G.

const view = document.getElementById("view");
const status = document.getElementById("status");

async function checkHealth() {
  try {
    const res = await fetch("/health");
    const body = await res.json();
    status.textContent = `${body.app} v${body.version} · ${body.status}`;
  } catch (err) {
    status.textContent = "server unreachable";
  }
}

function renderChordsPlaceholder() {
  view.innerHTML = `
    <section class="module-view">
      <h2>Chords &amp; scales</h2>
      <p class="muted">
        Enter a progression, get the scales to play over it, see them on the neck,
        and save it to <code>composition/</code>. Coming in Groups C&ndash;G.
      </p>
    </section>`;
}

const modules = document.querySelectorAll(".module");
modules.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    modules.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    // Only Chords is real for now.
    if (btn.dataset.module === "chords") renderChordsPlaceholder();
  });
});

renderChordsPlaceholder();
checkHealth();
