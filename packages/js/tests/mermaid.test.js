import "./_init.mjs";
/**
 * Mermaid flowchart import + render tests (parity with Python `test_mermaid.py`).
 * Import + layout run in the Rust core (`mermaidToKymoJson`, wired in core.ts);
 * here we assert the JS side: icon-less outline nodes + the `diamond` glyph
 * render crash-free, and the native `flowchart { }` DSL block resolves.
 *
 * The JS CI job builds the local wasm core (with the Mermaid binding) before
 * `npm test`, so these run there; `npm test` builds dist/ first.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  parseMermaid, parseDiagram, renderSVG,
  mermaidToD2, mermaidToDot, normalizeMermaid,
  mermaidToDrawio, diagramToDrawio,
} from "../dist/index.js";

const SAMPLES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "samples");

test("parseMermaid imports a decision flowchart with a diamond + icon-less nodes", async () => {
  const src = [
    "flowchart TD",
    "A((Start)) --> B[Work]",
    "B --> C{ok?}",
    "C -->|yes| D([Done])",
    "C -->|no| E[(Store)]",
  ].join("\n");
  const d = parseMermaid(src);
  const shapes = new Set(d.components.map((c) => c.shape));
  assert.deepEqual([...shapes].sort(), ["badge", "box", "circle", "cylinder", "diamond"]);
  assert.ok(d.components.every((c) => c.icon === "" && c.size != null));

  const svg = await renderSVG(d);
  assert.ok(svg.includes("fc-shape") && svg.includes("fc-label"));
  assert.ok(svg.includes("<polygon") && svg.includes("<ellipse"));
  for (const label of ["Start", "Work", "ok?", "Done", "Store"]) assert.ok(svg.includes(label));
});

test("bundled .mmd samples import + render without crashing", async () => {
  for (const name of ["approval", "pipeline"]) {
    const d = parseMermaid(readFileSync(join(SAMPLES, `${name}.mmd`), "utf-8"));
    const svg = await renderSVG(d);
    assert.ok(svg.startsWith("<?xml") && svg.includes("fc-shape"));
  }
});

test("convert mmd → d2 / dot / mermaid via the flowchart IR", () => {
  const src = "flowchart TD\nA[Start] --> B{ok?}\nB -.->|no| C([Done])\n";

  const d2 = mermaidToD2(src);
  assert.ok(d2.startsWith("direction: down"));
  assert.ok(d2.includes('B: "ok?" { shape: diamond }'));
  assert.ok(d2.includes("style.stroke-dash"));

  const dot = mermaidToDot(src);
  assert.ok(dot.startsWith("digraph G {") && dot.includes("rankdir=TB;"));
  assert.ok(dot.includes("shape=diamond") && dot.includes("style=dashed"));

  const mmd = normalizeMermaid(src);
  assert.ok(mmd.startsWith("flowchart TD"));
  assert.ok(mmd.includes('B{"ok?"}') && mmd.includes("-.->|no|"));
});

test("convert mmd → draw.io (mxGraph XML); any-source path agrees", () => {
  const src = "flowchart TD\nA[Start] --> B{ok?}\nB -->|yes| C([Done])\n";
  const xml = mermaidToDrawio(src);
  assert.ok(xml.startsWith("<mxfile") && xml.trimEnd().endsWith("</mxfile>"));
  assert.ok(xml.includes("rhombus;") && xml.includes('source="A" target="B"'));
  // The generic any-source encoder matches the Mermaid path byte-for-byte.
  assert.equal(diagramToDrawio(parseMermaid(src)), xml);
});

test("native flowchart { } block resolves through the core", () => {
  const dsl = [
    "flowchart LR {",
    "  A[Collect] --> B{Valid?}",
    "  B -->|yes| C([Store])",
    "  B -->|no| D[(Archive)]",
    "}",
  ].join("\n");
  const d = parseDiagram(dsl);
  assert.deepEqual(new Set(d.components.map((c) => c.id)), new Set(["A", "B", "C", "D"]));
  assert.ok(d.components.some((c) => c.shape === "diamond"));
  assert.ok((d.flowchartBlocks?.length ?? 0) === 0);
  assert.ok(d.width > 0 && d.height > 0);
});
