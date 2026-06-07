/**
 * Tests for the TypeScript SVG renderer (`renderSVG`). Imports the built
 * dist/ output (npm test builds first).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { makeComponent, makeEdge, makeDiagram, renderSVG } from "../dist/index.js";

function sample() {
  const a = makeComponent({ id: "a", name: "A", icon: "hex-agent", shape: "hex", pos: [80, 120] });
  const b = makeComponent({ id: "b", name: "B", icon: "aws-s3", shape: "aws-tile", pos: [300, 120] });
  return makeDiagram({ title: "test", components: [a, b], edges: [makeEdge({ src: "a", dst: "b", label: "go" })] });
}

test("renderSVG produces a well-formed SVG document", async () => {
  const svg = await renderSVG(sample());
  assert.match(svg, /^<\?xml/);
  assert.match(svg, /<svg[^>]+viewBox="/);
  assert.ok(svg.trimEnd().endsWith("</svg>"));
});

test("renderSVG draws edges with arrowheads and labels", async () => {
  const svg = await renderSVG(sample());
  assert.match(svg, /marker-end="url\(#arrow\)"/);
  assert.ok(svg.includes(">A<") && svg.includes(">B<"), "component labels present");
  assert.ok(svg.includes(">go<"), "edge label present");
});

test("renderSVG embeds the requested icon glyphs", async () => {
  const svg = await renderSVG(sample());
  // hex-agent is a polygon; aws-s3 is a rounded tile with an inner bucket.
  assert.match(svg, /<polygon/);
  assert.equal((svg.match(/transform="translate\(/g) || []).length >= 2, true);
});

test("renderSVG honours a transparent background", async () => {
  const a = makeComponent({ id: "a", icon: "hex-agent", shape: "hex", pos: [0, 0] });
  const svg = await renderSVG(makeDiagram({ components: [a] }), { background: null });
  assert.ok(!svg.includes('fill="#f8fafc"'));
});

// ── Icon-less flowchart nodes (Mermaid imports) ───────────────────────

function flowchartSample() {
  // Six icon-less shapes the Mermaid importer emits, each sized explicitly.
  const shapes = ["box", "circle", "cylinder", "badge", "hex", "diamond"];
  const comps = shapes.map((s, i) =>
    makeComponent({ id: s, name: s, icon: "", shape: s, pos: [80 + i * 120, 100], size: [86, 50] }));
  return makeDiagram({ components: comps });
}

test("renderSVG draws icon-less flowchart shapes with inner labels", async () => {
  const svg = await renderSVG(flowchartSample());
  assert.match(svg, /<rect class="fc-shape"/);          // box / badge
  assert.match(svg, /<ellipse class="fc-shape"/);       // circle
  assert.match(svg, /<polygon class="fc-shape"/);       // hex / diamond
  assert.match(svg, /<path class="fc-shape"/);          // cylinder body
  assert.match(svg, /<text class="fc-label"[^>]*>diamond<\/text>/);
  // labels sit inside via .fc-label, not the below-the-icon .label class
  assert.ok(!svg.includes('class="label"'), "no below-glyph labels");
});

test("renderSVG injects flowchart CSS only when nodes are icon-less", async () => {
  const fc = await renderSVG(flowchartSample());
  assert.match(fc, /\.fc-shape \{/, "flowchart CSS present for icon-less nodes");
  const iconed = await renderSVG(sample());             // all icon-bearing
  assert.ok(!iconed.includes(".fc-shape"), "no flowchart CSS for icon-bearing diagrams");
});
