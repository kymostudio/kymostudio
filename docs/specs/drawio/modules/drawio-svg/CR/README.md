# drawio → SVG — Change-Request Log

Change-requests against the baselined `drawio-svg` spec (`docs/specs/drawio/modules/drawio-svg/`). The baseline
(`-001`) is the **as-built** `drawio2svg` tool (`packages/js/src/drawio2svg/`); each later increment is
a self-contained mini engineering-spec folder `CR-NNN/` (`01-INTRO` → `02-REQUIREMENT` → `03-DESIGN` →
`04-TEST` → `05-PLAN`). The baseline reserves the `-001` suffix, so CR folders start at `CR-002`. Log
each row below.

| CR | Title | Target baseline | Status | Date |
|----|-------|-----------------|--------|------|
| `CR-DRAWIO-SVG-002` (`CR-002/`) | Bundled BPMN/AWS stencils — vendor draw.io stencil XML into `stencils/` so event/marker glyphs render | `FEAT-DRAWIO-SVG-001` (FR-DS-4) | **Proposed** | 2026-06-03 |

**Statuses.** `Proposed` — registered, awaiting the increment being picked up (its
`01-INTRO`..`05-PLAN` are authored then). `Open` — fully specified, ready to build. `Closed` —
implemented + re-baselined.

**Sequencing.** The baseline is delivered. `CR-002` is the only registered increment — it raises
custom-shape fidelity (FR-DS-4) by shipping draw.io's stencil sets; it is independent and can be
picked up at any time.
