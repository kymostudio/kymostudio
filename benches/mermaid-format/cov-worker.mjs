// Worker: render one mermaid source through merman + kymo, report flags. Lives
// in a worker thread so the main process can time it out and respawn on a hang
// (some sources send a wasm renderer into a non-terminating layout loop, which
// try/catch cannot interrupt).
import { parentPort, workerData } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(workerData.RA + "/package.json");
const core = await import(require.resolve("kymostudio-core"));
core.initSync({ module: readFileSync(require.resolve("kymostudio-core/kymostudio_core_bg.wasm")) });
const merman = await import(require.resolve("kymo-mermaid"));
merman.initSync({ module: readFileSync(require.resolve("kymo-mermaid/kymo_mermaid_bg.wasm")) });

const KYMO = {
  flowchart: (s) => core.mermaidToSvg(s),
  sequence: (s) => core.mermaidSequenceToSvg(s),
};

parentPort.postMessage({ ready: true });
parentPort.on("message", ({ src, grammar }) => {
  const r = { merman_ok: 0, merman_fo: 0, merman_text: 0, kymo_n: 0, kymo_ok: 0 };
  try {
    const svg = merman.mermaidRenderSvg(src);
    r.merman_ok = 1;
    if (/<foreignObject/.test(svg)) r.merman_fo = 1;
    if (/<text[\s>]/.test(svg)) r.merman_text = 1;
  } catch {
    /* render error */
  }
  if (KYMO[grammar]) {
    r.kymo_n = 1;
    try {
      KYMO[grammar](src);
      r.kymo_ok = 1;
    } catch {
      /* kymo can't parse → falls back to merman */
    }
  }
  parentPort.postMessage({ result: r });
});
