import "./_init.mjs";
/**
 * bpmn-dsl P3 (JS parity): `bpmn { }` parser + layout, mirroring the Python
 * tests. Structural assertions + SVG-contains (no byte golden — NFR-4).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, bpmnLayout, renderSVG } from "../dist/index.js";

function laidOut(text) {
  const d = parse(text).diagram;
  bpmnLayout(d);
  return d;
}

const SPLIT_JOIN = `
bpmn {
  start S  "s"
  task  A  "a"
  and   SP "split"
  task  B  "b"
  task  C  "c"
  and   SY "sync"
  end   E  "e"
  S -> A -> SP
  SP -> B ; SP -> C
  B -> SY ; C -> SY
  SY -> E
}
`;

// ── Parser (AST on diagram.bpmnBlocks) ───────────────────────────────
test("bpmn block: node kinds → [shape, marker] (FR-3)", () => {
  const blocks = parse(`
bpmn {
  start S "Start"
  end!  T "Term"
  task  A "Do"
  xor   X "X?"
  and   P "Split"
  event V "Wait"
}
`).diagram.bpmnBlocks;
  assert.equal(blocks.length, 1);
  const m = Object.fromEntries(blocks[0].nodes.map((n) => [n.id, [n.shape, n.marker]]));
  assert.deepEqual(m.S, ["bpmn-start", ""]);
  assert.deepEqual(m.T, ["bpmn-end", "terminate"]);
  assert.deepEqual(m.A, ["bpmn-task", ""]);
  assert.deepEqual(m.X, ["bpmn-gateway", "exclusive"]);
  assert.deepEqual(m.P, ["bpmn-gateway", "parallel"]);
  assert.deepEqual(m.V, ["bpmn-intermediate", ""]);
});

test("bpmn block: type= refines marker; @ pin parsed (FR-4/FR-9)", () => {
  const b = parse(`
bpmn {
  task A "a" type=user
  task N "n" @ (560,90)
}
`).diagram.bpmnBlocks[0];
  const byId = Object.fromEntries(b.nodes.map((n) => [n.id, n]));
  assert.equal(byId.A.marker, "user");
  assert.deepEqual(byId.N.pin, [560, 90]);
});

test("bpmn block: flow kinds + chain/; expansion + label (FR-6/FR-7)", () => {
  const b = parse(`
bpmn {
  A -> B -> C
  B ~> D ; B ..> E
  X -> Y : "Yes"
}
`).diagram.bpmnBlocks[0];
  assert.deepEqual(b.flows.map((f) => [f.src, f.dst, f.flow]), [
    ["A", "B", "sequence"], ["B", "C", "sequence"],
    ["B", "D", "message"], ["B", "E", "association"],
    ["X", "Y", "sequence"],
  ]);
  assert.equal(b.flows.find((f) => f.src === "X").label, "Yes");
});

// ── Layout ───────────────────────────────────────────────────────────
test("bpmn layout: consumes block → positioned components (FR-10)", () => {
  const d = laidOut(SPLIT_JOIN);
  assert.deepEqual(d.bpmnBlocks, []);
  assert.equal(d.components.length, 7);
  for (const c of d.components) {
    assert.ok(c.shape.startsWith("bpmn-"));
    assert.ok(Number.isInteger(c.pos[0]) && Number.isInteger(c.pos[1]));
    assert.ok(c.size);
  }
  assert.ok(d.width > 0 && d.height > 0);
});

test("bpmn layout: linear chain is a straight LR trunk (FR-8)", () => {
  const d = laidOut('bpmn {\n start S "s"\n task A "a"\n task B "b"\n end E "e"\n S -> A -> B -> E\n}');
  const x = Object.fromEntries(d.components.map((c) => [c.id, c.pos[0]]));
  const y = Object.fromEntries(d.components.map((c) => [c.id, c.pos[1]]));
  assert.ok(x.S < x.A && x.A < x.B && x.B < x.E);
  assert.ok(y.S === y.A && y.A === y.B && y.B === y.E);   // finding #1: straight trunk
});

test("bpmn layout: split/join columns + edges carry points + bpmnFlow", () => {
  const d = laidOut(SPLIT_JOIN);
  const x = Object.fromEntries(d.components.map((c) => [c.id, c.pos[0]]));
  assert.ok(x.S < x.A && x.A < x.SP);
  assert.ok(x.SP < x.B && x.B === x.C && x.C < x.SY);
  assert.ok(x.SY < x.E);
  assert.equal(d.edges.length, 7);
  for (const e of d.edges) {
    assert.ok(e.points && e.points.length >= 2);
    assert.equal(e.bpmnFlow, "sequence");
  }
});

test("bpmn layout: pin override (FR-9)", () => {
  const d = laidOut('bpmn {\n start S "s"\n task A "a" @ (500,300)\n end E "e"\n S -> A -> E\n}');
  const pos = Object.fromEntries(d.components.map((c) => [c.id, c.pos]));
  assert.deepEqual(pos.A, [500, 300]);
  assert.notDeepEqual(pos.S, [500, 300]);
});

test("bpmn layout: deterministic geometry (NFR-1)", () => {
  const geom = (d) => JSON.stringify([
    d.components.map((c) => [c.id, c.pos]),
    d.edges.map((e) => [e.src, e.dst, e.points]),
  ]);
  assert.equal(geom(laidOut(SPLIT_JOIN)), geom(laidOut(SPLIT_JOIN)));
});

test("renderSVG draws the laid-out block; throws if un-laid-out", async () => {
  const svg = await renderSVG(laidOut(SPLIT_JOIN));
  assert.match(svg, /^<\?xml/);
  assert.match(svg, /bpmn-/);
  const raw = parse('bpmn {\n start S "s"\n end E "e"\n S -> E\n}').diagram;
  await assert.rejects(() => renderSVG(raw), /bpmn/);
});
