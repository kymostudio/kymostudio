/**
 * DSL parser + front-end pipeline tests for the JS package (parity with the
 * Python `tests/test_dsl.py`). `npm test` builds dist/ first, so import the
 * build. Internal helpers (`parseLayoutTree`, `inlineRegionLeaves`) are imported
 * from the dist subpath; the public surface (`parse`, `parseDiagram`,
 * `renderSVG`) from the package root.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parse, parseDiagram, renderSVG } from "../dist/index.js";
import { parseLayoutTree, inlineRegionLeaves } from "../dist/dsl.js";

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = join(here, "..", "..", "..", "samples");

// ── Leaf component syntax ────────────────────────────────────────────
test("leaf minimal — shape/icon/accent only", () => {
  const { diagram } = parse("agent hex/hex-agent/green\n");
  assert.equal(diagram.components.length, 1);
  const c = diagram.components[0];
  assert.deepEqual([c.id, c.shape, c.icon, c.accent], ["agent", "hex", "hex-agent", "green"]);
  assert.equal(c.name, "");
  assert.equal(c.subtitle, "");
});

test("leaf with name + subtitle", () => {
  const { diagram } = parse('orch hex/hex-agent/green "Orchestrator" "Sub"\n');
  const c = diagram.components[0];
  assert.equal(c.name, "Orchestrator");
  assert.equal(c.subtitle, "Sub");
});

test("leaf name only", () => {
  const { diagram } = parse('lb image/aws-elb/orange "lb"\n');
  assert.equal(diagram.components[0].name, "lb");
  assert.equal(diagram.components[0].subtitle, "");
});

test("leaf @ position literal", () => {
  const { diagram } = parse("a box/x/green @ (120, -40)\n");
  assert.deepEqual(diagram.components[0].pos, [120, -40]);
});

test("leaf @ parent ref with gap", () => {
  const { diagram } = parse("a box/x/green\nb box/y/green @ a right 50\n");
  const b = diagram.components[1];
  assert.equal(b.parent, "a");
  assert.equal(b.align, "right");
  assert.equal(b.alignGap, 50);
});

// ── Edge syntax ──────────────────────────────────────────────────────
const TWO = "a hex/hex-agent/green\nb hex/hex-agent/green\n";

test("edge arrow --> is gray, directed", () => {
  const { diagram } = parse(TWO + "a --> b\n");
  const e = diagram.edges[0];
  assert.deepEqual([e.src, e.dst, e.style, e.noArrow], ["a", "b", "gray", false]);
});

test("edge ==> is orange", () => {
  const { diagram } = parse(TWO + "a ==> b\n");
  assert.equal(diagram.edges[0].style, "orange");
});

test("edge --- is undirected (no arrow)", () => {
  const { diagram } = parse(TWO + "a --- b\n");
  assert.equal(diagram.edges[0].noArrow, true);
});

test("edge default anchors are null (auto)", () => {
  const { diagram } = parse(TWO + "a --> b\n");
  assert.equal(diagram.edges[0].srcAnchor, null);
  assert.equal(diagram.edges[0].dstAnchor, null);
});

test("edge explicit anchors", () => {
  const { diagram } = parse(TWO + "a --> b { src=bottom, dst=top }\n");
  assert.equal(diagram.edges[0].srcAnchor, "bottom");
  assert.equal(diagram.edges[0].dstAnchor, "top");
});

test("edge options: label, offset, flags", () => {
  const { diagram } = parse(
    TWO + 'a --> b : "hi" { src=bottom(22,0), dst=top, curve, label_at=dst, label_offset=(0,-14), small }\n',
  );
  const e = diagram.edges[0];
  assert.equal(e.label, "hi");
  assert.deepEqual(e.srcOffset, [22, 0]);
  assert.equal(e.route, "curve");
  assert.equal(e.labelAnchor, "dst");
  assert.deepEqual(e.labelOffset, [0, -14]);
  assert.equal(e.labelSmall, true);
});

// ── Layout tree expression ───────────────────────────────────────────
test("layout tree horizontal (|)", () => {
  assert.deepEqual(parseLayoutTree("a | b | c", 1), {
    t: "group", dir: "horizontal",
    children: [{ t: "id", id: "a" }, { t: "id", id: "b" }, { t: "id", id: "c" }],
  });
});

test("layout tree vertical (,)", () => {
  assert.deepEqual(parseLayoutTree("a , b", 1), {
    t: "group", dir: "vertical",
    children: [{ t: "id", id: "a" }, { t: "id", id: "b" }],
  });
});

test("layout tree nested", () => {
  assert.deepEqual(parseLayoutTree("orch | { a , b }", 1), {
    t: "group", dir: "horizontal",
    children: [
      { t: "id", id: "orch" },
      { t: "group", dir: "vertical", children: [{ t: "id", id: "a" }, { t: "id", id: "b" }] },
    ],
  });
});

test("layout tree single id is a leaf", () => {
  assert.deepEqual(parseLayoutTree("solo", 1), { t: "id", id: "solo" });
});

test("layout tree mixing | and , is rejected", () => {
  assert.throws(() => parseLayoutTree("a | b , c", 1), /cannot mix/);
});

test("layout tree missing close brace", () => {
  assert.throws(() => parseLayoutTree("{ a , b", 1), /missing/);
});

// ── Region inlining ──────────────────────────────────────────────────
test("inline region expands to a sub-tree", () => {
  const regions = new Map([["svc", { layout: "vertical", contains: ["w1", "w2", "w3"], padding: [24, 24] }]]);
  const out = inlineRegionLeaves({ t: "id", id: "svc" }, regions);
  assert.deepEqual(out, {
    t: "group", dir: "vertical",
    children: [{ t: "id", id: "w1" }, { t: "id", id: "w2" }, { t: "id", id: "w3" }],
    padding: [24, 24],
  });
});

test("inline region preserves the outer tree", () => {
  const regions = new Map([["svc", { layout: "vertical", contains: ["a", "b"], padding: [24, 24] }]]);
  const out = inlineRegionLeaves(
    { t: "group", dir: "horizontal", children: [{ t: "id", id: "x" }, { t: "id", id: "svc" }] },
    regions,
  );
  assert.equal(out.t, "group");
  assert.equal(out.dir, "horizontal");
  assert.deepEqual(out.children[0], { t: "id", id: "x" });
  assert.equal(out.children[1].t, "group");
  assert.equal(out.children[1].dir, "vertical");
});

test("inline region without a direction stays opaque", () => {
  const regions = new Map([["svc", { layout: null, contains: ["a", "b"], padding: [24, 24] }]]);
  const out = inlineRegionLeaves({ t: "id", id: "svc" }, regions);
  assert.deepEqual(out, { t: "id", id: "svc" });
});

// ── Errors ────────────────────────────────────────────────────────────
test("stray closing brace at file scope errors", () => {
  assert.throws(() => parse("a box/x/green\n}\n"), /unexpected/);
});

test("edge inside a container body errors", () => {
  assert.throws(
    () => parse('r outer "R" {\n  a box/x/green\n  a --> a\n}\n'),
    /edges must live at file scope/,
  );
});

test("a bare unknown token at file scope errors with its line number", () => {
  // Regression for the transient mid-typing state that produced the VS Code
  // preview's "line N: unrecognised — 'orch'" error: a half-typed line (just an
  // id, no shape triple) at file scope must throw — and the extension surfaces
  // it as a non-blocking banner rather than blanking the last good render.
  assert.throws(
    () => parse("orch hex/hex-agent/green\norch\n"),
    /line 2: unrecognised — "orch"/,
  );
});

// ── End-to-end: parse + layout + alignment + render every sample ───────
test("parseDiagram positions + renders every sample .kymo", async () => {
  const files = readdirSync(samplesDir).filter((f) => f.endsWith(".kymo"));
  assert.ok(files.length > 0, "expected at least one .kymo sample");
  for (const f of files) {
    const text = readFileSync(join(samplesDir, f), "utf8");
    const d = parseDiagram(text);
    assert.ok(d.width > 0 && d.height > 0, `${f}: canvas must be sized`);
    // every component got a resolved (non-default) position unless truly at origin
    const svg = await renderSVG(d, { background: "#f8fafc" });
    assert.ok(svg.startsWith("<?xml"), `${f}: SVG prolog`);
    assert.ok(svg.trimEnd().endsWith("</svg>"), `${f}: SVG closes`);
    assert.ok(svg.includes("<svg"), `${f}: has <svg>`);
  }
});

test("grid layout (data.kymo) aligns rows across regions", () => {
  if (!existsSync(join(samplesDir, "data.kymo"))) return;
  const text = readFileSync(join(samplesDir, "data.kymo"), "utf8");
  const { layout: spec, external } = parse(text);
  assert.ok(spec, "data.kymo uses grid `row` mode");
  assert.ok(external, "data.kymo declares an `external` component");
  const d = parseDiagram(text);
  const byId = Object.fromEntries(d.components.map((c) => [c.id, c]));
  // jupyter (row 0) and docker (row 0 of brev) share a row → same Y after layout.
  assert.equal(byId.jupyter.pos[1], byId.docker.pos[1]);
  // user is placed ABOVE jupyter via the external directive.
  assert.ok(byId.user.pos[1] < byId.jupyter.pos[1]);
});
