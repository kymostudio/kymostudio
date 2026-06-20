<script setup lang="ts">
// Interactive Dagre demo: the same graph laid out top-down vs left-right by
// kymo's own dagre engine. Both SVGs are pre-rendered by kymo (render_native);
// the buttons just swap which layout direction is shown — the React Flow
// "vertical / horizontal layout" example, rendered by kymo.
import { ref } from "vue";
// ?raw → the SVG file's text, inlined at build time (no runtime fetch).
import tb from "./dagre-demo/tb.svg?raw";
import lr from "./dagre-demo/lr.svg?raw";

const dir = ref<"vertical" | "horizontal">("vertical");
</script>

<template>
  <div class="dagre-demo">
    <div class="dd-toolbar">
      <button
        class="dd-pill"
        :class="{ active: dir === 'vertical' }"
        @click="dir = 'vertical'"
      >
        vertical layout
      </button>
      <button
        class="dd-pill"
        :class="{ active: dir === 'horizontal' }"
        @click="dir = 'horizontal'"
      >
        horizontal layout
      </button>
      <span class="dd-credit">rendered by kymo · dagre</span>
    </div>
    <div class="dd-canvas">
      <div class="dd-stage" v-html="dir === 'vertical' ? tb : lr" />
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
  /* React Flow's dotted canvas. */
  background:
    radial-gradient(circle, rgba(36, 33, 49, 0.14) 1px, transparent 1px) 0 0 /
      20px 20px,
    #f7f8fa;
  padding: 28px 20px;
  overflow-x: auto;
}
.dd-stage {
  display: flex;
  justify-content: center;
}
.dd-stage :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
