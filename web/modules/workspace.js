// Shared editorial heading. All copy is static, authored here rather than user input.
const pages = {
  studio: ["02 / Capture a moment", "Before it slips away.", "Press record.", "Catch a take, loop it, and play something new over it."],
  tabs: ["03 / The songbook", "Learn it by heart.", "Play it your way.", "Find a song on Songsterr. Keep a reference in your instrument drawer."],
  effects: ["04 / Shape your sound", "A familiar sound.", "An unfamiliar place.", "Load a take, build an effect chain, and follow your ears."],
};

export function pageHeading(page) {
  const [eyebrow, title, subtitle, intro] = pages[page];
  return `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h2>${title}<br><em>${subtitle}</em></h2><p class="page-intro">${intro}</p></div><div class="harmony-art" aria-hidden="true"><span></span><span></span><span></span><span></span><i></i><b>THE ART OF RESONANCE</b></div></header>`;
}
