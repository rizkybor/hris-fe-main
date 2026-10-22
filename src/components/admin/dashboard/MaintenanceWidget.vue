<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { Wrench, ArrowRight, AlertTriangle } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatHours } from "@/utils/maintenance";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

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
  colors: ["#0C51D9"],
  states: { hover: { filter: { type: "darken", value: 0.9 } } },
  grid: { borderColor: "#EEF1F5", strokeDashArray: 0, padding: { left: 4, right: 4 } },
  xaxis: {
    categories: trend.value.map((t) => MONTHS[Number(t.month.slice(5, 7)) - 1]),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: "#64748B", fontSize: "11px" } },
  },
  yaxis: { tickAmount: 3, labels: { formatter: (v) => `${Math.round(v)} h`, style: { colors: "#64748B", fontSize: "11px" } } },
  tooltip: {
    custom: ({ dataPointIndex }) => {
      const t = trend.value[dataPointIndex];
      const [y, m] = t.month.split("-");
      return `<div style="padding:8px 10px;font-size:12px;color:#0f172a">
        <div style="color:#64748b">${MONTHS[Number(m) - 1]} ${y}</div>
        <div style="font-weight:700">${formatHours(t.used)} used</div>
        <div style="color:#64748b">of ${formatHours(t.total)} quota</div></div>`;
    },
  },
}));

const barColor = (p) => (p.overage > 0 ? "#DC2626" : p.used_percent >= 75 ? "#D97706" : "#0C51D9");
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5 h-full flex flex-col">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 bg-teal-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Wrench class="w-5 h-5 text-teal-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Maintenance</h3>
          <p class="text-brand-light text-xs">Quota used this month</p>
        </div>
      </div>
      <RouterLink :to="{ name: 'admin.maintenance.dashboard' }" class="text-sm font-semibold text-[#0C51D9] hover:underline flex items-center gap-1 shrink-0">
        View all <ArrowRight class="w-3.5 h-3.5" />
      </RouterLink>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton height="56px" rounded="10px" />
      <Skeleton height="160px" rounded="10px" />
    </div>
    <div v-else-if="failed" class="text-sm text-gray-500 py-8 text-center">Couldn't load maintenance data.</div>
    <div v-else-if="!data.active_count" class="text-sm text-gray-500 py-8 text-center">No active maintenance contracts yet.</div>

    <template v-else>
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="rounded-[10px] bg-slate-50 px-3 py-2">
          <p class="text-[11px] text-brand-light">Used this month</p>
          <p class="text-brand-dark text-base font-bold">{{ formatHours(data.used) }}</p>
          <p class="text-[11px] text-brand-light">of {{ formatHours(data.total) }} · {{ usedPercent }}%</p>
        </div>
        <div class="rounded-[10px] bg-slate-50 px-3 py-2">
          <p class="text-[11px] text-brand-light">Over quota</p>
          <p class="text-base font-bold" :class="data.over_count ? 'text-red-600' : 'text-brand-dark'">{{ data.over_count }}</p>
          <p class="text-[11px] text-brand-light">of {{ data.active_count }} contracts</p>
        </div>
        <div class="rounded-[10px] bg-slate-50 px-3 py-2">
          <p class="text-[11px] text-brand-light">Dev. balance</p>
          <p class="text-brand-dark text-base font-bold">{{ formatHours(data.balance) }}</p>
          <p v-if="data.expiring > 0" class="text-[11px] text-amber-700 flex items-center gap-0.5"><AlertTriangle class="w-3 h-3" /> {{ formatHours(data.expiring) }} expiring</p>
        </div>
      </div>

      <div class="space-y-2.5 mb-3">
        <RouterLink
          v-for="c in data.contracts"
          :key="c.id"
          :to="{ name: 'admin.maintenance.detail', params: { id: c.id } }"
          class="block group/row"
        >
          <div class="flex items-baseline justify-between gap-2 text-xs mb-1">
            <span class="text-brand-dark font-semibold truncate group-hover/row:text-[#0C51D9]">
              {{ c.name }}<span class="text-brand-light font-normal"> · {{ c.client }}</span>
            </span>
            <span class="shrink-0 text-brand-light">
              {{ formatHours(c.period.used) }} / {{ formatHours(c.period.total) }}
              <strong v-if="c.period.overage > 0" class="text-red-600">· {{ formatHours(c.period.overage) }} over</strong>
            </span>
          </div>
          <div class="w-full bg-gray-100 rounded-full overflow-hidden" style="height: 6px">
            <div class="h-full rounded-full" :style="{ width: `${Math.min(c.period.used_percent, 100)}%`, backgroundColor: barColor(c.period) }"></div>
          </div>
        </RouterLink>
      </div>

      <div class="border-t border-[#F1F1F1] pt-3 mt-auto">
        <p class="text-xs text-brand-light">Hours used per month (all contracts)</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="170" :options="chartOptions" :series="series" />
        </div>
      </div>
    </template>
  </div>
</template>
