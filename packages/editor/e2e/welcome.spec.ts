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

test("TC-HM-01 guest landing", async ({ page }) => {
  await page.goto("/");

  // The Welcome panel replaces the editor panes for an untouched guest draft.
  await expect(page.getByTestId("welcome")).toBeVisible();
  await expect(page.getByTestId("wel-new")).toBeVisible();
  await expect(page.getByTestId("wel-template").first()).toBeVisible();
  await expect(page.locator(".pane")).toHaveCount(0); // no source/preview

  // Guest brand links out to kymo.studio.
  await expect(page.locator('a.brand[href="https://kymo.studio"]')).toBeVisible();

  // Inline Sign-in CTA: assert it is wired to GIS prompt (stubbed), not the
  // real OAuth flow.
  await page.getByTestId("wel-signin").click();
  // expect.poll, not a one-shot evaluate: the click→onClick→GIS-prompt hop can
  // lag a tick under parallel load (the source of TC-HM-01's flake).
  await expect.poll(() => page.evaluate(() => (window as any).__signin)).toBe(true);
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
