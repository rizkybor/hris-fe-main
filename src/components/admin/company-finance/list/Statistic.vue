<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import VueApexCharts from "vue3-apexcharts";
import { TrendingUp, Briefcase, PlayCircle } from "lucide-vue-next";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import { storeToRefs } from "pinia";

// Store
const store = useCompanyFinanceStore();
const { loadingStatistics } = storeToRefs(store);

// Pastikan TypeScript aman
const statisticsData = computed(
  () =>
    (store.statistics as any) || {
      fixed_cost: {
        summary: { total_budget: 0, total_actual: 0, variance: 0 },
        items: [],
      },
      sdm_resource: {
        summary: { total_budget: 0, total_actual: 0, variance: 0 },
        items: [],
      },
      infrastructure: {
        summary: { total_monthly_fee: 0, total_annual_fee: 0 },
        items: [],
      },
      company_balance: "0.00",
    }
);

// Total Budget & Actual per category
const fixedBudget = computed(
  () => statisticsData.value.fixed_cost?.summary?.total_budget || 0
);
const fixedActual = computed(
  () => statisticsData.value.fixed_cost?.summary?.total_actual || 0
);

const sdmBudget = computed(
  () => statisticsData.value.sdm_resource?.summary?.total_budget || 0
);
const sdmActual = computed(
  () => statisticsData.value.sdm_resource?.summary?.total_actual || 0
);

const infraBudget = computed(
  () => statisticsData.value.infrastructure?.summary?.total_monthly_fee || 0
);
const infraActual = computed(
  () => statisticsData.value.infrastructure?.summary?.total_annual_fee || 0
);

// Overall totals
const totalBudget = computed(
  () => fixedBudget.value + sdmBudget.value + infraBudget.value
);
const totalActual = computed(
  () => fixedActual.value + sdmActual.value + infraActual.value
);

onMounted(() => {
  store.fetchStatistics();
});

// Chart setup (dummy data, bisa diganti API nanti)
const chartOptions = ref({
  chart: { type: "area", height: 250, toolbar: { show: false } },
  stroke: { curve: "smooth", width: 3, colors: ["#8A63F9"] },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05,
      stops: [0, 100],
    },
  },
  colors: ["#8A63F9"],
  grid: {
    borderColor: "#f1f1f1",
    strokeDashArray: 0,
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
  },
  xaxis: {
    categories: [
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  },
  yaxis: { min: 0, tickAmount: 8 },
  tooltip: { enabled: true, theme: "light" },
  dataLabels: { enabled: false },
});

const chartSeries = ref([
  {
    name: "Fixed Cost",
    data: [
      fixedActual.value,
      fixedActual.value,
      fixedActual.value,
      fixedActual.value,
      fixedActual.value,
      fixedActual.value,
    ],
  },
  {
    name: "SDM Resource",
    data: [
      sdmActual.value,
      sdmActual.value,
      sdmActual.value,
      sdmActual.value,
      sdmActual.value,
      sdmActual.value,
    ],
  },
  {
    name: "Infrastructure",
    data: [
      infraActual.value,
      infraActual.value,
      infraActual.value,
      infraActual.value,
      infraActual.value,
      infraActual.value,
    ],
  },
]);
</script>

<template>
  <div class="mb-5">
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6 mb-6">
      <!-- Fixed Cost -->
      <div
        class="bg-white border rounded-[20px] p-5 flex flex-col min-h-[186px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300"
      >
        <div class="flex justify-between mb-4">
          <p class="font-medium">Fixed Cost</p>
          <div
            class="w-12 h-12 bg-blue-50 rounded-[16px] flex items-center justify-center"
          >
            <Briefcase class="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div class="mt-auto">
          <p class="text-3xl font-extrabold">
            {{ loadingStatistics ? "-" : fixedActual }}
          </p>
          <p class="text-success text-base font-medium">
            Actual / Budget {{ fixedBudget }}
          </p>
        </div>
      </div>

      <!-- SDM Resource -->
      <div
        class="bg-white border rounded-[20px] p-5 flex flex-col min-h-[186px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300"
      >
        <div class="flex justify-between mb-4">
          <p class="font-medium">SDM Resource</p>
          <div
            class="w-12 h-12 bg-green-50 rounded-[16px] flex items-center justify-center"
          >
            <PlayCircle class="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div class="mt-auto">
          <p class="text-3xl font-extrabold">
            {{ loadingStatistics ? "-" : sdmActual }}
          </p>
          <p class="text-success text-base font-medium">
            Actual / Budget {{ sdmBudget }}
          </p>
        </div>
      </div>

      <!-- Infrastructure -->
      <div
        class="bg-white border rounded-[20px] p-5 flex flex-col min-h-[186px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300"
      >
        <div class="flex justify-between mb-4">
          <p class="font-medium">Infrastructure</p>
          <div
            class="w-12 h-12 bg-purple-50 rounded-[16px] flex items-center justify-center"
          >
            <TrendingUp class="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div class="mt-auto">
          <p class="text-3xl font-extrabold">
            {{ loadingStatistics ? "-" : infraActual }}
          </p>
          <p class="text-success text-base font-medium">Monthly / Annual</p>
        </div>
      </div>

      <!-- Overall -->
      <div
        class="bg-white border rounded-[20px] p-5 flex flex-col min-h-[186px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300"
      >
        <div class="flex justify-between mb-4">
          <p class="font-medium">Overall</p>
          <div
            class="w-12 h-12 bg-yellow-50 rounded-[16px] flex items-center justify-center"
          >
            <Briefcase class="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <div class="mt-auto">
          <p class="text-3xl font-extrabold">
            {{ loadingStatistics ? "-" : totalActual }}
          </p>
          <p class="text-success text-base font-medium">
            Actual / Budget {{ totalBudget }}
          </p>
        </div>
      </div>
    </div>

    <!-- Chart (full width under cards) -->
    <div
      class="xl:col-span-4 bg-white border rounded-[16px] p-4 sm:p-6 hover:shadow-lg transition-shadow duration-300 mt-4"
    >
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-12 h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
        >
          <TrendingUp class="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 class="font-bold text-brand-dark text-lg">
            Operational Cost Trend
          </h3>
          <p class="text-sm text-gray-500">Monthly cost overview by category</p>
        </div>
      </div>
      <div class="relative w-full" style="height: 250px">
        <VueApexCharts
          :options="chartOptions"
          :series="chartSeries"
          type="area"
          height="250"
        />
      </div>
    </div>
  </div>
</template>
