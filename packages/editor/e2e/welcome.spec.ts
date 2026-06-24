import { test, expect } from "@playwright/test";
import zlib from "node:zlib";

// Smoke scope for editor-home (FEAT-KHOME-001): the two cases that need no auth
// or API mocking — guest landing (TC-HM-01) and share-link bypass (TC-HM-04).
// The signed-in / Recent / open-file cases (TC-HM-02/03/05/06) are the full
// suite (they need a mocked kymo_idtoken + /api/diagrams) — see TEST-KHOME-001.

// Stub Google Identity Services so the inline "Sign in" CTA is observable
// without driving the real third-party OAuth prompt.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).google = {
      accounts: {
        id: {
          initialize() {},
          renderButton() {},
          disableAutoSelect() {},
          prompt: () => { (window as any).__signin = true; },
        },
      },
    };
  });
});

test("TC-HM-01 guest lands straight in the editor", async ({ page }) => {
  await page.goto("/");

  // Guests skip the landing entirely — a fresh "/" opens the editor on the
  // sample (no Welcome panel), the fastest path to "see it work".
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await expect(page.locator(".pane").first()).toBeVisible();

  // Guest brand links out to kymo.studio, and "New" is surfaced in the header
  // (guests have no Explorer rail).
  await expect(page.locator('a.brand[href="https://kymo.studio"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "New", exact: true })).toBeVisible();
});

test("TC-HM-04 share link bypasses the Welcome", async ({ page }) => {
  // `?s=` carries the whole diagram (kroki-style: zlib deflate + base64url).
  const source = "flowchart TD {\n  A[Start] --> B[End]\n}";
  const payload = zlib.deflateSync(Buffer.from(source)).toString("base64url");

  await page.goto("/?s=" + payload);

  // The shared diagram loads directly in the editor — no Welcome.
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await expect(page.locator(".pane").first()).toBeVisible();
});
