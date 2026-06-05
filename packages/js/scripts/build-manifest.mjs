#!/usr/bin/env node
/**
 * Build script: scan the repo-root `icons/` and emit
 * `../icons-manifest.json` (i.e. packages/js/icons-manifest.json, bundled
 * into the published npm package).
 * Mirrors `_scan_icons_dir()` in `packages/python/src/kymo/icons.py`.
 *
 * kymo Icons v2 — P1 (CR-ICONS-002). Emits the v2 manifest shape:
 *   { icons:   { "<prefix>:<name>": "icons/<provider>/<cat…>/<file>" },  // FR-1
 *     legacy:  { "<provider>-<name>": "<prefix>:<name>" },                // FR-11
 *     aliases: { } }                                                      // FR-4
 * `name` RETAINS the category (the source path) so every icon is
 * addressable; the legacy `<provider>-<name>` key (last-write-wins) maps to
 * the winning address so authored diagrams resolve unchanged.
 */
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));    // packages/js/scripts
const ICONS_DIR = join(HERE, "..", "..", "..", "icons"); // repo-root icons/
const PKG = join(HERE, "..");                            // packages/js
const OUT = join(PKG, "icons-manifest.json");            // flat v2 manifest (resolution + parity)
const SETS_DIR = join(PKG, "sets");                      // per-set IconifyJSON (P3)
const COLLECTIONS = join(PKG, "icons-collections.json"); // set index (P3)
const ROOT_DIM = 64;                                     // default icon box (raster, pre-vectorization)

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const files = (await walk(ICONS_DIR)).sort();
const icons = {};        // prefix:name → path (flat manifest)
const legacy = {};       // <provider>-<name> → prefix:name
const sets = {};         // prefix → per-set IconifyJSON (P3)

for (const f of files) {
  const rel = relative(ICONS_DIR, f).replace(/\\/g, "/");
  const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  if (ext !== ".png" && ext !== ".svg") continue;
  const parts = rel.replace(/\.[^.]+$/, "").split("/");          // [aws, compute, ec2]
  const prefix = slug(parts[0]);
  const name = parts.length > 1 ? parts.slice(1).map(slug).join("-") : prefix;
  // category = first path segment after the provider (filesystem grouping)
  const category = parts.length > 2 ? slug(parts[1]) : "";
  let addr = `${prefix}:${name}`;
  // Guarantee a unique address per source file (TC-1) on the rare clash.
  if (icons[addr] && icons[addr] !== `icons/${rel}`) {
    let n = 2;
    while (icons[`${addr}-${n}`]) n += 1;
    addr = `${addr}-${n}`;
  }
  const localName = addr.slice(prefix.length + 1);                // name within the set
  icons[addr] = `icons/${rel}`;
  const legacyKey = parts.length > 1 ? `${parts[0]}-${parts[parts.length - 1]}` : parts[0];
  legacy[legacyKey] = addr;                                       // last-write-wins, matches Python

  // Per-set IconifyJSON record (P3 / FR-2, FR-3, FR-5). Dimensions inherit the
  // root default (sparse — no per-icon width/height until they differ at P4);
  // `path` lets the on-demand loader fetch the file; `category` is searchable.
  const set = sets[prefix] ?? (sets[prefix] = {
    prefix, width: ROOT_DIM, height: ROOT_DIM,
    icons: {}, aliases: {},
    info: { name: prefix, total: 0, categories: {} },
  });
  set.icons[localName] = category ? { path: `icons/${rel}`, category } : { path: `icons/${rel}` };
  set.info.total += 1;
  if (category) (set.info.categories[category] ??= []).push(localName);
}

const manifest = { icons, legacy, aliases: {} };
await writeFile(OUT, JSON.stringify(manifest, null, 0));

// Per-set IconifyJSON files + a collections index (P3). Deterministic: sorted
// prefixes, sorted icon names, so the committed output is diffable.
await mkdir(SETS_DIR, { recursive: true });
const collections = {};
for (const prefix of Object.keys(sets).sort()) {
  const set = sets[prefix];
  const ordered = {};
  for (const n of Object.keys(set.icons).sort()) ordered[n] = set.icons[n];
  set.icons = ordered;
  await writeFile(join(SETS_DIR, `${prefix}.json`), JSON.stringify(set, null, 0));
  collections[prefix] = { total: set.info.total, categories: Object.keys(set.info.categories).sort() };
}
await writeFile(COLLECTIONS, JSON.stringify(collections, null, 0));

console.log(
  `✓ wrote ${OUT} (${Object.keys(icons).length} addresses, ${Object.keys(legacy).length} legacy keys)\n` +
  `✓ wrote ${Object.keys(sets).length} per-set files under sets/ + icons-collections.json`,
);
