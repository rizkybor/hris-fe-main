<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import VueApexCharts from "vue3-apexcharts";
import { TrendingUp, Briefcase, Layers, Code } from "lucide-vue-next";
import { useVendorsStore } from "@/stores/vendor";
import { storeToRefs } from "pinia";

/* ================= STORE ================= */
const vendorStore = useVendorsStore();
const { loading, statistics } = storeToRefs(vendorStore);

/* ================= FETCH ================= */
onMounted(() => {
  vendorStore.fetchVendorsStatistics();
});

/* ================= COMPUTED ================= */
const totalVendors = computed(
  () => statistics.value?.summary?.total_vendors ?? 0
);

const vendorsByType = computed(() => statistics.value?.by_type ?? []);

const vendorsByField = computed(() => statistics.value?.by_field ?? []);

/* ================= CHART ================= */
const chartOptions = ref({
  chart: {
    type: "area",
    height: 250,
    toolbar: { show: false },
  },
  stroke: {
    curve: "smooth",
    width: 3,
    colors: ["#8A63F9"],
  },
  fill: {
    type: "gradient",
    gradient: {
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
    categories: [],
    labels: {
      style: {
        colors: "#6B7280",
        fontSize: "12px",
      },
    },
  },
  yaxis: {
    min: 0,
    tickAmount: 5,
    labels: {
      style: {
        colors: "#6B7280",
        fontSize: "12px",
      },
    },
  },
  dataLabels: { enabled: false },
  legend: { show: false },
});

/* ================= SERIES ================= */
const chartSeries = ref([
  {
    name: "Vendors",
    data: [],
  },
]);

/* ================= WATCH ================= */
watch(
  vendorsByType,
  (val) => {
    chartOptions.value.xaxis.categories = val.map((item: any) => item.type);

    chartSeries.value = [
      {
        name: "Vendors",
        data: val.map((item: any) => item.total),
      },
    ];
  },
  { immediate: true }
);
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 mb-6">
    <!-- ================= TOTAL VENDORS ================= -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
      <div class="flex items-center justify-between mb-4">
        <p class="text-brand-dark text-base font-medium">Total Vendors</p>
        <Briefcase class="w-6 h-6 text-blue-600" />
      </div>

      <p class="text-brand-dark text-3xl font-extrabold">
        {{ loading ? "-" : totalVendors }}
      </p>
      <p class="text-success text-base font-medium">Registered vendors</p>
    </div>

    <!-- ================= BY TYPE ================= -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
      <div class="flex items-center gap-2 mb-4">
        <Layers class="w-5 h-5 text-purple-600" />
        <p class="text-brand-dark text-base font-medium">Vendors by Type</p>
      </div>

      <!-- LIST CONTAINER -->
      <ul
        class="space-y-2 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        <li
          v-for="item in vendorsByType"
          :key="item.type"
          class="flex justify-between items-center text-sm bg-gray-50 rounded-md px-3 py-2 hover:bg-gray-100 transition"
        >
          <span class="text-brand-dark truncate">
            {{ item.type }}
          </span>
          <span class="font-semibold text-brand-dark">
            {{ item.total }}
          </span>
        </li>
      </ul>

      <p v-if="!vendorsByType.length" class="text-brand-light text-sm mt-2">
        No data
      </p>
    </div>

    <!-- ================= BY FIELD ================= -->
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
      <div class="flex items-center gap-2 mb-4">
        <Code class="w-5 h-5 text-green-600" />
        <p class="text-brand-dark text-base font-medium">Vendors by Field</p>
      </div>

      <!-- LIST CONTAINER -->
      <ul
        class="space-y-2 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        <li
          v-for="item in vendorsByField"
          :key="item.field"
          class="flex justify-between items-center text-sm bg-gray-50 rounded-md px-3 py-2 hover:bg-gray-100 transition"
        >
          <span class="text-brand-dark truncate">
            {{ item.field }}
          </span>
          <span class="font-semibold text-brand-dark">
            {{ item.total }}
          </span>
        </li>
      </ul>

      <p v-if="!vendorsByField.length" class="text-brand-light text-sm mt-2">
        No data
      </p>

      <!-- OPTIONAL: Scroll hint -->
      <p v-if="vendorsByField.length > 5" class="text-xs text-gray-400 mt-2">
        Scroll to see more
      </p>
    </div>

    <!-- ================= CHART (BY TYPE) ================= -->
    <!-- <div
      class="xl:col-span-3 bg-white border border-[#DCDEDD] rounded-[16px] p-4 sm:p-6"
    >
      <div class="flex items-center gap-3 mb-6">
        <TrendingUp class="w-6 h-6 text-purple-600" />
        <div>
          <h3 class="text-brand-dark text-lg font-bold">
            Vendor Statistics Chart
          </h3>
          <p class="text-brand-light text-sm">
            Vendors distribution by type
          </p>
        </div>
      </div>

      <VueApexCharts
        type="area"
        height="250"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div> -->
  </div>
</template>
