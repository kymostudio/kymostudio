/**
 * TC-CS-06 (canvas-studio `FR-CS-06`) — the status bar.
 *
 * Node/edge counts come from the parsed diagram; the zoom chip drives the engine
 * view API and its `%` readout reflects the live camera zoom. Counts must be
 * non-zero for the AIQ sample; zoom-in raises the `%`; Fit changes it.
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

test("TC-CS-06: status bar shows non-zero node/edge counts", async ({ page }) => {
  const counts = page.getByTestId("status-counts");
  await expect(counts).toHaveText(/\d+ nodes · \d+ edges/);
  const m = (await counts.innerText()).match(/(\d+) nodes · (\d+) edges/)!;
  expect(Number(m[1])).toBeGreaterThan(0); // nodes
  expect(Number(m[2])).toBeGreaterThan(0); // edges
});

test("TC-CS-06: zoom in raises the % and Fit changes it", async ({ page }) => {
  const zoom = page.getByTestId("status-zoom");
  const pct = async () => Number((await zoom.innerText()).replace("%", ""));

  // The readout starts at 100% then the poll syncs the auto-fit zoom (AIQ fits
  // below 100%); wait for that before capturing the baseline, else `before` is stale.
  await expect.poll(pct).toBeLessThan(100);
  const before = await pct();
  await page.getByTestId("status-zoom-in").click();
  await expect.poll(pct).toBeGreaterThan(before);

  const zoomed = await pct();
  await page.getByTestId("status-zoom-fit").click();
  await expect.poll(pct).not.toBe(zoomed); // Fit re-zooms away from the zoomed-in value
});
