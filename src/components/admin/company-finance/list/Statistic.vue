<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from "vue";
const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));
import { TrendingUp, Briefcase, PlayCircle, Eye, EyeOff, Server } from "lucide-vue-next";
import { UiBadge, UiSelect, UiSkeleton } from "@/components/ui";
import { uiColor } from "@/utils/uiColor";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import { storeToRefs } from "pinia";
import { formatRupiahCompact } from "@/utils/formatUtils";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

// Store
const store = useCompanyFinanceStore();
const { loadingStatistics } = storeToRefs(store);

const statisticsData = computed(() => ({
  fixed_cost: {
    summary: store.statistics?.fixed_cost?.summary ?? {
      total_actual: 0,
      total_items: 0,
    },
    items: store.statistics?.fixed_cost?.items ?? [],
  },
  sdm_resource: {
    summary: store.statistics?.sdm_resource?.summary ?? {
      total_actual: 0,
    },
    items: store.statistics?.sdm_resource?.items ?? [],
  },
  infrastructure: {
    summary: store.statistics?.infrastructure?.summary ?? {
      total_monthly_fee: 0,
      total_annual_fee: 0,
      total_infra_active: 0,
    },
    items: store.statistics?.infrastructure?.items ?? [],
  },

  fixed_cost_byMonth: store.statistics?.fixed_cost_byMonth ?? [],
  sdm_resource_byMonth: store.statistics?.sdm_resource_byMonth ?? [],
  infrastructure_byMonth: store.statistics?.infrastructure_byMonth ?? [],

  company_balance: store.statistics?.company_balance ?? "0.00",
}));

// Fixed Cost
const fixedActual = computed(
  () => statisticsData.value.fixed_cost.summary.total_actual
);

// SDM Resource
const sdmActual = computed(
  () => statisticsData.value.sdm_resource.summary.total_actual
);

// Infrastructure
const infraMonthly = computed(
  () => statisticsData.value.infrastructure.summary.total_monthly_fee
);
const infraAnnual = computed(
  () => statisticsData.value.infrastructure.summary.total_annual_fee
);
const infraActive = computed(
  () => statisticsData.value.infrastructure.summary.total_infra_active
);

const hasStatistics = () => !!store.statistics?.fixed_cost_byMonth?.length || Number(store.statistics?.fixed_cost?.summary?.total_actual) > 0 || Number(store.statistics?.sdm_resource?.summary?.total_actual) > 0;

// Helper format Rupiah
const formatRp = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

// Revisits show the figures already loaded and refresh them quietly.
onMounted(() => {
  store.fetchStatistics({ quiet: hasStatistics() });
});

// Hidden by default -- these figures are sensitive, revealed only on demand.
const isFixedCostVisible = ref(false);
const isSdmResourceVisible = ref(false);
const isInfrastructureVisible = ref(false);

const chartSeries = computed(() => [
  {
    name: t("finance.categories.fixedCost"),
    data: normalizeByYear(
      statisticsData.value.fixed_cost_byMonth,
      "total_actual",
      selectedYear.value
    ),
    color: uiColor("accent"),
  },
  {
    name: t("finance.categories.sdmResource"),
    data: normalizeByYear(
      statisticsData.value.sdm_resource_byMonth,
      "total_actual",
      selectedYear.value
    ),
    color: uiColor("warn"),
  },
  {
    name: t("finance.categories.infrastructure"),
    data: normalizeByYear(
      statisticsData.value.infrastructure_byMonth,
      "total_monthly_fee",
      selectedYear.value
    ),
    color: uiColor("ink"),
  },
]);

const currentYear = new Date().getFullYear();
// v-model:year from the page (kept in its list state); local when unbound.
const selectedYear = defineModel<number>("year", { default: () => new Date().getFullYear() });

const MONTHS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

// Short month names in the selected language (id: Jan … Mei … Des).
const monthLabels = computed(() =>
  MONTHS.map((m) => new Date(2000, Number(m) - 1, 1).toLocaleDateString(localeTag(), { month: "short" }))
);

const normalizeByYear = (data: any[], valueKey: string, year: number) => {
  const map = new Map<string, number>();

  data.forEach((item) => {
    const [y, m] = item.month.split("-");
    if (Number(y) === year) {
      map.set(m, Number(item[valueKey]));
    }
  });

  return MONTHS.map((month) => map.get(month) ?? 0);
};

const chartOptions = computed(() => ({
  chart: {
    type: "area",
    height: 250,
    toolbar: { show: false },
    animations: { enabled: false },
    fontFamily: "inherit",
  },
  stroke: { curve: "smooth", width: 2 },
  fill: { type: "solid", opacity: 0.06 },
  grid: {
    borderColor: uiColor("line"),
    strokeDashArray: 0,
    padding: { top: 8, right: 8, bottom: 0, left: 8 },
  },
  xaxis: {
    categories: monthLabels.value,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: uiColor("muted"), fontSize: "11px" } },
  },
  // Full "Rp10.000.000"-style labels eat too much of the plot width on
  // narrow screens, squeezing the chart itself -- a compact form (Rp10jt)
  // keeps the y-axis narrow at every breakpoint. Tooltips keep the exact
  // full-precision amount since there's no width constraint there.
  yaxis: {
    min: 0,
    labels: {
      formatter: (val: number) => formatRupiahCompact(val),
      style: { colors: uiColor("muted"), fontSize: "11px" },
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) =>
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
        }).format(val),
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "left",
    fontSize: "12px",
    labels: { colors: uiColor("text") },
    markers: { size: 5 },
  },
  markers: { size: 0, hover: { size: 4 } },
  dataLabels: { enabled: false },
}));

// From the earliest year with data to the current (or selected) year.
const yearOptions = computed(() => {
  const years = new Set<number>([currentYear, Number(selectedYear.value)]);
  for (const list of [statisticsData.value.fixed_cost_byMonth, statisticsData.value.sdm_resource_byMonth, statisticsData.value.infrastructure_byMonth]) {
    for (const item of list || []) {
      const y = Number(String(item?.month ?? "").slice(0, 4));
      if (y > 1900) years.add(y);
    }
  }
  // Continuous range (newest first) so a year without data is still pickable.
  const min = Math.min(...years);
  const max = Math.max(...years);
  return Array.from({ length: max - min + 1 }, (_, i) => max - i);
});
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 ui-stagger">
      <!-- Fixed Cost -->
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
        <div class="flex items-center gap-2">
          <Briefcase class="w-4 h-4 text-ui-faint shrink-0" />
          <p class="text-ui-small text-ui-muted truncate flex-1">{{ $t("finance.categories.fixedCost") }}</p>
          <button
            type="button"
            @click="isFixedCostVisible = !isFixedCostVisible"
            class="ui-press w-7 h-7 -mr-1.5 -my-1 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
            :title="isFixedCostVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
            :aria-label="isFixedCostVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
          >
            <Eye v-if="!isFixedCostVisible" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
        <template v-if="isFixedCostVisible">
          <UiSkeleton v-if="loadingStatistics" class="mt-2" width="140px" height="28px" rounded="6px" />
          <p v-else class="text-ui-h1 text-ui-ink tabular-nums mt-1.5 truncate">{{ formatRp(fixedActual) }}</p>
          <p class="text-ui-cap text-ui-muted mt-1 truncate">{{ $t("finance.stats.actualInUse") }}</p>
        </template>
        <template v-else>
          <p class="text-ui-h1 text-ui-ink tabular-nums mt-1.5 tracking-widest truncate">Rp ••••••</p>
          <p class="text-ui-cap text-ui-muted mt-1 truncate">{{ $t("finance.stats.actualInUse") }}</p>
        </template>
      </div>

      <!-- SDM Resource -->
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
        <div class="flex items-center gap-2">
          <PlayCircle class="w-4 h-4 text-ui-faint shrink-0" />
          <p class="text-ui-small text-ui-muted truncate flex-1">{{ $t("finance.categories.sdmResources") }}</p>
          <button
            type="button"
            @click="isSdmResourceVisible = !isSdmResourceVisible"
            class="ui-press w-7 h-7 -mr-1.5 -my-1 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
            :title="isSdmResourceVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
            :aria-label="isSdmResourceVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
          >
            <Eye v-if="!isSdmResourceVisible" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
        <template v-if="isSdmResourceVisible">
          <UiSkeleton v-if="loadingStatistics" class="mt-2" width="140px" height="28px" rounded="6px" />
          <p v-else class="text-ui-h1 text-ui-ink tabular-nums mt-1.5 truncate">{{ formatRp(sdmActual) }}</p>
        </template>
        <p v-else class="text-ui-h1 text-ui-ink tabular-nums mt-1.5 tracking-widest truncate">Rp ••••••</p>
        <p class="text-ui-cap text-ui-muted mt-1 truncate">{{ $t("finance.stats.actualInUse") }}</p>
      </div>

      <!-- Infrastructure -->
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0">
        <div class="flex items-center gap-2">
          <Server class="w-4 h-4 text-ui-faint shrink-0" />
          <p class="text-ui-small text-ui-muted truncate flex-1">{{ $t("finance.categories.infrastructure") }}</p>
          <button
            type="button"
            @click="isInfrastructureVisible = !isInfrastructureVisible"
            class="ui-press w-7 h-7 -mr-1.5 -my-1 rounded-ui-control flex items-center justify-center text-ui-muted hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
            :title="isInfrastructureVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
            :aria-label="isInfrastructureVisible ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
          >
            <Eye v-if="!isInfrastructureVisible" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
        <dl class="mt-2 space-y-1">
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-ui-cap text-ui-muted">{{ $t("finance.stats.monthly") }}</dt>
            <dd class="text-ui-h3 text-ui-ink tabular-nums text-right truncate" :class="isInfrastructureVisible ? '' : 'tracking-widest'">
              {{ isInfrastructureVisible ? (loadingStatistics ? "-" : formatRp(infraMonthly)) : "Rp ••••••" }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-ui-cap text-ui-muted">{{ $t("finance.stats.annual") }}</dt>
            <dd class="text-ui-h3 text-ui-ink tabular-nums text-right truncate" :class="isInfrastructureVisible ? '' : 'tracking-widest'">
              {{ isInfrastructureVisible ? (loadingStatistics ? "-" : formatRp(infraAnnual)) : "Rp ••••••" }}
            </dd>
          </div>
        </dl>
        <UiBadge class="mt-2" tone="neutral">{{ $t("finance.stats.infraInUse") }} <span class="tabular-nums">{{ infraActive }}</span></UiBadge>
      </div>
    </div>

    <!-- Chart (full width under the tiles) -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <TrendingUp class="w-4 h-4 text-ui-faint shrink-0" />
          <div class="min-w-0">
            <h3 class="text-ui-h3 text-ui-ink">{{ $t("finance.stats.trendTitle") }}</h3>
            <p class="text-ui-cap text-ui-muted">{{ $t("finance.stats.trendSubtitle") }}</p>
          </div>
        </div>
        <UiSelect v-model="selectedYear" :options="yearOptions" class="w-full sm:w-[110px]" :aria-label="$t('common.labels.year')" />
      </div>
      <div class="relative w-full" style="height: 250px">
        <VueApexCharts
          :options="chartOptions"
          :series="chartSeries"
          type="area"
          height="250"
          class="w-full"
        />
      </div>
    </section>
  </div>
</template>
