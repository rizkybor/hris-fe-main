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
  Eye,
  EyeOff,
} from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";

const { t, te } = useI18n();

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

const profileLabel = (profile) => {
  const key = `dashboard.keyMetrics.profile.${profile}`;
  return profile && te(key) ? t(key) : t("dashboard.keyMetrics.overview");
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
  if (m.format === "percent") return `${Number(m.value).toLocaleString(localeTag(), { maximumFractionDigits: 1 })}%`;
  return Number(m.value).toLocaleString(localeTag());
};

const formatDelta = (d) => {
  if (d.format === "rupiah") return showAmount.value ? formatRupiahCompact(d.value) : "Rp ••••";
  if (d.format === "percent") return `${d.value.toLocaleString(localeTag(), { maximumFractionDigits: 1 })}%`;
  if (d.format === "points") return t("dashboard.keyMetrics.points", { n: d.value.toLocaleString(localeTag(), { maximumFractionDigits: 1 }) });
  return `+${d.value}`;
};

// Arrow shows the direction; colour shows whether that's good. A delta
// without a `good` flag (e.g. "+2 new projects") is neutral information.
const deltaClass = (d) => {
  if (d.good === undefined) return "bg-ui-subtle text-ui-text";
  return d.good ? "bg-ui-ok-soft text-ui-ok" : "bg-ui-bad-soft text-ui-bad";
};
const heroDeltaClass = (d) => {
  if (d.good === undefined) return "bg-white/10 text-white";
  return d.good ? "bg-white/10 text-[rgb(134_239_172)]" : "bg-white/10 text-[rgb(252_165_165)]";
};
const toneClass = (tone) => (tone === "danger" ? "text-ui-bad" : tone === "warning" ? "text-ui-warn" : "text-ui-muted");
</script>

<template>
  <DashboardWidgetCard frameless :title="$t('dashboard.widgets.keyMetrics')" :subtitle="data ? `${profileLabel(data.profile)} · ${data.period}` : $t('dashboard.keyMetrics.overview')">
    <template #actions>
      <button
        v-if="hasRupiah"
        type="button"
        @click="showAmount = !showAmount"
        :aria-label="showAmount ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
        :title="showAmount ? $t('common.actions.hideAmounts') : $t('common.actions.showAmounts')"
        class="w-8 h-8 -my-1 rounded-ui-control flex items-center justify-center text-ui-faint hover:text-ui-ink hover:bg-ui-hover transition-colors"
      >
        <EyeOff v-if="showAmount" class="w-4 h-4" />
        <Eye v-else class="w-4 h-4" />
      </button>
    </template>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Skeleton class="sm:col-span-2 lg:row-span-2" height="100%" rounded="12px" style="min-height: 196px" />
      <Skeleton v-for="i in 4" :key="i" height="92px" rounded="12px" />
    </div>

    <p v-else-if="failed" class="text-ui-small text-ui-muted py-8 text-center">{{ $t("dashboard.keyMetrics.loadError") }}</p>
    <p v-else-if="!hero" class="text-ui-small text-ui-muted py-8 text-center">{{ $t("dashboard.keyMetrics.empty") }}</p>

    <div v-else class="ui-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Hero: the one number this role checks first -->
      <RouterLink
        :to="hero.route ? { name: hero.route } : ''"
        class="sm:col-span-2 lg:row-span-2 min-h-[196px] rounded-ui-card bg-ui-ink p-5 flex flex-col justify-between text-white group transition-shadow duration-ui-base hover:shadow-ui-raised"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <component :is="ICONS[hero.key]" class="w-4 h-4 text-white/60 shrink-0" />
            <p class="text-white/75 text-ui-small font-medium truncate">{{ hero.label }}</p>
          </div>
          <ChevronRight class="w-4 h-4 text-white/40 group-hover:text-white transition-colors shrink-0" />
        </div>

        <div class="my-5">
          <p v-count-up class="text-ui-display tabular-nums break-words">
            {{ formatValue(hero) }}<span v-if="hero.suffix" class="text-white/50 text-ui-h1">{{ hero.suffix }}</span>
          </p>
          <div v-if="hero.delta" class="mt-2.5 flex flex-wrap items-center gap-2 text-ui-cap">
            <span class="inline-flex items-center gap-1 px-1.5 h-5 rounded-md font-medium" :class="heroDeltaClass(hero.delta)">
              <ArrowUpRight v-if="hero.delta.direction === 'up'" class="w-3.5 h-3.5" />
              <ArrowDownRight v-else class="w-3.5 h-3.5" />
              {{ formatDelta(hero.delta) }}
            </span>
            <span class="text-white/60">{{ hero.delta.label }}</span>
          </div>
        </div>

        <div>
          <div v-if="hero.progress !== undefined" class="w-full h-1.5 bg-white/15 rounded-full overflow-hidden mb-2">
            <div class="ui-bar-fill h-full rounded-full bg-white" :style="{ width: `${Math.min(hero.progress, 100)}%` }"></div>
          </div>
          <p class="text-white/65 text-ui-cap flex items-center gap-1">
            <AlertTriangle v-if="hero.tone" class="w-3.5 h-3.5 text-[rgb(252_211_77)]" />{{ hero.sub }}
          </p>
        </div>
      </RouterLink>

      <!-- Supporting metrics -->
      <RouterLink
        v-for="m in tiles"
        :key="m.key"
        :to="m.route ? { name: m.route } : ''"
        class="ui-lift bg-ui-surface border border-ui-line rounded-ui-card p-4 hover:border-ui-line-strong flex flex-col min-w-0"
      >
        <div class="flex items-center gap-2 min-w-0">
          <component :is="ICONS[m.key]" class="w-4 h-4 text-ui-faint shrink-0" />
          <p class="text-ui-small text-ui-muted truncate">{{ m.label }}</p>
        </div>
        <p v-count-up class="text-ui-h1 text-ui-ink tabular-nums mt-1.5 truncate" :title="showAmount && m.format === 'rupiah' && m.value != null ? formatRupiah(m.value) : undefined">
          {{ formatValue(m, true) }}<span v-if="m.suffix" class="text-ui-muted text-ui-h2">{{ m.suffix }}</span>
        </p>
        <div v-if="m.progress !== undefined" class="w-full h-1 bg-ui-subtle rounded-full overflow-hidden mt-2">
          <div class="ui-bar-fill h-full rounded-full bg-ui-accent" :style="{ width: `${Math.min(m.progress, 100)}%` }"></div>
        </div>
        <div class="mt-auto pt-2 space-y-1">
          <p v-if="m.delta" class="flex flex-wrap items-center gap-1.5 text-ui-cap">
            <span class="inline-flex items-center gap-0.5 px-1.5 h-5 rounded-md font-medium" :class="deltaClass(m.delta)">
              <ArrowUpRight v-if="m.delta.direction === 'up'" class="w-3 h-3" />
              <ArrowDownRight v-else class="w-3 h-3" />
              {{ formatDelta(m.delta) }}
            </span>
            <span class="text-ui-muted">{{ m.delta.label }}</span>
          </p>
          <p class="text-ui-cap flex items-center gap-1" :class="toneClass(m.tone)">
            <AlertTriangle v-if="m.tone" class="w-3 h-3 shrink-0" /><span class="truncate">{{ m.sub }}</span>
          </p>
        </div>
      </RouterLink>
    </div>
  </DashboardWidgetCard>
</template>
