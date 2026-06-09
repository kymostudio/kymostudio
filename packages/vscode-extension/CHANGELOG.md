# Changelog

All notable changes to the kymostudio VS Code extension.

## 0.5.0

- **Syntax highlighting for `.kymo` files.** Adds a TextMate grammar
  (`syntaxes/kymo.tmLanguage.json`, scope `source.kymo`) covering the KYMO-DSL
  surface: line comments, double-quoted strings, hex colour literals
  (`#76b900`, distinguished from comments), integer literals, metadata
  directives (`title` / `subtitle` / `canvas` / `external`), the
  `shape/icon/accent` leaf triple, edge arrows (`-->` / `==>`), the `@`
  placement operator, region/layout/option keywords, and side/alignment
  constants. `bpmn { … }` blocks highlight their node kinds (`start`, `task`,
  `xor`, `end!`, …) and flow arrows (`->` / `~>` / `..>`); `flowchart { … }`
  blocks embed `source.mermaid` when that grammar is installed. Covered by a
  tokenisation test suite (`tests/grammar.test.js`) that drives the grammar
  through `vscode-textmate` + `vscode-oniguruma`.

## 0.4.1

- Version bump to realign the extension with the monorepo release (catching up from 0.3.5 through 0.4.0). No change to the extension's behaviour.

## 0.3.5

- Version bump to stay in lockstep with the monorepo release. No change to the
  extension's behaviour.

## 0.3.4

- Version bump to stay in lockstep with the monorepo release. No change to the
  extension's behaviour.

## 0.2.6

- Published to the Visual Studio Marketplace and Open VSX
  (`kymostudio.kymostudio-vscode`), with a marketplace icon and an automated
  `release-vscode.yml` workflow. No change to the extension's behaviour versus
  `0.2.5`.

## 0.2.5

- Version aligned with the kymostudio monorepo (`0.2.5`); no change to the
  extension's behaviour versus `0.2.4`.

## 0.2.4

- Initial release (version aligned with the kymostudio monorepo).
- Native preview for both `.kymo` (the DSL) and BPMN 2.0 (`.bpmn`), rendered
  in-process by the bundled, dependency-free `kymostudio` JS engine — no Python.
- Live re-render on edit (debounced) and on save; `kymostudio.preview.autoRefresh`.
- Zoom (wheel + buttons), pan (drag), fit-to-window, and reset.
- Export the rendered diagram as SVG (toolbar + `kymostudio: Export Diagram as SVG…`).
- `light` / `dark` / `transparent` canvas backgrounds via `kymostudio.preview.background`.
