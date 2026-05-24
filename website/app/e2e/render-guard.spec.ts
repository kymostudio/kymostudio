/**
 * Render-count regression guard for the canvas engine (RK-EN-04).
 *
 * The optimization: pan/zoom change only the camera transform (written straight
 * to the DOM), so they must NOT re-render the React shape list — keeping FPS flat
 * regardless of shape count. We assert that *behaviour* (render count), not FPS
 * (hardware-dependent, flaky in CI). A drag, by contrast, mutates the store and
 * must re-render.
 *
 * `EngineCanvas` increments `window.__kymoRenders` once per render when
 * `window.__kymoBench` is set (a no-op test seam in prod).
 */
import { test, expect, type Page } from "@playwright/test";

const flush = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

const renders = (page: Page) =>
  page.evaluate(() => (window as { __kymoRenders?: number }).__kymoRenders ?? 0);

const cameraTransform = (page: Page) =>
  page.evaluate(() => {
    const cam = [...document.querySelectorAll("div")].find((d) =>
      /scale\([\d.]+\) translate/.test(d.getAttribute("style") || ""),
    );
    return cam?.getAttribute("style")?.match(/transform:[^;]+/)?.[0] ?? "";
  });

/** A viewport point that is genuinely empty (no shape, not the toolbar) so a
 *  drag there pans rather than grabbing a node. */
const emptyPoint = (page: Page) =>
  page.evaluate(() => {
    const vp = document.querySelector('[data-testid="engine-viewport"]')!.getBoundingClientRect();
    const candidates = [
      [0.03, 0.04],
      [0.97, 0.04],
      [0.03, 0.96],
      [0.97, 0.96],
      [0.03, 0.5],
      [0.97, 0.5],
    ];
    for (const [fx, fy] of candidates) {
      const x = vp.left + vp.width * fx;
      const y = vp.top + vp.height * fy;
      const el = document.elementFromPoint(x, y);
      if (
        el &&
        el.closest('[data-testid="engine-viewport"]') &&
        !el.closest("[data-shape-id]") &&
        !el.closest(".toolbar")
      ) {
        return { x, y };
      }
    }
    return null;
  });

/** Drain any pending mount/sync renders, then zero the counter. */
async function arm(page: Page): Promise<void> {
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    (window as { __kymoRenders?: number }).__kymoRenders = 0;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/"); // the engine is the default renderer
  await page.waitForSelector('[data-shape-type="kymo-node"]'); // shapes mounted + fitted
  await page.evaluate(() => {
    (window as { __kymoBench?: boolean }).__kymoBench = true;
  });
});

test("pan does not re-render the shape list", async ({ page }) => {
  const p = await emptyPoint(page);
  expect(p, "found an empty viewport point to pan from").not.toBeNull();
  const before = await cameraTransform(page);
  await arm(page);

  await page.mouse.move(p!.x, p!.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(p!.x + i * 16, p!.y + i * 6);
  await page.mouse.up();
  await page.waitForTimeout(150);

  expect(await renders(page)).toBe(0); // ← the guard: pan re-renders nothing
  expect(await cameraTransform(page)).not.toBe(before); // sanity: the pan moved the camera
});

test("wheel-zoom does not re-render the shape list", async ({ page }) => {
  const vp = (await page.getByTestId("engine-viewport").boundingBox())!;
  const before = await cameraTransform(page);
  await arm(page);

  await page.mouse.move(vp.x + vp.width / 2, vp.y + vp.height / 2);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(150);

  expect(await renders(page)).toBe(0);
  expect(await cameraTransform(page)).not.toBe(before);
});

test("dragging a node re-renders (sanity: the store path still updates shapes)", async ({ page }) => {
  const node = page.locator('[data-shape-type="kymo-node"]').first();
  const b = (await node.boundingBox())!;
  await arm(page);

  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(cx + i * 9, cy + i * 6);
  await page.mouse.up();
  await page.waitForTimeout(150);

  expect(await renders(page)).toBeGreaterThan(0);
});
