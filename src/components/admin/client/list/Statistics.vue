<script setup lang="ts">
import { ref, computed, onMounted, watch, defineAsyncComponent } from "vue";
const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));
import { TrendingUp, Briefcase, Layers, Code } from "lucide-vue-next";
import { useClientStore } from "@/stores/client";
import { storeToRefs } from "pinia";

/* ================= STORE ================= */
const clientStore = useClientStore();
const { loading, statistics } = storeToRefs(clientStore);

/* ================= FETCH ================= */
onMounted(() => {
  clientStore.fetchClientStatistics();
});

/* ================= COMPUTED ================= */
const totalClient = computed(
  () => statistics.value?.summary?.total_clients ?? 0
);

const clientsByType = computed(() => statistics.value?.by_type ?? []);

const clientsByField = computed(() => statistics.value?.by_field ?? []);

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
    name: "Client",
    data: [],
  },
]);

/* ================= WATCH ================= */
watch(
  clientsByType,
  (val) => {
    chartOptions.value.xaxis.categories = val.map((item: any) => item.type);

    chartSeries.value = [
      {
        name: "Client",
        data: val.map((item: any) => item.total),
      },
    ];
  },
  { immediate: true }
);
</script>

<template>
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-3.5 lg:gap-5 mb-5">
    <!-- ================= TOTAL CLIENTS ================= -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
      <div class="flex items-center justify-between mb-3.5">
        <p class="text-brand-dark text-sm font-medium">Total Client</p>
        <Briefcase class="w-6 h-6 text-blue-600" />
      </div>

      <p class="text-brand-dark text-xl font-extrabold">
        {{ loading ? "-" : totalClient }}
      </p>
      <p class="text-success text-sm font-medium">Registered clients</p>
    </div>

    <!-- ================= BY TYPE ================= -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
      <div class="flex items-center gap-1.5 mb-3.5">
        <Layers class="w-5 h-5 text-purple-600" />
        <p class="text-brand-dark text-sm font-medium">Client by Type</p>
      </div>

      <!-- LIST CONTAINER -->
      <ul
        class="space-y-1.5 max-h-[180px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        <li
          v-for="item in clientsByType"
          :key="item.type"
          class="flex justify-between items-center text-sm bg-gray-50 rounded-md px-2.5 py-1.5 hover:bg-gray-100 transition"
        >
          <span class="text-brand-dark truncate">
            {{ item.type }}
          </span>
          <span class="font-semibold text-brand-dark">
            {{ item.total }}
          </span>
        </li>
      </ul>

      <p v-if="!clientsByType.length" class="text-brand-light text-sm mt-1.5">
        No data
      </p>
    </div>

    <!-- ================= BY FIELD ================= -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
      <div class="flex items-center gap-1.5 mb-3.5">
        <Code class="w-5 h-5 text-green-600" />
        <p class="text-brand-dark text-sm font-medium">Client by Field</p>
      </div>

      <!-- LIST CONTAINER -->
      <ul
        class="space-y-1.5 max-h-[180px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        <li
          v-for="item in clientsByField"
          :key="item.field"
          class="flex justify-between items-center text-sm bg-gray-50 rounded-md px-2.5 py-1.5 hover:bg-gray-100 transition"
        >
          <span class="text-brand-dark truncate">
            {{ item.field }}
          </span>
          <span class="font-semibold text-brand-dark">
            {{ item.total }}
          </span>
        </li>
      </ul>

      <p v-if="!clientsByField.length" class="text-brand-light text-sm mt-1.5">
        No data
      </p>

      <!-- OPTIONAL: Scroll hint -->
      <p v-if="clientsByField.length > 5" class="text-xs text-gray-400 mt-1.5">
        Scroll to see more
      </p>
    </div>

    <!-- ================= CHART (BY TYPE) ================= -->
    <!-- <div
      class="xl:col-span-3 bg-white border border-[#DCDEDD] rounded-[12px] p-3.5 sm:p-5"
    >
      <div class="flex items-center gap-2.5 mb-5">
        <TrendingUp class="w-6 h-6 text-purple-600" />
        <div>
          <h3 class="text-brand-dark text-sm font-bold">
            Client Statistics Chart
          </h3>
          <p class="text-brand-light text-sm">
            Client distribution by type
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
