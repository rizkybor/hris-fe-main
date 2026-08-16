<script setup>
defineProps({
  size: { type: String, default: "20px" },
  label: { type: String, default: "" },
  center: { type: Boolean, default: true },
});
</script>

<template>
  <div
    class="flex items-center gap-3 text-gray-500"
    :class="center ? 'justify-center py-12' : ''"
  >
    <span
      class="border-2 border-gray-200 border-t-[#0C51D9] rounded-full animate-spin flex-shrink-0"
      :style="{ width: size, height: size }"
    ></span>
    <span v-if="label" class="text-sm">{{ label }}</span>
  </div>
</template>
