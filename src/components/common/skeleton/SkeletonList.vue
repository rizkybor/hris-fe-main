<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  rows: { type: Number, default: 4 },
});
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="r in rows"
      :key="r"
      class="flex items-center gap-4 p-4 border border-[#DCDEDD] rounded-[12px]"
    >
      <Skeleton width="56px" height="56px" rounded="12px" />
      <div class="flex-1 min-w-0 space-y-2">
        <Skeleton width="45%" height="16px" />
        <Skeleton width="30%" height="12px" />
      </div>
      <div class="hidden sm:flex items-center gap-2">
        <Skeleton width="36px" height="36px" rounded="10px" />
        <Skeleton width="36px" height="36px" rounded="10px" />
        <Skeleton width="36px" height="36px" rounded="10px" />
      </div>
    </div>
  </div>
</template>
