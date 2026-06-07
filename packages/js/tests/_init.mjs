// Initialize the wasm core once, synchronously, for the BPMN test entry points
// (`parseBpmn`/`toBpmn`/`bpmnLayout`, and `parseDiagram` on a `bpmn { }` source).
// Import this FIRST in any test that calls them. `renderSVG` auto-initializes.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { initSync } from "../dist/index.js";

const require = createRequire(import.meta.url);
initSync(readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")));
