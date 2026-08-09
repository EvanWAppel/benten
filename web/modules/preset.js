// Effect-chain presets as clean, hand-editable Markdown — the artifact that lands
// in production/effects/. The param table is the source of truth: a human can read
// and edit it, and parsePreset reads it straight back into a chain. Pure, so it's
// node-testable, and round-trip safe: parsePreset(presetMarkdown(x)) preserves x.

import { EFFECTS, clampParams, isEffectType, normalizeChain } from "./effects-model.js";

function paramString(type, params) {
  // Serialize in the schema's declared order so output is deterministic.
  return EFFECTS[type].params.map((p) => `${p.key}=${params[p.key]}`).join(", ");
}

function chainSummary(chain) {
  return chain.map((b) => EFFECTS[b.type].label).join(" → ") || "—";
}

export function presetMarkdown({ name, chain, date } = {}) {
  const title = (name || "").trim() || "Untitled chain";
  const blocks = normalizeChain(chain);

  const lines = [];
  lines.push(`# ${title} — effect chain`);
  lines.push("");
  if (date) lines.push(`- **saved:** ${date}`);
  lines.push(`- **chain:** ${chainSummary(blocks)}`);
  lines.push("");
  lines.push("| # | effect | params |");
  lines.push("|---|--------|--------|");
  if (!blocks.length) {
    lines.push("| — | _(empty)_ | — |");
  } else {
    blocks.forEach((b, i) => {
      lines.push(`| ${i + 1} | ${b.type} | ${paramString(b.type, b.params)} |`);
    });
  }
  lines.push("");
  lines.push("---");
  lines.push("Filed in [`production/`](.) · built with **benten**.");
  lines.push("");
  return lines.join("\n");
}

function parseParams(type, cell) {
  const params = {};
  for (const pair of cell.split(",")) {
    const [k, ...rest] = pair.split("=");
    if (!rest.length) continue;
    params[k.trim()] = rest.join("=").trim();
  }
  return clampParams(type, params); // coerces strings→numbers, fills defaults
}

// Read a chain back out of a preset's Markdown table. Rows whose effect column
// isn't a known type (headers, separators, the empty marker) are skipped.
export function parsePreset(md) {
  const text = String(md || "");
  const nameMatch = text.match(/^#\s+(.*?)\s+—\s+effect chain\s*$/m);
  const name = nameMatch ? nameMatch[1].trim() : "";

  const chain = [];
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cols = line.split("|").map((c) => c.trim());
    // cols[0] is empty (leading pipe); [1]=#, [2]=effect, [3]=params
    const type = (cols[2] || "").toLowerCase();
    if (!isEffectType(type)) continue;
    chain.push({ type, params: parseParams(type, cols[3] || "") });
  }
  return { name, chain };
}
