# Changelog

All notable changes to the kymostudio VS Code extension.

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
