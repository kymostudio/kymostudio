/**
 * `kymo` CLI tests (render → SVG, and the → PNG path via the kymostudio-core
 * runtime dependency). `npm test` builds dist/ first. PNG output is
 * binary/engine-dependent, so these assert structure (magic bytes / dimensions)
 * rather than exact bytes — it is not part of the golden conformance suites.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { run } from "../bin/render-cli.mjs";

const TMP = mkdtempSync(join(tmpdir(), "kymo-cli-"));
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
  '<rect width="10" height="10" fill="#0a0"/></svg>';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

// `svgToPdf` landed in kymostudio-core 0.4; the PDF test skips on older cores
// (the named wasm-bindgen export is absent in the JS glue) so CI on the
// published floor stays green.
async function pdfAvailable() {
  try {
    const mod = await import("kymostudio-core");
    return typeof mod.svgToPdf === "function";
  } catch {
    return false;
  }
}
const PDF_OK = await pdfAvailable();

// `mermaidToKymoJson` landed in kymostudio-core 0.4.3; the .mmd test skips on
// older cores (the named wasm-bindgen export is absent) so CI on the published
// floor stays green until the core patch ships.
async function mermaidAvailable() {
  try {
    const mod = await import("kymostudio-core");
    return typeof mod.mermaidToKymoJson === "function";
  } catch {
    return false;
  }
}
const MERMAID_OK = await mermaidAvailable();

test("renders a .kymo source to SVG", async () => {
  const src = join(TMP, "d.kymo");
  writeFileSync(src, "agent hex/hex-agent/green\n");
  const out = join(TMP, "d.svg");
  assert.equal(await run([src, out]), 0);
  assert.match(readFileSync(out, "utf-8"), /<svg/);
});

test("a .kymo source defaults to a .svg next to it", async () => {
  const src = join(TMP, "named.kymo");
  writeFileSync(src, "agent hex/hex-agent/green\n");
  assert.equal(await run([src]), 0);
  assert.ok(existsSync(join(TMP, "named.svg")));
});

test("missing input returns a non-zero exit code", async () => {
  assert.notEqual(await run([]), 0);
});

test(
  "renders a .mmd (Mermaid flowchart) source to SVG",
  { skip: MERMAID_OK ? false : "kymostudio-core >= 0.4.3 (mermaidToKymoJson) not installed" },
  async () => {
    const src = join(TMP, "flow.mmd");
    writeFileSync(src, "flowchart TD\n  A[Start] --> B{ok?}\n  B -->|yes| C[Done]\n");
    const out = join(TMP, "flow.svg");
    assert.equal(await run([src, out]), 0);
    const svg = readFileSync(out, "utf-8");
    assert.match(svg, /<svg/);
    assert.match(svg, /class="fc-shape"/);     // icon-less flowchart nodes
    assert.ok(svg.includes("Start"));
  },
);

test("rejects a non-.png output for a .svg input", async () => {
  const src = join(TMP, "in.svg");
  writeFileSync(src, SVG);
  assert.notEqual(await run([src, join(TMP, "out.jpg")]), 0);
});

test("rasterizes a .svg input to PNG", async () => {
  const src = join(TMP, "r.svg");
  writeFileSync(src, SVG);
  const out = join(TMP, "r.png");
  assert.equal(await run([src, out]), 0);
  assert.deepEqual(readFileSync(out).subarray(0, 8), PNG_MAGIC);
});

test(
  "converts a .svg input to PDF",
  { skip: PDF_OK ? false : "kymostudio-core >= 0.4 (svgToPdf) not installed" },
  async () => {
    const src = join(TMP, "p.svg");
    writeFileSync(src, SVG);
    const out = join(TMP, "p.pdf");
    assert.equal(await run([src, out]), 0);
    assert.deepEqual(readFileSync(out).subarray(0, 5), PDF_MAGIC);
  },
);

test(
  "a .pdf output overrides the .svg-input PNG default",
  { skip: PDF_OK ? false : "kymostudio-core >= 0.4 (svgToPdf) not installed" },
  async () => {
    const src = join(TMP, "pref.svg");
    writeFileSync(src, SVG);
    const out = join(TMP, "pref.pdf");
    assert.equal(await run([src, out]), 0);
    assert.deepEqual(readFileSync(out).subarray(0, 5), PDF_MAGIC);
    assert.ok(!existsSync(join(TMP, "pref.png")));
  },
);

test("--scale doubles the rasterized dimensions", async () => {
  const src = join(TMP, "s.svg");
  writeFileSync(src, SVG);
  const o1 = join(TMP, "s1.png");
  const o2 = join(TMP, "s2.png");
  assert.equal(await run([src, o1]), 0);
  assert.equal(await run([src, o2, "-s", "2"]), 0);
  const dims = (f) => {
    const d = readFileSync(f);
    return [d.readUInt32BE(16), d.readUInt32BE(20)];
  };
  const [w1, h1] = dims(o1);
  const [w2, h2] = dims(o2);
  assert.deepEqual([w2, h2], [w1 * 2, h1 * 2]);
});
