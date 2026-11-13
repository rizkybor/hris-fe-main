<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { AlertCircle, RefreshCw, LayoutGrid } from "lucide-vue-next";
import { useDashboardWidgetsStore } from "@/stores/dashboardWidgets";
import { DASHBOARD_WIDGET_REGISTRY } from "@/helpers/dashboardWidgetRegistry";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiButton, UiEmpty } from "@/components/ui";

const store = useDashboardWidgetsStore();
const { widgets, loading, error } = storeToRefs(store);

onMounted(() => {
  store.fetchWidgets();
});

// Order and width of every known widget. Pairs are grouped by topic.
const LAYOUT = [
  ["key_metrics", "full"],
  ["employee_statistics", "full"],
  ["search_section", "full"],
  ["upcoming_tasks", "half"],
  ["pending_leave_requests", "half"],
  ["project_realized", "half"],
  ["project_budget", "half"],
  ["projects_at_risk", "half"],
  ["recent_activity", "half"],
  ["subscriptions", "half"],
  ["maintenance", "half"],
  ["latest_employees", "half"],
  ["latest_teams", "half"],
  ["quick_links", "half"],
  ["sticky_notes", "half"],
  ["system_stats", "half"],
  ["system_settings_links", "half"],
];
const RANK = Object.fromEntries(LAYOUT.map(([key], i) => [key, i]));
const WIDTH = Object.fromEntries(LAYOUT);

const placedWidgets = computed(() => {
  const keys = widgets.value
    .map((w) => w.key)
    .filter((key) => DASHBOARD_WIDGET_REGISTRY[key])
    // Known widgets in the designed order; any new one goes last.
    .sort((a, b) => (RANK[a] ?? 999) - (RANK[b] ?? 999));

  const placed = [];
  let openHalf = null; // a half-width widget waiting for a partner
  for (const key of keys) {
    const item = { key, full: (WIDTH[key] || "half") === "full" };
    if (item.full) {
      if (openHalf) openHalf.full = true; // no partner: take the whole row
      openHalf = null;
    } else if (openHalf) {
      openHalf = null; // pair complete
    } else {
      openHalf = item;
    }
    placed.push(item);
  }
  if (openHalf) openHalf.full = true;
  return placed;
});
</script>

<template>
  <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <Skeleton class="lg:col-span-2" width="100%" height="120px" rounded="12px" />
    <Skeleton v-for="i in 4" :key="i" width="100%" height="220px" rounded="12px" />
  </div>

  <div v-else-if="error && placedWidgets.length === 0" class="bg-ui-surface border border-ui-line rounded-ui-card">
    <UiEmpty :icon="AlertCircle" :title="$t('dashboard.layout.loadError')" :message="$t('common.states.loadErrorHint')">
      <UiButton variant="secondary" size="sm" :icon="RefreshCw" @click="store.fetchWidgets()">{{ $t("common.actions.retry") }}</UiButton>
    </UiEmpty>
  </div>

  <div v-else-if="placedWidgets.length === 0" class="bg-ui-surface border border-ui-line rounded-ui-card">
    <UiEmpty :icon="LayoutGrid" :title="$t('dashboard.layout.empty')" />
  </div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4 ui-stagger">
    <div v-for="widget in placedWidgets" :key="widget.key" class="min-w-0" :class="{ 'lg:col-span-2': widget.full }">
      <component :is="DASHBOARD_WIDGET_REGISTRY[widget.key].component" v-bind="DASHBOARD_WIDGET_REGISTRY[widget.key].props" />
    </div>
  </div>
</template>
