/**
 * kymo Icons v2 — P1 loader tests (CR-ICONS-002 / TEST-ICONS-CR002).
 * Mirrors the Python tests/test_icons.py: addressing, alias resolution +
 * cycle guard, and legacy `<provider>-<name>` compatibility.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getIcon,
  setManifest,
  registerAlias,
  isAddress,
  iconAddresses,
} from "../dist/index.js";

// A v2 fixture manifest + a stubbed fetch returning a tiny SVG body.
function installFixture() {
  setManifest({
    icons: {
      "aws:security-waf": "icons/aws/security/waf.svg",
      "aws:compute-lambda": "icons/aws/compute/lambda.svg",
    },
    legacy: { "aws-waf": "aws:security-waf", "aws-lambda-file": "aws:compute-lambda" },
    aliases: {},
  });
  globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => `<path data-url="${url}"/>`,
  });
}

// ── TC-1 — addressing ────────────────────────────────────────────────────
test("isAddress validates prefix:name grammar", () => {
  assert.equal(isAddress("aws:security-waf"), true);
  assert.equal(isAddress("aws-waf"), false);       // legacy flat key, not an address
  assert.equal(isAddress("AWS:Waf"), false);       // uppercase rejected
});

test("iconAddresses lists the namespaced addresses", async () => {
  installFixture();
  const addrs = await iconAddresses();
  assert.deepEqual(addrs, ["aws:compute-lambda", "aws:security-waf"]);
});

test("an address resolves to its file fragment", async () => {
  installFixture();
  const svg = await getIcon("aws:security-waf");
  assert.match(svg, /aws\/security\/waf\.svg/);
});

// ── TC-3 — alias resolution + cycle guard ─────────────────────────────────
test("alias synonym resolves to the parent (builtin)", async () => {
  registerAlias("test:syn", { parent: "user" });
  assert.equal(await getIcon("test:syn"), await getIcon("user"));
});

test("alias transform wraps the parent fragment", async () => {
  registerAlias("test:flip", { parent: "user", hflip: true });
  const out = await getIcon("test:flip");
  assert.match(out, /scale\(-1,1\)/);
  assert.ok(out.includes(await getIcon("user")));
});

test("alias cycle is rejected, not looped", async () => {
  registerAlias("test:a", { parent: "test:b" });
  registerAlias("test:b", { parent: "test:a" });
  await assert.rejects(() => getIcon("test:a"), /alias cycle/);
});

// ── TC-10 — legacy compatibility ──────────────────────────────────────────
test("legacy <provider>-<name> key still resolves", async () => {
  installFixture();
  const svg = await getIcon("aws-waf");           // legacy key → aws:security-waf
  assert.match(svg, /aws\/security\/waf\.svg/);
});

// ── P2 — single source of truth (CR-ICONS-003 / TC-7, TC-12) ──────────────
test("generated manifest is the v2 shape consumed by the loader (TC-7)", () => {
  const m = JSON.parse(readFileSync(new URL("../icons-manifest.json", import.meta.url)));
  assert.ok(m.icons && m.legacy, "manifest carries icons + legacy");
  assert.ok(Object.keys(m.icons).length > 2000, "addresses generated");
  // every legacy key maps to a real address — the artifact both packages read
  for (const addr of Object.values(m.legacy)) assert.ok(addr in m.icons);
});

test("packages/js declares zero runtime dependencies (NFR-3 / TC-12)", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
});
