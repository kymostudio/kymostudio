---
title: kymostudio-mcp (local MCP render server) — Verification & Validation
document_id: TEST-KMCP-001
version: "0.1"
issue_date: 2026-06-11
status: Draft
classification: Internal
owner: diagrams/ project
audience: Engineers building and reviewing `packages/mcp-server/`
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KMCP-001
  - DESIGN-KMCP-001
  - PLAN-KMCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - test
  - verification
  - validation
  - iso-29119
  - traceability
  - node-test
  - mcp
  - fixtures
---

# kymostudio-mcp (local MCP render server) — Verification & Validation

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `TEST-KMCP-001` |
| Version           | 0.1 |
| Status            | Draft |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KMCP-001` (requirements), `DESIGN-KMCP-001` (design), `PLAN-KMCP-001` (plan) |

> V&V per **ISO/IEC/IEEE 29119**. Test cases are `TC-KM-NN`. kymostudio-mcp adds **no renderer**
> — its correctness gate is that tool plumbing is right and the **engine output is unchanged**
> (the `packages/js` `npm test` and Python golden suites stay green). Tests assert **structural
> invariants** of outputs (markers, magic bytes, addresses), never SVG bytes — byte-level
> correctness is owned by the engine's conformance/golden suites.

---

## 1. Strategy

- **Unit (`node --test`, in `packages/mcp-server/test/`)** — grammar-detection table, zod schema
  rejection, icon search, error wrapping. No MCP transport involved.
- **Integration (`node --test`)** — drive the real server in-process via the MCP SDK's client
  (`InMemoryTransport` or client ↔ spawned stdio child), calling each tool end-to-end. Fixtures
  come from the repo's existing corpus — `samples/*.kymo`, `samples/*.mmd`, `samples/order.bpmn`,
  plus one small `.d2`, `.dot`, `.kymo.json` fixture each — **no new golden corpus**.
- **Manual V&V** — host registration (Claude Code / Claude Desktop / Cursor config snippets),
  npx cold start, offline render.
- **Regression gate** — the engine is reused unchanged except the `parseD2`/`parseDot` exposure
  (`DESIGN-KMCP-001` §5), which is additive; existing suites must not move.

## 2. Feature test cases (`TC-KM`)

| ID | Case | Steps / expectation | Verifies |
|----|------|---------------------|----------|
| **TC-KM-01** | Render `.kymo` | `render_diagram` with a `samples/*.kymo` source, `format:"svg"` → SVG text; contains the engine's flow-animation marker for edge-bearing diagrams. | FR-KM-01, FR-KM-02 |
| **TC-KM-02** | Render Mermaid | Same with `samples/*.mmd` source, `source_format:"mermaid"` → SVG renders; grammar named in result. | FR-KM-02 |
| **TC-KM-03** | Render BPMN | Same with `samples/order.bpmn` XML → SVG renders. | FR-KM-02 |
| **TC-KM-04** | Render D2 / DOT via IR | D2 and DOT fixtures → SVG carries kymo styling (engine CSS classes), proving the `parseD2`/`parseDot` → `renderSVG` route, not bare flowchart-SVG. | FR-KM-02, FR-KM-05 |
| **TC-KM-05** | Render `.kymo.json` | A `toKymoJson` round-trip fixture renders identically to its source diagram (same SVG from both calls). | FR-KM-02 |
| **TC-KM-06** | Auto-detection | Each of the six fixtures submitted **without** `source_format` → detected grammar named in result and matches expectation; detection unit table covers the §4 sniff order incl. the D2 fallback. | FR-KM-03 |
| **TC-KM-07** | Override beats sniff | A Mermaid-looking source with `source_format:"kymo"` → parsed as kymo (and errors as kymo if invalid). | FR-KM-03 |
| **TC-KM-08** | PNG output | `format:"png"` (default) → content decodes from base64 with PNG magic bytes `89 50 4E 47`; `scale` changes pixel dimensions. | FR-KM-04 |
| **TC-KM-09** | `output_path` | With `output_path` → file written, same bytes as returned content, path echoed in result. | FR-KM-04 |
| **TC-KM-10** | Offline icons | A `.kymo` fixture using a file-backed icon (e.g. an `aws:*` address) renders with the icon glyph present, with all network access stubbed/disabled for the test. | FR-KM-06 |
| **TC-KM-11** | Convert | `convert_diagram` mermaid→`d2` and mermaid→`dot` return non-empty transpiled source (spot-check node names); any-grammar→`drawio` returns mxGraph XML; →`kymo-json` returns parseable IR. | FR-KM-07 |
| **TC-KM-12** | Icon search | `search_icons("lambda")` → ≥1 `prefix:name` line; the returned address renders when substituted into a `.kymo` fixture; `limit` respected. | FR-KM-08 |
| **TC-KM-13** | Editor gating | Without `KYMO_EDITOR_URL`: `push_to_editor` absent from `tools/list`. With it (pointing at a stub HTTP server): tool present, POSTs the room `/set` shape, returns the stub's confirmation. | FR-KM-09 |
| **TC-KM-14** | Error surface | Malformed source per grammar → tool error (`isError`), message contains `[<grammar>]` + engine text; a subsequent valid call on the same server instance succeeds (no crash). | FR-KM-10 |
| **TC-KM-15** | Schema rejection | Missing `source` / bad enum value → zod rejection before any engine call (assert via spy/order). | NFR-KM-05 |
| **TC-KM-16** | Host registration (manual) | `claude mcp add kymo -- npx kymostudio-mcp` (and Desktop/Cursor JSON snippets) → tools listed; one render round-trips in the host. | NFR-KM-02 |
| **TC-KM-17** | Cold start (manual) | Time `npx kymostudio-mcp` from warm npx cache to MCP `initialize` response: ≤ ~2 s. | NFR-KM-03 |

## 3. Regression gates (must stay green)

| Gate | Command | Expectation |
|------|---------|-------------|
| JS engine | `cd packages/js && npm test` | Green; the `parseD2`/`parseDot` exposure is additive (new tests welcome, existing untouched). |
| Conformance | JS + Python conformance suites (`conformance/`) | Unchanged — no golden regenerated for this feature. |
| Python goldens | `cd packages/python && uv run --group dev python -m pytest -q` | Byte-identical; this feature never touches Python. |

If a gate moves, the change is out of scope for kymostudio-mcp and must be re-reviewed.

## 4. Non-functional verification

- **NFR-KM-01 (portability):** CI installs the package on a clean Node (no Python on PATH for
  the job) and runs the integration suite; `package.json` declares no native/postinstall deps.
- **NFR-KM-02 (installability):** TC-KM-16.
- **NFR-KM-03 (performance):** TC-KM-17; per-render ms observable in test logs.
- **NFR-KM-04 (compatibility):** §3 gates + lockstep version asserted by the release flow (`PLAN-KMCP-001` §5).
- **NFR-KM-05 (maintainability):** TC-KM-15; detection/dispatch covered as a unit table (TC-KM-06).

## 5. Traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-KM-01 | TC-KM-01 |
| FR-KM-02 | TC-KM-01..05 |
| FR-KM-03 | TC-KM-06, TC-KM-07 |
| FR-KM-04 | TC-KM-08, TC-KM-09 |
| FR-KM-05 | TC-KM-04 |
| FR-KM-06 | TC-KM-10 |
| FR-KM-07 | TC-KM-11 |
| FR-KM-08 | TC-KM-12 |
| FR-KM-09 | TC-KM-13 |
| FR-KM-10 | TC-KM-14 |
| NFR-KM-01 | §4 (clean-Node CI job) |
| NFR-KM-02 | TC-KM-16 |
| NFR-KM-03 | TC-KM-17 |
| NFR-KM-04 | §3 regression gates |
| NFR-KM-05 | TC-KM-06, TC-KM-15 |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-11 | Vũ Anh | Initial V&V: `TC-KM-01..17` (per-grammar renders, detection, PNG/output-path, offline icons, convert, icon search, editor gating, errors, schema, manual host/cold-start), regression gates, traceability. Structural-invariant assertions only — engine bytes stay owned by the engine suites. |
