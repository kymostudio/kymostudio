<script setup lang="ts">
// Stripe-quickstart-style layout: prose on the left, a sticky pane on the
// right with a collapsible Preview (rendered diagram of the section in view)
// above the matching source. ExampleMarker children register scroll anchors.
import { computed, onBeforeUnmount, onMounted, provide, ref } from "vue";
import { SETS, editorUrl, type DiagramExample } from "./examples";

const props = defineProps<{ set: keyof typeof SETS }>();
const examples = SETS[props.set];

const activeId = ref(examples[0].id);
const active = computed<DiagramExample>(
  () => examples.find((e) => e.id === activeId.value) ?? examples[0],
);
const previewOpen = ref(true);
const copied = ref(false);

const markers = new Map<string, HTMLElement>();
provide("dq-register", (id: string, el: HTMLElement) => markers.set(id, el));
provide("dq-unregister", (id: string) => markers.delete(id));
provide("dq-active", activeId);
provide("dq-activate", (id: string) => {
  if (examples.some((e) => e.id === id)) activeId.value = id;
});

const lines = computed(() => active.value.code.replace(/\n$/, "").split("\n"));
const hasHl = computed(() => (active.value.hl?.length ?? 0) > 0);
function lineClass(n: number) {
  if (!hasHl.value) return "";
  return active.value.hl!.some(([a, b]) => n >= a && n <= b) ? "hl" : "dim";
}

let onScroll: (() => void) | undefined;
onMounted(() => {
  onScroll = () => {
    // Active example = the last marker that has scrolled above 40% of the
    // viewport; before the first marker is reached, the topmost one wins.
    const cut = window.innerHeight * 0.4;
    let best: string | undefined;
    let bestTop = -Infinity;
    let first: string | undefined;
    let firstTop = Infinity;
    for (const [id, el] of markers) {
      const top = el.getBoundingClientRect().top;
      if (top <= cut && top > bestTop) { bestTop = top; best = id; }
      if (top < firstTop) { firstTop = top; first = id; }
    }
    const next = best ?? first;
    if (next) activeId.value = next;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onBeforeUnmount(() => onScroll && window.removeEventListener("scroll", onScroll));

async function copy() {
  await navigator.clipboard.writeText(active.value.code);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1600);
}
async function openEditor() {
  window.open(await editorUrl(active.value.code), "_blank", "noopener");
}
</script>

<template>
  <div class="dq">
    <div class="dq-main vp-doc"><slot /></div>
    <aside class="dq-pane" aria-label="Live example">
      <div class="dq-sticky">
        <button class="dq-preview-toggle" @click="previewOpen = !previewOpen">
          <span class="dq-chevron" :class="{ open: previewOpen }">▸</span> Preview
          <span class="dq-renderer">{{
            active.renderer === "kymo" ? "rendered by kymo" : "editor preview"
          }}</span>
        </button>
        <div v-show="previewOpen" class="dq-preview">
          <img :src="active.image" :alt="`Rendered ${active.label}`" />
        </div>
        <div class="dq-code">
          <div class="dq-code-head">
            <span class="dq-tab">{{ active.label }}</span>
            <span class="dq-actions">
              <button @click="copy">{{ copied ? "Copied ✓" : "Copy" }}</button>
              <button @click="openEditor">▶ Open in editor</button>
            </span>
          </div>
          <pre class="dq-source"><code><span
            v-for="(line, i) in lines"
            :key="`${active.id}-${i}`"
            class="dq-line"
            :class="lineClass(i + 1)"
          >{{ line + "\n" }}</span></code></pre>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.dq {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 46%);
  gap: 40px;
  max-width: 1376px;
  margin: 0 auto;
  padding: 24px 32px 96px;
}
.dq-main {
  min-width: 0;
}
.dq-pane {
  min-width: 0;
}
.dq-sticky {
  position: sticky;
  top: calc(var(--vp-nav-height) + 20px);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--vp-nav-height) - 40px);
  border-radius: 12px;
  overflow: hidden;
  background: #242131; /* brand navy */
  box-shadow: 0 8px 24px rgba(36, 33, 49, 0.25);
}
.dq-preview-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  color: #ddecee;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-bottom: 1px solid rgba(221, 236, 238, 0.15);
  cursor: pointer;
}
.dq-chevron {
  display: inline-block;
  transition: transform 0.15s ease;
}
.dq-chevron.open {
  transform: rotate(90deg);
}
.dq-renderer {
  margin-left: auto;
  font-weight: 400;
  font-size: 12px;
  color: rgba(221, 236, 238, 0.55);
}
.dq-preview {
  flex: 0 1 auto;
  min-height: 120px;
  max-height: 46%;
  overflow: auto;
  padding: 20px;
  background:
    radial-gradient(circle, rgba(36, 33, 49, 0.06) 1px, transparent 1px) 0 0 / 22px 22px,
    #fafafa;
}
.dq-preview img {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
}
.dq-code {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 160px;
}
.dq-code-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(221, 236, 238, 0.12);
}
.dq-tab {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(224, 9, 95, 0.18);
  color: #ff7ab1;
  font-size: 12.5px;
  font-family: var(--vp-font-family-mono);
}
.dq-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}
.dq-actions button {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(221, 236, 238, 0.25);
  color: #ddecee;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dq-actions button:hover {
  background: rgba(221, 236, 238, 0.12);
}
.dq-source {
  flex: 1 1 0;
  margin: 0;
  padding: 16px 0;
  overflow: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  color: #e8e6f0;
}
.dq-source code {
  white-space: pre;
}
.dq-line {
  display: block;
  padding: 0 16px;
  transition: opacity 0.2s ease, background 0.2s ease;
}
.dq-line.hl {
  background: rgba(224, 9, 95, 0.18);
  box-shadow: inset 3px 0 0 var(--vp-c-brand-1, #e0095f);
}
.dq-line.dim {
  opacity: 0.4;
}

@media (max-width: 1099px) {
  .dq {
    display: block;
    padding: 24px 24px 64px;
  }
  .dq-pane {
    display: none;
  }
}
</style>
