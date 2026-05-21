// @ts-check
// Webview client: a zoom/pan SVG viewer. The extension host renders the SVG
// and posts it here; this script never parses diagrams itself.
(function () {
  const vscode = acquireVsCodeApi();

  const stage = /** @type {HTMLElement} */ (document.getElementById("stage"));
  const canvas = /** @type {HTMLElement} */ (document.getElementById("canvas"));
  const message = /** @type {HTMLElement} */ (document.getElementById("message"));
  const zoomLabel = /** @type {HTMLElement} */ (document.getElementById("zoom-label"));

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 8;

  let scale = 1;
  let tx = 0;
  let ty = 0;

  const prior = vscode.getState() || {};
  let sourceUri = prior.sourceUri || null;

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function applyTransform() {
    canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  }

  /** Intrinsic (unscaled) size of the rendered SVG. */
  function svgSize() {
    const svg = canvas.querySelector("svg");
    if (!svg) return null;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const w = (vb && vb.width) || parseFloat(svg.getAttribute("width") || "0");
    const h = (vb && vb.height) || parseFloat(svg.getAttribute("height") || "0");
    if (!w || !h) return null;
    return { w, h };
  }

  function fit() {
    const size = svgSize();
    if (!size) return;
    const cw = stage.clientWidth;
    const ch = stage.clientHeight;
    const pad = 32;
    scale = clamp(Math.min((cw - pad) / size.w, (ch - pad) / size.h), MIN_SCALE, MAX_SCALE);
    tx = (cw - size.w * scale) / 2;
    ty = (ch - size.h * scale) / 2;
    applyTransform();
  }

  function resetView() {
    scale = 1;
    const size = svgSize();
    const cw = stage.clientWidth;
    const ch = stage.clientHeight;
    tx = size ? Math.max(0, (cw - size.w) / 2) : 0;
    ty = size ? Math.max(0, (ch - size.h) / 2) : 0;
    applyTransform();
  }

  function zoomAt(px, py, factor) {
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    const k = next / scale;
    tx = px - k * (px - tx);
    ty = py - k * (py - ty);
    scale = next;
    applyTransform();
  }

  let hasRendered = false;

  function showSvg(svg) {
    message.hidden = true;            // clear any stale error banner
    canvas.hidden = false;
    // Strip the XML prolog — it is invalid inside HTML innerHTML.
    canvas.innerHTML = String(svg).replace(/^<\?xml[^>]*\?>\s*/, "");
    // Auto-fit only the first time; afterwards keep the user's zoom/pan so
    // live edits don't yank the view back on every keystroke.
    if (!hasRendered) { fit(); hasRendered = true; }
  }

  function showError(title, detail) {
    // Keep the last good diagram on screen; surface the error as a banner so
    // a transient typo while typing doesn't blank the preview.
    message.hidden = false;
    const t = message.querySelector(".msg-title");
    const d = message.querySelector(".msg-detail");
    if (t) t.textContent = title || "Could not render the diagram";
    if (d) d.textContent = detail || "";
  }

  // ── Toolbar ──────────────────────────────────────────────────────────
  const toolbar = document.getElementById("toolbar");
  if (toolbar) {
    toolbar.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      const btn = target.closest("button");
      if (!btn) return;
      const cx = stage.clientWidth / 2;
      const cy = stage.clientHeight / 2;
      switch (btn.getAttribute("data-cmd")) {
        case "zoom-in": zoomAt(cx, cy, 1.2); break;
        case "zoom-out": zoomAt(cx, cy, 1 / 1.2); break;
        case "zoom-reset": resetView(); break;
        case "fit": fit(); break;
        case "export": vscode.postMessage({ type: "export" }); break;
      }
    });
  }

  // ── Wheel zoom (toward cursor) ───────────────────────────────────────
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    },
    { passive: false },
  );

  // ── Drag to pan ──────────────────────────────────────────────────────
  let panning = false;
  let lastX = 0;
  let lastY = 0;
  stage.addEventListener("pointerdown", (e) => {
    panning = true;
    lastX = e.clientX;
    lastY = e.clientY;
    stage.classList.add("panning");
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!panning) return;
    tx += e.clientX - lastX;
    ty += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    applyTransform();
  });
  const endPan = (e) => {
    if (!panning) return;
    panning = false;
    stage.classList.remove("panning");
    try { stage.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  };
  stage.addEventListener("pointerup", endPan);
  stage.addEventListener("pointercancel", endPan);

  window.addEventListener("resize", () => {
    if (canvas.querySelector("svg")) fit();
  });

  // ── Messages from the extension host ─────────────────────────────────
  window.addEventListener("message", (event) => {
    const msg = event.data || {};
    if (msg.sourceUri && msg.sourceUri !== sourceUri) {
      sourceUri = msg.sourceUri;
      vscode.setState({ sourceUri });
    }
    if (msg.type === "render") showSvg(msg.svg);
    else if (msg.type === "error") showError(msg.title, msg.detail);
  });

  // Tell the host we are ready for the first render.
  vscode.postMessage({ type: "ready" });
})();
