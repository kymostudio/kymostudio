import { defineConfig, devices } from "@playwright/test";

/**
 * E2E for the in-house canvas engine. The headline is the render-count guard
 * (e2e/render-guard.spec.ts): pan/zoom must NOT re-render the shape list. Serves
 * the committed bundle (`website/app/` at root) — CI rebuilds it first.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4317",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx --yes http-server . -p 4317 -c-1 -s",
    url: "http://127.0.0.1:4317",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
