<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ChevronLeft, X } from "lucide-vue-next";

const open = defineModel("open", { type: Boolean, default: false });
defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
});
const emit = defineEmits(["close"]);

const panel = ref(null);
const phone = () => typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches;

const close = () => {
  open.value = false;
  emit("close");
};
const onKey = (e) => {
  // Esc closes, unless it's meant for an open select/menu inside.
  if (e.key === "Escape" && !e.defaultPrevented) close();
};

watch(
  open,
  async (isOpen, wasOpen) => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      // Full screen on phones: the page behind shouldn't scroll.
      if (phone()) document.body.style.overflow = "hidden";
      await nextTick();
      panel.value?.focus({ preventScroll: true });
    } else if (wasOpen) {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    }
  },
  { immediate: true }
);
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  if (open.value) document.body.style.overflow = "";
});
</script>

<template>
  <Transition name="task-panel">
    <aside
      v-if="open"
      ref="panel"
      tabindex="-1"
      role="region"
      :aria-label="title"
      class="task-panel fixed inset-0 z-[60] flex flex-col bg-ui-surface focus:outline-none lg:z-auto lg:sticky lg:top-4 lg:inset-auto lg:self-start lg:w-[440px] xl:w-[500px] lg:shrink-0 lg:h-[calc(100vh-96px)] lg:border lg:border-ui-line lg:rounded-ui-card lg:shadow-ui-raised"
    >
      <header class="flex items-start gap-2 px-4 lg:px-5 py-3.5 border-b border-ui-line">
        <button
          type="button"
          class="lg:hidden -ml-1.5 w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover"
          :aria-label="$t('common.actions.back')"
          @click="close"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <slot name="header">
          <div class="flex-1 min-w-0 pt-1">
            <h2 class="text-ui-h2 text-ui-ink break-words">{{ title }}</h2>
            <p v-if="description" class="text-ui-small text-ui-muted mt-0.5">{{ description }}</p>
          </div>
        </slot>
        <button
          type="button"
          class="hidden lg:inline-flex -mr-1.5 w-9 h-9 shrink-0 items-center justify-center rounded-ui-control text-ui-muted hover:text-ui-ink hover:bg-ui-hover"
          :aria-label="$t('common.actions.close')"
          :title="$t('common.actions.close')"
          @click="close"
        >
          <X class="w-5 h-5" />
        </button>
      </header>

      <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain lg:overscroll-auto px-4 lg:px-5 py-4">
        <slot />
      </div>

      <footer v-if="$slots.footer" class="flex items-center justify-end gap-2 px-4 lg:px-5 py-3 border-t border-ui-line bg-ui-surface pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <slot name="footer" />
      </footer>
    </aside>
  </Transition>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .task-panel-enter-active,
  .task-panel-leave-active {
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease-out;
  }
  .task-panel-enter-from,
  .task-panel-leave-to {
    transform: translateX(24px);
    opacity: 0;
  }
}
</style>
