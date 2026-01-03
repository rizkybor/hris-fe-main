<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import VueApexCharts from "vue3-apexcharts";
import { TrendingUp, Briefcase, PlayCircle } from "lucide-vue-next";
import { useCompanyFinanceStore } from "@/stores/companyFinance";
import { storeToRefs } from "pinia";

// Store
const store = useCompanyFinanceStore();
const { loadingStatistics } = storeToRefs(store);

// Pastikan TypeScript aman jika store belum ada data
const statisticsData = computed(
  () =>
    store.statistics || {
      fixed_cost: {
        summary: {
          total_budget: 0,
          total_actual: 0,
          variance: 0,
          total_items: 0,
        },
        items: [],
      },
      sdm_resource: {
        summary: {
          total_budget: 0,
          total_actual: 0,
          variance: 0,
          total_status_green: 0,
          total_status_amber: 0,
          total_status_red: 0,
        },
        items: [],
      },
      infrastructure: {
        summary: {
          total_monthly_fee: 0,
          total_annual_fee: 0,
          total_infra_active: 0,
        },
        items: [],
      },
      company_balance: "0.00",
    }
);

// Fixed Cost
const fixedBudget = computed(
  () => statisticsData.value.fixed_cost.summary.total_budget
);
const fixedActual = computed(
  () => statisticsData.value.fixed_cost.summary.total_actual
);
const fixedVariance = computed(
  () => statisticsData.value.fixed_cost.summary.variance
);

// SDM Resource
const sdmBudget = computed(
  () => statisticsData.value.sdm_resource.summary.total_budget
);
const sdmActual = computed(
  () => statisticsData.value.sdm_resource.summary.total_actual
);
const sdmVariance = computed(
  () => statisticsData.value.sdm_resource.summary.variance
);
const totalStatusGreen = computed(
  () => statisticsData.value.sdm_resource.summary.total_status_green
);
const totalStatusAmber = computed(
  () => statisticsData.value.sdm_resource.summary.total_status_amber
);
const totalStatusRed = computed(
  () => statisticsData.value.sdm_resource.summary.total_status_red
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

// Overall totals
const totalBudget = computed(
  () => fixedBudget.value + sdmBudget.value + infraMonthly.value
);
const totalActual = computed(
  () => fixedActual.value + sdmActual.value + infraAnnual.value
);

// Helper format Rupiah
const formatRp = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

// Fetch statistics on mount
onMounted(() => {
  store.fetchStatistics();
});

// Chart series dinamis berdasarkan data dari store
const chartSeries = computed(() => [
  {
    name: "Fixed Cost",
    data: Array(6).fill(fixedActual.value), // isi per bulan sama, bisa nanti diganti API monthly
    color: "#3B82F6", // biru
  },
  {
    name: "SDM Resource",
    data: Array(6).fill(sdmActual.value),
    color: "#F59E0B", // kuning/orange
  },
  {
    name: "Infrastructure",
    data: Array(6).fill(infraAnnual.value),
    color: "#8B5CF6", // ungu
  },
]);

// Chart options tetap sama, cukup pastikan warna series tidak di-override
const chartOptions = ref({
  chart: { type: "area", height: 250, toolbar: { show: false } },
  stroke: { curve: "smooth", width: 3 },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05,
      stops: [0, 100],
    },
  },
  grid: {
    borderColor: "#f1f1f1",
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
</script>

<template>
  <div class="mb-5">
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 mb-6">
      <!-- Fixed Cost -->
      <div
        class="main-card border rounded-[20px] p-5 flex flex-col min-h-[186px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300"
      >
        <div class="flex justify-between mb-4">
          <p class="text-white font-medium">Fixed Cost</p>
          <div
            class="w-12 h-12 bg-blue-50 rounded-[16px] flex items-center justify-center"
          >
            <Briefcase class="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div class="mt-auto">
          <p class="text-lg font-extrabold text-success">
            {{ loadingStatistics ? "-" : formatRp(fixedActual) }} /
            <span class="text-gray-300">{{
              loadingStatistics ? "-" : formatRp(fixedBudget)
            }}</span>
          </p>
          <p class="text-success text-base font-medium">
            Actual / 
             <span class="text-gray-300">Budget

             </span>
          </p>
          <p
            class="mt-2 text-sm font-semibold px-2 py-1 rounded-lg inline-block"
            :class="{
              'bg-gray-100 text-gray-800': fixedVariance >= 0,
              'bg-red-100 text-red-800': fixedVariance < 0,
            }"
          >
            Variance: {{ loadingStatistics ? "-" : formatRp(fixedVariance) }}
          </p>
        </div>
      </div>

      <!-- SDM Resource -->
      <div
        class="main-card border rounded-[20px] p-5 flex flex-col min-h-[186px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300"
      >
        <div class="flex justify-between mb-4">
          <p class="text-white font-medium">SDM Resources</p>
          <div
            class="w-12 h-12 bg-amber-50 rounded-[16px] flex items-center justify-center"
          >
            <PlayCircle class="w-6 h-6 text-amber-600" />
          </div>
        </div>
        <div class="mt-auto">
          <p class="text-lg font-extrabold text-success">
            {{ loadingStatistics ? "-" : formatRp(sdmActual) }} /
            <span class="text-gray-300">{{
              loadingStatistics ? "-" : formatRp(sdmBudget)
            }}</span>
          </p>
          <p class="text-success text-base font-medium">
            Actual / 
             <span class="text-gray-300">Budget

             </span>
          </p>
          <!-- Divider tipis -->
          <div class="my-2 border-t border-gray-200"></div>

          <div class="mt-2 flex gap-2 text-sm font-medium">
            <span
              class="px-3 py-1 rounded-full bg-green-100 text-green-800 shadow-sm"
            >
              Green: {{ totalStatusGreen }}
            </span>
            <span
              class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 shadow-sm"
            >
              Amber: {{ totalStatusAmber }}
            </span>
            <span
              class="px-3 py-1 rounded-full bg-red-100 text-red-800 shadow-sm"
            >
              Red: {{ totalStatusRed }}
            </span>
          </div>

          <p
            class="mt-2 text-sm font-semibold px-2 py-1 rounded-lg inline-block"
            :class="{
              'bg-gray-100 text-gray-800': sdmVariance >= 0,
              'bg-red-100 text-red-800': sdmVariance < 0,
            }"
          >
            Variance: {{ loadingStatistics ? "-" : formatRp(sdmVariance) }}
          </p>
        </div>
      </div>

      <!-- Infrastructure -->
      <div
        class="main-card border rounded-[20px] p-5 flex flex-col min-h-[186px] hover:border-[#0C51D9] hover:border-2 hover:shadow-lg transition-all duration-300"
      >
        <div class="flex justify-between mb-4">
          <p class="text-white font-medium">Infrastructure</p>
          <div
            class="w-12 h-12 bg-purple-50 rounded-[16px] flex items-center justify-center"
          >
            <TrendingUp class="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div class="mt-auto space-y-1">
          <p class="text-base font-medium text-gray-300">
            Monthly: {{ loadingStatistics ? "-" : formatRp(infraMonthly) }}
          </p>
          <p class="text-base font-medium text-gray-300">
            Annual: {{ loadingStatistics ? "-" : formatRp(infraAnnual) }}
          </p>
          <p
            class="text-sm font-medium inline-block px-2 py-1 rounded bg-gray-100 text-gray-800"
          >
            Infrastructure Active: {{ infraActive }}
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
