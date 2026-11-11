<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from "vue";
const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));
import { BanknoteIcon, Eye, EyeOff, ChevronDown } from "lucide-vue-next";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import { uiColor } from "@/utils/uiColor";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";

const props = defineProps({
  compact: { type: Boolean, default: false },
});

const projectStore = useProjectStore();
const { loadingStatistics } = storeToRefs(projectStore);

onMounted(() => {
  projectStore.fetchStatistics();
});

const showAmount = ref(false);
const totalRealized = computed(() => projectStore.statistics.total_realized ?? 0);
const realizedByMonth = computed(() => projectStore.statistics.realized_by_month ?? []);

const viewMode = ref("monthly");
const currentYear = new Date().getFullYear();
const selectedYear = ref(currentYear);

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const availableYears = computed(() => {
  const years = new Set(realizedByMonth.value.map((item) => Number(item.month.split("-")[0])));
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
});

const monthlySeriesData = computed(() => {
  const map = new Map();
  realizedByMonth.value.forEach((item) => {
    const [y, m] = item.month.split("-");
    if (Number(y) === selectedYear.value) map.set(m, Number(item.total_realized));
  });
  return MONTHS.map((m) => map.get(m) ?? 0);
});

const yearlySeriesEntries = computed(() => {
  const map = new Map();
  realizedByMonth.value.forEach((item) => {
    const y = item.month.split("-")[0];
    map.set(y, (map.get(y) ?? 0) + Number(item.total_realized));
  });
  return Array.from(map.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
});

const chartCategories = computed(() =>
  viewMode.value === "monthly" ? MONTH_LABELS : yearlySeriesEntries.value.map(([y]) => y)
);

const chartSeriesData = computed(() =>
  viewMode.value === "monthly" ? monthlySeriesData.value : yearlySeriesEntries.value.map(([, v]) => v)
);

const hasData = computed(() => chartSeriesData.value.some((v) => v > 0));

const chartOptions = computed(() => ({
  chart: {
    type: "bar",
    height: props.compact ? 220 : 280,
    toolbar: { show: false },
    animations: { enabled: false },
    fontFamily: "inherit",
  },
  plotOptions: {
    bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "45%" },
  },
  dataLabels: { enabled: false },
  colors: [uiColor("ok")],
  grid: {
    borderColor: uiColor("line"),
    padding: { top: 10, right: 10, bottom: 0, left: 10 },
  },
  xaxis: {
    categories: chartCategories.value,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: uiColor("muted"), fontSize: "11px" } },
  },
  yaxis: {
    min: 0,
    labels: {
      formatter: (val) => formatRupiahCompact(val),
      style: { colors: uiColor("muted"), fontSize: "11px" },
    },
  },
  tooltip: {
    y: {
      formatter: (val) => formatRupiah(val),
    },
  },
}));

const chartSeries = computed(() => [{ name: "Realized", data: chartSeriesData.value }]);
</script>

<template>
  <div
    class="h-full bg-ui-surface border border-ui-line rounded-ui-card p-5"
  >
    <div class="flex flex-col gap-3 mb-3">
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <h3 class="text-ui-h2 text-ui-ink">Project Realized</h3>
          <Skeleton v-if="loadingStatistics" width="140px" height="14px" rounded="4px" class="mt-1" />
          <p v-else class="text-ui-cap text-ui-muted flex items-center flex-wrap gap-1.5 mt-0.5">
            Total Payment Receipts collected on project invoices:
            <span class="text-ui-ink font-medium tabular-nums">{{ showAmount ? formatRupiah(totalRealized) : "Rp ••••••••" }}</span>
            <button
              type="button"
              @click="showAmount = !showAmount"
              :aria-label="showAmount ? 'Hide amount' : 'Show amount'"
              class="text-ui-faint hover:text-ui-ink transition-colors"
            >
              <EyeOff v-if="showAmount" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </button>
          </p>
        </div>
      </div>

      <div class="flex items-center flex-wrap gap-2">
        <div class="flex items-center bg-ui-subtle border border-ui-line rounded-ui-control p-0.5" role="tablist">
          <button
            type="button"
            @click="viewMode = 'monthly'"
            :class="viewMode === 'monthly' ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
            class="h-7 px-3 rounded-[6px] text-ui-cap font-medium transition-colors"
          >
            Monthly
          </button>
          <button
            type="button"
            @click="viewMode = 'yearly'"
            :class="viewMode === 'yearly' ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
            class="h-7 px-3 rounded-[6px] text-ui-cap font-medium transition-colors"
          >
            Yearly
          </button>
        </div>

        <div v-if="viewMode === 'monthly'" class="relative">
          <select
            v-model.number="selectedYear"
            class="h-8 pl-3 pr-8 appearance-none bg-ui-surface border border-ui-line-strong rounded-ui-control text-ui-cap font-medium text-ui-ink focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
          >
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
          <ChevronDown
            class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ui-faint pointer-events-none"
          />
        </div>
      </div>
    </div>

    <div class="relative w-full" :style="{ height: (compact ? 220 : 280) + 'px' }">
      <Skeleton v-if="loadingStatistics" width="100%" height="100%" rounded="12px" />
      <div v-else-if="!hasData" class="flex flex-col items-center justify-center h-full text-center">
        <span class="w-10 h-10 rounded-full bg-ui-subtle text-ui-muted flex items-center justify-center mb-3"><BanknoteIcon class="w-5 h-5" /></span>
        <p class="text-ui-small text-ui-muted">No realized value for this {{ viewMode === "monthly" ? "year" : "period" }} yet</p>
      </div>
      <VueApexCharts
        v-else
        type="bar"
        :height="compact ? 220 : 280"
        :options="chartOptions"
        :series="chartSeries"
        class="w-full"
      />
    </div>
  </div>
</template>
