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
import { readdir, writeFile } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));    // packages/js/scripts
const ICONS_DIR = join(HERE, "..", "..", "..", "icons"); // repo-root icons/
const OUT = join(HERE, "..", "icons-manifest.json");     // packages/js/icons-manifest.json

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
const icons = {};        // prefix:name → path
const legacy = {};       // <provider>-<name> → prefix:name
const byPath = new Map();

for (const f of files) {
  const rel = relative(ICONS_DIR, f).replace(/\\/g, "/");
  const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  if (ext !== ".png" && ext !== ".svg") continue;
  const parts = rel.replace(/\.[^.]+$/, "").split("/");          // [aws, compute, ec2]
  const prefix = slug(parts[0]);
  const name = parts.length > 1 ? parts.slice(1).map(slug).join("-") : prefix;
  let addr = `${prefix}:${name}`;
  // Guarantee a unique address per source file (TC-1) on the rare clash.
  if (icons[addr] && icons[addr] !== `icons/${rel}`) {
    let n = 2;
    while (icons[`${addr}-${n}`]) n += 1;
    addr = `${addr}-${n}`;
  }
  icons[addr] = `icons/${rel}`;
  byPath.set(`icons/${rel}`, addr);
  const legacyKey = parts.length > 1 ? `${parts[0]}-${parts[parts.length - 1]}` : parts[0];
  legacy[legacyKey] = addr;                                       // last-write-wins, matches Python
}

const manifest = { icons, legacy, aliases: {} };
await writeFile(OUT, JSON.stringify(manifest, null, 0));
console.log(
  `✓ wrote ${OUT} (${Object.keys(icons).length} addresses, ${Object.keys(legacy).length} legacy keys)`,
);
