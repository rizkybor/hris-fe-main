<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { canAnimate } from "./canAnimate";
import { skyAt } from "./skyPhase";

const host = ref(null);
const live = ref(false);
const now = ref(new Date());
let stop = null;
let unmounted = false;
let tick = 0;

const sky = computed(() => skyAt(now.value));
const skyStyle = computed(() => ({
  "--sky-top": sky.value.top,
  "--sky-bottom": sky.value.bottom,
  "--sky-glow": String(0.35 + 0.65 * sky.value.glow),
}));

const update = () => (now.value = new Date());
// The scene follows the sky whenever it changes (once a minute).
watch(sky, (s) => stop?.setSky?.(s));
const onVisible = () => !document.hidden && update();

onMounted(async () => {
  tick = window.setInterval(update, 60 * 1000);
  document.addEventListener("visibilitychange", onVisible);
  if (!canAnimate()) return;
  try {
    const { start } = await import("./authBackdropScene.js");
    if (unmounted || !host.value) return;
    stop = start(host.value, () => (live.value = true));
    stop.setSky?.(sky.value);
  } catch {
    // No WebGL after all, or the chunk failed to load: the static field stays.
  }
});

onBeforeUnmount(() => {
  unmounted = true;
  window.clearInterval(tick);
  document.removeEventListener("visibilitychange", onVisible);
  // Cleaning up the graphics must never get in the way of leaving the page
  // (in development Vue rethrows errors from this hook mid-navigation).
  try {
    stop?.();
  } catch (error) {
    console.error(error);
  }
});
</script>

<template>
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true" :style="skyStyle" :data-sky-phase="sky.phase">
    <div class="auth-sky absolute inset-0"></div>
    <div class="auth-glow absolute inset-0"></div>
    <div class="auth-aurora absolute inset-0 transition-opacity duration-700" :class="live ? 'opacity-0' : 'opacity-100'"></div>
    <div ref="host" class="absolute inset-0 transition-opacity duration-1000" :class="live ? 'opacity-100' : 'opacity-0'"></div>
  </div>
</template>

<style scoped>
/* Registered so the browser can ease between skies (a gradient alone
   can't transition). */
@property --sky-top {
  syntax: "<color>";
  inherits: true;
  initial-value: rgb(15 27 45);
}
@property --sky-bottom {
  syntax: "<color>";
  inherits: true;
  initial-value: rgb(11 20 36);
}
.auth-sky {
  background: linear-gradient(180deg, var(--sky-top), var(--sky-bottom));
  transition: --sky-top 8s linear, --sky-bottom 8s linear;
}
.auth-glow {
  opacity: var(--sky-glow, 1);
  transition: opacity 8s linear;
  background:
    radial-gradient(60% 50% at 30% 20%, rgb(31 91 216 / 0.28), transparent 70%),
    radial-gradient(50% 40% at 85% 85%, rgb(31 91 216 / 0.18), transparent 70%);
}
.auth-aurora {
  background:
    radial-gradient(42% 30% at 78% 22%, rgb(82 184 250 / 0.16), transparent 70%),
    radial-gradient(55% 34% at 70% 78%, rgb(31 91 216 / 0.26), transparent 72%),
    linear-gradient(118deg, transparent 38%, rgb(31 91 216 / 0.14) 52%, transparent 66%);
}
</style>
