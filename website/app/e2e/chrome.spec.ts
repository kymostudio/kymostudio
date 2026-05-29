/**
 * TC-CS-07 (canvas-studio `FR-CS-07`, CR-STUDIO-001) — chrome de-dup: one owner
 * per control.
 *
 * P7 retired the floating canvas toolbar and moved its non-duplicate controls
 * (the sample/starter picker + a 3-mode canvas-background control) into the top
 * bar. There is a single Export entry point, and the Code/Preview tabs reflect
 * true panel state (Preview active ⇔ the code pane is hidden). `renderSVG` /
 * `svgBackground` are untouched (golden-safe) — this is pure relocation.
 */
import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }: { page: Page }) => {
  await page.goto("/");
  await page.waitForSelector('[data-shape-type="kymo-node"]'); // board mounted + fitted
});

test("TC-CS-07: no floating toolbar remains in the DOM", async ({ page }) => {
  await expect(page.locator(".toolbar")).toHaveCount(0);
});

test("TC-CS-07: a single Export entry point (the floating SVG button is gone)", async ({ page }) => {
  await expect(page.getByTestId("export")).toHaveCount(1);
  await expect(page.locator("#download")).toHaveCount(0);
});

test("TC-CS-07: the sample picker + 3-mode background live in the top bar", async ({ page }) => {
  await expect(page.getByTestId("topbar-sample")).toHaveCount(1);
  const html = page.locator("html");

  // light/dark re-theme the whole app via [data-theme]
  await page.getByTestId("topbar-bg-dark").click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("topbar-bg-light").click();
  await expect(html).toHaveAttribute("data-theme", "light");

  // transparent flips only the canvas bg — [data-theme] is untouched
  const themeBefore = (await html.getAttribute("data-theme"))!;
  await page.getByTestId("topbar-bg-transparent").click();
  await expect(page.getByTestId("topbar-bg-transparent")).toHaveClass(/active/);
  await expect(html).toHaveAttribute("data-theme", themeBefore);
});

test("TC-CS-07: Code/Preview tabs reflect true panel state", async ({ page }) => {
  const editor = page.locator("#editor");
  const codeTab = page.getByTestId("tab-code");
  const previewTab = page.getByTestId("tab-preview");

  // boot: code pane shown → Code active, Preview not
  await expect(editor).toHaveCount(1);
  await expect(codeTab).toHaveClass(/active/);
  await expect(previewTab).not.toHaveClass(/active/);

  // hide the code pane → Preview active, Code not, editor gone
  await codeTab.click();
  await expect(editor).toHaveCount(0);
  await expect(previewTab).toHaveClass(/active/);
  await expect(codeTab).not.toHaveClass(/active/);

  // clicking Preview while already preview-only is a no-op
  await previewTab.click();
  await expect(editor).toHaveCount(0);

  // bring the code pane back
  await codeTab.click();
  await expect(editor).toHaveCount(1);
  await expect(codeTab).toHaveClass(/active/);
});

/**
 * TC-CR3-01 (canvas-studio CR-STUDIO-003, `FR-CR3-01`) — the .kymo source pane
 * docks to the RIGHT of the canvas: `.pane.view` precedes `.pane.editor` in DOM
 * order and the editor's box sits to the right of the canvas. The code-hidden
 * state still collapses to a single full-width canvas column (no regression).
 */
test("TC-CR3-01: the code pane docks to the right of the canvas", async ({ page }) => {
  const view = page.locator(".pane.view");
  const editor = page.locator(".pane.editor");

  // boot: both panes present (code shown by default — CR-002 not in scope here)
  await expect(view).toHaveCount(1);
  await expect(editor).toHaveCount(1);

  // DOM order inside <main>: view first, editor second
  const order = await page.evaluate(() => {
    const kids = Array.from(document.querySelector("main")!.children);
    return kids.map((el) => el.className);
  });
  const viewIdx = order.findIndex((c) => c.includes("view"));
  const editorIdx = order.findIndex((c) => c.includes("editor"));
  expect(viewIdx).toBeGreaterThanOrEqual(0);
  expect(editorIdx).toBeGreaterThan(viewIdx);

  // geometry: the editor sits to the right of the canvas
  const vBox = (await view.boundingBox())!;
  const eBox = (await editor.boundingBox())!;
  expect(eBox.x).toBeGreaterThan(vBox.x);

  // code-hidden regression: hiding code collapses to a single full-width column
  await page.getByTestId("tab-code").click();
  await expect(editor).toHaveCount(0);
  await expect(page.locator("main.code-hidden")).toHaveCount(1);
});
