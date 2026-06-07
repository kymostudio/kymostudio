/**
 * BPMN delegation to the Rust core (`kymostudio-core` wasm) — the single source of
 * truth. The JS library no longer ports BPMN itself; import / export / layout / render
 * all cross the wasm boundary, exchanging the canonical `.kymo.json` model body.
 *
 * wasm must be initialized once before the **synchronous** BPMN entry points
 * (`parseBpmn`/`toBpmn`/`bpmnLayout`, and `parseDiagram` on a `bpmn { }` source):
 *   - Node (CLI, VS Code): `initSync(readFileSync(wasmPath))` — fully synchronous.
 *   - Browser (playground): `await init()` once at startup.
 * `renderSVG` is async, so its BPMN path auto-initializes (callers needn't pre-init).
 */
import initWasm, {
  initSync as wasmInitSync,
  type InitInput,
  type SyncInitInput,
  bpmnImport,
  bpmnExport,
  bpmnLayout as wasmBpmnLayout,
  bpmnRender,
  mermaidToKymoJson,
  mermaidToD2,
  mermaidToDot,
  mermaidToMermaid,
} from "kymostudio-core";

import { modelFromDict, parseKymoJson } from "./from-kymojson.js";
import type { BpmnBlock, Diagram } from "./model.js";
import { modelDict } from "./to-kymojson.js";

let ready = false;
let initPromise: Promise<void> | null = null;

/** Synchronously initialize wasm from its bytes/module (Node). Idempotent. */
export function initSync(bytes: SyncInitInput): void {
  if (ready) return;
  wasmInitSync({ module: bytes });
  ready = true;
}

/** Asynchronously initialize wasm (browser). Idempotent; safe to call repeatedly. */
export async function init(input?: InitInput): Promise<void> {
  if (ready) return;
  if (!initPromise) initPromise = initWasm(input).then(() => { ready = true; });
  return initPromise;
}

function ensureReady(): void {
  if (!ready) {
    throw new Error(
      "kymostudio: wasm not initialized — call init() (browser) or initSync(bytes) (Node) " +
        "before using parseBpmn/toBpmn/bpmnLayout",
    );
  }
}

function serializeBlocks(blocks: BpmnBlock[]): string {
  return JSON.stringify(
    blocks.map((b) => ({
      nodes: b.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        shape: n.shape,
        marker: n.marker,
        pin: n.pin ?? null,
      })),
      flows: b.flows.map((f) => ({ src: f.src, dst: f.dst, flow: f.flow, label: f.label })),
    })),
  );
}

/** BPMN 2.0 XML → resolved `Diagram` (DI geometry, no layout pass). */
export function coreParseBpmn(xml: string): Diagram {
  ensureReady();
  return modelFromDict(JSON.parse(bpmnImport(xml)));
}

/** Convert Mermaid flowchart source → D2 (via the shared flowchart IR). */
export function coreMermaidToD2(src: string): string {
  ensureReady();
  return mermaidToD2(src);
}

/** Convert Mermaid flowchart source → Graphviz DOT (via the flowchart IR). */
export function coreMermaidToDot(src: string): string {
  ensureReady();
  return mermaidToDot(src);
}

/** Round-trip / normalize Mermaid flowchart source through the IR. */
export function coreNormalizeMermaid(src: string): string {
  ensureReady();
  return mermaidToMermaid(src);
}

/** Resolve a diagram's `flowchart { }` blocks in place — feed each block's body
 *  (as `flowchart <DIR>\n<body>`) to the Mermaid importer, fold the positioned
 *  components/edges/regions + canvas size back in, and clear the blocks. Mirrors
 *  `coreApplyLayout` for `bpmn { }`. One block per file is the supported case. */
export function coreResolveFlowchart(d: Diagram): void {
  ensureReady();
  for (const [direction, body] of d.flowchartBlocks ?? []) {
    const laid = parseKymoJson(mermaidToKymoJson(`flowchart ${direction}\n${body}`));
    d.components.push(...laid.components);
    d.edges.push(...laid.edges);
    d.regions.push(...laid.regions);
    d.width = laid.width;
    d.height = laid.height;
  }
  d.flowchartBlocks = [];
}

/** `Diagram` of `bpmn-*` glyphs → BPMN 2.0 XML. */
export function coreToBpmn(d: Diagram): string {
  ensureReady();
  return bpmnExport(JSON.stringify(modelDict(d)));
}

/** Mermaid source (flowchart) → resolved `Diagram`. The core lays the graph
 *  out and returns a `.kymo.json` envelope, so the result is already
 *  positioned — render it directly (no layout/alignment pass), like BPMN. */
export function coreMermaidImport(src: string): Diagram {
  ensureReady();
  return parseKymoJson(mermaidToKymoJson(src));
}

/** Resolve a diagram's `bpmn { }` blocks in place (mirrors the old `bpmnLayout`). */
export function coreApplyLayout(d: Diagram): void {
  ensureReady();
  const laid = modelFromDict(JSON.parse(wasmBpmnLayout(serializeBlocks(d.bpmnBlocks ?? []))));
  d.components.push(...laid.components);
  d.edges.push(...laid.edges);
  d.width = laid.width;
  d.height = laid.height;
  d.bpmnBlocks = [];
}

/** Render a BPMN `Diagram` → SVG (byte-identical to the Python/Rust BPMN output).
 *  Async: auto-initializes wasm. `background: undefined` → the core default (`#fafafa`,
 *  matching Python); `null` → a transparent (`fill="none"`) canvas. */
export async function coreBpmnRender(
  d: Diagram,
  opts: { animate?: boolean; background?: string | null } = {},
): Promise<string> {
  await init();
  const background = opts.background === undefined ? null : (opts.background ?? "none");
  return bpmnRender(JSON.stringify(modelDict(d)), opts.animate ?? false, background);
}
