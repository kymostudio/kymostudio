# Changelog

All notable changes to the kymostudio VS Code extension.

## 0.2.4

- Initial release (version aligned with the kymostudio monorepo).
- Native preview for both `.diagram` (the DSL) and BPMN 2.0 (`.bpmn`), rendered
  in-process by the bundled, dependency-free `kymostudio` JS engine — no Python.
- Live re-render on edit (debounced) and on save; `kymostudio.preview.autoRefresh`.
- Zoom (wheel + buttons), pan (drag), fit-to-window, and reset.
- Export the rendered diagram as SVG (toolbar + `kymostudio: Export Diagram as SVG…`).
- `light` / `dark` / `transparent` canvas backgrounds via `kymostudio.preview.background`.
