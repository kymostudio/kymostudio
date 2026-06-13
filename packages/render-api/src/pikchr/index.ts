// pikchr — the C implementation from pikchr.org (0-BSD), the same engine
// kroki serves — compiled to wasm with emscripten (see build.sh). workerd
// cannot compile wasm at runtime, so the emscripten factory gets an
// instantiateWasm hook fed the deploy-time-compiled module instead of its
// default fetch-and-compile path.
import factory from "./pikchr.mjs";
import pikchrWasm from "./pikchr.wasm";

const PIKCHR_PLAINTEXT_ERRORS = 0x0001;

interface PikchrModule {
  ccall(name: string, ret: string, argTypes: string[], args: unknown[]): number;
  UTF8ToString(ptr: number): string;
  _free(ptr: number): void;
}

let mod: PikchrModule | undefined;

export async function pikchrToSvg(source: string): Promise<string> {
  mod ??= (await factory({
    instantiateWasm(imports: WebAssembly.Imports, done: (instance: WebAssembly.Instance) => void) {
      done(new WebAssembly.Instance(pikchrWasm, imports));
      return {};
    },
  })) as PikchrModule;
  const ptr = mod.ccall(
    "pikchr",
    "number",
    ["string", "string", "number", "number", "number"],
    [source, "pikchr", PIKCHR_PLAINTEXT_ERRORS, 0, 0],
  );
  const out = mod.UTF8ToString(ptr);
  mod._free(ptr);
  // On error pikchr returns the annotated source as plain text, not SVG.
  if (!out.startsWith("<svg")) throw new Error(out);
  return out;
}
