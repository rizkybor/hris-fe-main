<script setup>
// Appearance toggle: a tab hugging the right screen edge, narrow at rest so
// it doesn't get in the way (on phones especially), in the opposite colours
// of the page so it always stands out, showing the icon of the mode a tap
// switches to. A tap switches straight to the next mode (Light → Dark →
// System → Light) and slides the tab further out with the new mode's name;
// after a short pause it tucks back in. Hover or keyboard focus also brings
// it out on desktop. Press and drag (or ↑/↓ when focused) moves it up and
// down the edge; the spot is remembered per browser. By default it sits in
// the bottom-right corner, above the tab bar on phones.
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Sun, Moon, Monitor } from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";

defineProps({ docked: { type: Boolean, default: true } }); // docked: phones have the tab bar below
const { t } = useI18n();
const { mode, setMode } = useTheme();

const ORDER = ["light", "dark", "system"];
const ICONS = { light: Sun, dark: Moon, system: Monitor };
const current = computed(() => (ORDER.includes(mode.value) ? mode.value : "system"));
const currentLabel = computed(() => t(`common.appearance.${current.value}`));
// The tab shows what a tap will switch to, not the mode already on screen.
const next = computed(() => ORDER[(ORDER.indexOf(current.value) + 1) % ORDER.length]);
const nextLabel = computed(() => t(`common.appearance.${next.value}`));
const actionLabel = computed(() => t("common.appearance.switchTo", { mode: nextLabel.value }));

const HIDE_AFTER_MS = 1800;
const open = ref(false); // slid out (after a tap)
const showLabel = ref(false);
let hideTimer = 0;

const scheduleHide = () => {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    open.value = false;
    showLabel.value = false;
  }, HIDE_AFTER_MS);
};

const cycle = () => {
  setMode(next.value);
  open.value = true;
  showLabel.value = true;
  scheduleHide();
};

// ---- Moving it up and down the edge ----
const STORAGE_KEY = "hris-theme-toggle-bottom";
const DRAG_THRESHOLD = 6;
const root = ref(null);
const bottom = ref(null); // px from the viewport bottom; null = default spot
const dragging = ref(false);
let minBottom = 0; // the default spot (above the tab bar on phones)
let drag = null;
let suppressClick = false;

// Keep it between the default spot and below the header.
const clamp = (value) => Math.min(Math.max(value, minBottom), Math.max(minBottom, window.innerHeight - 140));
const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(bottom.value)));
  } catch {
    /* storage unavailable: the spot lasts for this visit only */
  }
};
const measureDefault = () => {
  // Measured with the inline position removed, i.e. from the CSS default.
  const keep = bottom.value;
  bottom.value = null;
  root.value.style.bottom = "";
  minBottom = window.innerHeight - root.value.getBoundingClientRect().bottom;
  bottom.value = keep == null ? null : clamp(keep);
};
const onResize = () => root.value && measureDefault();

const onPointerDown = (e) => {
  if (e.button !== 0) return;
  drag = { y: e.clientY, start: bottom.value ?? minBottom, moved: false, id: e.pointerId };
  // Capture right away so a quick swipe that leaves the small tab still
  // reaches us (a tap still ends in a normal click on the tab).
  e.currentTarget.setPointerCapture?.(e.pointerId);
};
const onPointerMove = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = e.clientY - drag.y;
  if (!drag.moved && Math.abs(dy) < DRAG_THRESHOLD) return;
  if (!drag.moved) {
    drag.moved = true;
    dragging.value = true;
  }
  bottom.value = clamp(drag.start - dy);
};
const onPointerUp = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.moved) {
    suppressClick = true; // the click that follows a drag doesn't switch theme
    dragging.value = false;
    save();
  }
  drag = null;
};
const onClick = () => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  cycle();
};
const onKeydown = (e) => {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  e.preventDefault();
  bottom.value = clamp((bottom.value ?? minBottom) + (e.key === "ArrowUp" ? 24 : -24));
  save();
};

onMounted(() => {
  measureDefault();
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) bottom.value = clamp(saved);
  } catch {
    /* no saved spot */
  }
  window.addEventListener("resize", onResize);
});
onBeforeUnmount(() => {
  clearTimeout(hideTimer);
  window.removeEventListener("resize", onResize);
});
</script>

<template>
  <div
    ref="root"
    :class="[docked ? 'bottom-[calc(86px+env(safe-area-inset-bottom))] lg:bottom-5' : 'bottom-4 sm:bottom-5', { 'is-open': open || dragging, 'is-dragging': dragging }]"
    :style="bottom != null ? { bottom: bottom + 'px' } : null"
    class="theme-toggle fixed z-50 right-0 flex items-center gap-2"
  >
    <Transition name="ui-fade">
      <span
        v-if="showLabel"
        class="pointer-events-none px-2.5 h-7 inline-flex items-center rounded-full bg-ui-ink text-white text-ui-cap font-medium shadow-ui-overlay whitespace-nowrap"
        aria-hidden="true"
      >
        {{ currentLabel }}
      </span>
    </Transition>
    <button
      type="button"
      class="theme-toggle__button flex items-center justify-center shadow-ui-overlay"
      :aria-label="`${t('common.appearance.title')}: ${currentLabel}. ${actionLabel}`"
      :title="actionLabel"
      @click="onClick"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <Transition name="theme-icon" mode="out-in">
        <component :is="ICONS[next]" :key="next" class="theme-toggle__icon" />
      </Transition>
    </button>
  </div>
</template>

<style scoped>
/* A tab flush with the right edge (rounded on the left only). Resting it is
   narrow with a small icon; out (after a tap, on hover or keyboard focus) it
   stays on the edge and just slides further out, icon at full size. */
.theme-toggle__button {
  width: 28px;
  height: 48px;
  border-radius: 14px 0 0 14px;
  /* Always the opposite of the page: dark navy with a white icon on the
     light theme, near-white with a dark icon on the dark theme. */
  background: rgb(var(--ui-ink));
  color: rgb(var(--ui-surface));
  /* Dragging it up/down must not scroll the page. */
  touch-action: none;
  transition:
    width 340ms cubic-bezier(0.34, 1.35, 0.64, 1),
    background-color var(--ui-dur-fast) var(--ui-ease-out);
}
.theme-toggle__icon {
  width: 18px;
  height: 18px;
  transform: scale(0.8);
  opacity: 0.75;
  transition: transform 320ms var(--ui-ease-out), opacity 320ms var(--ui-ease-out);
}
.theme-toggle.is-open .theme-toggle__button,
.theme-toggle__button:focus-visible {
  width: 56px;
}
.theme-toggle.is-open .theme-toggle__icon,
.theme-toggle__button:focus-visible .theme-toggle__icon {
  transform: scale(1.1);
  opacity: 1;
}
@media (hover: hover) {
  .theme-toggle__button:hover {
    width: 56px;
  }
  .theme-toggle__button:hover .theme-toggle__icon {
    transform: scale(1.1);
    opacity: 1;
  }
}
.theme-toggle__button:active {
  filter: brightness(0.96);
}
.theme-toggle.is-dragging .theme-toggle__button {
  cursor: grabbing;
  box-shadow: 0 10px 28px rgb(0 0 0 / 0.28);
}

/* Desktop: a larger tab (phones keep the sizes above). */
@media (min-width: 1024px) {
  .theme-toggle__button {
    width: 36px;
    height: 64px;
    border-radius: 18px 0 0 18px;
  }
  .theme-toggle.is-open .theme-toggle__button,
  .theme-toggle__button:focus-visible,
  .theme-toggle__button:hover {
    width: 72px;
  }
  .theme-toggle__icon {
    width: 22px;
    height: 22px;
  }
}

/* Icon swap: the old one turns away, the new one turns in (selectors carry
   enough weight to win over the tab/open icon sizing above). */
.theme-toggle .theme-toggle__button .theme-icon-enter-active,
.theme-toggle .theme-toggle__button .theme-icon-leave-active {
  transition: transform 220ms var(--ui-ease-out), opacity 220ms var(--ui-ease-out);
}
.theme-toggle .theme-toggle__button .theme-icon-enter-from {
  transform: rotate(-90deg) scale(0.6);
  opacity: 0;
}
.theme-toggle .theme-toggle__button .theme-icon-leave-to {
  transform: rotate(90deg) scale(0.6);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle__button,
  .theme-toggle .theme-toggle__button .theme-icon-enter-active,
  .theme-toggle .theme-toggle__button .theme-icon-leave-active {
    transition-duration: 1ms;
  }
}
</style>
