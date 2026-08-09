// Read-only demo awareness. On the public demo the server refuses writes; the
// client mirrors that so a Save reads as intentional, not broken. The flag is set
// from /health at startup (see app.js). The server 403 is the real guarantee —
// this is just the friendly surface.

let demo = false;

export const DEMO_MSG = "Live demo — changes aren't saved here.";

export function setDemo(on) {
  demo = !!on;
}

export function isDemo() {
  return demo;
}
