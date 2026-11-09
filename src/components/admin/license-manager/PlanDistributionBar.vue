<script setup>
// Slim stacked bar of licenses per plan (Trial / Professional / Lifetime /
// Organization) in the plan colours, with an optional legend. Legend items
// emit `select` with the plan when `selectable` (used as a plan filter).
import { computed } from "vue";
import { PLAN_OPTIONS, planBarClass } from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  counts: { type: Object, default: () => ({}) },
  legend: { type: Boolean, default: true },
  selectable: { type: Boolean, default: false },
  activePlan: { type: String, default: "" },
  height: { type: Number, default: 8 },
});

defineEmits(["select"]);

const segments = computed(() =>
  PLAN_OPTIONS.map((opt) => ({ ...opt, count: Number(props.counts?.[opt.value] ?? 0) }))
);
const total = computed(() => segments.value.reduce((sum, s) => sum + s.count, 0));
const pct = (count) => (total.value ? (count / total.value) * 100 : 0);
</script>

<template>
  <div class="min-w-0">
    <div
      class="flex w-full overflow-hidden rounded-full bg-gray-100 gap-px"
      :style="{ height: `${height}px` }"
      role="img"
      :aria-label="segments.map((s) => `${s.label}: ${s.count}`).join(', ')"
    >
      <template v-for="s in segments" :key="s.value">
        <div
          v-if="s.count"
          class="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
          :class="[planBarClass(s.value), activePlan && activePlan !== s.value ? 'opacity-30' : '']"
          :style="{ width: `${pct(s.count)}%` }"
          :title="`${s.label}: ${s.count} (${Math.round(pct(s.count))}%)`"
        ></div>
      </template>
    </div>

    <div v-if="legend" class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      <component
        :is="selectable ? 'button' : 'span'"
        v-for="s in segments"
        :key="s.value"
        :type="selectable ? 'button' : undefined"
        @click="selectable && $emit('select', s.value)"
        class="inline-flex items-center gap-1.5 text-xs rounded-md transition-opacity"
        :class="[
          selectable ? 'hover:opacity-100 -mx-1 px-1 py-0.5 hover:bg-gray-50' : '',
          activePlan && activePlan !== s.value ? 'opacity-50' : '',
        ]"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :class="planBarClass(s.value)"></span>
        <span class="text-brand-light">{{ s.label }}</span>
        <span class="font-semibold text-brand-dark tabular-nums">{{ s.count }}</span>
        <span v-if="total" class="text-gray-400 tabular-nums">· {{ Math.round(pct(s.count)) }}%</span>
      </component>
    </div>
  </div>
</template>
