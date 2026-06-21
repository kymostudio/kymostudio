/**
 * Tests for the DBML importer (`parseDbml`) and its ER-table rendering.
 * Imports the built dist/ output (npm test builds first).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parseDbml, renderSVG, makeComponent, makeDiagram } from "../dist/index.js";

const SAMPLE = readFileSync(
  fileURLToPath(new URL("../../../samples/social.dbml", import.meta.url)),
  "utf-8",
);

test("parseDbml builds one table component per Table block", () => {
  const d = parseDbml(SAMPLE);
  const names = d.components.map((c) => c.name).sort();
  assert.deepEqual(names, ["follows", "posts", "users"]);
  for (const c of d.components) {
    assert.equal(c.shape, "table");
    assert.ok(Array.isArray(c.rows) && c.rows.length > 0);
    assert.ok(c.size && c.size[0] > 0 && c.size[1] > 0, "table has a computed box size");
  }
});

test("parseDbml resolves field settings (pk / not null / note)", () => {
  const d = parseDbml(SAMPLE);
  const users = d.components.find((c) => c.name === "users");
  const id = users.rows.find((r) => r.name === "id");
  assert.equal(id.pk, true, "users.id is a primary key");

  const posts = d.components.find((c) => c.name === "posts");
  assert.equal(posts.rows.find((r) => r.name === "user_id").notNull, true);
  assert.equal(posts.rows.find((r) => r.name === "user_id").isFk, true);
  assert.equal(posts.rows.find((r) => r.name === "body").note, "Content of the post");
});

test("parseDbml turns Ref statements into row-anchored FK edges", () => {
  const d = parseDbml(SAMPLE);
  assert.equal(d.edges.length, 3);
  for (const e of d.edges) {
    assert.equal(e.style, "fk");
    assert.equal(e.dst, "users");
    assert.equal(typeof e.srcRow, "number");
    assert.equal(typeof e.dstRow, "number");
  }
});

test("parseDbml supports inline ref: and the pk/primary key aliases", () => {
  const d = parseDbml(`
    Table a {
      id int [pk]
      b_id int [ref: > b.id, not null]
    }
    Table b { id integer [primary key] }
  `);
  assert.equal(d.edges.length, 1);
  assert.equal(d.edges[0].src, "a");
  assert.equal(d.edges[0].dst, "b");
  assert.equal(d.components.find((c) => c.name === "b").rows[0].pk, true);
});

test("renderSVG draws ER tables (header, rows, pk/NN/relationship markup)", async () => {
  const svg = await renderSVG(parseDbml(SAMPLE));
  assert.match(svg, /^<\?xml/);
  assert.ok(svg.includes(".er-box"), "table style injected");
  assert.ok(svg.includes('class="er-title"'), "header titles present");
  assert.ok(svg.includes('class="er-type"'), "field types present");
  assert.ok(svg.includes("er-pk"), "primary-key rows marked");
  assert.ok(svg.includes('class="er-key"'), "key glyph present");
  assert.ok(svg.includes(">NN<"), "not-null badge present");
  assert.ok(svg.includes('class="er-rel"'), "relationship lines present");
});

test("parseDbml honours per-table position overrides", () => {
  const d = parseDbml(SAMPLE, { users: [1000, 500] });
  const users = d.components.find((c) => c.name === "users");
  assert.deepEqual(users.pos, [1000, 500], "override placed users at its centre");
});

test("renderSVG tags tables and FK edges with data-* for drag re-route", async () => {
  const svg = await renderSVG(parseDbml(SAMPLE));
  assert.match(svg, /data-tid="users"[^>]*data-x="[-\d]+"[^>]*data-w="\d+"/);
  assert.match(svg, /<g class="er-rel-g" data-src="[^"]+" data-dst="[^"]+" data-src-col="[^"]*" data-dst-col="[^"]*" data-op="[^"]*" data-soy="[\d.]+" data-doy="[\d.]+">/);
  assert.match(svg, /data-cols="\[&quot;/, "tables expose their column list");
});

test("non-table diagrams do not get the ER table style block", async () => {
  const c = makeComponent({ id: "a", name: "A", icon: "aws-s3", shape: "aws-tile", pos: [80, 80] });
  const svg = await renderSVG(makeDiagram({ components: [c] }));
  assert.ok(!svg.includes(".er-box"), "table style must stay out of non-table output");
});
