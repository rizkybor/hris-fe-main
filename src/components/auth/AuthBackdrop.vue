<script setup>
// Panel behind the auth pages. Its sky follows the time of day on the
// visitor's own clock -- Subuh, Pagi, Siang, Sore, Senja, Malam (see
// skyPhase.js). The colours are a plain CSS gradient re-evaluated once a
// minute (the browser eases between them); nothing here runs per frame.
//
// A static, CSS-only aurora is always there (first paint, and the fallback);
// the moving WebGL aurora with drifting motes and the sun fades in on top
// only on a desktop-size screen with WebGL, a capable device, no data saver
// and no "reduce motion". The scene is a separate chunk loaded on demand.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { SunMoon } from "lucide-vue-next";
import { canAnimate } from "./canAnimate";
import { skyAt } from "./skyPhase";

const host = ref(null);
const live = ref(false);
const now = ref(new Date());
let stop = null;
let unmounted = false;
let tick = 0;

// ---- Local preview (development only, not in production builds) ----
// A tab on the right edge cycles through every sky so they can be checked
// without waiting for the time: Auto is the live sky.
const DEV = import.meta.env.DEV;
const at = (h, m) => new Date(2026, 0, 15, h, m); // this device's clock
// Wrapped in DEV so a production build drops the whole list.
const PREVIEWS = DEV ? [
  { label: "Auto (live)" },
  { label: "Subuh", time: at(4, 50) },
  { label: "Pagi", time: at(7, 0) },
  { label: "Siang", time: at(12, 0) },
  { label: "Sore", time: at(16, 15) },
  { label: "Senja", time: at(18, 0) },
  { label: "Malam", time: at(21, 0) },
] : [{ label: "" }];
const previewIndex = ref(0);
const preview = computed(() => (DEV && previewIndex.value ? PREVIEWS[previewIndex.value] : null));
const previewOpen = ref(false);
let previewTimer = 0;
// The tab can be dragged up and down (like the theme switch); a tap that
// wasn't a drag switches the sky. The spot is remembered in this browser.
const PREVIEW_TOP_KEY = "hris-sky-preview-top";
const previewTop = ref(24);
const previewDragging = ref(false);
let previewDrag = null;
let skipClick = false;
const clampTop = (v) => Math.min(Math.max(v, 8), Math.max(8, window.innerHeight - 72));
const saveTop = () => {
  try {
    localStorage.setItem(PREVIEW_TOP_KEY, String(Math.round(previewTop.value)));
  } catch {
    /* storage unavailable */
  }
};
const onPreviewDown = (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  previewDrag = { y: e.clientY, start: previewTop.value, moved: false, id: e.pointerId };
  e.currentTarget.setPointerCapture?.(e.pointerId);
};
const onPreviewMove = (e) => {
  if (!previewDrag || e.pointerId !== previewDrag.id) return;
  const dy = e.clientY - previewDrag.y;
  if (!previewDrag.moved && Math.abs(dy) < 4) return;
  previewDrag.moved = true;
  previewDragging.value = true;
  previewTop.value = clampTop(previewDrag.start + dy);
};
const onPreviewUp = (e) => {
  if (!previewDrag || e.pointerId !== previewDrag.id) return;
  if (previewDrag.moved) {
    skipClick = true;
    previewDragging.value = false;
    saveTop();
  }
  previewDrag = null;
};
const onPreviewKey = (e) => {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  e.preventDefault();
  previewTop.value = clampTop(previewTop.value + (e.key === "ArrowUp" ? -24 : 24));
  saveTop();
};
const onPreviewResize = () => (previewTop.value = clampTop(previewTop.value));
const nextPreview = () => {
  if (skipClick) {
    skipClick = false; // the click that ends a drag doesn't switch the sky
    return;
  }
  previewIndex.value = (previewIndex.value + 1) % PREVIEWS.length;
  previewOpen.value = true;
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => (previewOpen.value = false), 2200);
};

const sky = computed(() => skyAt(preview.value ? preview.value.time : now.value));
const skyStyle = computed(() => ({
  "--sky-top": sky.value.top,
  "--sky-bottom": sky.value.bottom,
  "--sky-glow": String(0.35 + 0.65 * sky.value.glow),
}));

const update = () => (now.value = new Date());
// The scene follows the sky whenever it changes (minute tick or a preview).
watch(sky, (s) => stop?.setSky?.(s));
const onVisible = () => !document.hidden && update();

onMounted(async () => {
  if (DEV) {
    try {
      const saved = Number(localStorage.getItem(PREVIEW_TOP_KEY));
      if (Number.isFinite(saved) && saved > 0) previewTop.value = clampTop(saved);
    } catch {
      /* storage unavailable */
    }
    window.addEventListener("resize", onPreviewResize);
  }
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
  window.clearTimeout(previewTimer);
  window.removeEventListener("resize", onPreviewResize);
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

  <!-- Development only: cycle through every sky (see PREVIEWS). -->
  <div
    v-if="DEV"
    class="sky-preview fixed z-50 right-0 flex items-center gap-2"
    :class="{ 'is-open': previewOpen || previewDragging, 'is-dragging': previewDragging }"
    :style="{ top: previewTop + 'px' }"
  >
    <span class="pointer-events-none px-2.5 h-7 inline-flex items-center rounded-full bg-ui-ink text-white text-ui-cap font-medium shadow-ui-overlay whitespace-nowrap">
      {{ PREVIEWS[previewIndex].label }}
    </span>
    <button
      type="button"
      class="sky-preview__button flex items-center justify-center shadow-ui-overlay"
      :title="`Langit: ${PREVIEWS[previewIndex].label} (klik untuk ganti, geser untuk pindah)`"
      @click="nextPreview"
      @pointerdown="onPreviewDown"
      @pointermove="onPreviewMove"
      @pointerup="onPreviewUp"
      @pointercancel="onPreviewUp"
      @keydown="onPreviewKey"
    >
      <SunMoon class="sky-preview__icon" />
    </button>
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
/* Same edge tab as the theme switch. */
.sky-preview__button {
  width: 36px;
  height: 64px;
  border-radius: 16px 0 0 16px;
  background: rgb(var(--ui-ink));
  color: rgb(var(--ui-surface));
  /* Dragging it up/down must not scroll the page. */
  touch-action: none;
  cursor: grab;
  transition: width 340ms cubic-bezier(0.34, 1.35, 0.64, 1);
}
.sky-preview.is-dragging .sky-preview__button {
  cursor: grabbing;
  box-shadow: 0 10px 28px rgb(0 0 0 / 0.28);
}
.sky-preview__icon {
  width: 20px;
  height: 20px;
}
.sky-preview.is-open .sky-preview__button,
.sky-preview__button:hover,
.sky-preview__button:focus-visible {
  width: 64px;
}
.sky-preview > span {
  opacity: 0;
  transition: opacity 200ms ease-out;
}
.sky-preview.is-open > span,
.sky-preview:hover > span {
  opacity: 1;
}
.auth-aurora {
  background:
    radial-gradient(42% 30% at 78% 22%, rgb(82 184 250 / 0.16), transparent 70%),
    radial-gradient(55% 34% at 70% 78%, rgb(31 91 216 / 0.26), transparent 72%),
    linear-gradient(118deg, transparent 38%, rgb(31 91 216 / 0.14) 52%, transparent 66%);
}
</style>
