<script setup>
// Thin progress bar at the top while a route (and its lazy chunk) loads.
// Appears only when navigation takes longer than 150ms, so fast moves
// never flicker. Animates with transform (scaleX) only.
import { onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const visible = ref(false);
const scale = ref(0);
const duration = ref("0ms");
let showTimer = null;
let hideTimer = null;

const start = () => {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  showTimer = setTimeout(() => {
    duration.value = "0ms";
    scale.value = 0;
    visible.value = true;
    // Next frame: trickle towards 85% while we wait.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        duration.value = "6000ms";
        scale.value = 0.85;
      })
    );
  }, 150);
};

const done = () => {
  clearTimeout(showTimer);
  if (!visible.value) return;
  duration.value = "200ms";
  scale.value = 1;
  hideTimer = setTimeout(() => (visible.value = false), 260);
};

const removeBefore = router.beforeEach(() => {
  start();
});
const removeAfter = router.afterEach(() => done());
const removeError = router.onError(() => done());

onBeforeUnmount(() => {
  removeBefore();
  removeAfter();
  removeError();
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
});
</script>

<template>
  <Transition name="ui-fade">
    <div v-if="visible" class="fixed top-0 inset-x-0 z-[130] h-[2px] pointer-events-none" role="progressbar" :aria-label="$t('common.a11y.loadingPage')">
      <div
        class="h-full bg-ui-accent origin-left"
        :style="{ transform: `scaleX(${scale})`, transition: `transform ${duration} cubic-bezier(0.2, 0, 0, 1)` }"
      ></div>
    </div>
  </Transition>
</template>
