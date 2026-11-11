<script setup>
// Placeholder block while data loads. The shimmer is a highlight that
// slides across with `transform` (GPU-composited), not an animated
// background-position, so many skeletons on one page stay cheap.
// Static for people who prefer reduced motion.
defineProps({
  width: { type: String, default: "100%" },
  height: { type: String, default: "16px" },
  rounded: { type: String, default: "8px" },
  dark: { type: Boolean, default: false },
});
</script>

<template>
  <span
    class="ui-skeleton block relative overflow-hidden"
    :class="dark ? 'ui-skeleton--dark' : ''"
    :style="{ width, height, borderRadius: rounded }"
    aria-hidden="true"
  ></span>
</template>

<style scoped>
.ui-skeleton {
  background: rgb(var(--ui-subtle));
}
.ui-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.65), transparent);
  animation: ui-skeleton-sweep 1.5s var(--ui-ease-out, ease) infinite;
}
.ui-skeleton--dark {
  background: rgb(255 255 255 / 0.12);
}
.ui-skeleton--dark::after {
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.14), transparent);
}
@keyframes ui-skeleton-sweep {
  to {
    transform: translateX(100%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ui-skeleton::after {
    animation: none;
    display: none;
  }
}
</style>
