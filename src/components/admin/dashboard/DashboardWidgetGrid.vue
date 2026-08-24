<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { VueDraggableNext } from "vue-draggable-next";
import { GripVertical, RotateCcw, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-vue-next";
import { useDashboardWidgetsStore } from "@/stores/dashboardWidgets";
import { DASHBOARD_WIDGET_REGISTRY } from "@/helpers/dashboardWidgetRegistry";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const store = useDashboardWidgetsStore();
const { widgets, loading, error, saveStatus } = storeToRefs(store);
const alertModal = useAlertModalStore();

onMounted(() => {
  store.fetchWidgets();
});

// macOS/iOS-style widget sizes, on a 6-column base grid so every size
// tiles cleanly with itself: "small" = 2 of 6 columns (three per row),
// "medium" = 3 of 6 (exactly two per row -- a 3-column base would leave a
// stray leftover column and make that impossible), "large" = all 6 (full
// row). Bar width previews the fraction so the picker reads at a glance
// without needing labels.
const SIZE_OPTIONS = [
  { value: "small", label: "Small (1/3 width)", bar: "6px" },
  { value: "medium", label: "Medium (1/2 width)", bar: "11px" },
  { value: "large", label: "Large (full width)", bar: "16px" },
];
const SIZE_UNITS = { small: 2, medium: 3, large: 6 };
const GRID_COLUMNS = 6;

// VueDraggableNext mutates this array directly (splice) on drag; the
// computed setter is what turns that mutation into a persisted order.
// Its v-for must iterate this exact array (not a derived copy) for
// SortableJS's index tracking to work, which is why placement is computed
// as a side effect onto these same objects below rather than as a
// separate mapped array.
const orderedWidgets = computed({
  get: () => widgets.value,
  set: (newOrder) => {
    widgets.value = newOrder;
    store.queueSaveOrder(newOrder.map((w) => w.key));
  },
});

// Left to the browser, CSS Grid auto-placement recomputes from scratch on
// every change -- resizing one widget can visually ripple through ones
// that come after it in ways that are hard to predict/reason about.
// Packing it explicitly here instead means a widget's row/column only
// ever depends on itself and whatever precedes it in `orderedWidgets`:
// resizing widget N can only shift widgets *after* N in the list, and
// widgets before N are provably untouched -- never a surprise jump
// elsewhere. Writes gridRow/gridColumn directly onto the existing widget
// objects (Vue 3's reactivity tracks new properties on an already-reactive
// object) so the values are available to the same elements VueDraggableNext
// is managing above.
watchEffect(() => {
  let cursor = 0;
  let row = 1;

  for (const widget of orderedWidgets.value) {
    const units = SIZE_UNITS[widget.size] || SIZE_UNITS.small;
    if (cursor + units > GRID_COLUMNS) {
      row += 1;
      cursor = 0;
    }
    widget.gridRow = row;
    widget.gridColumn = `${cursor + 1} / span ${units}`;
    cursor += units;
  }
});

// The explicit placement above only makes sense once the grid is actually
// multi-column (lg: and up) -- below that everything stacks in a single
// column, so the inline placement styles are simply not applied there.
const isDesktopGrid = ref(false);
let mediaQuery;
const handleMediaChange = (event) => {
  isDesktopGrid.value = event.matches;
};
onMounted(() => {
  mediaQuery = window.matchMedia("(min-width: 1024px)");
  isDesktopGrid.value = mediaQuery.matches;
  mediaQuery.addEventListener("change", handleMediaChange);
});
onBeforeUnmount(() => {
  mediaQuery?.removeEventListener("change", handleMediaChange);
});

// "saved" is a transient confirmation, not a permanent state -- fades back
// to idle on its own so it doesn't linger as stale reassurance.
watch(saveStatus, (status) => {
  if (status === "saved") {
    setTimeout(() => {
      if (store.saveStatus === "saved") store.saveStatus = "idle";
    }, 2000);
  }
});

const handleResetLayout = async () => {
  if (
    !(await alertModal.confirm("Reset your dashboard back to the default widget order and sizes?", {
      title: "Reset Layout",
      confirmText: "Reset",
      type: "warning",
    }))
  )
    return;
  await store.resetOrder();
};
</script>

<template>
  <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-6 gap-4">
    <Skeleton v-for="i in 6" :key="i" class="lg:col-span-3" width="100%" height="220px" rounded="14px" />
  </div>

  <div v-else-if="error && orderedWidgets.length === 0" class="bg-white border border-[#DCDEDD] rounded-[14px] p-8 text-center">
    <AlertCircle class="w-8 h-8 text-red-400 mx-auto mb-2" />
    <p class="text-sm text-gray-500 mb-3">Couldn't load your dashboard widgets.</p>
    <button
      type="button"
      @click="store.fetchWidgets()"
      class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0C51D9] hover:underline"
    >
      <RefreshCw class="w-3.5 h-3.5" /> Try again
    </button>
  </div>

  <template v-else>
    <div v-if="orderedWidgets.length > 0" class="flex justify-end mb-3">
      <button
        type="button"
        @click="handleResetLayout"
        class="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-[#0C51D9] transition-colors"
        title="Reset dashboard to default widget order and sizes"
      >
        <RotateCcw class="w-3.5 h-3.5" /> Reset Layout
      </button>
    </div>

    <VueDraggableNext
      v-model="orderedWidgets"
      :animation="200"
      handle=".widget-drag-handle"
      ghost-class="widget-drag-ghost"
      class="grid grid-cols-1 lg:grid-cols-6 gap-4"
    >
      <div
        v-for="widget in orderedWidgets"
        :key="widget.key"
        class="relative group"
        :style="isDesktopGrid ? { gridColumn: widget.gridColumn, gridRow: widget.gridRow } : {}"
      >
        <!-- Overlay controls -- float just above the card's own top edge
             (outside its content box) rather than on top of it, so they
             never sit over a widget's own top-right UI (e.g. Project
             Budget's Monthly/Yearly toggle lives in that exact corner).
             `pointer-events-none` while invisible is required, not just
             cosmetic: CSS opacity alone doesn't stop an element from
             capturing clicks, so without it this row would silently
             swallow clicks meant for whatever sits underneath even while
             faded out. Always visible + interactive on touch devices
             (no hover state to fade in from), overlay-styled with a
             shadow so it reads as floating chrome, not embedded content. -->
        <div
          class="absolute -top-3 right-3 z-20 flex items-center gap-1.5 opacity-70 pointer-events-auto sm:opacity-0 sm:pointer-events-none transition-opacity sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto"
        >
          <div class="hidden lg:flex items-center gap-0.5 bg-white/70 backdrop-blur-sm border border-[#DCDEDD]/70 rounded-md shadow-sm hover:bg-white/90 transition-colors p-1">
            <button
              v-for="opt in SIZE_OPTIONS"
              :key="opt.value"
              type="button"
              @click="store.resizeWidget(widget.key, opt.value)"
              :class="['flex items-center justify-center w-5 h-5 rounded transition-colors', widget.size === opt.value ? 'bg-[#0C51D9]' : 'hover:bg-gray-100']"
              :title="opt.label"
            >
              <span
                class="block h-1.5 rounded-sm transition-colors"
                :class="widget.size === opt.value ? 'bg-white' : 'bg-gray-400'"
                :style="{ width: opt.bar }"
              ></span>
            </button>
          </div>
          <div class="widget-drag-handle cursor-grab active:cursor-grabbing bg-white/70 backdrop-blur-sm border border-[#DCDEDD]/70 rounded-md shadow-sm hover:bg-white/90 transition-colors p-1.5" :title="`Drag to reorder: ${DASHBOARD_WIDGET_REGISTRY[widget.key]?.title ?? widget.key}`">
            <GripVertical class="w-4 h-4 text-gray-500" />
          </div>
        </div>
        <component
          :is="DASHBOARD_WIDGET_REGISTRY[widget.key]?.component"
          v-bind="DASHBOARD_WIDGET_REGISTRY[widget.key]?.props"
        />
      </div>
    </VueDraggableNext>

    <div v-if="orderedWidgets.length === 0" class="text-center py-12 text-gray-400 text-sm">
      No widgets available for your role yet.
    </div>
  </template>

  <!-- Save-status pill: unobtrusive confirmation for what's otherwise a
       silent auto-save, without interrupting the user with a dialog. -->
  <Transition name="fade">
    <div
      v-if="saveStatus !== 'idle'"
      class="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] shadow-lg text-sm font-semibold"
      :class="{
        'bg-white border border-[#DCDEDD] text-gray-600': saveStatus === 'saving',
        'bg-white border border-green-200 text-green-700': saveStatus === 'saved',
        'bg-white border border-red-200 text-red-600': saveStatus === 'error',
      }"
    >
      <Loader2 v-if="saveStatus === 'saving'" class="w-4 h-4 animate-spin" />
      <CheckCircle2 v-else-if="saveStatus === 'saved'" class="w-4 h-4" />
      <AlertCircle v-else-if="saveStatus === 'error'" class="w-4 h-4" />
      <span v-if="saveStatus === 'saving'">Saving layout&hellip;</span>
      <span v-else-if="saveStatus === 'saved'">Layout saved</span>
      <span v-else-if="saveStatus === 'error'">Couldn't save layout</span>
      <button
        v-if="saveStatus === 'error'"
        type="button"
        @click="store.queueSaveOrder(orderedWidgets.map((w) => w.key))"
        class="text-red-700 underline ml-1"
      >
        Retry
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.widget-drag-ghost {
  opacity: 0.4;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
