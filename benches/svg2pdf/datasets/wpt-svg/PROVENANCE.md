# Dataset provenance

Vendored subset of the **web-platform-tests** SVG suite
(https://github.com/web-platform-tests/wpt, `svg/`) — the cross-browser
conformance corpus.

- Source commit: `63a3c259d8e1898fad361107ffc913d7e8d6cf47`
- License: web-platform-tests is **3-Clause BSD** (with portions under the W3C
  Test Suite License); see https://github.com/web-platform-tests/wpt/blob/master/LICENSE.md
- Categories (WPT `svg/` top-level dirs): coordinate-systems, crashtests,
  geometry, painting, path, pservers, render, shapes, struct, styling, types.
- Selection rule: **self-contained SVGs only** — excluded anything pulling
  external resources (`<image>`, `href`/`xlink:href` to another file, `@import`,
  web fonts, `<script>`) and the font/animation/interaction-dependent dirs
  (`text/`, `fonts/`, `animations/`, `scripted/`, `interact/`, `linking/`,
  `as-image/`, `embedded/`, …). Oversized canvases (> 1000 px in either dimension)
  are dropped to keep the committed reference PNGs small.
- Total: 96 SVGs.

`text`/`image`-dependent tests are excluded for the same reason the svg2png bench
excludes them: they depend on bundled fonts / external resources that confound a
*converter*'s accuracy and can't resolve through the string-based engine API.

Reference PNGs in `refs/` are rendered by **headless Google Chrome** — the de-facto
SVG renderer and the accuracy bench's independent ground truth. The committed refs
*are* the ground truth, so `accuracy.py` runs without Chrome; Chrome is only needed
to regenerate them:

```bash
cd benches && uv run python svg2pdf/gen_refs.py
```
