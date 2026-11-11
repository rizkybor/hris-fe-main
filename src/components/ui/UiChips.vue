<script setup>
// Single-select filter chips with optional counts (All 118 · Draft 1 …).
// v-model holds the selected value. Scrolls sideways on narrow screens.
defineProps({
  options: { type: Array, required: true }, // [{ value, label, count? }]
  size: { type: String, default: "md" }, // md | sm
});
const model = defineModel({ type: [String, Number, Boolean, null], default: null });
</script>

<template>
  <div class="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 [scrollbar-width:none]" role="tablist">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="tab"
      :aria-selected="model === opt.value"
      class="ui-press shrink-0 inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap"
      :class="[
        size === 'sm' ? 'h-7 px-2.5 text-ui-cap' : 'h-8 px-3 text-ui-small',
        model === opt.value ? 'bg-ui-ink text-white border-ui-ink' : 'bg-ui-surface text-ui-text border-ui-line hover:bg-ui-hover',
      ]"
      @click="model = opt.value"
    >
      {{ opt.label }}
      <span v-if="opt.count !== undefined && opt.count !== null" class="tabular-nums" :class="model === opt.value ? 'text-white/70' : 'text-ui-faint'">{{ opt.count }}</span>
    </button>
  </div>
</template>
