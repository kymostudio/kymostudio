/**
 * Build the extension host bundle.
 *
 * `src/extension.ts` plus the bundled, dependency-free `kymostudio` renderer
 * are emitted as a single CommonJS file (`dist/extension.js`). VS Code provides
 * the `vscode` module at runtime, so it stays external. No `node_modules` ships
 * in the VSIX — everything is inlined here.
 */
import esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    outfile: "dist/extension.js",
    external: ["vscode"],
    // Inline the kymostudio-core wasm (BPMN engine) as bytes so the single-file
    // VSIX can `initSync` it with no node_modules at runtime.
    loader: { ".wasm": "binary" },
    sourcemap: !production,
    minify: production,
    logLevel: "info",
  });

  if (watch) {
    await ctx.watch();
    console.log("[esbuild] watching…");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
