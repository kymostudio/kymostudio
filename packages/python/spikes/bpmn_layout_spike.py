#!/usr/bin/env python3
"""THROWAWAY SPIKE — bpmn-dsl Phase 0 (P0). NOT production code.

Purpose (FR-8 only): prove that a left-to-right Sugiyama-style layered layout
produces a *sane, legible* diagram for the BPMN "order" graph — especially the
parallel split/join (SP -> {Pack, Invoice} -> Sync) — before we invest the 13
points of P2 building the real `src/kymo/bpmn_layout.py`.

It hard-codes the positionless order graph, runs a compact layered-layout
pipeline (rank -> order -> coordinates -> orthogonal routing), then reuses the
existing renderer (`kymo.to_svg.render`) to emit an SVG we can eyeball.

Out of scope here: the `bpmn { }` parser (P1), `finalize` integration + golden
(P2), JS parity (P3), and pin override `@ (x,y)` / FR-9 (P2). Pure auto-layout.

Run:  cd packages/python && uv run python spikes/bpmn_layout_spike.py
"""
from __future__ import annotations

from pathlib import Path

from kymo.model import Component, Diagram, Edge
from kymo.to_svg import render

# ── The order graph (positionless) — mirrors samples/order-fulfillment.kymo ──
# (id, kind, label)
NODES: list[tuple[str, str, str]] = [
    ("S",  "start", "Order received"),
    ("V",  "task",  "Validate order"),
    ("GW", "xor",   "In stock?"),
    ("P",  "task",  "Process payment"),
    ("N",  "task",  "Notify customer"),
    ("C",  "end!",  "Order cancelled"),
    ("SP", "and",   "Split"),
    ("Pk", "task",  "Pack"),
    ("Iv", "task",  "Invoice"),
    ("Sy", "and",   "Sync"),
    ("Sh", "task",  "Ship order"),
    ("D",  "end",   "Order delivered"),
]

# (src, dst, label) — all sequence flows
EDGES: list[tuple[str, str, str]] = [
    ("S",  "V",  ""),
    ("V",  "GW", ""),
    ("GW", "P",  "Yes"),
    ("GW", "N",  "No"),
    ("N",  "C",  ""),
    ("P",  "SP", ""),
    ("SP", "Pk", ""),
    ("SP", "Iv", ""),
    ("Pk", "Sy", ""),
    ("Iv", "Sy", ""),
    ("Sy", "Sh", ""),
    ("Sh", "D",  ""),
]

# kind -> (shape, icon/marker, (w, h))
KIND = {
    "start": ("bpmn-start",   "",          (36, 36)),
    "end":   ("bpmn-end",     "",          (36, 36)),
    "end!":  ("bpmn-end",     "terminate", (36, 36)),
    "task":  ("bpmn-task",    "",          (100, 80)),
    "xor":   ("bpmn-gateway", "exclusive", (50, 50)),
    "and":   ("bpmn-gateway", "parallel",  (50, 50)),
}

# Layout constants (spike-tuned; carry the *idea* not the values to P2).
H_GAP = 70          # horizontal gap between layer columns
V_GAP = 46          # vertical gap between nodes within a layer
MARGIN = 40         # canvas margin
BASELINE = 220      # y of the main spine before median alignment
ORDER_SWEEPS = 4    # fixed -> deterministic (NFR-1)
ALIGN_SWEEPS = 12   # fixed


def _median(vals: list[float]) -> float:
    s = sorted(vals)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


def main() -> None:
    ids = [n[0] for n in NODES]
    idx = {n: i for i, n in enumerate(ids)}          # stable tie-break key
    kind = {n[0]: n[1] for n in NODES}
    label = {n[0]: n[2] for n in NODES}
    size = {n: KIND[kind[n]][2] for n in ids}
    hw = {n: size[n][0] / 2 for n in ids}
    hh = {n: size[n][1] / 2 for n in ids}

    succ: dict[str, list[str]] = {n: [] for n in ids}
    pred: dict[str, list[str]] = {n: [] for n in ids}
    indeg = {n: 0 for n in ids}
    for s, d, _ in EDGES:
        succ[s].append(d)
        pred[d].append(s)
        indeg[d] += 1

    # ── 1. Rank (longest-path; DAG so no back-edge reversal needed) ──────────
    rank = {n: 0 for n in ids}
    deg = dict(indeg)
    queue = [n for n in ids if indeg[n] == 0]
    while queue:
        queue.sort(key=lambda n: idx[n])             # stable
        u = queue.pop(0)
        for v in succ[u]:
            rank[v] = max(rank[v], rank[u] + 1)
            deg[v] -= 1
            if deg[v] == 0:
                queue.append(v)
    max_rank = max(rank.values())
    layers: dict[int, list[str]] = {L: [] for L in range(max_rank + 1)}
    for n in ids:
        layers[rank[n]].append(n)

    # NOTE: every order-graph edge spans exactly one layer, so step 2 of the
    # Sugiyama pipeline (dummy nodes for long edges) is a no-op here — see
    # README findings: P2 must implement it for graphs that skip layers.

    # ── 3. Ordering within layers (barycenter sweeps; stable) ────────────────
    order = {L: list(layers[L]) for L in layers}
    for it in range(ORDER_SWEEPS):
        down = it % 2 == 0
        seq = range(1, max_rank + 1) if down else range(max_rank - 1, -1, -1)
        for L in seq:
            adj = L - 1 if down else L + 1
            nbr = pred if down else succ
            pos = {n: i for i, n in enumerate(order[adj])} if adj in order else {}
            cur = {n: i for i, n in enumerate(order[L])}

            def bary(n: str) -> float:
                ms = [pos[m] for m in nbr[n] if m in pos]
                return sum(ms) / len(ms) if ms else float(cur[n])

            order[L] = sorted(order[L], key=lambda n: (bary(n), idx[n]))

    # ── 4. Coordinates ───────────────────────────────────────────────────────
    # x: cumulative per-layer column centres.
    xcen: dict[int, float] = {}
    right = MARGIN
    for L in range(max_rank + 1):
        max_w = max(size[n][0] for n in layers[L])
        xcen[L] = right + H_GAP + max_w / 2
        right = xcen[L] + max_w / 2
    cx = {n: xcen[rank[n]] for n in ids}

    # y: seed each layer stacked & centred on BASELINE, then median-align so
    # single-in/single-out chains go collinear (Brandes-Köpf-lite).
    cy: dict[str, float] = {}
    for L in layers:
        nodes = order[L]
        total = sum(size[n][1] for n in nodes) + V_GAP * (len(nodes) - 1)
        run = BASELINE - total / 2
        for n in nodes:
            cy[n] = run + hh[n]
            run += size[n][1] + V_GAP

    for it in range(ALIGN_SWEEPS):
        down = it % 2 == 0
        seq = range(1, max_rank + 1) if down else range(max_rank - 1, -1, -1)
        nbr = pred if down else succ
        for L in seq:
            nodes = order[L]
            desired = [(_median([cy[m] for m in nbr[n]]) if nbr[n] else cy[n])
                       for n in nodes]
            # place in order, honour min separation, stay near desired
            placed: list[float] = []
            for i, n in enumerate(nodes):
                y = desired[i]
                if i:
                    gap = hh[nodes[i - 1]] + V_GAP + hh[n]
                    y = max(y, placed[-1] + gap)
                placed.append(y)
            # the min-gap pass only ever pushes DOWN -> re-centre the block on
            # its desired mean so the layout doesn't ratchet downward each sweep
            # (and symmetric forks stay symmetric around the parent).
            shift = (sum(desired) - sum(placed)) / len(placed)
            for n, y in zip(nodes, placed):
                cy[n] = y + shift

    # normalise vertically so the topmost glyph sits at MARGIN
    dy = MARGIN - min(cy[n] - hh[n] for n in ids)
    for n in ids:
        cy[n] += dy

    # ── Build resolved Diagram (integer, deterministic) ──────────────────────
    comps = []
    for n in ids:
        shape, icon, sz = KIND[kind[n]]
        comps.append(Component(
            id=n, name=label[n], subtitle="", icon=icon, shape=shape,
            accent="blue", pos=(round(cx[n]), round(cy[n])), size=sz,
        ))

    # ── 6. Orthogonal routing -> Edge.points ─────────────────────────────────
    edges = []
    for s, d, lbl in EDGES:
        sx, sy = round(cx[s] + hw[s]), round(cy[s])      # exit right of src
        tx, ty = round(cx[d] - hw[d]), round(cy[d])      # enter left of dst
        if sy == ty:
            pts = [(sx, sy), (tx, ty)]
        else:
            mx = (sx + tx) // 2
            pts = [(sx, sy), (mx, sy), (mx, ty), (tx, ty)]
        lpos = (sx + 14, (sy + ty) // 2 - 8) if lbl else None
        edges.append(Edge(src=s, dst=d, label=lbl, points=pts,
                          bpmn_flow="sequence", label_pos=lpos))

    width = round(max(cx[n] + hw[n] for n in ids) + MARGIN)
    height = round(max(cy[n] + hh[n] for n in ids) + MARGIN + 24)
    diagram = Diagram(width=width, height=height,
                      title="Order fulfilment (P0 spike)",
                      components=comps, edges=edges)

    out = Path(__file__).parent / "order-spike.svg"
    out.write_text(render(diagram), encoding="utf-8")
    print(f"wrote {out}  ({width}x{height}, {len(comps)} nodes, {len(edges)} edges)")
    for L in range(max_rank + 1):
        print(f"  L{L}: {order[L]}")


if __name__ == "__main__":
    main()
