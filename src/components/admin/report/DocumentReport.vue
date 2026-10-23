<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { Files, ReceiptText, Wallet, Trophy } from "lucide-vue-next";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import RecapTile from "@/components/common/RecapTile.vue";

const VueApexCharts = defineAsyncComponent(() => import("vue3-apexcharts"));

// Reports > Document Reports: a recap of everything under Business Documents
// for the selected date range.
const props = defineProps({
  data: { type: Object, default: null },
  loading: Boolean,
});

const narrow = ref(false);
let mq;
const onMq = (e) => (narrow.value = e.matches);
onMounted(() => {
  mq = window.matchMedia("(max-width: 640px)");
  narrow.value = mq.matches;
  mq.addEventListener("change", onMq);
});
onBeforeUnmount(() => mq?.removeEventListener("change", onMq));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (m, i) => (narrow.value && i % 2 ? "" : MONTHS[Number(m.slice(5, 7)) - 1] + (props.data?.per_month?.length > 12 ? ` ${m.slice(2, 4)}` : ""));
const AXIS = { colors: "#64748B", fontSize: "11px" };
const BLUE = "#2a78d6";
const GREEN = "#1baf7a";

const s = computed(() => props.data?.summary || {});
const ready = computed(() => props.data && Array.isArray(props.data.types));

const tiles = computed(() => [
  { key: "docs", label: "Total documents", value: s.value.total_documents ?? 0, sub: "In this date range", icon: Files, iconClass: "bg-blue-50 text-[#0C51D9]" },
  {
    key: "invoiced",
    label: "Invoiced",
    value: formatRupiah(s.value.invoice_total ?? 0),
    sub: "Excluding cancelled invoices",
    alert: s.value.invoice_unpaid_count ? `${formatRupiahCompact(s.value.invoice_unpaid)} unpaid (${s.value.invoice_unpaid_count})` : null,
    icon: ReceiptText,
    iconClass: "bg-amber-50 text-amber-600",
  },
  { key: "received", label: "Payments received", value: formatRupiah(s.value.received_total ?? 0), sub: `${s.value.receipt_count ?? 0} payment receipt${s.value.receipt_count === 1 ? "" : "s"}`, icon: Wallet, iconClass: "bg-emerald-50 text-emerald-600" },
  {
    key: "win",
    label: "Proposal win rate",
    value: s.value.proposal_win_rate !== null && s.value.proposal_win_rate !== undefined ? `${s.value.proposal_win_rate}%` : "-",
    sub: s.value.proposal_decided ? `Of ${s.value.proposal_decided} accepted or rejected` : "No proposal decided yet",
    icon: Trophy,
    iconClass: "bg-violet-50 text-violet-600",
  },
]);

// ----- Documents per type: one series, sorted, direct-labelled bars -----
const types = computed(() => [...(props.data?.types || [])].sort((a, b) => b.count - a.count));
const typeMax = computed(() => Math.max(1, ...types.value.map((t) => t.count)));

// ----- Per month (single series) -----
const perMonth = computed(() => props.data?.per_month || []);
const perMonthOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: narrow.value ? "55%" : "22px" } },
  colors: [BLUE],
  dataLabels: { enabled: false },
  grid: { borderColor: "#EEF1F5", padding: { left: 4, right: 4 } },
  xaxis: { categories: perMonth.value.map((m, i) => monthLabel(m.month, i)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: 0, style: AXIS } },
  yaxis: { tickAmount: 3, forceNiceScale: true, labels: { formatter: (v) => Math.round(v), style: AXIS } },
  tooltip: { x: { formatter: (_, { dataPointIndex }) => perMonth.value[dataPointIndex]?.month }, y: { formatter: (v) => `${v} document${v === 1 ? "" : "s"}` } },
}));

// ----- Invoiced vs received (two series, same unit) -----
const money = computed(() => props.data?.money_per_month || []);
const hasMoney = computed(() => money.value.some((m) => m.invoiced || m.received));
const moneyOptions = computed(() => ({
  chart: { type: "bar", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: narrow.value ? "70%" : "55%" } },
  colors: [BLUE, GREEN],
  stroke: { show: true, width: 2, colors: ["transparent"] },
  dataLabels: { enabled: false },
  legend: { show: true, position: "top", horizontalAlign: "right", fontSize: "11px", labels: { colors: "#64748B" }, markers: { size: 5, shape: "square" } },
  grid: { borderColor: "#EEF1F5", padding: { left: 4, right: 4 } },
  xaxis: { categories: money.value.map((m, i) => monthLabel(m.month, i)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: 0, style: AXIS } },
  yaxis: { tickAmount: 3, labels: { formatter: (v) => formatRupiahCompact(v), style: AXIS } },
  tooltip: { shared: true, intersect: false, y: { formatter: (v) => formatRupiah(v) } },
}));
const moneySeries = computed(() => [
  { name: "Invoiced", data: money.value.map((m) => m.invoiced) },
  { name: "Received", data: money.value.map((m) => m.received) },
]);

// ----- Invoice status (donut by amount) -----
const INVOICE_STATUS = { unpaid: { label: "Unpaid", color: "#eda100" }, paid: { label: "Paid", color: GREEN }, cancelled: { label: "Cancelled", color: "#cbd5e1" } };
const invoiceSlices = computed(() => (props.data?.invoice_status || []).filter((x) => x.count > 0).map((x) => ({ ...x, ...INVOICE_STATUS[x.status] })));
const invoiceCount = computed(() => invoiceSlices.value.reduce((n, x) => n + x.count, 0));
const donutOptions = computed(() => ({
  chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
  labels: invoiceSlices.value.map((x) => x.label),
  colors: invoiceSlices.value.map((x) => x.color),
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
          value: { show: true, offsetY: -14, color: "#0f172a", fontSize: "18px", fontWeight: 800 },
          total: { show: true, label: "invoices", color: "#64748b", fontSize: "11px", formatter: () => invoiceCount.value },
        },
      },
    },
  },
  tooltip: { y: { formatter: (v, { seriesIndex }) => `${v} · ${formatRupiah(invoiceSlices.value[seriesIndex]?.amount)}` } },
}));

// ----- Proposal pipeline + every type's status breakdown -----
const proposal = computed(() => props.data?.types?.find((t) => t.key === "proposal"));
const proposalMax = computed(() => Math.max(1, ...(proposal.value?.breakdown || []).map((b) => b.count)));

// Same colour = same meaning on every row: green done, amber waiting, gray
// draft, red rejected/cancelled; internal/external are blue/orange.
const STATUS_COLOR = {
  paid: GREEN, approved: GREEN, accepted: GREEN,
  unpaid: "#eda100", pending: "#eda100", partial: "#eda100",
  draft: "#94a3b8", cancelled: "#cbd5e1", rejected: "#e5484d", sent: BLUE,
  I: BLUE, internal: BLUE, E: "#eb6834", external: "#eb6834",
};
const colorOf = (value) => STATUS_COLOR[value] || BLUE;
// Proposals and invoices already have their own charts above.
const breakdownTypes = computed(() => (props.data?.types || []).filter((t) => !["proposal", "invoice"].includes(t.key) && t.breakdown.length && t.count));
</script>

<template>
  <div v-if="loading || !ready" class="space-y-3">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      <Skeleton v-for="i in 4" :key="i" height="88px" rounded="12px" />
    </div>
    <Skeleton height="260px" rounded="14px" />
  </div>

  <div v-else class="space-y-3">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      <RecapTile v-for="t in tiles" :key="t.key" v-bind="t" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <!-- Per type -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Documents per type</p>
        <p class="text-brand-light text-xs mb-3">Number created in this range</p>
        <div class="space-y-2.5">
          <div v-for="t in types" :key="t.key" class="grid grid-cols-[110px_1fr_32px] sm:grid-cols-[130px_1fr_36px] items-center gap-2 text-xs">
            <span class="text-brand-dark font-medium truncate">{{ t.label }}</span>
            <div class="bg-gray-100 rounded-full overflow-hidden" style="height: 10px">
              <div v-if="t.count" class="h-full rounded-full" :style="{ width: `${Math.max(3, (t.count / typeMax) * 100)}%`, backgroundColor: BLUE }"></div>
            </div>
            <span class="text-brand-dark font-semibold text-right tabular-nums">{{ t.count }}</span>
          </div>
        </div>
      </div>

      <!-- Per month -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Documents per month</p>
        <p class="text-brand-light text-xs">All document types together</p>
        <div class="-mx-2">
          <VueApexCharts type="bar" height="220" :options="perMonthOptions" :series="[{ name: 'Documents', data: perMonth.map((m) => m.count) }]" />
        </div>
      </div>
    </div>

    <!-- Money -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
        <div>
          <p class="text-brand-dark text-sm font-bold">Invoiced vs received</p>
          <p class="text-brand-light text-xs">Invoice totals (excl. cancelled) and payment receipts, by document date</p>
        </div>
      </div>
      <p v-if="!hasMoney" class="text-sm text-gray-500 py-10 text-center">No invoices or payment receipts in this range.</p>
      <div v-else class="-mx-2">
        <VueApexCharts type="bar" height="240" :options="moneyOptions" :series="moneySeries" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <!-- Invoice status -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Invoice status</p>
        <p class="text-brand-light text-xs mb-2">How many invoices, and their value</p>
        <p v-if="!invoiceSlices.length" class="text-sm text-gray-500 py-10 text-center">No invoices in this range.</p>
        <div v-else class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-44 shrink-0">
            <VueApexCharts type="donut" height="190" :options="donutOptions" :series="invoiceSlices.map((x) => x.count)" />
          </div>
          <ul class="w-full space-y-2 text-xs">
            <li v-for="x in invoiceSlices" :key="x.status" class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: x.color }"></span>
              <span class="text-brand-dark font-medium flex-1">{{ x.label }}</span>
              <span class="text-brand-light tabular-nums">{{ x.count }}×</span>
              <span class="text-brand-dark font-semibold tabular-nums">{{ formatRupiahCompact(x.amount) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Proposal pipeline -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
        <p class="text-brand-dark text-sm font-bold">Proposal pipeline</p>
        <p class="text-brand-light text-xs mb-3">Proposals by status</p>
        <p v-if="!proposal?.count" class="text-sm text-gray-500 py-10 text-center">No proposals in this range.</p>
        <div v-else class="space-y-2.5">
          <div v-for="b in proposal.breakdown" :key="b.value" class="grid grid-cols-[80px_1fr_32px] items-center gap-2 text-xs">
            <span class="text-brand-dark font-medium">{{ b.label }}</span>
            <div class="bg-gray-100 rounded-full overflow-hidden" style="height: 10px">
              <div v-if="b.count" class="h-full rounded-full" :style="{ width: `${Math.max(3, (b.count / proposalMax) * 100)}%`, backgroundColor: colorOf(b.value) }"></div>
            </div>
            <span class="text-brand-dark font-semibold text-right tabular-nums">{{ b.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Status per type -->
    <div v-if="breakdownTypes.length" class="bg-white border border-[#DCDEDD] rounded-[14px] p-4">
      <p class="text-brand-dark text-sm font-bold">Breakdown per document type</p>
      <p class="text-brand-light text-xs mb-3">Status or internal/external split of the other documents</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div v-for="t in breakdownTypes" :key="t.key">
          <div class="flex items-baseline justify-between text-xs mb-1">
            <span class="text-brand-dark font-semibold">{{ t.label }}</span>
            <span class="text-brand-light tabular-nums">{{ t.count }}</span>
          </div>
          <div class="flex gap-[2px] rounded-full overflow-hidden bg-gray-100" style="height: 8px">
            <div
              v-for="b in t.breakdown.filter((x) => x.count)"
              :key="b.value"
              class="h-full"
              :style="{ width: `${(b.count / t.count) * 100}%`, backgroundColor: colorOf(b.value) }"
              :title="`${b.label}: ${b.count}`"
            ></div>
          </div>
          <p class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-brand-light">
            <span v-for="b in t.breakdown" :key="b.value" class="inline-flex items-center gap-1">
              <span class="w-2 h-2 rounded-sm" :style="{ backgroundColor: colorOf(b.value) }"></span>{{ b.label }} {{ b.count }}
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
