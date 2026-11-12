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
  valueClass: { type: String, default: "text-ui-ink" },
});
</script>

<template>
  <div class="bg-ui-surface border border-ui-line rounded-ui-card px-4 py-3.5 min-w-0">
    <div class="flex items-center gap-2 min-w-0">
      <component :is="icon" v-if="icon" class="w-4 h-4 text-ui-faint shrink-0" />
      <p class="text-ui-small text-ui-muted truncate">{{ label }}</p>
    </div>
    <p v-count-up class="text-ui-h2 sm:text-ui-h1 tabular-nums mt-1 truncate" :class="valueClass" :title="String(value)">{{ value }}</p>
    <p v-if="sub" class="text-ui-cap text-ui-muted mt-0.5 truncate">{{ sub }}</p>
    <p v-if="alert" class="text-ui-cap font-medium text-ui-bad mt-0.5 flex items-center gap-1 truncate">
      <AlertTriangle class="w-3 h-3 shrink-0" />{{ alert }}
    </p>
  </div>
</template>
