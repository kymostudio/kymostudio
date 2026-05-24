/**
 * TC-J-05 (canvas-jam `FR-J-05`) — the freehand draw/pen tool.
 *
 * Verifies the freeform-layer contract: selecting Draw and dragging creates a
 * `freedraw` stroke that (a) is a real engine shape, (b) NEVER touches the `.kymo`
 * text (`meta.kymo == null`), and (c) persists across reload via `engine/persist`
 * (not the `.kymo`/URL round-trip). Mirrors the pointer-driving style of
 * `render-guard.spec.ts`.
 */
import { test, expect, type Page } from "@playwright/test";

/** Clear the persisted snapshot so each test starts with no freeform shapes. */
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

test("TC-J-05: draw creates a persisted freedraw stroke that never enters .kymo", async ({ page }) => {
  const editor = page.locator("textarea#editor");
  const kymoBefore = await editor.inputValue();
  expect(await page.locator('[data-shape-type="freedraw"]').count()).toBe(0);

  // Switch to the draw tool and drag a freehand stroke.
  await page.getByRole("button", { name: "Draw tool" }).click();
  const vp = (await page.getByTestId("engine-viewport").boundingBox())!;
  const sx = vp.x + vp.width * 0.22;
  const sy = vp.y + vp.height * 0.25;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) await page.mouse.move(sx + i * 5, sy + Math.sin(i / 3) * 22);
  await page.mouse.up();

  // (a) a freedraw shape now exists on the board…
  await expect(page.locator('[data-shape-type="freedraw"]')).toHaveCount(1);
  // (b) …and the `.kymo` text is byte-identical (freeform never serialises).
  expect(await editor.inputValue()).toBe(kymoBefore);

  // (c) it persists across reload via the snapshot (debounced 400ms save).
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForSelector('[data-shape-type="kymo-node"]');
  await expect(page.locator('[data-shape-type="freedraw"]')).toHaveCount(1);
  expect(await page.locator("textarea#editor").inputValue()).toBe(kymoBefore);
});

test("TC-J-05: undo removes the whole stroke in one step (FR-J-02 × freeform)", async ({ page }) => {
  await page.getByRole("button", { name: "Draw tool" }).click();
  const vp = (await page.getByTestId("engine-viewport").boundingBox())!;
  const sx = vp.x + vp.width * 0.3;
  const sy = vp.y + vp.height * 0.3;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) await page.mouse.move(sx + i * 6, sy + i * 4);
  await page.mouse.up();
  await expect(page.locator('[data-shape-type="freedraw"]')).toHaveCount(1);

  // The stroke (built with history:"ignore", sealed as one recorded add) → one undo.
  // Focus is on the Draw button (not a text field), so the document-level Cmd/Ctrl+Z
  // handler fires; clicking the canvas here would draw a dot, so we don't.
  await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
  await expect(page.locator('[data-shape-type="freedraw"]')).toHaveCount(0);
});
