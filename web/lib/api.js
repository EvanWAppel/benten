// A small fetch wrapper for the backend JSON API. Throws on non-2xx so callers
// can try/catch instead of checking res.ok everywhere.

export async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`);
  return res.json();
}

// POST a raw binary body (e.g. a WAV blob) with query params. Used for audio takes,
// which don't fit JSON — the bytes go in the body, the name/ext in the query.
export async function postBlob(url, blob, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(qs ? `${url}?${qs}` : url, {
    method: "POST",
    headers: { "Content-Type": blob.type || "application/octet-stream" },
    body: blob,
  });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`);
  return res.json();
}
