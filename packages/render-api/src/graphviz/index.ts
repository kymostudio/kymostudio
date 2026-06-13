// Real graphviz at the edge: @viz-js/viz (graphviz 14 compiled with
// emscripten). Its build embeds the wasm bytes and runtime-compiles them —
// forbidden in workerd, with no instantiateWasm hook exposed — so during init
// the global WebAssembly.instantiate is swapped: byte-array calls receive the
// deploy-time-compiled module (extract.mjs pulls matching bytes from the same
// package version at build time), module calls pass through. The shim lives
// only for the duration of instance().
import vizWasm from "./graphviz.wasm";

interface Viz {
  renderString(src: string, options?: { format?: string; engine?: string }): string;
}

let vizInstance: Promise<Viz> | undefined;

async function getViz(): Promise<Viz> {
  if (!vizInstance) {
    vizInstance = (async () => {
      const orig = WebAssembly.instantiate.bind(WebAssembly);
      const shim = ((bin: unknown, imports?: WebAssembly.Imports) =>
        bin instanceof ArrayBuffer || ArrayBuffer.isView(bin)
          ? orig(vizWasm, imports ?? {}).then((instance) => ({ instance, module: vizWasm }))
          : orig(bin as WebAssembly.Module, imports ?? {})) as typeof WebAssembly.instantiate;
      (WebAssembly as { instantiate: typeof WebAssembly.instantiate }).instantiate = shim;
      try {
        const { instance } = await import("@viz-js/viz");
        return (await instance()) as Viz;
      } finally {
        (WebAssembly as { instantiate: typeof WebAssembly.instantiate }).instantiate = orig;
      }
    })();
  }
  return vizInstance;
}

/** DOT source → SVG via real graphviz (every layout engine kroki offers dot for). */
export async function graphvizToSvg(dot: string): Promise<string> {
  return (await getViz()).renderString(dot, { format: "svg" });
}
