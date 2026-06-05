/**
 * `kymo icons <verb>` — JS mirror of packages/python/src/kymo/icons_cli.py
 * (CR-ICONS-001 / FR-12..15). Hand-rolled parser, ZERO runtime dependencies
 * (NFR-3): reads the generated artifacts with `node:fs`, and uses the built-in
 * `fetch` for the opt-in `--remote` / `--from iconify` paths only.
 *
 *   kymo icons list     [provider] [--json]
 *   kymo icons search   <query> [--provider P] [--remote] [--limit N] [--json]
 *   kymo icons describe <prefix:name> [--json]
 *   kymo icons download <prefix:name>... [--from <source>] [-o <dir>] [-y]
 *
 * Every verb returns 0 on success, non-zero on error (CI-usable).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");   // packages/js
const REPO = join(PKG, "..", "..");
const ICONIFY_API = "https://api.iconify.design";
const ADDR_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;

const USAGE = [
  "usage: kymo icons <list|search|describe|download> [args]",
  "  list     [provider] [--json]",
  "  search   <query> [--provider P] [--remote] [--limit N] [--json]",
  "  describe <prefix:name> [--json]",
  "  download <prefix:name>... [--from <source>] [-o <dir>] [-y]",
].join("\n");

function readJSON(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch { return fallback; }
}
const collections = () => readJSON(join(PKG, "icons-collections.json"), {});
const loadSet = (prefix) => readJSON(join(PKG, "sets", `${prefix}.json`), null);
const manifest = () => readJSON(join(PKG, "icons-manifest.json"), { icons: {}, legacy: {}, aliases: {} });

/** Pop `--name value` (or `-o value`) from argv, returning the value. */
function opt(argv, name) {
  const i = argv.indexOf(name);
  if (i >= 0 && i + 1 < argv.length) { const v = argv[i + 1]; argv.splice(i, 2); return v; }
  if (i >= 0) { argv.splice(i, 1); }
  return undefined;
}

function aliasChain(addr) {
  const aliases = manifest().aliases ?? {};
  const chain = []; const seen = new Set(); let cur = addr;
  while (aliases[cur] && !seen.has(cur)) { seen.add(cur); cur = aliases[cur].parent; chain.push(cur); }
  return chain;
}

// ── list (FR-13) ───────────────────────────────────────────────────────────
function cmdList(argv, log, err) {
  const asJson = argv.includes("--json");
  const rest = argv.filter((a) => a !== "--json");
  const cols = collections();
  if (rest.length === 0) {
    if (asJson) { log(JSON.stringify(cols)); return 0; }
    if (!Object.keys(cols).length) { log("no icon sets found (run: npm run build-manifest)"); return 0; }
    for (const prefix of Object.keys(cols).sort()) {
      const c = cols[prefix];
      log(`${prefix.padEnd(16)} ${String(c.total).padStart(5)} icons  [${c.categories.join(", ")}]`);
    }
    return 0;
  }
  const prefix = rest[0];
  const s = loadSet(prefix);
  if (!s) { err(`unknown provider: ${JSON.stringify(prefix)}`); return 1; }
  const addrs = Object.keys(s.icons).sort().map((n) => `${prefix}:${n}`);
  log(asJson ? JSON.stringify(addrs) : addrs.join("\n"));
  return 0;
}

// ── search (FR-14) ───────────────────────────────────────────────────────────
async function cmdSearch(argv, log, err) {
  const asJson = argv.includes("--json");
  const remote = argv.includes("--remote");
  const provider = opt(argv, "--provider");
  const limit = opt(argv, "--limit");
  const rest = argv.filter((a) => a !== "--json" && a !== "--remote");
  if (!rest.length) { err("usage: kymo icons search <query> [--provider P] [--remote] [--limit N] [--json]"); return 1; }
  const query = rest[0].toLowerCase();
  const n = limit && /^\d+$/.test(limit) ? Number(limit) : 50;

  const prefixes = provider ? [provider] : Object.keys(collections()).sort();
  const scored = [];
  for (const prefix of prefixes) {
    const s = loadSet(prefix);
    if (!s) continue;
    for (const [name, rec] of Object.entries(s.icons)) {
      const cat = (rec.category ?? "").toLowerCase();
      let rank;
      if (query === name) rank = 0;
      else if (name.includes(query)) rank = 1;
      else if (cat.includes(query)) rank = 2;
      else continue;
      scored.push([rank, `${prefix}:${name}`]);
    }
  }
  scored.sort((a, b) => (a[0] - b[0]) || (a[1] < b[1] ? -1 : 1));
  const results = scored.map(([, a]) => a).slice(0, n);

  let remoteResults = [];
  if (remote) {
    try {
      const r = await fetch(`${ICONIFY_API}/search?query=${encodeURIComponent(query)}&limit=${n}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      remoteResults = (await r.json()).icons ?? [];
    } catch (e) { err(`remote search failed: ${e.message}`); return 1; }
  }
  if (asJson) { log(JSON.stringify({ query, results, remote: remoteResults })); return 0; }
  for (const a of results) log(a);
  for (const a of remoteResults) log(`${a}\t(iconify, fetchable)`);
  return 0;
}

// ── describe (FR-15) ──────────────────────────────────────────────────────────
function cmdDescribe(argv, log, err) {
  const asJson = argv.includes("--json");
  const rest = argv.filter((a) => a !== "--json");
  if (!rest.length) { err("usage: kymo icons describe <prefix:name> [--json]"); return 1; }
  const addr = rest[0];
  if (!ADDR_RE.test(addr)) { err(`malformed address (expected prefix:name): ${JSON.stringify(addr)}`); return 1; }
  const [prefix, name] = [addr.slice(0, addr.indexOf(":")), addr.slice(addr.indexOf(":") + 1)];
  const s = loadSet(prefix);
  const rec = s && s.icons[name];
  if (!rec) { err(`unknown icon: ${JSON.stringify(addr)}`); return 1; }
  const info = s.info ?? {};
  const out = {
    address: addr,
    width: rec.width ?? s.width,
    height: rec.height ?? s.height,
    category: rec.category ?? null,
    path: rec.path ?? null,
    set: { name: info.name ?? prefix, total: info.total ?? null, license: info.license ?? null },
    aliasChain: aliasChain(addr),
  };
  if (asJson) { log(JSON.stringify(out)); return 0; }
  log(`address  : ${out.address}`);
  log(`size     : ${out.width}×${out.height}`);
  log(`category : ${out.category}`);
  log(`source   : ${out.path}`);
  log(`set      : ${out.set.name} (${out.set.total} icons)`);
  if (out.aliasChain.length) log(`alias of : ${out.aliasChain.join(" → ")}`);
  return 0;
}

// ── download (FR-15) ──────────────────────────────────────────────────────────
async function cmdDownload(argv, log, err) {
  const source = opt(argv, "--from");
  const outDir = opt(argv, "-o") || "icons";
  const yes = argv.includes("-y");
  const targets = argv.filter((a) => a !== "-y");
  if (!targets.length) { err("usage: kymo icons download <prefix:name>... [--from <source>] [-o <dir>] [-y]"); return 1; }

  for (const addr of targets) {
    if (!ADDR_RE.test(addr)) { err(`malformed address: ${JSON.stringify(addr)}`); return 1; }
    const [prefix, name] = [addr.slice(0, addr.indexOf(":")), addr.slice(addr.indexOf(":") + 1)];
    if (source === "iconify") {
      let body;
      try {
        const r = await fetch(`${ICONIFY_API}/${prefix}/${name}.svg`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        body = await r.text();
      } catch (e) { err(`iconify fetch failed for ${addr}: ${e.message}`); return 1; }
      try {
        const { normalize } = await import("../scripts/icons-pipeline.mjs");   // P4 (FR-8)
        body = normalize(body);
      } catch { /* pipeline optional pre-P4 */ }
      const target = join(outDir, prefix, `${name}.svg`);
      if (existsSync(target) && !yes) { err(`refusing to overwrite ${target} (pass -y)`); return 1; }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
      log(`✓ wrote ${target}`);
    } else {
      const path = manifest().icons[addr];
      if (!path) { err(`unknown icon: ${JSON.stringify(addr)}`); return 1; }
      const target = join(outDir, basename(path));
      if (existsSync(target) && !yes) { err(`refusing to overwrite ${target} (pass -y)`); return 1; }
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(REPO, path), target);
      log(`✓ wrote ${target}`);
    }
  }
  return 0;
}

const HANDLERS = { list: cmdList, search: cmdSearch, describe: cmdDescribe, download: cmdDownload };

export async function run(argv, log = console.log, err = console.error) {
  if (!argv.length || argv[0] === "-h" || argv[0] === "--help") { log(USAGE); return argv.length ? 0 : 1; }
  const [verb, ...rest] = argv;
  const handler = HANDLERS[verb];
  if (!handler) { err(`unknown icons command: ${JSON.stringify(verb)}\n${USAGE}`); return 2; }
  return handler(rest, log, err);
}
