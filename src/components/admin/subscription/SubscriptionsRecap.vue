<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RefreshCw, Wallet, CalendarRange, CalendarClock, Users } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import RecapSection from "@/components/common/RecapSection.vue";
import RecapTile from "@/components/common/RecapTile.vue";
import { uiColor } from "@/utils/uiColor";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t } = useI18n();

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Recap above the Subscriptions list: totals, value by service type (donut),
// biggest clients, and billing expected over the next 12 months. Amounts are
// monthly-equivalent -- a yearly subscription counts as 1/12 per month.
const props = defineProps({
  // Same option list the page filters by (Settings > Dropdown Options).
  serviceTypeOptions: { type: Array, default: () => [] },
  // Bumped by the page after a create/edit/delete/invoice so the recap follows.
  refreshKey: { type: Number, default: 0 },
});

// `loaded` hands the summary to the page (its due / overdue counts label
// the list's quick filters) without a second request.
const emit = defineEmits(["loaded"]);
const data = ref(null);
const loading = ref(true);
const failed = ref(false);

const load = async () => {
  failed.value = false;
  try {
    data.value = (await axiosInstance.get("/subscriptions/summary")).data.data;
    emit("loaded", data.value);
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};
// Phones get every other month label so the 12 labels don't run together.
const narrow = ref(false);
let mq;
const onMq = (e) => (narrow.value = e.matches);
onMounted(() => {
  load();
  mq = window.matchMedia("(max-width: 640px)");
  narrow.value = mq.matches;
  mq.addEventListener("change", onMq);
});
onBeforeUnmount(() => mq?.removeEventListener("change", onMq));
watch(() => props.refreshKey, load);

// ----- Service type donut -----
// Fixed categorical order, assigned by the type's position in the options
// list (never by value rank), so a type keeps its colour as values change.
// Token colours (accent, ink and their lighter steps, ok, warn); "Other" is
// the neutral line colour.
const PALETTE = [uiColor("accent"), uiColor("ink"), uiColor("ok"), uiColor("warn"), uiColor("accent", 0.45), uiColor("ink", 0.45)];
const OTHER_COLOR = uiColor("line-strong");
const typeLabel = (type) => props.serviceTypeOptions.find((o) => o.value === type)?.label || type || t("subscriptions.recap.other");
const typeSlot = (type) => {
  const i = props.serviceTypeOptions.findIndex((o) => o.value === type);
  return i >= 0 && i < PALETTE.length ? i : -1;
};

const slices = computed(() => {
  const rows = data.value?.by_service_type ?? [];
  const named = [];
  let other = { type: "__other", label: t("subscriptions.recap.other"), monthly_value: 0, count: 0, color: OTHER_COLOR };
  rows.forEach((r) => {
    const slot = typeSlot(r.type);
    if (slot >= 0) named.push({ ...r, label: typeLabel(r.type), color: PALETTE[slot] });
    else other = { ...other, monthly_value: other.monthly_value + r.monthly_value, count: other.count + r.count };
  });
  if (other.monthly_value > 0) named.push(other);
  return named.filter((s) => s.monthly_value > 0);
});
const sliceTotal = computed(() => slices.value.reduce((sum, s) => sum + s.monthly_value, 0));
const pct = (v) => (sliceTotal.value ? Math.round((v / sliceTotal.value) * 1000) / 10 : 0);

const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: slices.value.map((s) => s.label),
  colors: slices.value.map((s) => s.color),
  stroke: { width: 2, colors: [uiColor("surface")] },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: { show: true, offsetY: 18, color: uiColor("muted"), fontSize: "11px" },
          value: { show: true, offsetY: -14, color: uiColor("ink"), fontSize: "16px", fontWeight: 600, formatter: (v) => formatRupiahCompact(Number(v)) },
          total: { show: true, label: t("subscriptions.recap.perMonth"), color: uiColor("muted"), fontSize: "11px", formatter: () => formatRupiahCompact(sliceTotal.value) },
        },
      },
    },
  },
  states: { hover: { filter: { type: "darken", value: 0.92 } } },
  tooltip: { y: { formatter: (v) => t("subscriptions.recap.perMonthValue", { amount: formatRupiah(v) }) } },
}));

// ----- Forecast -----
const MONTHS = computed(() => Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(localeTag(), { month: "short" })));
const forecast = computed(() => data.value?.forecast ?? []);
const forecastTotal = computed(() => forecast.value.reduce((sum, f) => sum + f.amount, 0));
const forecastOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: narrow.value ? "55%" : "22px" } },
  dataLabels: { enabled: false },
  colors: [uiColor("accent")],
  states: { hover: { filter: { type: "darken", value: 0.9 } } },
  grid: { borderColor: uiColor("line"), strokeDashArray: 0, padding: { left: 4, right: 4 } },
  xaxis: {
    categories: forecast.value.map((f, i) => (narrow.value && i % 2 ? "" : MONTHS.value[Number(f.month.slice(5, 7)) - 1])),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: uiColor("muted"), fontSize: "11px" } },
  },
  yaxis: { tickAmount: 3, labels: { formatter: (v) => formatRupiahCompact(v), style: { colors: uiColor("muted"), fontSize: "11px" } } },
  tooltip: {
    custom: ({ dataPointIndex }) => {
      const f = forecast.value[dataPointIndex];
      const [y, m] = f.month.split("-");
      return `<div style="padding:8px 10px;font-size:12px;color:${uiColor("ink")}">
        <div style="color:${uiColor("muted")}">${MONTHS.value[Number(m) - 1]} ${y}</div>
        <div style="font-weight:600">${formatRupiah(f.amount)}</div>
        <div style="color:${uiColor("muted")}">${t("subscriptions.recap.subscriptionsDue", { n: f.count }, f.count)}</div></div>`;
    },
  },
}));

// ----- Top clients -----
const clients = computed(() => data.value?.top_clients ?? []);
const clientMax = computed(() => Math.max(1, ...clients.value.map((c) => c.monthly_value)));

const tiles = computed(() => {
  const d = data.value;
  if (!d) return [];
  const inactive = [d.counts.postponed && t("subscriptions.recap.postponed", { n: d.counts.postponed }), d.counts.cancelled && t("subscriptions.recap.notActive", { n: d.counts.cancelled })].filter(Boolean);
  return [
    { key: "active", label: t("subscriptions.recap.activeSubs"), value: d.counts.active, sub: inactive.join(" · ") || t("subscriptions.recap.allRunning"), icon: RefreshCw },
    { key: "monthly", label: t("subscriptions.recap.monthlyValue"), value: formatRupiah(d.monthly_value), sub: t("subscriptions.recap.yearlyHint"), icon: Wallet },
    { key: "annual", label: t("subscriptions.recap.annualValue"), value: formatRupiah(d.annual_value), sub: t("subscriptions.recap.clients", { n: d.client_count }, d.client_count), icon: CalendarRange },
    {
      key: "due",
      label: t("subscriptions.recap.dueIn30"),
      value: formatRupiah(d.due_soon.amount),
      sub: t("subscriptions.recap.subscriptions", { n: d.due_soon.count }, d.due_soon.count),
      alert: d.overdue.count ? t("subscriptions.recap.overdue", { n: d.overdue.count, amount: formatRupiahCompact(d.overdue.amount) }) : null,
      icon: CalendarClock,
    },
  ];
});
</script>

<template>
  <RecapSection storage-key="subscriptions-recap-open" :loading="loading" :failed="failed" @retry="load">
    <template v-if="data">
      <!-- Totals -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
        <RecapTile v-for="t in tiles" :key="t.key" v-bind="t" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Value by service type -->
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
          <p class="text-ui-h3 text-ui-ink">{{ $t("subscriptions.recap.byType") }}</p>
          <p class="text-ui-cap text-ui-muted mb-2">{{ $t("subscriptions.recap.activeOnly") }}</p>
          <p v-if="!slices.length" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("subscriptions.recap.noActive") }}</p>
          <div v-else class="flex flex-col sm:flex-row items-center gap-4">
            <div class="w-48 shrink-0">
              <VueApexCharts type="donut" height="200" :options="donutOptions" :series="slices.map((s) => s.monthly_value)" />
            </div>
            <!-- The legend doubles as the table: every slice named with its value. -->
            <ul class="w-full space-y-2 text-ui-cap">
              <li v-for="s in slices" :key="s.type" class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: s.color }"></span>
                <span class="text-ui-ink font-medium truncate flex-1">{{ s.label }}</span>
                <span class="text-ui-muted shrink-0 tabular-nums">{{ s.count }}×</span>
                <span class="text-ui-ink font-medium shrink-0 tabular-nums text-right">{{ formatRupiahCompact(s.monthly_value) }}</span>
                <span class="text-ui-muted shrink-0 w-11 text-right tabular-nums">{{ pct(s.monthly_value) }}%</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Top clients -->
        <div class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-ui-h3 text-ui-ink">{{ $t("subscriptions.recap.topClients") }}</p>
              <p class="text-ui-cap text-ui-muted mb-3">{{ $t("subscriptions.recap.activeOnly") }}</p>
            </div>
            <Users class="w-4 h-4 text-ui-faint shrink-0" />
          </div>
          <p v-if="!clients.length" class="text-ui-small text-ui-muted py-10 text-center">{{ $t("subscriptions.recap.noActive") }}</p>
          <div v-else class="space-y-3">
            <div v-for="c in clients" :key="c.client">
              <div class="flex items-baseline justify-between gap-2 text-ui-cap mb-1">
                <span class="text-ui-ink font-medium truncate">{{ c.client }}</span>
                <span class="shrink-0 text-ui-muted">
                  <span class="text-ui-ink font-medium tabular-nums">{{ formatRupiahCompact(c.monthly_value) }}</span> · {{ c.count }}
                </span>
              </div>
              <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-ui-accent" :style="{ width: `${Math.max(2, (c.monthly_value / clientMax) * 100)}%` }"></div>
              </div>
            </div>
            <p v-if="data.client_count > clients.length" class="text-ui-cap text-ui-muted">
              {{ $t("subscriptions.recap.moreClients", { n: data.client_count - clients.length }, data.client_count - clients.length) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Forecast -->
      <div class="bg-ui-surface border border-ui-line rounded-ui-card p-4 sm:p-5 min-w-0">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
          <div>
            <p class="text-ui-h3 text-ui-ink">{{ $t("subscriptions.recap.forecast") }}</p>
            <p class="text-ui-cap text-ui-muted">{{ $t("subscriptions.recap.forecastHint") }}</p>
          </div>
          <p class="text-ui-cap text-ui-muted shrink-0">{{ $t("subscriptions.recap.forecastTotal") }} <strong class="text-ui-ink font-medium tabular-nums">{{ formatRupiah(forecastTotal) }}</strong></p>
        </div>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="220" :options="forecastOptions" :series="[{ name: $t('subscriptions.recap.expectedBilling'), data: forecast.map((f) => f.amount) }]" />
        </div>
      </div>
    </template>
  </RecapSection>
</template>
