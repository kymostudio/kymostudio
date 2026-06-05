"""BPMN 2.0 lint — structural sanity + import-fidelity checks.

`lint(xml_text)` returns an ordered list of `Finding`s for a BPMN file.
It deliberately works on the **raw XML**, not the imported `Diagram`, so
it can flag the very things `from_bpmn.parse` silently drops:

  * a ``<bpmndi:BPMNShape>`` with no ``<dc:Bounds>`` (won't render),
  * a ``<bpmndi:BPMNEdge>`` with fewer than two waypoints (won't render),
  * a sequence/message flow whose ``sourceRef`` / ``targetRef`` points at a
    missing element (dangling), and
  * a visible node or flow with no DI shape / edge at all (won't render).

On top of that it runs ordinary BPMN graph sanity checks: start events with
an incoming flow, end events with an outgoing flow, activities/gateways with
no incoming or outgoing sequence flow, redundant gateways, disconnected
nodes, and processes missing a start or end event.

Namespaces are ignored throughout (we match on the *local* tag name), like
the importer, so the linter is agnostic to the ``bpmn:`` / ``bpmn2:`` prefix.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from xml.parsers import expat

ERROR = "error"
WARN = "warn"


@dataclass(frozen=True)
class Finding:
    severity: str          # ERROR | WARN
    eid: str               # element id the finding is about ("" if none)
    name: str              # element name/label ("" if unnamed)
    message: str           # human-readable problem
    line: int = 0          # 1-based source line, or 0 if unknown


# ── Semantic tag groups ─────────────────────────────────────────────────
_EVENTS = {
    "startEvent", "endEvent",
    "intermediateCatchEvent", "intermediateThrowEvent", "boundaryEvent",
}
_ACTIVITIES = {
    "task", "userTask", "serviceTask", "scriptTask", "sendTask",
    "receiveTask", "manualTask", "businessRuleTask", "callActivity",
    "subProcess", "transaction", "adHocSubProcess",
}
_GATEWAYS = {
    "exclusiveGateway", "parallelGateway", "inclusiveGateway",
    "eventBasedGateway", "complexGateway",
}
_FLOW_NODES = _EVENTS | _ACTIVITIES | _GATEWAYS

# Visible elements that must carry a DI <BPMNShape> to render.
_SHAPE_NODES = _FLOW_NODES | {
    "participant", "lane", "dataObjectReference", "dataStoreReference",
    "dataInput", "dataOutput", "textAnnotation", "group",
}
# Connecting elements whose attribute sourceRef/targetRef we can resolve.
_REF_FLOWS = {"sequenceFlow", "messageFlow", "association"}
# Connecting elements that must carry a DI <BPMNEdge> to render.
_EDGE_FLOWS = _REF_FLOWS | {"dataInputAssociation", "dataOutputAssociation"}


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _name(elem: ET.Element) -> str:
    return (elem.get("name") or "").strip()


def _line_map(xml_text: str, root: ET.Element) -> dict[ET.Element, int]:
    """Map every element to its 1-based start line.

    Stdlib ElementTree drops source positions, so we re-scan the text with
    expat (whose ``StartElementHandler`` fires in document order, exactly
    like ``root.iter()``) and zip the two streams together.
    """
    starts: list[int] = []
    p = expat.ParserCreate()
    p.StartElementHandler = lambda *_: starts.append(p.CurrentLineNumber)
    try:
        p.Parse(xml_text, True)
    except expat.ExpatError:               # already well-formed per ET; be safe
        return {}
    return dict(zip(root.iter(), starts))


def lint(xml_text: str) -> list[Finding]:
    """Lint BPMN 2.0 XML; return findings in a stable, document-ish order."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        line = exc.position[0] if getattr(exc, "position", None) else 0
        return [Finding(ERROR, "", "", f"not well-formed XML: {exc}", line)]

    lines = _line_map(xml_text, root)
    out: list[Finding] = []

    def add(sev: str, el: ET.Element | None, eid: str, name: str, msg: str) -> None:
        out.append(Finding(sev, eid, name, msg, lines.get(el, 0) if el is not None else 0))

    # Index semantic elements by id, and collect DI shapes/edges.
    ids: dict[str, ET.Element] = {}
    nodes: list[tuple[str, ET.Element]] = []        # (local tag, elem) for shape nodes
    flows: list[tuple[str, ET.Element]] = []        # (local tag, elem) for edge flows
    di_shapes: list[ET.Element] = []
    di_edges: list[ET.Element] = []
    processes: list[ET.Element] = []
    for el in root.iter():
        t = _local(el.tag)
        eid = el.get("id")
        if eid and eid not in ids:
            ids[eid] = el
        if t in _SHAPE_NODES:
            nodes.append((t, el))
        if t in _EDGE_FLOWS:
            flows.append((t, el))
        if t == "process":
            processes.append(el)
        if t == "BPMNShape":
            di_shapes.append(el)
        elif t == "BPMNEdge":
            di_edges.append(el)

    shaped_refs = {s.get("bpmnElement") for s in di_shapes if s.get("bpmnElement")}
    edged_refs = {e.get("bpmnElement") for e in di_edges if e.get("bpmnElement")}

    # ── Flow connectivity tables (sequence-flow only) ───────────────────
    seq_in: dict[str, int] = {}
    seq_out: dict[str, int] = {}
    any_in: dict[str, int] = {}     # sequence + message, for "disconnected"
    any_out: dict[str, int] = {}

    # ── Dangling source/target refs ─────────────────────────────────────
    for tag, fl in flows:
        if tag not in _REF_FLOWS:
            continue
        fid, fname = fl.get("id") or "", _name(fl)
        for kind in ("sourceRef", "targetRef"):
            ref = fl.get(kind)
            if not ref:
                add(WARN, fl, fid, fname, f"has no {kind}")
            elif ref not in ids:
                add(ERROR, fl, fid, fname, f"{kind} '{ref}' not found")
        if tag in ("sequenceFlow", "messageFlow"):
            src, dst = fl.get("sourceRef"), fl.get("targetRef")
            tbl_in = (seq_in, any_in) if tag == "sequenceFlow" else (any_in,)
            tbl_out = (seq_out, any_out) if tag == "sequenceFlow" else (any_out,)
            if dst:
                for t in tbl_in:
                    t[dst] = t.get(dst, 0) + 1
            if src:
                for t in tbl_out:
                    t[src] = t.get(src, 0) + 1

    # ── Per-node graph sanity ───────────────────────────────────────────
    for tag, el in nodes:
        if tag not in _FLOW_NODES:
            continue
        nid, nm = el.get("id") or "", _name(el)
        si, so = seq_in.get(nid, 0), seq_out.get(nid, 0)
        ai, ao = any_in.get(nid, 0), any_out.get(nid, 0)

        if ai == 0 and ao == 0:
            sev = ERROR if tag in (_ACTIVITIES | _GATEWAYS) else WARN
            add(sev, el, nid, nm, "is not connected to any flow")
            continue

        if tag == "startEvent":
            if si > 0:
                add(WARN, el, nid, nm, "start event has an incoming flow")
            if so == 0:
                add(WARN, el, nid, nm, "start event has no outgoing flow")
        elif tag == "endEvent":
            if so > 0:
                add(WARN, el, nid, nm, "end event has an outgoing flow")
            if si == 0:
                add(WARN, el, nid, nm, "end event has no incoming flow")
        elif tag == "boundaryEvent":
            if so == 0:
                add(WARN, el, nid, nm, "boundary event has no outgoing flow")
        elif tag in _ACTIVITIES:
            if si == 0:
                add(ERROR, el, nid, nm, "has no incoming sequence flow")
            if so == 0:
                add(ERROR, el, nid, nm, "has no outgoing sequence flow")
        elif tag in _GATEWAYS:
            if si == 0:
                add(ERROR, el, nid, nm, "has no incoming sequence flow")
            if so == 0:
                add(ERROR, el, nid, nm, "has no outgoing sequence flow")
            if si == 1 and so == 1:
                add(WARN, el, nid, nm,
                    "gateway has a single incoming and outgoing flow (redundant)")
        else:                                   # intermediate catch/throw events
            if si == 0:
                add(WARN, el, nid, nm, "has no incoming flow")
            if so == 0:
                add(WARN, el, nid, nm, "has no outgoing flow")

    # ── Process-level start/end presence ────────────────────────────────
    for proc in processes:
        kinds = {_local(ch.tag) for ch in proc.iter()}
        pid, pnm = proc.get("id") or "", _name(proc)
        if "startEvent" not in kinds:
            add(WARN, proc, pid, pnm, "process has no start event")
        if "endEvent" not in kinds:
            add(WARN, proc, pid, pnm, "process has no end event")

    # ── DI fidelity: shapes ─────────────────────────────────────────────
    for shape in di_shapes:
        ref = shape.get("bpmnElement")
        if not ref:
            add(WARN, shape, "", "", "BPMNShape has no bpmnElement")
            continue
        nm = _name(ids[ref]) if ref in ids else ""
        if ref not in ids:
            add(WARN, shape, ref, "", "BPMNShape references unknown element")
        elif not any(_local(ch.tag) == "Bounds" for ch in shape):
            add(WARN, shape, ref, nm, "shape missing <dc:Bounds> (will not render)")

    # ── DI fidelity: edges ──────────────────────────────────────────────
    for edge in di_edges:
        ref = edge.get("bpmnElement")
        if not ref:
            add(WARN, edge, "", "", "BPMNEdge has no bpmnElement")
            continue
        nm = _name(ids[ref]) if ref in ids else ""
        if ref not in ids:
            add(WARN, edge, ref, "", "BPMNEdge references unknown element")
        elif sum(1 for ch in edge if _local(ch.tag) == "waypoint") < 2:
            add(WARN, edge, ref, nm, "edge has fewer than 2 waypoints (will not render)")

    # ── Nodes / flows with no DI at all ─────────────────────────────────
    for tag, el in nodes:
        nid = el.get("id")
        if nid and nid not in shaped_refs:
            add(WARN, el, nid, _name(el), "has no DI shape (will not render)")
    for tag, fl in flows:
        fid = fl.get("id")
        if fid and fid not in edged_refs:
            add(WARN, fl, fid, _name(fl), "has no DI edge (will not render)")

    return out


def counts(findings: list[Finding]) -> tuple[int, int]:
    """Return (error_count, warning_count)."""
    errs = sum(1 for f in findings if f.severity == ERROR)
    return errs, len(findings) - errs


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


def format_report(label: str, findings: list[Finding]) -> str:
    """Render a human-readable report for one file.

    Each finding is prefixed with ``{label}:{line}`` (ruff/gcc style) so
    editors and terminals can jump straight to the offending line.
    """
    if not findings:
        return f"{label}: ✓ no issues"
    locs = [f"{label}:{f.line}" if f.line else label for f in findings]
    loc_w = max(len(loc) for loc in locs)
    lines = []
    for loc, f in zip(locs, findings):
        who = f"{f.eid} '{f.name}'" if f.eid and f.name else (f.eid or "")
        prefix = f"{who} " if who else ""
        lines.append(f"{loc:<{loc_w}}  {f.severity:<5}  {prefix}{f.message}")
    errs, warns = counts(findings)
    lines.append("")
    lines.append(f"{_plural(errs, 'error')}, {_plural(warns, 'warning')}")
    return "\n".join(lines)


def lint_file(path: Path) -> list[Finding]:
    """Read and lint a BPMN file at `path`."""
    return lint(path.read_text(encoding="utf-8"))
