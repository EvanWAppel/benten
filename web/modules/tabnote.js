// Render a found tab as a clean, hand-editable Markdown *reference* — the note that
// lands in instruments/<instrument>/tabs/. We link out to the source; the tab
// content itself lives there, not here (PRD §8: surface and link, don't scrape).
// Pure, so it's node-testable.

export function tabTitle({ artist, title } = {}) {
  const a = (artist || "").trim();
  const t = (title || "").trim() || "Untitled tab";
  return a ? `${a} — ${t}` : t;
}

export function tabMarkdown({ title, artist, url, source, note, date, instrument } = {}) {
  const lines = [];
  lines.push(`# ${tabTitle({ artist, title })}`);
  lines.push("");
  if (instrument) lines.push(`- **instrument:** ${instrument}`);
  if (date) lines.push(`- **saved:** ${date}`);
  if (url) lines.push(`- **tab:** [${source || "source"}](${url})`);
  lines.push("");
  if (note && note.trim()) {
    lines.push(note.trim());
    lines.push("");
  }
  lines.push("---");
  lines.push(
    "Filed in [`instruments/`](.) · found with **benten**. The tab lives at the linked source."
  );
  lines.push("");
  return lines.join("\n");
}
