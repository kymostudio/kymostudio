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
  resetIconCaches,
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

// ── P3 — on-demand / batched loading (CR-ICONS-004 / TC-8) ────────────────
// A fetch stub that counts requests per URL and serves one per-set file.
function installSetStub() {
  resetIconCaches();
  const calls = [];
  const setBody = {
    prefix: "aws", width: 64, height: 64, aliases: {},
    info: { name: "aws", total: 2, categories: { security: ["security-waf"] } },
    icons: {
      "security-waf": { path: "icons/aws/security/waf.png", category: "security" },
      "compute-lambda": { path: "icons/aws/compute/lambda.png", category: "compute" },
    },
  };
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith("sets/aws.json")) {
      return { ok: true, status: 200, json: async () => setBody };
    }
    return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  };
  return calls;
}

test("addresses load on demand: one request per set, then cached (TC-8)", async () => {
  const calls = installSetStub();
  await getIcon("aws:security-waf");
  await getIcon("aws:compute-lambda");           // same set → no second set fetch
  await getIcon("aws:security-waf");             // cached fragment → no fetch at all
  const setFetches = calls.filter((u) => u.endsWith("sets/aws.json")).length;
  assert.equal(setFetches, 1, "set fetched exactly once (batched + cached)");
  // whole catalogue (flat manifest) was NOT pulled up front
  assert.equal(calls.filter((u) => u.endsWith("icons-manifest.json")).length, 0);
});

test("a missing name is recorded and not re-requested (TC-8 / NFR-4)", async () => {
  const calls = installSetStub();
  await assert.rejects(() => getIcon("aws:does-not-exist"), /unknown icon/);
  await assert.rejects(() => getIcon("aws:does-not-exist"), /unknown icon/);
  // set fetched once; the miss is cached so the 2nd lookup issues no new fetch
  assert.equal(calls.filter((u) => u.endsWith("sets/aws.json")).length, 1);
});

// ── CR-ICONS-007 — vendored inline IconifyJSON sets (the `ai` set) ─────────
// `sets/ai.json` ships inline SVG `body` art (no `icons/ai/` files), exactly
// like `@iconify-json/<prefix>`. The loader renders the body crisp + id-safe
// per use, keeping brand colours — no file fetch.
function installInlineStub() {
  resetIconCaches();
  const calls = [];
  const aiSet = {
    prefix: "ai", width: 256, height: 256, aliases: {},
    info: { name: "AI", total: 2, categories: { provider: ["openai", "gemini"] },
            license: { title: "CC0 1.0", spdx: "CC0-1.0" } },
    icons: {
      openai: { body: '<path d="M1 2z"/>', width: 256, height: 260, category: "provider" },
      gemini: { body: '<defs><radialGradient id="g"/></defs><path fill="url(#g)" d="M0 0z"/>',
                width: 512, height: 188, category: "provider" },
    },
  };
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith("sets/ai.json")) return { ok: true, status: 200, json: async () => aiSet };
    return { ok: false, status: 404 };               // no file should be fetched
  };
  return calls;
}

test("inline-body address renders as crisp SVG with its own viewBox (no file fetch)", async () => {
  const calls = installInlineStub();
  const svg = await getIcon("ai:openai");
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 256 260"/);
  assert.match(svg, /<path d="M1 2z"\/>/);
  // resolved from the set body — the loader never hit an icon file
  assert.equal(calls.filter((u) => u.endsWith("sets/ai.json")).length, 1);
  assert.equal(calls.filter((u) => /\.(svg|png)$/.test(u)).length, 0);
});

test("repeated inline use gets distinct ids so gradients never collide (FR-7)", async () => {
  installInlineStub();
  const a = await getIcon("ai:gemini");
  const b = await getIcon("ai:gemini");
  const ids = (s) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids(a).length > 0);
  assert.ok(ids(a).every((x) => !ids(b).includes(x)), "ids are namespaced per use");
  assert.match(a, /url\(#g-i\d+\)/);                 // ref rewritten to match
});

test("the real sets/ai.json is a valid inline set with three brand logos", () => {
  const ai = JSON.parse(readFileSync(new URL("../sets/ai.json", import.meta.url)));
  assert.equal(ai.prefix, "ai");
  assert.deepEqual(Object.keys(ai.icons).sort(), ["anthropic", "gemini", "openai"]);
  for (const rec of Object.values(ai.icons)) {
    assert.ok(typeof rec.body === "string" && rec.body.length > 0);
    assert.equal(rec.path, undefined);               // inline, not path-backed
  }
  assert.equal(ai.info.license.spdx, "CC0-1.0");
});
