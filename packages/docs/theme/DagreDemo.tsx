import { useEffect, useMemo, useRef, useState } from "react";

// Live demo: kymo's dagre layout runs IN THE BROWSER via the kymo-layout wasm
// package. Toggling the direction re-runs dagre on the spot; the SVG (React-Flow
// look: soft nodes, centered handles, dashed step edges) is drawn from the
// returned positions. No pre-rendered images, no JS layout lib.
type N = { id: string; label?: string };
type GNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type Geom = { width: number; height: number; nodes: GNode[] };

const NODES: N[] = [
  { id: "input" },
  { id: "node2" },
  { id: "node3" },
  { id: "node2a" },
  { id: "node2b" },
  { id: "node2c" },
  { id: "node2d" },
  { id: "node4" },
  { id: "node5" },
  { id: "o1", label: "output" },
  { id: "o2", label: "output" },
];
const EDGES = [
  ["input", "node2"],
  ["input", "node3"],
  ["node2", "node2a"],
  ["node2", "node2b"],
  ["node2", "node2c"],
  ["node2c", "node2d"],
  ["node3", "node4"],
  ["node4", "node5"],
  ["node5", "o1"],
  ["node5", "o2"],
].map(([source, target]) => ({ source, target }));

export function DagreDemo() {
  const [dir, setDir] = useState<"vertical" | "horizontal">("vertical");
  const [geom, setGeom] = useState<Geom | null>(null);
  const [ready, setReady] = useState(false);
  const layoutRef = useRef<((s: string) => string) | null>(null);

  const relayout = (d: "vertical" | "horizontal") => {
    if (!layoutRef.current) return;
    const direction = d === "vertical" ? "TB" : "LR";
    setGeom(
      JSON.parse(
        layoutRef.current(
          JSON.stringify({
            direction,
            nodes: NODES.map((n) => ({ id: n.id, label: n.label ?? n.id })),
            edges: EDGES,
          }),
        ),
      ),
    );
  };

  useEffect(() => {
    // wasm is client-only; import + init after mount so the SSG build never
    // touches it. wasm-bindgen's default init resolves the co-located .wasm via
    // `new URL('…', import.meta.url)`, which Rspack rewrites to an emitted asset.
    let cancelled = false;
    (async () => {
      const mod = (await import("kymo-layout")) as unknown as {
        default: () => Promise<unknown>;
        dagreLayout: (s: string) => string;
      };
      await mod.default();
      if (cancelled) return;
      layoutRef.current = mod.dagreLayout;
      setReady(true);
      relayout("vertical");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = (d: "vertical" | "horizontal") => {
    setDir(d);
    relayout(d);
  };

  // React-Flow drawing model: nodes + centered handles + dashed step edges.
  const view = useMemo(() => {
    const g = geom;
    if (!g) return null;
    const by: Record<string, GNode> = {};
    for (const n of g.nodes) by[n.id] = n;
    const lr = dir === "horizontal";
    const srcPt = (n: GNode): [number, number] =>
      lr
        ? [n.x + n.width, n.y + n.height / 2]
        : [n.x + n.width / 2, n.y + n.height];
    const dstPt = (n: GNode): [number, number] =>
      lr ? [n.x, n.y + n.height / 2] : [n.x + n.width / 2, n.y];
    const step = (s: [number, number], t: [number, number]) => {
      if (lr) {
        const mx = (s[0] + t[0]) / 2;
        return `M${s[0]},${s[1]} L${mx},${s[1]} L${mx},${t[1]} L${t[0]},${t[1]}`;
      }
      const my = (s[1] + t[1]) / 2;
      return `M${s[0]},${s[1]} L${s[0]},${my} L${t[0]},${my} L${t[0]},${t[1]}`;
    };
    const edges: { d: string }[] = [];
    const handles = new Map<string, [number, number]>();
    for (const e of EDGES) {
      const sn = by[e.source];
      const tn = by[e.target];
      if (!sn || !tn) continue;
      const s = srcPt(sn);
      const t = dstPt(tn);
      edges.push({ d: step(s, t) });
      handles.set(`${s[0].toFixed(1)},${s[1].toFixed(1)}`, s);
      handles.set(`${t[0].toFixed(1)},${t[1].toFixed(1)}`, t);
    }
    return {
      w: g.width,
      h: g.height,
      nodes: g.nodes,
      edges,
      handles: [...handles.values()],
    };
  }, [geom, dir]);

  return (
    <div className="dagre-demo">
      <div className="dd-toolbar">
        <button
          className={`dd-pill${dir === "vertical" ? " active" : ""}`}
          onClick={() => choose("vertical")}
        >
          vertical layout
        </button>
        <button
          className={`dd-pill${dir === "horizontal" ? " active" : ""}`}
          onClick={() => choose("horizontal")}
        >
          horizontal layout
        </button>
        <span className="dd-credit">
          {ready ? "live — kymo-layout wasm" : "loading wasm…"}
        </span>
      </div>
      <div className="dd-canvas">
        {view ? (
          <svg
            className="dd-stage"
            viewBox={`0 0 ${view.w} ${view.h}`}
            style={{ maxWidth: `${view.w}px` }}
          >
            <defs>
              <filter
                id="rf-shadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="160%"
              >
                <feDropShadow
                  dx="0"
                  dy="1.5"
                  stdDeviation="2.5"
                  floodColor="#22222a"
                  floodOpacity="0.12"
                />
              </filter>
            </defs>
            {view.edges.map((e, i) => (
              <path
                key={`e${i}`}
                className="rf-edge"
                d={e.d}
                fill="none"
                stroke="#b1b1b7"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                strokeLinejoin="round"
              />
            ))}
            {view.nodes.map((n) => (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.width}
                  height={n.height}
                  rx="7"
                  fill="#fff"
                  stroke="#e2e2e7"
                  strokeWidth="1"
                  filter="url(#rf-shadow)"
                />
                <text
                  x={n.x + n.width / 2}
                  y={n.y + n.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="14"
                  fill="#1a192b"
                >
                  {n.label}
                </text>
              </g>
            ))}
            {view.handles.map((h, i) => (
              <circle
                key={`h${i}`}
                cx={h[0]}
                cy={h[1]}
                r="2.5"
                fill="#fff"
                stroke="#bbb"
                strokeWidth="1"
              />
            ))}
          </svg>
        ) : (
          <div className="dd-loading">loading kymo-layout wasm…</div>
        )}
      </div>
    </div>
  );
}
