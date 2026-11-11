<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from "vue";
import RecapSection from "@/components/common/RecapSection.vue";
import { uiColor, uiChartBase } from "@/utils/uiColor";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Recap charts of the Staff Tasks page. A task is done once every assignee
// has marked it done; the charts count assignments (one per staff per task).
// The page owns the data (GET /staff-tasks/summary via staffTaskStore, so it
// refreshes quietly and also feeds the summary tiles above the list).
const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
});
const emit = defineEmits(["retry"]);
const data = computed(() => props.data);

const narrow = ref(false);
let mq;
const onMq = (e) => (narrow.value = e.matches);
onMounted(() => {
  mq = window.matchMedia("(max-width: 640px)");
  narrow.value = mq.matches;
  mq.addEventListener("change", onMq);
});
onBeforeUnmount(() => mq?.removeEventListener("change", onMq));

// Status, not identity: faint = not started, warn = working, ok = done
// (same meaning as the badges on Staff Tasks and My Tasks).
const STATUSES = computed(() =>
  [
    { key: "todo", label: t("staffTasks.status.todo"), token: "faint", swatch: "bg-ui-faint" },
    { key: "in_progress", label: t("staffTasks.status.inProgress"), token: "warn", swatch: "bg-ui-warn" },
    { key: "done", label: t("staffTasks.status.done"), token: "ok", swatch: "bg-ui-ok" },
  ].map((s) => ({ ...s, color: uiColor(s.token) }))
);

const assignmentTotal = computed(() => STATUSES.value.reduce((s, st) => s + (data.value?.assignments?.[st.key] ?? 0), 0));

const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: STATUSES.value.map((s) => s.label),
  colors: STATUSES.value.map((s) => s.color),
  stroke: { width: 2, colors: [uiColor("surface")] },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: { show: true, offsetY: 18, color: uiColor("muted"), fontSize: "11px" },
          value: { show: true, offsetY: -14, color: uiColor("ink"), fontSize: "17px", fontWeight: 600 },
          total: { show: true, label: t("staffTasks.recap.assignments"), color: uiColor("muted"), fontSize: "11px", formatter: () => assignmentTotal.value },
        },
      },
    },
  },
}));

const staff = computed(() => data.value?.staff ?? []);

// ----- Weekly -----
const weekLabel = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(localeTag(), { day: "numeric", month: "short" });
};
const trend = computed(() => data.value?.trend ?? []);
const thisWeek = computed(() => trend.value.length - 2);
const trendOptions = computed(() => {
  const base = uiChartBase();
  return {
  chart: { ...base.chart, type: "bar", stacked: true },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: narrow.value ? "60%" : "24px" } },
  colors: STATUSES.value.map((s) => s.color),
  stroke: { show: true, width: 2, colors: [uiColor("surface")] },
  dataLabels: { enabled: false },
  legend: { show: true, position: "top", horizontalAlign: "right", fontSize: "11px", labels: { colors: uiColor("muted") }, markers: { size: 5, shape: "square" } },
  grid: base.grid,
  xaxis: {
    categories: trend.value.map((wk, i) => (i === thisWeek.value ? t("staffTasks.recap.thisWeek") : i === thisWeek.value + 1 ? t("staffTasks.recap.nextWeek") : narrow.value && i % 2 ? "" : weekLabel(wk.week))),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { rotate: 0, hideOverlappingLabels: true, style: base.axisLabel },
  },
  yaxis: { tickAmount: 3, forceNiceScale: true, labels: { formatter: (v) => Math.round(v), style: base.axisLabel } },
  tooltip: { shared: true, intersect: false, x: { formatter: (_, { dataPointIndex }) => t("staffTasks.recap.weekOf", { date: weekLabel(trend.value[dataPointIndex].week) }) } },
  };
});
const trendSeries = computed(() => STATUSES.value.map((s) => ({ name: s.label, data: trend.value.map((t) => t[s.key]) })));
</script>

<template>
  <RecapSection storage-key="staff-tasks-recap-open" :loading="loading" :failed="failed" :tiles="0" @retry="emit('retry')">
    <template v-if="data">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Assignment status -->
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <p class="text-ui-h3 text-ui-ink">{{ $t("staffTasks.recap.statusTitle") }}</p>
          <p class="text-ui-cap text-ui-muted mb-2">{{ $t("staffTasks.recap.statusSubtitle") }}</p>
          <p v-if="!assignmentTotal" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("staffTasks.recap.noAssignments") }}</p>
          <div v-else class="flex flex-col sm:flex-row items-center gap-4">
            <div class="w-44 shrink-0">
              <VueApexCharts type="donut" height="190" :options="donutOptions" :series="STATUSES.map((s) => data.assignments[s.key])" />
            </div>
            <ul class="w-full space-y-2 text-ui-cap">
              <li v-for="s in STATUSES" :key="s.key" class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :class="s.swatch"></span>
                <span class="text-ui-text font-medium flex-1">{{ s.label }}</span>
                <span class="text-ui-ink font-medium tabular-nums">{{ data.assignments[s.key] }}</span>
                <span class="text-ui-muted w-10 text-right tabular-nums">{{ Math.round((data.assignments[s.key] / assignmentTotal) * 100) }}%</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Per staff -->
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <p class="text-ui-h3 text-ui-ink">{{ $t("staffTasks.recap.workloadTitle") }}</p>
          <p class="text-ui-cap text-ui-muted mb-3">{{ $t("staffTasks.recap.workloadSubtitle") }}</p>
          <p v-if="!staff.length" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("staffTasks.recap.noAssignments") }}</p>
          <div v-else class="space-y-3">
            <div v-for="s in staff" :key="s.name">
              <div class="flex items-baseline justify-between gap-2 text-ui-cap mb-1">
                <span class="text-ui-text font-medium truncate">{{ s.name }}</span>
                <span class="shrink-0 text-ui-muted tabular-nums">
                  <i18n-t keypath="staffTasks.recap.staffDone" scope="global">
                    <template #ratio><strong class="text-ui-ink font-medium">{{ s.done }}/{{ s.total }}</strong></template>
                  </i18n-t>
                  <span v-if="s.overdue" class="text-ui-bad font-medium"> · {{ $t("staffTasks.recap.staffOverdue", { n: s.overdue }) }}</span>
                </span>
              </div>
              <div class="w-full h-2 bg-ui-subtle rounded-full overflow-hidden flex gap-0.5">
                <div v-if="s.done" class="h-full rounded-full bg-ui-ok" :style="{ width: `${(s.done / s.total) * 100}%` }"></div>
                <div v-if="s.overdue" class="h-full rounded-full bg-ui-bad" :style="{ width: `${(s.overdue / s.total) * 100}%` }"></div>
              </div>
            </div>
            <p class="text-ui-cap text-ui-muted flex flex-wrap gap-x-3 gap-y-1">
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-ok"></span>{{ $t("staffTasks.status.done") }}</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-bad"></span>{{ $t("staffTasks.overdue") }}</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-subtle border border-ui-line"></span>{{ $t("staffTasks.recap.openLegend") }}</span>
              <span v-if="data.staff_count > staff.length">{{ $t("staffTasks.recap.moreStaff", { n: data.staff_count - staff.length }) }}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
        <p class="text-ui-h3 text-ui-ink">{{ $t("staffTasks.recap.byWeekTitle") }}</p>
        <p class="text-ui-cap text-ui-muted">{{ $t("staffTasks.recap.byWeekSubtitle") }}</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="220" :options="trendOptions" :series="trendSeries" />
        </div>
      </div>
    </template>
  </RecapSection>
</template>
