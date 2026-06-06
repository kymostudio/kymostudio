#!/usr/bin/env node
/**
 * `kymo` executable — thin wrapper over bin/render-cli.mjs.
 * SVG output has zero runtime dependencies; PNG output uses the optional
 * `kymostudio-core` wasm package.
 */
import { run } from "./render-cli.mjs";

process.exit(await run(process.argv.slice(2)));
