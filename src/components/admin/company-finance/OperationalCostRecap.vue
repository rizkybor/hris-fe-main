<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { Sigma, Briefcase, Users, Server, ChartPie, ChevronDown, Eye, EyeOff } from "lucide-vue-next";
import { UiSelect } from "@/components/ui";
import RecapSection from "@/components/common/RecapSection.vue";
import RecapTile from "@/components/common/RecapTile.vue";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { uiColor } from "@/utils/uiColor";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

const store = useCompanyFinanceStore();

// v-model:year from the page (kept in its list state).
const selectedYear = defineModel("year", { type: [Number, String], default: () => new Date().getFullYear() });

const hasStatistics = () =>
  !!store.statistics?.fixed_cost_byMonth?.length ||
  Number(store.statistics?.fixed_cost?.summary?.total_actual) > 0 ||
  Number(store.statistics?.sdm_resource?.summary?.total_actual) > 0;
// Revisits show the figures already loaded and refresh them quietly.
const load = () => store.fetchStatistics({ quiet: hasStatistics() });
onMounted(load);

const num = (v) => Number(v) || 0;
const summary = computed(() => {
  const s = store.statistics ?? {};
  const fixed = num(s.fixed_cost?.summary?.total_actual);
  const sdm = num(s.sdm_resource?.summary?.total_actual);
  const infraMonthly = num(s.infrastructure?.summary?.total_monthly_fee);
  return {
    fixed,
    fixedItems: num(s.fixed_cost?.summary?.total_items),
    sdm,
    infraMonthly,
    infraAnnual: num(s.infrastructure?.summary?.total_annual_fee),
    infraActive: num(s.infrastructure?.summary?.total_infra_active),
    total: fixed + sdm + infraMonthly,
  };
});

// Amounts are sensitive: hidden on every visit until revealed (one toggle
// for all tiles; counts stay visible).
const amountsVisible = ref(false);
const MASK = "Rp ••••••";
const money = (v) => (amountsVisible.value ? formatRupiah(v) : MASK);
const maskedClass = computed(() => (amountsVisible.value ? "text-ui-ink" : "text-ui-ink tracking-widest"));

const tiles = computed(() => {
  const d = summary.value;
  return [
    { key: "total", label: t("finance.recap.totalMonthly"), value: money(d.total), sub: t("finance.recap.totalHint"), icon: Sigma, valueClass: maskedClass.value },
    { key: "fixed", label: t("finance.categories.fixedCost"), value: money(d.fixed), sub: t("finance.recap.itemsInUse", { n: d.fixedItems }, d.fixedItems), icon: Briefcase, valueClass: maskedClass.value },
    { key: "sdm", label: t("finance.categories.sdmResources"), value: money(d.sdm), sub: t("finance.recap.inUseOnly"), icon: Users, valueClass: maskedClass.value },
    {
      key: "infra",
      label: t("finance.categories.infrastructure"),
      value: money(d.infraMonthly),
      sub: t("finance.recap.infraSub", { amount: amountsVisible.value ? formatRupiahCompact(d.infraAnnual) : MASK, n: d.infraActive }),
      icon: Server,
      valueClass: maskedClass.value,
    },
  ];
});

const ANALYSIS_KEY = "operational-costs-recap-analysis-open";
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

// ----- Trend (monthly, per category, selected year) -----
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const monthLabels = computed(() => MONTHS.map((m) => new Date(2000, Number(m) - 1, 1).toLocaleDateString(localeTag(), { month: "short" })));
const normalizeByYear = (data, valueKey, year) => {
  const map = new Map();
  (data || []).forEach((item) => {
    const [y, m] = String(item.month ?? "").split("-");
    if (Number(y) === Number(year)) map.set(m, Number(item[valueKey]));
  });
  return MONTHS.map((month) => map.get(month) ?? 0);
};
const chartSeries = computed(() => {
  const s = store.statistics ?? {};
  return [
    { name: t("finance.categories.fixedCost"), data: normalizeByYear(s.fixed_cost_byMonth, "total_actual", selectedYear.value), color: uiColor("accent") },
    { name: t("finance.categories.sdmResource"), data: normalizeByYear(s.sdm_resource_byMonth, "total_actual", selectedYear.value), color: uiColor("warn") },
    { name: t("finance.categories.infrastructure"), data: normalizeByYear(s.infrastructure_byMonth, "total_monthly_fee", selectedYear.value), color: uiColor("ink") },
  ];
});
const chartOptions = computed(() => ({
  chart: { type: "area", height: 250, toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  stroke: { curve: "smooth", width: 2 },
  fill: { type: "solid", opacity: 0.06 },
  grid: { borderColor: uiColor("line"), strokeDashArray: 0, padding: { top: 8, right: 8, bottom: 0, left: 8 } },
  xaxis: {
    categories: monthLabels.value,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: uiColor("muted"), fontSize: "11px" } },
  },
  // Compact y labels (Rp10.0M) keep the axis narrow on phones; the tooltip
  // has the exact amount.
  yaxis: { min: 0, labels: { formatter: (v) => formatRupiahCompact(v), style: { colors: uiColor("muted"), fontSize: "11px" } } },
  tooltip: { shared: true, intersect: false, y: { formatter: (v) => formatRupiah(v) } },
  legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: uiColor("text") }, markers: { size: 5 } },
  markers: { size: 0, hover: { size: 4 } },
  dataLabels: { enabled: false },
}));

// From the earliest year with data to the current (or selected) year, as a
// continuous range (newest first) so a year without data is still pickable.
const yearOptions = computed(() => {
  const s = store.statistics ?? {};
  const years = new Set([new Date().getFullYear(), Number(selectedYear.value)]);
  for (const list of [s.fixed_cost_byMonth, s.sdm_resource_byMonth, s.infrastructure_byMonth]) {
    for (const item of list || []) {
      const y = Number(String(item?.month ?? "").slice(0, 4));
      if (y > 1900) years.add(y);
    }
  }
  const min = Math.min(...years);
  const max = Math.max(...years);
  return Array.from({ length: max - min + 1 }, (_, i) => max - i);
});
</script>

<template>
  <RecapSection
    storage-key="operational-costs-recap-open"
    :loading="store.loadingStatistics && !hasStatistics()"
    :failed="store.statisticsFailed && !hasStatistics()"
    @retry="load"
  >
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
      <RecapTile v-for="tile in tiles" :key="tile.key" v-bind="tile" />
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 -ml-1 px-1 rounded-ui-control text-ui-cap font-medium text-ui-muted hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
        :aria-expanded="analysisOpen"
        aria-controls="operational-costs-recap-analysis"
        @click="toggleAnalysis"
      >
        <ChartPie class="w-3.5 h-3.5" />
        {{ analysisOpen ? $t("finance.recap.hideAnalysis") : $t("finance.recap.showAnalysis") }}
        <ChevronDown class="w-3.5 h-3.5 transition-transform duration-ui-fast" :class="{ 'rotate-180': analysisOpen }" />
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-1 rounded-ui-control text-ui-cap font-medium text-ui-muted hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
        :aria-pressed="amountsVisible"
        @click="amountsVisible = !amountsVisible"
      >
        <EyeOff v-if="amountsVisible" class="w-3.5 h-3.5" />
        <Eye v-else class="w-3.5 h-3.5" />
        {{ amountsVisible ? $t("common.actions.hideAmounts") : $t("common.actions.showAmounts") }}
      </button>
    </div>

    <div v-if="analysisOpen" id="operational-costs-recap-analysis" class="ui-anim-fade">
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
          <div class="min-w-0">
            <p class="text-ui-h3 text-ui-ink">{{ $t("finance.stats.trendTitle") }}</p>
            <p class="text-ui-cap text-ui-muted">{{ $t("finance.stats.trendSubtitle") }}</p>
          </div>
          <UiSelect v-model="selectedYear" :options="yearOptions" class="w-full sm:w-[110px] shrink-0" :aria-label="$t('common.labels.year')" />
        </div>
        <div class="-mx-2" style="min-height: 250px">
          <VueApexCharts type="area" height="250" :options="chartOptions" :series="chartSeries" />
        </div>
      </div>
    </div>
  </RecapSection>
</template>
