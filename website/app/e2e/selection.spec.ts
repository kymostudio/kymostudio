/**
 * TC-CS-05 (canvas-studio `FR-CS-05`) — selection affordances.
 *
 * Selecting a `kymo-node` shows, in the canvas layer, a selection rectangle with
 * four corner resize handles and a `W × H` size badge — all riding inside the
 * shape's wrapper so they follow a drag frame-for-frame. Handles are
 * presentational in the MVP (interactive resize is backlog). Clicking empty
 * canvas clears the selection.
 */
import { test, expect, type Page } from "@playwright/test";

async function freshBoard(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    () => new Promise<void>((res) => {
      const r = indexedDB.deleteDatabase("kymo-engine");
      r.onsuccess = r.onerror = r.onblocked = () => res();
    }),
  );
  await page.reload();
  await page.waitForSelector('[data-shape-type="kymo-node"]'); // board mounted + fitted
}

test.beforeEach(async ({ page }) => {
  await freshBoard(page);
});

test("TC-CS-05: selecting a node shows a size badge + 4 corner handles", async ({ page }) => {
  const badge = page.getByTestId("selection-size");
  await expect(badge).toHaveCount(0); // nothing selected yet

  await page.locator('[data-shape-type="kymo-node"]').first().click();

  await expect(badge).toHaveCount(1);
  await expect(badge).toHaveText(/^\d+ × \d+$/); // "W × H"
  await expect(page.getByTestId("selection-handle")).toHaveCount(4);
});

test("TC-CS-05: the size badge tracks a node drag", async ({ page }) => {
  const node = page.locator('[data-shape-type="kymo-node"]').first();
  await node.click();
  const badge = page.getByTestId("selection-size");
  const before = (await badge.boundingBox())!;

  const nb = (await node.boundingBox())!;
  const cx = nb.x + nb.width / 2, cy = nb.y + nb.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy + 50, { steps: 8 });
  await page.mouse.up();

  const after = (await badge.boundingBox())!;
  expect(after.x - before.x).toBeGreaterThan(40); // badge followed the dragged node
  expect(after.y - before.y).toBeGreaterThan(20);
});

test("TC-CS-05: clicking empty canvas clears the selection", async ({ page }) => {
  await page.locator('[data-shape-type="kymo-node"]').first().click();
  await expect(page.getByTestId("selection-size")).toHaveCount(1);

  // Click a genuinely empty viewport point (no shape under it).
  const empty = await page.evaluate(() => {
    const vp = document.querySelector('[data-testid="engine-viewport"]')!.getBoundingClientRect();
    for (const [fx, fy] of [[0.06, 0.94], [0.94, 0.06], [0.06, 0.06], [0.5, 0.97]]) {
      const x = vp.left + vp.width * fx, y = vp.top + vp.height * fy;
      const onShape = document.elementsFromPoint(x, y).some((e) => (e as HTMLElement).closest?.("[data-shape-id]"));
      if (!onShape) return { x, y };
    }
    return { x: vp.left + 6, y: vp.top + vp.height - 6 };
  });
  await page.mouse.click(empty.x, empty.y);

  await expect(page.getByTestId("selection-size")).toHaveCount(0);
});
