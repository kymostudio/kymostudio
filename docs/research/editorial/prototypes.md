# Kymo Editorial Layer — Paper Prototypes (Research)

| Field             | Value                                                                                                       |
|-------------------|-------------------------------------------------------------------------------------------------------------|
| Document ID       | RES-EDITORIAL-002                                                                                            |
| Version           | 1.0                                                                                                           |
| Issue Date        | 2026-06-12                                                                                                    |
| Status            | Draft                                                                                                         |
| Classification    | Internal                                                                                                      |
| Owner             | `diagrams/` project                                                                                           |
| Audience          | Engineers validating the editorial-layer DSL design before specification and implementation                  |
| Subjects          | paper prototypes · edge badges · code cards · pattern fills · sizing · theming · golden fixtures             |
| Related Documents | `RES-EDITORIAL-001`, `KYMO-DSL-GRAMMAR-001`                                                                  |

Validation companion to `RES-EDITORIAL-001` Part II. Three reference diagrams of the editorial genre are hand-written in the proposed F1–F5 syntax as **paper prototypes**: no implementation exists, so the value is (a) proving the syntax can express the genre's canonical artifacts without contortion, (b) surfacing expressiveness gaps before the grammar is frozen, and (c) producing the exact sources that later become golden-test fixtures.

## 1. Method

Each prototype gives: the reference figure, the complete `.kymo` source, a feature-trace table, and an expected-render checklist carrying the measured parameters of `RES-EDITORIAL-001` §4 at kymo scale (badge r≈14 px, code line-height ≈18 px, dot pitch ≈6 px, letter-spacing ≈0.7 px). Base grammar (leaf / edge / region / placement lines) is valid against today's `KYMO-DSL-GRAMMAR-001` v2.7; only the constructs traced to F1–F5 are new. Icon keys are illustrative — per the grammar's permissive rule (§6.4), unresolved keys fall back to a default glyph; final keys get validated against the `packages/icons` catalogue at implementation time.

## 2. Prototype A — OpenAI CUA loop (keystone: all 5 features)

Reference: OpenAI's computer-use agent loop figure (perception → reasoning → action cycle; the subject of the §4 pixel-fidelity experiment).

```text
canvas: 1400 x 1220 bg=plain

theme {
  env    #f3f9ee #557f33
  model  #f4f4f4 #444444
  action #fdf3f4 #8a3a6f
}

screenshot box/camera-focus/env "SCREENSHOT" "" @ (760, 230)  { size=(364, 254), fill=dots }
environ    box/laptop/env       "COMPUTER ENVIRONMENT" "" @ (318, 518) { size=(364, 254), fill=dots }
cua        box/none/model       "CUA MODEL" "" @ (1140, 518)  { size=(230, 152), fill=dots }
appcode    box/none/model       "APPLICATION CODE" "" @ (760, 942) { size=(228, 174), fill=dots }

toolcall box/none/action "COMPUTER TOOL CALL" "" @ (1140, 942) {
  size=(312, 348)
  fill=dots
  pad=(32, 24)
  code lang=json
  | {
  |   type: "click"
  |   button: "left"
  |   x: 286,
  |   y: 102
  | }
}

act box/none/action "ACTION" "" @ (318, 942) {
  size=(430, 174)
  fill=dots
  pad=(32, 24)
  code
  | click (left, 286, 102)
}

screenshot --> cua        : "" { step=1, src=right, dst=top }
cua        --> toolcall   : "" { step=2, src=bottom, dst=top }
toolcall   --> appcode    : "" { src=left, dst=right }
appcode    --> act        : "" { src=left, dst=right }
act        --> environ    : "" { step=3, src=top, dst=bottom }
environ    --> screenshot : "" { step=4, src=top, dst=left, via=(318, 230) }
```

**Feature trace**

| Source construct | Feature | Option exercised |
|---|---|---|
| `bg=plain` | F3 | canvas background override (page is plain; *boxes* carry the texture) |
| `theme { env / model / action }` | F5 | three roles = the original's exact color triple (green / gray / maroon) |
| `…/env`, `…/model`, `…/action` accent fields | F5 | role reference from the leaf accent slot |
| `size=(364, 254)` etc. | F4 | deliberate sizing — boxes match the original's generous proportions, not text-fit |
| `fill=dots` on all six leaves | F3 | per-box dot-grid texture |
| `pad=(32, 24)` on the code cards | F4 | inner padding between card border and code block |
| `code lang=json` + `\|` lines | F2 | embedded payload; `act` shows the bare `code` form |
| `step=1…4` | F1 | the four numbered badges, at edge midpoints |
| `via=(318, 230)` on the closing edge | (existing) | pins the loop's corner so the cycle closes through the badge-4 corner |

**Expected-render checklist**: 6 boxes at the stated sizes with role fill/stroke and ≈6 px-pitch dots; two dark code cards (line-height 18 px, mono, letter-spacing 0.7 px) with the component name as header band; 4 white badges r 14 px with role-colored ring sitting *on* the connectors; orthogonal edges closing a ring.

**Finding (out of editorial scope).** The closed loop needs one manual `via=` to route cleanly; `route_edge`'s Z-shape heuristic has no cycle awareness. Recorded for the routing backlog ("cycle-friendly orthogonal routing", `RES-EDITORIAL-001` §9 deferred list) — the editorial layer does not depend on it.

## 3. Prototype B — ByteByteGo-style numbered request flow

Reference: the signature ByteByteGo "what happens when you load a page" genre — client → CDN → LB → gateway → services → stores, steps ①–⑧ (cf. `system-design-101`).

```text
title: "How a request flows through a typical web stack"

theme {
  client  #e8f0fe #1a73e8
  network #e6f4ea #137333
  service #fef7e0 #b06000
  data    #fce8e6 #c5221f
}

user  circle/user/client       "Client" ""        @ (110, 360)
cdn   box/cloud/network        "CDN" ""           @ user right 150
lb    box/aws-elb/network      "Load Balancer" "" @ cdn right 150
gw    box/api-gateway/service  "API Gateway" ""   @ lb right 150 { size=(160, 96) }
auth  box/lock/service         "Auth Service" ""  @ gw top 130
app   box/server/service       "App Service" ""   @ gw right 170
cache cylinder/redis/data      "Cache" ""         @ app top 130
db    cylinder/postgres/data   "Users DB" ""      @ app bottom 130

user --> cdn   : "GET /home" { step=1 }
cdn  --> lb    : ""          { step=2 }
lb   --> gw    : ""          { step=3 }
gw   --> auth  : "validate"  { step=4, color=service, src=top, dst=bottom }
gw   --> app   : ""          { step=5 }
app  --> cache : "hit?"      { step=6, color=data, src=top, dst=bottom }
app  --> db    : "on miss"   { step=7, color=data, dashed, src=bottom, dst=top }
app  --> user  : "200 OK"    { step=8, via=(700,620);(110,620), small }
```

**Feature trace**

| Source construct | Feature | Option exercised |
|---|---|---|
| `theme` with 4 subsystem roles | F5 | dense-polychrome school: color per subsystem, not per role-in-flow |
| `color=service` / `color=data` on edges | F5 | edge stroke + arrowhead marker + badge ring take the role color |
| `step=1…8` | F1 | full numbered narration; >3 proves procedural numerals (no `step-N` icon ceiling) |
| `step=7` + `dashed` | F1+existing | badge composes with existing edge flags |
| `size=(160, 96)` on the gateway | F4 | one hero node enlarged for emphasis |
| brand icons (`redis`, `postgres`, `aws-elb`, …) | (existing) | the catalogue advantage; keys illustrative |

**Expected-render checklist**: 8 nodes in 4 subsystem colors; 8 badges riding the connectors; themed edges where `color=` is set, default slate otherwise; return edge curving under the stack via waypoints.

## 4. Prototype C — Anthropic prompt chaining (minimal-semantic school)

Reference: the *prompt chaining* figure from Anthropic's *Building Effective Agents* (the §4 Mermaid experiment subject). No badges — this school narrates with edge labels; the test here is theming + sizing rhythm.

```text
canvas: 1990 x 830 bg=plain

theme {
  llm      #edf7e6 #74b057
  control  #edebfc #8c7fe8
  terminal #fdece5 #eda28c
}

inn  circle/none/terminal "In" ""   @ (140, 415)
c1   box/none/llm "LLM Call 1" ""   @ inn right 200    { size=(210, 80), pad=(28, 22) }
gate box/none/control "Gate" ""     @ c1 right 180     { size=(130, 80) }
c2   box/none/llm "LLM Call 2" ""   @ (1125, 315)      { size=(210, 80), pad=(28, 22) }
c3   box/none/llm "LLM Call 3" ""   @ c2 right 190     { size=(210, 80), pad=(28, 22) }
outt circle/none/terminal "Out" ""  @ c3 right 160
exit circle/none/terminal "Exit" "" @ (1080, 515)

inn  --> c1
c1   --> gate : "Output 1"
gate --> c2   : "Pass"     { src=right, dst=left, curve }
c2   --> c3   : "Output 2"
c3   --> outt
gate --> exit : "Fail"     { dashed, src=right, dst=left, curve }
```

**Feature trace**

| Source construct | Feature | Option exercised |
|---|---|---|
| `theme` with semantic roles (llm/control/terminal) | F5 | minimal-semantic school: 3 roles with fixed meaning |
| uniform `size=(210, 80)` + `pad=(28, 22)` | F4 | the spacing rhythm the §4 Mermaid experiment could not control |
| generous `@ … right 160–200` gaps | F4/existing | long calm connectors via explicit gaps |
| `bg=plain` | F3 | this school uses flat white, no canvas grid |
| no `step=` anywhere | — | confirms badges are optional, not entangled with theming |

**Expected-render checklist**: identical node sizes across the chain (not text-fit — "Gate" box wider than its text); pastel role fills with darker role strokes; dashed Fail branch; labels beside edges without background plates.

## 5. Coverage matrix

| Feature | A (CUA loop) | B (ByteByteGo flow) | C (prompt chaining) |
|---|---|---|---|
| F1 edge step badges | ✓ (1–4, mid) | ✓ (1–8, colored, +dashed combo) | — (deliberate) |
| F2 code blocks | ✓ (json + bare) | — | — |
| F3 pattern fills | ✓ (`fill=dots` ×6, `bg=plain`) | — (flat fills via theme) | ✓ (`bg=plain` only) |
| F4 sizing | ✓ (`size`, `pad`) | ✓ (hero node) | ✓ (uniform rhythm) |
| F5 theming | ✓ (3 roles) | ✓ (4 subsystem roles, edge `color=`) | ✓ (3 semantic roles) |

Every feature is exercised by ≥2 prototypes except F2 (only A) — acceptable: the code card has a single render path and A exercises both its forms (`lang=` and bare).

## 6. Expressiveness gaps found while writing

1. **Cycle routing needs a manual `via=`** (Prototype A). Not an editorial-layer defect; recorded for the routing backlog.
2. **Code-card metrics depend on content, but `size=` is also given** (Prototype A): the design must define precedence — recommendation: explicit `size=` wins and clips/pads; computed size is the fallback. Carried into `FEAT-EDITORIAL-CONTENT-001`.
3. **Badge + label on the same edge at `mid`** occurs in B (`step=1` + `"GET /home"`): the +20 px auto-offset rule of `RES-EDITORIAL-001` §6 is necessary, confirmed.
4. **`exit`/`in`/`out` as ids**: `in` collides with nothing today but is one keystroke from `inner`; prototypes use `inn`/`outt` defensively. Consider documenting recommended id hygiene rather than reserving more words.
5. **Terminal pill shape**: the genre's In/Out terminals are stadium-shaped; kymo's nearest is `circle`. A `stadium` shape exists for flowchart nodes only — exposing it as a first-class leaf shape is a candidate for `FEAT-EDITORIAL-CONTENT-001` (zero grammar change; one `SHAPE_HALF` entry + glyph).
6. **Icon-less leaves need a sentinel.** Editorial nodes are predominantly labeled boxes *without* icons (`Gate`, `CUA MODEL`), but the leaf production requires an icon token, and only the Mermaid-flowchart path produces icon-less components today. The prototypes write `…/none/…`; recommendation: reserve `none` as an icon value meaning "no icon — draw the shape outline with the label inside" (reusing the existing flowchart-node render path). Carried into `FEAT-EDITORIAL-CONTENT-001`.

## 7. Acceptance criteria (for the future implementation)

1. All three prototypes parse with zero diagnostics after phases 1–3 of the `RES-EDITORIAL-001` §13 roadmap, in both Python and JS.
2. Rendered SVGs use real `<text>` throughout (no `<foreignObject>`); `rsvg-convert` rasterizes them with no text loss.
3. Each prototype lands as a golden fixture (`packages/python/tests/diagrams/<name>/input.kymo` + `output.svg`); all pre-existing goldens remain byte-identical.
4. Prototype A's render, PIL-diffed against the OpenAI reference at matched canvas scale, scores materially better than the §4 Graphviz vehicle (which could not place badges on edges, pattern-fill boxes, or balance node sizes).
5. Theme-less, badge-less diagrams (the entire existing sample corpus) render byte-identically before/after each phase.

## Annex A — Revision history

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 1.0     | 2026-06-12 | anhv   | Initial issue: three paper prototypes (OpenAI CUA loop, ByteByteGo numbered request flow, Anthropic prompt chaining) in the proposed F1–F5 syntax, coverage matrix, expressiveness gaps, acceptance criteria. |
