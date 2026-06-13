# Bundling kroki's engines: seven kinds move into the worker

*The study behind the kind-by-kind conversion round (PRs #326–#331). Written
2026-06-13, following [warm-on-share](2026-06-13-warm-on-share.md). The
committed [`../results/REPORT.md`](../results/REPORT.md) is this round's
warm-isolate snapshot from the fsn1 box.*

## Abstract

render.kymo.studio started with five self-rendered kinds (the kymostudio
engine's own grammars) and proxied the other 24 to kroki.io. This round moved
seven more inside — **nomnoml, bytefield, wavedrom, vega, vegalite** (kroki's
own JS engine packages, bundled as-is), **svgbob** (the same Rust crate kroki
runs natively, behind a new one-export wasm crate `packages/rust/kymo-svgbob`)
and **pikchr** (the C source from pikchr.org, emscripten-compiled, vendored
artifacts). Twelve kinds now render at the PoP; what still proxies is exactly
the set whose engines are JVM/Python/TeX processes (plantuml, ditaa,
blockdiag-family, tikz, erd, structurizr, symbolator, umlet, wireviz) plus
**dbml**, whose JS renderer embeds graphviz-via-emscripten and compiles it at
runtime — the one thing workerd will not do. Warm medians: every self-rendered
kind ≤ 88 ms; the JS-engine kinds beat kroki 2–8× even from the datacenter
next door (bytefield 71 vs 197 ms, wavedrom 43 vs 99 ms, vegalite 88 vs
320 ms); the native-C/Rust kinds tie (svgbob 47 vs 47 ms, pikchr 40 vs 36 ms)
— and the tie is the win, because a tie next to kroki is a 4–10× from Vietnam.

## 1. Three engine classes, three integration costs

**JS upstream (5 kinds, ~free).** kroki's nomnoml/bytefield/wavedrom/vega
companions are thin HTTP wrappers around npm packages; the worker just imports
the same packages. Two workerd-isms: `nodejs_compat` (nomnoml imports `path`),
and vega's expression compiler uses `new Function()`, which workerd forbids —
vega's own CSP escape hatch (`{ ast: true }` + `vega-interpreter`) drops in
with no spec-visible difference. Sizes: nomnoml +32 KiB gzip, bytefield
+213 KiB, wavedrom +47 KiB, vega+vegalite +409 KiB.

**Rust crate (svgbob, one morning).** svgbob upstream ships an npm wasm but
built `--target bundler`, which workerd's CompiledWasm pipeline can't load.
Building our own was smaller than diagnosing theirs: a 26-line crate wrapping
`svgbob::to_svg_string_pretty` behind wasm-bindgen `--target web`, initialized
by the existing `ensure()` alongside kymostudio-core. +124 KiB gzip.

**C source (pikchr, the interesting one).** pikchr.c is a single 0-BSD file.
emscripten `MODULARIZE`+`EXPORT_ES6` output normally fetches and compiles its
wasm at runtime — forbidden in workerd — but the factory accepts an
`instantiateWasm` hook, and `new WebAssembly.Instance(precompiledModule,
imports)` is allowed. So the deploy-time-compiled module (wrangler's default
.wasm rule) feeds the hook and emscripten never touches a compiler. Artifacts
are vendored with a build.sh (pikchr.c changes ~never; CI carries no emsdk).
+51 KiB gzip.

## 2. The numbers (warm isolates, fsn1, 10 reps, cache-busted)

| kind | mine | kroki | × |
|---|---|---|---|
| mermaid/svg | **40 ms** | 315 ms | 7.9× |
| vegalite/svg | **88 ms** | 320 ms | 3.6× |
| bytefield/svg | **71 ms** | 197 ms | 2.8× |
| wavedrom/svg | **43 ms** | 99 ms | 2.3× |
| nomnoml/svg | **48 ms** | 90 ms | 1.9× |
| graphviz/svg | **36 ms** | 53 ms | 1.5× |
| svgbob/svg | 47 ms | 47 ms | 1.0× |
| pikchr/svg | 40 ms | 36 ms | 0.9× |
| plantuml/svg (proxy) | 85 ms | 62 ms | miss pays the hop |

The pattern: the more machinery kroki needs per render (puppeteer, JVM-free
JS companions under queue pressure), the bigger the bundling win. Where
kroki's engine is a fast native binary (svgbob, pikchr, dot) the busted
numbers tie — and the value is structural instead: no third-party availability
risk, and the latency is PoP-local for users who are not in Frankfurt.

**Cold isolates are real.** The first bench run after the deploy showed
graphviz at 234 ms and pikchr at 297 ms median — every fresh isolate pays the
6 MB core instantiation + font registration once, and pikchr's first call adds
its own module init. The second run (this snapshot) is the steady state. A
controlled cold-start series stays on the follow-up list.

## 3. Size and the plan line

The bundle crossed the free-plan 3 MB cap at pikchr: 2,257 KiB (the original
five kinds) → 2,926 (vega) → 3,050 (svgbob) → **3,102 KiB gzip** deployed on
Workers Paid. The 10 MB paid cap leaves room for the two candidates left on
the bench: full-grammar mermaid via merman, and dbml — feasible only by
building graphviz-wasm ourselves with an `instantiateWasm` path (viz.js's sync
bundle base64-embeds its wasm and compiles at runtime; no hook reaches it).

## Verdict

"Convert everything" was never literally on the table — half of kroki's
catalog is a JVM or a Python process. But the half that *is* portable now
runs at the edge: 12 of 29 kinds self-rendered covering the everyday set
(flowcharts, sequence-adjacent, charts, ASCII art, hardware timing), 2–8×
faster than proxying where engines differ, tied where they don't, and immune
to kroki's bad hours everywhere except the long tail.
