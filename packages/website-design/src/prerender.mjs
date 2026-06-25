#!/usr/bin/env node
//
// Prerender design.kymo.studio into one static HTML per locale × page:
//   en  → dist/index.html, dist/foundations/<slug>/index.html
//   vi  → dist/vi/index.html, dist/vi/foundations/<slug>/index.html
//   zh  → dist/zh/…  (same tree under /zh)
//
// Each page ships translated <title>/description, a self-referencing
// <link rel="canonical">, hreflang alternates (same page in every locale), and
// the fully-rendered app markup baked in for crawlers. The committed bundle.js
// then HYDRATES whichever page was served. Run from build.sh after dist/ exists.
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // …/src
const dist = join(here, "../dist"); // …/packages/website-design/dist
const ORIGIN = "https://design.kymo.studio";
const LANGS = ["en", "vi", "zh"];
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 1. Bundle a Node-side render entry (App + helpers from App.tsx) to a temp ESM
//    module; React is external so Node's CJS interop handles react-dom/server.
const tmp = join(here, ".prerender.bundle.mjs");
await build({
  stdin: {
    contents: `
      import { renderToString } from "react-dom/server";
      import { createElement } from "react";
      import { App, seoFor, localizedHref, ROUTES } from "./App.tsx";
      export { seoFor, localizedHref, ROUTES };
      export const render = (lang, path) =>
        renderToString(createElement(App, { initialLang: lang, initialPath: path }));
    `,
    resolveDir: here,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "react/jsx-dev-runtime"],
  outfile: tmp,
});
const { render, seoFor, localizedHref, ROUTES } = await import(pathToFileURL(tmp).href);

const fullUrl = (lang, path) => `${ORIGIN}${localizedHref(lang, path)}`;
const outFileFor = (lang, path) => {
  const href = localizedHref(lang, path); // e.g. "/", "/vi/", "/foundations/color", "/vi/foundations/color"
  const rel = href === "/" ? "" : href.replace(/^\/|\/$/g, "");
  return join(dist, rel, "index.html");
};

const tpl = await readFile(join(here, "index.html"), "utf8");

for (const path of ROUTES) {
  // hreflang alternates: the SAME page in every language + x-default → English.
  const alternates =
    LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${fullUrl(l, path)}">`).join("\n") +
    `\n  <link rel="alternate" hreflang="x-default" href="${fullUrl("en", path)}">`;

  for (const lang of LANGS) {
    const { title, description } = seoFor(path, lang);
    // English pages carry the inline auto-detect redirect (cookie → browser
    // language) so a first-time vi/zh visitor lands on their localized URL of
    // the SAME page before React loads.
    const redirect =
      lang === "en"
        ? `<script>
(function(){try{
  var m=document.cookie.match(/(?:^|;\\s*)kymo-lang=(en|vi|zh)\\b/),l=m?m[1]:null;
  if(!l){var n=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||""];
    for(var i=0;i<n.length;i++){var s=(n[i]||"").slice(0,2).toLowerCase();if(s==="en"||s==="vi"||s==="zh"){l=s;break;}}}
  if(l==="vi"||l==="zh"){var p=location.pathname;location.replace("/"+l+(p==="/"?"/":p));}
}catch(e){}})();
</script>`
        : "";
    const url = fullUrl(lang, path);
    const html = tpl
      .replace(/__REDIRECT__/g, redirect)
      .replace(/__LANG__/g, lang)
      .replace(/__TITLE__/g, esc(title))
      .replace(/__DESC__/g, esc(description))
      .replace(/__CANONICAL__/g, url)
      .replace(/__OGURL__/g, url)
      .replace(/__ALTERNATES__/g, alternates)
      .replace(/__APP__/g, render(lang, path));
    const out = outFileFor(lang, path);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html);
    console.log(`  ✓ ${localizedHref(lang, path)}`);
  }
}

await rm(tmp, { force: true });
