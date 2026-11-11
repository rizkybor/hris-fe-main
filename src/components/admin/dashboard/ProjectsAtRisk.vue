<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiBadge, UiEmpty } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useProjectStore } from "@/stores/project";
import { storeToRefs } from "pinia";
import { ShieldCheck } from "lucide-vue-next";
import { getProjectHealth } from "@/utils/projectHealth";

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
const HEALTH_TONES = { overdue: "bad", critical: "bad", "at-risk": "warn", behind: "info" };
</script>

<template>
  <DashboardWidgetCard :title="$t('dashboard.widgets.projectsAtRisk')" :subtitle="$t('dashboard.projectsAtRisk.subtitle')" :to="{ name: 'admin.projects' }" flush>
    <SkeletonList v-if="loading" :rows="3" class="p-3" />
    <UiEmpty v-else-if="atRiskProjects.length === 0" :icon="ShieldCheck" :title="$t('dashboard.projectsAtRisk.empty')" compact />
    <ul v-else class="divide-y divide-ui-line">
      <li v-for="{ project, health } in atRiskProjects" :key="project.id">
        <button
          type="button"
          @click="goToProjectDetail(project.id)"
          class="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-ui-hover transition-colors"
        >
          <div class="flex-1 min-w-0">
            <p class="text-ui-body font-medium text-ui-ink truncate">{{ project.name }}</p>
            <div class="mt-1.5 flex items-center gap-2">
              <div class="relative h-1 flex-1 max-w-[160px] bg-ui-subtle rounded-full overflow-hidden">
                <div class="absolute inset-y-0 left-0 bg-ui-line-strong" :style="{ width: `${Math.min(health.expectedProgress, 100)}%` }"></div>
                <div class="absolute inset-y-0 left-0 bg-ui-ink rounded-full" :style="{ width: `${Math.min(health.actualProgress, 100)}%` }"></div>
              </div>
              <span class="text-ui-cap text-ui-muted tabular-nums">{{ $t("dashboard.projectsAtRisk.progress", { actual: health.actualProgress, expected: health.expectedProgress }) }}</span>
            </div>
          </div>
          <UiBadge :tone="HEALTH_TONES[health.level] || 'neutral'" dot class="shrink-0">
            {{ health.label }} · {{ health.daysRemaining >= 0 ? $t("dashboard.projectsAtRisk.daysLeft", { n: health.daysRemaining }) : $t("dashboard.projectsAtRisk.daysOverdue", { n: Math.abs(health.daysRemaining) }) }}
          </UiBadge>
        </button>
      </li>
    </ul>
  </DashboardWidgetCard>
</template>
