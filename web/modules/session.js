// Render a Studio session as clean, hand-editable Markdown — the note that lands
// in recording/sessions/ — and a one-line riff capture for riffs/. Audio is
// referenced by repo-relative path (never linked into the git-ignored working
// dir with a brittle relative path). Pure, so both are node-testable.

export function sessionMarkdown({ title, date, takes, notes } = {}) {
  const name = (title || "").trim() || "Studio session";
  const list = takes || [];
  const lines = [];
  lines.push(`# ${name}`);
  lines.push("");
  if (date) lines.push(`- **date:** ${date}`);
  lines.push(`- **takes:** ${list.length}`);
  lines.push("");
  if (notes && notes.trim()) {
    lines.push(notes.trim());
    lines.push("");
  }
  lines.push("## Takes");
  lines.push("");
  if (!list.length) {
    lines.push("_(no takes captured)_");
  } else {
    lines.push("| # | role | name | length | file |");
    lines.push("|---|---|---|---|---|");
    list.forEach((t, i) => {
      const file = t.savedPath ? `\`${t.savedPath}\`` : "_(unsaved)_";
      const len = t.duration != null ? `${t.duration.toFixed(1)}s` : "—";
      lines.push(`| ${i + 1} | ${t.role || "—"} | ${t.name || "—"} | ${len} | ${file} |`);
    });
  }
  lines.push("");
  lines.push("---");
  lines.push("Filed in [`recording/sessions/`](.) · captured with **benten**.");
  lines.push("");
  return lines.join("\n");
}

export function riffMarkdown({ name, path, note, date } = {}) {
  const title = (name || "").trim() || "Captured riff";
  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  if (date) lines.push(`- **captured:** ${date}`);
  if (path) lines.push(`- **take:** \`${path}\``);
  lines.push("");
  if (note && note.trim()) {
    lines.push(note.trim());
    lines.push("");
  }
  lines.push("---");
  lines.push("Filed in [`riffs/`](.) · captured with **benten**.");
  lines.push("");
  return lines.join("\n");
}
