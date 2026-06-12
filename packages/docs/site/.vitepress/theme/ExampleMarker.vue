<script setup lang="ts">
// Scroll anchor for DiagramQuickstart: marks where an example's section
// starts. On narrow screens (no sticky pane) it renders the example inline —
// code, "open in editor" link, and the preview image.
import { computed, inject, onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { ALL, editorUrl } from "./examples";

const props = defineProps<{ id: string }>();
const root = ref<HTMLElement>();
const register = inject<(id: string, el: HTMLElement) => void>("dq-register");
const unregister = inject<(id: string) => void>("dq-unregister");

onMounted(() => root.value && register?.(props.id, root.value));
onBeforeUnmount(() => unregister?.(props.id));

const ex = computed(() => ALL[props.id]);
async function openEditor() {
  if (ex.value) window.open(await editorUrl(ex.value.code), "_blank", "noopener");
}
</script>

<template>
  <div ref="root" class="dq-marker">
    <div v-if="ex" class="dq-inline">
      <pre class="dq-inline-code"><code>{{ ex.code }}</code></pre>
      <p class="dq-inline-try">
        <a href="javascript:;" @click.prevent="openEditor">▶ Try it in the editor</a>
      </p>
      <img :src="ex.image" :alt="`Rendered ${ex.label}`" loading="lazy" />
    </div>
  </div>
</template>

<style scoped>
.dq-marker {
  /* zero-height anchor on desktop; the pane shows the example instead */
  min-height: 1px;
}
.dq-inline {
  display: none;
}
@media (max-width: 1099px) {
  .dq-inline {
    display: block;
    margin: 16px 0;
  }
  .dq-inline-code {
    margin: 0 0 8px;
    padding: 16px;
    border-radius: 8px;
    background: #242131;
    color: #e8e6f0;
    overflow-x: auto;
    font-family: var(--vp-font-family-mono);
    font-size: 13px;
    line-height: 1.6;
  }
  .dq-inline-try {
    margin: 8px 0;
    font-size: 14px;
  }
  .dq-inline img {
    display: block;
    max-width: 100%;
    margin: 8px auto 0;
  }
}
</style>
