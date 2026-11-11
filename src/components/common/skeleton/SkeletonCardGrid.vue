<script setup>
// Card grid placeholder: avatar + title, a progress line and a footer.
import Skeleton from "./Skeleton.vue";

defineProps({
  count: { type: Number, default: 6 },
  cols: { type: String, default: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" },
});
</script>

<template>
  <div class="grid gap-4 sm:gap-5" :class="cols" role="status" :aria-label="$t('common.a11y.loading')">
    <div v-for="i in count" :key="i" class="bg-ui-surface border border-ui-line rounded-ui-card p-[18px] space-y-4">
      <div class="flex items-center gap-3">
        <Skeleton width="40px" height="40px" rounded="10px" />
        <div class="flex-1 space-y-2">
          <Skeleton width="60%" height="13px" />
          <Skeleton width="40%" height="10px" />
        </div>
      </div>
      <Skeleton width="100%" height="4px" rounded="9999px" />
      <div class="flex items-center gap-2 pt-1">
        <Skeleton width="24px" height="24px" rounded="9999px" />
        <Skeleton width="24px" height="24px" rounded="9999px" />
        <div class="flex-1"></div>
        <Skeleton width="64px" height="10px" />
      </div>
    </div>
  </div>
</template>
