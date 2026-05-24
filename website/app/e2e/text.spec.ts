/**
 * TC-J-07 (canvas-jam `FR-J-07`) — the text tool.
 *
 * The text tool click-places an editable plain-text `text` shape ("click to
 * place; type to edit" → it auto-enters edit on placement). Verifies the
 * freeform-layer contract: `meta.kymo == null`, persists across reload via
 * `engine/persist`, never serialises into `.kymo`; and an empty commit leaves
 * no stray shape.
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

/** Text tool → click the canvas → returns the auto-opened inline editor. */
async function placeText(page: Page, fx = 0.4, fy = 0.5) {
  const btn = page.getByRole("button", { name: "Text tool" });
  await btn.click();
  await expect(btn).toHaveClass(/active/); // tool=text committed before we click
  const vp = (await page.getByTestId("engine-viewport").boundingBox())!;
  await page.mouse.move(vp.x + vp.width * fx, vp.y + vp.height * fy);
  await page.mouse.down();
  await page.mouse.up();
  return page.getByTestId("inline-editor"); // auto-waits for the auto-focused editor
}

test.beforeEach(async ({ page }) => {
  await freshBoard(page);
});

test("TC-J-07: text tool places an editable text shape that persists and never enters .kymo", async ({ page }) => {
  const editor = page.locator("textarea#editor");
  const kymoBefore = await editor.inputValue();
  expect(await page.locator('[data-shape-type="text"]').count()).toBe(0);

  const inline = await placeText(page);
  await inline.fill("Hello text ✦");
  await inline.press("Enter"); // commit

  // (a) a text shape exists with the typed content…
  await expect(page.locator('[data-shape-type="text"]')).toHaveCount(1);
  expect(await page.locator('[data-shape-type="text"]').innerText()).toContain("Hello text ✦");
  // (b) …and the `.kymo` text is byte-identical (freeform never serialises).
  expect(await editor.inputValue()).toBe(kymoBefore);

  // (c) persists across reload via the snapshot.
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForSelector('[data-shape-type="kymo-node"]');
  await expect(page.locator('[data-shape-type="text"]')).toHaveCount(1);
  expect(await page.locator('[data-shape-type="text"]').innerText()).toContain("Hello text ✦");
  expect(await page.locator("textarea#editor").inputValue()).toBe(kymoBefore);
});

test("TC-J-07: committing an empty text leaves no shape", async ({ page }) => {
  const inline = await placeText(page, 0.5, 0.4);
  await inline.press("Enter"); // commit with no text
  await expect(page.locator('[data-shape-type="text"]')).toHaveCount(0);
});

test("TC-J-07: a placed+typed text is one undo step (FR-J-02 × freeform)", async ({ page }) => {
  const inline = await placeText(page, 0.35, 0.45);
  await inline.fill("undo me");
  await inline.press("Enter");
  await expect(page.locator('[data-shape-type="text"]')).toHaveCount(1);

  await page.keyboard.press(UNDO);
  await expect(page.locator('[data-shape-type="text"]')).toHaveCount(0);
});
