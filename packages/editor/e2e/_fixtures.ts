import { test as base, expect } from "@playwright/test";

// A throwaway, non-expired Google ID token (header.payload.sig). `auth.tsx`
// only reads the base64url payload's exp/email/name/sub — signature is never
// verified client-side — so this is enough to drive the signed-in UI.
function fakeToken(): string {
  const payload = Buffer.from(JSON.stringify({
    email: "tester@example.com", name: "Tester", sub: "u1",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString("base64url");
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
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
      await page.addInitScript((t) => localStorage.setItem("kymo_idtoken", t as string), fakeToken());
      await page.route("**/api/projects*",   (r) => r.fulfill({ json: { projects: [{ id: "p1", name: "Personal" }] } }));
      await page.route("**/api/workspaces*", (r) => r.fulfill({ json: { workspaces: [] } }));
      await page.route("**/api/diagrams*",   (r) => r.fulfill({ json: { diagrams: [
        { id: "abc123", title: "My flow", kind: "kymo",    updatedAt: Date.now() },
        { id: "def456", title: "Seq",     kind: "mermaid", updatedAt: Date.now() - 1000 },
      ] } }));
    });
  },
});

export { expect };
