// esbuild's `binary` loader turns a `.wasm` import into a `Uint8Array`. The
// extension inlines the kymostudio-core wasm this way so the single-file VSIX can
// `initSync` the BPMN engine with no node_modules at runtime.
declare module "*.wasm" {
  const bytes: Uint8Array;
  export default bytes;
}
