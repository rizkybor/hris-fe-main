<script setup>
// One KPI tile: tinted icon square, big number, caption. Renders as a
// button when clickable (e.g. to filter by status); `active` highlights it.
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: null },
  caption: { type: String, default: "" },
  icon: { type: [Object, Function], required: true },
  tone: { type: String, default: "violet" }, // violet | emerald | amber | red | gray
  active: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
});

defineEmits(["select"]);

const TONES = {
  violet: { icon: "bg-violet-50 text-violet-600 ring-violet-100", ring: "border-violet-500 ring-violet-500/15", bar: "bg-violet-500" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", ring: "border-emerald-500 ring-emerald-500/15", bar: "bg-emerald-500" },
  amber: { icon: "bg-amber-50 text-amber-600 ring-amber-100", ring: "border-amber-500 ring-amber-500/15", bar: "bg-amber-500" },
  red: { icon: "bg-red-50 text-red-600 ring-red-100", ring: "border-red-500 ring-red-500/15", bar: "bg-red-500" },
  gray: { icon: "bg-gray-100 text-gray-500 ring-gray-200", ring: "border-gray-400 ring-gray-400/20", bar: "bg-gray-400" },
};

const tone = () => TONES[props.tone] || TONES.violet;
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    :aria-pressed="clickable ? active : undefined"
    @click="clickable && $emit('select')"
    class="relative overflow-hidden flex items-center gap-3.5 p-4 bg-white border rounded-[16px] text-left shadow-sm transition-all duration-200 min-w-0"
    :class="[
      active ? ['ring-4', tone().ring] : 'border-[#DCDEDD]',
      clickable ? 'hover:shadow-md hover:-translate-y-px focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20' : '',
      clickable && !active ? 'hover:border-violet-300' : '',
    ]"
  >
    <span v-if="active" class="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" :class="tone().bar"></span>
    <div class="w-11 h-11 rounded-[12px] ring-1 flex items-center justify-center shrink-0" :class="tone().icon">
      <component :is="icon" class="w-5 h-5" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-xs font-semibold text-brand-light truncate" :title="label">{{ label }}</p>
      <Skeleton v-if="loading" width="56px" height="26px" rounded="6px" class="mt-1" />
      <p v-else class="text-2xl font-bold text-brand-dark leading-tight tabular-nums">{{ value ?? "–" }}</p>
      <p v-if="caption" class="text-[11px] text-brand-light truncate" :title="caption">{{ caption }}</p>
    </div>
  </component>
</template>
