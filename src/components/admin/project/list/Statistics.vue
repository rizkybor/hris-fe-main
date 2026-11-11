<script setup>
import { ref, computed, onMounted } from "vue";
import { Briefcase, PlayCircle, WalletIcon, Eye, EyeOff } from "lucide-vue-next";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import { UiStat } from "@/components/ui";
import { formatRupiah } from "@/utils/formatUtils";

// With `selectable`, the Total/Active tiles filter the list: they emit
// `filter` with "" (all) or "active"; `activeStatus` highlights Active.
const props = defineProps({
  selectable: { type: Boolean, default: false },
  activeStatus: { type: String, default: null },
});
defineEmits(["filter"]);

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
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 ui-stagger">
    <UiStat
      :label="$t('projects.stats.total')"
      :icon="Briefcase"
      :hint="$t('projects.stats.totalHint')"
      :loading="loadingStatistics"
      :selectable="props.selectable"
      @select="$emit('filter', '')"
    >
      <span id="totalProjects">{{ total }}</span>
    </UiStat>

    <UiStat
      :label="$t('projects.stats.active')"
      :icon="PlayCircle"
      :hint="$t('projects.stats.activeHint')"
      :loading="loadingStatistics"
      :selectable="props.selectable"
      :active="props.selectable && props.activeStatus === 'active'"
      @select="$emit('filter', 'active')"
    >
      <span id="activeProjects">{{ active }}</span>
    </UiStat>

    <UiStat :label="$t('projects.stats.budget')" :icon="WalletIcon" :hint="$t('projects.stats.budgetHint')" :loading="loadingStatistics" class="col-span-2 sm:col-span-1">
      <span class="flex items-center gap-2 min-w-0">
        <span
          v-if="isBudgetVisible"
          id="totalBudget"
          class="truncate"
          :title="formatRupiah(totalBudget)"
        >{{ formatRupiah(totalBudget) }}</span>
        <span v-else class="truncate tracking-wider">Rp ••••••••</span>
        <button
          type="button"
          @click="toggleBudgetVisibility"
          class="w-7 h-7 shrink-0 rounded-ui-control inline-flex items-center justify-center text-ui-faint hover:text-ui-ink hover:bg-ui-hover transition-colors"
          :title="isBudgetVisible ? $t('projects.stats.hideBudget') : $t('projects.stats.showBudget')"
          :aria-label="isBudgetVisible ? $t('projects.stats.hideBudget') : $t('projects.stats.showBudget')"
        >
          <EyeOff v-if="isBudgetVisible" class="w-4 h-4" />
          <Eye v-else class="w-4 h-4" />
        </button>
      </span>
    </UiStat>
  </div>
</template>
