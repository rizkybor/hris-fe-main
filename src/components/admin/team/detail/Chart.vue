<script setup>
import { UserPlus, TrendingUp } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, watch, defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
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
  teamId: {
    type: [String, Number],
    default: null,
  },
});

const { t } = useI18n();
const teamStore = useTeamStore();
const { teamChartData, loadingTeamChart: storeLoading, teamChartId } = storeToRefs(teamStore);
const { fetchTeamChartData } = teamStore;

const id = computed(() => props.teamId ?? props.team?.id ?? null);
// Never draw another team's data while this one's loads.
const loadingTeamChart = computed(() => storeLoading.value || (id.value != null && teamChartId.value !== String(id.value)));

// apexcharts (~158 kB gzip) is only downloaded once the charts scroll near
// the viewport, so a visit that never reaches them doesn't pay for it.
const root = ref(null);
const inView = ref(typeof IntersectionObserver === "undefined");
let observer = null;
onMounted(() => {
  if (inView.value || !root.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        inView.value = true;
        observer.disconnect();
      }
    },
    { rootMargin: "200px 0px" }
  );
  observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

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

// Series data is copied in by updateCharts(); the name follows the language.
const memberGrowthData = ref([]);
const memberGrowthSeries = computed(() => [
  { name: t("teams.detail.chart.newMembers"), data: memberGrowthData.value },
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

const taskGrowthData = ref([]);
const taskGrowthSeries = computed(() => [
  { name: t("teams.detail.chart.tasksAssigned"), data: taskGrowthData.value },
]);

const updateCharts = () => {
  if (teamChartData.value?.months?.length > 0) {
    // Update member growth chart
    memberGrowthOptions.value.xaxis.categories = teamChartData.value.months;
    memberGrowthData.value = teamChartData.value.member_growth;

    // Update task growth chart
    taskGrowthOptions.value.xaxis.categories = teamChartData.value.months;
    taskGrowthData.value = teamChartData.value.task_growth;
  }
};

watch(
  () => (props.teamId == null ? props.team?.id : null),
  (teamId) => teamId && fetchTeamChartData(teamId),
  { immediate: true }
);

watch(teamChartData, () => {
  updateCharts();
}, { deep: true, immediate: true });
</script>

<template>
  <div ref="root" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
    <!-- Team Growth Chart (Employee Joining) -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5 sm:p-6 min-w-0">
      <div class="flex items-start gap-3 mb-4">
        <UserPlus class="w-4 h-4 text-ui-faint mt-0.5 shrink-0" />
        <div class="min-w-0">
          <h3 class="text-ui-h3 text-ui-ink">{{ $t("teams.detail.chart.teamGrowth") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">
            {{ $t("teams.detail.chart.teamGrowthHint") }}
          </p>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="relative">
        <div v-if="loadingTeamChart || !inView" class="flex items-center justify-center" style="height: 250px">
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
          <h3 class="text-ui-h3 text-ui-ink">{{ $t("teams.detail.chart.tasksGrowth") }}</h3>
          <p class="text-ui-cap text-ui-muted mt-0.5">
            {{ $t("teams.detail.chart.tasksGrowthHint") }}
          </p>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="relative">
        <div v-if="loadingTeamChart || !inView" class="flex items-center justify-center" style="height: 250px">
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
