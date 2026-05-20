/**
 * Smoke tests for the public entry point. Keep these dependency-free so
 * `node --test tests/` runs them with no build step.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ICONS,
  getIcon,
  makeComponent,
  makeEdge,
  anchor,
} from "../src/index.js";

test("model + icon exports are wired up", () => {
  assert.equal(typeof makeComponent, "function");
  assert.equal(typeof makeEdge, "function");
  assert.equal(typeof anchor, "function");
  assert.equal(typeof getIcon, "function");
});

test("built-in icon registry is populated", () => {
  assert.ok(Object.keys(ICONS).length > 0);
  assert.ok("user" in ICONS);
});

test("getIcon resolves a built-in glyph synchronously", async () => {
  const svg = await getIcon("user");
  assert.match(svg, /<(g|svg|circle|path)/);
});
