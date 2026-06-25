#!/usr/bin/env node
//
// Prerender the landing into one static HTML page per locale:
//   dist/index.html      → English (canonical, at the root)
//   dist/vi/index.html   → Tiếng Việt
//   dist/zh/index.html   → 中文
//
// Each page ships translated <title>/description, a self-referencing
// <link rel="canonical">, hreflang alternates, and the fully-rendered app
// markup baked in — so crawlers index real per-language content instead of an
// English shell. The committed landing.bundle.js then HYDRATES whichever page
// was served (entry guarded by `typeof document`). Run from build.sh, after
// dist/ exists. Standalone: `node src/landing/prerender.mjs`.
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // …/src/landing
const dist = join(here, "../../dist"); // …/packages/website/dist
const ORIGIN = "https://kymo.studio";
const LANGS = ["en", "vi", "zh"];
const pathFor = (l) => (l === "en" ? "/" : `/${l}/`);
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 1. Bundle a Node-side render entry (App + SEO from main.tsx → renderToString)
//    to a temp ESM module, then import it.
const tmp = join(here, ".prerender.bundle.mjs");
await build({
  stdin: {
    contents: `
      import { renderToString } from "react-dom/server";
      import { createElement } from "react";
      import { App, SEO } from "./main.tsx";
      export { SEO };
      export const render = (lang) => renderToString(createElement(App, { initialLang: lang }));
    `,
    resolveDir: here,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  jsx: "automatic",
  // Leave React to Node's native CJS interop — bundling react-dom/server into
  // ESM turns its internal require("util") into a broken dynamic-require shim.
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "react/jsx-dev-runtime"],
  outfile: tmp,
});
const { render, SEO } = await import(pathToFileURL(tmp).href);

// 2. hreflang alternates block (every locale + x-default → English root).
const alternates =
  LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${ORIGIN}${pathFor(l)}">`).join("\n") +
  `\n  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`;

// 3. Root-page-only inline redirect: send a returning visitor (kymo-lang
//    cookie) or a first-time vi/zh-browser visitor to their language page
//    before React loads. English visitors stay on the canonical root.
const redirect = `<script>
(function(){try{
  var m=document.cookie.match(/(?:^|;\\s*)kymo-lang=(en|vi|zh)\\b/),l=m?m[1]:null;
  if(!l){var n=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||""];
    for(var i=0;i<n.length;i++){var s=(n[i]||"").slice(0,2).toLowerCase();if(s==="en"||s==="vi"||s==="zh"){l=s;break;}}}
  if(l==="vi"||l==="zh")location.replace("/"+l+"/");
}catch(e){}})();
</script>`;

const tpl = await readFile(join(here, "../index.html"), "utf8");

for (const lang of LANGS) {
  const url = `${ORIGIN}${pathFor(lang)}`;
  const html = tpl
    .replace(/__REDIRECT__/g, lang === "en" ? redirect : "")
    .replace(/__LANG__/g, lang)
    .replace(/__TITLE__/g, esc(SEO.title[lang]))
    .replace(/__DESC__/g, esc(SEO.description[lang]))
    .replace(/__CANONICAL__/g, url)
    .replace(/__OGURL__/g, url)
    .replace(/__ALTERNATES__/g, alternates)
    .replace(/__APP__/g, render(lang));
  const outDir = lang === "en" ? dist : join(dist, lang);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.html"), html);
  console.log(`  ✓ ${pathFor(lang)}index.html`);
}

await rm(tmp, { force: true });
