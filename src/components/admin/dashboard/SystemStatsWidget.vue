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
    <UiStat :label="$t('dashboard.systemStats.roles')" :value="roles.length" :hint="$t('dashboard.systemStats.rolesHint')" :icon="ShieldCheck" />
    <UiStat :label="$t('dashboard.systemStats.permissions')" :value="totalPermissions" :hint="$t('dashboard.systemStats.permissionsHint')" :icon="KeyRound" />
    <UiStat :label="$t('dashboard.systemStats.staffAccounts')" :value="staffAccounts.length" :hint="$t('dashboard.systemStats.staffHint', { n: staffWithOverrides })" :icon="UserCog" />
    <UiStat :label="$t('dashboard.systemStats.activityToday')" :value="activityStats.today ?? 0" :hint="$t('dashboard.systemStats.thisWeek', { n: activityStats.this_week ?? 0 })" :icon="ShieldAlert" />
  </div>
</template>
