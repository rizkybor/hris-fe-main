<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import DashboardWelcome from "@/components/admin/dashboard/DashboardWelcome.vue";
import SuperAdminOverview from "@/components/admin/dashboard/SuperAdminOverview.vue";
import ManagerOverview from "@/components/admin/dashboard/ManagerOverview.vue";
import OperationalDirectorOverview from "@/components/admin/dashboard/OperationalDirectorOverview.vue";
import HrOverview from "@/components/admin/dashboard/HrOverview.vue";
import FinanceManagerOverview from "@/components/admin/dashboard/FinanceManagerOverview.vue";
import StaffOverview from "@/components/admin/dashboard/StaffOverview.vue";

const authStore = useAuthStore();

// Each role now gets a purpose-built overview instead of sharing one
// generic layout -- priority order matters for accounts holding more
// than one role.
const primaryRole = computed(() => {
  const roles = authStore.user?.roles || [];
  if (roles.some((role: any) => role === "superadmin")) return "superadmin";
  if (roles.some((role: any) => role === "manager")) return "manager";
  if (roles.some((role: any) => role === "operational_director")) return "operational_director";
  if (roles.some((role: any) => role === "finance")) return "finance";
  if (roles.some((role: any) => role === "hr")) return "hr";
  if (roles.some((role: any) => role === "staff")) return "staff";
  return roles[0];
});
</script>

<template>
  <div class="px-4 py-4 space-y-6">
    <DashboardWelcome />

    <SuperAdminOverview v-if="primaryRole === 'superadmin'" />
    <ManagerOverview v-else-if="primaryRole === 'manager'" />
    <OperationalDirectorOverview v-else-if="primaryRole === 'operational_director'" />
    <FinanceManagerOverview v-else-if="primaryRole === 'finance'" />
    <HrOverview v-else-if="primaryRole === 'hr'" />
    <StaffOverview v-else-if="primaryRole === 'staff'" />
  </div>
</template>
