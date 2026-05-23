import { test } from "node:test";
import assert from "node:assert/strict";
import { patchPositions } from "./patchDsl.ts";

const m = (id: string, x: number, y: number) => new Map([[id, { x, y }]]);

test("rewrites an absolute @ (x,y)", () => {
  const out = patchPositions('a box/files/green "A" "" @ (10, 20)', m("a", 33.4, 41.9));
  assert.equal(out, 'a box/files/green "A" "" @ (33, 42)');
});

test("replaces a parent-relative ref with absolute (clears parent)", () => {
  const out = patchPositions('b hex/hex-agent/green "B" "" @ orch right 60', m("b", 50, 60));
  assert.equal(out, 'b hex/hex-agent/green "B" "" @ (50, 60)');
});

test("appends @ when the leaf has none", () => {
  const out = patchPositions('c box/files/orange "C"', m("c", 1, 2));
  assert.equal(out, 'c box/files/orange "C" @ (1, 2)');
});

test("preserves a trailing comment", () => {
  const out = patchPositions('d box/x/green "D" @ (1, 2)   # keep me', m("d", 3, 4));
  assert.equal(out, 'd box/x/green "D" @ (3, 4)   # keep me');
});

test("lifts a layout-frame member out of the body and gives it @ (x,y)", () => {
  const src = [
    "row_layout horizontal pos (0, 0) gap 10 {",
    "  one two three",
    "}",
    'one box/x/green "One"',
    'two box/x/green "Two"',
  ].join("\n");
  const out = patchPositions(src, m("one", 5, 6));
  assert.match(out, /^ {2}two three$/m); // "one" removed from the layout body
  assert.match(out, /^one box\/x\/green "One" @ \(5, 6\)$/m); // leaf gets explicit pos
  assert.match(out, /^two box\/x\/green "Two"$/m); // sibling leaf untouched
});

test("removes from a grid row", () => {
  const src = ['r outer "R" {', "  row a b c", "}", 'b box/x/green "B"'].join("\n");
  const out = patchPositions(src, m("b", 7, 8));
  assert.match(out, /^ {2}row a c$/m);
  assert.match(out, /^b box\/x\/green "B" @ \(7, 8\)$/m);
});

test("leaves region bare-id membership intact (only feeds bounds)", () => {
  const src = ['adr outer "ADR" {', "  orch researcher", "}", 'orch hex/hex-agent/green "Orch" "" @ (1, 2)'].join("\n");
  const out = patchPositions(src, m("orch", 9, 9));
  assert.match(out, /^ {2}orch researcher$/m); // membership kept
  assert.match(out, /^orch .* @ \(9, 9\)$/m);
});

test("byte-preserves untouched lines + no-op when no moves", () => {
  const src = "# header comment\ntitle: \"X\"\n\na box/x/green \"A\" @ (1, 1)\n";
  assert.equal(patchPositions(src, new Map()), src);
  const out = patchPositions(src, m("a", 2, 2));
  assert.ok(out.startsWith('# header comment\ntitle: "X"\n\n'));
  assert.match(out, /a box\/x\/green "A" @ \(2, 2\)/);
});
