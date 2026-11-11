<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import {
  CalculatorIcon,
  PlusIcon,
  SearchIcon,
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
import { can } from "@/helpers/permissionHelper";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { calculateMarketingFee } from "@/utils/marketingFee";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { UiPageHeader, UiStat, UiButton, UiBadge, UiInput, UiChips, UiTable, UiEmpty } from "@/components/ui";
import RateSettingModal from "@/components/admin/project-calculator/RateSettingModal.vue";
import LandingPageRateSettingModal from "@/components/admin/project-calculator/LandingPageRateSettingModal.vue";
import Pagination from "@/components/common/Pagination.vue";

const store = useProjectCalculatorStore();
const alertModal = useAlertModalStore();
const {
  rateSetting,
  landingPageRateSetting,
  calculations,
  statistics,
  meta,
  loading,
  loadingRateSetting,
  loadingLandingPageRateSetting,
  loadingStatistics,
} = storeToRefs(store);

const search = ref("");
const scenarioFilter = ref("");
const showRateModal = ref(false);
const showLandingPageRateModal = ref(false);

const fetchAll = () => {
  store.fetchCalculations({
    search: search.value || undefined,
    scenario: scenarioFilter.value || undefined,
    page: 1,
  });
};

onMounted(async () => {
  await Promise.all([store.fetchRateSetting(), store.fetchLandingPageRateSetting(), store.fetchStatistics(), fetchAll()]);
});

let searchTimeout;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(fetchAll, 350);
};

const goToPage = (page) => {
  store.fetchCalculations({
    search: search.value || undefined,
    scenario: scenarioFilter.value || undefined,
    page,
  });
};

const scenarioMeta = {
  feature: { label: "New Feature", tone: "accent" },
  build: { label: "Build from Scratch", tone: "info" },
  landing_page: { label: "Landing Page", tone: "outline" },
};

// Presentation only: filter chips + table columns.
const scenarioOptions = [
  { value: "", label: "All Scenarios" },
  { value: "feature", label: "New Feature" },
  { value: "build", label: "Build from Scratch" },
  { value: "landing_page", label: "Landing Page" },
];
const columns = [
  { key: "name", label: "Estimate" },
  { key: "scenario", label: "Scenario" },
  { key: "duration", label: "Duration" },
  { key: "fee", label: "Fee Ref", align: "right" },
  { key: "total", label: "Total", align: "right" },
  { key: "actions", label: "", align: "right", width: 120 },
];

const handleDelete = async (calc) => {
  const ok = await alertModal.confirm(`Delete estimate "${calc.name}"? This action cannot be undone.`, {
    type: "danger",
    confirmText: "Delete",
  });
  if (!ok) return;
  try {
    await store.deleteCalculation(calc.id);
    await store.fetchStatistics();
  } catch (error) {
    await alertModal.alert("Failed to delete estimate.", { type: "danger" });
  }
};

const onRateSettingSaved = async () => {
  showRateModal.value = false;
  await Promise.all([store.fetchRateSetting(), fetchAll()]);
};

const onLandingPageRateSettingSaved = async () => {
  showLandingPageRateModal.value = false;
  await Promise.all([store.fetchLandingPageRateSetting(), fetchAll()]);
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader title="Project Calculator" subtitle="Consistent development cost estimates.">
      <template #actions>
        <UiButton v-if="can('project-calculator-create')" :icon="PlusIcon" :to="{ name: 'admin.project-calculator.create' }">
          Create New Estimate
        </UiButton>
      </template>
    </UiPageHeader>

    <!-- KPI -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 ui-stagger">
      <UiStat
        label="Estimates Total"
        :value="statistics.total_calculations"
        :hint="`${statistics.this_month} this month`"
        :icon="CalculatorIcon"
        :loading="loadingStatistics"
      />
      <UiStat
        label="Estimates Total Value"
        :value="formatRupiahCompact(statistics.total_value)"
        hint="all history"
        :icon="WalletIcon"
        :loading="loadingStatistics"
      />
      <UiStat
        label="Average Value"
        :value="formatRupiahCompact(statistics.average_value)"
        hint="/ estimate"
        :icon="TrendingUpIcon"
        :loading="loadingStatistics"
      />
      <UiStat label="Scenario" :icon="LayersIcon" :loading="loadingStatistics" hint="breakdown by scenario">
        <span class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 whitespace-normal">
          <span>{{ statistics.total_feature }}<span class="text-ui-small font-normal text-ui-muted"> Features</span></span>
          <span>{{ statistics.total_build }}<span class="text-ui-small font-normal text-ui-muted"> Builds</span></span>
          <span>{{ statistics.total_landing_page }}<span class="text-ui-small font-normal text-ui-muted"> Landing Pages</span></span>
        </span>
      </UiStat>
    </div>

    <!-- Rate setups -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
      <section class="bg-ui-surface border border-ui-line rounded-ui-card">
        <div class="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-ui-line">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-ui-control bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0">
              <Users2Icon class="w-[18px] h-[18px]" />
            </div>
            <div class="min-w-0">
              <h2 class="text-ui-h3 text-ui-ink">Team Rate Setup</h2>
              <p class="text-ui-cap text-ui-muted">Baseline fee &amp; rate/hour.</p>
            </div>
          </div>
          <UiButton v-if="can('project-calculator-settings')" variant="secondary" size="sm" :icon="SettingsIcon" @click="showRateModal = true">
            Rate Config
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
            <dt class="text-ui-cap text-ui-muted">Team Fee / Month</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiahCompact(rateSetting.team_monthly_cost) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">Team &amp; Productive Hours</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5">
              {{ rateSetting.team_size }} orang &middot; {{ rateSetting.total_productive_hours_per_month }} jam/bulan
            </dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">Rate Cost / Hour</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(rateSetting.rate_cost_per_hour) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">Rate Sell / Hour ({{ rateSetting.margin_multiplier }}x)</dt>
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
              <h2 class="text-ui-h3 text-ui-ink">Landing Page Rate Setup</h2>
              <p class="text-ui-cap text-ui-muted">The Landing Page scenario</p>
            </div>
          </div>
          <UiButton v-if="can('project-calculator-menu')" variant="secondary" size="sm" :icon="SettingsIcon" @click="showLandingPageRateModal = true">
            Landing Page Config
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
            <dt class="text-ui-cap text-ui-muted">Server Dedicated</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.server_dedicated_price) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">Server Shared</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.server_shared_price) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">Design Dedicated</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.design_dedicated_price) }}</dd>
          </div>
          <div class="bg-ui-surface px-4 sm:px-5 py-3.5 min-w-0">
            <dt class="text-ui-cap text-ui-muted">Design Template</dt>
            <dd class="text-ui-body font-medium text-ui-ink tabular-nums mt-0.5 truncate">{{ formatRupiah(landingPageRateSetting.design_template_price) }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <!-- Estimate history -->
    <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0 overflow-hidden">
      <div class="px-4 sm:px-5 pt-4 pb-3 flex flex-col lg:flex-row lg:items-center gap-3 border-b border-ui-line">
        <h2 class="text-ui-h2 text-ui-ink lg:mr-auto">Estimate History</h2>
        <UiChips v-model="scenarioFilter" :options="scenarioOptions" size="sm" @update:model-value="fetchAll" />
        <UiInput
          v-model="search"
          :icon="SearchIcon"
          placeholder="Search estimate or client name..."
          class="lg:w-[280px]"
          @update:model-value="onSearchInput"
        />
      </div>

      <UiTable :columns="columns" :rows="calculations" :meta="meta" :loading="loading" :skeleton-rows="4">
        <template #cell-name="{ row }">
          <div class="min-w-0 max-w-[320px]">
            <p class="text-ui-body font-medium text-ui-ink truncate">{{ row.name }}</p>
            <p class="text-ui-cap text-ui-muted truncate">{{ row.client_name || "—" }}</p>
          </div>
        </template>
        <template #cell-scenario="{ row }">
          <UiBadge :tone="scenarioMeta[row.scenario].tone">{{ scenarioMeta[row.scenario].label }}</UiBadge>
        </template>
        <template #cell-duration="{ row }">
          <span class="inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
            <ClockIcon class="w-3.5 h-3.5 text-ui-faint" />
            {{ row.estimated_duration_weeks ?? "-" }} weeks estimated
          </span>
          <span v-if="row.estimated_duration_weeks" class="block text-ui-cap text-ui-muted tabular-nums">
            &asymp; {{ (row.estimated_duration_weeks / 4.33).toFixed(1).replace(".", ",") }} months
          </span>
        </template>
        <template #cell-fee="{ row }">
          <span class="tabular-nums whitespace-nowrap">{{ formatRupiahCompact(calculateMarketingFee(row.grand_total).amount) }}</span>
          <span class="block text-ui-cap text-ui-muted tabular-nums">{{ calculateMarketingFee(row.grand_total).percent }}%</span>
        </template>
        <template #cell-total="{ row }">
          <span class="text-ui-body font-semibold text-ui-ink tabular-nums whitespace-nowrap">
            {{ formatRupiah(row.include_ppn ? row.total_with_ppn : row.grand_total) }}
          </span>
          <span class="block text-ui-cap text-ui-muted">{{ row.include_ppn ? "including VAT" : "excluding VAT" }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5">
            <RouterLink
              :to="{ name: 'admin.project-calculator.detail', params: { id: row.id } }"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
              title="Lihat Detail"
              aria-label="Lihat Detail"
            >
              <Eye class="w-4 h-4" />
            </RouterLink>
            <RouterLink
              v-if="can('project-calculator-edit')"
              :to="{ name: 'admin.project-calculator.edit', params: { id: row.id } }"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
              title="Edit"
              aria-label="Edit"
            >
              <Pencil class="w-4 h-4" />
            </RouterLink>
            <button
              v-if="can('project-calculator-delete')"
              type="button"
              class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
              title="Delete"
              aria-label="Delete"
              @click="handleDelete(row)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>

        <template #mobile="{ row, number }">
          <div class="flex items-start gap-3 px-4 py-3.5">
            <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
            <div class="flex-1 min-w-0">
              <RouterLink
                :to="{ name: 'admin.project-calculator.detail', params: { id: row.id } }"
                class="block text-ui-body font-medium text-ui-ink truncate"
              >{{ row.name }}</RouterLink>
              <p v-if="row.client_name" class="text-ui-cap text-ui-muted truncate">{{ row.client_name }}</p>
              <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                <UiBadge :tone="scenarioMeta[row.scenario].tone">{{ scenarioMeta[row.scenario].label }}</UiBadge>
                <span class="text-ui-cap text-ui-muted tabular-nums">{{ row.estimated_duration_weeks ?? "-" }} weeks</span>
              </div>
              <p class="text-ui-cap text-ui-muted tabular-nums mt-1">
                Fee Ref: {{ calculateMarketingFee(row.grand_total).percent }}% ({{ formatRupiahCompact(calculateMarketingFee(row.grand_total).amount) }})
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-ui-body font-semibold text-ui-ink tabular-nums">
                {{ formatRupiahCompact(row.include_ppn ? row.total_with_ppn : row.grand_total) }}
              </p>
              <p class="text-ui-cap text-ui-muted">{{ row.include_ppn ? "including VAT" : "excluding VAT" }}</p>
              <div class="flex items-center justify-end gap-0.5 mt-1 -mr-1.5">
                <RouterLink
                  v-if="can('project-calculator-edit')"
                  :to="{ name: 'admin.project-calculator.edit', params: { id: row.id } }"
                  class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover"
                  aria-label="Edit"
                >
                  <Pencil class="w-4 h-4" />
                </RouterLink>
                <button
                  v-if="can('project-calculator-delete')"
                  type="button"
                  class="ui-press w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
                  aria-label="Delete"
                  @click="handleDelete(row)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template #empty>
          <UiEmpty
            compact
            :icon="CalculatorIcon"
            title="No estimates found"
            message="Create your first project estimate to start building your quotation history."
          />
        </template>
      </UiTable>

      <div v-if="!loading && calculations.length > 0" class="px-4 sm:px-5 pb-3 border-t border-ui-line">
        <Pagination :meta="meta" :loading="loading" item-label="estimates" @page-change="goToPage" />
      </div>
    </section>

    <RateSettingModal v-if="showRateModal" @close="showRateModal = false" @saved="onRateSettingSaved" />
    <LandingPageRateSettingModal
      v-if="showLandingPageRateModal"
      @close="showLandingPageRateModal = false"
      @saved="onLandingPageRateSettingSaved"
    />
  </div>
</template>
