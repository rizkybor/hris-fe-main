<script setup>
import { AlertTriangle } from "lucide-vue-next";

// One figure in a recap's totals row.
defineProps({
  label: String,
  value: [String, Number],
  sub: String,
  alert: String,
  icon: [Object, Function],
  iconClass: String,
  valueClass: { type: String, default: "text-brand-dark" },
});
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[12px] p-3 sm:p-4 min-w-0">
    <div class="flex items-center justify-between gap-2">
      <p class="text-brand-light text-xs font-medium truncate">{{ label }}</p>
      <div v-if="icon" class="w-7 h-7 rounded-[8px] hidden sm:flex items-center justify-center shrink-0" :class="iconClass">
        <component :is="icon" class="w-3.5 h-3.5" />
      </div>
    </div>
    <p class="text-base sm:text-xl font-extrabold leading-tight mt-1 truncate" :class="valueClass" :title="String(value)">{{ value }}</p>
    <p v-if="sub" class="text-brand-light text-[11px] mt-1 truncate">{{ sub }}</p>
    <p v-if="alert" class="text-red-600 text-[11px] font-semibold mt-0.5 flex items-center gap-1 truncate">
      <AlertTriangle class="w-3 h-3 shrink-0" />{{ alert }}
    </p>
  </div>
</template>
