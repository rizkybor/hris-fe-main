<script setup>
// Navy panel behind the auth pages. A static, CSS-only aurora is always
// there (first paint, and the fallback); the moving WebGL aurora with
// drifting motes fades in on top only
// on a desktop-size screen with WebGL, a capable device, no data saver and
// no "reduce motion". The scene is a separate chunk loaded here on demand.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { canAnimate } from "./canAnimate";

const host = ref(null);
const live = ref(false);
let stop = null;
let unmounted = false;

onMounted(async () => {
  if (!canAnimate()) return;
  try {
    const { start } = await import("./authBackdropScene.js");
    if (unmounted || !host.value) return;
    stop = start(host.value, () => (live.value = true));
  } catch {
    // No WebGL after all, or the chunk failed to load: the static field stays.
  }
});

onBeforeUnmount(() => {
  unmounted = true;
  stop?.();
});
</script>

<template>
  <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
    <div class="auth-glow absolute inset-0"></div>
    <div class="auth-aurora absolute inset-0 transition-opacity duration-700" :class="live ? 'opacity-0' : 'opacity-100'"></div>
    <div ref="host" class="absolute inset-0 transition-opacity duration-1000" :class="live ? 'opacity-100' : 'opacity-0'"></div>
  </div>
</template>

<style scoped>
.auth-glow {
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
