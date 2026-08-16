<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  count: { type: Number, default: 6 },
  cols: { type: String, default: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" },
});
</script>

<template>
  <div class="grid gap-6" :class="cols">
    <div
      v-for="i in count"
      :key="i"
      class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 space-y-4"
    >
      <Skeleton width="100%" height="120px" rounded="16px" />
      <Skeleton width="70%" height="18px" />
      <Skeleton width="50%" height="12px" />
      <div class="flex items-center gap-3 pt-2">
        <Skeleton width="32px" height="32px" rounded="9999px" />
        <Skeleton width="40%" height="12px" />
      </div>
      <Skeleton width="100%" height="8px" rounded="9999px" />
    </div>
  </div>
</template>
