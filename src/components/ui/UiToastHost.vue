<script setup>
// Renders the toast store: bottom-right on desktop, bottom-centre on
// phones (above the tab bar). Ink background, one line, optional action.
import { storeToRefs } from "pinia";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-vue-next";
import { useToastStore } from "@/stores/toast";

const store = useToastStore();
const { items } = storeToRefs(store);
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const ICON_TONE = { success: "text-[#75E0A7]", error: "text-[#FDA29B]", info: "text-[#84ADFF]" };

const runAction = (toast) => {
  toast.action?.handler?.();
  store.dismiss(toast.id);
};
</script>

<template>
  <div
    class="fixed z-[110] left-4 right-4 bottom-[calc(140px+env(safe-area-inset-bottom))] lg:bottom-[76px] sm:left-auto sm:right-6 sm:w-[380px] flex flex-col gap-2 pointer-events-none"
    aria-live="polite"
    role="status"
  >
    <TransitionGroup name="ui-list">
      <div
        v-for="toast in items"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 bg-ui-ink text-white rounded-[10px] px-4 py-3 shadow-ui-overlay"
      >
        <component :is="ICONS[toast.type] || Info" :class="['w-4 h-4 mt-0.5 shrink-0', ICON_TONE[toast.type] || ICON_TONE.info]" />
        <div class="flex-1 min-w-0">
          <p class="text-ui-small font-medium">{{ toast.title }}</p>
          <p v-if="toast.message" class="text-ui-cap text-white/70 mt-0.5">{{ toast.message }}</p>
        </div>
        <button v-if="toast.action" type="button" class="text-ui-small font-medium text-white/80 hover:text-white" @click="runAction(toast)">
          {{ toast.action.label }}
        </button>
        <button type="button" class="text-white/50 hover:text-white" :aria-label="$t('common.a11y.close')" @click="store.dismiss(toast.id)">
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
