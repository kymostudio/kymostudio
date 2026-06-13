// wrangler module rules: .wasm lands as a deploy-time-compiled module
// (CompiledWasm — runtime `new WebAssembly.Module` is forbidden in workerd),
// .ttf as raw bytes (Data).
declare module "*.wasm" {
  const mod: WebAssembly.Module;
  export default mod;
}
declare module "*.ttf" {
  const data: ArrayBuffer;
  export default data;
}

// bytefield-svg ships no type declarations.
declare module "bytefield-svg" {
  const render: (source: string, options?: { embedded?: boolean }) => string;
  export default render;
}

// wavedrom and onml ship no type declarations either.
declare module "wavedrom" {
  const wavedrom: {
    renderAny: (index: number, source: unknown, skin: unknown) => unknown;
    waveSkin: unknown;
  };
  export default wavedrom;
}
declare module "onml" {
  const onml: { s: (tree: unknown) => string };
  export default onml;
}

// vega-interpreter ships no type declarations.
declare module "vega-interpreter" {
  export const expressionInterpreter: unknown;
}
