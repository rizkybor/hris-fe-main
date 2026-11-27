<script setup>
// Image viewer in a modal (no new tab): zoom with the buttons, wheel,
// pinch or double-click, drag to pan when zoomed, full screen, and
// prev/next when it holds several images (e.g. before / after).
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, ExternalLink, RotateCcw } from "lucide-vue-next";

const open = defineModel("open", { type: Boolean, default: false });
const index = defineModel("index", { type: Number, default: 0 });
const props = defineProps({
  // [{ url, name?, label? }]
  images: { type: Array, default: () => [] },
});

const MIN = 1;
const MAX = 6;
const STEP = 1.4;

const root = ref(null);
const stage = ref(null);
const view = reactive({ scale: 1, x: 0, y: 0 });
const loading = ref(true);
const failed = ref(false);
const isFullscreen = ref(false);

const current = computed(() => props.images[index.value] || null);
const many = computed(() => props.images.length > 1);
const percent = computed(() => Math.round(view.scale * 100));

const reset = () => Object.assign(view, { scale: 1, x: 0, y: 0 });

// Keep the image from being dragged out of sight.
const clamp = () => {
  const el = stage.value;
  if (!el || view.scale <= 1) return Object.assign(view, { x: 0, y: 0 });
  const maxX = (el.clientWidth * (view.scale - 1)) / 2;
  const maxY = (el.clientHeight * (view.scale - 1)) / 2;
  view.x = Math.max(-maxX, Math.min(maxX, view.x));
  view.y = Math.max(-maxY, Math.min(maxY, view.y));
};

// Zoom around a point of the stage (default: its centre).
const zoomTo = (scale, point = null) => {
  const next = Math.max(MIN, Math.min(MAX, scale));
  const el = stage.value;
  if (el && point) {
    const rect = el.getBoundingClientRect();
    const cx = point.x - rect.left - rect.width / 2;
    const cy = point.y - rect.top - rect.height / 2;
    const ratio = next / view.scale;
    view.x = cx - (cx - view.x) * ratio;
    view.y = cy - (cy - view.y) * ratio;
  }
  view.scale = next;
  clamp();
};
const zoomIn = () => zoomTo(view.scale * STEP);
const zoomOut = () => zoomTo(view.scale / STEP);

const onWheel = (event) => {
  zoomTo(view.scale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), { x: event.clientX, y: event.clientY });
};
const onDoubleClick = (event) => (view.scale > 1 ? reset() : zoomTo(2.5, { x: event.clientX, y: event.clientY }));

// Pointer drag (pan) and two-finger pinch.
const pointers = new Map();
const moving = ref(false); // no easing while a finger/mouse drives it
let pinch = null;
let drag = null;
const onPointerDown = (event) => {
  stage.value?.setPointerCapture?.(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  moving.value = true;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    drag = null;
  } else if (pointers.size === 1) {
    drag = { x: event.clientX - view.x, y: event.clientY - view.y };
  }
};
const onPointerMove = (event) => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    zoomTo(pinch.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  } else if (drag && view.scale > 1) {
    view.x = event.clientX - drag.x;
    view.y = event.clientY - drag.y;
    clamp();
  }
};
const onPointerUp = (event) => {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 0) {
    drag = null;
    moving.value = false;
  }
};

const go = (step) => {
  if (!many.value) return;
  index.value = (index.value + step + props.images.length) % props.images.length;
};

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await root.value?.requestFullscreen?.();
  } catch {
    // Not allowed (e.g. iOS Safari): the viewer already fills the screen.
  }
};
const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
  nextTick(clamp);
};

const close = () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  open.value = false;
};

const onKey = (event) => {
  if (event.key === "Escape" && !document.fullscreenElement) close();
  else if (event.key === "+" || event.key === "=") zoomIn();
  else if (event.key === "-") zoomOut();
  else if (event.key === "0") reset();
  else if (event.key === "ArrowLeft") go(-1);
  else if (event.key === "ArrowRight") go(1);
};

watch(
  open,
  async (isOpen, wasOpen) => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      reset();
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
      document.addEventListener("fullscreenchange", onFullscreenChange);
      await nextTick();
      root.value?.focus();
    } else if (wasOpen) {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    }
  },
  { immediate: true }
);
watch(
  () => current.value?.url,
  () => {
    reset();
    loading.value = true;
    failed.value = false;
  }
);
onBeforeUnmount(() => {
  if (!open.value) return;
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onKey);
  document.removeEventListener("fullscreenchange", onFullscreenChange);
});

const toolButton =
  "inline-flex items-center justify-center w-9 h-9 rounded-ui-control text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40 disabled:hover:bg-transparent";
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div
        v-if="open && current"
        ref="root"
        class="fixed inset-0 z-[120] flex flex-col bg-[#0b0b0d] outline-none select-none"
        role="dialog"
        aria-modal="true"
        :aria-label="current.label || current.name || $t('common.imageViewer.title')"
        tabindex="-1"
      >
        <!-- Toolbar -->
        <div class="flex items-center gap-2 px-3 sm:px-4 h-14 shrink-0 text-white">
          <div class="min-w-0 flex-1">
            <p v-if="current.label" class="text-ui-small font-medium truncate">{{ current.label }}</p>
            <p v-if="current.name" class="text-ui-cap text-white/60 truncate">{{ current.name }}</p>
          </div>
          <span v-if="many" class="hidden sm:inline text-ui-cap text-white/60 tabular-nums">{{ index + 1 }} / {{ images.length }}</span>
          <div class="flex items-center gap-0.5">
            <button type="button" :class="toolButton" :disabled="view.scale <= MIN" :title="$t('common.imageViewer.zoomOut')" :aria-label="$t('common.imageViewer.zoomOut')" @click="zoomOut">
              <ZoomOut class="w-[18px] h-[18px]" />
            </button>
            <button type="button" class="hidden sm:inline-flex items-center justify-center min-w-[52px] h-9 px-1.5 rounded-ui-control text-ui-cap tabular-nums text-white/80 hover:bg-white/10" :title="$t('common.imageViewer.reset')" @click="reset">
              {{ percent }}%
            </button>
            <button type="button" :class="toolButton" :disabled="view.scale >= MAX" :title="$t('common.imageViewer.zoomIn')" :aria-label="$t('common.imageViewer.zoomIn')" @click="zoomIn">
              <ZoomIn class="w-[18px] h-[18px]" />
            </button>
            <button type="button" :class="[toolButton, 'sm:hidden']" :title="$t('common.imageViewer.reset')" :aria-label="$t('common.imageViewer.reset')" @click="reset">
              <RotateCcw class="w-[18px] h-[18px]" />
            </button>
            <span class="w-px h-5 bg-white/20 mx-1" aria-hidden="true"></span>
            <button type="button" :class="toolButton" :title="$t(isFullscreen ? 'common.imageViewer.exitFullscreen' : 'common.imageViewer.fullscreen')" :aria-label="$t(isFullscreen ? 'common.imageViewer.exitFullscreen' : 'common.imageViewer.fullscreen')" @click="toggleFullscreen">
              <component :is="isFullscreen ? Minimize2 : Maximize2" class="w-[18px] h-[18px]" />
            </button>
            <a :href="current.url" target="_blank" rel="noopener" :class="toolButton" :title="$t('common.imageViewer.original')" :aria-label="$t('common.imageViewer.original')">
              <ExternalLink class="w-[18px] h-[18px]" />
            </a>
            <button type="button" :class="toolButton" :title="$t('common.actions.close')" :aria-label="$t('common.actions.close')" @click="close">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Stage: click the dark area to close; the image itself zooms/pans -->
        <div
          ref="stage"
          class="relative flex-1 min-h-0 overflow-hidden touch-none"
          :class="view.scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'"
          @wheel.prevent="onWheel"
          @dblclick="onDoubleClick"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @click.self="view.scale === 1 && close()"
        >
          <img
            :key="current.url"
            :src="current.url"
            :alt="current.label || current.name || ''"
            draggable="false"
            class="absolute inset-0 m-auto max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] object-contain will-change-transform"
            :class="moving ? '' : 'transition-transform duration-150 ease-out'"
            :style="{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }"
            @load="loading = false"
            @error="(loading = false), (failed = true)"
          />
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span class="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
          </div>
          <p v-if="failed" class="absolute inset-0 flex items-center justify-center text-ui-small text-white/70 pointer-events-none">{{ $t("common.imageViewer.failed") }}</p>

          <template v-if="many">
            <button type="button" class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 inline-flex items-center justify-center" :aria-label="$t('common.imageViewer.previous')" @click.stop="go(-1)">
              <ChevronLeft class="w-5 h-5" />
            </button>
            <button type="button" class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 inline-flex items-center justify-center" :aria-label="$t('common.imageViewer.next')" @click.stop="go(1)">
              <ChevronRight class="w-5 h-5" />
            </button>
          </template>
        </div>

        <!-- Several images: their labels as tabs (e.g. Sebelum / Sesudah) -->
        <div v-if="many" class="flex justify-center gap-2 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
          <button
            v-for="(image, i) in images"
            :key="image.url"
            type="button"
            class="h-8 px-3 rounded-full text-ui-cap font-medium transition-colors"
            :class="i === index ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'"
            @click="index = i"
          >
            {{ image.label || `${i + 1}` }}
          </button>
        </div>
        <p class="hidden sm:block text-center text-ui-cap text-white/40 pb-3 shrink-0">{{ $t("common.imageViewer.hint") }}</p>
      </div>
    </Transition>
  </Teleport>
</template>
