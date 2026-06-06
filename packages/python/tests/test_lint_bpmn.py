"""BPMN linter (`lint_bpmn.lint`) — structural + import-fidelity checks."""
from __future__ import annotations

from pathlib import Path

import pytest

from kymo.lint_bpmn import (
    ERROR,
    PRESETS,
    RULES,
    WARN,
    Config,
    ConfigError,
    counts,
    default_config,
    find_config,
    format_report,
    lint,
    load_config,
    parse_config,
    preset_config,
)

FIXTURES = Path(__file__).parent / "fixtures" / "bpmn"

# A well-formed-XML but graph-broken collaboration: a dangling targetRef, a
# start event with an incoming flow, a gateway with no incoming sequence flow,
# a shape with no <dc:Bounds>, and flows missing their DI edges.
BROKEN = """<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="d">
  <bpmn:process id="P" name="Orders">
    <bpmn:startEvent id="S" name="Begin"/>
    <bpmn:task id="T" name="Pay"/>
    <bpmn:exclusiveGateway id="G"/>
    <bpmn:sequenceFlow id="F1" sourceRef="S" targetRef="T"/>
    <bpmn:sequenceFlow id="F9" sourceRef="G" targetRef="Node_X"/>
    <bpmn:sequenceFlow id="Floop" sourceRef="T" targetRef="S"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram><bpmndi:BPMNPlane bpmnElement="P">
    <bpmndi:BPMNShape bpmnElement="S"><dc:Bounds x="10" y="10" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="T"><dc:Bounds x="80" y="0" width="100" height="60"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="G"/>
    <bpmndi:BPMNEdge bpmnElement="F1"><di:waypoint x="46" y="28"/><di:waypoint x="80" y="28"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>"""

# Minimal, fully valid: start → task → end, all with DI.
CLEAN = """<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="d">
  <bpmn:process id="P">
    <bpmn:startEvent id="S"/>
    <bpmn:task id="T" name="Work"/>
    <bpmn:endEvent id="E"/>
    <bpmn:sequenceFlow id="F0" sourceRef="S" targetRef="T"/>
    <bpmn:sequenceFlow id="F1" sourceRef="T" targetRef="E"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram><bpmndi:BPMNPlane bpmnElement="P">
    <bpmndi:BPMNShape bpmnElement="S"><dc:Bounds x="0" y="0" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="T"><dc:Bounds x="80" y="0" width="100" height="60"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="E"><dc:Bounds x="220" y="0" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge bpmnElement="F0"><di:waypoint x="36" y="18"/><di:waypoint x="80" y="18"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="F1"><di:waypoint x="180" y="18"/><di:waypoint x="220" y="18"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>"""


def _msgs(xml):
    return {(f.severity, f.eid, f.message) for f in lint(xml)}


def test_clean_diagram_has_no_findings():
    assert lint(CLEAN) == []
    assert counts(lint(CLEAN)) == (0, 0)


def test_dangling_target_ref_is_an_error():
    assert (ERROR, "F9", "targetRef 'Node_X' not found") in _msgs(BROKEN)


def test_start_event_with_incoming_flow_warns():
    assert (WARN, "S", "start event has an incoming flow") in _msgs(BROKEN)


def test_gateway_missing_incoming_is_an_error():
    assert (ERROR, "G", "has no incoming sequence flow") in _msgs(BROKEN)


def test_shape_without_bounds_and_missing_di_warn():
    msgs = _msgs(BROKEN)
    assert (WARN, "G", "shape missing <dc:Bounds> (will not render)") in msgs
    assert (WARN, "F9", "has no DI edge (will not render)") in msgs


def test_process_without_end_event_warns():
    assert (WARN, "P", "process has no end event") in _msgs(BROKEN)


def test_broken_counts_and_exit_friendly_summary():
    findings = lint(BROKEN)
    errs, warns = counts(findings)
    assert errs == 2 and warns >= 1
    report = format_report("broken.bpmn", findings)
    assert "broken.bpmn:" in report          # ruff-style path:line locations
    assert report.endswith(f"{errs} errors, {warns} warnings")


def test_findings_carry_source_line_numbers():
    by_msg = {(f.eid, f.message): f.line for f in lint(BROKEN)}
    # F9 is declared on line 11; its shape-less gateway G on line 9.
    assert by_msg[("F9", "targetRef 'Node_X' not found")] == 11
    assert by_msg[("G", "has no incoming sequence flow")] == 9
    # The missing-<dc:Bounds> finding points at the <BPMNShape> (line 17),
    # not at G's semantic declaration.
    assert by_msg[("G", "shape missing <dc:Bounds> (will not render)")] == 17
    report = format_report("broken.bpmn", lint(BROKEN))
    assert "broken.bpmn:11  error  F9 targetRef 'Node_X' not found" in report


def test_malformed_xml_carries_error_line():
    [f] = lint("<a>\n  <b>\n")
    assert f.severity == ERROR and f.line >= 1


def test_no_di_fixture_flags_every_node_and_flow():
    # The committed no-DI fixture renders empty; lint must say so per element.
    findings = lint((FIXTURES / "no_di.bpmn").read_text(encoding="utf-8"))
    msgs = {(f.eid, f.message) for f in findings}
    assert ("S", "has no DI shape (will not render)") in msgs
    assert ("F0", "has no DI edge (will not render)") in msgs
    assert all(f.severity == WARN for f in findings)


def test_malformed_xml_reports_one_error():
    findings = lint("<not-closed>")
    assert len(findings) == 1 and findings[0].severity == ERROR


def test_clean_report_says_no_issues():
    assert format_report("ok.bpmn", lint(CLEAN)) == "ok.bpmn: ✓ no issues"


# ── Configurable rules (CR-BPMN-LINT-002) ────────────────────────────────

# start → gateway → task → end, all with DI; the only defect is that the
# gateway G has exactly one incoming and one outgoing flow (LR-GR-11).
REDUNDANT = """<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="d">
  <bpmn:process id="P">
    <bpmn:startEvent id="S"/>
    <bpmn:exclusiveGateway id="G"/>
    <bpmn:task id="T" name="Work"/>
    <bpmn:endEvent id="E"/>
    <bpmn:sequenceFlow id="F0" sourceRef="S" targetRef="G"/>
    <bpmn:sequenceFlow id="F1" sourceRef="G" targetRef="T"/>
    <bpmn:sequenceFlow id="F2" sourceRef="T" targetRef="E"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram><bpmndi:BPMNPlane bpmnElement="P">
    <bpmndi:BPMNShape bpmnElement="S"><dc:Bounds x="0" y="0" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="G"><dc:Bounds x="60" y="0" width="50" height="50"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="T"><dc:Bounds x="140" y="0" width="100" height="60"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="E"><dc:Bounds x="280" y="0" width="36" height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge bpmnElement="F0"><di:waypoint x="36" y="18"/><di:waypoint x="60" y="18"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="F1"><di:waypoint x="110" y="18"/><di:waypoint x="140" y="18"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="F2"><di:waypoint x="240" y="18"/><di:waypoint x="280" y="18"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>"""


def _rules(findings):
    return {f.rule for f in findings}


def test_findings_carry_rule_codes():
    rules = _rules(lint(BROKEN))
    assert "LR-REF-01" in rules and "LR-DI-01" in rules and "LR-GR-09" in rules
    assert rules <= set(RULES)               # every emitted code is registered


def test_default_config_equals_all_preset():
    # No config and preset "all" both run every rule — back-compat guarantee.
    assert lint(BROKEN) == lint(BROKEN, default_config())
    assert lint(BROKEN) == lint(BROKEN, preset_config("all"))


def test_redundant_gateway_only_under_all():
    assert "LR-GR-11" in _rules(lint(REDUNDANT))                  # preset all
    assert lint(REDUNDANT, preset_config("recommended")) == []    # stylistic dropped
    assert "LR-GR-11" not in PRESETS["recommended"]


def test_rc_file_can_disable_a_rule():
    cfg = parse_config({"rules": {"LR-REF-01": "off"}})
    rules = _rules(lint(BROKEN, cfg))
    assert "LR-REF-01" not in rules
    assert "LR-DI-01" in rules               # other rules still fire


def test_rc_file_can_override_severity():
    # LR-DI-01 is a warning by default; promote it to an error.
    cfg = parse_config({"rules": {"LR-DI-01": "error"}})
    di = [f for f in lint(BROKEN, cfg) if f.rule == "LR-DI-01"]
    assert di and all(f.severity == ERROR for f in di)


def test_recommended_can_be_extended_with_overrides():
    # Re-enable the stylistic rule on top of the recommended preset.
    cfg = parse_config({"extends": "recommended", "rules": {"LR-GR-11": "warn"}})
    assert "LR-GR-11" in _rules(lint(REDUNDANT, cfg))


def test_unknown_preset_rule_and_severity_raise():
    with pytest.raises(ConfigError):
        parse_config({"extends": "nope"})
    with pytest.raises(ConfigError):
        parse_config({"rules": {"LR-NOPE-99": "off"}})
    with pytest.raises(ConfigError):
        parse_config({"rules": {"LR-DI-01": "loud"}})


def test_load_and_find_config_roundtrip(tmp_path):
    (tmp_path / ".kymolintrc").write_text(
        '{"extends": "recommended", "rules": {"LR-DI-01": "off"}}', encoding="utf-8")
    found = find_config(tmp_path)
    assert found is not None and found.name == ".kymolintrc"
    cfg = load_config(found)
    assert isinstance(cfg, Config)
    assert "LR-DI-01" not in cfg.enabled and "LR-GR-11" not in cfg.enabled


def test_invalid_json_rc_file_raises(tmp_path):
    bad = tmp_path / ".kymolintrc"
    bad.write_text("{not json", encoding="utf-8")
    with pytest.raises(ConfigError):
        load_config(bad)
