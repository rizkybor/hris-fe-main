<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RefreshCw, Wallet, CalendarRange, CalendarClock, AlertTriangle, ChevronDown, Users } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

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

const data = ref(null);
const loading = ref(true);
const failed = ref(false);

const load = async () => {
  failed.value = false;
  try {
    data.value = (await axiosInstance.get("/subscriptions/summary")).data.data;
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

// Collapsible, remembered per browser.
const open = ref(true);
try {
  open.value = localStorage.getItem("subscriptions-recap-open") !== "0";
} catch {
  /* storage unavailable */
}
const toggle = () => {
  open.value = !open.value;
  try {
    localStorage.setItem("subscriptions-recap-open", open.value ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
};

// ----- Service type donut -----
// Fixed categorical order, assigned by the type's position in the options
// list (never by value rank), so a type keeps its colour as values change.
const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#6250d6"];
const OTHER_COLOR = "#94a3b8";
const typeLabel = (type) => props.serviceTypeOptions.find((o) => o.value === type)?.label || type || "Other";
const typeSlot = (type) => {
  const i = props.serviceTypeOptions.findIndex((o) => o.value === type);
  return i >= 0 && i < PALETTE.length ? i : -1;
};

const slices = computed(() => {
  const rows = data.value?.by_service_type ?? [];
  const named = [];
  let other = { type: "__other", label: "Other", monthly_value: 0, count: 0, color: OTHER_COLOR };
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
  stroke: { width: 2, colors: ["#ffffff"] },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: "70%",
        labels: {
          show: true,
          name: { show: true, offsetY: 18, color: "#64748b", fontSize: "11px" },
          value: { show: true, offsetY: -14, color: "#0f172a", fontSize: "16px", fontWeight: 800, formatter: (v) => formatRupiahCompact(Number(v)) },
          total: { show: true, label: "per month", color: "#64748b", fontSize: "11px", formatter: () => formatRupiahCompact(sliceTotal.value) },
        },
      },
    },
  },
  states: { hover: { filter: { type: "darken", value: 0.92 } } },
  tooltip: { y: { formatter: (v) => `${formatRupiah(v)} / month` } },
}));

// ----- Forecast -----
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const forecast = computed(() => data.value?.forecast ?? []);
const forecastTotal = computed(() => forecast.value.reduce((sum, f) => sum + f.amount, 0));
const forecastOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: narrow.value ? "55%" : "22px" } },
  dataLabels: { enabled: false },
  colors: ["#2a78d6"],
  states: { hover: { filter: { type: "darken", value: 0.9 } } },
  grid: { borderColor: "#EEF1F5", strokeDashArray: 0, padding: { left: 4, right: 4 } },
  xaxis: {
    categories: forecast.value.map((f, i) => (narrow.value && i % 2 ? "" : MONTHS[Number(f.month.slice(5, 7)) - 1])),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: "#64748B", fontSize: "11px" } },
  },
  yaxis: { tickAmount: 3, labels: { formatter: (v) => formatRupiahCompact(v), style: { colors: "#64748B", fontSize: "11px" } } },
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

// ----- Top clients -----
const clients = computed(() => data.value?.top_clients ?? []);
const clientMax = computed(() => Math.max(1, ...clients.value.map((c) => c.monthly_value)));

const tiles = computed(() => {
  const d = data.value;
  if (!d) return [];
  const inactive = [d.counts.postponed && `${d.counts.postponed} postponed`, d.counts.cancelled && `${d.counts.cancelled} not active`].filter(Boolean);
  return [
    { key: "active", label: "Active subscriptions", value: d.counts.active, sub: inactive.join(" · ") || "All running", icon: RefreshCw, iconClass: "bg-indigo-50 text-indigo-600" },
    { key: "monthly", label: "Monthly value", value: formatRupiah(d.monthly_value), sub: "Yearly counted as 1/12", icon: Wallet, iconClass: "bg-blue-50 text-[#0C51D9]" },
    { key: "annual", label: "Annual value", value: formatRupiah(d.annual_value), sub: `${d.client_count} client${d.client_count === 1 ? "" : "s"}`, icon: CalendarRange, iconClass: "bg-emerald-50 text-emerald-600" },
    {
      key: "due",
      label: "Due in 30 days",
      value: formatRupiah(d.due_soon.amount),
      sub: `${d.due_soon.count} subscription${d.due_soon.count === 1 ? "" : "s"}`,
      alert: d.overdue.count ? `${d.overdue.count} overdue · ${formatRupiahCompact(d.overdue.amount)}` : null,
      icon: CalendarClock,
      iconClass: "bg-amber-50 text-amber-600",
    },
  ];
});
</script>

<template>
  <section class="mb-4 sm:mb-5">
    <button type="button" class="w-full flex items-center justify-between gap-2 mb-2.5 text-left" @click="toggle">
      <span class="text-brand-dark text-sm font-bold">Recap</span>
      <span class="text-xs font-semibold text-brand-light inline-flex items-center gap-1 hover:text-[#0C51D9]">
        {{ open ? "Hide" : "Show" }}
        <ChevronDown class="w-3.5 h-3.5 transition-transform" :class="{ '-rotate-90': !open }" />
      </span>
    </button>

    <template v-if="open">
      <div v-if="loading" class="space-y-3">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <Skeleton v-for="i in 4" :key="i" height="84px" rounded="12px" />
        </div>
        <Skeleton height="260px" rounded="14px" />
      </div>
      <p v-else-if="failed" class="text-sm text-gray-500 bg-white border border-[#DCDEDD] rounded-[12px] p-4">
        Couldn't load the recap. <button type="button" class="text-[#0C51D9] font-semibold hover:underline" @click="load">Try again</button>
      </p>

      <div v-else class="space-y-3">
        <!-- Totals -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div v-for="t in tiles" :key="t.key" class="bg-white border border-[#DCDEDD] rounded-[12px] p-3 sm:p-4 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <p class="text-brand-light text-xs font-medium truncate">{{ t.label }}</p>
              <div class="w-7 h-7 rounded-[8px] hidden sm:flex items-center justify-center shrink-0" :class="t.iconClass">
                <component :is="t.icon" class="w-3.5 h-3.5" />
              </div>
            </div>
            <p class="text-brand-dark text-base sm:text-xl font-extrabold leading-tight mt-1 truncate" :title="String(t.value)">{{ t.value }}</p>
            <p class="text-brand-light text-[11px] mt-1 truncate">{{ t.sub }}</p>
            <p v-if="t.alert" class="text-red-600 text-[11px] font-semibold mt-0.5 flex items-center gap-1 truncate">
              <AlertTriangle class="w-3 h-3 shrink-0" />{{ t.alert }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <!-- Value by service type -->
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
            <p class="text-brand-dark text-sm font-bold">Monthly value by service type</p>
            <p class="text-brand-light text-xs mb-2">Active subscriptions only</p>
            <p v-if="!slices.length" class="text-sm text-gray-500 py-10 text-center">No active subscriptions yet.</p>
            <div v-else class="flex flex-col sm:flex-row items-center gap-4">
              <div class="w-48 shrink-0">
                <VueApexCharts type="donut" height="200" :options="donutOptions" :series="slices.map((s) => s.monthly_value)" />
              </div>
              <!-- The legend doubles as the table: every slice named with its value. -->
              <ul class="w-full space-y-2 text-xs">
                <li v-for="s in slices" :key="s.type" class="flex items-center gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: s.color }"></span>
                  <span class="text-brand-dark font-medium truncate flex-1">{{ s.label }}</span>
                  <span class="text-brand-light shrink-0">{{ s.count }}×</span>
                  <span class="text-brand-dark font-semibold shrink-0 tabular-nums">{{ formatRupiahCompact(s.monthly_value) }}</span>
                  <span class="text-brand-light shrink-0 w-11 text-right tabular-nums">{{ pct(s.monthly_value) }}%</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Top clients -->
          <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-brand-dark text-sm font-bold">Top clients by monthly value</p>
                <p class="text-brand-light text-xs mb-3">Active subscriptions only</p>
              </div>
              <Users class="w-4 h-4 text-gray-400 shrink-0" />
            </div>
            <p v-if="!clients.length" class="text-sm text-gray-500 py-10 text-center">No active subscriptions yet.</p>
            <div v-else class="space-y-3">
              <div v-for="c in clients" :key="c.client">
                <div class="flex items-baseline justify-between gap-2 text-xs mb-1">
                  <span class="text-brand-dark font-medium truncate">{{ c.client }}</span>
                  <span class="shrink-0 text-brand-light">
                    <span class="text-brand-dark font-semibold tabular-nums">{{ formatRupiahCompact(c.monthly_value) }}</span> · {{ c.count }}
                  </span>
                </div>
                <div class="w-full bg-gray-100 rounded-full overflow-hidden" style="height: 8px">
                  <div class="h-full rounded-full bg-[#2a78d6]" :style="{ width: `${Math.max(2, (c.monthly_value / clientMax) * 100)}%` }"></div>
                </div>
              </div>
              <p v-if="data.client_count > clients.length" class="text-[11px] text-brand-light">
                + {{ data.client_count - clients.length }} more client{{ data.client_count - clients.length === 1 ? "" : "s" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Forecast -->
        <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
            <div>
              <p class="text-brand-dark text-sm font-bold">Projected billing, next 12 months</p>
              <p class="text-brand-light text-xs">Each active subscription's due dates rolled forward by its cycle</p>
            </div>
            <p class="text-xs text-brand-light shrink-0">12-month total <strong class="text-brand-dark">{{ formatRupiah(forecastTotal) }}</strong></p>
          </div>
          <div class="-mx-2">
            <VueApexCharts type="bar" height="220" :options="forecastOptions" :series="[{ name: 'Expected billing', data: forecast.map((f) => f.amount) }]" />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
