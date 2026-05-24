/**
 * Custom-shape API V&V — TEST-ENGINE-001 §2: TC-EN-05 (validators + defaults +
 * create-time validation) and TC-EN-06 (Rectangle2d hit-testing). Plus the
 * editor's zoomToFit upgraded to real `getGeometry` bounds.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store, Editor, ShapeUtil, Rectangle2d, T, createShapeId } from "../dist/index.js";

test("TC-EN-06: Rectangle2d.hitTestPoint — filled, edge-band, margin", () => {
  const filled = new Rectangle2d({ width: 100, height: 100, isFilled: true });
  assert.deepEqual(filled.bounds, { x: 0, y: 0, w: 100, h: 100 });
  assert.equal(filled.hitTestPoint({ x: 50, y: 50 }), true, "inside hits");
  assert.equal(filled.hitTestPoint({ x: 150, y: 150 }), false, "outside misses");
  assert.equal(filled.hitTestPoint({ x: 105, y: 50 }), false, "just outside, no margin");
  assert.equal(filled.hitTestPoint({ x: 105, y: 50 }, 10), true, "margin extends the hit region");

  const hollow = new Rectangle2d({ width: 100, height: 100, isFilled: false });
  assert.equal(hollow.hitTestPoint({ x: 0, y: 50 }, 5), true, "border hits (edge band)");
  assert.equal(hollow.hitTestPoint({ x: 50, y: 50 }, 5), false, "centre misses (hollow)");
});

test("TC-EN-05: T validators accept valid values and throw on mismatch", () => {
  assert.equal(T.number.validate(5), 5);
  assert.throws(() => T.number.validate("x"), TypeError);
  assert.throws(() => T.number.validate(Number.NaN), TypeError);
  assert.equal(T.string.validate("a"), "a");
  assert.throws(() => T.string.validate(5), TypeError);
  assert.equal(T.boolean.validate(true), true);
  assert.throws(() => T.boolean.validate(1), TypeError);
  assert.equal(T.literal("rect").validate("rect"), "rect");
  assert.throws(() => T.literal("rect").validate("circle"), TypeError);
  assert.equal(T.optional(T.number).validate(undefined), undefined);
  assert.equal(T.optional(T.number).validate(7), 7);
  assert.throws(() => T.optional(T.number).validate("x"), TypeError);
});

test("TC-EN-05: ShapeUtil getDefaultProps fills on create; bad prop rejected", () => {
  class NodeUtil extends ShapeUtil {
    static type = "kymo-node";
    static props = { w: T.number, h: T.number, name: T.string };
    getDefaultProps() {
      return { w: 100, h: 60, name: "node" };
    }
    getGeometry(shape) {
      return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
    }
  }
  assert.equal(new NodeUtil().type, "kymo-node", "instance type mirrors static type");

  const editor = new Editor(new Store(), { shapeUtils: [new NodeUtil()] });
  const id = createShapeId("a");
  editor.createShape({ id, type: "kymo-node", props: { name: "given" } });
  assert.deepEqual(
    editor.getShape(id).props,
    { w: 100, h: 60, name: "given" },
    "defaults filled; provided props win",
  );

  assert.throws(
    () => editor.createShape({ id: createShapeId("b"), type: "kymo-node", props: { w: "nope" } }),
    TypeError,
    "mismatched prop type rejected on create",
  );
});

test("zoomToFit uses the util's real getGeometry bounds (not the w/h fallback)", () => {
  // getGeometry returns a fixed 200×200 box, ignoring props.w/h (50) — so the
  // fitted zoom proves the geometry path, not the fallback.
  class GeoUtil extends ShapeUtil {
    static type = "geo";
    getDefaultProps() {
      return { w: 50, h: 50 };
    }
    getGeometry() {
      return new Rectangle2d({ width: 200, height: 200, isFilled: true });
    }
  }
  const editor = new Editor(new Store(), { shapeUtils: [new GeoUtil()], viewport: { w: 1000, h: 1000 } });
  editor.createShape({ id: createShapeId("a"), type: "geo", x: 0, y: 0, props: { w: 50, h: 50 } });

  editor.zoomToFit();
  // content 200×200 → z = min(1000/200, 1000/200) * 0.9 = 4.5  (fallback w/h=50 would give 18)
  assert.ok(Math.abs(editor.getCamera().z - 4.5) < 1e-9, "fit used getGeometry (200), not props.w/h (50)");
});
