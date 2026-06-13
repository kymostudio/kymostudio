---
title: Kymo Editor (editor.kymo.studio) — Implementation Plan
document_id: PLAN-KEDITOR-001
version: "0.6"
issue_date: 2026-06-14
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
| Version           | 0.6 |
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

Three deployables (see `DESIGN-KEDITOR-001` §1):

- **Pages static** — `packages/editor` esbuild SPA (code-split, kymo-wasm + Mermaid chunks lazy), deployed by `deploy-editor.yml` to project `kymo-editor` → editor.kymo.studio.
- **kymo-mcp Worker** — `packages/mcp` (`EditorRoom` DOs + REST APIs incl. folders/Trash + `KymoMCP` behind OAuth + a daily purge cron), deployed by `wrangler deploy` → **mcp.kymo.studio**; state in D1 (`kymo-editor`) + KV (`OAUTH_KV`) + DO storage.
- **render.kymo.studio Worker** — `packages/render-api` (`FEAT-KRAPI-001`), the Kroki-compatible render service the editor delegates non-kymo, non-Mermaid rendering to (kroki.io fallback). Deployed and planned separately; in scope here only as the dependency the editor calls.

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
| P12 | `d60cfd0`, `bfc287c`, `07f7d9a`, `2ff6d68` | **render.kymo.studio delegation** — non-kymo rendering moved off direct kroki.io to the dedicated **render.kymo.studio** Worker (`FEAT-KRAPI-001`): `Bearer` ID token for the signed-in rate tier, transparent kroki.io fallback, wasm shipped as its own asset, kind-note copy updated. (A short-lived caching `/api/render` proxy on the mcp Worker — `d60cfd0` — was superseded by the standalone render Worker; R14.) Revises `FR-KE-13`/`FR-RD-05`; ADR-11. | 5 | ✓ Shipped |
| P13 | `9b9fb62`, `9059021`, `a919cbc`, `4f544ac` | **In-browser Mermaid** — Mermaid renders client-side: a Rust *merman* slice (`kymo-mermaid` wasm) for plain flowcharts, `mermaid.js` (one prebundled chunk) for the rest, kroki demoted to a warm-up race; `mermaid` pinned `~11.15` to the merman rev. Revises `FR-RD-05`; ADR-12. | 8 | ✓ Shipped |
| P14 | `744acf2`, `992e1bd`, `b2a9965` | **Zoom/pan preview + thumbnails + auto-title** — pan/zoom preview pane (fit, wheel/pinch/drag), server-rendered library thumbnails, auto-title from source, draft-as-not-a-boot-state fix. Realises `FR-RD-11`, `FR-LB-07`; ADR-17. | 5 | ✓ Shipped |
| P15 | `118771d`, `cef139b`, `9197fb2`, `3e0608d`, `aaafc69`, `57f1115`, `531b5c7` | **Template gallery + draft-first** — **+ New** opens a diagram-type gallery (quick filter); templates start as **drafts** that save on intent (no server document until Save); navbar trims (drop Diagrams/Docs duplicates); empty-room-snapshot kind fix; warm the render cache when Share opens. Realises `FR-LB-02`, `FR-LV-08`; ADR-15. | 8 | ✓ Shipped |
| P16 | `c5bbc7e`, `b38904d`, `d7bed20`, `2e80d9d`, `127d68a` | **VSCode shell + folder tree** — flat workspaces replaced by a **nested folder tree**; a VSCode-style **activity bar** with Explorer / Search / Templates panels; mobile-first navbar rework + restructure around the actual hierarchy. Realises `FR-LB-04` (re-baselined), `FR-LB-06`; ADR-13/16. | 10 | ✓ Shipped |
| P17 | `3ddfc92`, `effd174`, `e0e6f73`, `c83aa75`, `d428fb0` | **Soft delete + Trash + session expiry** — draft-first save model; **soft delete** + styled confirm modal; **Trash** with restore + 30-day auto-purge (cron `0 3 * * *`); expire stale sessions + **`/login`**; avatar fix. Realises `FR-LB-08`, `FR-LV-09`, `FR-LV-10`; ADR-14/18. | 8 | ✓ Shipped |

P0/P1 are retained as history; the **shipped product is P2–P17**. P12–P17 are the **second growth pass** (re-baselined into the spec set v0.4/v0.5). The previously-flagged commits `c83aa75` (session expiry + `/login`) and `127d68a` (navbar restructure) are now folded into P17 / P16. The render.kymo.studio Worker itself (incl. `450c14b`, its two-tier rate limit) is planned under `FEAT-KRAPI-001`, not here.

## 5. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|----|------|-----------|--------|------------|--------|
| R1 | **Single shared room** — visitors collide on one canvas. | — | — | Superseded by per-diagram owner-scoped rooms (P4/P5). | Closed |
| R2 | **Hard-coded Worker host** in the client. | — | — | Custom domain mcp.kymo.studio (`af06100`); endpoints in `const.ts` are still literals, but the domain is stable. | Closed |
| R3 | **CDN icon dependency** — icons resolve from jsDelivr `@main`; a moved/renamed icon path breaks art. | Low | Low | Pin a tag instead of `@main` if churn becomes an issue. | Open |
| R4 | **README drift** — `packages/editor/README.md` still describes the retired Python/server stack (and now also predates the SPA). | High | Low | This spec is normative; sync or trim the README in a follow-up. | Open |
| R5 | **Engine drift** — a future `kymostudio` change alters rendered bytes. | Med | Low | Engine golden suites (`TEST-KEDITOR-001` §3); editor owns no goldens. | Open |
| R6 | **kroki.io dependency** — non-kymo kinds need a third-party service: outage breaks them, and the **source text is POSTed off-device** (privacy). | Low | Low | **Largely mitigated (P12/P13):** the editor now delegates to its own **render.kymo.studio** Worker (`FEAT-KRAPI-001`) which renders the workerd-capable kinds at the edge and only **falls back** to kroki.io; **Mermaid renders fully in-browser** (no third party at all). Residual: the kinds render.kymo.studio still proxies to kroki.io carry the original coupling/privacy note. ADR-6 (superseded by ADR-11/12). | Mitigated |
| R7 | **Google coupling** — sign-in, library, live sync, and MCP all hinge on GIS + one OAuth client id. | Low | Med | Signed-out authoring + `?s=` sharing keep the core usable through a Google outage; client id is config (`wrangler.jsonc` var + `const.ts`). | Open |
| R8 | **D1 schema out-of-band** — tables were provisioned manually; no migration file or backup policy in-tree, and the v0.4 columns (`parent_id`, `deleted`, `thumb`) are added at runtime by idempotent `ensure*Column()` helpers that swallow duplicate-column errors — schema drift is invisible to review. | Med | Med | Add a checked-in schema/migration file and enable D1 time-travel/backups; until then the schema is documented in `DESIGN-KEDITOR-001` §7. | Open |
| R9 | **ID token in query strings** (`/ws?id_token=…`, `/api/*?id_token=…`) — tokens can land in logs/proxies. | Low | Med | Tokens are short-lived (~1 h) and JWKS-verified; REST already accepts `Authorization: Bearer` — moving the WS handshake to a header/subprotocol is the follow-up. | Open |
| R10 | **No WebSocket auto-reconnect** — the SPA rewrite dropped v0.1's 2 s retry; after a drop, edits stay local-only (`⚡` gone) until the route/token changes. | Med | Med | The indicator makes the state visible; D1 flush-on-close bounds loss. Reinstating backoff-reconnect in `room.ts` is the standing follow-up. | Open |
| R11 | **Pages 4 h asset cache** could serve a stale bundle after deploy. | — | — | `build.sh` cache-busts JS/CSS URLs — a per-build timestamp originally; a **content hash** since P11 (unchanged deploys keep client caches; `chunks/*` immutable). | Closed |
| R12 | **No abort/timeout on kroki fetches** — a hung kroki.io request never resolves (status line can sit stale), and rapid typing stacks an un-cancelled request every 450 ms; the `renderSeq` guard only drops responses client-side, the requests themselves run to completion. | Med | Low | Add an `AbortController` (cancel the superseded request, ~20 s timeout) in `renderKroki` — standing code follow-up from the 2026-06-12 kroki review. | Open |
| R13 | **`kind` unvalidated server-side** — the Worker's `/set` and the MCP `new_diagram`/`edit_diagram` accept any string as `kind`; an agent typo mints a diagram that renders an error forever and badges the raw string. Not dangerous (the client `encodeURIComponent`s the kind into the render URL; unknown `?k=` already falls back to kymo), but inconsistent with the client-side allowlist. | Low | Low | Validate against the kind list in the MCP tools / `/set` — standing code follow-up from the 2026-06-12 kroki review. | Open |
| R14 | **Dead `/api/render` proxy on the mcp Worker** — the caching kroki proxy added in `d60cfd0` is superseded by the standalone render.kymo.studio Worker (`FEAT-KRAPI-001`); the editor no longer calls it, but it still ships and answers (extra attack/maintenance surface; duplicate kroki path). | Low | Low | Remove the route from `packages/mcp` once nothing depends on it (`FEAT-KRAPI-001` §C names this retirement). | Open |
| R15 | **Mermaid dual-path parity + version pin** — Mermaid renders via two engines (the `kymo-mermaid` *merman* slice for plain flowcharts, `mermaid.js` for the rest), and `kymo-mermaid` is pinned to `mermaid@~11.15`. A `mermaid.js` bump (or a source that straddles the routing heuristic) can render the **same diagram differently** on the two paths, and the pin must be advanced in lockstep with the merman rev. | Low | Med | Conservative routing (only plain, directive-free flowcharts take the slice; everything else and any slice error falls back to `mermaid.js`); keep the pin in lockstep; the `benches/editor` label-survival probe catches gross divergence. | Open |
| R16 | **Per-file room round-trip on the critical path** — opening a diagram (`?d=<id>`) tears down + reopens the `EditorRoom` WebSocket and **waits for the `onDoc` snapshot** before the source is known and the first render can fire (`web/room.ts` `useRoom`, `web/EditorPage.tsx` room-switch reset). So **rendering each file is slower than a native editor** (e.g. the VS Code extension) that reads the file from disk and renders in a warm in-process engine — the perceived slowness is this pre-render network wait, not the render step (`NFR-RD-01` still holds). Related to R10 (same socket lifecycle). | Med | Med | Render **optimistically** from a local/cached source on file-select and treat the snapshot as a reconcile (the `applyingRemote` guard already exists); **reuse one WebSocket** and switch rooms by message instead of reconnecting per `?d=`. Diagnosed in `CR-KEDITOR-001` (§3 P0). | Open |
| R17 | **Cold-start WASM on the first kymo render** — the engine chunk (~2.5 MB) is a dynamic import compiled on first use (`web/engine.ts`), so the first kymo render of a session is slower than the VS Code extension (engine inlined + `initSync` once at activation). | Low | Low | Conditionally prefetch/`modulepreload` the engine JS + `.wasm` when entering the editor route with a `?d=`/kymo intent (without breaking `FR-RD-01`'s "kroki/share sessions never fetch the wasm"), and warm `loadEngine()` at idle. `CR-KEDITOR-001` (§3 P1). | Open |

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
| `d60cfd0`…`2ff6d68` | render.kymo.studio delegation + caching proxy, kind-note copy (P12). |
| `9b9fb62`…`4f544ac` | In-browser Mermaid (kymo-mermaid slice + mermaid.js), kroki demoted to warm-up, `~11.15` pin (P13). |
| `744acf2`…`b2a9965` | Zoom/pan preview, library thumbnails, auto-title (P14). |
| `118771d`…`531b5c7` | Template gallery, draft-first save, quick filter, navbar trims, Share warm-up (P15). |
| `c5bbc7e`…`2e80d9d`, `127d68a` | Folder tree replaces flat workspaces; VSCode activity bar + Explorer/Search/Templates panels; navbar restructure (P16). |
| `3ddfc92`…`d428fb0`, `c83aa75` | Soft delete + styled confirm + Trash/restore + 30-day purge cron; session expiry + `/login` (P17). |
| 2026-06-13 | **Re-baselined the spec set to P17** (the second growth pass): `FEAT-KEDITOR-001` v0.4, `DESIGN-KEDITOR-001` v0.5 (ADR-11..18), `TEST-KEDITOR-001` v0.5 (TC-KE-25..32), this plan v0.5; module re-baselines (`editor-render`/`-library`/`-live`/`-share`/`-mcp`). Resolved the `FEAT-KRENDER-001` collision by re-id'ing the render Worker → `FEAT-KRAPI-001`. Opened R14 (dead `/api/render`) and R15 (Mermaid dual-path/pin). |
| 2026-06-14 | **Editor render-latency review (web vs VS Code extension).** Diagnosed why rendering each file on editor.kymo.studio is slower than the native VS Code extension: dominant cause is the per-file `EditorRoom` WebSocket round-trip on the critical path (+ cold-start WASM, kroki network, code-editor reinit); the VS Code extension reads from disk into a warm inlined engine. Opened `CR-KEDITOR-001` (umbrella `CR/`); added **R16** (per-file room round-trip) and **R17** (cold-start WASM). Code fixes (P0–P3) are follow-ups. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial, retrospective plan. Traces P0→P3 against commits `466db60`/`47ecb4c`/`0860ace`/`7543db7`, marks the shipped product as P2+P3, and records risks R1–R5 (single room, hard-coded host, CDN icons, README drift, engine drift). |
| 0.2     | 2026-06-12 | Vũ Anh | **Extended the retrospective with P4–P9** (identity & multi-diagram, React SPA + library, brand & chrome, workspaces/kroki/CodeMirror, D1 store, URL sharing) with commit traces and SP. Risk register: **closed R1/R2/R11** (per-diagram rooms, custom domain, cache-busting), kept R3–R5, **added R6–R10** (kroki.io availability/privacy, Google coupling, out-of-band D1 schema, token-in-URL, no WS auto-reconnect). |
| 0.3     | 2026-06-12 | Vũ Anh | **P10 + kroki-review reconciliation.** Added phase **P10 — Share popover & guest hardening** (commits `51d08ec`/`a5ff7b5`/`6577011`/`607b156`, 3 SP): kroki SVG sanitization (`FR-RD-09`) + share popover (`FR-SH-03` v0.2); shipped product now P2–P10. Risk register: **added R12** (no abort/timeout on kroki fetches) and **R13** (`kind` unvalidated server-side) from the 2026-06-12 kroki-integration code review — both with named code follow-ups. Worklog extended (P10 commits, umbrella decomposition, this review). Noted `c83aa75`/`127d68a` as awaiting `editor-live`/`editor-library` re-baselines. |
| 0.4     | 2026-06-12 | Vũ Anh | **P11 traced.** Added phase **P11 — Share-link first-load perf + bench** (`ef02c04`/`3785a53`, 5 SP): engine chunk on first kymo render, early kroki kick-off, no-debounce first render, content-hash caching, online `benches/editor` harness; shipped product now P2–P11. R11 mitigation wording updated (timestamp → content hash). Worklog extended. Spec links: `FEAT-KRENDER-001` v0.3 (FR-RD-01/02/05), `DESIGN-KEDITOR-001` v0.4 (ADR-10), `TEST-KEDITOR-001` v0.4 (Annex B bench). |
| 0.6     | 2026-06-14 | Vũ Anh | **Editor render-latency review reconciled.** Opened `CR-KEDITOR-001` (umbrella `CR/`) documenting why rendering each file on editor.kymo.studio is slower than the native VS Code extension — dominant cause the per-file `EditorRoom` WebSocket round-trip on the critical path (+ cold-start WASM, kroki network, code-editor reinit). Risk register: **added R16** (per-file room round-trip) and **R17** (cold-start WASM on first kymo render), both with named follow-ups (CR §3 P0/P1) and related to R10. `NFR-RD-01` (`FEAT-KRENDER-001`) confirmed to still hold (render step) — the gap is per-file-open latency, to be re-baselined when the fix lands. Worklog extended. No code changed. |
| 0.5     | 2026-06-13 | Vũ Anh | **Second growth pass traced (P12–P17).** Added **P12** render.kymo.studio delegation, **P13** in-browser Mermaid, **P14** zoom/pan preview + thumbnails, **P15** template gallery + draft-first, **P16** VSCode shell + folder tree, **P17** soft delete + Trash + session expiry; shipped product now **P2–P17** (44 SP added); `c83aa75`/`127d68a` folded in. §3 now three deployables (+ render.kymo.studio). Risk register: **R6 → Mitigated** (own render Worker + in-browser Mermaid; kroki.io demoted to fallback), **R8** wording updated (runtime `ensure*Column` migrations), **added R14** (dead mcp `/api/render` proxy) and **R15** (Mermaid dual-path parity + version pin). Resolved the `FEAT-KRENDER-001` document_id collision by re-id'ing the render Worker → `FEAT-KRAPI-001`. Worklog extended. Spec links: `FEAT-KEDITOR-001` v0.4, `DESIGN-KEDITOR-001` v0.5 (ADR-11..18), `TEST-KEDITOR-001` v0.5 (TC-KE-25..32). |
