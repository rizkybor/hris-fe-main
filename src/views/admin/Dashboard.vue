<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import DashboardWelcome from "@/components/admin/dashboard/DashboardWelcome.vue";
import Statistics from "@/components/admin/dashboard/Statistics.vue";
import EmployeeStatistics from "@/components/admin/dashboard/EmployeeStatistics.vue";
import SearchSection from "@/components/admin/dashboard/SearchSection.vue";
import LatestEmployees from "@/components/admin/dashboard/LatestEmployees.vue";
import LatestTeams from "@/components/admin/dashboard/LatestTeams.vue";
import ProjectsAtRisk from "@/components/admin/dashboard/ProjectsAtRisk.vue";

const authStore = useAuthStore();

// Check if user is employee role
const isEmployee = computed(() => {
  return authStore.user?.roles?.some((role: any) => role === "staff");
});

// Check if user has dashboard view permission
const hasDashboardPermission = computed(() => can("dashboard-view"));

const canViewEmployees = computed(() => can("employee-list"));
const canViewTeams = computed(() => can("team-list"));
const canViewProjects = computed(() => can("project-list"));
</script>

<template>
  <div class="space-y-6">
    <DashboardWelcome />

    <template v-if="isEmployee">
      <div class="space-y-6">
        <EmployeeStatistics />
        <SearchSection v-if="hasDashboardPermission" />
      </div>
    </template>

    <template v-else>
      <div class="space-y-6">
        <Statistics />
        <SearchSection />
        <ProjectsAtRisk v-if="canViewProjects" />
        <div
          v-if="canViewEmployees || canViewTeams"
          class="grid grid-cols-1 gap-4"
          :class="canViewEmployees && canViewTeams ? 'lg:grid-cols-2' : ''"
        >
          <LatestEmployees v-if="canViewEmployees" />
          <LatestTeams v-if="canViewTeams" />
        </div>
      </div>
    </template>
  </div>
</template>
