#!/usr/bin/env node
/**
 * `kymo-icons` executable — thin wrapper over bin/icons-cli.mjs (CR-ICONS-001).
 * Zero runtime dependencies (NFR-3).
 */
import { run } from "./icons-cli.mjs";

process.exit(await run(process.argv.slice(2)));
