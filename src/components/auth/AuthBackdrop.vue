<script setup>
// Navy panel behind the auth pages. A static dot field is always there
// (first paint, and the fallback); the three.js wave fades in on top only
// on a desktop-size screen with WebGL, a capable device, no data saver and
// no "reduce motion". three.js is a separate chunk loaded here on demand.
import { onBeforeUnmount, onMounted, ref } from "vue";

const host = ref(null);
const live = ref(false);
let stop = null;
let unmounted = false;

const canAnimate = () => {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(min-width: 1024px)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if ((navigator.hardwareConcurrency || 4) < 4) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
  if (navigator.connection?.saveData) return false;
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
};

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
    <div class="auth-dots absolute inset-x-0 bottom-0 h-[62%] transition-opacity duration-700" :class="live ? 'opacity-0' : 'opacity-100'"></div>
    <div ref="host" class="absolute inset-0 transition-opacity duration-1000" :class="live ? 'opacity-100' : 'opacity-0'"></div>
  </div>
</template>

<style scoped>
.auth-glow {
  background:
    radial-gradient(60% 50% at 30% 20%, rgb(31 91 216 / 0.28), transparent 70%),
    radial-gradient(50% 40% at 85% 85%, rgb(31 91 216 / 0.18), transparent 70%);
}
.auth-dots {
  background-image: radial-gradient(rgb(169 194 245 / 0.22) 1px, transparent 1.5px);
  background-size: 22px 22px;
  mask-image: linear-gradient(to top, black 20%, transparent);
  -webkit-mask-image: linear-gradient(to top, black 20%, transparent);
}
</style>
