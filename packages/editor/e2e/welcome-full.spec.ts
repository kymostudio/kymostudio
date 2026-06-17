import { test, expect } from "./_fixtures";

// Full-suite cases for editor-home (FEAT-KHOME-001) — the ones that need a
// mocked kymo_idtoken and/or the owner-scoped REST stubs (see _fixtures.ts).
// The no-auth smoke cases (TC-HM-01, TC-HM-04) live in welcome.spec.ts.

test("TC-HM-02 signed-in recent → opens in place as a tab, URL stays ?p=", async ({ page, signIn }) => {
  await signIn();
  await page.goto("/");

  // Recent lists the most-recently-updated diagrams; clicking one opens it as a
  // tab WITHOUT changing the workspace URL (VS Code model: ?p= stays, no ?d=).
  const item = page.getByTestId("wel-recent-item").filter({ hasText: "My flow" });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page).toHaveURL(/[?&]p=/);
  await expect(page).not.toHaveURL(/[?&]d=/);
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /My flow/ })).toBeVisible();
});

test("TC-HM-07 multiple tabs: open, switch, close → neighbour, close last → No file open", async ({ page, signIn }) => {
  await signIn();
  await page.goto("/");

  // open the first from Recent (Welcome → editor)
  await page.getByTestId("wel-recent-item").filter({ hasText: "My flow" }).click();
  await expect(page.getByRole("tab")).toHaveCount(1);
  // Welcome is gone; open the 2nd from the Explorer → a second tab
  await page.locator(".sb-file", { hasText: "Seq" }).first().click();
  await expect(page.getByRole("tab")).toHaveCount(2);

  // switch to the first tab
  await page.getByRole("tab", { name: /My flow/ }).click();
  await expect(page.getByRole("tab", { name: /My flow/ })).toHaveAttribute("aria-selected", "true");

  // close the active tab → a neighbour stays open
  await page.getByRole("tab", { name: /My flow/ }).getByRole("button", { name: "Close tab" }).click();
  await expect(page.getByRole("tab")).toHaveCount(1);

  // close the last tab → the Welcome home (the empty state is merged into it);
  // the Command Center stays mounted, URL still ?p=.
  await page.getByRole("tab").getByRole("button", { name: "Close tab" }).click();
  await expect(page.getByTestId("welcome")).toBeVisible();
  await expect(page.getByTitle("Switch project")).toBeVisible(); // Command Center persists
  await expect(page).toHaveURL(/[?&]p=/);
});

test("TC-HM-03 open file → draft (kind auto-detected)", async ({ page }) => {
  await page.goto("/");

  // "Open file…" loads a local source into a draft; a .mmd resolves to mermaid.
  await page.getByTestId("wel-open-input").setInputFiles({
    name: "diagram.mmd", mimeType: "text/plain", buffer: Buffer.from("graph TD\n  A-->B"),
  });
  await expect(page.getByTestId("welcome")).toHaveCount(0); // Welcome dismissed
  // As-built: the guest editor surfaces no kind selector — the opened .mmd lands
  // in the draft editor (kind auto-detected to mermaid, then rendered).
  await expect(page.locator(".cm-content")).toContainText("graph TD");
});

test("TC-HM-05 template dismisses welcome; a fresh visit restores it", async ({ page }) => {
  await page.goto("/");

  // Picking a Templates quick item leaves the Welcome for the editor.
  await page.getByTestId("wel-template").first().click();
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await expect(page.locator(".cm-editor")).toBeVisible(); // editor pane is up

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
