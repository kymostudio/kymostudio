"""BPMN 2.0 XML importer (`from_bpmn.parse`) + renderer integration."""
from __future__ import annotations

from kymo import parse_bpmn, render
from kymo.from_bpmn import MARGIN
from kymo.model import Component, Diagram

# A compact collaboration exercising the full mapped subset: pool + lane,
# message start event, task types, an exclusive gateway with default +
# conditional outgoing flows, a terminate end event, a text annotation, and
# message / association flows.
XML = """<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="d">
  <bpmn:collaboration id="C">
    <bpmn:participant id="Pool" name="Org" processRef="P"/>
    <bpmn:participant id="Ext" name="Partner"/>
    <bpmn:messageFlow id="MF" sourceRef="Ext" targetRef="S"/>
  </bpmn:collaboration>
  <bpmn:process id="P">
    <bpmn:laneSet>
      <bpmn:lane id="L1" name="Lane A"><bpmn:flowNodeRef>S</bpmn:flowNodeRef></bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="S" name="Start"><bpmn:messageEventDefinition/></bpmn:startEvent>
    <bpmn:userTask id="T1" name="Do work"/>
    <bpmn:exclusiveGateway id="G" name="ok?" default="F_def"/>
    <bpmn:serviceTask id="T2" name="Auto step"/>
    <bpmn:endEvent id="E" name="End"><bpmn:terminateEventDefinition/></bpmn:endEvent>
    <bpmn:textAnnotation id="N"><bpmn:text>note here</bpmn:text></bpmn:textAnnotation>
    <bpmn:sequenceFlow id="F0" sourceRef="S" targetRef="T1"/>
    <bpmn:sequenceFlow id="F_cond" sourceRef="T1" targetRef="G">
      <bpmn:conditionExpression>${x}</bpmn:conditionExpression></bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="F_yes" sourceRef="G" targetRef="T2">
      <bpmn:conditionExpression>${y}</bpmn:conditionExpression></bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="F_def" sourceRef="G" targetRef="E"/>
    <bpmn:association id="A" sourceRef="T1" targetRef="N"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram><bpmndi:BPMNPlane bpmnElement="C">
    <bpmndi:BPMNShape bpmnElement="Ext"  isHorizontal="true"><dc:Bounds x="100" y="20"  width="520" height="50"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="Pool" isHorizontal="true"><dc:Bounds x="100" y="100" width="520" height="220"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="L1"   isHorizontal="true"><dc:Bounds x="130" y="100" width="490" height="220"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="S" ><dc:Bounds x="150" y="180" width="36"  height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="T1"><dc:Bounds x="230" y="158" width="100" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="G" isMarkerVisible="true"><dc:Bounds x="380" y="173" width="50"  height="50"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="T2"><dc:Bounds x="470" y="158" width="100" height="80"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="E" ><dc:Bounds x="540" y="280" width="36"  height="36"/></bpmndi:BPMNShape>
    <bpmndi:BPMNShape bpmnElement="N" ><dc:Bounds x="230" y="280" width="120" height="40"/></bpmndi:BPMNShape>
    <bpmndi:BPMNEdge bpmnElement="F0"   ><di:waypoint x="186" y="198"/><di:waypoint x="230" y="198"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="F_cond"><di:waypoint x="330" y="198"/><di:waypoint x="380" y="198"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="F_yes"><di:waypoint x="430" y="198"/><di:waypoint x="470" y="198"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="F_def"><di:waypoint x="405" y="223"/><di:waypoint x="405" y="298"/><di:waypoint x="540" y="298"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="MF"   ><di:waypoint x="168" y="70"/><di:waypoint x="168" y="180"/></bpmndi:BPMNEdge>
    <bpmndi:BPMNEdge bpmnElement="A"    ><di:waypoint x="280" y="238"/><di:waypoint x="280" y="280"/></bpmndi:BPMNEdge>
  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>"""


def _by_id(d: Diagram):
    return {c.id: c for c in d.components}, {r.id: r for r in d.regions}


def test_node_shapes_and_markers():
    comps, _ = _by_id(parse_bpmn(XML))
    assert (comps["S"].shape, comps["S"].icon) == ("bpmn-start", "message")
    assert (comps["T1"].shape, comps["T1"].icon) == ("bpmn-task", "user")
    # G has isMarkerVisible="true" → the X marker is kept
    assert (comps["G"].shape, comps["G"].icon) == ("bpmn-gateway", "exclusive")
    assert (comps["T2"].shape, comps["T2"].icon) == ("bpmn-task", "service")
    assert (comps["E"].shape, comps["E"].icon) == ("bpmn-end", "terminate")
    assert comps["S"].size == (36, 36)
    # text annotation pulls its label from the <text> child
    assert comps["N"].shape == "bpmn-annotation"
    assert comps["N"].name == "note here"


def test_exclusive_gateway_marker_hidden_by_default():
    """Without isMarkerVisible the exclusive gateway is a plain diamond."""
    xml = """<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
      xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
      xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="d">
      <bpmn:process id="P"><bpmn:exclusiveGateway id="G"/></bpmn:process>
      <bpmndi:BPMNDiagram><bpmndi:BPMNPlane bpmnElement="P">
        <bpmndi:BPMNShape bpmnElement="G"><dc:Bounds x="100" y="100" width="50" height="50"/></bpmndi:BPMNShape>
      </bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>"""
    comps, _ = _by_id(parse_bpmn(xml))
    assert comps["G"].shape == "bpmn-gateway"
    assert comps["G"].icon == ""          # no X marker


def test_pool_and_lane_regions():
    _, regs = _by_id(parse_bpmn(XML))
    assert regs["Pool"].style == "pool" and regs["Pool"].label == "Org"
    assert regs["Ext"].style == "pool" and regs["Ext"].label == "Partner"
    assert regs["L1"].style == "lane" and regs["L1"].label == "Lane A"


def test_flow_kinds():
    d = parse_bpmn(XML)
    kind = {(e.src, e.dst): e.bpmn_flow for e in d.edges}
    assert kind[("S", "T1")] == "sequence"
    assert kind[("T1", "G")] == "conditional"      # conditional from an activity
    assert kind[("G", "T2")] == "sequence"         # conditional from a gateway → plain
    assert kind[("G", "E")] == "default"           # G.default = F_def
    assert kind[("Ext", "S")] == "message"
    assert kind[("T1", "N")] == "association"


def test_edges_carry_explicit_waypoints():
    d = parse_bpmn(XML)
    e0 = next(e for e in d.edges if (e.src, e.dst) == ("S", "T1"))
    assert e0.points is not None and len(e0.points) == 2
    fdef = next(e for e in d.edges if (e.src, e.dst) == ("G", "E"))
    assert len(fdef.points) == 3                   # multi-segment polyline preserved


def test_coordinates_normalised_to_margin():
    d = parse_bpmn(XML)
    left = min([c.pos[0] - c.size[0] // 2 for c in d.components]
               + [r.bounds[0] for r in d.regions])
    top = min([c.pos[1] - c.size[1] // 2 for c in d.components]
              + [r.bounds[1] for r in d.regions])
    assert left == MARGIN and top == MARGIN
    assert d.width > 0 and d.height > 0


def test_render_emits_bpmn_markup():
    svg = render(parse_bpmn(XML))
    assert "bpmn-event--start" in svg          # start-event CSS injected
    assert 'marker-end="url(#bpmn-seq-end)"' in svg
    assert 'class="bpmn-flow bpmn-flow--message"' in svg
    assert "bpmn-pool-label" in svg            # pool label band
    assert svg.startswith("<?xml")


def test_non_bpmn_render_is_unaffected():
    """A plain diagram must not gain any BPMN styles/markers."""
    d = Diagram(width=120, height=80, components=[
        Component(id="a", name="A", subtitle="", icon="hex-agent",
                  shape="hex", accent="green", pos=(60, 40))])
    svg = render(d)
    assert "bpmn-" not in svg
