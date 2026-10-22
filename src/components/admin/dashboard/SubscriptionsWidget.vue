<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { RefreshCw, ArrowRight, AlertCircle } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Projected billing for the next 12 months (each active subscription's due
// dates rolled forward by its cycle) and what falls due in the next 30 days.
const data = ref(null);
const loading = ref(true);
const failed = ref(false);

onMounted(async () => {
  try {
    data.value = (await axiosInstance.get("/dashboard/insights/subscriptions")).data.data;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];
const forecast = computed(() => data.value?.forecast ?? []);
const yearTotal = computed(() => forecast.value.reduce((sum, f) => sum + f.amount, 0));

const series = computed(() => [{ name: "Expected billing", data: forecast.value.map((f) => f.amount) }]);
const chartOptions = computed(() => ({
  chart: { type: "bar", height: 200, toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "42%" } },
  dataLabels: { enabled: false },
  colors: ["#0C51D9"],
  states: { hover: { filter: { type: "darken", value: 0.9 } } },
  grid: { borderColor: "#EEF1F5", strokeDashArray: 0, padding: { left: 4, right: 4 } },
  xaxis: {
    categories: forecast.value.map((f) => monthLabel(f.month)),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: "#64748B", fontSize: "11px" } },
  },
  yaxis: {
    tickAmount: 3,
    labels: { formatter: (v) => formatRupiahCompact(v), style: { colors: "#64748B", fontSize: "11px" } },
  },
  tooltip: {
    custom: ({ dataPointIndex }) => {
      const f = forecast.value[dataPointIndex];
      const [y, m] = f.month.split("-");
      return `<div style="padding:8px 10px;font-size:12px;color:#0f172a">
        <div style="color:#64748b">${MONTHS[Number(m) - 1]} ${y}</div>
        <div style="font-weight:700">${formatRupiah(f.amount)}</div>
        <div style="color:#64748b">${f.count} subscription${f.count === 1 ? "" : "s"} due</div></div>`;
    },
  },
}));

const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5 h-full flex flex-col">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 bg-indigo-50 rounded-[10px] flex items-center justify-center shrink-0">
          <RefreshCw class="w-5 h-5 text-indigo-600" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-lg font-bold">Subscriptions</h3>
          <p class="text-brand-light text-xs">Expected billing over the next 12 months</p>
        </div>
      </div>
      <RouterLink :to="{ name: 'admin.subscriptions.dashboard' }" class="text-sm font-semibold text-[#0C51D9] hover:underline flex items-center gap-1 shrink-0">
        View all <ArrowRight class="w-3.5 h-3.5" />
      </RouterLink>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton height="56px" rounded="10px" />
      <Skeleton height="180px" rounded="10px" />
    </div>
    <div v-else-if="failed" class="text-sm text-gray-500 py-8 text-center">Couldn't load subscriptions.</div>
    <div v-else-if="!data.active_count" class="text-sm text-gray-500 py-8 text-center">No active subscriptions yet.</div>

    <template v-else>
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="rounded-[10px] bg-slate-50 px-3 py-2">
          <p class="text-[11px] text-brand-light">Active</p>
          <p class="text-brand-dark text-base font-bold">{{ data.active_count }}</p>
          <p v-if="data.postponed_count" class="text-[11px] text-brand-light">{{ data.postponed_count }} postponed</p>
        </div>
        <div class="rounded-[10px] bg-slate-50 px-3 py-2" title="Yearly subscriptions counted as 1/12 per month">
          <p class="text-[11px] text-brand-light">Per month</p>
          <p class="text-brand-dark text-base font-bold">{{ formatRupiahCompact(data.monthly_value) }}</p>
        </div>
        <div class="rounded-[10px] bg-slate-50 px-3 py-2">
          <p class="text-[11px] text-brand-light">Due in 30 days</p>
          <p class="text-brand-dark text-base font-bold">{{ data.due_soon_count }}</p>
          <p v-if="data.due_soon_count" class="text-[11px] text-brand-light">{{ formatRupiahCompact(data.due_soon_amount) }}</p>
        </div>
      </div>

      <div class="flex items-baseline justify-between text-xs text-brand-light">
        <span>Projected billing per month</span>
        <span>12-month total <strong class="text-brand-dark">{{ formatRupiahCompact(yearTotal) }}</strong></span>
      </div>
      <div class="-mx-2">
        <VueApexCharts type="bar" height="200" :options="chartOptions" :series="series" />
      </div>

      <div v-if="data.due_soon.length" class="border-t border-[#F1F1F1] pt-3 mt-1 space-y-2">
        <p class="text-xs font-semibold text-brand-dark">Due soon</p>
        <div v-for="s in data.due_soon" :key="s.id" class="flex items-center justify-between gap-3 text-xs">
          <div class="min-w-0">
            <p class="text-brand-dark font-semibold truncate">{{ s.name }}</p>
            <p class="text-brand-light truncate">{{ s.client || "-" }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-brand-dark font-semibold">{{ formatRupiahCompact(s.amount) }}</p>
            <p class="flex items-center justify-end gap-1" :class="s.overdue ? 'text-red-600 font-semibold' : 'text-brand-light'">
              <AlertCircle v-if="s.overdue" class="w-3 h-3" />{{ s.overdue ? "Overdue · " : "" }}{{ formatDate(s.next_due_date) }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
