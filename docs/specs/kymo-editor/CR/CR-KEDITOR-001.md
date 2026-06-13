---
title: "Kymo Editor CR-001 — Per-file open latency vs a native (VS Code) editor: diagnosis & optimization plan"
document_id: CR-KEDITOR-001
version: "1.0"
issue_date: 2026-06-14
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the kymo-editor authoring surface (`packages/editor/web/`) and the kymo-mcp Worker (`packages/mcp/`); reviewers
review_cycle: Until closed (implemented + re-baselined, or rejected)
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KLIVE-001
  - DESIGN-KEDITOR-001
  - PLAN-KEDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - change-request
  - kymo-editor
  - performance
  - render-latency
  - websocket
  - durable-object
  - wasm
  - cold-start
  - code-editor
  - vscode-extension
  - optimistic-render
---

# CR-KEDITOR-001 — Per-file open latency vs a native (VS Code) editor

> Change-request against the baselined `kymo-editor` umbrella spec (modules
> `FEAT-KRENDER-001` + `FEAT-KLIVE-001`). Self-contained (motivation → findings →
> proposed change → amended clauses → acceptance → record), per the `CR/`
> one-file-per-CR convention. Cross-references use `document_id`, not file paths.
> **Status: Open** — this CR records a review finding on the shipped product and a
> proposed optimization plan; no code has been changed yet.

## 1. Motivation

A user observed that **opening/rendering each file** on editor.kymo.studio (the web
editor) feels slower than rendering the same diagram in a native "VS Code server"
surface (the kymostudio VS Code extension, `packages/vscode-extension`). An
architecture review was done to find the root cause and to confirm whether it
contradicts the render performance baseline (`NFR-RD-01`, `FEAT-KRENDER-001`).

The headline finding: **`NFR-RD-01` still holds** — the kymo *render step* itself is
tens-of-milliseconds and network-free once the engine is warm. The perceived slowness
is **per-file-open latency** that sits *before* the render step and is **not covered by
any current requirement**: opening a document blocks on a server round-trip the native
editor never pays.

## 2. Findings (diagnosis)

editor.kymo.studio is a static Cloudflare Pages SPA that syncs each document through a
*server room* (one Durable Object per diagram) on mcp.kymo.studio (`FEAT-KLIVE-001`,
`DESIGN-KEDITOR-001` §6). The VS Code extension renders in a persistent extension host
with the engine inlined and the file read from disk. Causes, ranked by impact:

| # | Cause | Impact | Evidence (`packages/editor/web/`) |
|---|-------|--------|-----------------------------------|
| 1 | **Per-file room round-trip on the critical path (dominant).** Changing `?d=<id>` tears down the old WebSocket and opens a **new** one to mcp.kymo.studio (the `useRoom` effect re-runs on `roomId`), then *waits for the `onDoc` snapshot* before the real `source` is known and the first render can fire. The native editor reads the file from disk instantly. | High | `room.ts:15`–`room.ts:32` (socket closed/reopened per `roomId`; render-able source arrives only via the `onDoc` message at `room.ts:24`–`room.ts:30`); room-switch state reset effect at `EditorPage.tsx:169`–`EditorPage.tsx:181` |
| 2 | **Cold-start WASM on the first kymo render.** The engine chunk (~2.5 MB) is a dynamic import compiled on first use; the extension `initSync`s an inlined engine once at activation, so its first render is already warm. | Med (once/session) | `engine.ts:12`–`engine.ts:16` (`ready ??= init(wasmUrl)…`) vs extension `src/render.ts:11`–`render.ts:20` (`initSync` + `coreReady`) |
| 3 | **Kroki kinds render over the network.** For the non-kymo, non-Mermaid kinds the editor POSTs to render.kymo.studio (fast only on an edge cache hit); the extension renders those locally with the same WASM, zero network. | Med (kroki kinds only) | `kroki.ts:123` (`POST {RENDER_API}/<kind>/svg`) |
| 4 | **Code-editor + React re-init per file.** Switching files builds a fresh code-editor instance (`new EditorView`) and resets per-room React state (debounce, refs), DOM/JS cost the native editor widget does not pay. | Low–Med | `codeeditor.tsx:131` (`new EditorView`); `EditorPage.tsx:169` (per-room reset) |

Control comparison — VS Code extension: engine inlined + `initSync` once
(`src/render.ts:11`–`render.ts:20`); one shared engine and one preview per file
(`src/preview.ts:20`–`preview.ts:22`); reads the file via `vscode.workspace` (no
network). It therefore pays **no per-file round-trip** — the gap is architectural
(collaborative server room + browser cold-starts), not a renderer defect.

Relationship to existing risk **R10** (no WebSocket auto-reconnect, `PLAN-KEDITOR-001`):
same `room.ts` surface — both argue for owning the socket lifecycle more deliberately.

## 3. Proposed change (not yet implemented)

Ordered by impact. Behaviour-preserving; the data-of-record stays the room/D1 snapshot.

- **P0 — remove the round-trip from the critical path (largest win).**
  - Render **optimistically** from a local/cached `source` the moment the file is
    selected, and treat the room's `onDoc` snapshot as a *reconcile* afterward (the page
    already has the `applyingRemote` guard in `EditorPage.tsx` to absorb a remote
    document without echoing it back as a user edit). Cache the last-known source per
    diagram id (`localStorage`/IndexedDB) to paint instantly on revisit.
  - **Reuse a single WebSocket** and switch rooms via a protocol message instead of
    closing/opening the socket on every `?d=` change (the `useRoom` effect's `roomId`
    dependency at `room.ts:32` is what forces the reconnect).
- **P1 — warm the engine early.** Conditionally `modulepreload`/prefetch the engine JS
  chunk + `.wasm` when entering the editor route with a `?d=` or `kind=kymo` (the build
  deliberately does *not* preload them today so kroki `?s=` share links don't pay for the
  wasm — `FR-RD-01`; gate the preload on intent), and kick off `loadEngine()` at idle
  after mount rather than on the first render.
- **P2 — trim per-file overhead.** Memoize `sanitizeSvg`/`titleFrom` by source hash;
  keep the `EditorView` and `reconfigure` the language compartment when only `kind`
  changes, instead of destroy/recreate (`codeeditor.tsx:131`).
- **P3 — kroki kinds.** Prefer the local WASM path for kroki kinds the engine already
  supports, falling back to render.kymo.studio only when needed.

## 4. Baseline clauses touched

| Clause | Doc | Change |
|--------|-----|--------|
| `NFR-RD-01` | `FEAT-KRENDER-001` | Clarify (on close) that it bounds the **render step** (tens-of-ms, network-free) and add a **per-file-open latency** budget covering the time from file-select to first paint — the gap this CR identifies. Unchanged until a fix lands. |
| Risk register | `PLAN-KEDITOR-001` | Add **R16** (per-file room round-trip on the critical path) and **R17** (cold-start WASM on first kymo render). Relate to existing **R10** (no WS auto-reconnect) — same `room.ts` lifecycle. |

No requirement text is amended by this CR while it is Open; the re-baseline (NFR-RD-01
wording + module Annex A bumps) happens when a fix is implemented and this CR is Closed.

## 5. Acceptance / verification

- **Measure (web).** Chrome DevTools Performance trace on a file switch; mark
  `navigate → onDoc received (WS) → doRender start → setSvg`. The `statusTitle`
  already prints `<bytes> · <ms>` (`EditorPage.tsx:151`) for the render step. Confirm in
  the Network (WS) panel whether a socket reconnects on each `?d=` change, and whether the
  `chunks/engine-*.js` + `.wasm` are preloaded on a kymo session.
- **Baseline (control).** Same diagram in the VS Code extension; measure
  edit/open → SVG shown (`src/preview.ts:106`).
- **Target (after P0+P1).** "File switch → preview" latency approaches the warm WASM
  render time (~tens of ms for a small diagram), with the WS-wait removed from the
  critical path and the first kymo render no longer paying the chunk download/compile.
- **No regressions.** Documentation-only CR; no golden/byte fixtures are touched. A
  follow-up code change must keep the room as the data-of-record and respect `FR-RD-01`
  (kroki/share sessions must still never fetch the kymo wasm).

## 6. Change record

| Date | Actor | Decision |
|------|-------|----------|
| 2026-06-14 | Vũ Anh | **Opened.** Architecture review of editor.kymo.studio vs the VS Code extension; root cause = per-file room round-trip (+ cold WASM, kroki network, code-editor reinit). Filed R16/R17 in `PLAN-KEDITOR-001`. Code fixes (P0–P3) are follow-ups; this CR stays Open until they land and the baseline is re-based. |

## Annex A — Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-14 | Vũ Anh | Initial — per-file open latency review (web vs VS Code extension). Diagnosis ranked by impact with `file:line` evidence; proposed P0–P3 optimization plan; identified the `NFR-RD-01` gap (render-step vs per-file-open latency); opened R16/R17 in `PLAN-KEDITOR-001`. Status Open. |
