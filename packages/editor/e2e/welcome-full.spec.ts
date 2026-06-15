import { test, expect } from "./_fixtures";

// Full-suite cases for editor-home (FEAT-KHOME-001) — the ones that need a
// mocked kymo_idtoken and/or the owner-scoped REST stubs (see _fixtures.ts).
// The no-auth smoke cases (TC-HM-01, TC-HM-04) live in welcome.spec.ts.

test("TC-HM-02 signed-in recent → open ?d=", async ({ page, signIn }) => {
  await signIn();
  await page.goto("/");

  // Recent lists the most-recently-updated diagrams; clicking one opens it.
  const item = page.getByTestId("wel-recent-item").filter({ hasText: "My flow" });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page).toHaveURL(/[?&]d=abc123/);
});

test("TC-HM-03 open file → draft (kind auto-detected)", async ({ page }) => {
  await page.goto("/");

  // "Open file…" loads a local source into a draft; a .mmd resolves to mermaid.
  await page.getByTestId("wel-open-input").setInputFiles({
    name: "diagram.mmd", mimeType: "text/plain", buffer: Buffer.from("graph TD\n  A-->B"),
  });
  await expect(page.getByTestId("welcome")).toHaveCount(0); // Welcome dismissed
  await expect(page.locator("#kind-select")).toHaveValue("mermaid");
});

test("TC-HM-05 template dismisses welcome; a fresh visit restores it", async ({ page }) => {
  await page.goto("/");

  // Picking a Templates quick item leaves the Welcome for the editor.
  await page.getByTestId("wel-template").first().click();
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await expect(page.locator("#kind-select")).toBeVisible(); // editor pane is up

  // As-built: pickTemplate uses history.replaceState (no new entry), so in-tab
  // Back does NOT restore the Welcome — a fresh `/` visit (state reset) does.
  await page.goto("/");
  await expect(page.getByTestId("welcome")).toBeVisible();
});

test("TC-HM-06 welcome hides export/share chrome", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("welcome")).toBeVisible();
  // Export / Share are wrapped in `{!showWelcome && …}` — absent on the Welcome.
  await expect(page.getByRole("button", { name: "Export" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share" })).toHaveCount(0);
});
