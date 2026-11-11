<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiEmpty } from "@/components/ui";
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { RefreshCw, AlertCircle, Eye, EyeOff } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { uiColor } from "@/utils/uiColor";

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

// Amounts start hidden, like Key Metrics and Project Budget; the bars
// still show the shape of the year without revealing the figures.
const showAmount = ref(false);
const money = (value, full = false) => (showAmount.value ? (full ? formatRupiah(value) : formatRupiahCompact(value)) : "Rp ••••••••");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];
const forecast = computed(() => data.value?.forecast ?? []);
const yearTotal = computed(() => forecast.value.reduce((sum, f) => sum + f.amount, 0));

const series = computed(() => [{ name: "Expected billing", data: forecast.value.map((f) => f.amount) }]);
const chartOptions = computed(() => {
  // Read here (not only inside the formatter) so toggling re-renders the axis.
  const shown = showAmount.value;
  return {
    chart: { type: "bar", height: 200, toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
    plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "42%" } },
    dataLabels: { enabled: false },
    colors: [uiColor("accent")],
    states: { hover: { filter: { type: "darken", value: 0.9 } } },
    grid: { borderColor: uiColor("line"), strokeDashArray: 0, padding: { left: 4, right: 4 } },
    xaxis: {
      categories: forecast.value.map((f) => monthLabel(f.month)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: uiColor("muted"), fontSize: "11px" } },
    },
    yaxis: {
      tickAmount: 3,
      labels: { formatter: (v) => (shown ? formatRupiahCompact(v) : "Rp •••"), style: { colors: uiColor("muted"), fontSize: "11px" } },
    },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const f = forecast.value[dataPointIndex];
        const [y, m] = f.month.split("-");
        return `<div style="padding:8px 10px;font-size:12px;color:${uiColor("ink")}">
          <div style="color:${uiColor("muted")}">${MONTHS[Number(m) - 1]} ${y}</div>
          <div style="font-weight:700">${money(f.amount, true)}</div>
          <div style="color:${uiColor("muted")}">${f.count} subscription${f.count === 1 ? "" : "s"} due</div></div>`;
      },
    },
  };
});

const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
</script>

<template>
  <DashboardWidgetCard title="Subscriptions" subtitle="Expected billing over the next 12 months" :to="{ name: 'admin.subscriptions.dashboard' }">
    <template #actions>
      <button
        v-if="data?.active_count"
        type="button"
        @click="showAmount = !showAmount"
        :aria-label="showAmount ? 'Hide amounts' : 'Show amounts'"
        :title="showAmount ? 'Hide amounts' : 'Show amounts'"
        class="w-8 h-8 -my-1 rounded-ui-control flex items-center justify-center text-ui-faint hover:text-ui-ink hover:bg-ui-hover transition-colors"
      >
        <EyeOff v-if="showAmount" class="w-4 h-4" />
        <Eye v-else class="w-4 h-4" />
      </button>
    </template>

    <div v-if="loading" class="space-y-3">
      <Skeleton height="64px" rounded="10px" />
      <Skeleton height="180px" rounded="10px" />
    </div>
    <p v-else-if="failed" class="text-ui-small text-ui-muted py-8 text-center">Couldn't load subscriptions.</p>
    <UiEmpty v-else-if="!data.active_count" :icon="RefreshCw" title="No active subscriptions yet." compact />

    <template v-else>
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
          <p class="text-ui-cap text-ui-muted">Active</p>
          <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ data.active_count }}</p>
          <p v-if="data.postponed_count" class="text-ui-cap text-ui-muted truncate">{{ data.postponed_count }} postponed</p>
        </div>
        <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0" title="Yearly subscriptions counted as 1/12 per month">
          <p class="text-ui-cap text-ui-muted">Per month</p>
          <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5 truncate">{{ money(data.monthly_value) }}</p>
        </div>
        <div class="rounded-ui-control bg-ui-subtle px-3 py-2.5 min-w-0">
          <p class="text-ui-cap text-ui-muted truncate">Due in 30 days</p>
          <p class="text-ui-h3 text-ui-ink tabular-nums mt-0.5">{{ data.due_soon_count }}</p>
          <p v-if="data.due_soon_count" class="text-ui-cap text-ui-muted truncate">{{ money(data.due_soon_amount) }}</p>
        </div>
      </div>

      <div class="flex items-baseline justify-between gap-2 text-ui-cap text-ui-muted">
        <span>Projected billing per month</span>
        <span>12-month total <strong class="text-ui-ink font-medium tabular-nums">{{ money(yearTotal) }}</strong></span>
      </div>
      <div class="-mx-2">
        <VueApexCharts type="bar" height="200" :options="chartOptions" :series="series" />
      </div>

      <div v-if="data.due_soon.length" class="border-t border-ui-line pt-3 mt-1">
        <p class="text-ui-over uppercase text-ui-muted mb-2">Due soon</p>
        <ul class="space-y-2.5">
          <li v-for="s in data.due_soon" :key="s.id" class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ s.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate">{{ s.client || "-" }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-ui-small font-medium text-ui-ink tabular-nums">{{ money(s.amount) }}</p>
              <p class="text-ui-cap flex items-center justify-end gap-1" :class="s.overdue ? 'text-ui-bad font-medium' : 'text-ui-muted'">
                <AlertCircle v-if="s.overdue" class="w-3 h-3" />{{ s.overdue ? "Overdue · " : "" }}{{ formatDate(s.next_due_date) }}
              </p>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </DashboardWidgetCard>
</template>
