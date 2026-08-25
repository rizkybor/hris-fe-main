<script setup>
import { ref, computed, onMounted } from "vue";
import VueApexCharts from "vue3-apexcharts";
import { BanknoteIcon, Eye, EyeOff } from "lucide-vue-next";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
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
    animations: { enabled: true, easing: "easeinout", speed: 500 },
  },
  plotOptions: {
    bar: { borderRadius: 6, columnWidth: "45%" },
  },
  dataLabels: { enabled: false },
  colors: ["#16A34A"],
  fill: {
    type: "gradient",
    gradient: {
      shade: "light",
      type: "vertical",
      shadeIntensity: 0.3,
      gradientToColors: ["#6EE7B7"],
      stops: [0, 100],
    },
  },
  grid: {
    borderColor: "#f1f1f1",
    padding: { top: 10, right: 10, bottom: 0, left: 10 },
  },
  xaxis: {
    categories: chartCategories.value,
  },
  yaxis: {
    min: 0,
    labels: {
      formatter: (val) => formatRupiahCompact(val),
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
    class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5 hover:shadow-md transition-shadow duration-300"
  >
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      <div class="w-10 h-10 bg-green-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
        <BanknoteIcon class="w-4 h-4 text-green-600" />
      </div>
      <div class="flex-1">
        <h3 class="text-brand-dark text-base font-bold">Project Realized</h3>
        <Skeleton v-if="loadingStatistics" width="140px" height="14px" rounded="4px" class="mt-1" />
        <p v-else class="text-brand-light text-xs flex items-center gap-1.5">
          Total Payment Receipts collected on project invoices:
          <span class="text-brand-dark font-semibold">{{ showAmount ? formatRupiah(totalRealized) : "Rp ••••••••" }}</span>
          <button
            type="button"
            @click="showAmount = !showAmount"
            :aria-label="showAmount ? 'Hide amount' : 'Show amount'"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <EyeOff v-if="showAmount" class="w-3.5 h-3.5" />
            <Eye v-else class="w-3.5 h-3.5" />
          </button>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center bg-gray-100 rounded-[10px] p-1">
          <button
            type="button"
            @click="viewMode = 'monthly'"
            :class="viewMode === 'monthly' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'"
            class="px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all"
          >
            Monthly
          </button>
          <button
            type="button"
            @click="viewMode = 'yearly'"
            :class="viewMode === 'yearly' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'"
            class="px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all"
          >
            Yearly
          </button>
        </div>

        <select
          v-if="viewMode === 'monthly'"
          v-model.number="selectedYear"
          class="px-3 py-2 border border-[#DCDEDD] rounded-[10px] text-sm font-semibold hover:border-[#0C51D9] focus:border-[#0C51D9] transition-all"
        >
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </div>

    <div class="relative w-full" :style="{ height: (compact ? 220 : 280) + 'px' }">
      <Skeleton v-if="loadingStatistics" width="100%" height="100%" rounded="12px" />
      <div v-else-if="!hasData" class="flex flex-col items-center justify-center h-full text-center">
        <BanknoteIcon class="w-10 h-10 text-gray-300 mb-2" />
        <p class="text-sm text-gray-400">No realized value for this {{ viewMode === "monthly" ? "year" : "period" }} yet</p>
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
