# drawio → SVG — Change-Request Log

Change-requests against the `drawio-svg` spec (`docs/specs/drawio/modules/drawio-svg/`). The `-001`
baseline was the **as-built** `drawio2svg` tool (`packages/js/src/drawio2svg/`, engine-based); as of
the spec's **v1.2 zero-dependency direction** (`SN-DRW-02`) that as-is build is **superseded as the
target** and retained as a reference only. Each increment is a self-contained mini engineering-spec
folder `CR-NNN/` (`01-INTRO` → `02-REQUIREMENT` → `03-DESIGN` → `04-TEST` → `05-PLAN`). The baseline
reserves the `-001` suffix, so CR folders start at `CR-002`. Log each row below.

| CR | Title | Target baseline | Status | Date |
|----|-------|-----------------|--------|------|
| `CR-DRAWIO-SVG-003` (`CR-003/`) | **Zero-dependency rewrite** — replace `pako` with `node:zlib` decode and replace mxGraph-on-jsdom rendering with an **own SVG emitter**; remove `mxgraph`/`jsdom`/`pako` (runtime *and* dev). The redesign that brings the code into conformance with the v1.2 target. | `FEAT-DRAWIO-SVG-001` (FR-DS-1, FR-DS-2, FR-DS-4, FR-DS-5; NFR-DS-1..5) | **Proposed** | 2026-06-03 |
| `CR-DRAWIO-SVG-002` (`CR-002/`) | Bundled BPMN/AWS stencils — custom-shape fidelity, re-scoped onto the own emitter (after CR-003) | `FEAT-DRAWIO-SVG-001` (FR-DS-4) | **Proposed** | 2026-06-03 |

**Statuses.** `Proposed` — registered, awaiting the increment being picked up (its
`01-INTRO`..`05-PLAN` are authored then). `Open` — fully specified, ready to build. `Closed` —
implemented + re-baselined.

**Sequencing.** `CR-003` (the zero-dependency rewrite) is the **nearest-term, highest-priority**
increment — until it lands the module is **non-conformant** to its own v1.2 requirements (the as-is code
still uses `mxgraph`/`jsdom`/`pako`). `CR-002` (custom-shape fidelity) re-scopes onto the own emitter
and follows CR-003.
