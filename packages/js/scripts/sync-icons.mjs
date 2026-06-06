#!/usr/bin/env node
/**
 * Build-copy the icon catalogue index from the source-of-truth package
 * (`packages/icons`) into this package, so the published npm tarball is
 * self-contained (it must ship real files — npm cannot reference a sibling
 * package). These copies are git-ignored: `packages/icons` holds the only
 * committed copy. Runs on `prebuild` (tests/build) and `prepack` (publish).
 *
 * Only the catalogue INDEX is copied (`sets/`, `icons-manifest.json`,
 * `icons-collections.json`) — NOT the raw art under `packages/icons/icons/`,
 * which consumers fetch from a host/CDN at runtime via `setIconBaseURL`.
 */
import { cp, mkdir, copyFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));      // packages/js/scripts
const PKG = join(HERE, "..");                             // packages/js
const SRC = join(PKG, "..", "icons");                     // packages/icons (source of truth)

await rm(join(PKG, "sets"), { recursive: true, force: true });
await mkdir(join(PKG, "sets"), { recursive: true });
await cp(join(SRC, "sets"), join(PKG, "sets"), { recursive: true });
await copyFile(join(SRC, "icons-manifest.json"), join(PKG, "icons-manifest.json"));
await copyFile(join(SRC, "icons-collections.json"), join(PKG, "icons-collections.json"));

console.log("✓ synced icon catalogue index from packages/icons → packages/js");
