# kymo User Guide

**Type it. See it appear. Watch it animate.**

kymo turns a small, line-oriented text language (`.kymo`) into clean, **animated SVG**
diagrams — architecture diagrams, cloud reference designs, data flows, and BPMN
processes — and can also export to Figma, Excalidraw, and WebP, or import standard
BPMN 2.0 files. You write *what* to draw; kymo decides *how* and *where*.

This guide is the friendly, example-first companion to the formal
[DSL Language Specification](../formats/kymo-dsl/README.md). Start here if you want to draw a diagram;
reach for the spec when you need the exact grammar.

## Contents

| Guide | What it covers |
|-------|----------------|
| [Getting Started](./getting-started.md) | Install kymo and render your first diagram in five minutes. |
| [The `.kymo` Language](./dsl-guide.md) | A guided tour of every building block: components, regions, layout, edges, icons, and BPMN. |
| [Cookbook](./cookbook.md) | Complete, copy-pasteable diagrams for common patterns — cloud architecture, layered systems, and workflows. |
| [FAQ & Troubleshooting](./faq.md) | Fixes for the problems you'll hit in your first week. |

## Try it without installing

The browser playground runs the whole engine client-side — type DSL on the left,
see the SVG on the right, share via URL:

**<https://kymostudio.github.io/kymostudio/app/>**

## Where to go next

- **[DSL Language Specification](../formats/kymo-dsl/README.md)** (`KYMO-DSL-001`) — the normative grammar (EBNF),
  semantics, and conformance rules. The reference implementation is
  [`packages/python/src/kymo/dsl.py`](../../packages/python/src/kymo/dsl.py).
- **[BPMN element mapping](../formats/bpmn/kymo-mapping.md)** (`BPMN-MAP-001`) — how `.bpmn`
  files map to kymo shapes on import and export; part of the
  [BPMN 2.0.2 normative-reference set](../formats/bpmn/) (`BPMN-NREF-001`).
- **[Best-practice diagrams](../diagrams/best-practices.md)** — design principles for diagrams
  that read well.
- **[`samples/`](../../samples)** — complete `.kymo` and `.bpmn` files, each with its rendered SVG.
