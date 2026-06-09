/**
 * TC-J-03 (FR-J-03) — board export aggregator. Uses fake sync `toSvg` utils so
 * it stays headless/deterministic (no React, no `getIcon`/glyph). The real
 * per-util `toSvg` + glyph pre-warm is covered by the chrome-MCP export check.
 *
 * Run: `node --test --experimental-strip-types src/engine/export.test.ts`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createShapeId, type Editor, type Shape } from "../../../../packages/js-canvas/dist/index.js";
import { boardToSvg } from "./export.ts";

const mkShape = (seed: string, x: number, y: number): Shape =>
  ({ id: createShapeId(seed), type: "fake", x, y, index: seed, props: {}, meta: {} }) as Shape;

test("TC-J-03: board export calls each util's toSvg in index order, one <svg> sized to fit bounds", async () => {
  const shapes = [mkShape("a", 0, 0), mkShape("b", 100, 0), mkShape("c", 0, 100)];
  const editor = { getCurrentPageShapes: () => shapes } as unknown as Editor;

  const calls: string[] = [];
  const util = {
    type: "fake",
    getGeometry: () => ({ bounds: { x: 0, y: 0, w: 10, h: 10 } }),
    toSvg: (s: Shape) => {
      calls.push(String(s.id));
      return "<rect/>";
    },
  };

  const svg = await boardToSvg(editor, [util]);

  assert.deepEqual(calls, shapes.map((s) => String(s.id)), "toSvg called once per shape, in index order");
  assert.equal((svg.match(/<svg/g) ?? []).length, 1, "exactly one <svg> element");
  for (const s of shapes) assert.ok(svg.includes(`<g transform="translate(${s.x},${s.y})">`), `wraps ${s.id} at its position`);
  // union bounds x:0..110, y:0..110 → +16px pad each side
  assert.ok(svg.includes('viewBox="-16 -16 142 142"'), "viewBox fits the padded union bounds");
  assert.ok(svg.includes('width="142" height="142"'), "size matches the viewBox extent");
});

test("TC-J-03: an empty board exports an empty string", async () => {
  const editor = { getCurrentPageShapes: () => [] } as unknown as Editor;
  assert.equal(await boardToSvg(editor, []), "");
});
