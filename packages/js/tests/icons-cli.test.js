/**
 * `kymo icons` JS CLI tests (CR-ICONS-001 / TEST-ICONS-CR001, TC-13..16),
 * mirroring packages/python/tests/test_icons_cli.py. Drives bin/icons-cli.mjs
 * with a captured logger; download --from iconify uses a stubbed fetch.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, rmSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { run } from "../bin/icons-cli.mjs";

function cap() {
  const lines = [];
  const log = (s = "") => lines.push(String(s));
  return { log, errlog: log, text: () => lines.join("\n") };
}
const hasArtifacts = () =>
  existsSync(new URL("../icons-collections.json", import.meta.url));

// ── TC-13 — list ──────────────────────────────────────────────────────────
test("list --json is machine-readable", { skip: !hasArtifacts() }, async () => {
  const c = cap();
  assert.equal(await run(["list", "--json"], c.log, c.errlog), 0);
  const data = JSON.parse(c.text());
  assert.ok(data.aws && data.aws.total > 0);
});

test("list <provider> filters to addresses", { skip: !hasArtifacts() }, async () => {
  const c = cap();
  assert.equal(await run(["list", "aws", "--json"], c.log, c.errlog), 0);
  const addrs = JSON.parse(c.text());
  assert.ok(addrs.length && addrs.every((a) => a.startsWith("aws:")));
});

test("list unknown provider errors", { skip: !hasArtifacts() }, async () => {
  const c = cap();
  assert.notEqual(await run(["list", "no-such"], c.log, c.errlog), 0);
});

// ── TC-14 — search (offline) ────────────────────────────────────────────────
test("search finds offline, no network", { skip: !hasArtifacts() }, async () => {
  const c = cap();
  assert.equal(await run(["search", "lambda", "--json"], c.log, c.errlog), 0);
  const data = JSON.parse(c.text());
  assert.equal(data.query, "lambda");
  assert.ok(data.results.some((a) => a.includes("lambda")));
  assert.deepEqual(data.remote, []);
});

test("search empty result is success", { skip: !hasArtifacts() }, async () => {
  const c = cap();
  assert.equal(await run(["search", "zzz-nope", "--json"], c.log, c.errlog), 0);
  assert.deepEqual(JSON.parse(c.text()).results, []);
});

test("search --provider/--limit constrain", { skip: !hasArtifacts() }, async () => {
  const c = cap();
  assert.equal(await run(["search", "a", "--provider", "aws", "--limit", "3", "--json"], c.log, c.errlog), 0);
  const data = JSON.parse(c.text());
  assert.ok(data.results.length <= 3 && data.results.every((a) => a.startsWith("aws:")));
});

// ── TC-15 — describe + errors ───────────────────────────────────────────────
test("describe reports metadata", { skip: !hasArtifacts() }, async () => {
  const cols = JSON.parse(readFileSync(new URL("../icons-collections.json", import.meta.url)));
  const prefix = "aws" in cols ? "aws" : Object.keys(cols).sort()[0];
  const set = JSON.parse(readFileSync(new URL(`../sets/${prefix}.json`, import.meta.url)));
  const addr = `${prefix}:${Object.keys(set.icons).sort()[0]}`;
  const c = cap();
  assert.equal(await run(["describe", addr, "--json"], c.log, c.errlog), 0);
  const data = JSON.parse(c.text());
  assert.equal(data.address, addr);
  assert.equal(data.width, 64);
  assert.ok(data.path);
});

test("describe malformed address errors", async () => {
  const c = cap();
  assert.notEqual(await run(["describe", "not-an-address"], c.log, c.errlog), 0);
});

test("describe unknown address errors", { skip: !hasArtifacts() }, async () => {
  const c = cap();
  assert.notEqual(await run(["describe", "aws:definitely-not-real"], c.log, c.errlog), 0);
});

// ── TC-16 — download pipeline ───────────────────────────────────────────────
test("download --from iconify writes a file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kymo-icons-"));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '<svg><path fill="#f00"/></svg>' });
  try {
    const c = cap();
    assert.equal(await run(["download", "mdi:home", "--from", "iconify", "-o", dir, "-y"], c.log, c.errlog), 0);
    assert.ok(existsSync(join(dir, "mdi", "home.svg")));
  } finally {
    globalThis.fetch = realFetch;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unknown verb errors", async () => {
  const c = cap();
  assert.equal(await run(["frobnicate"], c.log, c.errlog), 2);
});
