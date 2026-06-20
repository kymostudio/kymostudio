<script setup lang="ts">
// Live demo: kymo's dagre layout runs IN THE BROWSER via the kymo-layout wasm
// package. Toggling the direction re-runs dagre on the spot; the SVG (React-Flow
// look: soft nodes, centered handles, dashed step edges) is drawn from the
// returned positions. No pre-rendered images, no JS layout lib.
import { computed, onMounted, ref } from "vue";

type N = { id: string; label?: string };
type Geom = {
  width: number;
  height: number;
  nodes: { id: string; label: string; x: number; y: number; width: number; height: number }[];
};

// The React-Flow dagre example graph.
const NODES: N[] = [
  { id: "input" }, { id: "node2" }, { id: "node3" },
  { id: "node2a" }, { id: "node2b" }, { id: "node2c" }, { id: "node2d" },
  { id: "node4" }, { id: "node5" },
  { id: "o1", label: "output" }, { id: "o2", label: "output" },
];
const EDGES = [
  ["input", "node2"], ["input", "node3"],
  ["node2", "node2a"], ["node2", "node2b"], ["node2", "node2c"], ["node2c", "node2d"],
  ["node3", "node4"], ["node4", "node5"], ["node5", "o1"], ["node5", "o2"],
].map(([source, target]) => ({ source, target }));

const dir = ref<"vertical" | "horizontal">("vertical");
const geom = ref<Geom | null>(null);
const ready = ref(false);
let dagreLayout: ((s: string) => string) | null = null;

function relayout() {
  if (!dagreLayout) return;
  const direction = dir.value === "vertical" ? "TB" : "LR";
  geom.value = JSON.parse(
    dagreLayout(JSON.stringify({
      direction,
      nodes: NODES.map((n) => ({ id: n.id, label: n.label ?? n.id })),
      edges: EDGES,
    })),
  );
}
function setDir(d: "vertical" | "horizontal") {
  dir.value = d;
  relayout();
}

onMounted(async () => {
  // wasm is client-only; import + init after mount so SSR build never touches it.
  const mod: any = await import("kymo-layout");
  const wasmUrl = (await import("kymo-layout/kymo_layout_bg.wasm?url")).default;
  await mod.default(wasmUrl);
  dagreLayout = mod.dagreLayout;
  ready.value = true;
  relayout();
});

// React-Flow drawing model: nodes + centered handles + dashed step edges.
const view = computed(() => {
  const g = geom.value;
  if (!g) return null;
  const by: Record<string, Geom["nodes"][number]> = {};
  for (const n of g.nodes) by[n.id] = n;
  const lr = dir.value === "horizontal";
  const srcPt = (n: any): [number, number] =>
    lr ? [n.x + n.width, n.y + n.height / 2] : [n.x + n.width / 2, n.y + n.height];
  const dstPt = (n: any): [number, number] =>
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
  return { w: g.width, h: g.height, nodes: g.nodes, edges, handles: [...handles.values()] };
});
</script>

<template>
  <div class="dagre-demo">
    <div class="dd-toolbar">
      <button class="dd-pill" :class="{ active: dir === 'vertical' }" @click="setDir('vertical')">
        vertical layout
      </button>
      <button class="dd-pill" :class="{ active: dir === 'horizontal' }" @click="setDir('horizontal')">
        horizontal layout
      </button>
      <span class="dd-credit">{{ ready ? "live — kymo-layout wasm" : "loading wasm…" }}</span>
    </div>
    <div class="dd-canvas">
      <svg
        v-if="view"
        class="dd-stage"
        :viewBox="`0 0 ${view.w} ${view.h}`"
        :style="{ maxWidth: view.w + 'px' }"
      >
        <defs>
          <filter id="rf-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#22222a" flood-opacity="0.12" />
          </filter>
        </defs>
        <path
          v-for="(e, i) in view.edges"
          :key="`e${i}`"
          class="rf-edge"
          :d="e.d"
          fill="none"
          stroke="#b1b1b7"
          stroke-width="1.5"
          stroke-dasharray="5 4"
          stroke-linejoin="round"
        />
        <g v-for="n in view.nodes" :key="n.id">
          <rect
            :x="n.x" :y="n.y" :width="n.width" :height="n.height"
            rx="7" fill="#fff" stroke="#e2e2e7" stroke-width="1" filter="url(#rf-shadow)"
          />
          <text
            :x="n.x + n.width / 2" :y="n.y + n.height / 2"
            text-anchor="middle" dominant-baseline="central" font-size="14" fill="#1a192b"
          >{{ n.label }}</text>
        </g>
        <circle
          v-for="(h, i) in view.handles" :key="`h${i}`"
          :cx="h[0]" :cy="h[1]" r="2.5" fill="#fff" stroke="#bbb" stroke-width="1"
        />
      </svg>
      <div v-else class="dd-loading">loading kymo-layout wasm…</div>
    </div>
  </div>
</template>

<style scoped>
.dagre-demo {
  margin: 20px 0 28px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: #fafafb;
}
.dd-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.dd-pill {
  padding: 7px 16px;
  border-radius: 999px;
  border: 1.5px solid var(--vp-c-brand-1, #e0095f);
  color: var(--vp-c-brand-1, #e0095f);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.dd-pill:hover {
  background: rgba(224, 9, 95, 0.08);
}
.dd-pill.active {
  background: var(--vp-c-brand-1, #e0095f);
  color: #fff;
}
.dd-credit {
  margin-left: auto;
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.dd-canvas {
  background:
    radial-gradient(circle, rgba(36, 33, 49, 0.14) 1px, transparent 1px) 0 0 / 20px 20px,
    #f7f8fa;
  padding: 28px 20px;
  overflow-x: auto;
  min-height: 120px;
}
.dd-stage {
  display: block;
  margin: 0 auto;
  height: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.dd-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}
/* March the dashes from source → target, React-Flow's animated edge. */
.dd-stage .rf-edge {
  animation: rf-flow 0.5s linear infinite;
}
@keyframes rf-flow {
  to {
    stroke-dashoffset: -9;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dd-stage .rf-edge {
    animation: none;
  }
}
</style>
