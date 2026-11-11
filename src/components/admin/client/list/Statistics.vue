<script setup lang="ts">
import { ref, computed, onMounted, watch, defineAsyncComponent } from "vue";
const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));
import { TrendingUp, Briefcase, Layers, Code } from "lucide-vue-next";
import { useClientStore } from "@/stores/client";
import { storeToRefs } from "pinia";
import { UiStat } from "@/components/ui";

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
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 ui-stagger">
    <!-- Total clients -->
    <UiStat
      class="sm:col-span-2 xl:col-span-1"
      :label="$t('clients.stats.total')"
      :icon="Briefcase"
      :value="totalClient"
      :hint="$t('clients.stats.totalHint')"
      :loading="loading && !statistics"
    />

    <!-- By type / by field -->
    <section
      v-for="group in [
        { title: $t('clients.stats.byType'), icon: Layers, rows: clientsByType, key: 'type' },
        { title: $t('clients.stats.byField'), icon: Code, rows: clientsByField, key: 'field' },
      ]"
      :key="group.key"
      class="bg-ui-surface border border-ui-line rounded-ui-card px-5 py-4 min-w-0"
    >
      <div class="flex items-center gap-2 mb-2">
        <component :is="group.icon" class="w-4 h-4 text-ui-faint shrink-0" />
        <p class="text-ui-small text-ui-muted truncate">{{ group.title }}</p>
      </div>
      <ul v-if="group.rows.length" class="max-h-[132px] overflow-y-auto -mx-1 px-1 divide-y divide-ui-line">
        <li v-for="item in group.rows" :key="item[group.key]" class="flex items-center justify-between gap-3 py-1.5 text-ui-small">
          <span class="text-ui-text truncate">{{ item[group.key] }}</span>
          <span class="text-ui-ink font-medium tabular-nums">{{ item.total }}</span>
        </li>
      </ul>
      <p v-else class="text-ui-small text-ui-faint py-1.5">{{ $t("common.states.noData") }}</p>
      <p v-if="group.key === 'field' && clientsByField.length > 5" class="text-ui-cap text-ui-faint mt-1">{{ $t("clients.stats.scrollMore") }}</p>
    </section>
  </div>
</template>
