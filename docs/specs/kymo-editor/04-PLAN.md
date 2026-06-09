---
title: Kymo Editor (editor.kymo.studio) — Implementation Plan
document_id: PLAN-KEDITOR-001
version: "0.1"
issue_date: 2026-06-10
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the live flowchart editor (`packages/editor/`) and the kymo-mcp Worker (`packages/mcp/`)
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
  - worklog
  - story-points
---

# Kymo Editor (editor.kymo.studio) — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `PLAN-KEDITOR-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (requirements), `DESIGN-KEDITOR-001` (design), `TEST-KEDITOR-001` (V&V) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3), authored retrospectively.** kymo-editor is **shipped**; this plan traces the delivered phases against git history and records the residual risks. It implements the spec in `docs/specs/kymo-editor/`. **No backend, no new runtime deps** — a static Pages site + one serverless Worker.

---

## 1. Context

The kymo flowchart editor needed a home that was shareable, instant, and cheap to run, and a way for an LLM to author into it live. Entry gates were already met: the `kymostudio` JS engine and the `kymostudio-core` wasm render `flowchart{}`/`bpmn{}` at parity, so the editor could be a thin shell with **no second renderer**. The legacy server stack (`packages/editor/README.md`: Python `render_kymo.py` behind `/api/render`, stdio `render_flowchart`) is **superseded** by the shipped client-side architecture (`DESIGN-KEDITOR-001` Annex A, ADR-1).

## 2. Decision

Render **client-side** (wasm in the browser, no roundtrip), host **static** on Cloudflare Pages, and run live sync + MCP on a **single Cloudflare Worker** with one `EditorRoom` Durable Object. Echo-suppress on both ends; persist the room's last source to DO storage. Defer all backend-implying features (auth, named rooms, history, presence).

## 3. Architecture (overview)

Two deployables (see `DESIGN-KEDITOR-001` §1):

- **Pages static** — `packages/editor` esbuild bundle (`dist/index.html` + `dist/app.js` with wasm inlined), deployed by `deploy-editor.yml` to project `kymo-editor` → editor.kymo.studio.
- **Worker** — `packages/mcp` (`EditorRoom` + `KymoMCP`), deployed by `wrangler deploy` → `kymo-mcp.anhv-ict91.workers.dev`, channels `/ws`,`/set`,`/get`,`/mcp`,`/sse`.

## 4. Phased plan (retrospective — ✓ Shipped)

| Phase | Commit | Scope | SP | Status |
|-------|--------|-------|----|--------|
| P0 | `466db60` | First hosted editor — Cloudflare Pages + a `/api/render` Function. | 5 | ✓ Shipped (superseded) |
| P1 | `47ecb4c` | Server render on Hetzner (Python `render_kymo.py`) + SSH auto-deploy. | 8 | ✓ Shipped (superseded) |
| P2 | `0860ace` | **Client-side render** — drop the server; bundle the JS engine + `kymostudio-core` wasm, render in-browser; deploy `dist/` to Pages. Realises FR-KE-01..05, NFR-KE-01..03. | 10 | ✓ Shipped |
| P3 | `7543db7` | **kymo-mcp Worker + live sync** — `EditorRoom` DO, WebSocket fan-out, `set_diagram`/`get_diagram` over `/mcp`+`/sse`; editor opens a reconnecting socket. Realises FR-KE-06..12, NFR-KE-04. | 10 | ✓ Shipped |

P0/P1 are retained as history; the **shipped product is P2 + P3**.

## 5. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | **Single shared room** — all visitors edit one canvas; concurrent unrelated users collide. | Med | Med | Acceptable for a demo/personal editor; named rooms deferred (`FEAT-KEDITOR-001` §C.5). Document the behaviour. |
| R2 | **Hard-coded Worker host** in `app.js` (`wss://kymo-mcp.anhv-ict91.workers.dev/ws`). | Low | Med | A custom domain / env-substitution at build time would decouple it; tracked as a follow-up. |
| R3 | **CDN icon dependency** — icons resolve from `jsDelivr @main`; a moved/renamed icon path breaks art. | Low | Low | Pin a tag instead of `@main` if churn becomes an issue. |
| R4 | **README drift** — `packages/editor/README.md` still describes the retired Python/server stack. | High | Low | This spec is the normative reference; sync or trim the README in a follow-up (out of scope here). |
| R5 | **Engine drift** — a future `kymostudio` change alters rendered bytes. | Med | Low | Covered by the engine's own golden suites (`TEST-KEDITOR-001` §3); editor inherits, owns no goldens. |

## 6. Worklog / timeline

| Date (commit) | Work |
|---------------|------|
| `466db60` | Cloudflare Pages + `/api/render` Function (P0). |
| `47ecb4c` | Hetzner Python render + SSH auto-deploy (P1). |
| `0860ace` | Client-side wasm render, no server (P2). |
| `7543db7` | kymo-mcp Worker + live editor sync (P3). |
| 2026-06-10 | Authored this spec set (`FEAT/DESIGN/TEST/PLAN-KEDITOR-001`) for the shipped system. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial, retrospective plan. Traces P0→P3 against commits `466db60`/`47ecb4c`/`0860ace`/`7543db7`, marks the shipped product as P2+P3, and records risks R1–R5 (single room, hard-coded host, CDN icons, README drift, engine drift). |
