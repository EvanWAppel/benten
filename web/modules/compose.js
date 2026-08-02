// Render a progression + its scale analysis as clean, hand-editable Markdown —
// the artifact that lands in composition/. Pure, so it's unit-testable.

import { analyzeProgression } from "./theory.js";

export function progressionMarkdown({ title, tonic, mode, progression, date } = {}) {
  const name = (title || "").trim() || "Untitled progression";
  const a = analyzeProgression(progression || [], tonic, mode);

  const lines = [];
  lines.push(`# ${name}`);
  lines.push("");
  lines.push(`- **key:** ${tonic} ${mode}`);
  lines.push(`- **progression:** ${(progression || []).join(" · ") || "—"}`);
  if (date) lines.push(`- **captured:** ${date}`);
  lines.push("");
  lines.push("## Scales to play over it");
  lines.push("");
  lines.push(
    a.allDiatonic
      ? `Parent scale: **${a.parent}** — covers the whole progression.`
      : `Parent scale: **${a.parent}**. Outside the key: ${a.outside.join(", ") || "—"}.`,
  );
  lines.push("");
  lines.push("| chord | scales | in key |");
  lines.push("|---|---|---|");
  for (const c of a.perChord) {
    if (!c.valid) {
      lines.push(`| ${c.symbol} | _(unrecognized)_ | — |`);
    } else {
      lines.push(`| ${c.symbol} | ${c.scales.join(", ")} | ${c.inKey ? "yes" : "no"} |`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("Filed in [`composition/`](.) · captured with **benten**.");
  lines.push("");
  return lines.join("\n");
}
