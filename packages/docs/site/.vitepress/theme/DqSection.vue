<script setup lang="ts">
// Stripe-style step card: wraps one doc section, registers itself for
// scroll-spy, activates on click (highlighting the matching code lines in the
// sticky pane), and renders the example inline on narrow screens.
import { computed, inject, onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { ALL, editorUrl } from "./examples";

const props = defineProps<{ id: string }>();
const root = ref<HTMLElement>();
const register = inject<(id: string, el: HTMLElement) => void>("dq-register");
const unregister = inject<(id: string) => void>("dq-unregister");
const activeId = inject<Ref<string>>("dq-active");
const activate = inject<(id: string) => void>("dq-activate");

onMounted(() => root.value && register?.(props.id, root.value));
onBeforeUnmount(() => unregister?.(props.id));

const isActive = computed(() => activeId?.value === props.id);
const ex = computed(() => ALL[props.id]);

function onClick(event: MouseEvent) {
  // Plain links inside the card keep their behaviour.
  if ((event.target as HTMLElement).closest("a")) return;
  activate?.(props.id);
}
async function openEditor() {
  if (ex.value) window.open(await editorUrl(ex.value.code), "_blank", "noopener");
}
</script>

<template>
  <section ref="root" class="dq-section" :class="{ active: isActive }" @click="onClick">
    <slot />
    <div v-if="ex" class="dq-inline">
      <pre class="dq-inline-code"><code>{{ ex.code }}</code></pre>
      <p class="dq-inline-try">
        <a href="javascript:;" @click.prevent="openEditor">▶ Try it in the editor</a>
      </p>
      <img :src="ex.image" :alt="`Rendered ${ex.label}`" loading="lazy" />
    </div>
  </section>
</template>

<style scoped>
.dq-section {
  position: relative;
  margin: 0 -20px;
  padding: 20px 20px 8px;
  border-left: 4px solid transparent;
  border-bottom: 1px solid var(--vp-c-divider);
  border-radius: 2px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.dq-section.active {
  border-left-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}
.dq-section :deep(h2) {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.dq-inline {
  display: none;
}
@media (max-width: 1099px) {
  .dq-section {
    cursor: auto;
  }
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
