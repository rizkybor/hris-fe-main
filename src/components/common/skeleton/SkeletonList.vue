<script setup>
// List placeholder: rows with a leading tile, two lines and actions.
import Skeleton from "./Skeleton.vue";

defineProps({
  rows: { type: Number, default: 4 },
});
</script>

<template>
  <div class="bg-ui-surface border border-ui-line rounded-ui-card divide-y divide-ui-line overflow-hidden" role="status" :aria-label="$t('common.a11y.loading')">
    <div v-for="r in rows" :key="r" class="flex items-center gap-3.5 px-4 py-3.5">
      <Skeleton width="40px" height="40px" rounded="10px" />
      <div class="flex-1 min-w-0 space-y-2">
        <Skeleton width="45%" height="13px" />
        <Skeleton width="30%" height="10px" />
      </div>
      <div class="hidden sm:flex items-center gap-1.5">
        <Skeleton width="32px" height="32px" rounded="8px" />
        <Skeleton width="32px" height="32px" rounded="8px" />
      </div>
    </div>
  </div>
</template>
