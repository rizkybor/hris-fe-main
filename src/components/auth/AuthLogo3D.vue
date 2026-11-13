<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { canAnimate } from "./canAnimate";

const emit = defineEmits(["ready"]);
const host = ref(null);
const live = ref(false);
let stop = null;
let unmounted = false;

onMounted(async () => {
  if (!canAnimate()) {
    emit("ready");
    return;
  }
  try {
    const { start } = await import("./authLogoScene.js");
    if (unmounted || !host.value) return;
    const stopScene = await start(host.value, () => {
      live.value = true;
      emit("ready");
    });
    if (unmounted) stopScene();
    else stop = stopScene;
  } catch {
    // WebGL or the chunk failed: the flat logo stays.
    emit("ready");
  }
});

onBeforeUnmount(() => {
  unmounted = true;
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
  <div class="relative" aria-hidden="true">
    <img
      src="/images/jcd-only-color.png"
      alt=""
      class="absolute inset-0 m-auto w-[62%] h-[62%] object-contain brightness-0 invert transition-opacity duration-700"
      :class="live ? 'opacity-0' : 'opacity-90'"
    />
    <div ref="host" class="absolute inset-0 transition-opacity duration-1000" :class="live ? 'opacity-100' : 'opacity-0'"></div>
  </div>
</template>
