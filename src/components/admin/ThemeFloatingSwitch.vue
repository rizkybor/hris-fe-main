<script setup>
// Appearance switch floating in the bottom-right corner: Light / Dark /
// System as three icon buttons. On phones it sits above the tab bar.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Sun, Moon, Monitor } from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";

defineProps({ docked: { type: Boolean, default: true } }); // docked: phones have the tab bar below
const { t } = useI18n();
const { mode, setMode } = useTheme();
const OPTIONS = computed(() => [
  { value: "light", label: t("common.appearance.light"), icon: Sun },
  { value: "dark", label: t("common.appearance.dark"), icon: Moon },
  { value: "system", label: t("common.appearance.system"), icon: Monitor },
]);
</script>

<template>
  <div
    :class="docked ? 'bottom-[calc(86px+env(safe-area-inset-bottom))] lg:bottom-5' : 'bottom-4 sm:bottom-5'"
    class="fixed z-50 right-3 sm:right-5 flex items-center gap-0.5 p-1 rounded-full bg-ui-surface/90 backdrop-blur-md border border-ui-line shadow-ui-overlay"
    role="radiogroup"
    :aria-label="t('common.appearance.title')"
  >
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="mode === opt.value"
      :aria-label="opt.label"
      :title="opt.label"
      class="ui-press w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-ui-fast"
      :class="mode === opt.value ? 'bg-ui-ink text-white' : 'text-ui-muted hover:text-ui-ink hover:bg-ui-hover'"
      @click="setMode(opt.value)"
    >
      <component :is="opt.icon" class="w-4 h-4" />
    </button>
  </div>
</template>
