<script setup>
import { onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-vue-next";
import { getProjectHealth, PROJECT_HEALTH_BADGE_CLASS } from "@/utils/projectHealth";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

const router = useRouter();
const projectStore = useProjectStore();
const { projects, loading } = storeToRefs(projectStore);
const { fetchProjects } = projectStore;

onMounted(() => {
  // Fetch every non-terminal project (getProjectHealth already excludes
  // "completed"/"cancelled") rather than hardcoding status: "active", since
  // a project can be overdue while sitting in "on_hold", "planning", etc.
  fetchProjects({});
});

const RISK_ORDER = { overdue: 0, critical: 1, "at-risk": 2, behind: 3 };

const atRiskProjects = computed(() => {
  return projects.value
    .map((project) => ({ project, health: getProjectHealth(project) }))
    .filter(({ health }) => health && health.level in RISK_ORDER)
    .sort((a, b) => RISK_ORDER[a.health.level] - RISK_ORDER[b.health.level])
    .slice(0, 5);
});

const goToProjectDetail = (id) => {
  router.push({ name: "admin.projects.detail", params: { id } });
};
</script>

<template>
  <div class="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 rounded-[14px] p-4 sm:p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-orange-100 rounded-[10px] flex items-center justify-center">
          <AlertTriangle class="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Projects at Risk</h3>
          <p class="text-brand-light text-xs">Behind schedule or close to deadline</p>
        </div>
      </div>
      <RouterLink
        :to="{ name: 'admin.projects' }"
        class="text-sm font-semibold text-[#0C51D9] hover:underline flex items-center gap-1 shrink-0"
      >
        View all
        <ArrowRight class="w-3.5 h-3.5" />
      </RouterLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex items-center gap-3">
        <Skeleton width="40px" height="40px" rounded="12px" />
        <div class="flex-1 space-y-2">
          <Skeleton width="50%" height="14px" />
          <Skeleton width="35%" height="12px" />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="atRiskProjects.length === 0" class="text-center py-8">
      <ShieldCheck class="w-10 h-10 text-green-300 mx-auto mb-2" />
      <p class="text-gray-500 text-sm">No active projects are at risk right now</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <button
        v-for="{ project, health } in atRiskProjects"
        :key="project.id"
        type="button"
        @click="goToProjectDetail(project.id)"
        class="w-full text-left border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-3 flex items-center gap-3"
      >
        <div class="flex-1 min-w-0">
          <p class="text-brand-dark text-sm font-semibold truncate">{{ project.name }}</p>
          <p class="text-brand-light text-xs mt-0.5">
            {{ health.actualProgress }}% done &middot; expected {{ health.expectedProgress }}%
          </p>
        </div>
        <span
          class="px-2 py-1 rounded-md text-xs font-semibold shrink-0"
          :class="PROJECT_HEALTH_BADGE_CLASS[health.level]"
        >
          {{ health.label }} &middot;
          {{ health.daysRemaining >= 0 ? `${health.daysRemaining}d left` : `${Math.abs(health.daysRemaining)}d overdue` }}
        </span>
      </button>
    </div>
  </div>
</template>
