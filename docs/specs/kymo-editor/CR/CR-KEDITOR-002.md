---
title: "Kymo Editor CR-002 — Session lifetime: replace the raw Google ID token with a Worker-issued httpOnly session cookie (sliding 14d / absolute 30d)"
document_id: CR-KEDITOR-002
version: "1.0"
issue_date: 2026-06-17
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the kymo-editor authoring surface (`packages/editor/web/`) and the kymo-mcp Worker (`packages/mcp/`); security reviewers
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-KLIVE-001
  - FEAT-KEDITOR-001
  - FEAT-KEMCP-001
  - DESIGN-KEDITOR-001
  - PLAN-KEDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - kymo-editor
  - authentication
  - session
  - google-identity-services
  - id-token
  - refresh-token
  - http-only-cookie
  - samesite
  - csrf
  - session-lifetime
  - owasp
  - nist-800-63b
---

# CR-KEDITOR-002 — Session lifetime: a Worker-issued httpOnly session cookie

> Change-request against the baselined `kymo-editor` umbrella spec (module
> `FEAT-KLIVE-001`, identity/session clauses `FR-LV-01` / `FR-LV-10` / `NFR-LV-02`,
> mirrored on the umbrella as `FR-KE-17` / `FR-KE-21` / `NFR-KE-06`). Self-contained
> (motivation → findings → research → proposed change → amended clauses → acceptance
> → record), per the `CR/` one-file-per-CR convention. Cross-references use
> `document_id`, not file paths. **Status: Open** — proposal; no code changed yet.

## 1. Motivation

Signed-in sessions on editor.kymo.studio die **after ~1 hour** with a hard logout —
disruptive for a tool where a tab stays open across a working day. The ask: raise the
login lifetime to an industry-appropriate value.

The headline finding reframes the ask: **the 1-hour limit is not a tunable policy** —
it is the fixed lifetime of the Google **ID token**, which the editor currently uses
*directly* as its session credential. Google fixes ID-token `exp` at one hour and the
GIS "Sign in with Google" button (the editor's login) returns **no refresh token**, so
there is nothing to extend. The correct change is architectural: **verify the Google
identity once at login, then issue our own session** with a sensible lifetime — and,
in doing so, also remove the standing XSS exposure of keeping a bearer token in
`localStorage`.

## 2. Findings (current architecture, as-built)

| # | Fact | Evidence |
|---|------|----------|
| 1 | The login is GIS "Sign in with Google"; the returned **ID token** (`resp.credential`) is the *only* client credential. It is stored in `localStorage` (`kymo_idtoken`) and decoded client-side for display claims (no signature check client-side). | `FR-LV-01` (`FEAT-KLIVE-001`); `packages/editor/web/auth.tsx` (`gsiCallback` → `localStorage.setItem("kymo_idtoken", …)`) |
| 2 | **Every** browser API/WS call re-verifies that same Google ID token server-side against Google's JWKS (issuer + audience). There is no app session, no refresh token, no cookie. | `NFR-LV-02`; `packages/mcp/src/index.ts` `verifyGoogleIdToken()` (JWKS `oauth2/v3/certs`), called on `/api/*`, `/ws`, `/userws` |
| 3 | A client **watchdog** fires ~30 s before the ID token's `exp` and calls `expireSession()` (clear token, route to `/login`); a 401 on an auth-walled route does the same. With no refresh, this is a **hard logout at ~1 h**. | `FR-LV-10`; `auth.tsx` `setTimeout(expireSession, exp*1000 − now − 30000)` |
| 4 | Google ID tokens expire one hour after creation and **the expiration cannot be changed**; the GIS button/One-Tap credential carries no refresh token (a refresh token only comes from the OAuth 2.0 authorization-**code** flow with offline access — a different, server-side flow). | [Google Cloud — Token types](https://cloud.google.com/docs/authentication/token-types); [Managing ID token expiration](https://groups.google.com/g/firebase-talk/c/rjR0zYiiEhM) |

Two problems follow: **(a)** sessions cannot outlive 1 h without a refresh mechanism;
**(b)** a bearer token in `localStorage` is readable by any successful XSS, i.e. the
credential is directly exfiltratable (the editor renders third-party-authored SVG; cf.
the sanitization requirement `NFR-KE-06` / `FR-RD-09` — the threat surface is real).

## 3. Industry research (best-practice session lifetimes)

| Source | Idle / inactivity | Absolute (force re-auth) | Note |
|--------|-------------------|--------------------------|------|
| **OWASP** Session Management Cheat Sheet | 15–30 min (low-risk apps); 2–5 min (high-value) | 4–8 h for a full-workday app | timeouts enforced **server-side**; tune to data sensitivity. [link](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) |
| **NIST SP 800-63B**, AAL1 (single-factor — the editor's case: Google only, no MFA) | optional (not required) | **≤ 30 days** reauthentication | [link](https://pages.nist.gov/800-63-4/sp800-63b.html) |
| **NIST SP 800-63B**, AAL2 (with MFA) | 30 min | 12 h | not applicable unless the editor enforces MFA |
| **Auth0 / Okta** (typical SPA) | short access token (~15–60 min) + **rotating refresh token**, idle renewed per exchange | refresh-token absolute e.g. **30 days** | rotation + reuse-detection make refresh tokens safe in SPAs. [link](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-expiration) |

Peer products in the same risk class (developer/productivity tools where a tab is kept
open for hours/days — GitHub, Figma, VS Code) run **multi-week sliding sessions**, not
hourly logouts. The editor's login is **single-factor** ⇒ AAL1 ⇒ the 30-day
reauthentication ceiling is the governing bound; a sliding idle window of a couple of
weeks is comfortable and conventional.

## 4. Proposed change (not yet implemented)

Verify Google **once** at login; the session of record becomes a **Worker-issued,
opaque, httpOnly cookie** backed by a server session store. The access layer stays
short-lived; the *session* is what gets the long, sliding lifetime.

### 4.1 Lifetimes (the answer to "how long")

| Layer | Value | Rationale |
|-------|-------|-----------|
| Access (per-request auth) | **~1 h** | unchanged in spirit; OWASP/Auth0 both favour short access validity |
| Session **idle / sliding** | **14 days** | renewed on use; matches peer dev-tools, well within AAL1 |
| Session **absolute cap** | **30 days** | NIST AAL1 ceiling; at the cap, re-verify via Google. (90 d is defensible for lower friction, but 30 d is the safe default.) |

User-visible effect: **sign in once, stay signed in for ~2 weeks of inactivity** (≤ 30
days total), with the access layer refreshed transparently — no more "Session expired"
mid-edit.

### 4.2 Mechanism (option **A** — httpOnly session cookie; recommended)

editor.kymo.studio and mcp.kymo.studio share the registrable domain **`kymo.studio`**,
so one cookie spans both.

- **Login.** GIS button → `POST credential` to a new Worker endpoint (e.g.
  `/api/session`) → existing `verifyGoogleIdToken()` (JWKS, iss+aud) → create a session
  record → set cookie. The Google ID token is **discarded** after verification (never
  persisted in JS).
- **Cookie.** `__Secure-kymo_sess=<256-bit random id>`; `Domain=kymo.studio`; `Path=/`;
  `HttpOnly`; `Secure`; `SameSite=Lax`; `Max-Age` = idle window (renewed). (`__Host-` is
  rejected: it forbids `Domain`, so it can't be shared cross-subdomain.) `SameSite=Lax`
  still sends the cookie on editor→mcp **same-site** subresource requests.
- **Session store.** D1 table `sessions(id_hash PK, email, created_at, last_seen_at,
  expires_at, ua, revoked_at)` — D1 is already the DB of record (auditable; enables
  "sign out everywhere"). Store the **SHA-256 of the id**, not the id (DB leak ≠ session
  theft). Idle renewal bumps `last_seen_at`/`expires_at` + re-sets the cookie, **throttled**
  (≤ once/day) to avoid write amplification; reject when `now > created_at + 30 d`.
- **Resolve.** Every `/api/*`, `/ws`, `/userws` reads the cookie → session → `email`,
  replacing the per-call raw-ID-token verify (`verifyGoogleIdToken` stays, but only on the
  login exchange). The WS `?id_token=` query param is dropped in favour of the cookie.
- **CORS + credentials.** Editor `fetch`/WebSocket use `credentials:"include"`; the Worker
  replies `Access-Control-Allow-Origin: https://editor.kymo.studio` (exact) +
  `Access-Control-Allow-Credentials: true`.
- **CSRF.** A cookie credential needs CSRF defence on state-changing calls: `SameSite=Lax`
  blocks cross-site top-level POSTs; additionally **require an `Origin` allow-list check**
  (and/or a custom request header that forces a CORS preflight) on mutations.
- **Logout / revocation.** Logout deletes the session row + clears the cookie; "sign out
  everywhere" deletes all rows for the `email` — capabilities the current stateless token
  cannot offer.

### 4.3 Out of scope / unaffected

- **MCP OAuth (`FR-MC-02`, `FEAT-KEMCP-001`).** The Claude/agent path is a separate OAuth
  authorization-**code** flow (`/authorize` → `/token` → `/register`) with its own token
  lifecycle; this CR changes only the **browser editor** session. They must not be
  conflated.
- **Signed-out authoring (`FR-LV-02`).** Fully usable with no account — unchanged.
- **Localhost dev-login.** The client-only fake-JWT bypass (localhost, `LOCAL` mode, no
  control channel) stays as-is — there is no `kymo.studio` cookie domain locally; note it,
  don't wire it to the Worker.

### 4.4 Migration

Dual-accept during rollout: the Worker accepts **either** the new session cookie **or** the
legacy `id_token` (query/Bearer) for a deprecation window; ship the Worker first, then the
editor (switch to cookie + `credentials:"include"`, drop the `localStorage` token + the
client watchdog), then remove the legacy path. No data migration (sessions are new rows).

## 5. Baseline clauses touched

| Clause | Doc | Change (on close) |
|--------|-----|-------------------|
| `FR-LV-01` | `FEAT-KLIVE-001` | The Google ID token is verified **once at login**; the session of record is a **Worker-issued httpOnly cookie**, not a `localStorage` token. The account footer/sign-out stay. |
| `FR-LV-10` | `FEAT-KLIVE-001` | The client token-`exp` watchdog is **removed** (no token in JS to watch); session lifetime is **server-side** (sliding 14 d / absolute 30 d). A 401 → `/login?next=…` redirect is retained; a draft survives expiry. |
| `NFR-LV-02` | `FEAT-KLIVE-001` | Add: session cookie is `HttpOnly`/`Secure`/`SameSite=Lax`, `Domain=kymo.studio`; session ids are **hashed at rest**; **CSRF** defence (Origin allow-list / preflight) on mutations; per-session **revocation**. Google JWKS verification retained (login exchange only). |
| `FR-KE-17` / `FR-KE-21` | `FEAT-KEDITOR-001` | Umbrella mirror of the `FR-LV-01` / `FR-LV-10` amendments. |
| `NFR-KE-06` | `FEAT-KEDITOR-001` | Umbrella mirror of the `NFR-LV-02` security additions. |
| Risk register | `PLAN-KEDITOR-001` | Add **R18** (bearer token in `localStorage` → XSS-exfiltratable) and **R19** (1 h hard logout / no refresh → session lost mid-work). |
| ADR | `DESIGN-KEDITOR-001` | New ADR: *Worker-issued httpOnly session cookie* (supersedes the raw-ID-token-as-session decision behind ADR-18's expiry watchdog). |

No requirement text is amended while this CR is **Open**; the re-baseline (clause wording +
module Annex A bumps) happens when the change lands and the CR is Closed.

## 6. Acceptance / verification

- **Login sets the session.** GIS sign-in → `Set-Cookie: __Secure-kymo_sess=…; HttpOnly;
  Secure; SameSite=Lax; Domain=kymo.studio`; a `sessions` row exists (id stored hashed);
  `localStorage` holds **no** `kymo_idtoken`.
- **Cross-subdomain auth.** An editor `fetch(mcp.kymo.studio/api/…, {credentials:"include"})`
  and the `/ws` upgrade authenticate from the cookie alone (no `?id_token=`).
- **Idle (sliding).** A request after < 14 d of inactivity renews the session (cookie
  `Max-Age`/`expires_at` advance, throttled); after > 14 d idle → 401 → `/login`.
- **Absolute cap.** Past `created_at + 30 d`, the session is rejected regardless of activity
  → re-auth via Google.
- **Logout / revoke.** Logout clears the cookie + deletes the row; "sign out everywhere"
  invalidates other sessions for the same `email`.
- **CSRF.** A cross-site forged POST without the editor `Origin` is refused.
- **No regressions.** Signed-out authoring (`FR-LV-02`), `?s=` share links, export, and the
  MCP OAuth path (`FR-MC-02`) are unchanged. The `welcome`/auth E2E specs pass; SVG
  sanitization (`NFR-KE-06`) unchanged.

## 7. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-17 | Vũ Anh | **Opened.** Root-caused the 1 h logout to the Google **ID token used directly as the session** (fixed 1 h, no refresh token from GIS). Researched best-practice lifetimes (OWASP / NIST 800-63B AAL1 / Auth0). Proposed option **A**: verify Google once → Worker-issued httpOnly session cookie, **sliding 14 d / absolute 30 d**, D1-backed, with CSRF + revocation; also closes the `localStorage`-token XSS exposure. Filed R18/R19 in `PLAN-KEDITOR-001`. Code is a follow-up; CR stays Open until it lands and the baseline is re-based. |

## Annex A — Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-17 | Vũ Anh | Initial — session-lifetime CR. Finding: the 1 h limit is the Google ID-token lifetime (GIS gives no refresh token), not a tunable policy. Researched OWASP / NIST 800-63B / Auth0 lifetimes. Proposed Worker-issued httpOnly session cookie (`Domain=kymo.studio`, `SameSite=Lax`), sliding 14 d / absolute 30 d, D1 session store with hashed ids + CSRF + revocation; migration via dual-accept. Identified `FR-LV-01`/`FR-LV-10`/`NFR-LV-02` (+ umbrella mirrors) as the clauses to re-base; opened R18/R19 in `PLAN-KEDITOR-001`. Status Open. |
