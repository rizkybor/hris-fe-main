<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { VueDraggableNext } from "vue-draggable-next";
import { GripVertical, RotateCcw, CheckCircle2, AlertCircle, RefreshCw, LayoutGrid } from "lucide-vue-next";
import { useDashboardWidgetsStore } from "@/stores/dashboardWidgets";
import { DASHBOARD_WIDGET_REGISTRY } from "@/helpers/dashboardWidgetRegistry";
import { useAlertModalStore } from "@/stores/alertModal";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import Spinner from "@/components/common/skeleton/Spinner.vue";
import { UiButton, UiEmpty } from "@/components/ui";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const store = useDashboardWidgetsStore();
const { widgets, loading, error, saveStatus } = storeToRefs(store);
const alertModal = useAlertModalStore();

onMounted(() => {
  store.fetchWidgets();
});

// Layout edit mode (drag handles + size pickers); view-only otherwise.
const editing = ref(false);

// macOS/iOS-style widget sizes, on a 6-column base grid so every size
// tiles cleanly with itself: "small" = 2 of 6 columns (three per row),
// "medium" = 3 of 6 (exactly two per row -- a 3-column base would leave a
// stray leftover column and make that impossible), "large" = all 6 (full
// row). Bar width previews the fraction so the picker reads at a glance
// without needing labels.
const SIZE_OPTIONS = computed(() => [
  { value: "small", label: t("dashboard.layout.sizes.small"), bar: "6px" },
  { value: "medium", label: t("dashboard.layout.sizes.medium"), bar: "11px" },
  { value: "large", label: t("dashboard.layout.sizes.large"), bar: "16px" },
]);
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
  store.flushPendingSave(orderedWidgets.value.map((w) => w.key));
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

const widgetTitle = (key) => {
  const titleKey = DASHBOARD_WIDGET_REGISTRY[key]?.titleKey;
  return titleKey ? t(titleKey) : key;
};

const handleResetLayout = async () => {
  if (
    !(await alertModal.confirm(t("dashboard.layout.resetConfirm"), {
      title: t("dashboard.layout.resetTitle"),
      confirmText: t("dashboard.layout.reset"),
      type: "warning",
    }))
  )
    return;
  await store.resetOrder();
};
</script>

<template>
  <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-6 gap-4">
    <Skeleton v-for="i in 6" :key="i" class="lg:col-span-3" width="100%" height="220px" rounded="12px" />
  </div>

  <div v-else-if="error && orderedWidgets.length === 0" class="bg-ui-surface border border-ui-line rounded-ui-card">
    <UiEmpty :icon="AlertCircle" :title="$t('dashboard.layout.loadError')" :message="$t('common.states.loadErrorHint')">
      <UiButton variant="secondary" size="sm" :icon="RefreshCw" @click="store.fetchWidgets()">{{ $t("common.actions.retry") }}</UiButton>
    </UiEmpty>
  </div>

  <template v-else>
    <!-- Layout editing: off by default so the dashboard stays calm; Customize
         turns on drag handles and size pickers. Changes still auto-save. -->
    <Transition name="ui-fade" mode="out-in">
      <div v-if="editing" key="editing" class="sticky top-0 z-30 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-ui-card bg-ui-ink text-white px-4 py-2.5 shadow-ui-raised">
        <LayoutGrid class="w-4 h-4 text-white/60 shrink-0" />
        <p class="text-ui-small font-medium">{{ $t("dashboard.layout.editing") }}</p>
        <p class="hidden md:block text-ui-small text-white/60 flex-1 min-w-0 truncate">{{ $t("dashboard.layout.editingHint") }}</p>
        <div class="flex items-center gap-2 ml-auto">
          <button type="button" class="h-8 px-3 rounded-ui-control text-ui-small font-medium bg-white/10 hover:bg-white/15 inline-flex items-center gap-1.5" @click="handleResetLayout">
            <RotateCcw class="w-3.5 h-3.5" /> {{ $t("dashboard.layout.reset") }}
          </button>
          <button type="button" class="h-8 px-3.5 rounded-ui-control text-ui-small font-medium bg-white text-ui-ink-fill hover:bg-white/90" @click="editing = false">{{ $t("common.actions.done") }}</button>
        </div>
      </div>
      <div v-else-if="orderedWidgets.length > 0" key="idle" class="flex justify-end -mt-1 mb-2">
        <UiButton variant="ghost" size="sm" :icon="LayoutGrid" @click="editing = true">{{ $t("common.actions.customize") }}</UiButton>
      </div>
    </Transition>

    <VueDraggableNext
      v-model="orderedWidgets"
      :animation="200"
      :disabled="!editing"
      handle=".widget-drag-handle"
      ghost-class="widget-drag-ghost"
      :class="['grid grid-cols-1 lg:grid-cols-6 gap-4', editing ? 'gap-y-8 pt-3' : '']"
    >
      <div
        v-for="widget in orderedWidgets"
        :key="widget.key"
        class="relative min-w-0 rounded-ui-card"
        :class="editing ? 'outline-dashed outline-1 outline-offset-4 outline-ui-line-strong' : ''"
        :style="isDesktopGrid ? { gridColumn: widget.gridColumn, gridRow: widget.gridRow } : {}"
      >
        <!-- Edit controls float on the card's top edge so they never cover
             the widget's own header actions. -->
        <div v-if="editing" class="absolute -top-[22px] right-3 z-20 flex items-center gap-1.5 ui-anim-fade">
          <div class="hidden lg:flex items-center gap-0.5 bg-ui-surface border border-ui-line rounded-ui-control shadow-ui-raised p-1" role="group" :aria-label="$t('dashboard.layout.sizeOf', { name: widgetTitle(widget.key) })">
            <button
              v-for="opt in SIZE_OPTIONS"
              :key="opt.value"
              type="button"
              @click="store.resizeWidget(widget.key, opt.value)"
              :class="['flex items-center justify-center w-6 h-6 rounded-md transition-colors', widget.size === opt.value ? 'bg-ui-ink' : 'hover:bg-ui-hover']"
              :title="opt.label"
              :aria-pressed="widget.size === opt.value"
            >
              <span class="block h-1.5 rounded-sm" :class="widget.size === opt.value ? 'bg-white' : 'bg-ui-faint'" :style="{ width: opt.bar }"></span>
            </button>
          </div>
          <div
            class="widget-drag-handle cursor-grab active:cursor-grabbing bg-ui-surface border border-ui-line rounded-ui-control shadow-ui-raised p-1.5 text-ui-muted hover:text-ui-ink"
            :title="$t('dashboard.layout.dragToReorder', { name: widgetTitle(widget.key) })"
          >
            <GripVertical class="w-4 h-4" />
          </div>
        </div>
        <component :is="DASHBOARD_WIDGET_REGISTRY[widget.key]?.component" v-bind="DASHBOARD_WIDGET_REGISTRY[widget.key]?.props" />
      </div>
    </VueDraggableNext>

    <div v-if="orderedWidgets.length === 0" class="bg-ui-surface border border-ui-line rounded-ui-card">
      <UiEmpty :icon="LayoutGrid" :title="$t('dashboard.layout.empty')" />
    </div>
  </template>

  <!-- Save-status pill: quiet confirmation for the silent auto-save. Sits
       above the phone tab bar. -->
  <Transition name="ui-pop">
    <div
      v-if="saveStatus !== 'idle'"
      class="fixed right-3 sm:right-5 bottom-[calc(140px+env(safe-area-inset-bottom))] lg:bottom-[76px] z-40 flex items-center gap-2 h-10 px-3.5 rounded-ui-control bg-ui-surface border border-ui-line shadow-ui-overlay text-ui-small font-medium"
      :class="{ 'text-ui-text': saveStatus === 'saving', 'text-ui-ok': saveStatus === 'saved', 'text-ui-bad': saveStatus === 'error' }"
      role="status"
    >
      <Spinner v-if="saveStatus === 'saving'" :center="false" size="16px" />
      <CheckCircle2 v-else-if="saveStatus === 'saved'" class="w-4 h-4" />
      <AlertCircle v-else-if="saveStatus === 'error'" class="w-4 h-4" />
      <span v-if="saveStatus === 'saving'">{{ $t("dashboard.layout.saving") }}</span>
      <span v-else-if="saveStatus === 'saved'">{{ $t("dashboard.layout.saved") }}</span>
      <span v-else-if="saveStatus === 'error'">{{ $t("dashboard.layout.saveError") }}</span>
      <button v-if="saveStatus === 'error'" type="button" @click="store.queueSaveOrder(orderedWidgets.map((w) => w.key))" class="underline ml-1">{{ $t("common.actions.retry") }}</button>
    </div>
  </Transition>
</template>

<style scoped>
.widget-drag-ghost {
  opacity: 0.4;
}
</style>
