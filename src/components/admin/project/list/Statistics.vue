<script setup>
import { ref, computed, onMounted } from "vue";
import { Briefcase, PlayCircle, WalletIcon, Eye, EyeOff } from "lucide-vue-next";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { formatRupiah } from "@/utils/formatUtils";

const projectStore = useProjectStore();
const { loadingStatistics } = storeToRefs(projectStore);

const total = computed(() => projectStore.statistics.total);
const active = computed(() => projectStore.statistics.active);
const totalBudget = computed(() => projectStore.statistics.total_budget ?? 0);

// Hidden by default -- budget is sensitive, revealed only on demand.
const isBudgetVisible = ref(false);
const toggleBudgetVisibility = () => {
  isBudgetVisible.value = !isBudgetVisible.value;
};

onMounted(() => {
  projectStore.fetchStatistics();
});
</script>

<template>
  <!-- Statistics Cards: one horizontal row of KPIs -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
    <!-- Total Projects Card -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:shadow-md transition-all duration-300 p-4 flex flex-col min-h-[144px] group"
    >
      <div class="flex items-center justify-between mb-3">
        <p class="text-brand-dark text-sm font-medium">Total Projects</p>
        <div
          class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-300 shrink-0"
        >
          <Briefcase class="w-4 h-4 text-blue-600" />
        </div>
      </div>
      <div class="mt-auto">
        <Skeleton v-if="loadingStatistics" width="50px" height="1.5rem" rounded="6px" class="mb-1" />
        <p v-else id="totalProjects" class="text-brand-dark text-2xl font-extrabold leading-tight mb-1">
          {{ total }}
        </p>
        <p class="text-success text-xs font-medium">All projects</p>
      </div>
    </div>

    <!-- Active Projects Card -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:shadow-md transition-all duration-300 p-4 flex flex-col min-h-[144px] group"
    >
      <div class="flex items-center justify-between mb-3">
        <p class="text-brand-dark text-sm font-medium">Active Projects</p>
        <div
          class="w-10 h-10 bg-green-50 rounded-[10px] flex items-center justify-center group-hover:bg-green-100 transition-colors duration-300 shrink-0"
        >
          <PlayCircle class="w-4 h-4 text-green-600" />
        </div>
      </div>
      <div class="mt-auto">
        <Skeleton v-if="loadingStatistics" width="50px" height="1.5rem" rounded="6px" class="mb-1" />
        <p v-else id="activeProjects" class="text-brand-dark text-2xl font-extrabold leading-tight mb-1">
          {{ active }}
        </p>
        <p class="text-success text-xs font-medium">In progress</p>
      </div>
    </div>

    <!-- Total Budget Card -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:shadow-md transition-all duration-300 p-4 flex flex-col min-h-[144px] group"
    >
      <div class="flex items-center justify-between mb-3">
        <p class="text-brand-dark text-sm font-medium">Total Budget</p>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click="toggleBudgetVisibility"
            class="w-7 h-7 rounded-full flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
            :title="isBudgetVisible ? 'Hide budget' : 'Show budget'"
          >
            <Eye v-if="!isBudgetVisible" class="w-3.5 h-3.5" />
            <EyeOff v-else class="w-3.5 h-3.5" />
          </button>
          <div
            class="w-10 h-10 bg-indigo-50 rounded-[10px] flex items-center justify-center group-hover:bg-indigo-100 transition-colors duration-300 shrink-0"
          >
            <WalletIcon class="w-4 h-4 text-indigo-600" />
          </div>
        </div>
      </div>
      <div class="mt-auto">
        <Skeleton v-if="loadingStatistics" width="90px" height="1.5rem" rounded="6px" class="mb-1" />
        <p
          v-else-if="isBudgetVisible"
          id="totalBudget"
          class="text-brand-dark font-extrabold leading-tight mb-1 truncate"
          :class="formatRupiah(totalBudget).length > 14 ? 'text-sm' : 'text-lg'"
          :title="formatRupiah(totalBudget)"
        >
          {{ formatRupiah(totalBudget) }}
        </p>
        <p v-else class="text-brand-dark text-lg font-extrabold leading-tight mb-1 tracking-widest">
          Rp ••••••••
        </p>
        <p class="text-brand-light text-xs font-medium">Across all projects</p>
      </div>
    </div>
  </div>
</template>
