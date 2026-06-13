# spikes/ — throwaway prototypes

> **Throwaway.** Code here is *not* production and is *not* imported by `kymo`.
> It exists to de-risk a design cheaply before the real implementation. Keep it
> as a reference; do not build on it.

## `bpmn_layout_spike.py` — bpmn-dsl Phase 0 (P0)

Spec docs: `docs/specs/format-bpmn/modules/dsl/`; plan: `docs/specs/format-bpmn/modules/dsl/PLAN.md`
(`*-BPMN-DSL-001`). This spike covers **P0** from that plan: a throwaway
layered-layout prototype on the order graph.

- **Question it answers (FR-8):** does a left-to-right Sugiyama-style layered
  layout produce a *sane, legible* BPMN diagram — especially the parallel
  split/join `Split → {Pack, Invoice} → Sync` — so we can confidently invest the
  13 points of **P2** (`src/kymo/bpmn_layout.py`)?
- **Exit criteria (PLAN §3):** *Sane LR layout w/ split-join; legible routing.*
- **Scope:** auto-layout only. No parser (P1), no `finalize`/golden (P2), no JS
  (P3), no pin override `@ (x,y)` / FR-9 (P2).

### Run

```bash
cd packages/python
uv run python spikes/bpmn_layout_spike.py      # writes spikes/order-spike.svg
rsvg-convert spikes/order-spike.svg -o spikes/order-spike.png   # eyeball
```

### Pipeline implemented (compact, per DESIGN §3)

1. **Rank** — longest-path from the source (DAG; no back-edge reversal needed).
2. **Dummy nodes** — *not exercised*: every order-graph edge spans exactly one
   layer (see finding #2).
3. **Ordering** — fixed barycenter sweeps, stable tie-break by declaration index.
4. **Coordinates** — cumulative per-layer x columns; y by median alignment
   (Brandes–Köpf-lite) with min-gap separation, **re-centred on the desired mean
   each sweep** so the layout doesn't ratchet downward and forks stay symmetric.
5. ~~Pin override~~ — skipped (FR-9 → P2).
6. **Orthogonal routing** — straight when source/target are collinear, else an
   elbow through the mid-x of the inter-layer gap → `Edge.points`.

Reuses the real model + renderer (`kymo.model`, `kymo.to_svg.render`); the
prototype only computes geometry, exactly as the eventual block will.

## Verdict — PASS ✅

`order-spike.svg` renders a clean left-to-right flow with the xor branch
(Yes→Process payment / No→Notify→Order cancelled) and the parallel split/join
rendered legibly — orthogonal elbows, symmetric fork, no node overlaps, no edges
crossing glyphs. All BPMN markers (`×` exclusive, `+` parallel, terminate,
start/end) render via the existing `bpmn_shapes`. Output is **deterministic**
(byte-identical across runs — NFR-1 sanity). The layered approach is sound;
**P2 is greenlit.**

## Findings to carry into P2 (`src/kymo/bpmn_layout.py`)

1. **Trunk straightness needs primary-path pinning.** Symmetric fork-centring
   lifts the main trunk ~60px at the xor (the "Yes" continuation rides up with
   the branch). The hand-placed benchmark `samples/order-fulfillment.svg` keeps
   the trunk dead-straight and pushes only the off-axis branch (Notify) away.
   DESIGN §3 already calls for "keeping single-in/single-out chains collinear" —
   P2 must implement that explicitly: identify the continuing successor and keep
   it on the parent's y, offsetting only true branches (priority/median method),
   rather than centring every layer block.
2. **Implement real dummy nodes.** This graph has no layer-skipping edges, so
   step 2 was a no-op. A graph where an edge spans >1 layer (e.g. a flow that
   bypasses a stage) needs dummy nodes for routing channels + crossing accounting.
3. **Gap constants are eyeballed** (`H_GAP=70`, `V_GAP=46`). The benchmark uses
   a wider vertical spread for branches; P2 should pick defaults deliberately and
   freeze them (golden-stability) — e.g. larger v-gap for readability.
4. **Routing is naive** (single mid-x elbow). Fan-out/fan-in at a gateway can
   share a bend channel; P2 should consider port spreading on the gateway side so
   parallel branches don't overlap their elbows on denser graphs.
5. **Determinism is easy to keep** here (stable sorts + fixed sweep counts +
   integer coords); preserve exactly this discipline in P2 for byte-stable goldens.

## `bpmn_export_spike.py` — bpmn-export Phase 0 (P0)

Spec docs: `docs/specs/format-bpmn/modules/export/`; plan: `docs/specs/format-bpmn/modules/export/PLAN.md`
(`*-BPMN-EXPORT-001`). Covers **P0** from that plan: a throwaway `to_bpmn`
prototype proving round-trip.

- **Question it answers (FR-4):** can a `to_bpmn` emitter (inverse of `from_bpmn`)
  turn a kymo `Diagram` back into BPMN 2.0 XML that **re-imports and renders the
  same**? De-risks the **DI coordinate inverse** (centre → top-left `<dc:Bounds>`)
  and the **element/flow mapping** (inverting the importer's classification).
- **Flow:** `samples/order.bpmn` → `from_bpmn.parse` → export → re-parse → compare +
  render both. Reuses the real importer + renderer.

### Verdict — PASS ✅

`order.bpmn` (single process) **round-trips exactly**: 7 components + 6 edges
preserve `shape`/`icon`/`pos`/`size` and flow kinds (sequence + default), and the
re-imported render is **byte-identical** to the original (`order-orig.svg` ==
`order-roundtrip.svg`). Validated mapping coverage: message start, plain/terminate
end, user/service/script tasks, exclusive gateway, `sequenceFlow`, default flow.
**P1 is greenlit.**

### Findings to carry into P1 / P2

1. **`isMarkerVisible` is a DI attribute, not semantic.** `from_bpmn` reads it off
   `<bpmndi:BPMNShape>`, so the exclusive-gateway X must be emitted there: gateway
   `icon=="exclusive"` → `BPMNShape isMarkerVisible="true"`; `icon==""` → omit it.
2. **Pools/lanes (Regions) are the P2 work.** `collaboration.bpmn`: component types
   (incl. service/manual/send tasks, data-object/store, annotation), message flows,
   and associations all round-trip — but the 4 pool/lane `Region`s are *not* exported,
   which drops them **and** shifts every component by a uniform `(−70,−60)` (the
   importer re-normalises to `MARGIN` against a now-smaller bounding box). **P2 must
   emit `<collaboration>` + `<participant>`/`<laneSet>`/`<lane><flowNodeRef>`** — that
   also fixes the position drift. (No de-normalisation is needed when the diagram is
   already MARGIN-normalised, as `order.bpmn` proves.)
3. **Flow ids are generated** (`flow0`, …) — kymo `Edge` has no id. Fine; the
   `default="<id>"` attribute on the source node references the generated id.
4. **Round-trip is semantic + DI, not byte-of-original.** `conditionExpression` on a
   *gateway*-sourced flow isn't captured by the importer (it becomes `sequence`), so
   it's absent on export — inherent import lossiness, not an export bug.
5. **Intermediate catch vs throw** both map to `bpmn-intermediate`; export defaults
   to `intermediateCatchEvent` (minor; P1 may carry a hint if needed).
6. Build XML with `xml.etree.ElementTree` (registered `bpmn`/`bpmndi`/`dc`/`di`
   namespaces) for well-formed escaping — works cleanly; reuse in `src/kymo/to_bpmn.py`.
