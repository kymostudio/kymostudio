/**
 * Webview behaviour tests for the diagram preview client (`media/preview.js`)
 * and its stylesheet (`media/preview.css`).
 *
 * Regression coverage for the "stuck error banner" bug:
 *   1. An ID selector (`#message { display: flex }`) used to out-rank the
 *      `hidden` attribute, so the error banner could never be cleared and
 *      overlapped the diagram. The CSS must force `[hidden]` to win.
 *   2. A transient parse error must NOT blank the canvas — the last good render
 *      stays visible while the banner reports the problem, and the banner clears
 *      on the next successful render.
 *
 * The real `media/preview.js` is loaded into a jsdom window (with a stubbed
 * `acquireVsCodeApi`) and driven through `postMessage` events, so the shipped
 * artifact is exercised directly. `node --test` runs this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const mediaDir = join(dirname(fileURLToPath(import.meta.url)), "..", "media");
const CSS = readFileSync(join(mediaDir, "preview.css"), "utf8");
const JS = readFileSync(join(mediaDir, "preview.js"), "utf8");

const SVG_A = '<svg width="100" height="80" viewBox="0 0 100 80"><rect id="a"/></svg>';
const SVG_B = '<svg width="120" height="90" viewBox="0 0 120 90"><rect id="b"/></svg>';

/** Boot a jsdom window with the preview HTML skeleton, inject the real CSS,
 *  stub the VS Code webview API, and run the real preview.js. */
function boot() {
  const html = `<!DOCTYPE html><html><head><style>${CSS}</style></head><body>
    <div id="toolbar">
      <button data-cmd="zoom-out">-</button>
      <button data-cmd="zoom-reset" id="zoom-label">100%</button>
      <button data-cmd="zoom-in">+</button>
      <button data-cmd="fit">Fit</button>
      <span class="spacer"></span>
      <button data-cmd="export">Export SVG</button>
    </div>
    <div id="stage"><div id="canvas"></div></div>
    <div id="message" hidden><div class="msg-title"></div><pre class="msg-detail"></pre></div>
  </body></html>`;

  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  const posted = [];
  let state;
  window.acquireVsCodeApi = () => ({
    postMessage: (m) => posted.push(m),
    getState: () => state,
    setState: (s) => { state = s; },
  });
  window.eval(JS);

  const $ = (id) => window.document.getElementById(id);
  const send = (data) =>
    window.dispatchEvent(new window.MessageEvent("message", { data }));
  return { window, posted, $, send };
}

// ── CSS regression guard (deterministic, no cascade engine needed) ─────
test("CSS forces [hidden] to win so panels can actually be hidden", () => {
  const norm = CSS.replace(/\s+/g, " ");
  assert.match(
    norm,
    /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/i,
    "preview.css must force `[hidden] { display: none !important }` — otherwise an " +
      "ID selector setting `display` re-introduces the stuck-banner bug",
  );
});

// ── Webview client behaviour ───────────────────────────────────────────
test("posts a ready handshake on load", () => {
  const { posted } = boot();
  assert.ok(posted.some((m) => m.type === "ready"), "expected a {type:'ready'} message");
});

test("render injects the SVG and keeps the error banner hidden", () => {
  const { $, send } = boot();
  send({ type: "render", svg: SVG_A, sourceUri: "file:///x.kymo" });
  assert.match($("canvas").innerHTML, /<svg/, "canvas should hold the rendered SVG");
  assert.match($("canvas").innerHTML, /id="a"/);
  assert.equal($("message").hidden, true, "no error → banner hidden");
});

test("render strips the XML prolog before injecting", () => {
  const { $, send } = boot();
  send({ type: "render", svg: `<?xml version="1.0"?>\n${SVG_A}`, sourceUri: "file:///x.kymo" });
  assert.ok(!$("canvas").innerHTML.trimStart().startsWith("<?xml"), "prolog must be stripped");
  assert.match($("canvas").innerHTML, /<svg/);
});

test("a transient error keeps the last good render and shows a banner", () => {
  const { $, send } = boot();
  send({ type: "render", svg: SVG_A, sourceUri: "file:///x.kymo" });
  send({ type: "error", title: "line 12: unrecognised — \"orch\"", detail: "fix the syntax", sourceUri: "file:///x.kymo" });

  // The fix: the diagram is NOT blanked while you correct a typo.
  assert.match($("canvas").innerHTML, /id="a"/, "last good render must remain on screen");
  assert.equal($("message").hidden, false, "error banner must be visible");
  assert.equal($("message").querySelector(".msg-title").textContent, 'line 12: unrecognised — "orch"');
  assert.equal($("message").querySelector(".msg-detail").textContent, "fix the syntax");
});

test("a successful render clears a previously shown error banner", () => {
  const { $, send } = boot();
  send({ type: "render", svg: SVG_A, sourceUri: "file:///x.kymo" });
  send({ type: "error", title: "oops", detail: "bad", sourceUri: "file:///x.kymo" });
  assert.equal($("message").hidden, false);

  // The core bug: the banner used to get stuck. It must clear on the next render.
  send({ type: "render", svg: SVG_B, sourceUri: "file:///x.kymo" });
  assert.equal($("message").hidden, true, "banner must clear once the diagram renders again");
  assert.match($("canvas").innerHTML, /id="b"/, "canvas updates to the new render");
});

test("live re-renders preserve the user's zoom/pan (fit runs once)", () => {
  const { $, send } = boot();
  send({ type: "render", svg: SVG_A, sourceUri: "file:///x.kymo" });
  // Simulate the user zooming/panning after the first auto-fit.
  $("canvas").style.transform = "translate(13px, 17px) scale(2)";
  send({ type: "render", svg: SVG_B, sourceUri: "file:///x.kymo" });
  assert.equal(
    $("canvas").style.transform,
    "translate(13px, 17px) scale(2)",
    "subsequent renders must not re-fit and reset the view",
  );
});

test("persists the source URI into webview state for restore", () => {
  const { window, send } = boot();
  send({ type: "render", svg: SVG_A, sourceUri: "file:///demo/hello.kymo" });
  // acquireVsCodeApi().getState() is stubbed via the closure; re-acquire to read it.
  const state = window.acquireVsCodeApi().getState();
  assert.equal(state && state.sourceUri, "file:///demo/hello.kymo");
});
