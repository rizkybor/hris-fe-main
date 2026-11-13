<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ChevronDown, ChevronUp, Maximize2, X } from "lucide-vue-next";

const open = defineModel("open", { type: Boolean, default: false });
const props = defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  size: { type: String, default: "md" }, // md 520 | lg 680 | xl 860
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
  // Route location for the full page of this item (optional).
  to: { type: [String, Object], default: null },
  zIndex: { type: Number, default: 90 },
});
const emit = defineEmits(["close", "prev", "next"]);

const WIDTH = { md: "sm:w-[520px]", lg: "sm:w-[680px]", xl: "sm:w-[860px]" };
const panel = ref(null);
let lastFocus = null;

const close = () => {
  open.value = false;
  emit("close");
};
const typing = (el) => el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
const onKey = (e) => {
  if (e.key === "Escape") {
    // A modal/confirm opened from inside the drawer handles its own Esc.
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    close();
    return;
  }
  if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.key === "j" || e.key === "ArrowDown") && props.hasNext && panel.value?.contains(document.activeElement)) {
    e.preventDefault();
    emit("next");
  } else if ((e.key === "k" || e.key === "ArrowUp") && props.hasPrev && panel.value?.contains(document.activeElement)) {
    e.preventDefault();
    emit("prev");
  }
};

watch(
  open,
  async (isOpen, wasOpen) => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      lastFocus = document.activeElement;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
      await nextTick();
      panel.value?.focus();
    } else if (wasOpen) {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      lastFocus?.focus?.();
    }
  },
  { immediate: true }
);
onBeforeUnmount(() => {
  if (open.value) document.body.style.overflow = "";
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="open" class="fixed inset-0 flex items-end sm:items-stretch sm:justify-end" :style="{ zIndex }">
        <div class="absolute inset-0 bg-ui-scrim/25" aria-hidden="true" @click="close"></div>
        <aside
          ref="panel"
          role="dialog"
          :aria-label="title || undefined"
          tabindex="-1"
          :class="[
            'ui-drawer relative w-full max-h-[92vh] sm:max-h-none sm:h-full flex flex-col bg-ui-surface shadow-ui-overlay focus:outline-none',
            'rounded-t-ui-sheet sm:rounded-none sm:border-l sm:border-ui-line',
            WIDTH[size] || WIDTH.md,
          ]"
        >
          <div class="sm:hidden w-9 h-[5px] rounded-full bg-ui-line-strong mx-auto mt-2" aria-hidden="true"></div>
          <header class="flex items-start gap-2 px-5 sm:px-6 pt-4 pb-3.5 border-b border-ui-line">
            <div class="flex-1 min-w-0">
              <slot name="header">
                <h2 class="text-ui-h2 text-ui-ink break-words">{{ title }}</h2>
                <p v-if="description" class="text-ui-small text-ui-muted mt-0.5">{{ description }}</p>
              </slot>
            </div>
            <div class="flex items-center gap-0.5 -mr-1.5 shrink-0">
              <template v-if="hasPrev || hasNext">
                <button
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-40 disabled:pointer-events-none"
                  :disabled="!hasPrev"
                  :title="$t('common.a11y.previousItem')"
                  :aria-label="$t('common.a11y.previousItem')"
                  @click="emit('prev')"
                >
                  <ChevronUp class="w-[18px] h-[18px]" />
                </button>
                <button
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-40 disabled:pointer-events-none"
                  :disabled="!hasNext"
                  :title="$t('common.a11y.nextItem')"
                  :aria-label="$t('common.a11y.nextItem')"
                  @click="emit('next')"
                >
                  <ChevronDown class="w-[18px] h-[18px]" />
                </button>
              </template>
              <RouterLink
                v-if="to"
                :to="to"
                class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
                :title="$t('common.a11y.openFullPage')"
                :aria-label="$t('common.a11y.openFullPage')"
              >
                <Maximize2 class="w-4 h-4" />
              </RouterLink>
              <button
                type="button"
                class="w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
                :aria-label="$t('common.a11y.close')"
                @click="close"
              >
                <X class="w-[18px] h-[18px]" />
              </button>
            </div>
          </header>
          <div class="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5"><slot /></div>
          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 px-5 sm:px-6 pt-3.5 border-t border-ui-line bg-ui-subtle/60 pb-[max(14px,env(safe-area-inset-bottom))]"
          >
            <slot name="footer" :close="close" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>
