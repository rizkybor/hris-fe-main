<script setup lang="ts">
// Full-screen "please wait" (sign in, password reset): a light scrim with a
// small blur and a card with the logo inside a slim progress ring. Only
// transform/opacity animate; the blur is kept small because large blurs
// are expensive to paint.
withDefaults(defineProps<{ show: boolean; text?: string }>(), {
  text: "", // default: common.states.pleaseWait
});
</script>

<template>
  <!-- Teleported so it always covers the viewport, wherever it is used. -->
  <Teleport to="body">
  <Transition name="ui-fade">
    <div v-if="show" class="fixed inset-0 z-[120] flex items-center justify-center font-sans" role="status" aria-live="polite">
      <div class="absolute inset-0 bg-ui-bg/80 backdrop-blur-[6px]"></div>

      <div class="ui-anim-scale relative flex flex-col items-center gap-4 bg-ui-surface border border-ui-line rounded-ui-modal shadow-ui-overlay px-10 py-8">
        <div class="relative w-16 h-16 flex items-center justify-center">
          <svg class="loading-ring absolute inset-0 w-16 h-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="29" stroke="rgb(var(--ui-line))" stroke-width="2" />
            <path d="M61 32A29 29 0 0 0 32 3" stroke="rgb(var(--ui-accent))" stroke-width="2" stroke-linecap="round" />
          </svg>
          <div class="w-11 h-11 rounded-[12px] bg-ui-surface border border-ui-line flex items-center justify-center">
            <img src="/images/jcd-only-color.png" alt="" class="w-8 h-8 object-contain" />
          </div>
        </div>
        <div class="text-center">
          <p class="text-ui-small font-medium text-ui-ink">{{ text || $t("common.states.pleaseWait") }}</p>
          <p class="text-ui-cap text-ui-muted mt-0.5">PT Jendela Cakra Digital</p>
        </div>
      </div>
    </div>
  </Transition>
  </Teleport>
</template>

<style scoped>
.loading-ring {
  animation: loading-ring-spin 1s linear infinite;
}
@keyframes loading-ring-spin {
  to {
    transform: rotate(360deg);
  }
}
/* A loading indicator is essential motion: keep it, just slower. */
@media (prefers-reduced-motion: reduce) {
  .loading-ring {
    animation-duration: 3s !important;
    animation-iteration-count: infinite !important;
  }
}
</style>
