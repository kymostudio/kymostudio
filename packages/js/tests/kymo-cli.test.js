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
