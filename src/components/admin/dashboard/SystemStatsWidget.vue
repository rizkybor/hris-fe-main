<script setup>
import { UiStat } from "@/components/ui";
import { onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoleStore } from "@/stores/role";
import { useStaffPermissionStore } from "@/stores/staffPermission";
import { useActivityLogStore } from "@/stores/activityLog";
import { ShieldCheck, KeyRound, UserCog, ShieldAlert } from "lucide-vue-next";

const roleStore = useRoleStore();
const { roles, permissionGroups } = storeToRefs(roleStore);

const staffStore = useStaffPermissionStore();
const { staffAccounts } = storeToRefs(staffStore);

const activityLogStore = useActivityLogStore();
const { statistics: activityStats } = storeToRefs(activityLogStore);

onMounted(() => {
  roleStore.fetchRoles();
  roleStore.fetchPermissions();
  staffStore.fetchStaffAccounts();
  activityLogStore.fetchStatistics();
});

const totalPermissions = computed(() =>
  permissionGroups.value.reduce((sum, g) => sum + g.permissions.length, 0)
);

const staffWithOverrides = computed(
  () => staffAccounts.value.filter((s) => s.direct_permissions_count > 0).length
);
</script>

<template>
  <div class="ui-stagger grid grid-cols-1 sm:grid-cols-2 gap-3">
    <UiStat label="System Roles" :value="roles.length" hint="Configured roles" :icon="ShieldCheck" />
    <UiStat label="Permissions" :value="totalPermissions" hint="Across all modules" :icon="KeyRound" />
    <UiStat label="Staff Accounts" :value="staffAccounts.length" :hint="`${staffWithOverrides} with extra permissions`" :icon="UserCog" />
    <UiStat label="Activity Today" :value="activityStats.today ?? 0" :hint="`${activityStats.this_week ?? 0} this week`" :icon="ShieldAlert" />
  </div>
</template>
