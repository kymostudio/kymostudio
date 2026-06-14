import { defineConfig, devices } from "@playwright/test";

/**
 * E2E for the editor.kymo.studio app. Smoke scope today: the Welcome home
 * (editor-home / FEAT-KHOME-001) — see e2e/welcome.spec.ts. Serves the built
 * static bundle (`dist/`); `npm run test:e2e` rebuilds it first.
 *
 * The Welcome is pure presentation (no diagram bytes), so these are DOM +
 * navigation assertions, not golden-SVG. Guest cases need no auth; signed-in /
 * Recent cases (deferred to the full suite) need a mocked `kymo_idtoken` +
 * `/api/diagrams` route stub.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4318",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx --yes http-server dist -p 4318 -c-1 -s",
    url: "http://127.0.0.1:4318",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
