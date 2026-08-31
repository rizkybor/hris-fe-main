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
  Sparkles,
  ChevronDown,
} from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import { calculateMarketingFee } from "@/utils/marketingFee";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
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
  feature: { label: "New Feature", class: "bg-blue-50 text-blue-700 border-blue-100", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  build: { label: "Build from Scratch", class: "bg-violet-50 text-violet-700 border-violet-100", iconBg: "bg-violet-50", iconColor: "text-violet-600" },
  landing_page: { label: "Landing Page", class: "bg-emerald-50 text-emerald-700 border-emerald-100", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
};

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
  <div class="px-4 py-4">
    <!-- Hero -->
    <div
      class="relative overflow-hidden rounded-[14px] border border-[#0B1042] main-card px-4 sm:px-6 py-5 sm:py-6 mb-5"
    >
      <div
        class="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl"
      ></div>

      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div
            class="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 border border-white/10 rounded-full backdrop-blur-sm mb-2.5"
          >
            <Sparkles class="w-3 h-3 text-blue-300" />
            <span class="text-brand-white-80 text-xs font-medium">Professional Estimation Tool</span>
          </div>
          <h1 class="text-brand-white text-xl sm:text-2xl font-extrabold leading-tight">
            Project Calculator
          </h1>
          <p class="text-brand-white-70 text-xs sm:text-xs mt-1 max-w-xl">
            Consistent development cost estimates.
          </p>
        </div>

        <RouterLink
          v-if="can('project-calculator-create')"
          :to="{ name: 'admin.project-calculator.create' }"
          class="btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 inline-flex items-center gap-1.5 flex-shrink-0 self-start lg:self-center"
        >
          <PlusIcon class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Create New Estimate</span>
        </RouterLink>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Estimates Total</p>
            <Skeleton v-if="loadingStatistics" width="50px" height="1.75rem" rounded="6px" class="my-1.5" />
            <p v-else class="text-brand-dark text-lg font-extrabold leading-tight my-1.5">
              {{ statistics.total_calculations }}
            </p>
            <p class="text-gray-500 text-xs font-medium">{{ statistics.this_month }} this month</p>
          </div>
          <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <CalculatorIcon class="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Estimates Total Value</p>
            <Skeleton v-if="loadingStatistics" width="90px" height="1.75rem" rounded="6px" class="my-1.5" />
            <p v-else class="text-brand-dark text-lg font-extrabold leading-tight my-1.5 truncate">
              {{ formatRupiahCompact(statistics.total_value) }}
            </p>
            <p class="text-gray-500 text-xs font-medium">all history</p>
          </div>
          <div class="w-11 h-11 bg-indigo-50 rounded-[12px] flex items-center justify-center">
            <WalletIcon class="w-5 h-5 text-indigo-600" />
          </div>
        </div>
      </div>

      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Average Value</p>
            <Skeleton v-if="loadingStatistics" width="90px" height="1.75rem" rounded="6px" class="my-1.5" />
            <p v-else class="text-brand-dark text-lg font-extrabold leading-tight my-1.5 truncate">
              {{ formatRupiahCompact(statistics.average_value) }}
            </p>
            <p class="text-gray-500 text-xs font-medium">/ estimate</p>
          </div>
          <div class="w-11 h-11 bg-purple-50 rounded-[12px] flex items-center justify-center">
            <TrendingUpIcon class="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      <div
        class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Scenario</p>
            <Skeleton v-if="loadingStatistics" width="90px" height="1.75rem" rounded="6px" class="my-1.5" />
            <p v-else class="text-brand-dark text-sm font-bold leading-relaxed my-1.5">
              {{ statistics.total_feature }} Features<br />
              {{ statistics.total_build }} Builds<br />
              {{ statistics.total_landing_page }} Landing Pages
            </p>
            <p class="text-gray-500 text-xs font-medium">breakdown by scenario</p>
          </div>
          <div class="w-11 h-11 bg-orange-50 rounded-[12px] flex items-center justify-center">
            <LayersIcon class="w-5 h-5 text-orange-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Rate Setup Summary -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-3.5 mb-5 items-start">
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
          <div class="flex items-center gap-2.5">
            <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
              <Users2Icon class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-sm font-bold">Team Rate Setup</h3>
              <p class="text-brand-light text-xs">Baseline fee &amp; rate/hour.</p>
            </div>
          </div>
          <button
            v-if="can('project-calculator-settings')"
            @click="showRateModal = true"
            class="bg-amber-200 border border-amber-500 rounded-[10px] hover:bg-white hover:border-[#0C51D9] hover:border-2 transition-all duration-300 px-3.5 py-1.5 inline-flex items-center gap-1.5 self-start sm:self-center"
          >
            <SettingsIcon class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-semibold">Rate Config</span>
          </button>
        </div>

        <div v-if="loadingRateSetting" class="grid grid-cols-2 gap-3.5">
          <Skeleton v-for="i in 4" :key="i" height="60px" rounded="12px" />
        </div>
        <div v-else class="grid grid-cols-2 gap-3.5">
          <div class="p-2.5 rounded-[12px] bg-gray-100 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium">Team Fee / Month</p>
            <p class="text-brand-dark text-sm font-bold mt-1">{{ formatRupiahCompact(rateSetting.team_monthly_cost) }}</p>
          </div>
          <div class="p-2.5 rounded-[12px] bg-gray-100 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium">Team &amp; Productive Hours</p>
            <p class="text-brand-dark text-sm font-bold mt-1">
              {{ rateSetting.team_size }} orang &middot; {{ rateSetting.total_productive_hours_per_month }} jam/bulan
            </p>
          </div>
          <div class="p-2.5 rounded-[12px] bg-blue-100 border border-blue-100">
            <p class="text-xs text-blue-600 font-medium">Rate Cost / Hour</p>
            <p class="text-blue-900 text-sm font-bold mt-1">{{ formatRupiah(rateSetting.rate_cost_per_hour) }}</p>
          </div>
          <div class="p-2.5 rounded-[12px] bg-indigo-100 border border-indigo-100">
            <p class="text-xs text-indigo-600 font-medium">Rate Sell / Hour ({{ rateSetting.margin_multiplier }}x)</p>
            <p class="text-indigo-900 text-sm font-bold mt-1">{{ formatRupiah(rateSetting.rate_sell_per_hour) }}</p>
          </div>
        </div>
      </div>

      <!-- Landing Page Rate Setup -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
          <div class="flex items-center gap-2.5">
            <div class="w-11 h-11 bg-emerald-50 rounded-[12px] flex items-center justify-center">
              <Globe class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 class="text-brand-dark text-sm font-bold">Landing Page Rate Setup</h3>
              <p class="text-brand-light text-xs">The Landing Page scenario</p>
            </div>
          </div>
          <button
            v-if="can('project-calculator-menu')"
            @click="showLandingPageRateModal = true"
            class="bg-amber-200 border border-amber-500 rounded-[10px] hover:bg-white hover:border-[#0C51D9] hover:border-2 transition-all duration-300 px-3.5 py-1.5 inline-flex items-center gap-1.5 self-start sm:self-center"
          >
            <SettingsIcon class="w-4 h-4 text-gray-600" />
            <span class="text-brand-dark text-sm font-semibold">Landing Page Config</span>
          </button>
        </div>

        <div v-if="loadingLandingPageRateSetting" class="grid grid-cols-2 gap-3.5">
          <Skeleton v-for="i in 4" :key="i" height="60px" rounded="12px" />
        </div>
        <div v-else class="grid grid-cols-2 gap-3.5">
          <div class="p-2.5 rounded-[12px] bg-gray-100 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium">Server Dedicated</p>
            <p class="text-brand-dark text-sm font-bold mt-1">{{ formatRupiah(landingPageRateSetting.server_dedicated_price) }}</p>
          </div>
          <div class="p-2.5 rounded-[12px] bg-gray-100 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium">Server Shared</p>
            <p class="text-brand-dark text-sm font-bold mt-1">{{ formatRupiah(landingPageRateSetting.server_shared_price) }}</p>
          </div>
          <div class="p-2.5 rounded-[12px] bg-gray-100 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium">Design Dedicated</p>
            <p class="text-brand-dark text-sm font-bold mt-1">{{ formatRupiah(landingPageRateSetting.design_dedicated_price) }}</p>
          </div>
          <div class="p-2.5 rounded-[12px] bg-gray-100 border border-[#F1F1F1]">
            <p class="text-xs text-gray-500 font-medium">Design Template</p>
            <p class="text-brand-dark text-sm font-bold mt-1">{{ formatRupiah(landingPageRateSetting.design_template_price) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
        <h3 class="text-brand-dark text-sm font-bold">Estimate History</h3>
        <div class="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <div class="relative flex-1 sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <SearchIcon class="w-4 h-4 text-blue-400" />
            </div>
            <input
              v-model="search"
              @input="onSearchInput"
              type="text"
              placeholder="Search estimate or client name..."
              class="w-full pl-8 pr-3.5 py-1.5 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            />
          </div>
          <div class="relative">
            <select
              v-model="scenarioFilter"
              @change="fetchAll"
              class="select-soft"
            >
              <option value="">All Scenarios</option>
              <option value="feature">New Feature</option>
              <option value="build">Build from Scratch</option>
              <option value="landing_page">Landing Page</option>
            </select>
            <ChevronDown
              class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      <SkeletonList v-if="loading" :rows="4" />

      <div v-else-if="calculations.length === 0" class="text-center py-12">
        <CalculatorIcon class="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
        <p class="text-brand-dark text-sm font-semibold">No estimates found</p>
        <p class="text-brand-light text-xs mt-1">Create your first project estimate to start building your quotation history.</p>
      </div>

      <div v-else class="space-y-2.5">
        <div
          v-for="calc in calculations"
          :key="calc.id"
          class="flex flex-col sm:flex-row sm:items-center gap-3.5 p-3.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:shadow-sm transition-all"
        >
          <div
            class="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
            :class="scenarioMeta[calc.scenario].iconBg"
          >
            <CalculatorIcon class="w-6 h-6" :class="scenarioMeta[calc.scenario].iconColor" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <p class="text-brand-dark text-sm font-bold truncate">{{ calc.name }}</p>
              <span
                class="px-1.5 py-0.5 rounded-md text-xs font-semibold border"
                :class="scenarioMeta[calc.scenario].class"
              >
                {{ scenarioMeta[calc.scenario].label }}
              </span>
            </div>
            <p class="text-brand-light text-xs mt-0.5">
              <span v-if="calc.client_name">{{ calc.client_name }} &middot; </span>
              <span class="inline-flex items-center gap-1">
                <ClockIcon class="w-3.5 h-3.5" />
                {{ calc.estimated_duration_weeks ?? "-" }} weeks estimated
              </span>
              <span class="text-purple-600">
                &middot; Fee Ref: {{ calculateMarketingFee(calc.grand_total).percent }}% ({{ formatRupiahCompact(calculateMarketingFee(calc.grand_total).amount) }})
              </span>
            </p>
          </div>

          <div class="text-left sm:text-right">
            <p class="text-brand-dark text-sm font-extrabold">
              {{ formatRupiah(calc.include_ppn ? calc.total_with_ppn : calc.grand_total) }}
            </p>
            <p class="text-gray-400 text-xs">{{ calc.include_ppn ? "including VAT" : "excluding VAT" }}</p>
          </div>

          <div class="grid grid-cols-3 sm:flex items-center gap-1.5 flex-shrink-0">
            <RouterLink
              :to="{ name: 'admin.project-calculator.detail', params: { id: calc.id } }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
              title="Lihat Detail"
            >
              <Eye class="w-4 h-4 text-gray-600" />
            </RouterLink>
            <RouterLink
              v-if="can('project-calculator-edit')"
              :to="{ name: 'admin.project-calculator.edit', params: { id: calc.id } }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
              title="Edit"
            >
              <Pencil class="w-4 h-4 text-gray-600" />
            </RouterLink>
            <button
              v-if="can('project-calculator-delete')"
              @click="handleDelete(calc)"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-1.5 hover:border-red-500 hover:ring-2 hover:ring-red-500/30 hover:bg-red-50 group transition-all"
              title="Delete"
            >
              <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && calculations.length > 0" class="pt-3.5 border-t border-[#DCDEDD] mt-5">
        <Pagination :meta="meta" :loading="loading" item-label="estimates" @page-change="goToPage" />
      </div>
    </div>

    <RateSettingModal v-if="showRateModal" @close="showRateModal = false" @saved="onRateSettingSaved" />
    <LandingPageRateSettingModal
      v-if="showLandingPageRateModal"
      @close="showLandingPageRateModal = false"
      @saved="onLandingPageRateSettingSaved"
    />
  </div>
</template>
