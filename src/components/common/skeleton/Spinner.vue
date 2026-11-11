<script setup>
// Small loading indicator: a thin ring with an ink arc (rotates via
// transform). `center` gives it room as a section placeholder.
defineProps({
  size: { type: String, default: "20px" },
  label: { type: String, default: "" },
  center: { type: Boolean, default: true },
});
</script>

<template>
  <div
    class="flex items-center gap-2.5 text-ui-muted"
    :class="center ? 'justify-center py-12' : ''"
    role="status"
    :aria-label="label || 'Loading'"
  >
    <svg class="ui-spinner shrink-0" :style="{ width: size, height: size }" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="rgb(var(--ui-line))" stroke-width="2.5" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="rgb(var(--ui-ink))" stroke-width="2.5" stroke-linecap="round" />
    </svg>
    <span v-if="label" class="text-ui-small">{{ label }}</span>
  </div>
</template>

<style scoped>
.ui-spinner {
  animation: ui-spin 0.8s linear infinite;
}
@keyframes ui-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ui-spinner {
    animation-duration: 2.4s !important;
    animation-iteration-count: infinite !important;
  }
}
</style>
