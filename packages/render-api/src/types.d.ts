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
