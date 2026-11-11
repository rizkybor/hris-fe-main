<script setup>
import { UserPlus, TrendingUp } from "lucide-vue-next";
import { onMounted, ref, watch, defineAsyncComponent } from "vue";
import { useTeamStore } from "@/stores/team";
import { storeToRefs } from "pinia";
const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));
import { UiSpinner } from "@/components/ui";
import { uiColor, uiChartBase } from "@/utils/uiColor";

// Token-driven chart look (grid, axis labels) shared by both charts.
const base = uiChartBase();
const axisLabels = { style: base.axisLabel };

const props = defineProps({
  team: {
    type: Object,
    required: true,
  },
});

const teamStore = useTeamStore();
const { teamChartData, loadingTeamChart } = storeToRefs(teamStore);
const { fetchTeamChartData } = teamStore;

const memberGrowthOptions = ref({
  chart: {
    ...base.chart,
    type: "bar",
    height: 250,
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      borderRadiusApplication: "end",
      columnWidth: "40%",
    },
  },
  colors: [uiColor("accent")],
  dataLabels: base.dataLabels,
  xaxis: {
    categories: [],
    labels: axisLabels,
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      ...axisLabels,
      formatter: (value) => Math.floor(value),
    },
  },
  grid: base.grid,
});

const memberGrowthSeries = ref([
  {
    name: "New Members",
    data: [],
  },
]);

const taskGrowthOptions = ref({
  chart: {
    ...base.chart,
    type: "line",
    height: 250,
  },
  stroke: {
    curve: "smooth",
    width: 2,
  },
  colors: [uiColor("ink")],
  dataLabels: base.dataLabels,
  xaxis: {
    categories: [],
    labels: axisLabels,
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      ...axisLabels,
      formatter: (value) => Math.floor(value),
    },
  },
  grid: base.grid,
  markers: {
    size: 4,
    colors: [uiColor("surface")],
    strokeColors: uiColor("ink"),
    strokeWidth: 2,
    hover: {
      size: 6,
    },
  },
});

const taskGrowthSeries = ref([
  {
    name: "Tasks Assigned",
    data: [],
  },
]);

const updateCharts = () => {
  if (teamChartData.value.months.length > 0) {
    // Update member growth chart
    memberGrowthOptions.value.xaxis.categories = teamChartData.value.months;
    memberGrowthSeries.value = [
      {
        name: "New Members",
        data: teamChartData.value.member_growth,
      },
    ];

    // Update task growth chart
    taskGrowthOptions.value.xaxis.categories = teamChartData.value.months;
    taskGrowthSeries.value = [
      {
        name: "Tasks Assigned",
        data: teamChartData.value.task_growth,
      },
    ];
  }
};

const loadChartData = async () => {
  if (props.team?.id) {
    await fetchTeamChartData(props.team.id);
    updateCharts();
  }
};

onMounted(async () => {
  await loadChartData();
});

watch(() => props.team?.id, async (newId) => {
  if (newId) {
    await loadChartData();
  }
}, { immediate: true });

watch(teamChartData, () => {
  updateCharts();
}, { deep: true });
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
    <!-- Team Growth Chart (Employee Joining) -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
      <div class="flex items-start gap-3 mb-4">
        <UserPlus class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
        <div class="min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">Team Growth</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">
            New members joining over past 4 months
          </p>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="relative">
        <div v-if="loadingTeamChart" class="flex items-center justify-center" style="height: 250px">
          <UiSpinner :center="false" />
        </div>
        <VueApexCharts
          v-else
          type="bar"
          height="250"
          :options="memberGrowthOptions"
          :series="memberGrowthSeries"
        />
      </div>
    </section>

    <!-- Tasks Growth Chart -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
      <div class="flex items-start gap-3 mb-4">
        <TrendingUp class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
        <div class="min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">Tasks Growth</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">
            Tasks assigned to team over past 4 months
          </p>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="relative">
        <div v-if="loadingTeamChart" class="flex items-center justify-center" style="height: 250px">
          <UiSpinner :center="false" />
        </div>
        <VueApexCharts
          v-else
          type="line"
          height="250"
          :options="taskGrowthOptions"
          :series="taskGrowthSeries"
        />
      </div>
    </section>
  </div>
</template>
