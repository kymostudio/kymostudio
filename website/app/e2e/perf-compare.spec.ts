/**
 * @perf — Playwright performance COMPARISON: in-house engine vs tldraw, same
 * machine, same diagram, same scenarios. Manual/local bench (tagged `@perf`,
 * excluded from the CI guard run via `--grep-invert @perf`).
 *
 * Uses REAL Playwright input (trusted events) so tldraw's input system actually
 * pans/zooms — synthetic dispatch would be ignored and make tldraw look falsely
 * idle. An in-page rAF sampler counts frames while the gesture runs; a
 * "moved?" signature check per renderer makes the numbers self-validating.
 *
 * IMPORTANT: Playwright runs headless Chromium (SwiftShader software GL — no
 * GPU), so absolute FPS is NOT real-hardware and the `will-change` composite win
 * does not show. Treat as a RELATIVE comparison under identical conditions. The
 * deterministic signals are mount time and the engine's pan render-count (0).
 * Nothing here asserts FPS.
 */
import { test, type Page } from "@playwright/test";

interface Metrics {
  mountMs: number;
  pan: { fps: number; worstMs: number; moved: boolean };
  zoom: { fps: number; worstMs: number; moved: boolean };
  panShapeRenders: number | null; // engine only (tldraw is a black box)
}

/** Start an in-page rAF frame counter. */
const startSampler = (page: Page) =>
  page.evaluate(() => {
    const w = window as Record<string, number | boolean>;
    w.__fpsFrames = 0;
    w.__fpsWorst = 0;
    w.__fpsLast = performance.now();
    w.__fpsStart = performance.now();
    w.__fpsRun = true;
    w.__fpsFirst = true;
    const loop = (now: number) => {
      if (!w.__fpsRun) return;
      const gap = now - (w.__fpsLast as number);
      w.__fpsLast = now;
      if (!w.__fpsFirst) w.__fpsWorst = Math.max(w.__fpsWorst as number, gap);
      w.__fpsFirst = false;
      (w.__fpsFrames as number) = (w.__fpsFrames as number) + 1;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

/** Stop the sampler and return avg fps + worst frame. */
const stopSampler = (page: Page) =>
  page.evaluate(() => {
    const w = window as Record<string, number | boolean>;
    w.__fpsRun = false;
    const elapsed = (performance.now() - (w.__fpsStart as number)) / 1000;
    return { fps: Math.round((w.__fpsFrames as number) / elapsed), worstMs: +(w.__fpsWorst as number).toFixed(1) };
  });

/** A coarse signature of camera state, so we can confirm a gesture moved the
 *  scene (tldraw: `--tl-zoom` + layer transforms; engine: container transform). */
const sceneSig = (page: Page, sel: string) =>
  page.evaluate((sel) => {
    const root = document.querySelector(sel) as HTMLElement | null;
    if (!root) return "";
    const zoom = getComputedStyle(root).getPropertyValue("--tl-zoom");
    const transforms = [...root.querySelectorAll<HTMLElement>("div")]
      .slice(0, 60)
      .map((e) => e.style.transform)
      .filter(Boolean)
      .join("|");
    return `${zoom}#${transforms}`;
  }, sel);

const emptyPoint = (page: Page) =>
  page.evaluate(() => {
    const vp = document.querySelector('[data-testid="engine-viewport"]')!.getBoundingClientRect();
    for (const [fx, fy] of [[0.03, 0.04], [0.97, 0.04], [0.03, 0.96], [0.97, 0.96], [0.03, 0.5], [0.97, 0.5]]) {
      const x = vp.left + vp.width * fx;
      const y = vp.top + vp.height * fy;
      const el = document.elementFromPoint(x, y);
      if (el && el.closest('[data-testid="engine-viewport"]') && !el.closest("[data-shape-id]") && !el.closest(".toolbar")) {
        return { x, y };
      }
    }
    return null;
  });

async function panGesture(page: Page, kind: "engine" | "tldraw", ms: number) {
  const steps = 44;
  const per = ms / steps;
  if (kind === "engine") {
    const p = (await emptyPoint(page))!;
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    for (let i = 0; i < steps; i++) {
      await page.mouse.move(p.x + 70 * Math.sin(i / 5), p.y + 45 * Math.cos(i / 5));
      await page.waitForTimeout(per);
    }
    await page.mouse.up();
  } else {
    const vp = (await page.locator(".tl-container").boundingBox())!;
    await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2);
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(26 * Math.sin(i / 5), 26 * Math.cos(i / 5)); // tldraw pans on wheel
      await page.waitForTimeout(per);
    }
  }
}

async function zoomGesture(page: Page, kind: "engine" | "tldraw", ms: number) {
  const steps = 36;
  const per = ms / steps;
  const sel = kind === "engine" ? '[data-testid="engine-viewport"]' : ".tl-container";
  const vp = (await page.locator(sel).boundingBox())!;
  await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2);
  if (kind === "tldraw") await page.keyboard.down("Control"); // tldraw zooms on ctrl+wheel
  // Monotonic zoom-in (deltaY<0) so the gesture ends at a different zoom than it
  // started — keeps the "moved?" signature honest. ~2.6× over the run.
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, -18);
    await page.waitForTimeout(per);
  }
  if (kind === "tldraw") await page.keyboard.up("Control");
}

async function measure(page: Page, kind: "engine" | "tldraw"): Promise<Metrics> {
  const url = kind === "engine" ? "/" : "/?engine=tldraw";
  const sel = kind === "engine" ? '[data-testid="engine-viewport"]' : ".tl-container";
  const shapeSel = kind === "engine" ? '[data-shape-type="kymo-node"]' : ".tl-shape";

  const t0 = Date.now();
  await page.goto(url);
  await page.waitForSelector(shapeSel, { timeout: 20_000 });
  const mountMs = Date.now() - t0;

  await page.waitForTimeout(800); // settle + auto-fit
  if (kind === "engine") await page.evaluate(() => { (window as { __kymoBench?: boolean }).__kymoBench = true; });

  // PAN
  const panBefore = await sceneSig(page, sel);
  if (kind === "engine") await page.evaluate(() => { (window as { __kymoRenders?: number }).__kymoRenders = 0; });
  await startSampler(page);
  await panGesture(page, kind, 2000);
  const pan = await stopSampler(page);
  const panMoved = (await sceneSig(page, sel)) !== panBefore;
  const panShapeRenders =
    kind === "engine" ? await page.evaluate(() => (window as { __kymoRenders?: number }).__kymoRenders ?? 0) : null;

  await page.waitForTimeout(300);

  // ZOOM
  const zoomBefore = await sceneSig(page, sel);
  await startSampler(page);
  await zoomGesture(page, kind, 2000);
  const zoom = await stopSampler(page);
  const zoomMoved = (await sceneSig(page, sel)) !== zoomBefore;

  return {
    mountMs,
    pan: { ...pan, moved: panMoved },
    zoom: { ...zoom, moved: zoomMoved },
    panShapeRenders,
  };
}

test("@perf engine vs tldraw — AIQ sample", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const engine = await measure(page, "engine");
  const tldraw = await measure(page, "tldraw");

  const ok = (b: boolean) => (b ? "✓moved" : "✗STILL"); // ✗ ⇒ gesture didn't drive that renderer
  const report = [
    "",
    "  PERF COMPARISON — AIQ sample (~43 shapes) · headless Chromium (software GL)",
    "  ───────────────────────────────────────────────────────────────────────────",
    "  metric                  engine                    tldraw",
    `  cold load → first shape* ${engine.mountMs} ms`.padEnd(45) + `${tldraw.mountMs} ms`,
    `  pan   fps / worst        ${engine.pan.fps} / ${engine.pan.worstMs}ms ${ok(engine.pan.moved)}`.padEnd(45) +
      `${tldraw.pan.fps} / ${tldraw.pan.worstMs}ms ${ok(tldraw.pan.moved)}`,
    `  zoom  fps / worst        ${engine.zoom.fps} / ${engine.zoom.worstMs}ms ${ok(engine.zoom.moved)}`.padEnd(45) +
      `${tldraw.zoom.fps} / ${tldraw.zoom.worstMs}ms ${ok(tldraw.zoom.moved)}`,
    `  pan shape re-renders     ${engine.panShapeRenders}`.padEnd(45) + "n/a (closed-source)",
    "  ───────────────────────────────────────────────────────────────────────────",
    "  NOTE headless software GL → absolute FPS not real-hardware; read relatively.",
    "  *   selectors differ (engine: kymo-node, tldraw: .tl-shape) — not head-to-head.",
    "  ✗STILL on a column ⇒ that gesture didn't drive that renderer (ignore its fps).",
    "",
  ].join("\n");
  console.log(report);
  await testInfo.attach("perf-comparison", { body: report, contentType: "text/plain" });
});
