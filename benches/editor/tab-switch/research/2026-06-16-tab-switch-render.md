# Tab-switch render cost — analysis & how we benched it (2026-06-16)

## Question

Multi-tab editing shipped (PR #468). When a user switches **back** to an
already-open tab, is the work reused, or redone? And why does VS Code feel
instant where this doesn't?

## What the editor does today (two "effects", both cold on every switch)

The active tab drives everything via `activeTab` (= `d`). Switching it triggers
two independent cold paths:

1. **File-content load — `useRoom` (`web/room.ts:16–42`).** The hook is keyed on
   `[roomId]`. On a switch it `ws.close()`s the old room and opens a **new
   WebSocket** to `wss://api.kymo.studio/ws?d=<new>`, then waits for the server's
   `{type:"doc"}` snapshot before content paints. Meanwhile the per-room reset
   effect (`web/EditorPage.tsx`, keyed on `[d]`) sets `source = SAMPLE/""`, so
   there's a transient flash. Only **one** room is connected at a time — switching
   also drops the previous tab's live-sync.

2. **Render — `doRender` (`web/EditorPage.tsx`).** Keyed on `[source, kind]`,
   debounced (kymo 120 ms / kroki 450 ms, first paint 0 ms), `renderSeq` cancels
   stale renders. No per-tab SVG cache: when the source arrives it re-renders from
   scratch — kymo via wasm, mermaid via mermaid.js, **kroki via a network
   `POST render.kymo.studio/<kind>/svg`**.

Net: every tab activation pays a WS round-trip (content) + a re-render (compute or
network). Switching back to a tab you just viewed redoes both.

## Why VS Code is instant (the gap)

- **Model in RAM per tab.** Each open file keeps a `TextModel` for the tab's
  lifetime; switching re-points the view at the cached model — no disk read, no
  re-parse, no network.
- **Decoupled model ↔ view**, per-editor view-state (scroll/cursor) restored
  instantly; **virtualized** line rendering.
- **Preview kept alive when hidden** (webview `retainContextWhenHidden`) — the
  rendered output survives a hide, so switching back doesn't re-render.
- **Zero network on switch.**

kymo's CodeMirror source pane is already virtualized (≈ Monaco). The gap is the
two missing in-RAM caches: **document content** (fetched over WS each switch) and
**rendered SVG** (recomputed/re-fetched each switch).

## Measurements

### Manual network trace (prod, DevTools) — the proof

Open C4 → open a kymo file → switch **back** to C4 produced **two** separate
`POST render.kymo.studio/c4plantuml/svg` (reqid 30 then 40): 751 ms cold (kroki
render) then 184 ms (edge-cache hit — but still a full round-trip). Switching back
re-fetches; the immutable edge cache only softens it.

### Automated bench (`bench.py`, prod, signed-in, reps=3)

| diagram | kind | phase | render_ms | render_reqs |
|---|---|---|---|---|
| C4 System Context | c4plantuml | cold | 257 | 1 |
| C4 System Context | c4plantuml | **warm** | 188 | **1** |
| MCP live-sync sequence | mermaid | cold | 213 | 0 |
| MCP live-sync sequence | mermaid | warm | 33 | 0 |
| React OK | kymo | cold/warm | 1 | 0 |

**Metric of record: `c4plantuml` warm `render_reqs = 1`** — switch-back re-fetches
every time. mermaid/kymo render in-browser (0 reqs; warm mermaid 33 ms = chunk
already warm). A per-tab `(kind+source) → svg` cache should drive warm
`render_reqs → 0` and warm `render_ms → ~0` for all kinds.

> Measurement note: an early version detected "render done" via the `.status`
> tooltip changing — it returned **before** the network re-fetch landed and
> undercounted (`c4 warm` wrongly showed 0 reqs). Counting `render.kymo.studio`
> POSTs over a **fixed settle window** after the click is the reliable probe.

## Proposed fix

Add two in-RAM, per-tab caches (the VS Code model):

- `Map<id, {source, kind, title}>` — paint cached content on switch **instantly**;
  reconnect the WS in the **background** only to resume live-sync/reconcile.
- `Map<id|(kind+source), svg>` — paint the cached SVG on switch-back; skip the
  wasm re-run / kroki re-fetch entirely.

Biggest win is the kroki kinds (removes the per-switch network round-trip).

---

# How to benchmark a LOGIN-REQUIRED feature on production (research)

The tab strip only exists for a **signed-in owner**, and prod verifies the Google
`id_token` server-side (the localhost dev-token is 401'd). So benching it needs a
real authenticated session. Patterns, by fit:

1. **Playwright `storageState` (used here).** Log in once, save
   cookies+localStorage (incl. `kymo_idtoken`) to a file, reuse it via
   `new_context({ storageState })` — no repeated login, stable. The official
   pattern for browser-driven testing/benching of logged-in pages.
   ([Playwright Auth](https://playwright.dev/docs/auth),
   [BrowserStack](https://www.browserstack.com/guide/playwright-storage-state))
2. **Token injection** for API load (k6/Artillery): obtain a token in `setup()`,
   send `Authorization: Bearer <token>` (or `__ENV.TOKEN`).
   ([Grafana k6 OAuth](https://grafana.com/blog/2020/09/17/how-to-load-test-oauth-secured-apis/),
   [k6 OAuth example](https://k6.io/docs/examples/oauth-authentication))
3. **Avoid automating the Google login UI** — bot-detection, 2FA, brittle, ToS.
   Use programmatic login via token instead.
   ([Cypress Google auth](https://docs.cypress.io/app/guides/authentication-testing/google-authentication))

### Getting a Google `id_token` (kymo specifics, ~1h TTL)

- **Local / one-off:** capture `storageState` after a real login; valid ~1h,
  re-capture per run. ← what this bench does (`.auth/state.json`, gitignored).
- **CI:** mint a long-lived **refresh token** once via the
  [OAuth 2.0 Playground](https://developers.google.com/identity/protocols/oauth2)
  for a dedicated test account (in `ALLOWED_EMAILS`), store as a secret, exchange
  refresh→id_token in `setup()`, inject into `localStorage.kymo_idtoken` before
  navigation. (Google: ≤100 refresh tokens / account / client; new invalidates
  oldest.)
- **Lighthouse/WebPageTest:** inject the token via `extraHeaders`/cookies, or
  drive with Puppeteer + `disableStorageReset` to keep the session.
  ([Lighthouse authenticated pages](https://ethcar.github.io/lighthouse/docs/authenticated-pages.html))

### Key insight: split auth from the cost you actually measure

The expensive thing here — the **`render.kymo.studio/<kind>/svg` round-trip** — is
on a **public, unauthenticated** endpoint. So:

| Measure | Auth? | Tool |
|---|---|---|
| kroki render cost (cold vs edge-hit, p50/p95) | ❌ | k6/curl straight at `render.kymo.studio` |
| full tab-switch UX (re-render/re-fetch on switch-back) | ✅ | Playwright + `storageState` |

The gateable, deterministic part needs **no login**; only the UX-in-the-real-shell
part does. Capture auth narrowly, keep the credential out of git, and treat the
authenticated numbers as a dated snapshot (token-, network-, edge-cache-dependent).

## Sources

- [Playwright Auth / storageState](https://playwright.dev/docs/auth)
- [k6 — load testing OAuth-secured APIs](https://grafana.com/blog/2020/09/17/how-to-load-test-oauth-secured-apis/) · [k6 OAuth example](https://k6.io/docs/examples/oauth-authentication)
- [Cypress — Google authentication (programmatic, refresh token)](https://docs.cypress.io/app/guides/authentication-testing/google-authentication)
- [Google — Using OAuth 2.0 to access Google APIs](https://developers.google.com/identity/protocols/oauth2)
- [Lighthouse — running on authenticated pages](https://ethcar.github.io/lighthouse/docs/authenticated-pages.html)
