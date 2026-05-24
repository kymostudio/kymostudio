/**
 * TC-J-06 (canvas-jam `FR-J-06`) — the sticky-note tool.
 *
 * Verifies the freeform-layer contract for `note`: the Sticky tool click-places a
 * note (reverting to select), its plain-text label is editable inline via
 * double-click, it (a) NEVER touches `.kymo` (`meta.kymo == null`), and (b)
 * persists across reload via `engine/persist`.
 */
import { test, expect, type Page } from "@playwright/test";

const UNDO = process.platform === "darwin" ? "Meta+z" : "Control+z";

async function freshBoard(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    () => new Promise<void>((res) => {
      const r = indexedDB.deleteDatabase("kymo-engine");
      r.onsuccess = r.onerror = r.onblocked = () => res();
    }),
  );
  await page.reload();
  await page.waitForSelector('[data-shape-type="kymo-node"]');
}

/** Sticky tool → click the canvas to place a note (which reverts to select).
 *  Returns the placement point (the note's centre) for a later double-click. */
async function placeNote(page: Page, fx = 0.4, fy = 0.5): Promise<{ x: number; y: number }> {
  const btn = page.getByTestId("tool-sticky");
  await btn.click();
  await expect(btn).toHaveClass(/active/); // tool=sticky committed before we click the canvas
  const vp = (await page.getByTestId("engine-viewport").boundingBox())!;
  const x = vp.x + vp.width * fx;
  const y = vp.y + vp.height * fy;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('[data-shape-type="note"]')).toHaveCount(1);
  return { x, y };
}

test.beforeEach(async ({ page }) => {
  await freshBoard(page);
});

test("TC-J-06: sticky places an editable note that persists and never enters .kymo", async ({ page }) => {
  const editor = page.locator("textarea#editor");
  const kymoBefore = await editor.inputValue();
  expect(await page.locator('[data-shape-type="note"]').count()).toBe(0);

  const at = await placeNote(page);

  // Double-click the note (its centre) to edit the label. We click the point, not
  // the wrapper locator — the note wrapper is pointer-events:none (only its inner
  // div is interactive), so a coordinate double-click is what reaches it.
  await page.mouse.dblclick(at.x, at.y);
  const noteEditor = page.getByTestId("inline-editor");
  await noteEditor.fill("hello sticky");
  await noteEditor.press("Enter"); // commit

  // (a) the note carries the typed text…
  expect(await page.locator('[data-shape-type="note"]').innerText()).toContain("hello sticky");
  // (b) …and the `.kymo` text is byte-identical (freeform never serialises).
  expect(await editor.inputValue()).toBe(kymoBefore);

  // (c) it persists across reload via the snapshot (debounced 400ms save).
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForSelector('[data-shape-type="kymo-node"]');
  await expect(page.locator('[data-shape-type="note"]')).toHaveCount(1);
  expect(await page.locator('[data-shape-type="note"]').innerText()).toContain("hello sticky");
  expect(await page.locator("textarea#editor").inputValue()).toBe(kymoBefore);
});

test("TC-J-06: placing a note is one undo step (FR-J-02 × freeform)", async ({ page }) => {
  await placeNote(page, 0.35, 0.4);
  // The placement was one recorded add → one undo removes the note.
  await page.keyboard.press(UNDO);
  await expect(page.locator('[data-shape-type="note"]')).toHaveCount(0);
});
