<script setup>
import { computed, defineAsyncComponent } from "vue";
const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import { uiColor } from "@/utils/uiColor";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

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
    animations: { enabled: false },
    fontFamily: "inherit",
  },
  plotOptions: {
    radialBar: {
      hollow: { size: "68%" },
      track: { background: uiColor("subtle") },
      dataLabels: {
        name: { fontSize: "12px", color: uiColor("muted"), offsetY: -10 },
        value: {
          fontSize: "26px",
          fontWeight: 600,
          color: uiColor("ink"),
          offsetY: 5,
          formatter: (value) => `${value}%`,
        },
      },
    },
  },
  fill: { type: "solid" },
  colors: [completionRate.value >= 100 ? uiColor("ok") : uiColor("ink")],
  stroke: { lineCap: "round" },
  labels: ["Task Completion"],
}));

const chartSeries = computed(() => [completionRate.value]);
</script>

<template>
  <div class="h-full bg-ui-surface border border-ui-line rounded-ui-card p-5">
    <div class="mb-3">
      <h3 class="text-ui-h2 text-ui-ink">Project Progress</h3>
      <p class="text-ui-cap text-ui-muted mt-0.5 tabular-nums">
        {{
          loadingStatistics
            ? "Loading..."
            : `${completedTasks} of ${totalTasks} tasks completed across all projects`
        }}
      </p>
    </div>

    <div class="relative w-full" style="height: 230px">
      <Skeleton v-if="loadingStatistics" width="100%" height="100%" rounded="12px" />
      <VueApexCharts
        v-else
        type="radialBar"
        height="230"
        :options="chartOptions"
        :series="chartSeries"
        class="w-full"
      />
    </div>
  </div>
</template>
