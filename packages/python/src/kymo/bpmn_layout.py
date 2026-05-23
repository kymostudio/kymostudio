"""Layered (Sugiyama) left-to-right layout for `bpmn { … }` blocks.

Consumes the positionless `BpmnBlock` AST (parsed by `dsl.py`) on
`Diagram.bpmn_blocks` and turns each block into positioned `Component`s and
orthogonally-routed `Edge`s (with `points`), so the existing renderer draws it
unchanged (FR-10). Pipeline:

  1. rank        — longest-path (Kahn); back-edges reversed for ranking
  2. dummy nodes — split edges spanning >1 layer into unit segments
  3. order       — barycenter sweeps (crossing reduction)
  4. coords      — cumulative x columns; y by median alignment with the longest
                   path pinned to a straight baseline (the P0 finding-#1 fix)
  5. pins        — `@ (x,y)` overrides a node's centre (FR-9)
  6. routing     — orthogonal polylines → Edge.points

Deterministic (NFR-1): every sort has a stable secondary key (declaration
index), sweep counts are fixed and even, and coordinates are integerised only
at emit. The block owns canvas sizing; `cli.py` skips `resolve_alignments` for
these diagrams (like `.bpmn`), since the geometry is already absolute.
"""
from __future__ import annotations

from collections import defaultdict

from .model import Component, Diagram, Edge

# Box sizes by resolved shape (mirrors model.SHAPE_HALF × 2): event 36,
# task 100×80, gateway 50. Drives column widths + anchor math.
SIZE: dict[str, tuple[int, int]] = {
    "bpmn-start": (36, 36), "bpmn-end": (36, 36),
    "bpmn-intermediate": (36, 36), "bpmn-boundary": (36, 36),
    "bpmn-task": (100, 80), "bpmn-subprocess": (100, 80),
    "bpmn-gateway": (50, 50),
    "bpmn-data-object": (36, 50), "bpmn-data-store": (50, 50),
    "bpmn-annotation": (100, 40),
}
_DEFAULT_SIZE = (100, 80)

H_GAP = 80           # horizontal gap between layer columns
V_GAP = 50           # vertical gap between node boxes within a layer
MARGIN = 40          # canvas margin
BLOCK_GAP = 80       # vertical gap when stacking multiple blocks
ORDER_SWEEPS = 6     # fixed, even → deterministic (NFR-1)
ALIGN_SWEEPS = 8     # fixed, even

# y-priorities: higher holds its position and pushes lower ones aside.
_PRIO_TRUNK = 2_000_000   # the longest path — pinned to a straight baseline
_PRIO_DUMMY = 1_000_000   # long-edge channels stay straight
_PRIO_CHAIN = 10_000      # single-in/single-out links


def _median(vals: list[float]) -> float:
    s = sorted(vals)
    n = len(s)
    m = n // 2
    return s[m] if n % 2 else (s[m - 1] + s[m]) / 2


def layout(diagram: Diagram) -> None:
    """Lay out every `bpmn { }` block on `diagram` in place (FR-8/9/10)."""
    blocks = getattr(diagram, "bpmn_blocks", None)
    if not blocks:
        return
    top_y = float(MARGIN)
    max_right = float(MARGIN)
    bottom = float(MARGIN)
    for block in blocks:
        comps, edges, right, bot = _layout_block(block, top_y)
        diagram.components.extend(comps)
        diagram.edges.extend(edges)
        max_right = max(max_right, right)
        bottom = max(bottom, bot)
        top_y = bot + BLOCK_GAP
    diagram.width = int(round(max_right + MARGIN))
    diagram.height = int(round(bottom + MARGIN))
    diagram.bpmn_blocks = []


def _back_edges(ids, flows, decl) -> set[int]:
    """Flow indices that close a cycle (DFS in declaration order)."""
    out = defaultdict(list)
    for k, f in enumerate(flows):
        if f.src in decl and f.dst in decl:
            out[f.src].append((decl[f.dst], f.dst, k))
    color = {i: 0 for i in ids}          # 0 white, 1 gray, 2 black
    back: set[int] = set()
    for root in sorted(ids, key=lambda x: decl[x]):
        if color[root] != 0:
            continue
        color[root] = 1
        stack = [(root, 0, sorted(out[root]))]
        while stack:
            u, ki, outs = stack[-1]
            if ki < len(outs):
                stack[-1] = (u, ki + 1, outs)
                _, v, fk = outs[ki]
                if color[v] == 1:
                    back.add(fk)
                elif color[v] == 0:
                    color[v] = 1
                    stack.append((v, 0, sorted(out[v])))
            else:
                color[u] = 2
                stack.pop()
    return back


def _assign_sides(trunk, vrank, vsucc, vpred, vdecl):
    """Give each non-trunk node a side (-1 above / +1 below the trunk), one side
    per *branch* (connected component of non-trunk nodes), alternating by the
    branch's attachment rank — so branches balance on both sides of the straight
    trunk instead of all piling up below it."""
    adj = defaultdict(set)
    for u in vrank:
        if u in trunk:
            continue
        for v in vsucc[u]:
            if v not in trunk:
                adj[u].add(v)
                adj[v].add(u)
    seen: set[str] = set()
    comps: list[list[str]] = []
    for n in sorted((x for x in vrank if x not in trunk), key=lambda x: vdecl[x]):
        if n in seen:
            continue
        seen.add(n)
        stack = [n]
        comp = []
        while stack:
            u = stack.pop()
            comp.append(u)
            for w in adj[u]:
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        comps.append(comp)

    def anchor(comp):
        rs = [vrank[v] for u in comp for v in (vsucc[u] + vpred[u]) if v in trunk]
        return min(rs) if rs else min(vrank[u] for u in comp)

    comps.sort(key=lambda c: (anchor(c), min(vdecl[u] for u in c)))
    side: dict[str, int] = {}
    for i, comp in enumerate(comps):
        s = -1 if i % 2 == 0 else 1            # above, below, above, …
        for u in comp:
            side[u] = s
    return side


def _layout_block(block, top_y: float):
    nodes = block.nodes
    flows = block.flows
    ids = [n.id for n in nodes]
    decl = {nid: i for i, nid in enumerate(ids)}
    sw = {n.id: SIZE.get(n.shape, _DEFAULT_SIZE)[0] for n in nodes}
    sh = {n.id: SIZE.get(n.shape, _DEFAULT_SIZE)[1] for n in nodes}

    # ── 1. Rank (longest-path; back-edges reversed) ──────────────────────
    back = _back_edges(ids, flows, decl)
    succ = defaultdict(list)
    pred = defaultdict(list)
    indeg = defaultdict(int)
    valid = []
    for k, f in enumerate(flows):
        if f.src not in decl or f.dst not in decl:
            continue
        valid.append(k)
        s, d = (f.dst, f.src) if k in back else (f.src, f.dst)
        succ[s].append(d)
        pred[d].append(s)
        indeg[d] += 1
    rank = {nid: 0 for nid in ids}
    deg = {nid: indeg[nid] for nid in ids}
    queue = sorted([nid for nid in ids if deg[nid] == 0], key=lambda x: decl[x])
    while queue:
        u = queue.pop(0)
        for v in succ[u]:
            if rank[u] + 1 > rank[v]:
                rank[v] = rank[u] + 1
            deg[v] -= 1
            if deg[v] == 0:
                queue.append(v)
                queue.sort(key=lambda x: decl[x])

    # trunk = one longest source→sink path, pinned straight (finding #1)
    trunk: set[str] = set()
    if ids:
        cur = max(ids, key=lambda n: (rank[n], -decl[n]))
        while cur is not None:
            trunk.add(cur)
            ps = pred[cur]
            cur = max(ps, key=lambda p: (rank[p], -decl[p])) if ps else None

    # ── 2. Dummy nodes for edges spanning >1 layer ───────────────────────
    vsucc = defaultdict(list)
    vpred = defaultdict(list)
    vrank = dict(rank)
    vw = dict(sw)
    vh = dict(sh)
    vdecl = dict(decl)
    is_dummy: dict[str, bool] = {}
    segments: dict[int, list[str]] = {}     # flow k → [src, …dummies…, dst]
    dn = 0
    for k in valid:
        f = flows[k]
        s, d = (f.dst, f.src) if k in back else (f.src, f.dst)
        r0, r1 = rank[s], rank[d]
        if abs(r1 - r0) <= 1:
            seg = [s, d]
            if r0 != r1:
                vsucc[s].append(d)
                vpred[d].append(s)
        else:
            step = 1 if r1 > r0 else -1
            chain = [s]
            prev = s
            for r in range(r0 + step, r1, step):
                dv = f"__d{dn}"
                dn += 1
                vrank[dv] = r
                is_dummy[dv] = True
                vw[dv] = 0
                vh[dv] = 0
                vdecl[dv] = decl[s] * 100000 + dn
                vsucc[prev].append(dv)
                vpred[dv].append(prev)
                chain.append(dv)
                prev = dv
            vsucc[prev].append(d)
            vpred[d].append(prev)
            chain.append(d)
            seg = chain
        segments[k] = list(reversed(seg)) if k in back else seg

    max_rank = max(vrank.values()) if vrank else 0
    layers = {L: [] for L in range(max_rank + 1)}
    for n in sorted(vrank, key=lambda x: vdecl[x]):
        layers[vrank[n]].append(n)

    side = _assign_sides(trunk, vrank, vsucc, vpred, vdecl)

    # ── 3. Ordering (barycenter sweeps) ──────────────────────────────────
    order = {L: list(layers[L]) for L in layers}
    for it in range(ORDER_SWEEPS):
        down = it % 2 == 0
        seq = range(1, max_rank + 1) if down else range(max_rank - 1, -1, -1)
        nbr = vpred if down else vsucc
        for L in seq:
            adj = L - 1 if down else L + 1
            pos = {n: i for i, n in enumerate(order.get(adj, []))}
            cur_idx = {n: i for i, n in enumerate(order[L])}

            def bary(n, _pos=pos, _cur=cur_idx, _nbr=nbr):
                ms = [_pos[m] for m in _nbr[n] if m in _pos]
                return sum(ms) / len(ms) if ms else float(_cur[n])

            order[L] = sorted(order[L], key=lambda n: (bary(n), vdecl[n]))

    # Group each layer `above | trunk | below` so branches balance on both
    # sides of the straight trunk (barycenter order preserved within a side).
    for L in layers:
        col = order[L]
        order[L] = (
            [n for n in col if side.get(n, 0) < 0]
            + [n for n in col if side.get(n, 0) == 0]
            + [n for n in col if side.get(n, 0) > 0]
        )

    # ── 4. Coordinates ───────────────────────────────────────────────────
    cx: dict[str, float] = {}
    right = float(MARGIN)
    for L in range(max_rank + 1):
        col_w = max((vw[n] for n in layers[L]), default=0)
        center = right + H_GAP + col_w / 2
        for n in layers[L]:
            cx[n] = center
        right = center + col_w / 2

    cy: dict[str, float] = {}
    for L in layers:
        col = order[L]
        total = sum(vh[n] for n in col) + V_GAP * max(len(col) - 1, 0)
        run = -total / 2
        for n in col:
            cy[n] = run + vh[n] / 2
            run += vh[n] + V_GAP

    def prio(n: str) -> int:
        if n in trunk:
            return _PRIO_TRUNK
        if is_dummy.get(n):
            return _PRIO_DUMMY
        if len(vpred[n]) <= 1 and len(vsucc[n]) <= 1:
            return _PRIO_CHAIN
        return len(vpred[n]) + len(vsucc[n])

    for it in range(ALIGN_SWEEPS):
        down = it % 2 == 0
        seq = range(1, max_rank + 1) if down else range(max_rank - 1, -1, -1)
        nbr = vpred if down else vsucc
        for L in seq:
            col = order[L]
            desired = [
                0.0 if n in trunk
                else (_median([cy[m] for m in nbr[n]]) if nbr[n] else cy[n])
                for n in col
            ]
            _place_layer(col, [prio(n) for n in col], desired, cy, vh, vdecl)

    if cy:
        dy = top_y - min(cy[n] - vh[n] / 2 for n in ids)
        for n in cy:
            cy[n] += dy

    # ── 5. Pin override (FR-9) ───────────────────────────────────────────
    for n in nodes:
        if n.pin is not None:
            cx[n.id] = float(n.pin[0])
            cy[n.id] = float(n.pin[1])

    # ── emit components ──────────────────────────────────────────────────
    comps = []
    for n in nodes:
        comps.append(Component(
            id=n.id, name=n.label, subtitle="", icon=n.marker,
            shape=n.shape, accent="blue",
            pos=(int(round(cx[n.id])), int(round(cy[n.id]))),
            size=SIZE.get(n.shape, _DEFAULT_SIZE),
        ))

    # ── 6. Routing → Edge.points ─────────────────────────────────────────
    multi_out = {nid: len(vsucc[nid]) > 1 for nid in ids}
    edges = []
    for k in valid:
        f = flows[k]
        pts = _route(segments[k], cx, cy, vw, vh, multi_out, k in back)
        edges.append(Edge(
            src=f.src, dst=f.dst, label=f.label, points=pts,
            bpmn_flow=f.flow, label_pos=_label_pos(pts) if f.label else None,
        ))

    right_ext = max((cx[n.id] + sw[n.id] / 2 for n in nodes), default=float(MARGIN))
    bot_ext = max((cy[n.id] + sh[n.id] / 2 for n in nodes), default=float(MARGIN))
    for e in edges:
        for px, py in e.points:
            right_ext = max(right_ext, px)
            bot_ext = max(bot_ext, py)
    return comps, edges, right_ext, bot_ext


def _place_layer(col, prios, desired, cy, vh, vdecl) -> None:
    """Place a layer's nodes near their desired y, honouring min-gap and node
    priority: higher-priority nodes hold their spot, lower ones yield."""
    n = len(col)
    if n == 0:
        return

    def gap(k: int) -> float:                # between col[k-1] and col[k]
        return vh[col[k - 1]] / 2 + V_GAP + vh[col[k]] / 2

    y = [cy[c] for c in col]
    placed = [False] * n
    for i in sorted(range(n), key=lambda i: (-prios[i], vdecl[col[i]])):
        lo, hi = float("-inf"), float("inf")
        cum = 0.0
        for j in range(i - 1, -1, -1):       # nearest placed above
            cum += gap(j + 1)
            if placed[j]:
                lo = y[j] + cum
                break
        cum = 0.0
        for j in range(i + 1, n):            # nearest placed below
            cum += gap(j)
            if placed[j]:
                hi = y[j] - cum
                break
        want = desired[i]
        if want > hi:
            want = hi
        if want < lo:
            want = lo
        y[i] = want
        placed[i] = True
    for i, c in enumerate(col):
        cy[c] = y[i]


def _route(chain, cx, cy, vw, vh, multi_out, reverse):
    """Orthogonal polyline through the (real + dummy) chain, src→dst."""
    pts: list[tuple[float, float]] = []
    for k in range(len(chain) - 1):
        a, b = chain[k], chain[k + 1]
        ax, ay, bx, by = cx[a], cy[a], cx[b], cy[b]
        first = k == 0
        last = k == len(chain) - 2
        ahw, ahh = vw[a] / 2, vh[a] / 2
        bhw = vw[b] / 2
        sx, sy = (bx - bhw if last else bx), by
        if ay == by:
            ex = ax + ahw if first else ax
            seg = [(ex, ay), (sx, sy)]
        elif first and multi_out.get(a):
            # fan-out: leave the gateway top/bottom at its centre-x, drop to the
            # branch's y, then run horizontally into it (benchmark pattern).
            ey = ay - ahh if by < ay else ay + ahh
            seg = [(ax, ey), (ax, sy), (sx, sy)]
        else:
            ex = ax + ahw if first else ax
            mx = (ex + sx) / 2
            seg = [(ex, ay), (mx, ay), (mx, sy), (sx, sy)]
        pts.extend(seg if not pts else seg[1:])
    pts = _dedupe([(int(round(x)), int(round(y))) for x, y in pts])
    if reverse:
        pts.reverse()
    return pts


def _dedupe(pts):
    """Drop duplicate and collinear interior points so straight runs stay 2-pt."""
    if len(pts) <= 2:
        return pts
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        x0, y0 = out[-1]
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        if (x0 == x1 == x2) or (y0 == y1 == y2):
            continue                          # collinear → skip the midpoint
        if (x1, y1) != (x0, y0):
            out.append(pts[i])
    if pts[-1] != out[-1]:
        out.append(pts[-1])
    return out


def _label_pos(pts):
    if len(pts) < 2:
        return None
    (x0, y0), (x1, y1) = pts[0], pts[1]
    return (int(round((x0 + x1) / 2)), int(round((y0 + y1) / 2)) - 8)
