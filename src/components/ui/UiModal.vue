<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { X } from "lucide-vue-next";

const open = defineModel("open", { type: Boolean, default: false });
const props = defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm 440 | md 560 | lg 720
  persistent: { type: Boolean, default: false },
  // Stacking: confirm dialogs sit above other modals.
  zIndex: { type: Number, default: 100 },
});
const emit = defineEmits(["close"]);

const WIDTH = { sm: "sm:max-w-[440px]", md: "sm:max-w-[560px]", lg: "sm:max-w-[720px]" };
const panel = ref(null);
let lastFocus = null;

const close = () => {
  open.value = false;
  emit("close");
};
const onKey = (e) => {
  if (e.key === "Escape" && !props.persistent) close();
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
      <div v-if="open" class="fixed inset-0 flex items-end sm:items-center justify-center sm:p-6" :style="{ zIndex }">
        <div class="absolute inset-0 bg-ui-scrim/30" aria-hidden="true" @click="!persistent && close()"></div>
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title || undefined"
          tabindex="-1"
          :class="[
            'ui-dialog relative w-full max-h-[92vh] flex flex-col bg-ui-surface shadow-ui-overlay focus:outline-none',
            'rounded-t-ui-sheet sm:rounded-ui-modal',
            WIDTH[size] || WIDTH.md,
          ]"
        >
          <!-- Grabber: phones only -->
          <div class="sm:hidden w-9 h-[5px] rounded-full bg-ui-line-strong mx-auto mt-2" aria-hidden="true"></div>
          <header v-if="title || $slots.header" :class="['flex items-start gap-3 px-5 sm:px-6 pt-4 sm:pt-5 pb-4', $slots.default ? 'border-b border-ui-line' : '']">
            <slot name="header">
              <div class="flex-1 min-w-0">
                <h2 class="text-ui-h2 text-ui-ink">{{ title }}</h2>
                <p v-if="description" class="text-ui-small text-ui-muted mt-0.5">{{ description }}</p>
              </div>
            </slot>
            <button
              v-if="!persistent"
              type="button"
              class="w-8 h-8 -mr-1.5 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
              :aria-label="$t('common.a11y.close')"
              @click="close"
            >
              <X class="w-[18px] h-[18px]" />
            </button>
          </header>
          <div v-if="$slots.default" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5"><slot /></div>
          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 px-5 sm:px-6 pt-3.5 border-t border-ui-line bg-ui-subtle/60 sm:rounded-b-ui-modal pb-[max(14px,env(safe-area-inset-bottom))]"
          >
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
