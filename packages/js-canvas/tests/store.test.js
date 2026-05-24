/**
 * Engine store V&V — TEST-ENGINE-001 §2, cases TC-EN-01..04. Plain JS over the
 * compiled `dist/` (the packages/js pattern). The headline is TC-EN-02: the
 * zero-echo loop-guard.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Store, createShapeId } from "../dist/index.js";

/** Build a node shape partial (id from a seed). */
const mk = (seed, over = {}) => ({
  id: createShapeId(seed),
  type: "kymo-node",
  x: 0,
  y: 0,
  props: {},
  meta: {},
  ...over,
});

test("TC-EN-01: CRUD + index order; get round-trips", () => {
  const store = new Store();
  const a = mk("a");
  const b = mk("b");
  const c = mk("c");
  store.putMany([a, b, c]);
  store.update({ id: b.id, type: "kymo-node", x: 50 });
  store.remove(c.id);

  const all = store.getAll();
  assert.deepEqual(
    all.map((s) => s.id),
    [a.id, b.id],
    "survivors returned in creation/index order, c removed",
  );
  assert.equal(store.get(b.id)?.x, 50, "update merged");
  assert.equal(store.get(c.id), undefined, "removed shape gone");
});

test("TC-EN-02: zero-echo loop-guard (RK-EN-01)", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a);

  let userCalls = 0;
  store.listen(() => userCalls++, { scope: "document", source: "user" });

  // Programmatic text→canvas apply: must NOT notify the user listener.
  store.run(() => store.update({ id: a.id, type: "kymo-node", x: 10 }), { history: "ignore" });
  assert.equal(userCalls, 0, "programmatic apply produced zero source:user callbacks");

  // Tool-originated (direct) move: exactly one.
  store.update({ id: a.id, type: "kymo-node", x: 20 });
  assert.equal(userCalls, 1, "user gesture fired exactly one callback");
});

test("TC-EN-03: scope/source filters are independent; unsubscribe stops delivery", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a);

  let all = 0;
  let userOnly = 0;
  let remoteOnly = 0;
  let sessionOnly = 0;
  const unsubAll = store.listen(() => all++, {});
  store.listen(() => userOnly++, { source: "user" });
  store.listen(() => remoteOnly++, { source: "remote" });
  store.listen(() => sessionOnly++, { scope: "session" });

  store.update({ id: a.id, type: "kymo-node", x: 1 }); // source:user
  store.run(() => store.update({ id: a.id, type: "kymo-node", x: 2 })); // source:remote (default)

  assert.equal(userOnly, 1, "user-filter saw only the user change");
  assert.equal(remoteOnly, 1, "remote-filter saw only the remote change");
  assert.equal(all, 2, "unfiltered saw both");
  assert.equal(sessionOnly, 0, "no session-scoped changes in Phase 2");

  unsubAll();
  store.update({ id: a.id, type: "kymo-node", x: 3 });
  assert.equal(all, 2, "unsubscribed listener received nothing further");
});

test("TC-EN-04: history tagging (history:ignore excluded from the log)", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a);
  const base = store.getHistory().length; // 1 — the put

  store.run(() => store.update({ id: a.id, type: "kymo-node", x: 1 }), { history: "ignore" });
  assert.equal(store.getHistory().length, base, "ignored write not recorded");

  store.update({ id: a.id, type: "kymo-node", x: 2 });
  assert.equal(store.getHistory().length, base + 1, "default write recorded exactly once");
});

test("TC-J-02: undo restores the exact prior record; redo re-applies", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a);
  const orig = structuredClone(store.get(a.id));
  store.update({ id: a.id, type: "kymo-node", x: 5, y: 7, props: { w: 80 } });
  assert.equal(store.canUndo, true, "a default write is undoable");

  store.undo();
  assert.deepEqual(store.get(a.id), orig, "undo restored the exact prior record");
  assert.equal(store.canRedo, true);

  store.redo();
  assert.equal(store.get(a.id).x, 5);
  assert.equal(store.get(a.id).y, 7);
  assert.equal(store.get(a.id).props.w, 80, "redo re-applied");
});

test("TC-J-02: history:ignore writes never enter the undo stack", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a); // recordable → the only undo step
  store.run(() => store.update({ id: a.id, type: "kymo-node", x: 99 }), { history: "ignore" });

  store.undo(); // pops the put, not the ignored move
  assert.equal(store.get(a.id), undefined, "undo reverted the put; the ignored write was never on the stack");
  assert.equal(store.canUndo, false);
});

test("TC-J-02: a drag's contiguous same-node updates coalesce into one undo step", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a);
  store.update({ id: a.id, type: "kymo-node", x: 1 });
  store.update({ id: a.id, type: "kymo-node", x: 2 });
  store.update({ id: a.id, type: "kymo-node", x: 3 });

  store.undo();
  assert.equal(store.get(a.id).x, 0, "all three same-node updates undo as one step");
  assert.equal(store.canUndo, true, "the put is still undoable");
});

test("TC-J-02: mark() seals a boundary so the next change is a separate step", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a);
  store.update({ id: a.id, type: "kymo-node", x: 1 });
  store.update({ id: a.id, type: "kymo-node", x: 2 }); // coalesces with x:1
  store.mark();
  store.update({ id: a.id, type: "kymo-node", x: 9 }); // fresh step

  store.undo();
  assert.equal(store.get(a.id).x, 2, "first undo reverts only the post-mark step");
  store.undo();
  assert.equal(store.get(a.id).x, 0, "second undo reverts the coalesced pre-mark run");
});

test("TC-J-02: a new recordable edit clears the redo stack; empty undo/redo are no-ops", () => {
  const store = new Store();
  const a = mk("a");
  store.put(a);
  store.update({ id: a.id, type: "kymo-node", x: 5 });
  store.undo();
  assert.equal(store.canRedo, true);

  store.update({ id: a.id, type: "kymo-node", x: 7 }); // new edit invalidates redo
  assert.equal(store.canRedo, false, "new recordable edit cleared the redo stack");

  const empty = new Store();
  empty.undo();
  empty.redo();
  assert.equal(empty.canUndo, false);
  assert.equal(empty.canRedo, false);
});
