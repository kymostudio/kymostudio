/**
 * BPMN 2.0 import + render tests for the JS package (parity with the Python
 * `test_from_bpmn.py`). `npm test` builds dist/ first, so import the build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parseBpmn, renderSVG } from "../dist/index.js";

// A compact collaboration: pool + lane, message start event, user + service
// tasks, an exclusive gateway with default + conditional flows, a terminate
// end event, a text annotation, and message / association flows.
const XML = `<?xml version="1.0" encoding="UTF-8"?>
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
    <bpmn:laneSet><bpmn:lane id="L1" name="Lane A"><bpmn:flowNodeRef>S</bpmn:flowNodeRef></bpmn:lane></bpmn:laneSet>
    <bpmn:startEvent id="S" name="Start"><bpmn:messageEventDefinition/></bpmn:startEvent>
    <bpmn:userTask id="T1" name="Do work"/>
    <bpmn:exclusiveGateway id="G" name="ok?" default="F_def"/>
    <bpmn:serviceTask id="T2" name="Auto step"/>
    <bpmn:endEvent id="E" name="End"><bpmn:terminateEventDefinition/></bpmn:endEvent>
    <bpmn:textAnnotation id="N"><bpmn:text>note here</bpmn:text></bpmn:textAnnotation>
    <bpmn:sequenceFlow id="F0" sourceRef="S" targetRef="T1"/>
    <bpmn:sequenceFlow id="F_cond" sourceRef="T1" targetRef="G"><bpmn:conditionExpression>x</bpmn:conditionExpression></bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="F_yes" sourceRef="G" targetRef="T2"><bpmn:conditionExpression>y</bpmn:conditionExpression></bpmn:sequenceFlow>
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
</bpmn:definitions>`;

function byId(d) {
  const comps = Object.fromEntries(d.components.map((c) => [c.id, c]));
  const regions = Object.fromEntries(d.regions.map((r) => [r.id, r]));
  return { comps, regions };
}

test("parseBpmn maps node shapes + markers", () => {
  const { comps } = byId(parseBpmn(XML));
  assert.deepEqual([comps.S.shape, comps.S.icon], ["bpmn-start", "message"]);
  assert.deepEqual([comps.T1.shape, comps.T1.icon], ["bpmn-task", "user"]);
  assert.deepEqual([comps.G.shape, comps.G.icon], ["bpmn-gateway", "exclusive"]); // isMarkerVisible
  assert.deepEqual([comps.T2.shape, comps.T2.icon], ["bpmn-task", "service"]);
  assert.deepEqual([comps.E.shape, comps.E.icon], ["bpmn-end", "terminate"]);
  assert.deepEqual(comps.S.size, [36, 36]);
  assert.equal(comps.N.shape, "bpmn-annotation");
  assert.equal(comps.N.name, "note here");
});

test("parseBpmn maps pools + lanes to regions", () => {
  const { regions } = byId(parseBpmn(XML));
  assert.equal(regions.Pool.style, "pool");
  assert.equal(regions.Pool.label, "Org");
  assert.equal(regions.L1.style, "lane");
  assert.equal(regions.L1.label, "Lane A");
});

test("parseBpmn classifies flow kinds", () => {
  const kind = {};
  for (const e of parseBpmn(XML).edges) kind[`${e.src}->${e.dst}`] = e.bpmnFlow;
  assert.equal(kind["S->T1"], "sequence");
  assert.equal(kind["T1->G"], "conditional");      // from an activity
  assert.equal(kind["G->T2"], "sequence");         // conditional from a gateway → plain
  assert.equal(kind["G->E"], "default");           // G.default = F_def
  assert.equal(kind["Ext->S"], "message");
  assert.equal(kind["T1->N"], "association");
});

test("parseBpmn normalises coordinates to a margin", () => {
  const d = parseBpmn(XML);
  const lefts = [
    ...d.components.map((c) => c.pos[0] - ((c.size?.[0] ?? 0) / 2)),
    ...d.regions.map((r) => r.bounds[0]),
  ];
  assert.equal(Math.min(...lefts), 30);
  assert.ok(d.width > 0 && d.height > 0);
});

test("renderSVG emits BPMN markup", async () => {
  const svg = await renderSVG(parseBpmn(XML));
  assert.match(svg, /^<\?xml/);
  assert.match(svg, /bpmn-event--start/);
  assert.match(svg, /marker-end="url\(#bpmn-seq-end\)"/);
  assert.match(svg, /class="bpmn-flow bpmn-flow--message"/);
  assert.match(svg, /bpmn-pool-label/);
  assert.ok(svg.trimEnd().endsWith("</svg>"));
});

test("a file without DI yields an empty diagram (no throw)", () => {
  const xml = `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="d">
    <bpmn:process id="P"><bpmn:startEvent id="S"/><bpmn:task id="T"/>
      <bpmn:sequenceFlow id="F" sourceRef="S" targetRef="T"/></bpmn:process></bpmn:definitions>`;
  const d = parseBpmn(xml);
  assert.equal(d.components.length, 0);
  assert.equal(d.edges.length, 0);
});

test("ordinary (non-BPMN) diagrams get no BPMN styles", async () => {
  // import factory lazily to keep this file focused on BPMN
  const { makeComponent, makeDiagram, renderSVG: r } = await import("../dist/index.js");
  const d = makeDiagram({ components: [makeComponent({ id: "a", name: "A", icon: "hex-agent", shape: "hex", pos: [80, 80] })] });
  const svg = await r(d);
  assert.doesNotMatch(svg, /bpmn-/);
});

// Render the shared repo BPMN samples end-to-end (parity smoke).
test("repo .bpmn samples render to valid SVG", async () => {
  const dir = fileURLToPath(new URL("../../../samples/", import.meta.url));
  if (!existsSync(dir)) return;                       // samples optional
  const files = readdirSync(dir).filter((f) => f.endsWith(".bpmn"));
  assert.ok(files.length >= 1, "expected at least one .bpmn sample");
  for (const f of files) {
    const d = parseBpmn(readFileSync(new URL(`../../../samples/${f}`, import.meta.url), "utf8"));
    assert.ok(d.components.length > 0, `${f}: no components`);
    const svg = await renderSVG(d);
    assert.match(svg, /<svg[^>]+viewBox="/, `${f}: not an svg`);
    assert.ok(svg.includes("</svg>"));
  }
});
