---
title: Kymo Editor (editor.kymo.studio) — Implementation Plan
document_id: PLAN-KEDITOR-001
version: "0.4"
issue_date: 2026-06-12
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the live diagram editor (`packages/editor/`) and the kymo-mcp Worker (`packages/mcp/`)
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - TEST-KEDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - kymo-editor
  - cloudflare-pages
  - cloudflare-workers
  - d1
  - kroki
  - worklog
  - story-points
---

# Kymo Editor (editor.kymo.studio) — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `PLAN-KEDITOR-001` |
| Version           | 0.4 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (requirements), `DESIGN-KEDITOR-001` (design), `TEST-KEDITOR-001` (V&V) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3), authored retrospectively.** kymo-editor is **shipped**; this plan traces the delivered phases against git history and records the residual risks. **No VM, no render server** — a static Pages site + one serverless Worker (+ managed D1/KV/DO state).

---

## 1. Context

The kymo flowchart editor needed a home that was shareable, instant, and cheap to run, and a way for an LLM to author into it live — that was v0.1 (P0–P3): client-side wasm render on Cloudflare Pages plus one shared live room on a Worker. Using it immediately exposed the next gaps (`FEAT-KEDITOR-001` §A.1): one shared canvas can't serve two people, nothing is named or findable, real authors also write Mermaid/PlantUML/D2, and sharing must not require sign-in. P4–P9 grew the product around the same spine without adding any operated infrastructure.

## 2. Decision

Keep the v0.1 spine — client-side kymo render, static Pages hosting, one Worker. Add: Google identity (GIS in the browser, JWKS verification + OAuth-for-MCP on the Worker), **one Durable Object per diagram** with the random id as capability, **D1 as database of record** (DO storage for live state), workspaces, CodeMirror, kroki.io delegation for non-kymo kinds, and kroki-style `?s=` URL sharing for the account-free path. Defer: presence/comments, version history, cross-user server-side sharing, self-hosted kroki (`FEAT-KEDITOR-001` §C.11).

## 3. Architecture (overview)

Two deployables (see `DESIGN-KEDITOR-001` §1):

- **Pages static** — `packages/editor` esbuild SPA (code-split, wasm chunk lazy), deployed by `deploy-editor.yml` to project `kymo-editor` → editor.kymo.studio.
- **Worker** — `packages/mcp` (`EditorRoom` DOs + REST APIs + `KymoMCP` behind OAuth), deployed by `wrangler deploy` → **mcp.kymo.studio**; state in D1 (`kymo-editor`) + KV (`OAUTH_KV`) + DO storage.

## 4. Phased plan (retrospective — ✓ Shipped)

| Phase | Commits | Scope | SP | Status |
|-------|---------|-------|----|--------|
| P0 | `466db60` | First hosted editor — Cloudflare Pages + a `/api/render` Function. | 5 | ✓ Shipped (superseded) |
| P1 | `47ecb4c` | Server render on Hetzner (Python `render_kymo.py`) + SSH auto-deploy. | 8 | ✓ Shipped (superseded) |
| P2 | `0860ace` | **Client-side render** — drop the server; bundle the JS engine + wasm; deploy `dist/` to Pages. | 10 | ✓ Shipped |
| P3 | `7543db7` | **kymo-mcp Worker + live sync** — `EditorRoom` DO, WebSocket fan-out, single-room `set_diagram`/`get_diagram`. | 10 | ✓ Shipped |
| P4 | `58cca51`, `22c3b4d`, `af06100`, `334a8fb` | **Identity & multi-diagram** — Google OAuth for MCP + GIS sign-in in the editor; custom domain mcp.kymo.studio; one room per diagram, per-user index, persisted sign-in. Realises FR-KE-11/17/19 and the per-diagram revision of FR-KE-06..09. | 8 | ✓ Shipped |
| P5 | `6c94e17`, `ea9078d`, `6db561d`, `7464c8e`, `f0e6fc8`, `5e8dd0d`, `335e7b3`, `dcac702` | **React SPA + library** — SPA rewrite; `/diagrams` page (list/delete, focus-refresh); header rename; `edit_diagram` + richer `list_diagrams`; drop the default room; strong 16-char ids + lazy room creation + auto-title. Realises FR-KE-20..22 and the v0.2 FR-KE-08/10. | 13 | ✓ Shipped |
| P6 | `c8bd0e0`, `25c0e8f`, `94deff3`, `f209cc4`, `7c9b595`, `2ab494a`, `ec86ba1`, `5df7b4f`, `830536b`, `c93aa93` | **Brand & chrome** — kymo.studio light theme, brand loader/boot states, Export dropdown (SVG/PNG/source), lucide icons. Realises FR-KE-28/29 (with FR-KE-03). | 5 | ✓ Shipped |
| P7 | `7f76fd0`, `454b0f6`, `968428e`, `edd9a89` | **Workspaces, kroki kinds, CodeMirror** — workspace CRUD + move + switcher; 28 kroki kinds + per-kind samples; CodeMirror 6 with per-kind highlighting; draggable splitter. Realises FR-KE-13..16, FR-KE-23/24. | 10 | ✓ Shipped |
| P8 | `583520d`, `db5f996`, `2071161`, `de2269d`, `6520841` | **D1 database of record** — `diagrams`/`workspaces` tables, throttled snapshot upserts + disconnect flush, one-time KV→D1 migration, kind in the index/badges/broadcast; MCP server renamed `kymostudio` (0.4.x). Realises the v0.2 FR-KE-09, NFR-KE-04. | 8 | ✓ Shipped |
| P9 | `a3dae51` | **Kroki-style URL sharing** — deflate+base64url `?s=`/`?k=` codec, address-bar autosync, Share button. Realises FR-KE-25..27, NFR-KE-07. | 5 | ✓ Shipped |
| P10 | `51d08ec`, `a5ff7b5`, `6577011`, `607b156` | **Share popover & guest hardening** — kroki SVG sanitized with DOMPurify before DOM injection (incl. the foreignObject/`htmlLabels` follow-up); share popover with copy variants (Markdown link / kroki.io GET image URL) auto-copying on open. Realises `FR-RD-09` (`FEAT-KRENDER-001` v0.2) and the v0.2 `FR-SH-03` (`FEAT-KSHARE-001`). *(Post-decomposition: specified against module IDs.)* | 3 | ✓ Shipped |
| P11 | `ef02c04`, `3785a53` | **Share-link first-load perf + bench** — cold kroki share link ~4.3 s → ~2.4 s on Fast 4G: engine chunk on first kymo render only, `?s=`-seeded mount state, no-debounce first render, early kroki kick-off from the HTML shell, content-hash caching + immutable chunks + modulepreload; plus the online `benches/editor` quality/perf harness. Revises `FR-RD-01/02/05` (`FEAT-KRENDER-001` v0.3); bench folded into `TEST-KEDITOR-001` v0.4 Annex B; ADR-10. | 5 | ✓ Shipped |

P0/P1 are retained as history; the **shipped product is P2–P11**. The post-v0.2 commits `c83aa75` (session expiry + `/login`) and `127d68a` (navbar restructure) touch the `editor-live` / `editor-library` surfaces and await their own module re-baselines.

## 5. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| R1 | **Single shared room** — visitors collide on one canvas. | — | — | Superseded by per-diagram owner-scoped rooms (P4/P5). | Closed |
| R2 | **Hard-coded Worker host** in the client. | — | — | Custom domain mcp.kymo.studio (`af06100`); endpoints in `const.ts` are still literals, but the domain is stable. | Closed |
| R3 | **CDN icon dependency** — icons resolve from jsDelivr `@main`; a moved/renamed icon path breaks art. | Low | Low | Pin a tag instead of `@main` if churn becomes an issue. | Open |
| R4 | **README drift** — `packages/editor/README.md` still describes the retired Python/server stack (and now also predates the SPA). | High | Low | This spec is normative; sync or trim the README in a follow-up. | Open |
| R5 | **Engine drift** — a future `kymostudio` change alters rendered bytes. | Med | Low | Engine golden suites (`TEST-KEDITOR-001` §3); editor owns no goldens. | Open |
| R6 | **kroki.io dependency** — non-kymo kinds need a third-party service: outage breaks 28 kinds, and the **source text is POSTed off-device** (privacy). | Med | Med | Kymo kinds unaffected (local). Documented in ADR-6; self-hosting kroki is the escape hatch if availability/privacy requirements harden. | Open |
| R7 | **Google coupling** — sign-in, library, live sync, and MCP all hinge on GIS + one OAuth client id. | Low | Med | Signed-out authoring + `?s=` sharing keep the core usable through a Google outage; client id is config (`wrangler.jsonc` var + `const.ts`). | Open |
| R8 | **D1 schema out-of-band** — tables were provisioned manually; no migration file or backup policy in-tree. | Med | Med | Add a checked-in schema/migration file and enable D1 time-travel/backups; until then the schema is documented in `DESIGN-KEDITOR-001` §7. | Open |
| R9 | **ID token in query strings** (`/ws?id_token=…`, `/api/*?id_token=…`) — tokens can land in logs/proxies. | Low | Med | Tokens are short-lived (~1 h) and JWKS-verified; REST already accepts `Authorization: Bearer` — moving the WS handshake to a header/subprotocol is the follow-up. | Open |
| R10 | **No WebSocket auto-reconnect** — the SPA rewrite dropped v0.1's 2 s retry; after a drop, edits stay local-only (`⚡` gone) until the route/token changes. | Med | Med | The indicator makes the state visible; D1 flush-on-close bounds loss. Reinstating backoff-reconnect in `room.ts` is the standing follow-up. | Open |
| R11 | **Pages 4 h asset cache** could serve a stale bundle after deploy. | — | — | `build.sh` cache-busts JS/CSS URLs — a per-build timestamp originally; a **content hash** since P11 (unchanged deploys keep client caches; `chunks/*` immutable). | Closed |
| R12 | **No abort/timeout on kroki fetches** — a hung kroki.io request never resolves (status line can sit stale), and rapid typing stacks an un-cancelled request every 450 ms; the `renderSeq` guard only drops responses client-side, the requests themselves run to completion. | Med | Low | Add an `AbortController` (cancel the superseded request, ~20 s timeout) in `renderKroki` — standing code follow-up from the 2026-06-12 kroki review. | Open |
| R13 | **`kind` unvalidated server-side** — the Worker's `/set` and the MCP `new_diagram`/`edit_diagram` accept any string as `kind`; an agent typo mints a diagram that renders an error forever and badges the raw string. Not dangerous (the client `encodeURIComponent`s the kind into the kroki URL; unknown `?k=` already falls back to kymo), but inconsistent with the client-side allowlist. | Low | Low | Validate against the kind list in the MCP tools / `/set` — standing code follow-up from the 2026-06-12 kroki review. | Open |

## 6. Worklog / timeline

| Date (commit) | Work |
|---------------|------|
| `466db60` | Cloudflare Pages + `/api/render` Function (P0). |
| `47ecb4c` | Hetzner Python render + SSH auto-deploy (P1). |
| `0860ace` | Client-side wasm render, no server (P2). |
| `7543db7` | kymo-mcp Worker + live editor sync (P3). |
| 2026-06-10 | Authored spec set v0.1 (`FEAT/DESIGN/TEST/PLAN-KEDITOR-001`) for P2+P3. |
| `58cca51`…`334a8fb` | Google OAuth + sign-in, custom domain, multi-diagram per user (P4). |
| `6c94e17`…`dcac702` | React SPA, `/diagrams` library, rename, lazy create + auto-title, `edit_diagram` (P5). |
| `c8bd0e0`…`c93aa93` | Brand theme, loaders, Export menu (P6). |
| `7f76fd0`…`edd9a89` | Workspaces, kroki kinds + samples, CodeMirror + splitter (P7). |
| `583520d`…`6520841` | D1 store + KV→D1 migration, kind badges/broadcast, MCP rename (P8). |
| `a3dae51` | Kroki-style `?s=` URL sharing (P9). |
| 2026-06-12 | Re-baselined the spec set to v0.2 for P4–P9. |
| `51d08ec`…`a5ff7b5` | Kroki SVG sanitization (DOMPurify; foreignObject kept for Mermaid `htmlLabels`) (P10). |
| `6577011`…`607b156` | Share popover with copy variants; auto-copy on open (P10). |
| 2026-06-12 | Decomposed the spec into the umbrella + 5 modules (`FEAT-KEDITOR-001` v0.3 §B.7). |
| 2026-06-12 | Kroki-integration review: documented sanitization (`FR-RD-09`/ADR-9/TC-KE-24) + share popover (`FR-SH-03`/TC-KE-16), traced P10, opened R12/R13. |
| `ef02c04` | Share-link first load ~4.3 s → ~2.4 s (engine on first kymo render, early kroki kick-off, content-hash caching) (P11). |
| `3785a53` | `benches/editor` — online share-link first-load bench + 2026-06-12 research round (P11). |
| 2026-06-12 | Reconciled the spec set to P11 (`FEAT-KRENDER-001` v0.3, `DESIGN-KEDITOR-001` v0.4 ADR-10, `TEST-KEDITOR-001` v0.4 Annex B). |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial, retrospective plan. Traces P0→P3 against commits `466db60`/`47ecb4c`/`0860ace`/`7543db7`, marks the shipped product as P2+P3, and records risks R1–R5 (single room, hard-coded host, CDN icons, README drift, engine drift). |
| 0.2     | 2026-06-12 | Vũ Anh | **Extended the retrospective with P4–P9** (identity & multi-diagram, React SPA + library, brand & chrome, workspaces/kroki/CodeMirror, D1 store, URL sharing) with commit traces and SP. Risk register: **closed R1/R2/R11** (per-diagram rooms, custom domain, cache-busting), kept R3–R5, **added R6–R10** (kroki.io availability/privacy, Google coupling, out-of-band D1 schema, token-in-URL, no WS auto-reconnect). |
| 0.3     | 2026-06-12 | Vũ Anh | **P10 + kroki-review reconciliation.** Added phase **P10 — Share popover & guest hardening** (commits `51d08ec`/`a5ff7b5`/`6577011`/`607b156`, 3 SP): kroki SVG sanitization (`FR-RD-09`) + share popover (`FR-SH-03` v0.2); shipped product now P2–P10. Risk register: **added R12** (no abort/timeout on kroki fetches) and **R13** (`kind` unvalidated server-side) from the 2026-06-12 kroki-integration code review — both with named code follow-ups. Worklog extended (P10 commits, umbrella decomposition, this review). Noted `c83aa75`/`127d68a` as awaiting `editor-live`/`editor-library` re-baselines. |
| 0.4     | 2026-06-12 | Vũ Anh | **P11 traced.** Added phase **P11 — Share-link first-load perf + bench** (`ef02c04`/`3785a53`, 5 SP): engine chunk on first kymo render, early kroki kick-off, no-debounce first render, content-hash caching, online `benches/editor` harness; shipped product now P2–P11. R11 mitigation wording updated (timestamp → content hash). Worklog extended. Spec links: `FEAT-KRENDER-001` v0.3 (FR-RD-01/02/05), `DESIGN-KEDITOR-001` v0.4 (ADR-10), `TEST-KEDITOR-001` v0.4 (Annex B bench). |
