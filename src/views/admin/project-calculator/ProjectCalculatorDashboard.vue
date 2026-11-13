<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { debounce } from "lodash-es";
import {
  CalculatorIcon,
  PlusIcon,
  SearchIcon,
  SearchX,
  TrendingUpIcon,
  LayersIcon,
  WalletIcon,
  SettingsIcon,
  Globe,
  Eye,
  Pencil,
  Trash2,
  Users2Icon,
  ClockIcon,
} from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { useAlertModalStore } from "@/stores/alertModal";
import { useToastStore } from "@/stores/toast";
import { useListState } from "@/composables/useListState";
import { useStaleFetch } from "@/composables/useStaleFetch";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { calculateMarketingFee } from "@/utils/marketingFee";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import RecapSection from "@/components/common/RecapSection.vue";
import RecapTile from "@/components/common/RecapTile.vue";
import { UiPageHeader, UiButton, UiBadge, UiInput, UiChips, UiTable, UiEmpty, UiPagination, UiSpinner } from "@/components/ui";
import RateSettingModal from "@/components/admin/project-calculator/RateSettingModal.vue";
import LandingPageRateSettingModal from "@/components/admin/project-calculator/LandingPageRateSettingModal.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const router = useRouter();

const store = useProjectCalculatorStore();
const alertModal = useAlertModalStore();
const toast = useToastStore();
const { rateSetting, landingPageRateSetting, calculations, statistics, meta, loadingRateSetting, loadingLandingPageRateSetting, loadingStatistics } =
  storeToRefs(store);

const showRateModal = ref(false);
const showLandingPageRateModal = ref(false);

const list = useListState("project-calculations", { q: "", scenario: "", page: 1 });
const search = ref(list.q);
watch(search, debounce((v) => (list.q = v.trim()), 300));
watch(() => list.q, (v) => v !== search.value.trim() && (search.value = v));

const params = computed(() => ({ search: list.q || undefined, scenario: list.scenario || undefined, page: list.page }));
const { loading, refreshing, refresh } = useStaleFetch(() => store.fetchCalculations(params.value), {
  key: () => ["calc-list", params.value],
  hasData: () => store.listKey !== null,
});

// Rate setups and the recap are reused for a short while (the form needs
// the same rate setups), so coming back makes no request.
onMounted(() => {
  store.ensureRateSettings();
  store.fetchStatistics({ maxAge: 30_000 });
});

const scenarioMeta = computed(() => ({
  feature: { label: t("calculator.scenario.feature"), tone: "accent" },
  build: { label: t("calculator.scenario.build"), tone: "info" },
  landing_page: { label: t("calculator.scenario.landingPage"), tone: "outline" },
}));

// ===== Presentation only =====
const scenarioOptions = computed(() =>
  [
    { value: "", label: t("calculator.scenario.all") },
    { value: "feature", label: t("calculator.scenario.feature") },
    { value: "build", label: t("calculator.scenario.build") },
    { value: "landing_page", label: t("calculator.scenario.landingPage") },
  ].map((o) => ({ ...o, count: o.value === list.scenario && !loading.value && !refreshing.value ? meta.value.total : undefined }))
);
const scenarioFilter = computed({ get: () => list.scenario, set: (v) => (list.scenario = v) });
const columns = computed(() => [
  { key: "name", label: t("calculator.dashboard.columns.estimate") },
  { key: "scenario", label: t("calculator.dashboard.columns.scenario") },
  { key: "duration", label: t("calculator.dashboard.columns.duration") },
  { key: "fee", label: t("calculator.dashboard.columns.feeRef"), align: "right" },
  { key: "total", label: t("common.labels.total"), align: "right" },
  { key: "actions", label: "", align: "right" },
]);
const recapTiles = computed(() => {
  const s = statistics.value;
  return [
    { key: "total", label: t("calculator.dashboard.stats.total"), value: s.total_calculations, sub: t("calculator.dashboard.stats.thisMonth", { n: s.this_month }), icon: CalculatorIcon },
    { key: "value", label: t("calculator.dashboard.stats.totalValue"), value: formatRupiahCompact(s.total_value), sub: t("calculator.dashboard.stats.allHistory"), icon: WalletIcon },
    { key: "avg", label: t("calculator.dashboard.stats.average"), value: formatRupiahCompact(s.average_value), sub: t("calculator.dashboard.stats.perEstimate"), icon: TrendingUpIcon },
    {
      key: "scenario",
      label: t("calculator.dashboard.stats.scenario"),
      value: `${s.total_feature} · ${s.total_build} · ${s.total_landing_page}`,
      sub: t("calculator.dashboard.stats.scenarioSplit"),
      icon: LayersIcon,
    },
  ];
});
const shownTotal = (row) => (row.include_ppn ? row.total_with_ppn : row.grand_total);
const months = (weeks) => (weeks / 4.33).toFixed(1).replace(".", ",");
const quietDelete = "!text-ui-faint hover:!text-ui-bad hover:!bg-ui-bad-soft";

const detailRoute = (row) => ({ name: "admin.project-calculator.detail", params: { id: row.id } });
const openDetail = (row) => router.push(detailRoute(row));

// The row leaves the page in place (no reload); an emptied later page
// steps back one.
const handleDelete = async (calc) => {
  const ok = await alertModal.confirm(t("calculator.dashboard.deleteConfirm", { name: calc.name }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (!ok) return;
  try {
    await store.deleteCalculation(calc.id);
    toast.success(t("calculator.dashboard.deleted"), calc.name);
    if (!calculations.value.length) {
      if (list.page > 1) list.page -= 1;
      else if (meta.value.total) refresh({ force: true });
    }
  } catch (error) {
    await alertModal.alert(t("calculator.dashboard.deleteFailed"), { type: "danger" });
  }
};

// The modals save through the store, which keeps the returned setup; saved
// estimates keep their own snapshot, so the list needs no reload.
const onRateSettingSaved = () => (showRateModal.value = false);
const onLandingPageRateSettingSaved = () => (showLandingPageRateModal.value = false);
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader :title="$t('calculator.dashboard.title')" :subtitle="$t('calculator.dashboard.subtitle')">
      <template #actions>
        <UiButton v-if="can('project-calculator-create')" :icon="PlusIcon" :to="{ name: 'admin.project-calculator.create' }" class="w-full sm:w-auto">
          {{ $t("calculator.dashboard.createNew") }}
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- Recap: totals only (no charts on this page) -->
    <RecapSection storage-key="calculator-recap-open" :loading="loadingStatistics" class="!mb-0">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
        <RecapTile v-for="tile in recapTiles" :key="tile.key" v-bind="tile" />
      </div>
    </RecapSection>

    <!-- Rate setups -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
      <section class="bg-ui-surface border border-ui-line rounded-ui-card">
        <div class="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
              <Users2Icon class="w-[18px] h-[18px]" />
            </div>
            <div class="min-w-0">
              <h2 class="text-ui-h3 text-ui-ink">{{ $t("calculator.dashboard.teamRate.title") }}</h2>
              <p class="text-ui-cap text-ui-muted">{{ $t("calculator.dashboard.teamRate.subtitle") }}</p>
            </div>
          </div>
          <UiButton v-if="can('project-calculator-settings')" variant="secondary" size="sm" :icon="SettingsIcon" @click="showRateModal = true">
            {{ $t("calculator.dashboard.teamRate.config") }}
          </UiButton>
        </div>
        <div v-if="loadingRateSetting" class="grid grid-cols-2 gap-px bg-ui-line">
          <div v-for="i in 4" :key="i" class="bg-ui-surface px-4 sm:px-5 py-3.5">
            <Skeleton width="60%" height="12px" rounded="4px" />
            <Skeleton width="80%" height="18px" rounded="4px" class="mt-2" />
          </div>
        </div>
        <dl v-else class="grid grid-cols-2 gap-px bg-ui-line rounded-b-ui-card overflow-hidden">
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.dashboard.teamRate.teamFee") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiahCompact(rateSetting.team_monthly_cost) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.dashboard.teamRate.teamHours") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5">
              {{ $t("calculator.dashboard.teamRate.teamHoursValue", { people: rateSetting.team_size, hours: rateSetting.total_productive_hours_per_month }) }}
            </dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.dashboard.teamRate.rateCost") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(rateSetting.rate_cost_per_hour) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.dashboard.teamRate.rateSell", { x: rateSetting.margin_multiplier }) }}</dt>
            <dd class="text-ui-body font-semibold text-ui-accent tabular-nums mt-0.5 truncate">{{ formatRupiah(rateSetting.rate_sell_per_hour) }}</dd>
          </div>
        </dl>
      </section>

      <section class="bg-ui-surface border border-ui-line rounded-ui-card">
        <div class="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
              <Globe class="w-[18px] h-[18px]" />
            </div>
            <div class="min-w-0">
              <h2 class="text-ui-h3 text-ui-ink">{{ $t("calculator.dashboard.lpRate.title") }}</h2>
              <p class="text-ui-cap text-ui-muted">{{ $t("calculator.dashboard.lpRate.subtitle") }}</p>
            </div>
          </div>
          <UiButton v-if="can('project-calculator-menu')" variant="secondary" size="sm" :icon="SettingsIcon" @click="showLandingPageRateModal = true">
            {{ $t("calculator.dashboard.lpRate.config") }}
          </UiButton>
        </div>
        <div v-if="loadingLandingPageRateSetting" class="grid grid-cols-2 gap-px bg-ui-line">
          <div v-for="i in 4" :key="i" class="bg-ui-surface px-4 sm:px-5 py-3.5">
            <Skeleton width="60%" height="12px" rounded="4px" />
            <Skeleton width="80%" height="18px" rounded="4px" class="mt-2" />
          </div>
        </div>
        <dl v-else class="grid grid-cols-2 gap-px bg-ui-line rounded-b-ui-card overflow-hidden">
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.lp.serverDedicated") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.server_dedicated_price) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.lp.serverShared") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.server_shared_price) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.lp.designDedicated") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.design_dedicated_price) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">{{ $t("calculator.lp.designTemplate") }}</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.design_template_price) }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <!-- Estimate history -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <!-- Toolbar: title · search · scenario chips, one line on desktop -->
      <div class="px-4 sm:px-5 py-3 border-b border-ui-line flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3">
        <h2 class="text-ui-h3 text-ui-ink shrink-0">{{ $t("calculator.dashboard.history") }}</h2>
        <UiInput
          v-model="search"
          type="search"
          :icon="SearchIcon"
          :placeholder="$t('calculator.dashboard.searchPlaceholder')"
          :aria-label="$t('calculator.dashboard.searchPlaceholder')"
          class="w-full lg:w-[260px] shrink-0"
        />
        <UiChips v-model="scenarioFilter" :options="scenarioOptions" size="sm" class="min-w-0 lg:flex-1" />
        <span v-if="refreshing" class="inline-flex items-center gap-1.5 text-ui-cap text-ui-muted shrink-0" role="status">
          <UiSpinner size="14px" :center="false" />{{ $t("calculator.dashboard.refreshing") }}
        </span>
      </div>

      <UiTable
        :columns="columns"
        :rows="calculations"
        :meta="meta"
        :loading="loading"
        :skeleton-rows="6"
        :clickable="true"
        :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
        :aria-busy="refreshing || undefined"
        @row-click="openDetail"
      >
        <template #cell-name="{ row }">
          <div class="min-w-0 max-w-[340px] py-1">
            <RouterLink :to="detailRoute(row)" class="block text-ui-body font-medium text-ui-ink truncate hover:underline underline-offset-2" @click.stop>{{ row.name }}</RouterLink>
            <p class="text-ui-cap text-ui-muted truncate">{{ row.client_name || $t("calculator.dashboard.noClient") }}</p>
          </div>
        </template>
        <template #cell-scenario="{ row }">
          <UiBadge :tone="scenarioMeta[row.scenario].tone">{{ scenarioMeta[row.scenario].label }}</UiBadge>
        </template>
        <template #cell-duration="{ row }">
          <span class="inline-flex items-center gap-1.5 text-ui-small text-ui-text tabular-nums whitespace-nowrap">
            <ClockIcon class="w-3.5 h-3.5 text-ui-faint" />
            {{ $t("calculator.dashboard.weeks", { n: row.estimated_duration_weeks ?? "-" }) }}
          </span>
          <span v-if="row.estimated_duration_weeks" class="block text-ui-cap text-ui-muted tabular-nums">
            &asymp; {{ $t("calculator.dashboard.months", { n: months(row.estimated_duration_weeks) }) }}
          </span>
        </template>
        <template #cell-fee="{ row }">
          <span class="text-ui-small text-ui-text tabular-nums whitespace-nowrap">{{ formatRupiahCompact(calculateMarketingFee(row.grand_total).amount) }}</span>
          <span class="block text-ui-cap text-ui-muted tabular-nums">{{ calculateMarketingFee(row.grand_total).percent }}%</span>
        </template>
        <template #cell-total="{ row }">
          <span class="text-ui-body font-medium text-ui-ink tabular-nums whitespace-nowrap">{{ formatRupiah(shownTotal(row)) }}</span>
          <span class="block text-ui-cap text-ui-muted">{{ row.include_ppn ? $t("calculator.vat.including") : $t("calculator.vat.excluding") }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <UiButton
              v-if="can('project-calculator-edit')"
              variant="ghost"
              size="sm"
              class="w-[30px] !px-0"
              :icon="Pencil"
              :to="{ name: 'admin.project-calculator.edit', params: { id: row.id } }"
              :title="$t('common.actions.edit')"
              :aria-label="$t('calculator.dashboard.editItem', { name: row.name })"
            />
            <UiButton variant="secondary" size="sm" :icon="Eye" :to="detailRoute(row)" :aria-label="$t('calculator.dashboard.viewItem', { name: row.name })">
              {{ $t("common.actions.view") }}
            </UiButton>
            <UiButton
              v-if="can('project-calculator-delete')"
              variant="ghost"
              size="sm"
              :class="['w-[30px] !px-0', quietDelete]"
              :icon="Trash2"
              :title="$t('common.actions.delete')"
              :aria-label="$t('calculator.dashboard.deleteItem', { name: row.name })"
              @click="handleDelete(row)"
            />
          </div>
        </template>

        <!-- Phones: the same row as a card -->
        <template #mobile="{ row, number }">
          <div class="px-4 py-3.5">
            <div class="flex items-start gap-3">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-ui-body font-medium text-ui-ink line-clamp-2 break-words">{{ row.name }}</p>
                <p class="text-ui-cap text-ui-muted truncate mt-0.5">{{ row.client_name || $t("calculator.dashboard.noClient") }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-ui-body font-medium text-ui-ink tabular-nums">{{ formatRupiahCompact(shownTotal(row)) }}</p>
                <p class="text-ui-cap text-ui-muted">{{ row.include_ppn ? $t("calculator.vat.including") : $t("calculator.vat.excluding") }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 mt-2 pl-8 flex-wrap">
              <UiBadge :tone="scenarioMeta[row.scenario].tone">{{ scenarioMeta[row.scenario].label }}</UiBadge>
              <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("calculator.dashboard.weeks", { n: row.estimated_duration_weeks ?? "-" }) }}</span>
            </div>
            <div class="flex items-center gap-1 mt-2 pl-8" @click.stop>
              <UiButton variant="secondary" size="sm" :icon="Eye" :to="detailRoute(row)" :aria-label="$t('calculator.dashboard.viewItem', { name: row.name })">{{ $t("common.actions.view") }}</UiButton>
              <UiButton
                v-if="can('project-calculator-edit')"
                variant="ghost"
                size="sm"
                class="w-[30px] !px-0"
                :icon="Pencil"
                :to="{ name: 'admin.project-calculator.edit', params: { id: row.id } }"
                :aria-label="$t('calculator.dashboard.editItem', { name: row.name })"
              />
              <UiButton
                v-if="can('project-calculator-delete')"
                variant="ghost"
                size="sm"
                :class="['w-[30px] !px-0 ml-auto', quietDelete]"
                :icon="Trash2"
                :aria-label="$t('calculator.dashboard.deleteItem', { name: row.name })"
                @click="handleDelete(row)"
              />
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty v-if="list.isDirty" compact :icon="SearchX" :title="$t('calculator.dashboard.noMatch.title')" :message="$t('calculator.dashboard.noMatch.message')">
            <UiButton variant="secondary" @click="(search = ''), list.reset()">{{ $t("common.actions.clearFilters") }}</UiButton>
          </UiEmpty>
          <UiEmpty v-else compact :icon="CalculatorIcon" :title="$t('calculator.dashboard.empty.title')" :message="$t('calculator.dashboard.empty.message')">
            <UiButton v-if="can('project-calculator-create')" variant="secondary" :icon="PlusIcon" :to="{ name: 'admin.project-calculator.create' }">
              {{ $t("calculator.dashboard.createNew") }}
            </UiButton>
          </UiEmpty>
        </template>
      </UiTable>

      <UiPagination v-if="meta.total" :meta="meta" :item-label="$t('calculator.dashboard.itemLabel')" :disabled="loading" @change="(p) => (list.page = p)" />
    </section>

    <RateSettingModal v-if="showRateModal" @close="showRateModal = false" @saved="onRateSettingSaved" />
    <LandingPageRateSettingModal
      v-if="showLandingPageRateModal"
      @close="showLandingPageRateModal = false"
      @saved="onLandingPageRateSettingSaved"
    />
  </div>
</template>
