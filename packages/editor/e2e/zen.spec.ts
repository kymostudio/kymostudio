import { test, expect } from "./_fixtures";
import type { Page } from "@playwright/test";

// Zen Mode (#640): Shift+N (or the "View: Toggle Zen Mode" command in the ⌘/Ctrl-K
// palette) hides every piece of chrome — header, activity bar, side panels,
// Connect AI dock, status bar — leaving only the open diagram's editor + preview.

async function openMyFlow(page: Page) {
  await page.goto("/");
  await page.getByTestId("wel-recent-item").filter({ hasText: "My flow" }).click();
  await expect(page.getByRole("tab", { name: /My flow/ })).toBeVisible();
  await expect(page.locator(".cm-editor")).toBeVisible();
}

async function expectZen(page: Page, on: boolean) {
  if (on) {
    await expect(page.locator(".layout")).toHaveClass(/\bzen\b/);
    await expect(page.locator("header")).toBeHidden();
    await expect(page.locator(".activitybar")).toBeHidden();
    await expect(page.locator(".sidebar")).toBeHidden();
    await expect(page.locator(".cm-editor")).toBeVisible(); // the editor itself stays
    await expect(page.getByTestId("zen-exit")).toBeVisible();
  } else {
    await expect(page.locator(".layout")).not.toHaveClass(/\bzen\b/);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator(".activitybar")).toBeVisible();
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.getByTestId("zen-exit")).toHaveCount(0);
  }
}

test("TC-ZEN-01 Shift+N toggles Zen Mode on and off", async ({ page, signIn }) => {
  await signIn();
  await openMyFlow(page);
  await expectZen(page, false);

  await page.keyboard.press("Shift+N");
  await expectZen(page, true);
  // Shift+N is Zen Mode, not "New diagram" — the template gallery stays closed.
  await expect(page.locator(".tpl-overlay")).toHaveCount(0);

  await page.keyboard.press("Shift+N");
  await expectZen(page, false);
});

test("TC-ZEN-02 Escape and the exit button leave Zen Mode", async ({ page, signIn }) => {
  await signIn();
  await openMyFlow(page);

  await page.keyboard.press("Shift+N");
  await expectZen(page, true);
  await page.keyboard.press("Escape");
  await expectZen(page, false);

  await page.keyboard.press("Shift+N");
  await expectZen(page, true);
  await page.getByTestId("zen-exit").click();
  await expectZen(page, false);
});

test("TC-ZEN-03 View: Toggle Zen Mode command in the ⌘/Ctrl-K palette", async ({ page, signIn }) => {
  await signIn();
  await openMyFlow(page);

  await page.keyboard.press("Control+K");
  await page.locator(".addr-input").fill("zen");
  const cmd = page.getByRole("button", { name: /View: Toggle Zen Mode/ });
  await expect(cmd).toBeVisible();
  await cmd.click();
  await expectZen(page, true);
  await expect(page.locator(".addr-input")).toHaveCount(0); // palette closed after running

  // unrelated queries don't surface the command
  await page.getByTestId("zen-exit").click();
  await page.keyboard.press("Control+K");
  await page.locator(".addr-input").fill("My flow");
  await expect(page.getByRole("button", { name: /View: Toggle Zen Mode/ })).toHaveCount(0);
});

test("TC-ZEN-04 plain N still opens New diagram; Shift+N while typing just types", async ({ page, signIn }) => {
  await signIn();
  await openMyFlow(page);

  // typing a capital N into the source editor must not toggle Zen Mode
  await page.locator(".cm-content").click();
  await page.keyboard.press("Shift+N");
  await expectZen(page, false);
  await expect(page.locator(".cm-content")).toContainText("N");

  // plain N (outside a text field) keeps opening the New-diagram gallery
  await page.locator(".preview-bar .pane-bar-label").click();
  await page.keyboard.press("n");
  await expect(page.locator(".tpl-overlay")).toBeVisible();
});

test("TC-ZEN-05 no Zen Mode on the Welcome home (nothing open to focus on)", async ({ page, signIn }) => {
  await signIn();
  await page.goto("/");
  await expect(page.getByTestId("welcome")).toBeVisible();
  await page.keyboard.press("Shift+N");
  await expect(page.locator(".layout")).not.toHaveClass(/\bzen\b/);
  await expect(page.locator("header")).toBeVisible();
});

test("TC-ZEN-06 the ⌘/Ctrl-K palette still opens inside Zen Mode and can leave it", async ({ page, signIn }) => {
  await signIn();
  await openMyFlow(page);
  await page.keyboard.press("Shift+N");
  await expectZen(page, true);

  await page.keyboard.press("Control+K");
  await expect(page.locator(".addr-input")).toBeVisible(); // header surfaces for the palette
  await page.locator(".addr-input").fill("toggle zen");
  await page.getByRole("button", { name: /View: Toggle Zen Mode/ }).click();
  await expectZen(page, false);
});

test("TC-ZEN-07 Esc closes an open menu or the palette first, without leaving Zen Mode", async ({ page, signIn }) => {
  await signIn();
  await openMyFlow(page);
  await page.keyboard.press("Shift+N");
  await expectZen(page, true);

  await page.getByRole("button", { name: /Export/ }).click();
  await expect(page.locator(".exp-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".exp-menu")).toHaveCount(0);
  await expectZen(page, true);

  // same for the ⌘/Ctrl-K palette: Esc dismisses it and stays in Zen Mode
  await page.keyboard.press("Control+K");
  await expect(page.locator(".addr-input")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".addr-input")).toHaveCount(0);
  await expectZen(page, true);

  await page.keyboard.press("Escape");
  await expectZen(page, false);
});

test("TC-ZEN-08 closing the last tab ends Zen Mode", async ({ page, signIn }) => {
  await signIn();
  await openMyFlow(page);
  await page.keyboard.press("Shift+N");
  await expectZen(page, true);

  await page.getByRole("tab").getByRole("button", { name: "Close tab" }).click();
  await expect(page.getByTestId("welcome")).toBeVisible();
  await expect(page.locator(".layout")).not.toHaveClass(/\bzen\b/);
  await expect(page.locator("header")).toBeVisible();
  // and it stays off when a diagram is opened again
  await page.getByTestId("wel-recent-item").filter({ hasText: "My flow" }).click();
  await expectZen(page, false);
});
