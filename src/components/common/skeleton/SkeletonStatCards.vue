<script setup>
// KPI row placeholder (label, value, caption), like the redesign's KPI cards.
import Skeleton from "./Skeleton.vue";

defineProps({
  count: { type: Number, default: 4 },
  cols: { type: String, default: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" },
});
</script>

<template>
  <div class="grid gap-3 sm:gap-4" :class="cols" role="status" :aria-label="$t('common.a11y.loading')">
    <div v-for="i in count" :key="i" class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-[18px]">
      <Skeleton width="88px" height="12px" />
      <div class="mt-3"><Skeleton width="64px" height="24px" rounded="6px" /></div>
      <div class="mt-2.5"><Skeleton width="120px" height="10px" /></div>
    </div>
  </div>
</template>
