<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ListChecks, AlertTriangle, CalendarRange, CheckCircle2 } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import RecapSection from "@/components/common/RecapSection.vue";
import RecapTile from "@/components/common/RecapTile.vue";
import { uiColor, uiChartBase } from "@/utils/uiColor";

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Recap above the Staff Tasks list. A task is done once every assignee has
// marked it done; the charts count assignments (one per staff per task).
const props = defineProps({ refreshKey: { type: Number, default: 0 } });

const data = ref(null);
const loading = ref(true);
const failed = ref(false);
const load = async () => {
  failed.value = false;
  try {
    data.value = (await axiosInstance.get("/staff-tasks/summary")).data.data;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};
const narrow = ref(false);
let mq;
const onMq = (e) => (narrow.value = e.matches);
onMounted(() => {
  load();
  mq = window.matchMedia("(max-width: 640px)");
  narrow.value = mq.matches;
  mq.addEventListener("change", onMq);
});
onBeforeUnmount(() => mq?.removeEventListener("change", onMq));
watch(() => props.refreshKey, load);

// Status, not identity: faint = not started, warn = working, ok = done
// (same meaning as the badges on Staff Tasks and My Tasks).
const STATUSES = [
  { key: "todo", label: "To Do", token: "faint", swatch: "bg-ui-faint" },
  { key: "in_progress", label: "In Progress", token: "warn", swatch: "bg-ui-warn" },
  { key: "done", label: "Done", token: "ok", swatch: "bg-ui-ok" },
].map((s) => ({ ...s, color: uiColor(s.token) }));

const assignmentTotal = computed(() => STATUSES.reduce((s, st) => s + (data.value?.assignments?.[st.key] ?? 0), 0));
const donePct = computed(() => (assignmentTotal.value ? Math.round((data.value.assignments.done / assignmentTotal.value) * 100) : 0));

const tiles = computed(() => {
  const d = data.value;
  if (!d) return [];
  return [
    { key: "open", label: "Open tasks", value: d.open, sub: `of ${d.total} task${d.total === 1 ? "" : "s"}`, icon: ListChecks },
    { key: "overdue", label: "Overdue", value: d.overdue, valueClass: d.overdue ? "text-ui-bad" : "text-ui-ink", sub: "Past due, still open", icon: AlertTriangle },
    { key: "week", label: "Due this week", value: d.due_this_week, sub: "Still open", icon: CalendarRange },
    { key: "done", label: "Assignments done", value: `${donePct.value}%`, sub: `${d.assignments.done} of ${assignmentTotal.value}`, icon: CheckCircle2 },
  ];
});

const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: STATUSES.map((s) => s.label),
  colors: STATUSES.map((s) => s.color),
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
          total: { show: true, label: "assignments", color: uiColor("muted"), fontSize: "11px", formatter: () => assignmentTotal.value },
        },
      },
    },
  },
}));

const staff = computed(() => data.value?.staff ?? []);

// ----- Weekly -----
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const weekLabel = (iso) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
const trend = computed(() => data.value?.trend ?? []);
const thisWeek = computed(() => trend.value.length - 2);
const trendOptions = computed(() => {
  const base = uiChartBase();
  return {
  chart: { ...base.chart, type: "bar", stacked: true },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: narrow.value ? "60%" : "24px" } },
  colors: STATUSES.map((s) => s.color),
  stroke: { show: true, width: 2, colors: [uiColor("surface")] },
  dataLabels: { enabled: false },
  legend: { show: true, position: "top", horizontalAlign: "right", fontSize: "11px", labels: { colors: uiColor("muted") }, markers: { size: 5, shape: "square" } },
  grid: base.grid,
  xaxis: {
    categories: trend.value.map((t, i) => (i === thisWeek.value ? "This wk" : i === thisWeek.value + 1 ? "Next wk" : narrow.value && i % 2 ? "" : weekLabel(t.week))),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { rotate: 0, hideOverlappingLabels: true, style: base.axisLabel },
  },
  yaxis: { tickAmount: 3, forceNiceScale: true, labels: { formatter: (v) => Math.round(v), style: base.axisLabel } },
  tooltip: { shared: true, intersect: false, x: { formatter: (_, { dataPointIndex }) => `Week of ${weekLabel(trend.value[dataPointIndex].week)}` } },
  };
});
const trendSeries = computed(() => STATUSES.map((s) => ({ name: s.label, data: trend.value.map((t) => t[s.key]) })));
</script>

<template>
  <RecapSection storage-key="staff-tasks-recap-open" :loading="loading" :failed="failed" @retry="load">
    <template v-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
        <RecapTile v-for="t in tiles" :key="t.key" v-bind="t" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Assignment status -->
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <p class="text-ui-h3 text-ui-ink">Assignment status</p>
          <p class="text-ui-cap text-ui-muted mb-2">Every staff member's progress on every task</p>
          <p v-if="!assignmentTotal" class="text-ui-small text-ui-muted py-10 text-center">No tasks assigned yet.</p>
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
          <p class="text-ui-h3 text-ui-ink">Workload per staff</p>
          <p class="text-ui-cap text-ui-muted mb-3">Most open assignments first</p>
          <p v-if="!staff.length" class="text-ui-small text-ui-muted py-10 text-center">No tasks assigned yet.</p>
          <div v-else class="space-y-3">
            <div v-for="s in staff" :key="s.name">
              <div class="flex items-baseline justify-between gap-2 text-ui-cap mb-1">
                <span class="text-ui-text font-medium truncate">{{ s.name }}</span>
                <span class="shrink-0 text-ui-muted tabular-nums">
                  <strong class="text-ui-ink font-medium">{{ s.done }}/{{ s.total }}</strong> done
                  <span v-if="s.overdue" class="text-ui-bad font-medium"> · {{ s.overdue }} overdue</span>
                </span>
              </div>
              <div class="w-full h-2 bg-ui-subtle rounded-full overflow-hidden flex gap-0.5">
                <div v-if="s.done" class="h-full rounded-full bg-ui-ok" :style="{ width: `${(s.done / s.total) * 100}%` }"></div>
                <div v-if="s.overdue" class="h-full rounded-full bg-ui-bad" :style="{ width: `${(s.overdue / s.total) * 100}%` }"></div>
              </div>
            </div>
            <p class="text-ui-cap text-ui-muted flex flex-wrap gap-x-3 gap-y-1">
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-ok"></span>Done</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-bad"></span>Overdue</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-ui-subtle border border-ui-line"></span>Open</span>
              <span v-if="data.staff_count > staff.length">+ {{ data.staff_count - staff.length }} more staff</span>
            </p>
          </div>
        </div>
      </div>

      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
        <p class="text-ui-h3 text-ui-ink">Assignments by due week</p>
        <p class="text-ui-cap text-ui-muted">Where each week's assignments stand now</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="220" :options="trendOptions" :series="trendSeries" />
        </div>
      </div>
    </template>
  </RecapSection>
</template>
