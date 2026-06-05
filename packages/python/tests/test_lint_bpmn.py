"""BPMN linter (`lint_bpmn.lint`) — structural + import-fidelity checks."""
from __future__ import annotations

from pathlib import Path

from kymo.lint_bpmn import ERROR, WARN, counts, format_report, lint

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
