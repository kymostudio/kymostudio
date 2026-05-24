/**
 * Editor facade V&V — TEST-ENGINE-001 §2: TC-EN-01 (facade CRUD + order) and
 * TC-EN-07 (zoomToFit), plus selection and default-prop filling (FR-EN-01).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store, Editor, createShapeId } from "../dist/index.js";

const mk = (seed, over = {}) => ({
  id: createShapeId(seed),
  type: "kymo-node",
  x: 0,
  y: 0,
  props: {},
  meta: {},
  ...over,
});

test("TC-EN-01: facade CRUD + index order; getShape round-trips; delete deselects", () => {
  const editor = new Editor(new Store());
  const a = mk("a");
  const b = mk("b");
  const c = mk("c");
  editor.createShapes([a, b, c]);

  assert.deepEqual(
    editor.getCurrentPageShapes().map((s) => s.id),
    [a.id, b.id, c.id],
    "created shapes returned in index order",
  );
  assert.equal(editor.getShape(b.id)?.id, b.id, "getShape round-trips");

  editor.updateShape({ id: b.id, type: "kymo-node", x: 50 });
  assert.equal(editor.getShape(b.id)?.x, 50, "updateShape merged");

  editor.select([a.id, c.id]);
  editor.deleteShapes([c.id]);
  assert.deepEqual(
    editor.getCurrentPageShapes().map((s) => s.id),
    [a.id, b.id],
    "deleted shape removed",
  );
  assert.deepEqual(editor.getSelectedShapeIds(), [a.id], "deleted shape dropped from selection");
});

test("selection: getOnlySelectedShape only when exactly one selected", () => {
  const editor = new Editor(new Store());
  const a = mk("a");
  const b = mk("b");
  editor.createShapes([a, b]);

  editor.select([a.id, b.id]);
  assert.deepEqual(editor.getSelectedShapeIds(), [a.id, b.id]);
  assert.equal(editor.getOnlySelectedShape(), undefined, "two selected → undefined");

  editor.select([a.id]);
  assert.equal(editor.getOnlySelectedShape()?.id, a.id, "one selected → that shape");
});

test("TC-EN-07: zoomToFit centres + fits the union; idempotent", () => {
  const editor = new Editor(new Store());
  editor.setViewportSize({ w: 1000, h: 1000 });
  // two disjoint 100×100 shapes; union = [0,0]..[400,400], centre (200,200)
  editor.createShapes([
    mk("a", { x: 0, y: 0, props: { w: 100, h: 100 } }),
    mk("b", { x: 300, y: 300, props: { w: 100, h: 100 } }),
  ]);

  editor.zoomToFit();
  const cam = editor.getCamera();

  // content centre maps to viewport centre: screen = (page + cam) * z
  const screenCx = (200 + cam.x) * cam.z;
  const screenCy = (200 + cam.y) * cam.z;
  assert.ok(Math.abs(screenCx - 500) < 1e-6, "content centred horizontally");
  assert.ok(Math.abs(screenCy - 500) < 1e-6, "content centred vertically");

  // fits within padding: content screen-extent ≤ viewport
  assert.ok(400 * cam.z <= 1000 + 1e-6, "fits horizontally");
  assert.ok(400 * cam.z <= 1000 + 1e-6, "fits vertically");

  editor.zoomToFit();
  assert.deepEqual(editor.getCamera(), cam, "idempotent on re-call");
});

test("createShape fills missing props from the util's getDefaultProps()", () => {
  const util = {
    type: "kymo-node",
    getDefaultProps: () => ({ w: 10, h: 20, name: "default" }),
  };
  const editor = new Editor(new Store(), { shapeUtils: [util] });
  const id = createShapeId("a");
  editor.createShape({ id, type: "kymo-node", props: { name: "given" } });

  const props = editor.getShape(id)?.props;
  assert.deepEqual(props, { w: 10, h: 20, name: "given" }, "defaults filled; provided props win");
});
