/**
 * BPMN 2.0 export tests for the JS package (parity with the Python
 * `test_to_bpmn.py`): inverse-map consistency, unit mapping, well-formedness,
 * and round-trip against the importer (samples + guarded MIWG corpus).
 * `npm test` builds dist/ first, so import the build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parseBpmn, makeComponent, makeEdge, makeDiagram } from "../dist/index.js";
import { toBpmn, EVENT_TAG, EVENTDEF_TAG, GW_TAG, TASK_TAG } from "../dist/to-bpmn.js";
import { EVENT_SHAPE, EVENT_DEF, GATEWAY_MARKER, TASK_MARKER } from "../dist/from-bpmn.js";
import { parseXml, iterAll } from "../dist/xml.js";

const SAMPLES_DIR = fileURLToPath(new URL("../../../samples/", import.meta.url));
const CORPUS_DIR = fileURLToPath(new URL("../../../packages/python/tests/corpus_bpmn/", import.meta.url));

// ── helpers ───────────────────────────────────────────────────────────────
function smallDiagram() {
  // A single-process diagram exercising events/task/gateway/flows.
  const c = (id, name, icon, shape, pos, size) =>
    makeComponent({ id, name, subtitle: "", icon, shape, accent: "blue", pos, size });
  const components = [
    c("S", "Start", "message", "bpmn-start", [50, 50], [36, 36]),
    c("T", "Do", "user", "bpmn-task", [200, 50], [100, 80]),
    c("G", "?", "exclusive", "bpmn-gateway", [360, 50], [50, 50]),
    c("E", "End", "terminate", "bpmn-end", [500, 50], [36, 36]),
  ];
  const edges = [
    makeEdge({ src: "S", dst: "T", points: [[68, 50], [150, 50]], bpmnFlow: "sequence" }),
    makeEdge({ src: "T", dst: "G", points: [[250, 50], [335, 50]], bpmnFlow: "sequence" }),
    makeEdge({ src: "G", dst: "E", label: "yes", points: [[385, 50], [482, 50]],
      bpmnFlow: "default", labelPos: [430, 42] }),
  ];
  return makeDiagram({ width: 560, height: 120, components, edges });
}

const tagsOf = (xml) => new Set([...iterAll(parseXml(xml))].map((e) => e.tag));
const findEl = (xml, pred) => [...iterAll(parseXml(xml))].find(pred) ?? null;

/**
 * Round-trip fixpoint signature, invariant to a benign uniform translation:
 * `from-bpmn` re-normalises to MARGIN (sometimes anchored on a shape kymo
 * tracks for sizing but doesn't re-emit), so a faithful export can come back
 * translated as a whole. Region bounds are exact ints → compared relative to
 * the leftmost region; components by (shape, icon, size) only (centre↔top-left
 * is ±1px on odd widths — exact-position round-trip is covered by `order.bpmn`).
 */
function geom(d) {
  const ox = d.regions.length ? Math.min(...d.regions.map((r) => r.bounds[0])) : 0;
  const oy = d.regions.length ? Math.min(...d.regions.map((r) => r.bounds[1])) : 0;
  const comps = {};
  for (const c of d.components) comps[c.id] = [c.shape, c.icon, c.size];
  const regs = {};
  for (const r of d.regions) {
    regs[r.id] = [r.style, r.label, [r.bounds[0] - ox, r.bounds[1] - oy, r.bounds[2], r.bounds[3]]];
  }
  return { comps, regs, flows: d.edges.map((e) => e.bpmnFlow).sort() };
}

function assertRoundtrip(d1, label) {
  const d2 = parseBpmn(toBpmn(d1));
  assert.equal(d1.components.length, d2.components.length, `${label}: component count`);
  assert.equal(d1.edges.length, d2.edges.length, `${label}: edge count`);
  assert.equal(d1.regions.length, d2.regions.length, `${label}: region count`);
  assert.deepEqual(geom(d1), geom(d2), `${label}: geometry/structure`);
}

// ── inverse-map consistency with the importer ──────────────────────────────
test("inverse maps invert the importer's classification", () => {
  for (const [shape, tag] of Object.entries(EVENT_TAG)) assert.equal(EVENT_SHAPE[tag], shape);
  for (const [marker, tag] of Object.entries(EVENTDEF_TAG)) assert.equal(EVENT_DEF[tag], marker);
  for (const [marker, tag] of Object.entries(TASK_TAG)) assert.equal(TASK_MARKER[tag], marker);
  for (const [marker, tag] of Object.entries(GW_TAG)) {
    if (marker === "") assert.equal(tag, "exclusiveGateway");
    else assert.equal(GATEWAY_MARKER[tag], marker);
  }
});

// ── unit: mapping + well-formedness ─────────────────────────────────────────
test("export is well-formed and maps the core element types", () => {
  const t = tagsOf(toBpmn(smallDiagram()));
  for (const want of ["definitions", "process", "startEvent", "userTask", "exclusiveGateway",
    "endEvent", "sequenceFlow", "messageEventDefinition", "terminateEventDefinition",
    "BPMNShape", "Bounds", "BPMNEdge", "waypoint"]) {
    assert.ok(t.has(want), `missing <${want}>`);
  }
  parseBpmn(toBpmn(smallDiagram()));   // re-imports without throwing
});

test("default flow is named on its source node", () => {
  const g = findEl(toBpmn(smallDiagram()), (e) => e.tag === "exclusiveGateway" && e.attrs.id === "G");
  assert.ok(g && g.attrs.default, "gateway G has no default flow id");
});

test("exclusive-gateway marker is a DI attribute", () => {
  const sh = findEl(toBpmn(smallDiagram()), (e) => e.tag === "BPMNShape" && e.attrs.bpmnElement === "G");
  assert.equal(sh?.attrs.isMarkerVisible, "true");
});

test("DI bounds convert centre → top-left", () => {
  const sh = findEl(toBpmn(smallDiagram()), (e) => e.tag === "BPMNShape" && e.attrs.bpmnElement === "T");
  const b = sh.children.find((ch) => ch.tag === "Bounds");      // pos (200,50) size (100,80)
  assert.deepEqual([b.attrs.x, b.attrs.y, b.attrs.width, b.attrs.height], ["150", "10", "100", "80"]);
});

test("export is deterministic", () => {
  const d = smallDiagram();
  assert.equal(toBpmn(d), toBpmn(d));
});

// ── round-trip ──────────────────────────────────────────────────────────────
test("order.bpmn round-trips exactly", () => {
  const d1 = parseBpmn(readFileSync(new URL("../../../samples/order.bpmn", import.meta.url), "utf8"));
  assertRoundtrip(d1, "order.bpmn");
  const full = (d) => Object.fromEntries(d.components.map((c) => [c.id, [c.shape, c.icon, c.pos, c.size]]));
  assert.deepEqual(full(d1), full(parseBpmn(toBpmn(d1))));      // positions exact (no regions)
});

test("collaboration.bpmn exports a collaboration/laneSet and round-trips", () => {
  const d1 = parseBpmn(readFileSync(new URL("../../../samples/collaboration.bpmn", import.meta.url), "utf8"));
  assert.ok(d1.regions.some((r) => r.style === "pool"), "sample should contain pools");
  const xml = toBpmn(d1);
  const t = tagsOf(xml);
  for (const want of ["collaboration", "participant", "laneSet", "lane"]) {
    assert.ok(t.has(want), `missing <${want}>`);
  }
  assert.ok(findEl(xml, (e) => e.tag === "BPMNShape" && e.attrs.isHorizontal === "true"));
  assert.equal(findEl(xml, (e) => e.tag === "BPMNPlane")?.attrs.bpmnElement, "Collab_kymo");
  assertRoundtrip(d1, "collaboration.bpmn");
});

test("repo .bpmn samples are round-trip fixpoints", () => {
  if (!existsSync(SAMPLES_DIR)) return;
  const files = readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".bpmn"));
  assert.ok(files.length >= 1, "expected at least one .bpmn sample");
  for (const f of files) {
    const d1 = parseBpmn(readFileSync(new URL(`../../../samples/${f}`, import.meta.url), "utf8"));
    if (!d1.components.length && !d1.regions.length) continue;
    assertRoundtrip(d1, f);
  }
});

// Full-corpus breadth: reaches the Python package's vendored MIWG corpus when
// present (skips cleanly otherwise, e.g. from a published package).
test("MIWG corpus is a round-trip fixpoint", { skip: !existsSync(CORPUS_DIR) }, () => {
  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".bpmn"));
  let checked = 0;
  for (const f of files) {
    let d1;
    try { d1 = parseBpmn(readFileSync(CORPUS_DIR + f, "utf8")); } catch { continue; }
    if (!d1.components.length && !d1.regions.length) continue;
    assertRoundtrip(d1, f);
    checked++;
  }
  assert.ok(checked > 50, `expected to check many corpus files, only checked ${checked}`);
});

test("node label_box round-trips as a shape BPMNLabel", () => {
  // Regression: an event/gateway/data external-label box survives export ->
  // re-import as a shape <bpmndi:BPMNLabel>, a fixpoint within +/-1px.
  const comp = makeComponent({
    id: "E1", name: "Nhan xac nhan thong luong", icon: "",
    shape: "bpmn-start", accent: "blue", pos: [300, 200], size: [36, 36],
    labelBox: [300, 150, 80, 27],
  });
  const d1 = makeDiagram({ width: 600, height: 400, components: [comp], edges: [] });

  const xml1 = toBpmn(d1);
  const shape = [...iterAll(parseXml(xml1))].find(
    (e) => e.tag === "BPMNShape" && e.attrs.bpmnElement === "E1");
  assert.ok(shape, "exported shape present");
  assert.ok(shape.children.some((ch) => ch.tag === "BPMNLabel"), "shape has its own BPMNLabel");

  const d2 = parseBpmn(xml1);
  const d3 = parseBpmn(toBpmn(d2));
  const lb2 = d2.components[0].labelBox, lb3 = d3.components[0].labelBox;
  assert.ok(lb2 && lb3, "label_box read back");
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(lb2[i] - lb3[i]) <= 1, "fixpoint within 1px");
  const [cx, cy] = d2.components[0].pos;
  assert.ok(Math.abs(lb2[0] - cx) <= 1 && Math.abs(lb2[1] - cy + 50) <= 1, "offset above glyph kept");
  assert.equal(lb2[2], 80); assert.equal(lb2[3], 27);
});
