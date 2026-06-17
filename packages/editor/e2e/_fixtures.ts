import { test as base, expect } from "@playwright/test";

// Display claims for the signed-in UI. The session of record is the httpOnly
// cookie (CR-KEDITOR-002); `auth.tsx` caches {email,name,sub} in localStorage
// (`kymo_claims`) for an instant signed-in paint, and on 127.0.0.1 skips the
// /api/me revalidation — so seeding this is enough to drive the signed-in shell.
function fakeClaims(): string {
  return JSON.stringify({ email: "tester@example.com", name: "Tester", sub: "u1" });
}

export const test = base.extend<{ signIn: () => Promise<void> }>({
  // Stub Google Identity Services for every test so the inline Sign-in CTA is
  // observable without driving the real third-party OAuth prompt.
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      // Tests run on 127.0.0.1, which would otherwise activate the localStorage
      // dev-DB (localdb.ts) and shadow the page.route API stubs below. Opt out.
      (window as any).__kymoNoLocalDb = true;
      (window as any).google = { accounts: { id: {
        initialize() {}, renderButton() {}, disableAutoSelect() {},
        prompt: () => { (window as any).__signin = true; },
      } } };
    });
    await use(page);
  },
  // Opt-in: seed a mock signed-in session + stub the owner-scoped REST
  // endpoints (no real backend). Call BEFORE page.goto().
  signIn: async ({ page }, use) => {
    await use(async () => {
      await page.addInitScript((c) => localStorage.setItem("kymo_claims", c as string), fakeClaims());
      await page.route("**/api/projects*",   (r) => r.fulfill({ json: { projects: [{ id: "p1", name: "Personal" }] } }));
      await page.route("**/api/workspaces*", (r) => r.fulfill({ json: { workspaces: [] } }));
      await page.route("**/api/diagrams*",   (r) => r.fulfill({ json: { diagrams: [
        { id: "abc123", title: "My flow", kind: "kymo",    updatedAt: Date.now() },
        { id: "def456", title: "Seq",     kind: "mermaid", updatedAt: Date.now() - 1000 },
      ] } }));
      // per-project open-tab state: start empty, accept writes
      await page.route("**/api/tabs*", (r) => r.request().method() === "PUT"
        ? r.fulfill({ json: { ok: true } })
        : r.fulfill({ json: { tabs: [], active: null } }));
      // mock the editor-room WebSocket so an opened tab leaves the "booting" state
      // (it delivers a doc snapshot, the same shape the real worker sends).
      await page.routeWebSocket(/\/ws\?/, (ws) => {
        ws.send(JSON.stringify({ type: "doc", source: "flowchart TD {\n  A[x] --> B[y]\n}", title: "", origin: "srv", kind: "kymo" }));
      });
    });
  },
});

export { expect };
