<script setup>
import { computed, onMounted, watch } from "vue";
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

// VueDraggableNext mutates this array directly (splice) on drag; the
// computed setter is what turns that mutation into a persisted order.
const orderedWidgets = computed({
  get: () => widgets.value,
  set: (newOrder) => {
    widgets.value = newOrder;
    store.queueSaveOrder(newOrder.map((w) => w.key));
  },
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
    !(await alertModal.confirm("Reset your dashboard back to the default widget order?", {
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
  <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Skeleton v-for="i in 4" :key="i" width="100%" height="220px" rounded="14px" />
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
        title="Reset dashboard to default widget order"
      >
        <RotateCcw class="w-3.5 h-3.5" /> Reset Layout
      </button>
    </div>

    <VueDraggableNext
      v-model="orderedWidgets"
      :animation="200"
      handle=".widget-drag-handle"
      ghost-class="widget-drag-ghost"
      class="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      <div
        v-for="widget in orderedWidgets"
        :key="widget.key"
        class="relative group"
        :class="DASHBOARD_WIDGET_REGISTRY[widget.key]?.colSpan"
      >
        <!-- Always-visible on touch devices (no hover state), fades in on
             desktop hover so it doesn't clutter the widget's own content. -->
        <div
          class="widget-drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing bg-white/90 border border-[#DCDEDD] rounded-md p-1.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          :title="`Drag to reorder: ${DASHBOARD_WIDGET_REGISTRY[widget.key]?.title ?? widget.key}`"
        >
          <GripVertical class="w-4 h-4 text-gray-500" />
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
