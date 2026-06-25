#!/usr/bin/env node
//
// Prerender the icons HOME gallery into one static shell per locale:
//   dist/index.html (en, canonical) · dist/vi/index.html · dist/zh/index.html
//
// Each shell ships the translated chrome + <title>/description, a canonical
// link and hreflang alternates, so the entry page has real per-language SEO.
// The icon CATALOGUE itself is fetched client-side (API) — the baked markup is
// the pre-fetch chrome, which equals the client's first render, so the bundle
// HYDRATES cleanly. Deep routes (/set, /icon, /brand) are NOT prerendered; they
// fall back to the empty app.html shell. Run from build.sh after dist/ exists.
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // …/src
const dist = join(here, "../dist"); // …/packages/website-icons/dist
const ORIGIN = "https://icons.kymo.studio";
const LANGS = ["en", "vi", "zh"];
const pathFor = (l) => (l === "en" ? "/" : `/${l}/`);
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Bundle a Node-side render entry (App wrapped in LangProvider) to a temp ESM
// module; React stays external so Node's CJS interop handles react-dom/server.
const tmp = join(here, ".prerender.bundle.mjs");
await build({
  stdin: {
    contents: `
      import { renderToString } from "react-dom/server";
      import { createElement } from "react";
      import { App } from "./App.tsx";
      import { LangProvider, SEO } from "./i18n.tsx";
      export { SEO };
      export const render = (lang) =>
        renderToString(createElement(LangProvider, { initialLang: lang }, createElement(App)));
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
const { render, SEO } = await import(pathToFileURL(tmp).href);

const alternates =
  LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${ORIGIN}${pathFor(l)}">`).join("\n") +
  `\n  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`;

// Root-page-only inline redirect: send returning (cookie) / first-time vi/zh
// visitors to their language home before React loads. English visitors stay.
const redirect = `<script>
(function(){try{
  var m=document.cookie.match(/(?:^|;\\s*)kymo-lang=(en|vi|zh)\\b/),l=m?m[1]:null;
  if(!l){var n=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||""];
    for(var i=0;i<n.length;i++){var s=(n[i]||"").slice(0,2).toLowerCase();if(s==="en"||s==="vi"||s==="zh"){l=s;break;}}}
  if(l==="vi"||l==="zh")location.replace("/"+l+"/");
}catch(e){}})();
</script>`;

const tpl = await readFile(join(here, "index.html"), "utf8");

for (const lang of LANGS) {
  const url = `${ORIGIN}${pathFor(lang)}`;
  const html = tpl
    .replace(/__REDIRECT__/g, lang === "en" ? redirect : "")
    .replace(/__LANG__/g, lang)
    .replace(/__TITLE__/g, esc(SEO.title[lang]))
    .replace(/__DESC__/g, esc(SEO.description[lang]))
    .replace(/__CANONICAL__/g, url)
    .replace(/__ALTERNATES__/g, alternates)
    .replace(/__APP__/g, render(lang));
  const outDir = lang === "en" ? dist : join(dist, lang);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.html"), html);
  console.log(`  ✓ ${pathFor(lang)}index.html`);
}

await rm(tmp, { force: true });
