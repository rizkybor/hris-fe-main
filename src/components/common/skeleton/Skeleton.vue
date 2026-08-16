<script setup>
defineProps({
  width: { type: String, default: "100%" },
  height: { type: String, default: "16px" },
  rounded: { type: String, default: "8px" },
  dark: { type: Boolean, default: false },
});
</script>

<template>
  <span
    class="skeleton-shimmer block"
    :class="dark ? 'skeleton-shimmer--dark' : ''"
    :style="{ width, height, borderRadius: rounded }"
  ></span>
</template>

<style scoped>
.skeleton-shimmer {
  background: linear-gradient(90deg, #eef0f2 25%, #f8f9fa 37%, #eef0f2 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}

.skeleton-shimmer--dark {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.12) 25%,
    rgba(255, 255, 255, 0.24) 37%,
    rgba(255, 255, 255, 0.12) 63%
  );
  background-size: 400% 100%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
