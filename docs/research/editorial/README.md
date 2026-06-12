# ByteByteGo's Diagram Style — Anatomy of the Editorial Diagram, and the Kymo Editorial Layer (Research)

| Field             | Value                                                                                                       |
|-------------------|-------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-EDITORIAL-001                                                                                            |
| Version           | 2.1                                                                                                           |
| Issue Date        | 2026-06-12                                                                                                    |
| Status            | Draft                                                                                                         |
| Classification    | Internal                                                                                                      |
| Owner             | `diagrams/` project                                                                                           |
| Audience          | Engineers and designers designing the presentation-layer features kymo needs to generate "editorial diagrams" as code |
| Subjects          | ByteByteGo · editorial infographics · numbered-step flows · agent-architecture diagrams · edge badges · code cards · pattern fills · sizing · theming · DSL design |
| Related Documents | `RES-EDITORIAL-002` · school surveys `RES-EDITORIAL-003` … `RES-EDITORIAL-006` · `RES-DIAGRAM-TIMELINE-001`, `RES-DIAGRAM-TIMELINE-002`, `RES-STRATEGY-001`, `KYMO-DSL-GRAMMAR-001` |

This research note has two parts. **Part I (§1–4)** analyzes the visual language of ByteByteGo (Alex Xu's system-design newsletter, books, and courses) and the broader *editorial diagram* genre it exemplifies — the hand-crafted, social-feed-optimized technical diagrams that dominate how engineers consume architecture content — including a set of reproduction experiments that measure exactly what current diagram-as-code pipelines can and cannot do. **Part II (§5–13)** turns that analysis into a design: the **kymo editorial layer** — five features (edge step badges, code/payload blocks, pattern fills, sizing controls, per-subsystem theming), each with a concrete DSL syntax proposal, model delta, renderer mechanics, and a draft EBNF change for `KYMO-DSL-GRAMMAR-001`. Paper-prototype validation lives in the companion `RES-EDITORIAL-002`.

This is a research note, not a specification: it resolves design decisions and records rationale; the normative requirements will be extracted into `docs/specs/` folders per the roadmap (§13).

---

# Part I — Genre analysis

## 1. What ByteByteGo is, and why its diagrams matter

ByteByteGo grew out of Alex Xu's *System Design Interview* books into a newsletter (one of the largest paid tech newsletters on Substack), a YouTube channel, a course platform, and the open `system-design-101` repository. Its entire value proposition is **visual-first explanation**: complex distributed-systems topics compressed into single, dense, self-contained graphics designed to be read in a social feed.

For the purposes of this project, ByteByteGo matters as **market evidence**: it demonstrates that the highest-engagement diagrams in software are not produced by any diagram-as-code tool, nor do they follow any formal notation (UML, BPMN, ArchiMate, C4). They are editorial artifacts — and no current as-code pipeline can produce them (§3, §4).

## 2. Classification — not one diagram type, but a recurring vocabulary

ByteByteGo graphics are **editorial infographics composed from a small set of primitive diagram types**. Mapped against the type taxonomy of `RES-DIAGRAM-TIMELINE-001` (rankings in `docs/data/database.sqlite`), the recurring blocks are:

| Block | Underlying type (timeline taxonomy) | Description |
|---|---|---|
| **Numbered-step architecture flow** | flowchart + cloud architecture | The signature: a system diagram (client → gateway → services → stores) with **circled step badges ①②③… on the edges** narrating one request's journey. A sequence diagram flattened into a free 2-D layout. |
| **Comparison grid / cheatsheet** | (composite) | "Top 8 X" panels; each cell a mini-diagram. Optimized for shareability. |
| **Layered stack** | cloud architecture | Horizontal layer cake (OSI, tech stacks, platform layers). |
| **Lifecycle / loop** | state machine / agent-state graph | Closed cycles (request lifecycle, CI/CD, agent loops) with step badges. |
| **Taxonomy tree** | mind map | Tool/protocol classification fans. |

The same vocabulary — minus the polychrome density — underlies the canonical agent-architecture figures from Anthropic (*Building Effective Agents*: chaining, routing, orchestrator-workers, evaluator-optimizer) and OpenAI (CUA perception→reasoning→action loop). Two editorial schools, one grammar:

- **Minimal-semantic school** (Anthropic, OpenAI): 2–3 colors with fixed meaning (terminal / LLM step / non-LLM control), generous whitespace, monospace typography, texture fills, payload examples embedded in nodes.
- **Dense-polychrome school** (ByteByteGo): one pastel color *per subsystem*, real brand icons (Kafka, Redis, Postgres, K8s) inside nodes, high information density, mobile-portrait canvases, hand-drawn-style annotation arrows.

A wider survey of the genre's publishers — these two schools plus two further ones (single-author *illustrated explainers* and *interactive/scholarly* explainers) — lives in the per-school companion notes: `RES-EDITORIAL-003` (dense-polychrome), `RES-EDITORIAL-004` (minimal-semantic), `RES-EDITORIAL-005` (illustrated explainers), `RES-EDITORIAL-006` (interactive/scholarly). The last positions kymo's animated SVG on the genre's static→dynamic axis.

## 3. Style traits that carry the identity

Across both schools, the elements that make these diagrams recognizable — and shareable — are presentation-layer, not topological:

1. **Edge badges**: circled step numbers placed *on* the connector, the device that lets one static image narrate time.
2. **Icons inside nodes**: brand or concept glyphs as first-class node content.
3. **Color as a semantic layer**: per-subsystem (ByteByteGo) or per-role (Anthropic/OpenAI) — either way, a deliberate, small mapping.
4. **Embedded payloads**: real JSON / code / commands rendered in black code blocks inside nodes, so the diagram doubles as an API example.
5. **Deliberate whitespace and node sizing**: nodes sized for visual rhythm, not text-fit; long, calm connectors.
6. **Texture and typography**: dot-grid fills, branded monospace faces (OpenAI uses Söhne Mono), wide letter-spacing.

Production tooling confirms the "editorial" reading: ByteByteGo's static graphics are drawn in design tools and its video animations in After Effects. Alex Xu has *written approvingly about* diagram-as-code (his "Diagram as Code" post and the "Top 6 tools to turn code into beautiful diagrams" issue cover mingrammer `diagrams`, Mermaid, PlantUML, D2, Markmap, ASCII) — yet ByteByteGo's own flagship graphics remain hand-drawn, because no as-code tool reaches the presentation bar above.

## 4. Reproduction experiments — measuring the gap

Three editorial diagrams were reproduced through progressively more controllable pipelines (2026-06-11/12):

| Experiment | Vehicle | Result |
|---|---|---|
| Anthropic *prompt chaining* (linear flow, gate, edge labels) | Kroki → **Mermaid** `flowchart LR` + `classDef` | Semantics and color language fully reproduced. Lost: spacing rhythm (auto-layout packs nodes), label placement (gray plates glued to edges), curve quality. |
| OpenAI *CUA loop* (closed cycle, pinned positions, edge badges, embedded JSON) | Kroki → **Graphviz** `neato` with `pos="x,y!"`, HTML-like labels, `splines=ortho` | Topology and ring layout exact (pinned). Code blocks acceptable via HTML tables. Lost: badges *on* edges (only beside), pattern fills (none in Graphviz), in-node icons, node-size balance (auto-fit to text), single-font discipline. |
| OpenAI *CUA loop*, pixel-fidelity target | **HTML/CSS** (absolute positioning, `radial-gradient` dot grid, SVG overlay for wires) measured against the original with a PIL diff loop | **4.95% of pixels differ >16/255** (1.97% >48) after four tuning rounds (letter-spacing, dot-grid phase, code line-height, arrowhead `markerUnits`). Irreducible residue: proprietary font glyphs (Söhne Mono) and dot anti-aliasing. |

Two conclusions. First, the **semantic ~80% is cheap**: any as-code tool gets topology, color classes, and labels. Second, the **editorial ~20% is parametric, not artistic**: the pixel-level reconstruction reduced the entire "hand-made" quality of the OpenAI figure to a short list of measurable parameters — 5.7 px dot-grid pitch, 62 px edge badges, 29 px code line-height, 0.7–0.8 px letter-spacing, fixed node boxes with generous padding. Nothing in the genre requires a human hand; it requires a *renderer that exposes these controls*.

Measured parameters restated at kymo's canvas scale (the OpenAI original is a 1400 px-wide export; kymo diagrams run roughly half that density): badge radius ~14 px (28 px diameter), code line-height ~18 px, dot pitch ~6 px, letter-spacing ~0.7 px. These are the renderer constants Part II's features should default to.

A second-order finding: kymo renders text as real SVG `<text>`, not Mermaid's `<foreignObject>` HTML — so its output rasterizes correctly through resvg/rsvg where Mermaid's silently drops all labels (verified during the experiments). For a genre whose primary distribution channel is *raster images in social feeds*, that is a structural advantage worth preserving in every feature below.

---

# Part II — The kymo editorial layer (design)

Scope: five features, F1–F5, converting the §3 trait list into DSL + model + renderer designs. Trait 2 (icons inside nodes) is already kymo's strength (`packages/icons` catalogue — the differentiator Mermaid lacks, cf. mermaid-js/mermaid#6109) and needs no new design.

## 5. Design principles (cross-cutting)

1. **Everything is model data.** Each feature lands as fields on the `model.py` / `model.ts` dataclasses (`Edge.step`, `Component.code`, `Region.fill`, `Component.size`, `Diagram.theme`). The parser stays thin and the renderer stays dumb — `to_svg.py` / `render.ts` only ever read resolved data. This is also the v3-survival rule (§11): a future front-end replaces the parser, not the features.
2. **Conditional CSS/defs injection.** Every feature's CSS classes and `<defs>` fragments are emitted **only when the diagram uses the feature**, following the existing `FLOWCHART_CSS` pattern (`to_svg.py:714-717`). This is the byte-stability contract with the golden-SVG tests: diagrams that don't use a feature render byte-identically before and after the feature ships, so goldens stay additive-only.
3. **Named semantics over free-form styling.** Options take named presets and roles (`fill=dots`, `color=storage`), not arbitrary style strings. Named values are enumerable by agents (the primary authors per `RES-STRATEGY-001`), auditable in review, and map 1:1 onto classes in a future cascade system.
4. **Python/JS lockstep.** Each feature lands in `dsl.py`+`to_svg.py` and `dsl.ts`+`render.ts` in the same change, with mirrored tests; `KYMO-DSL-GRAMMAR-001` is bumped one minor version per implementation phase (§13), using the draft EBNF deltas in §6–10.

## 6. F1 — Edge step badges

**Motivation.** The single highest-leverage primitive (§3 trait 1): a circled number placed *on* the connector. Default geometry from §4: radius 14 px, white fill, 1.8 px accent-colored ring, bold 13 px centered numeral. (`SHAPE_HALF["badge"]` is already `(14,14)` — the constant agrees.)

**Syntax** — a new edge option, following the `label_at`/`label_offset` idiom of `_parse_edge_options` (`dsl.py:629-710`):

```text
browser --> agent : "screenshot" { step=1 }
agent   --> llm   : ""           { step=2, step_at=src }
llm     --> agent : "action"     { step=3, step_offset=(0, -18) }
```

| Alternative considered | Rejected because |
|---|---|
| Auto-increment (bare `step` flag, numbered in file order) | Hidden dependency on edge declaration order; agents and humans both benefit from explicit, greppable numbers; explicit also allows duplicates for parallel branches (two edges both `step=2`). String steps (`2a`) deferred. |
| Reusing the edge `label` with a `badge` flag | Conflates two devices that co-occur in the genre (a badge *and* a text label on the same edge). |

**Model delta.** `Edge.step: int | None = None`, `Edge.step_at: Literal["src","mid","dst"] = "mid"`, `Edge.step_offset: tuple[int, int] = (0, 0)` (Python, `model.py` Edge at 271–306); `step`/`stepAt`/`stepOffset` in `model.ts`.

**Renderer.** Drawn in the edge pass after the path: position computed by the same logic as `edge_label_pos` (`to_svg.py:384-402`) applied at `step_at`, then `step_offset`. White-filled circle visually breaks the connector — no masking needed. CSS classes `.edge-step` (circle) and `.edge-step-num` (text) injected only when `any(e.step is not None for e in d.edges)`. No `<defs>` needed. When both a badge and a label default to `mid`, the label auto-offsets +20 px along the path normal so they never collide.

**Reconciliation with existing primitives.** The standalone `badge` *shape* and the `step-1`…`step-3` icons remain for free-floating annotation, but the edge option is the canonical device; badge numerals are drawn procedurally (text, not icon), removing the fixed ceiling of 3.

**Draft EBNF delta** (`KYMO-DSL-GRAMMAR-001` §6.7, add alternatives to `edge_opt`):

```
edge_opt         = … (* existing alternatives *)
                 | "step"        , "=" , INT
                 | "step_at"     , "=" , ( "src" | "dst" | "mid" )
                 | "step_offset" , "=" , point ;
```

Reserved-keyword additions (§6.8): `step`, `step_at`, `step_offset`.

## 7. F2 — Code/payload blocks

**Motivation.** §3 trait 4: nodes that carry a real JSON/command payload in a dark monospace block, so the diagram doubles as an API example (OpenAI's `COMPUTER TOOL CALL`, ByteByteGo's request/response callouts).

**Syntax** — an optional brace body on a leaf. The leaf line itself is unchanged (fully backward-compatible); verbatim code lines carry a `|` prefix, sidestepping quote/indent ambiguity in a line-oriented grammar:

```text
payload box/none/blue "computer_call" "" @ llm right 48 {
  code lang=json
  | {
  |   "type": "click",
  |   "x": 512, "y": 384
  | }
}
```

| Alternative considered | Rejected because |
|---|---|
| Quoted multi-line string in the leaf line | Line-oriented lexer (KYMO-DSL-LEX-001) has no multi-line strings; escaping JSON inside quotes is hostile to both humans and LLMs. |
| Code below the icon (icon + code in one node) | Two render paths and unresolved vertical layout; the genre's code cards have no icon. Card-as-glyph keeps one path. |

**Model delta.** `Component.code: list[str] = field(default_factory=list)`, `Component.code_lang: str | None = None`; `code`/`codeLang` in `model.ts`.

**Renderer.** A component with non-empty `code` renders as a **code card**, replacing the icon glyph: dark rounded rect (`#0f172a`, `rx` 8), the `name` as a small mono header band, then one `<text class="code-line">` per line — real SVG text, never `<foreignObject>` (§4 rasterization advantage). Metrics: line-height 18 px, letter-spacing 0.7 px. Card size is computed from line count and max line length × a fixed monospace char advance (deterministic — no text measurement needed) and **written into `Component.size`**, so `half`, `anchor()` (`model.py:127-157`), region auto-bounds, and `_auto_size_canvas` (`alignment.py:238`) work unchanged. `.code-card`/`.code-line` CSS injected only when used.

**Decisions.** No wrapping — the author owns line breaks. Syntax highlighting is out of scope for v1: `lang=` is parsed and carried so files are forward-compatible; a token-class design (`.tok-str`, `.tok-key`, …) is sketched for v2.

**Draft EBNF delta** (new productions; §6.4 `leaf` gains an optional body, §6.6 line discriminator updated — a line ending with `{` whose second token contains `/` opens a *leaf body*, checked before the container rule):

```
leaf             = id , shape , "/" , icon , "/" , accent ,
                   STRING , STRING , [ "@" , placement ] , [ leaf_body ] ;
leaf_body        = "{" , leaf_opts , "}"                  (* inline, one line *)
                 | "{" , { leaf_body_line } , "}" ;       (* block form *)
leaf_body_line   = leaf_opts | code_decl | code_line | comment | blank ;
leaf_opts        = leaf_opt , { "," , leaf_opt } ;
code_decl        = "code" , [ "lang" , "=" , identifier ] ;
code_line        = "|" , ? verbatim text to end of line ? ;
```

(`leaf_opt` alternatives are defined by F3/F4 below.) Reserved-keyword additions: `code`, `lang`.

## 8. F3 — Pattern fills

**Motivation.** §3 trait 6: textured box backgrounds (OpenAI's dot-grid "environment" boxes). Measured: ~6 px pitch at kymo scale, ink derived from the box's accent.

**Syntax** — named presets only, on regions (primary use), on leaves (via the F2/F4 body), and on the canvas directive:

```text
env inner "Computer environment" fill=dots {
  browser, os
}
sandbox box/none/blue "Sandbox" "" @ (200,300) { fill=hatch }
canvas: 1200 x 760 bg=plain
```

| Alternative considered | Rejected because |
|---|---|
| Parameterized patterns (`fill=dots(pitch=5.7, opacity=0.12)`) | Violates principle 3; presets keep output theme-consistent and agent-enumerable. Pitch/opacity are renderer constants. |
| Pattern on canvas only | The genre patterns *boxes*, not the page; kymo's canvas already has the subtle `#dot-grid` background (`to_svg.py:217-219`). |

**Model delta.** `Region.fill: str | None = None`, `Component.fill: str | None = None`, `Diagram.bg: str = "dots"` (current canvas behavior is the default — goldens unchanged).

**Renderer.** New parameterized pattern defs — `#fill-dots` (≈6 px pitch, opacity ≈0.12; denser and darker than the canvas `#dot-grid`), `#fill-dots-dense`, `#fill-hatch` (45° lines) — appended to `DEFS` **only when referenced** (the static `DEFS` string at `to_svg.py:194-246` becomes base + conditional suffix; same stability contract). Region fill overrides the `.region-rect` background via inline `style=`, the precedent set by `border_dash`/`border_stroke` (`to_svg.py:428-435`). Preset values: `dots`, `dots-dense`, `hatch`, `none`, or a `#hex` flat fill. Pattern ink is fixed slate in v1; theming the ink from the F5 role is noted for v2.

**Draft EBNF delta** (§6.5.3 `region_opt`, §6.3 `canvas`, and F2's `leaf_opt`):

```
region_opt       = … | "fill" , "=" , fill_value ;
leaf_opt         = … | "fill" , "=" , fill_value ;
fill_value       = "dots" | "dots-dense" | "hatch" | "none" | hexcolour ;
canvas           = "canvas" , [ ":" ] , INT , "x" , INT , [ "bg" , "=" , ( "plain" | "dots" ) ] ;
```

Reserved-keyword additions: `fill`, `bg`.

## 9. F4 — Sizing, padding, spacing

**Motivation.** §3 trait 5: deliberate node sizing and whitespace rhythm. Key research finding: **the model plumbing already exists** — `Component.size` overrides `SHAPE_HALF` and flows through `half`, `anchor()`, `_effective_half`, and `_auto_size_canvas`; `Region.padding`/`padding-bottom`/`gap` are already DSL surface (§6.5.3 of the grammar). The gap is purely that *no DSL syntax sets `Component.size`* (today only the BPMN/Mermaid importers do).

**Syntax** — leaf options (shared body with F2/F3) plus two new directives:

```text
gw box/gateway/blue "API Gateway" "" @ (300,200) { size=(160,96), pad=(20,14) }

spacing: 48        # default gap for layout frames + default align_gap
margin:  60        # canvas auto-size margin (today hardcoded 30)
```

**Model delta.** `Component.pad: tuple[int, int] | None = None` (inner padding for box/code glyphs); `Diagram.spacing: int | None = None`, `Diagram.margin: int = 30`. `size=` maps to the existing `Component.size`.

**Renderer/resolver.** `_auto_size_canvas` (`alignment.py:238-331`) reads `Diagram.margin` instead of the literal 30; layout frames and `align_gap` defaults read `Diagram.spacing` when set. Two interactions the spec must carry worked examples for: (a) **icon does not scale** with the box — the icon stays at native size, centered; the box provides whitespace, which *is* the editorial trait; (b) explicit `size` does not absorb the label band — `LABEL_HEIGHT` stays outside, matching current `anchor()` semantics; (c) `_snap_to_grid` (8 px) snaps explicit sizes up, never down.

**Deferred.** Per-edge minimum-length / spacing-rhythm control (`min_len=`) — needs routing-level support; recorded in the backlog with the cycle-routing finding (`RES-EDITORIAL-002` §6).

**Draft EBNF delta** (§6.3 directives; `leaf_opt`):

```
directive        = canvas | title | subtitle | external | spacing | margin ;
spacing          = "spacing" , ":" , INT ;
margin           = "margin" , ":" , INT ;
leaf_opt         = … | "size" , "=" , point | "pad" , "=" , point ;
```

Reserved-keyword additions: `size`, `pad`, `spacing`, `margin`.

## 10. F5 — Per-subsystem theming

**Motivation.** §3 trait 3: a small, deliberate color mapping — per-subsystem (ByteByteGo) or per-role (Anthropic/OpenAI). Today's surface is a fixed 4-value accent enum plus region `stroke`; the genre needs author-defined roles.

**Syntax** — a file-scope `theme { }` block defines named roles; the leaf's third slash-field (accent) then accepts role names; edges take `color=<role>`. Hex values are legal **only inside the theme block** (principle 3 — elements reference roles, never raw colors):

```text
theme {
  gateway  #e8f0fe #1a73e8          # fill, stroke (optional third value: text)
  storage  #fef7e0 #b06000
  llm      orange                   # alias to a built-in accent
}

gw  box/none/gateway      "API Gateway" "" @ (300,100)
db  cylinder/none/storage "Users DB"    "" @ gw bottom 64
gw --> db : "read" { step=2, color=storage }
```

| Alternative considered | Rejected because |
|---|---|
| Free hex per element (`stroke=#…` on every leaf/edge) | Sprawls into inconsistent palettes — exactly what both editorial schools avoid (§2); un-auditable agent output. |
| Global named palettes only (`palette=bytebytego`) | Too coarse: the genre's identity is *author-chosen role→subsystem mapping*, not a fixed skin. Built-in presets can layer on later. |

**Model delta.** `Accent` widens from the 4-value `Literal` to `str`, validated at parse time against builtins + declared theme roles; `Diagram.theme: dict[str, ThemeRole]` with `ThemeRole(fill, stroke, text=None)`; `Edge.color: str | None = None`. Mirrored in `model.ts`.

**Renderer.** One `.acc-<role> { … }` CSS rule per declared role, injected **only when a `theme` block exists** (no theme → byte-identical goldens). Applied to: icon-less shape fills/strokes (the `.fc-shape` path), region tint and label color, edge stroke, step-badge ring (F1), and code-card header (F2). **Edge arrowheads need per-color `<marker>` defs generated conditionally** — SVG markers do not inherit CSS stroke; this is the one piece of per-role defs machinery. The 4 built-in accents remain as implicit roles; `red → alert-pulse` animation semantics are preserved. **Icons are not recolored in v1** — colors are baked into the icon fragments; an explicit non-goal, with a v2 note (currentColor refactor of `packages/icons`). Pattern-ink theming (F3) is the same v2 item.

**Draft EBNF delta** (new file-scope block; §6.4 `accent`; §6.7 `edge_opt`):

```
theme_block      = "theme" , "{" , { theme_role } , "}" ;
theme_role       = id , ( hexcolour , hexcolour , [ hexcolour ]
                        | builtin_accent ) ;
builtin_accent   = "green" | "orange" | "blue" | "red" ;
accent           = builtin_accent | id ;      (* id must name a theme role *)
edge_opt         = … | "color" , "=" , id ;
```

Reserved-keyword additions: `theme`, `color`. Line discriminator: `theme {` joins `bpmn {`/`flowchart {` as a file-scope block opener (§6.6 step 3–4 family).

## 11. Relationship to DSL v3

A v3 direction (indentation-based syntax, CSS-cascade styling) exists as an exploratory note, but it is **not committed** in `RES-STRATEGY-001`'s workstreams. Recommendation: **ship the editorial layer as v2.x options; do not block on v3.**

1. The editorial layer is the strategy doc's identified differentiator; blocking it on an uncommitted syntax rewrite inverts priorities.
2. Principle 1 makes the features v3-proof: everything is model data, so a v3 front-end replaces only `dsl.py`/`dsl.ts` — all five features survive untouched.
3. The only *structural* v2 grammar addition is the leaf brace body (F2/F4) — deliberately specified so an indentation-based parser accepts the same body lines verbatim (`key=val` lines and `|` code lines are indentation-agnostic).

Informative v2→v3 mapping (doubles as a v3 requirements seed):

| v2.x spelling (this doc) | Projected v3 spelling |
|---|---|
| `theme { gateway #e8f0fe #1a73e8 }` | class definition: `gateway: { fill: #e8f0fe; stroke: #1a73e8 }` |
| leaf accent field `…/gateway` | `class: gateway` |
| `{ step=1, step_at=src }` | nested properties: `step: 1`, `step.at: src` |
| `fill=dots` | `style.fill-pattern: dots` |
| `{ size=(160,96), pad=(20,14) }` | `width/height/padding` properties |

## 12. Validation

Paper-prototype validation is in `RES-EDITORIAL-002`: three reference diagrams (OpenAI CUA loop, a ByteByteGo-style numbered request flow, Anthropic prompt chaining) hand-written in the §6–10 syntax, with feature-trace tables and expected-render checklists. Acceptance criteria for the eventual implementation: the prototypes parse, render, and — for the CUA loop — score materially better than the Kroki vehicles of §4 on the same PIL-diff method; the prototypes then land as golden fixtures.

## 13. Roadmap — research → specs → implementation

The five features group into **three spec folders by implementation coupling**, each in the standard 4-file format (`01-REQUIREMENTS / 02-DESIGN / 03-TEST / 04-PLAN`):

| Phase | Spec folder | Features | Rationale |
|---|---|---|---|
| 1 | `docs/specs/edge-badges/` (`FEAT-EDGE-BADGES-001`) | F1 | Smallest delta, highest leverage; proves the conditional-CSS contract end-to-end |
| 2 | `docs/specs/editorial-styling/` (`FEAT-EDITORIAL-STYLE-001`) | F3 + F5 | Both are conditional CSS/defs injection machinery; the theme defines pattern ink (v2) |
| 3 | `docs/specs/editorial-content/` (`FEAT-EDITORIAL-CONTENT-001`) | F2 + F4 | Both flow through `Component.size` and share the leaf brace body |

Per-phase definition of done: `dsl.py` + `dsl.ts` parity with mirrored tests; `KYMO-DSL-GRAMMAR-001` bumped one minor version (EBNF deltas pre-drafted in §6–10); conformance cases added; existing goldens byte-identical (additive-only). After phase 3: the `RES-EDITORIAL-002` prototypes become golden fixtures and their rendered output is diffed against the reference images with the §4 PIL method — closing the loop.

## 14. References

- ByteByteGo — Visual Guides: <https://bytebytego.com/guides/>
- ByteByteGoHq/system-design-101 (GitHub): <https://github.com/ByteByteGoHq/system-design-101>
- Alex Xu — *Diagram as Code*: <https://blog.bytebytego.com/p/diagram-as-code>
- ByteByteGo — *EP109: Top 6 Tools to Turn Code into Beautiful Diagrams*: <https://blog.bytebytego.com/p/ep109-top-6-tools-to-turn-code-into>
- Anthropic — *Building Effective Agents*: <https://www.anthropic.com/research/building-effective-agents>
- Spring AI — *Building Effective Agents* (reference re-implementation of the Anthropic figures): <https://docs.spring.io/spring-ai/reference/api/effective-agents.html>
- Mermaid — Architecture Diagrams (`architecture-beta`), icon registration: <https://mermaid.ai/open-source/syntax/architecture.html>
- mermaid-js/mermaid#6109 — request for official AWS/GCP/Azure icons: <https://github.com/mermaid-js/mermaid/issues/6109>
- javinpaul — *How ByteByteGo Makes System Design Easy for Visual Learners*: <https://medium.com/javarevisited/how-bytebytego-makes-system-design-easy-for-visual-learners-5196ba31bec3>
- *Architecture Diagramming Tools, and the AI Gap*: <https://generativeprogrammer.com/p/architecture-diagramming-tools-and>

## Annex A — Revision history

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | anhv   | Initial note: classification of the ByteByteGo / editorial diagram genre, two-school comparison, Kroki + HTML/CSS reproduction experiments, feature-gap table for kymo. |
| 2.0     | 2026-06-12 | anhv   | Merged the editorial-layer design (Part II): design principles, F1–F5 feature designs with DSL syntax, model deltas, renderer mechanics, and draft EBNF deltas; v3 stance; roadmap to three spec folders. Gap table superseded by §6–10. Companion `RES-EDITORIAL-002` (paper prototypes) added. |
| 2.1     | 2026-06-12 | anhv   | Added the four per-school source surveys (`RES-EDITORIAL-003` … `RES-EDITORIAL-006`) and the §2 pointer to them. |
