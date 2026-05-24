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
