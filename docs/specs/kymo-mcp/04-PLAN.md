---
title: kymostudio-mcp (local MCP render server) — Implementation Plan
document_id: PLAN-KMCP-001
version: "0.1"
issue_date: 2026-06-11
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers implementing `packages/mcp-server/` and wiring its release
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KMCP-001
  - DESIGN-KMCP-001
  - TEST-KMCP-001
  - RES-STRATEGY-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - mcp
  - npm
  - release
  - story-points
---

# kymostudio-mcp (local MCP render server) — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `PLAN-KMCP-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KMCP-001` (requirements), `DESIGN-KMCP-001` (design), `TEST-KMCP-001` (V&V), `RES-STRATEGY-001` (strategy — W1) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3), authored prospectively.** This is the
> delivery plan for workstream **W1** of `RES-STRATEGY-001`: the npx-installable local MCP
> render server. Entry gates are met — every parse/render capability exists in the JS engine +
> wasm core; the only engine change is an additive exposure (`DESIGN-KMCP-001` §5).

---

## 1. Context

`RES-STRATEGY-001` picked the MCP channel as the primary adoption bet, with rendering quality
(animated SVG, icons) as the differentiator every other diagram MCP server lacks. The current
local server depends on a Python checkout and is unshippable; the hosted Worker has no render
tools. The shortest path to "an agent anywhere can render through kymo" is a small stateless
npm package over the existing engine.

## 2. Decision

Build `packages/mcp-server/` → npm **`kymostudio-mcp`**: stdio-only, four tools
(`render_diagram`, `convert_diagram`, `search_icons`, env-gated `push_to_editor`), pure
Node + wasm, icons offline from the installed `kymostudio` package. Defer Worker render parity
and registry/launch motions to their own phases. Remove the superseded
`packages/editor/mcp-server.js` when P2 lands.

## 3. Architecture (overview)

One new deployable (see `DESIGN-KMCP-001` §1–2): the npm package, whose bin starts an MCP stdio
server; engine and wasm are ordinary npm deps. No infrastructure, no state. The hosted Worker
(`DESIGN-KEDITOR-001`) is untouched until P5.

## 4. Phased plan

| Phase | Scope | SP | Status |
|-------|-------|----|--------|
| P1 | **Engine exposure** — `parseD2`/`parseDot` wrappers in `packages/js` (`src/core.ts`, `src/index.ts`) over the existing wasm `*_to_kymojson` exports; icon-loader hook only if the `file://` base-URL route fails (`DESIGN-KMCP-001` §6); unit tests in the JS suite. Optional courtesy: `.d2`/`.dot` input wiring in `bin/render-cli.mjs`. | 3 | Planned |
| P2 | **Package + render path** — scaffold `packages/mcp-server/`; startup (wasm init, manifest load); grammar sniff + dispatch table; `render_diagram` (SVG/PNG, `output_path`, `scale`); error wrapping. Realises FR-KM-01..06, FR-KM-10. Remove `packages/editor/mcp-server.js` + its README references. | 8 | Planned |
| P3 | **Secondary tools** — `convert_diagram`, `search_icons`, env-gated `push_to_editor`. Realises FR-KM-07..09. | 5 | Planned |
| P4 | **V&V + docs** — `TEST-KMCP-001` unit/integration suites wired into CI alongside the per-package test jobs; package README with Claude Code / Claude Desktop / Cursor snippets; root README mention. | 5 | Planned |
| P5 | **Release wiring + publish** — package joins the lockstep version (update the `/kymo-bump` release tooling — it lives outside this repo and breaks tag CI if a version spot is missed); `kymostudio-core` dep pinned caret-to-MINOR; `docs/RELEASING.md` updated; first npm publish (name availability + provenance per the brand-new-package caveat in `docs/RELEASING.md`). | 3 | Planned |
| P6 | **Worker render parity** *(deferred)* — port the dispatch + render tools into the hosted `kymo-mcp` Worker so mcp.kymo.studio offers the full surface; align tool naming across local/hosted. | — | Deferred |
| P7 | **Registry & launch** *(deferred)* — MCP directory/registry listings, Kroki engine submission, README/website repositioning; executes with W4 of `RES-STRATEGY-001`. | — | Deferred |

Ship gate for v0.5: P1–P5 complete, `TEST-KMCP-001` §3 regression gates green.

## 5. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | **wasm cold-start cost** under npx makes hosts time out the `initialize` handshake. | Low | Med | Measure in TC-KM-17; if needed, lazy-init wasm on first render instead of startup (tools list needs no wasm). |
| R2 | **D2 expectation gap** — the core imports D2's *flowchart subset* (`FEAT-FLOWCHART-001`), not full D2; agents may submit unsupported constructs. | Med | Low | Say "flowchart subset" in the tool description; FR-KM-10 errors name the construct where the importer reports it. |
| R3 | **Icon resolution across package managers** — pnpm/yarn layouts may break `require.resolve`-relative `sets/` paths. | Med | Med | Resolve via `require.resolve('kymostudio/icons-manifest.json')` (exported file), never `node_modules` math; TC-KM-10 in CI on npm + pnpm installs. |
| R4 | **npm name `kymostudio-mcp` taken** at publish time. | Low | Med | Check before P2 settles docs; fallback `@kymostudio/mcp` scope (affects npx string everywhere — decide early). |
| R5 | **MCP SDK churn** — `@modelcontextprotocol/sdk` major versions move transport/tool APIs. | Med | Low | Pin a known-good major; integration tests (TC-KM-01..15) catch breakage on bump. |
| R6 | **Grammar mis-detection** routes source to the wrong parser and yields a confusing error. | Med | Low | Detection is override-able (`source_format`), result names the grammar (FR-KM-03), sniff order unit-tested (TC-KM-06). |
| R7 | **Lockstep/release miss** — new package skipped by the bump tooling → tag CI fails (the vscode-extension precedent). | Med | Med | P5 explicitly updates the bump tooling + `docs/RELEASING.md` before the first tagged release containing the package. |

## 6. Worklog / timeline

| Date | Work |
|------|------|
| 2026-06-11 | Authored this spec set (`FEAT/DESIGN/TEST/PLAN-KMCP-001`) ahead of implementation, per `RES-STRATEGY-001` W1. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-11 | Vũ Anh | Initial prospective plan: P1 engine exposure → P2 package/render → P3 secondary tools → P4 V&V/docs → P5 release wiring/publish; P6 Worker parity + P7 registry/launch deferred. Risks R1–R7 (wasm cold start, D2 subset, icon paths under pnpm, npm name, SDK churn, mis-detection, lockstep miss). |
