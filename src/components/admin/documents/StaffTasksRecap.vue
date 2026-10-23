<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ListChecks, AlertTriangle, CalendarRange, CheckCircle2 } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import RecapSection from "@/components/common/RecapSection.vue";
import RecapTile from "@/components/common/RecapTile.vue";

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

// Status, not identity: gray = not started, amber = working, green = done.
const STATUSES = [
  { key: "todo", label: "To Do", color: "#94a3b8" },
  { key: "in_progress", label: "In Progress", color: "#eda100" },
  { key: "done", label: "Done", color: "#1baf7a" },
];

const assignmentTotal = computed(() => STATUSES.reduce((s, st) => s + (data.value?.assignments?.[st.key] ?? 0), 0));
const donePct = computed(() => (assignmentTotal.value ? Math.round((data.value.assignments.done / assignmentTotal.value) * 100) : 0));

const tiles = computed(() => {
  const d = data.value;
  if (!d) return [];
  return [
    { key: "open", label: "Open tasks", value: d.open, sub: `of ${d.total} task${d.total === 1 ? "" : "s"}`, icon: ListChecks, iconClass: "bg-emerald-50 text-emerald-600" },
    { key: "overdue", label: "Overdue", value: d.overdue, valueClass: d.overdue ? "text-red-600" : "text-brand-dark", sub: "Past due, still open", icon: AlertTriangle, iconClass: "bg-red-50 text-red-600" },
    { key: "week", label: "Due this week", value: d.due_this_week, sub: "Still open", icon: CalendarRange, iconClass: "bg-blue-50 text-[#0C51D9]" },
    { key: "done", label: "Assignments done", value: `${donePct.value}%`, sub: `${d.assignments.done} of ${assignmentTotal.value}`, icon: CheckCircle2, iconClass: "bg-green-50 text-green-600" },
  ];
});

const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: STATUSES.map((s) => s.label),
  colors: STATUSES.map((s) => s.color),
  stroke: { width: 2, colors: ["#ffffff"] },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: { show: true, offsetY: 18, color: "#64748b", fontSize: "11px" },
          value: { show: true, offsetY: -14, color: "#0f172a", fontSize: "18px", fontWeight: 800 },
          total: { show: true, label: "assignments", color: "#64748b", fontSize: "11px", formatter: () => assignmentTotal.value },
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
const trendOptions = computed(() => ({
  chart: { type: "bar", stacked: true, toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: narrow.value ? "60%" : "24px" } },
  colors: STATUSES.map((s) => s.color),
  stroke: { show: true, width: 2, colors: ["#ffffff"] },
  dataLabels: { enabled: false },
  legend: { show: true, position: "top", horizontalAlign: "right", fontSize: "11px", labels: { colors: "#64748B" }, markers: { size: 5, shape: "square" } },
  grid: { borderColor: "#EEF1F5", padding: { left: 4, right: 4 } },
  xaxis: {
    categories: trend.value.map((t, i) => (i === thisWeek.value ? "This wk" : i === thisWeek.value + 1 ? "Next wk" : narrow.value && i % 2 ? "" : weekLabel(t.week))),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { rotate: 0, hideOverlappingLabels: true, style: { colors: "#64748B", fontSize: "11px" } },
  },
  yaxis: { tickAmount: 3, forceNiceScale: true, labels: { formatter: (v) => Math.round(v), style: { colors: "#64748B", fontSize: "11px" } } },
  tooltip: { shared: true, intersect: false, x: { formatter: (_, { dataPointIndex }) => `Week of ${weekLabel(trend.value[dataPointIndex].week)}` } },
}));
const trendSeries = computed(() => STATUSES.map((s) => ({ name: s.label, data: trend.value.map((t) => t[s.key]) })));
</script>

<template>
  <RecapSection storage-key="staff-tasks-recap-open" :loading="loading" :failed="failed" @retry="load">
    <template v-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <RecapTile v-for="t in tiles" :key="t.key" v-bind="t" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Assignment status -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
          <p class="text-brand-dark text-sm font-bold">Assignment status</p>
          <p class="text-brand-light text-xs mb-2">Every staff member's progress on every task</p>
          <p v-if="!assignmentTotal" class="text-sm text-gray-500 py-10 text-center">No tasks assigned yet.</p>
          <div v-else class="flex flex-col sm:flex-row items-center gap-4">
            <div class="w-48 shrink-0">
              <VueApexCharts type="donut" height="200" :options="donutOptions" :series="STATUSES.map((s) => data.assignments[s.key])" />
            </div>
            <ul class="w-full space-y-2 text-xs">
              <li v-for="s in STATUSES" :key="s.key" class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: s.color }"></span>
                <span class="text-brand-dark font-medium flex-1">{{ s.label }}</span>
                <span class="text-brand-dark font-semibold tabular-nums">{{ data.assignments[s.key] }}</span>
                <span class="text-brand-light w-10 text-right tabular-nums">{{ Math.round((data.assignments[s.key] / assignmentTotal) * 100) }}%</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Per staff -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
          <p class="text-brand-dark text-sm font-bold">Workload per staff</p>
          <p class="text-brand-light text-xs mb-3">Most open assignments first</p>
          <p v-if="!staff.length" class="text-sm text-gray-500 py-10 text-center">No tasks assigned yet.</p>
          <div v-else class="space-y-3">
            <div v-for="s in staff" :key="s.name">
              <div class="flex items-baseline justify-between gap-2 text-xs mb-1">
                <span class="text-brand-dark font-medium truncate">{{ s.name }}</span>
                <span class="shrink-0 text-brand-light tabular-nums">
                  <strong class="text-brand-dark">{{ s.done }}/{{ s.total }}</strong> done
                  <span v-if="s.overdue" class="text-red-600 font-semibold"> · {{ s.overdue }} overdue</span>
                </span>
              </div>
              <div class="w-full bg-gray-100 rounded-full overflow-hidden flex gap-[2px]" style="height: 8px">
                <div v-if="s.done" class="h-full rounded-full bg-[#1baf7a]" :style="{ width: `${(s.done / s.total) * 100}%` }"></div>
                <div v-if="s.overdue" class="h-full rounded-full bg-[#dc2626]" :style="{ width: `${(s.overdue / s.total) * 100}%` }"></div>
              </div>
            </div>
            <p class="text-[11px] text-brand-light flex flex-wrap gap-x-3 gap-y-1">
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#1baf7a]"></span>Done</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-[#dc2626]"></span>Overdue</span>
              <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-gray-200"></span>Open</span>
              <span v-if="data.staff_count > staff.length">+ {{ data.staff_count - staff.length }} more staff</span>
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Assignments by due week</p>
        <p class="text-brand-light text-xs">Where each week's assignments stand now</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="220" :options="trendOptions" :series="trendSeries" />
        </div>
      </div>
    </template>
  </RecapSection>
</template>
