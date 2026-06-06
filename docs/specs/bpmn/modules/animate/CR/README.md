# BPMN Animation — Change-Request Log

Change-requests against the baselined `bpmn-animate` spec (`docs/specs/bpmn/modules/animate/`). The feature
is **delivered through these CRs** — each is a self-contained increment (a mini engineering-spec
folder `CR-NNN/`: `01-INTRO` → `02-REQUIREMENT` → `03-DESIGN` → `04-TEST` → `05-PLAN`). The spine is
the self-contained **`kymo.anim`** format (`KYMOANIM-MAP-001`): CR-002 defines it; the rest are players.
The baseline reserves the `-001` suffix, so CR folders start at `CR-002`. Log each row below.

| CR | Title | Target baseline | Status | Date |
|----|-------|-----------------|--------|------|
| [`CR-BPMN-ANIMATE-002`](CR-002/01-REQUIREMENTS.md) | `kymo.anim` format + JSON Schema + validator + diagram→anim generator + no-JS SVG player | `FEAT`/`DESIGN`/`TEST`/`PLAN-BPMN-ANIMATE-001` (FR-1..4, FR-5 SVG, FR-6, FR-7) + `KYMOANIM-MAP-001` | **Open** | 2026-05-31 |
| [`CR-BPMN-ANIMATE-003`](CR-003/01-REQUIREMENTS.md) | Activation & gateway semantics — `activate`/`branch` timeline fields + rendering | `FEAT-BPMN-ANIMATE-001` (FR-1, FR-5 SVG) | **Proposed** | 2026-05-31 |
| [`CR-BPMN-ANIMATE-004`](CR-004/01-REQUIREMENTS.md) | Interactive viewer — `controls` (play/pause/step) over the timeline | `FEAT-BPMN-ANIMATE-001` (FR-5, interactive) | **Proposed** | 2026-05-31 |
| [`CR-BPMN-ANIMATE-005`](CR-005/01-REQUIREMENTS.md) | WebP / playback player — frames sampled from the timeline via `to_webp.py` | `FEAT-BPMN-ANIMATE-001` (FR-5, WebP) | **Proposed** | 2026-05-31 |

**Statuses.** `Proposed` — registered, scaffolded (`01-INTRO` + `02-REQUIREMENT`), awaiting the
increment being picked up (its `03-DESIGN`/`04-TEST`/`05-PLAN` are authored then). `Open` — fully
specified, ready to build. `Closed` — implemented + re-baselined.

**Sequencing.** `CR-002` lands first (it defines the `kymo.anim` format + schema + validator +
generator the others reuse); `CR-003` adds the `activate`/`branch` semantics; `CR-004`/`CR-005`
consume the descriptor and can proceed in parallel once `CR-002` is in.
