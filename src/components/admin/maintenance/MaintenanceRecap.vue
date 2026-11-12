<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import { Wrench, Timer, AlertTriangle, PiggyBank, ChartPie, ChevronDown } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatHours, formatMonth, LOG_CATEGORIES } from "@/utils/maintenance";
import RecapSection from "@/components/common/RecapSection.vue";
import RecapTile from "@/components/common/RecapTile.vue";
import { uiColor } from "@/utils/uiColor";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

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

// Same as the Subscriptions recap: the tiles answer the everyday questions,
// the charts sit behind "Show analysis" -- closed by default, remembered per
// browser, and not rendered (no chart download) while closed.
const ANALYSIS_KEY = "maintenance-recap-analysis-open";
const analysisOpen = ref(false);
try {
  analysisOpen.value = localStorage.getItem(ANALYSIS_KEY) === "1";
} catch {
  /* storage unavailable */
}
const toggleAnalysis = () => {
  analysisOpen.value = !analysisOpen.value;
  try {
    localStorage.setItem(ANALYSIS_KEY, analysisOpen.value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
};

const h = (v) => formatHours(v);
const pctOf = (used, total) => (total > 0 ? Math.round((used / total) * 100) : used > 0 ? 100 : 0);

const tiles = computed(() => {
  const d = data.value;
  if (!d) return [];
  const others = [d.counts.paused && t("maintenance.recap.paused", { n: d.counts.paused }), d.counts.ended && t("maintenance.recap.ended", { n: d.counts.ended })].filter(Boolean);
  return [
    { key: "active", label: t("maintenance.recap.activeContracts"), value: d.counts.active, sub: [t("maintenance.recap.clients", { n: d.client_count }, d.client_count), ...others].join(" · "), icon: Wrench },
    { key: "used", label: t("maintenance.recap.hoursUsed", { month: formatMonth(d.month).split(" ")[0] }), value: `${h(d.used)} / ${h(d.total)}`, sub: t("maintenance.recap.pctOfQuota", { n: pctOf(d.used, d.total) }), icon: Timer },
    {
      key: "over",
      label: t("maintenance.recap.overQuota"),
      value: d.over_count,
      valueClass: d.over_count ? "text-ui-bad" : "text-ui-ink",
      sub: d.near_count ? t("maintenance.recap.nearLimit", { n: d.near_count }) : t("maintenance.recap.noneNear"),
      icon: AlertTriangle,
    },
    {
      key: "balance",
      label: t("maintenance.recap.devBalance"),
      value: h(d.balance),
      sub: t("maintenance.recap.featuresPipeline", { n: d.features_open }, d.features_open),
      alert: d.expiring > 0 ? t("maintenance.recap.expiring30", { hours: h(d.expiring) }) : null,
      icon: PiggyBank,
    },
  ];
});

// ----- Hours by category (this month) -----
// Colour by the category's fixed position, never by rank; "Other" is gray.
const PALETTE = [uiColor("accent"), uiColor("ink"), uiColor("ok"), uiColor("warn"), uiColor("accent", 0.45)];
const OTHER = uiColor("line-strong");
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
          value: { show: true, offsetY: -14, color: uiColor("ink"), fontSize: "16px", fontWeight: 600, formatter: (v) => h(Number(v)) },
          total: { show: true, label: t("maintenance.recap.logged"), color: uiColor("muted"), fontSize: "11px", formatter: () => h(sliceTotal.value) },
        },
      },
    },
  },
  tooltip: { y: { formatter: (v) => h(v) } },
}));

// ----- Quota use per contract (this month) -----
const usage = computed(() => data.value?.usage ?? []);

// ----- Last 6 months -----
const MONTHS = computed(() => Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(localeTag(), { month: "short" })));
const trend = computed(() => data.value?.trend ?? []);
const trendOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "48%" } },
  colors: [uiColor("line-strong"), uiColor("accent")],
  stroke: { show: true, width: 2, colors: ["transparent"] },
  dataLabels: { enabled: false },
  legend: { show: true, position: "top", horizontalAlign: "right", fontSize: "11px", labels: { colors: uiColor("muted") }, markers: { size: 5, shape: "square" } },
  grid: { borderColor: uiColor("line"), padding: { left: 4, right: 4 } },
  xaxis: {
    categories: trend.value.map((row) => MONTHS.value[Number(row.month.slice(5, 7)) - 1]),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: uiColor("muted"), fontSize: "11px" } },
  },
  yaxis: { tickAmount: 3, labels: { formatter: (v) => `${Math.round(v)} ${t("maintenance.hourUnit")}`, style: { colors: uiColor("muted"), fontSize: "11px" } } },
  tooltip: { shared: true, intersect: false, y: { formatter: (v) => h(v) } },
}));
// Same thresholds as the dashboard widget: over quota bad, from 75% warn.
const barClass = (u) => (u.overage > 0 ? "bg-ui-bad" : u.used_percent >= 75 ? "bg-ui-warn" : "bg-ui-accent");

const trendSeries = computed(() => [
  { name: t("maintenance.recap.available"), data: trend.value.map((row) => row.total) },
  { name: t("maintenance.recap.used"), data: trend.value.map((row) => row.used) },
]);
</script>

<template>
  <RecapSection storage-key="maintenance-recap-open" :loading="loading" :failed="failed" @retry="load">
    <template v-if="data">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
        <RecapTile v-for="t in tiles" :key="t.key" v-bind="t" />
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 -ml-1 px-1 rounded-ui-control text-ui-cap font-medium text-ui-muted hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
        :aria-expanded="analysisOpen"
        aria-controls="maintenance-recap-analysis"
        @click="toggleAnalysis"
      >
        <ChartPie class="w-3.5 h-3.5" />
        {{ analysisOpen ? $t("maintenance.recap.hideAnalysis") : $t("maintenance.recap.showAnalysis") }}
        <ChevronDown class="w-3.5 h-3.5 transition-transform duration-ui-fast" :class="{ 'rotate-180': analysisOpen }" />
      </button>

      <div v-if="analysisOpen" id="maintenance-recap-analysis" class="ui-anim-fade space-y-3">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Quota use per contract -->
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
          <p class="text-ui-h3 text-ui-ink">{{ $t("maintenance.recap.quotaUsed") }}</p>
          <p class="text-ui-cap text-ui-muted mb-3">{{ $t("maintenance.recap.perContract") }}</p>
          <p v-if="!usage.length" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("maintenance.recap.noActive") }}</p>
          <div v-else class="space-y-3">
            <RouterLink
              v-for="u in usage"
              :key="u.id"
              :to="{ name: 'admin.maintenance.detail', params: { id: u.id } }"
              class="block group/bar"
            >
              <div class="flex items-baseline justify-between gap-2 text-ui-cap mb-1">
                <span class="min-w-0 truncate">
                  <span class="text-ui-ink font-medium group-hover/bar:text-ui-accent">{{ u.name }}</span>
                  <span v-if="u.client" class="text-ui-muted"> · {{ u.client }}</span>
                </span>
                <span class="shrink-0 text-ui-muted tabular-nums">
                  {{ h(u.used) }} / {{ h(u.total) }} ·
                  <strong class="font-medium" :class="u.overage > 0 ? 'text-ui-bad' : u.used_percent >= 75 ? 'text-ui-warn' : 'text-ui-ink'">{{ Math.round(u.used_percent) }}%</strong>
                </span>
              </div>
              <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden">
                <div class="h-full rounded-full" :class="barClass(u)" :style="{ width: `${Math.min(100, Math.max(2, u.used_percent))}%` }"></div>
              </div>
              <p v-if="u.overage > 0" class="text-ui-cap text-ui-bad font-medium mt-0.5 flex items-center gap-1">
                <AlertTriangle class="w-3 h-3" />{{ $t("maintenance.common.overQuota", { hours: h(u.overage) }) }}
              </p>
            </RouterLink>
            <p v-if="data.usage_count > usage.length" class="text-ui-cap text-ui-muted">{{ $t("maintenance.recap.more", { n: data.usage_count - usage.length }) }}</p>
          </div>
        </div>

        <!-- Hours by category -->
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
          <p class="text-ui-h3 text-ui-ink">{{ $t("maintenance.recap.byCategory") }}</p>
          <p class="text-ui-cap text-ui-muted mb-2">{{ $t("maintenance.recap.byCategoryHint") }}</p>
          <p v-if="!slices.length" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("maintenance.recap.noWork") }}</p>
          <div v-else class="flex flex-col sm:flex-row items-center gap-4">
            <div class="w-48 shrink-0">
              <VueApexCharts type="donut" height="200" :options="donutOptions" :series="slices.map((s) => s.hours)" />
            </div>
            <ul class="w-full space-y-2 text-ui-cap">
              <li v-for="s in slices" :key="s.key" class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: s.color }"></span>
                <span class="text-ui-ink font-medium truncate flex-1">{{ s.label }}</span>
                <span class="text-ui-muted shrink-0 tabular-nums">{{ s.count }}×</span>
                <span class="text-ui-ink font-medium shrink-0 tabular-nums text-right">{{ h(s.hours) }}</span>
                <span class="text-ui-muted shrink-0 w-10 text-right tabular-nums">{{ Math.round((s.hours / sliceTotal) * 100) }}%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Trend -->
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
        <p class="text-ui-h3 text-ui-ink">{{ $t("maintenance.recap.trend") }}</p>
        <p class="text-ui-cap text-ui-muted">{{ $t("maintenance.recap.trendHint") }}</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="220" :options="trendOptions" :series="trendSeries" />
        </div>
      </div>
      </div>
    </template>
  </RecapSection>
</template>
