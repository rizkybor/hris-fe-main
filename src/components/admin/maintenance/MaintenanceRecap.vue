<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import { Wrench, Timer, AlertTriangle, PiggyBank } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatHours, formatMonth, LOG_CATEGORIES, usageColor } from "@/utils/maintenance";
import RecapSection from "@/components/common/RecapSection.vue";
import RecapTile from "@/components/common/RecapTile.vue";

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Recap above the Maintenance list: this month's hours against quota per
// contract, what the hours went into, the last 6 months, and the
// development balance.
const props = defineProps({ refreshKey: { type: Number, default: 0 } });

const data = ref(null);
const loading = ref(true);
const failed = ref(false);
const load = async () => {
  failed.value = false;
  try {
    data.value = (await axiosInstance.get("/maintenance/summary")).data.data;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};
onMounted(load);
watch(() => props.refreshKey, load);

const h = (v) => formatHours(v);
const pctOf = (used, total) => (total > 0 ? Math.round((used / total) * 100) : used > 0 ? 100 : 0);

const tiles = computed(() => {
  const d = data.value;
  if (!d) return [];
  const others = [d.counts.paused && `${d.counts.paused} paused`, d.counts.ended && `${d.counts.ended} ended`].filter(Boolean);
  return [
    { key: "active", label: "Active contracts", value: d.counts.active, sub: [`${d.client_count} client${d.client_count === 1 ? "" : "s"}`, ...others].join(" · "), icon: Wrench, iconClass: "bg-teal-50 text-teal-600" },
    { key: "used", label: `Hours used · ${formatMonth(d.month).split(" ")[0]}`, value: `${h(d.used)} / ${h(d.total)}`, sub: `${pctOf(d.used, d.total)}% of this month's quota`, icon: Timer, iconClass: "bg-blue-50 text-[#0C51D9]" },
    {
      key: "over",
      label: "Over quota",
      value: d.over_count,
      valueClass: d.over_count ? "text-red-600" : "text-brand-dark",
      sub: d.near_count ? `${d.near_count} near the limit (≥80%)` : "None near the limit",
      icon: AlertTriangle,
      iconClass: "bg-red-50 text-red-600",
    },
    {
      key: "balance",
      label: "Development balance",
      value: h(d.balance),
      sub: `${d.features_open} feature${d.features_open === 1 ? "" : "s"} in the pipeline`,
      alert: d.expiring > 0 ? `${h(d.expiring)} expiring in 30 days` : null,
      icon: PiggyBank,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
  ];
});

// ----- Hours by category (this month) -----
// Colour by the category's fixed position, never by rank; "Other" is gray.
const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const OTHER = "#94a3b8";
const slices = computed(() => {
  const rows = data.value?.by_category ?? [];
  return LOG_CATEGORIES.map((c, i) => {
    const row = rows.find((r) => r.category === c.value);
    return { key: c.value, label: c.label, hours: row?.hours ?? 0, count: row?.count ?? 0, color: c.value === "other" ? OTHER : PALETTE[i] };
  }).filter((s) => s.hours > 0);
});
const sliceTotal = computed(() => slices.value.reduce((s, x) => s + x.hours, 0));
const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: slices.value.map((s) => s.label),
  colors: slices.value.map((s) => s.color),
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
          value: { show: true, offsetY: -14, color: "#0f172a", fontSize: "16px", fontWeight: 800, formatter: (v) => h(Number(v)) },
          total: { show: true, label: "logged", color: "#64748b", fontSize: "11px", formatter: () => h(sliceTotal.value) },
        },
      },
    },
  },
  tooltip: { y: { formatter: (v) => h(v) } },
}));

// ----- Quota use per contract (this month) -----
const usage = computed(() => data.value?.usage ?? []);

// ----- Last 6 months -----
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const trend = computed(() => data.value?.trend ?? []);
const trendOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "48%" } },
  colors: ["#cbd5e1", "#2a78d6"],
  stroke: { show: true, width: 2, colors: ["transparent"] },
  dataLabels: { enabled: false },
  legend: { show: true, position: "top", horizontalAlign: "right", fontSize: "11px", labels: { colors: "#64748B" }, markers: { size: 5, shape: "square" } },
  grid: { borderColor: "#EEF1F5", padding: { left: 4, right: 4 } },
  xaxis: {
    categories: trend.value.map((t) => MONTHS[Number(t.month.slice(5, 7)) - 1]),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: "#64748B", fontSize: "11px" } },
  },
  yaxis: { tickAmount: 3, labels: { formatter: (v) => `${Math.round(v)} h`, style: { colors: "#64748B", fontSize: "11px" } } },
  tooltip: { shared: true, intersect: false, y: { formatter: (v) => h(v) } },
}));
const trendSeries = computed(() => [
  { name: "Available", data: trend.value.map((t) => t.total) },
  { name: "Used", data: trend.value.map((t) => t.used) },
]);
</script>

<template>
  <RecapSection storage-key="maintenance-recap-open" :loading="loading" :failed="failed" @retry="load">
    <template v-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <RecapTile v-for="t in tiles" :key="t.key" v-bind="t" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Quota use per contract -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
          <p class="text-brand-dark text-sm font-bold">Quota used this month</p>
          <p class="text-brand-light text-xs mb-3">Per contract, fullest first</p>
          <p v-if="!usage.length" class="text-sm text-gray-500 py-10 text-center">No active contracts this month.</p>
          <div v-else class="space-y-3">
            <RouterLink
              v-for="u in usage"
              :key="u.id"
              :to="{ name: 'admin.maintenance.detail', params: { id: u.id } }"
              class="block group/bar"
            >
              <div class="flex items-baseline justify-between gap-2 text-xs mb-1">
                <span class="min-w-0 truncate">
                  <span class="text-brand-dark font-medium group-hover/bar:text-[#0C51D9]">{{ u.name }}</span>
                  <span v-if="u.client" class="text-brand-light"> · {{ u.client }}</span>
                </span>
                <span class="shrink-0 text-brand-light tabular-nums">
                  {{ h(u.used) }} / {{ h(u.total) }} ·
                  <strong :class="u.overage > 0 ? 'text-red-600' : u.used_percent >= 75 ? 'text-amber-700' : 'text-brand-dark'">{{ Math.round(u.used_percent) }}%</strong>
                </span>
              </div>
              <div class="w-full bg-gray-100 rounded-full overflow-hidden" style="height: 8px">
                <div class="h-full rounded-full" :style="{ width: `${Math.min(100, Math.max(2, u.used_percent))}%`, backgroundColor: usageColor(u) }"></div>
              </div>
              <p v-if="u.overage > 0" class="text-[11px] text-red-600 mt-0.5 flex items-center gap-1">
                <AlertTriangle class="w-3 h-3" />{{ h(u.overage) }} over quota
              </p>
            </RouterLink>
            <p v-if="data.usage_count > usage.length" class="text-[11px] text-brand-light">+ {{ data.usage_count - usage.length }} more</p>
          </div>
        </div>

        <!-- Hours by category -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
          <p class="text-brand-dark text-sm font-bold">What the hours went into</p>
          <p class="text-brand-light text-xs mb-2">Work logged this month, by category</p>
          <p v-if="!slices.length" class="text-sm text-gray-500 py-10 text-center">No work logged this month yet.</p>
          <div v-else class="flex flex-col sm:flex-row items-center gap-4">
            <div class="w-48 shrink-0">
              <VueApexCharts type="donut" height="200" :options="donutOptions" :series="slices.map((s) => s.hours)" />
            </div>
            <ul class="w-full space-y-2 text-xs">
              <li v-for="s in slices" :key="s.key" class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: s.color }"></span>
                <span class="text-brand-dark font-medium truncate flex-1">{{ s.label }}</span>
                <span class="text-brand-light shrink-0">{{ s.count }}×</span>
                <span class="text-brand-dark font-semibold shrink-0 tabular-nums">{{ h(s.hours) }}</span>
                <span class="text-brand-light shrink-0 w-10 text-right tabular-nums">{{ Math.round((s.hours / sliceTotal) * 100) }}%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Trend -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Hours available vs used, last 6 months</p>
        <p class="text-brand-light text-xs">Available = quota + carried over + adjustments, across all contracts</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="220" :options="trendOptions" :series="trendSeries" />
        </div>
      </div>
    </template>
  </RecapSection>
</template>
