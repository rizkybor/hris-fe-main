<script setup>
import { computed, onMounted, ref } from "vue";
import {
  Banknote,
  Receipt,
  FolderKanban,
  RefreshCw,
  UserCheck,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  Users,
  CalendarCheck,
  CalendarClock,
  Plane,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ChevronRight,
  Gauge,
  Eye,
  EyeOff,
} from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

// Key Metrics: the backend picks the set for the user's role (business for
// Manager/Operational Director, cash for Finance, people for HR) and drops
// any metric the user can't otherwise open. The first metric is the hero.
const data = ref(null);
const loading = ref(true);
const failed = ref(false);

onMounted(async () => {
  try {
    data.value = (await axiosInstance.get("/dashboard/insights/key-metrics")).data.data;
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
});

const PROFILE = {
  business: "Business overview",
  finance: "Finance overview",
  people: "People overview",
};

const ICONS = {
  revenue: Banknote,
  receivables: Receipt,
  projects: FolderKanban,
  recurring: RefreshCw,
  present_today: UserCheck,
  cash_balance: Wallet,
  cash_in: ArrowDownToLine,
  cash_out: ArrowUpFromLine,
  payroll: HandCoins,
  employees: Users,
  attendance_rate: CalendarCheck,
  pending_leave: CalendarClock,
  on_leave: Plane,
};

// Rupiah amounts start hidden, like Project Budget/Realized; one eye toggle
// reveals every amount in the widget.
const showAmount = ref(false);
const MASK = "Rp ••••••••";
const hasRupiah = computed(() => (data.value?.metrics ?? []).some((m) => m.format === "rupiah" && m.value != null));

const hero = computed(() => data.value?.metrics?.[0] ?? null);
const tiles = computed(() => data.value?.metrics?.slice(1) ?? []);

const formatValue = (m, compact = false) => {
  if (m.display) return m.display;
  if (m.value === null || m.value === undefined) return "-";
  if (m.format === "rupiah") {
    if (!showAmount.value) return MASK;
    return compact ? formatRupiahCompact(m.value) : formatRupiah(m.value);
  }
  if (m.format === "percent") return `${Number(m.value).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  return Number(m.value).toLocaleString("id-ID");
};

const formatDelta = (d) => {
  if (d.format === "rupiah") return showAmount.value ? formatRupiahCompact(d.value) : "Rp ••••";
  if (d.format === "percent") return `${d.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  if (d.format === "points") return `${d.value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} pts`;
  return `+${d.value}`;
};

// Arrow shows the direction; colour shows whether that's good. A delta
// without a `good` flag (e.g. "+2 new projects") is neutral information.
const deltaClass = (d) => {
  if (d.good === undefined) return "bg-slate-100 text-slate-600";
  return d.good ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600";
};
const heroDeltaClass = (d) => {
  if (d.good === undefined) return "bg-white/15 text-white";
  return d.good ? "bg-green-400/20 text-green-200" : "bg-red-400/20 text-red-200";
};
const toneClass = (tone) => (tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-700" : "text-brand-light");
</script>

<template>
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Gauge class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div class="min-w-0">
          <h3 class="text-brand-dark text-base font-bold">Key Metrics</h3>
          <p class="text-brand-light text-xs">
            {{ data ? `${PROFILE[data.profile] || "Overview"} · ${data.period}` : "Overview" }}
          </p>
        </div>
      </div>
      <button
        v-if="hasRupiah"
        type="button"
        @click="showAmount = !showAmount"
        :aria-label="showAmount ? 'Hide amounts' : 'Show amounts'"
        :title="showAmount ? 'Hide amounts' : 'Show amounts'"
        class="w-8 h-8 rounded-[8px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
      >
        <EyeOff v-if="showAmount" class="w-4 h-4" />
        <Eye v-else class="w-4 h-4" />
      </button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Skeleton class="sm:col-span-2 lg:row-span-2" height="100%" rounded="14px" style="min-height: 196px" />
      <Skeleton v-for="i in 4" :key="i" height="92px" rounded="12px" />
    </div>

    <p v-else-if="failed" class="text-sm text-gray-500 py-8 text-center">Couldn't load key metrics.</p>
    <p v-else-if="!hero" class="text-sm text-gray-500 py-8 text-center">No metrics available for your role.</p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Hero: the one number this role checks first -->
      <RouterLink
        :to="hero.route ? { name: hero.route } : ''"
        class="km-hero sm:col-span-2 lg:row-span-2 rounded-[14px] p-5 flex flex-col justify-between text-white group"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-[10px] bg-white/15 flex items-center justify-center">
              <component :is="ICONS[hero.key]" class="w-5 h-5 text-white" />
            </div>
            <p class="text-white/85 text-sm font-semibold">{{ hero.label }}</p>
          </div>
          <ChevronRight class="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
        </div>

        <div class="my-5">
          <p class="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight break-words">
            {{ formatValue(hero) }}<span v-if="hero.suffix" class="text-white/60 text-2xl font-bold">{{ hero.suffix }}</span>
          </p>
          <div v-if="hero.delta" class="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold" :class="heroDeltaClass(hero.delta)">
              <ArrowUpRight v-if="hero.delta.direction === 'up'" class="w-3.5 h-3.5" />
              <ArrowDownRight v-else class="w-3.5 h-3.5" />
              {{ formatDelta(hero.delta) }}
            </span>
            <span class="text-white/70">{{ hero.delta.label }}</span>
          </div>
        </div>

        <div>
          <div v-if="hero.progress !== undefined" class="w-full bg-white/15 rounded-full overflow-hidden mb-2" style="height: 6px">
            <div class="h-full rounded-full bg-white" :style="{ width: `${Math.min(hero.progress, 100)}%` }"></div>
          </div>
          <p class="text-white/75 text-xs flex items-center gap-1">
            <AlertTriangle v-if="hero.tone" class="w-3.5 h-3.5 text-amber-300" />{{ hero.sub }}
          </p>
        </div>
      </RouterLink>

      <!-- Supporting metrics -->
      <RouterLink
        v-for="m in tiles"
        :key="m.key"
        :to="m.route ? { name: m.route } : ''"
        class="bg-slate-50 border border-[#DCDEDD] rounded-[12px] p-4 hover:border-[#0C51D9] hover:bg-white transition-colors group flex flex-col"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-brand-light text-xs font-semibold truncate">{{ m.label }}</p>
          <div class="w-8 h-8 rounded-[8px] bg-white border border-[#EEF1F5] flex items-center justify-center shrink-0 group-hover:border-[#0C51D9]/30">
            <component :is="ICONS[m.key]" class="w-4 h-4 text-[#0C51D9]" />
          </div>
        </div>
        <p class="text-brand-dark text-xl sm:text-2xl font-extrabold leading-tight mt-1" :title="showAmount && m.format === 'rupiah' && m.value != null ? formatRupiah(m.value) : undefined">
          {{ formatValue(m, true) }}<span v-if="m.suffix" class="text-brand-light text-base font-bold">{{ m.suffix }}</span>
        </p>
        <div v-if="m.progress !== undefined" class="w-full bg-gray-200 rounded-full overflow-hidden mt-2" style="height: 5px">
          <div class="h-full rounded-full bg-[#0C51D9]" :style="{ width: `${Math.min(m.progress, 100)}%` }"></div>
        </div>
        <div class="mt-auto pt-2 space-y-1">
          <p v-if="m.delta" class="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold" :class="deltaClass(m.delta)">
              <ArrowUpRight v-if="m.delta.direction === 'up'" class="w-3 h-3" />
              <ArrowDownRight v-else class="w-3 h-3" />
              {{ formatDelta(m.delta) }}
            </span>
            <span class="text-brand-light">{{ m.delta.label }}</span>
          </p>
          <p class="text-[11px] flex items-center gap-1" :class="toneClass(m.tone)">
            <AlertTriangle v-if="m.tone" class="w-3 h-3 shrink-0" /><span class="truncate">{{ m.sub }}</span>
          </p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
/* Solid brand navy with one soft highlight -- no busy gradients. */
.km-hero {
  background: radial-gradient(120% 90% at 100% 0%, rgba(12, 81, 217, 0.55) 0%, rgba(12, 81, 217, 0) 60%), #0b1d51;
  min-height: 196px;
}
.km-hero:hover {
  box-shadow: 0 8px 24px -12px rgba(11, 29, 81, 0.6);
}
</style>
