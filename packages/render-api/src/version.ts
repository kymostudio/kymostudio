// API version + the engine versions behind each kind, surfaced at GET /version
// and in the x-render-api-version response header. Engine versions are read
// from package.json so they track the installed deps; bundled wasm engines
// (the local crates and emscripten artifacts) report "bundled".
import pkg from "../package.json";

export const API_VERSION = "1.0.0";

const deps = pkg.dependencies as Record<string, string>;
const v = (name: string): string => {
  const raw = deps[name];
  if (!raw) return "unknown";
  return raw.startsWith("file:") ? "bundled" : raw.replace(/^[\^~]/, "");
};

export const VERSION_INFO = {
  name: "kymo-render-api",
  api_version: API_VERSION,
  engines: {
    "kymostudio-core": v("kymostudio-core"),
    "kymo-mermaid": v("kymo-mermaid"), // merman, bundled crate
    graphviz: v("@viz-js/viz"),
    svgbob: v("kymo-svgbob"), // bundled crate
    pikchr: "bundled", // emscripten, vendored
    nomnoml: v("nomnoml"),
    "bytefield-svg": v("bytefield-svg"),
    wavedrom: v("wavedrom"),
    "vega-lite": v("vega-lite"),
    dbml: v("@softwaretechnik/dbml-renderer"),
  },
};
