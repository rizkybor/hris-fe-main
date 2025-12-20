<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import Statistics from "@/components/admin/dashboard/Statistics.vue";
import EmployeeStatistics from "@/components/admin/dashboard/EmployeeStatistics.vue";
import SearchSection from "@/components/admin/dashboard/SearchSection.vue";
import LatestEmployees from "@/components/admin/dashboard/LatestEmployees.vue";
import LatestTeams from "@/components/admin/dashboard/LatestTeams.vue";

const authStore = useAuthStore();

// Check if user is employee role
const isEmployee = computed(() => {
  return authStore.user?.roles?.some((role: any) => role === "employee");
});

// Check if user has dashboard view permission
const hasDashboardPermission = computed(() => {
  return authStore.user?.permissions?.some(
    (permission: any) => permission.name === "dashboard-view"
  );
});
</script>

<template>
  <div class="space-y-6">
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
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LatestEmployees />
          <LatestTeams />
        </div>
      </div>
    </template>
  </div>
</template>
