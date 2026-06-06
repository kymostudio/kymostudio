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

Every finding carries a stable **rule code** (``LR-*``, see ``RULES``) so the
rule set is **configurable** (CR-BPMN-LINT-002): a ``Config`` selects a preset
(``all`` — every rule, the default; or ``recommended`` — drops purely-stylistic
rules) and then applies per-rule overrides (disable a rule, or change its
severity). Configuration is loaded from a JSON ``.kymolintrc`` (bpmnlint-style
``extends`` + ``rules``); see ``parse_config`` / ``load_config`` / ``find_config``.
"""
from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field, replace
from pathlib import Path
from xml.parsers import expat

ERROR = "error"
WARN = "warn"
_SEVERITIES = (ERROR, WARN)


@dataclass(frozen=True)
class Finding:
    severity: str          # ERROR | WARN
    eid: str               # element id the finding is about ("" if none)
    name: str              # element name/label ("" if unnamed)
    message: str           # human-readable problem
    line: int = 0          # 1-based source line, or 0 if unknown
    rule: str = ""         # rule code (LR-*) that produced the finding


# ── Rule registry ───────────────────────────────────────────────────────
# Stable rule codes (mirrors the registry in FEAT-BPMN-LINT-001 §4). The
# value is a short description used by configuration validation and docs.
RULES: dict[str, str] = {
    # Import-fidelity (DI) — the kymo-unique "will it render?" checks.
    "LR-DI-01": "shape missing <dc:Bounds> (will not render)",
    "LR-DI-02": "edge has fewer than 2 waypoints (will not render)",
    "LR-DI-03": "node has no DI shape (will not render)",
    "LR-DI-04": "flow has no DI edge (will not render)",
    "LR-DI-05": "DI references an unknown / empty bpmnElement",
    # Reference integrity.
    "LR-REF-01": "dangling sourceRef/targetRef",
    "LR-REF-02": "flow missing a sourceRef/targetRef",
    # Graph sanity (semantic).
    "LR-GR-01": "node not connected to any flow",
    "LR-GR-02": "start event has an incoming flow",
    "LR-GR-03": "start event has no outgoing flow",
    "LR-GR-04": "end event has an outgoing flow",
    "LR-GR-05": "end event has no incoming flow",
    "LR-GR-06": "boundary event has no outgoing flow",
    "LR-GR-07": "activity has no incoming sequence flow",
    "LR-GR-08": "activity has no outgoing sequence flow",
    "LR-GR-09": "gateway has no incoming sequence flow",
    "LR-GR-10": "gateway has no outgoing sequence flow",
    "LR-GR-11": "redundant gateway (single incoming and outgoing)",
    "LR-GR-12": "intermediate event missing a flow",
    # Process.
    "LR-PR-01": "process has no start event",
    "LR-PR-02": "process has no end event",
    # Well-formedness.
    "LR-XML-01": "not well-formed XML",
}

# Purely-stylistic rules excluded from the `recommended` preset (they flag
# neither a render failure nor a correctness defect).
_STYLISTIC = frozenset({"LR-GR-11"})

# Named presets: preset name -> set of rule codes that are ON.
PRESETS: dict[str, frozenset[str]] = {
    "all": frozenset(RULES),
    "recommended": frozenset(RULES) - _STYLISTIC,
}


class ConfigError(ValueError):
    """Raised on an invalid lint configuration (bad preset/rule/severity/JSON)."""


@dataclass(frozen=True)
class Config:
    """A resolved lint configuration.

    `enabled` is the set of active rule codes; `severity` maps a rule code to
    a severity that overrides whatever the rule would emit by default.
    """
    enabled: frozenset[str] = field(default_factory=lambda: frozenset(RULES))
    severity: dict[str, str] = field(default_factory=dict)


def default_config() -> Config:
    """The default configuration: every rule on, no overrides (preset `all`)."""
    return Config(PRESETS["all"], {})


def preset_config(name: str) -> Config:
    """Config for a named preset (no per-rule overrides)."""
    if name not in PRESETS:
        raise ConfigError(
            f"unknown preset '{name}' (expected one of: {', '.join(PRESETS)})")
    return Config(PRESETS[name], {})


def parse_config(data: dict) -> Config:
    """Build a `Config` from a parsed rc-file mapping.

    Schema (bpmnlint-style)::

        {"extends": "recommended",            # preset; default "all"
         "rules": {"LR-GR-11": "off",         # disable a rule
                   "LR-DI-01": "error"}}      # override its severity

    Each rule value is ``"off"`` (disable) or a severity (``"warn"``/``"error"``,
    which also re-enables a rule the preset turned off).
    """
    if not isinstance(data, dict):
        raise ConfigError("configuration must be a JSON object")
    preset = data.get("extends", "all")
    if not isinstance(preset, str) or preset not in PRESETS:
        raise ConfigError(
            f"'extends' must be one of: {', '.join(PRESETS)} (got {preset!r})")
    enabled = set(PRESETS[preset])
    severity: dict[str, str] = {}
    rules = data.get("rules", {})
    if rules in (None, {}):
        return Config(frozenset(enabled), severity)
    if not isinstance(rules, dict):
        raise ConfigError("'rules' must be an object of rule-id -> off|warn|error")
    for code, val in rules.items():
        if code not in RULES:
            raise ConfigError(f"unknown rule '{code}'")
        if val == "off":
            enabled.discard(code)
        elif val in _SEVERITIES:
            enabled.add(code)
            severity[code] = val
        else:
            raise ConfigError(
                f"rule '{code}': value must be off|warn|error (got {val!r})")
    return Config(frozenset(enabled), severity)


RC_NAMES = (".kymolintrc", ".kymolintrc.json")


def load_config(path: Path) -> Config:
    """Read and parse an rc-file at `path`."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"invalid JSON in {path}: {exc}") from exc
    return parse_config(data)


def find_config(start: Path) -> Path | None:
    """Walk up from `start` (a dir or file) to find the nearest rc-file."""
    d = start.resolve()
    if d.is_file():
        d = d.parent
    for cur in (d, *d.parents):
        for name in RC_NAMES:
            p = cur / name
            if p.is_file():
                return p
    return None


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


def _apply(cfg: Config, findings: list[Finding]) -> list[Finding]:
    """Filter disabled rules and apply per-rule severity overrides."""
    out: list[Finding] = []
    for f in findings:
        if f.rule and f.rule not in cfg.enabled:
            continue
        ov = cfg.severity.get(f.rule)
        out.append(replace(f, severity=ov) if ov and ov != f.severity else f)
    return out


def lint(xml_text: str, config: Config | None = None) -> list[Finding]:
    """Lint BPMN 2.0 XML; return findings in a stable, document-ish order.

    `config` selects which rules run and at what severity; when omitted, every
    rule runs at its default severity (preset `all`).
    """
    cfg = config or default_config()

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        line = exc.position[0] if getattr(exc, "position", None) else 0
        return _apply(cfg, [
            Finding(ERROR, "", "", f"not well-formed XML: {exc}", line, "LR-XML-01")])

    lines = _line_map(xml_text, root)
    out: list[Finding] = []

    def add(sev: str, el: ET.Element | None, eid: str, name: str,
            msg: str, rule: str) -> None:
        out.append(Finding(sev, eid, name, msg,
                           lines.get(el, 0) if el is not None else 0, rule))

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
                add(WARN, fl, fid, fname, f"has no {kind}", "LR-REF-02")
            elif ref not in ids:
                add(ERROR, fl, fid, fname, f"{kind} '{ref}' not found", "LR-REF-01")
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
            add(sev, el, nid, nm, "is not connected to any flow", "LR-GR-01")
            continue

        if tag == "startEvent":
            if si > 0:
                add(WARN, el, nid, nm, "start event has an incoming flow", "LR-GR-02")
            if so == 0:
                add(WARN, el, nid, nm, "start event has no outgoing flow", "LR-GR-03")
        elif tag == "endEvent":
            if so > 0:
                add(WARN, el, nid, nm, "end event has an outgoing flow", "LR-GR-04")
            if si == 0:
                add(WARN, el, nid, nm, "end event has no incoming flow", "LR-GR-05")
        elif tag == "boundaryEvent":
            if so == 0:
                add(WARN, el, nid, nm, "boundary event has no outgoing flow", "LR-GR-06")
        elif tag in _ACTIVITIES:
            if si == 0:
                add(ERROR, el, nid, nm, "has no incoming sequence flow", "LR-GR-07")
            if so == 0:
                add(ERROR, el, nid, nm, "has no outgoing sequence flow", "LR-GR-08")
        elif tag in _GATEWAYS:
            if si == 0:
                add(ERROR, el, nid, nm, "has no incoming sequence flow", "LR-GR-09")
            if so == 0:
                add(ERROR, el, nid, nm, "has no outgoing sequence flow", "LR-GR-10")
            if si == 1 and so == 1:
                add(WARN, el, nid, nm,
                    "gateway has a single incoming and outgoing flow (redundant)",
                    "LR-GR-11")
        else:                                   # intermediate catch/throw events
            if si == 0:
                add(WARN, el, nid, nm, "has no incoming flow", "LR-GR-12")
            if so == 0:
                add(WARN, el, nid, nm, "has no outgoing flow", "LR-GR-12")

    # ── Process-level start/end presence ────────────────────────────────
    for proc in processes:
        kinds = {_local(ch.tag) for ch in proc.iter()}
        pid, pnm = proc.get("id") or "", _name(proc)
        if "startEvent" not in kinds:
            add(WARN, proc, pid, pnm, "process has no start event", "LR-PR-01")
        if "endEvent" not in kinds:
            add(WARN, proc, pid, pnm, "process has no end event", "LR-PR-02")

    # ── DI fidelity: shapes ─────────────────────────────────────────────
    for shape in di_shapes:
        ref = shape.get("bpmnElement")
        if not ref:
            add(WARN, shape, "", "", "BPMNShape has no bpmnElement", "LR-DI-05")
            continue
        nm = _name(ids[ref]) if ref in ids else ""
        if ref not in ids:
            add(WARN, shape, ref, "", "BPMNShape references unknown element", "LR-DI-05")
        elif not any(_local(ch.tag) == "Bounds" for ch in shape):
            add(WARN, shape, ref, nm, "shape missing <dc:Bounds> (will not render)",
                "LR-DI-01")

    # ── DI fidelity: edges ──────────────────────────────────────────────
    for edge in di_edges:
        ref = edge.get("bpmnElement")
        if not ref:
            add(WARN, edge, "", "", "BPMNEdge has no bpmnElement", "LR-DI-05")
            continue
        nm = _name(ids[ref]) if ref in ids else ""
        if ref not in ids:
            add(WARN, edge, ref, "", "BPMNEdge references unknown element", "LR-DI-05")
        elif sum(1 for ch in edge if _local(ch.tag) == "waypoint") < 2:
            add(WARN, edge, ref, nm, "edge has fewer than 2 waypoints (will not render)",
                "LR-DI-02")

    # ── Nodes / flows with no DI at all ─────────────────────────────────
    for tag, el in nodes:
        nid = el.get("id")
        if nid and nid not in shaped_refs:
            add(WARN, el, nid, _name(el), "has no DI shape (will not render)", "LR-DI-03")
    for tag, fl in flows:
        fid = fl.get("id")
        if fid and fid not in edged_refs:
            add(WARN, fl, fid, _name(fl), "has no DI edge (will not render)", "LR-DI-04")

    return _apply(cfg, out)


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


def lint_file(path: Path, config: Config | None = None) -> list[Finding]:
    """Read and lint a BPMN file at `path`."""
    return lint(path.read_text(encoding="utf-8"), config)
