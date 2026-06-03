# stencils/

Drop draw.io stencil-set XML here to widen shape coverage (best-effort).
Each file may be a `<shapes>` set or a single `<shape name="…">…</shape>`.
Shape names are registered lowercased into `mxStencilRegistry`.

Source: draw.io repo `src/main/webapp/stencils/` (e.g. `bpmn.xml`, `mockup/…`).
Without these, custom shapes (BPMN event/marker icons, AWS glyphs, …) render
as empty boxes; built-in shapes (rect, ellipse, rhombus, swimlane…) always work.
