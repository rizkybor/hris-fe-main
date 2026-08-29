<script setup>
import { computed, defineAsyncComponent } from "vue";
const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));
import { TrendingUp } from "lucide-vue-next";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";

const projectStore = useProjectStore();
const { loadingStatistics } = storeToRefs(projectStore);

const completionRate = computed(() => projectStore.statistics.completion_rate ?? 0);
const completedTasks = computed(() => projectStore.statistics.completed_tasks ?? 0);
const totalTasks = computed(() => projectStore.statistics.total_tasks ?? 0);

const chartOptions = computed(() => ({
  chart: {
    type: "radialBar",
    height: 230,
    toolbar: { show: false },
    animations: { enabled: true, easing: "easeinout", speed: 800 },
  },
  plotOptions: {
    radialBar: {
      hollow: { size: "65%" },
      track: { background: "#f1f1f1" },
      dataLabels: {
        name: { fontSize: "13px", color: "#6B7280", offsetY: -10 },
        value: {
          fontSize: "28px",
          fontWeight: 700,
          color: "#1F2937",
          offsetY: 5,
          formatter: (value) => `${value}%`,
        },
      },
    },
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      shadeIntensity: 0.3,
      gradientToColors: ["#8A63F9"],
      stops: [0, 100],
    },
  },
  colors: ["#0C51D9"],
  stroke: { lineCap: "round" },
  labels: ["Task Completion"],
}));

const chartSeries = computed(() => [completionRate.value]);
</script>

<template>
  <div
    class="h-full bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-4 sm:p-5 hover:shadow-md transition-shadow duration-300"
  >
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
      <div class="w-10 h-10 bg-purple-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
        <TrendingUp class="w-4 h-4 text-purple-600" />
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-brand-dark text-base font-bold">Project Progress</h3>
        <p class="text-brand-light text-xs">
          {{
            loadingStatistics
              ? "Loading..."
              : `${completedTasks} of ${totalTasks} tasks completed across all projects`
          }}
        </p>
      </div>
    </div>

    <div class="relative w-full" style="height: 230px">
      <VueApexCharts
        type="radialBar"
        height="230"
        :options="chartOptions"
        :series="chartSeries"
        class="w-full"
      />
    </div>
  </div>
</template>
