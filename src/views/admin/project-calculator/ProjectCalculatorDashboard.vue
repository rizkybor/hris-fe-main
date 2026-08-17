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
  Eye,
  Pencil,
  Trash2,
  Users2Icon,
  ClockIcon,
  Sparkles,
} from "lucide-vue-next";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { useAlertModalStore } from "@/stores/alertModal";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah, formatRupiahCompact } from "@/utils/formatUtils";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import RateSettingModal from "@/components/admin/project-calculator/RateSettingModal.vue";
import Pagination from "@/components/common/Pagination.vue";

const store = useProjectCalculatorStore();
const alertModal = useAlertModalStore();
const { rateSetting, calculations, statistics, meta, loading, loadingRateSetting, loadingStatistics } =
  storeToRefs(store);

const search = ref("");
const scenarioFilter = ref("");
const showRateModal = ref(false);

const fetchAll = () => {
  store.fetchCalculations({
    search: search.value || undefined,
    scenario: scenarioFilter.value || undefined,
    page: 1,
  });
};

onMounted(async () => {
  await Promise.all([store.fetchRateSetting(), store.fetchStatistics(), fetchAll()]);
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
  feature: { label: "Fitur Baru", class: "bg-blue-50 text-blue-700 border-blue-100" },
  build: { label: "Bangun dari 0", class: "bg-violet-50 text-violet-700 border-violet-100" },
};

const handleDelete = async (calc) => {
  const ok = await alertModal.confirm(`Hapus estimasi "${calc.name}"? Tindakan ini tidak bisa dibatalkan.`, {
    type: "danger",
    confirmText: "Hapus",
  });
  if (!ok) return;
  try {
    await store.deleteCalculation(calc.id);
    await store.fetchStatistics();
  } catch (error) {
    await alertModal.alert("Gagal menghapus estimasi.", { type: "danger" });
  }
};

const onRateSettingSaved = async () => {
  showRateModal.value = false;
  await Promise.all([store.fetchRateSetting(), fetchAll()]);
};
</script>

<template>
  <div>
    <!-- Hero -->
    <div
      class="relative overflow-hidden rounded-[14px] border border-[#0B1042] main-card px-5 sm:px-7 py-6 sm:py-7 mb-6"
    >
      <div
        class="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl"
      ></div>

      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div
            class="inline-flex items-center gap-1 px-3 py-1 bg-white/10 border border-white/10 rounded-full backdrop-blur-sm mb-3"
          >
            <Sparkles class="w-3 h-3 text-blue-300" />
            <span class="text-brand-white-80 text-xs font-medium">Professional Estimation Tool</span>
          </div>
          <h1 class="text-brand-white text-2xl sm:text-3xl font-extrabold leading-tight">
            Project Calculator
          </h1>
          <p class="text-brand-white-70 text-sm sm:text-base mt-1 max-w-xl">
            Consistent development cost estimates &mdash; from adding features to building an app from scratch—based on timeframes and complexity factors.
          </p>
        </div>

        <RouterLink
          v-if="can('project-calculator-create')"
          :to="{ name: 'admin.project-calculator.create' }"
          class="btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-5 py-3 inline-flex items-center gap-2 flex-shrink-0 self-start lg:self-center"
        >
          <PlusIcon class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">Create New Estimate</span>
        </RouterLink>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Estimates Total</p>
            <Skeleton v-if="loadingStatistics" width="50px" height="1.75rem" rounded="6px" class="my-2" />
            <p v-else class="text-brand-dark text-2xl font-extrabold leading-tight my-2">
              {{ statistics.total_calculations }}
            </p>
            <p class="text-gray-500 text-sm font-medium">{{ statistics.this_month }} this month</p>
          </div>
          <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <CalculatorIcon class="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Estimates Total Value</p>
            <Skeleton v-if="loadingStatistics" width="90px" height="1.75rem" rounded="6px" class="my-2" />
            <p v-else class="text-brand-dark text-2xl font-extrabold leading-tight my-2 truncate">
              {{ formatRupiahCompact(statistics.total_value) }}
            </p>
            <p class="text-gray-500 text-sm font-medium">all history</p>
          </div>
          <div class="w-11 h-11 bg-indigo-50 rounded-[12px] flex items-center justify-center">
            <WalletIcon class="w-5 h-5 text-indigo-600" />
          </div>
        </div>
      </div>

      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Average Value</p>
            <Skeleton v-if="loadingStatistics" width="90px" height="1.75rem" rounded="6px" class="my-2" />
            <p v-else class="text-brand-dark text-2xl font-extrabold leading-tight my-2 truncate">
              {{ formatRupiahCompact(statistics.average_value) }}
            </p>
            <p class="text-gray-500 text-sm font-medium">/ estimate</p>
          </div>
          <div class="w-11 h-11 bg-purple-50 rounded-[12px] flex items-center justify-center">
            <TrendingUpIcon class="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      <div
        class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Scenario</p>
            <Skeleton v-if="loadingStatistics" width="90px" height="1.75rem" rounded="6px" class="my-2" />
            <p v-else class="text-brand-dark text-lg font-bold leading-tight my-2">
              {{ statistics.total_feature }} Features &middot; {{ statistics.total_build }} Builds
            </p>
            <p class="text-gray-500 text-sm font-medium">new features vs new build from scratch</p>
          </div>
          <div class="w-11 h-11 bg-orange-50 rounded-[12px] flex items-center justify-center">
            <LayersIcon class="w-5 h-5 text-orange-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Rate Setup Summary -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
            <Users2Icon class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="text-brand-dark text-lg font-bold">Team Rate Setup</h3>
            <p class="text-brand-light text-sm">Baseline fee &amp; rate/hour used throughout the estimation</p>
          </div>
        </div>
        <button
          v-if="can('project-calculator-settings')"
          @click="showRateModal = true"
          class="border border-[#DCDEDD] rounded-[10px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 px-4 py-2 inline-flex items-center gap-2 self-start sm:self-center"
        >
          <SettingsIcon class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark text-sm font-semibold">Rate Config</span>
        </button>
      </div>

      <div v-if="loadingRateSetting" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Skeleton v-for="i in 4" :key="i" height="60px" rounded="12px" />
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-3 rounded-[12px] bg-gray-50 border border-[#F1F1F1]">
          <p class="text-xs text-gray-500 font-medium">Team Fee / Month</p>
          <p class="text-brand-dark text-base font-bold mt-1">{{ formatRupiahCompact(rateSetting.team_monthly_cost) }}</p>
        </div>
        <div class="p-3 rounded-[12px] bg-gray-50 border border-[#F1F1F1]">
          <p class="text-xs text-gray-500 font-medium">Team &amp; Productive Hours</p>
          <p class="text-brand-dark text-base font-bold mt-1">
            {{ rateSetting.team_size }} orang &middot; {{ rateSetting.total_productive_hours_per_month }} jam/bulan
          </p>
        </div>
        <div class="p-3 rounded-[12px] bg-blue-50 border border-blue-100">
          <p class="text-xs text-blue-600 font-medium">Rate Cost / Hour</p>
          <p class="text-blue-900 text-base font-bold mt-1">{{ formatRupiah(rateSetting.rate_cost_per_hour) }}</p>
        </div>
        <div class="p-3 rounded-[12px] bg-indigo-50 border border-indigo-100">
          <p class="text-xs text-indigo-600 font-medium">Rate Sell / Hour ({{ rateSetting.margin_multiplier }}x)</p>
          <p class="text-indigo-900 text-base font-bold mt-1">{{ formatRupiah(rateSetting.rate_sell_per_hour) }}</p>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 class="text-brand-dark text-lg font-bold">Estimate History</h3>
        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div class="relative flex-1 sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon class="w-4 h-4 text-blue-400" />
            </div>
            <input
              v-model="search"
              @input="onSearchInput"
              type="text"
              placeholder="Search estimate or client name..."
              class="w-full pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            />
          </div>
          <select
            v-model="scenarioFilter"
            @change="fetchAll"
            class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm font-semibold hover:border-[#0C51D9] focus:border-[#0C51D9] transition-all"
          >
            <option value="">All Scenarios</option>
            <option value="feature">New Feature</option>
            <option value="build">Build from Scratch</option>
          </select>
        </div>
      </div>

      <SkeletonList v-if="loading" :rows="4" />

      <div v-else-if="calculations.length === 0" class="text-center py-12">
        <CalculatorIcon class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-brand-dark text-base font-semibold">No estimates found</p>
        <p class="text-brand-light text-sm mt-1">Create your first project estimate to start building your quotation history.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="calc in calculations"
          :key="calc.id"
          class="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:shadow-sm transition-all"
        >
          <div
            class="w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0"
            :class="calc.scenario === 'feature' ? 'bg-blue-50' : 'bg-violet-50'"
          >
            <CalculatorIcon
              class="w-6 h-6"
              :class="calc.scenario === 'feature' ? 'text-blue-600' : 'text-violet-600'"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-brand-dark text-base font-bold truncate">{{ calc.name }}</p>
              <span
                class="px-2 py-0.5 rounded-md text-xs font-semibold border"
                :class="scenarioMeta[calc.scenario].class"
              >
                {{ scenarioMeta[calc.scenario].label }}
              </span>
            </div>
            <p class="text-brand-light text-sm mt-0.5">
              <span v-if="calc.client_name">{{ calc.client_name }} &middot; </span>
              <span class="inline-flex items-center gap-1">
                <ClockIcon class="w-3.5 h-3.5" />
                {{ calc.estimated_duration_weeks ?? "-" }} weeks estimated
              </span>
            </p>
          </div>

          <div class="text-left sm:text-right">
            <p class="text-brand-dark text-lg font-extrabold">
              {{ formatRupiah(calc.include_ppn ? calc.total_with_ppn : calc.grand_total) }}
            </p>
            <p class="text-gray-400 text-xs">{{ calc.include_ppn ? "including VAT" : "excluding VAT" }}</p>
          </div>

          <div class="grid grid-cols-3 sm:flex items-center gap-2 flex-shrink-0">
            <RouterLink
              :to="{ name: 'admin.project-calculator.detail', params: { id: calc.id } }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
              title="Lihat Detail"
            >
              <Eye class="w-4 h-4 text-gray-600" />
            </RouterLink>
            <RouterLink
              v-if="can('project-calculator-edit')"
              :to="{ name: 'admin.project-calculator.edit', params: { id: calc.id } }"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:border-[#0C51D9] hover:ring-2 hover:ring-[#0C51D9]/30 transition-all"
              title="Edit"
            >
              <Pencil class="w-4 h-4 text-gray-600" />
            </RouterLink>
            <button
              v-if="can('project-calculator-delete')"
              @click="handleDelete(calc)"
              class="flex justify-center items-center border border-[#DCDEDD] rounded-xl p-2 hover:border-red-500 hover:ring-2 hover:ring-red-500/30 hover:bg-red-50 group transition-all"
              title="Hapus"
            >
              <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && calculations.length > 0" class="pt-4 border-t border-[#DCDEDD] mt-6">
        <Pagination :meta="meta" :loading="loading" item-label="estimasi" @page-change="goToPage" />
      </div>
    </div>

    <RateSettingModal v-if="showRateModal" @close="showRateModal = false" @saved="onRateSettingSaved" />
  </div>
</template>
