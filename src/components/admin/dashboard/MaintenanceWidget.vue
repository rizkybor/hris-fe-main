<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiEmpty } from "@/components/ui";
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { Wrench, AlertTriangle } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatHours } from "@/utils/maintenance";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { uiColor } from "@/utils/uiColor";

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// This month's quota use per active contract, and hours used per month over
// the last six months.
const data = ref(null);
const loading = ref(true);
const failed = ref(false);

onMounted(async () => {
  try {
    data.value = (await axiosInstance.get("/dashboard/insights/maintenance")).data.data;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const trend = computed(() => data.value?.trend ?? []);
const usedPercent = computed(() => (data.value?.total ? Math.round((data.value.used / data.value.total) * 100) : 0));

const series = computed(() => [{ name: "Hours used", data: trend.value.map((t) => t.used) }]);
const chartOptions = computed(() => ({
  chart: { type: "bar", height: 170, toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "38%" } },
  dataLabels: { enabled: false },
  colors: [uiColor("accent")],
  states: { hover: { filter: { type: "darken", value: 0.9 } } },
  grid: { borderColor: uiColor("line"), strokeDashArray: 0, padding: { left: 4, right: 4 } },
  xaxis: {
    categories: trend.value.map((t) => MONTHS[Number(t.month.slice(5, 7)) - 1]),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: uiColor("muted"), fontSize: "11px" } },
  },
  yaxis: { tickAmount: 3, labels: { formatter: (v) => `${Math.round(v)} h`, style: { colors: uiColor("muted"), fontSize: "11px" } } },
  tooltip: {
    custom: ({ dataPointIndex }) => {
      const t = trend.value[dataPointIndex];
      const [y, m] = t.month.split("-");
      return `<div style="padding:8px 10px;font-size:12px;color:${uiColor("ink")}">
        <div style="color:${uiColor("muted")}">${MONTHS[Number(m) - 1]} ${y}</div>
        <div style="font-weight:700">${formatHours(t.used)} used</div>
        <div style="color:${uiColor("muted")}">of ${formatHours(t.total)} quota</div></div>`;
    },
  },
}));

const barColor = (p) => (p.overage > 0 ? uiColor("bad") : p.used_percent >= 75 ? uiColor("warn") : uiColor("accent"));
</script>

<template>
  <DashboardWidgetCard title="Maintenance" subtitle="Quota used this month" :to="{ name: 'admin.maintenance.dashboard' }">
    <div v-if="loading" class="space-y-3">
      <Skeleton height="64px" rounded="10px" />
      <Skeleton height="160px" rounded="10px" />
    </div>
    <p v-else-if="failed" class="text-ui-small text-ui-muted py-8 text-center">Couldn't load maintenance data.</p>
    <UiEmpty v-else-if="!data.active_count" :icon="Wrench" title="No active maintenance contracts yet." compact />

    <div v-else class="flex flex-col h-full">
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
          <p class="text-ui-cap text-ui-muted truncate">Used this month</p>
          <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ formatHours(data.used) }}</p>
          <p class="text-ui-cap text-ui-muted truncate">of {{ formatHours(data.total) }} · {{ usedPercent }}%</p>
        </div>
        <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
          <p class="text-ui-cap text-ui-muted truncate">Over quota</p>
          <p class="text-ui-h3 tabular-nums mt-0.5" :class="data.over_count ? 'text-ui-bad' : 'text-ui-ink'">{{ data.over_count }}</p>
          <p class="text-ui-cap text-ui-muted truncate">of {{ data.active_count }} contracts</p>
        </div>
        <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
          <p class="text-ui-cap text-ui-muted truncate">Dev. balance</p>
          <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ formatHours(data.balance) }}</p>
          <p v-if="data.expiring > 0" class="text-ui-cap text-ui-warn flex items-center gap-0.5 truncate"><AlertTriangle class="w-3 h-3 shrink-0" /> {{ formatHours(data.expiring) }} expiring</p>
        </div>
      </div>

      <div class="space-y-3 mb-3">
        <RouterLink v-for="c in data.contracts" :key="c.id" :to="{ name: 'admin.maintenance.detail', params: { id: c.id } }" class="block group/row">
          <div class="flex items-baseline justify-between gap-2 text-ui-cap mb-1">
            <span class="text-ui-ink font-medium truncate group-hover/row:text-ui-accent">
              {{ c.name }}<span class="text-ui-muted font-normal"> · {{ c.client }}</span>
            </span>
            <span class="shrink-0 text-ui-muted tabular-nums">
              {{ formatHours(c.period.used) }} / {{ formatHours(c.period.total) }}
              <strong v-if="c.period.overage > 0" class="text-ui-bad font-medium">· {{ formatHours(c.period.overage) }} over</strong>
            </span>
          </div>
          <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden">
            <div class="h-full rounded-full" :style="{ width: `${Math.min(c.period.used_percent, 100)}%`, backgroundColor: barColor(c.period) }"></div>
          </div>
        </RouterLink>
      </div>

      <div class="border-t border-ui-line pt-3 mt-auto">
        <p class="text-ui-cap text-ui-muted">Hours used per month (all contracts)</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="170" :options="chartOptions" :series="series" />
        </div>
      </div>
    </div>
  </DashboardWidgetCard>
</template>
