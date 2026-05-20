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
