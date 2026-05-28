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
