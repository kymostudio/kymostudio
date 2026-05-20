#!/usr/bin/env node
/**
 * One-time build script: scan the repo-root `icons/` and emit
 * `../icons-manifest.json` (i.e. packages/js/icons-manifest.json, which is
 * bundled into the published npm package).
 * Mirrors `_scan_icons_dir()` in `packages/python/src/kymo/icons.py`.
 *
 * Key convention: `icons/<provider>/<category>/<name>.<ext>`
 *   → `<provider>-<name>` (drop the middle category).
 */
import { readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));    // packages/js/scripts
const ICONS_DIR = join(HERE, "..", "..", "..", "icons"); // repo-root icons/
const OUT = join(HERE, "..", "icons-manifest.json");     // packages/js/icons-manifest.json

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
const manifest = {};
for (const f of files) {
  const ext = extname(f).toLowerCase();
  if (ext !== ".png" && ext !== ".svg") continue;
  const rel = relative(ICONS_DIR, f);                  // aws/compute/ec2.png
  const parts = rel.replace(/\.[^.]+$/, "").split("/"); // [aws, compute, ec2]
  const key = parts.length > 1 ? `${parts[0]}-${parts[parts.length - 1]}` : parts[0];
  manifest[key] = `icons/${rel.replace(/\\/g, "/")}`;   // path served by static host
}

await writeFile(OUT, JSON.stringify(manifest, null, 0));
console.log(`✓ wrote ${OUT} (${Object.keys(manifest).length} keys)`);
