<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  count: { type: Number, default: 4 },
  cols: { type: String, default: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" },
});
</script>

<template>
  <div class="grid gap-4" :class="cols">
    <div
      v-for="i in count"
      :key="i"
      class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5"
    >
      <div class="flex items-center justify-between">
        <div class="flex-1 min-w-0 pr-2">
          <Skeleton width="90px" height="14px" />
          <div class="my-3">
            <Skeleton width="70px" height="28px" />
          </div>
          <Skeleton width="110px" height="12px" />
        </div>
        <Skeleton width="56px" height="56px" rounded="16px" />
      </div>
    </div>
  </div>
</template>
