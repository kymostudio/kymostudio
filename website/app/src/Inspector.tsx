/**
 * Phase 2 — a small read-only panel that shows the kymo model behind the
 * selected canvas shape (a `meta.kymo`-tagged shape). Rendered inside the
 * <Tldraw> context so it can use `useEditor` + `useValue`.
 */
import { useEditor, useValue } from "./engine/adapter";

interface KymoMeta {
  id?: string;
  kind: "node" | "region" | "edge";
  src?: string;
  dst?: string;
}

export function Inspector() {
  const editor = useEditor();
  const info = useValue(
    "kymo-selection",
    () => {
      const s = editor.getOnlySelectedShape();
      const kymo = s?.meta?.kymo as KymoMeta | undefined;
      if (!s || !kymo) return null;
      return { kymo, type: s.type, x: Math.round(s.x), y: Math.round(s.y) };
    },
    [editor],
  );

  if (!info) return null;
  const { kymo, type, x, y } = info;

  const rows: Array<[string, string]> = [
    ["kind", kymo.kind],
    ...(kymo.id ? [["id", kymo.id] as [string, string]] : []),
    ...(kymo.src ? [["src → dst", `${kymo.src} → ${kymo.dst}`] as [string, string]] : []),
    ["shape", type],
    ["x, y", `${x}, ${y}`],
  ];

  return (
    <div
      style={{
        position: "absolute", right: 12, bottom: 76, zIndex: 300,
        minWidth: 180, padding: "10px 12px", borderRadius: 12,
        background: "rgba(255,255,255,0.96)", boxShadow: "0 8px 28px rgba(20,23,28,.16), 0 0 0 1px rgba(20,23,28,.05)",
        font: "12px Inter, ui-sans-serif, system-ui", color: "#1b1d21", pointerEvents: "none",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#6b7280", textTransform: "uppercase", fontSize: 10, letterSpacing: ".04em" }}>
        kymo element
      </div>
      <table style={{ borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ color: "#6b7280", paddingRight: 10, verticalAlign: "top" }}>{k}</td>
              <td style={{ fontWeight: 600, fontFamily: "ui-monospace, monospace" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
