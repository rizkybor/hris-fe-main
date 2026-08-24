<script setup>
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
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-base font-medium">System Roles</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ roles.length }}
          </p>
          <p class="text-brand-light text-sm font-medium">Configured roles</p>
        </div>
        <div class="w-12 h-12 bg-red-50 rounded-[12px] flex items-center justify-center shrink-0">
          <ShieldCheck class="w-6 h-6 text-red-600" />
        </div>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-base font-medium">Permissions</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ totalPermissions }}
          </p>
          <p class="text-brand-light text-sm font-medium">Across all modules</p>
        </div>
        <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center shrink-0">
          <KeyRound class="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-base font-medium">Staff Accounts</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ staffAccounts.length }}
          </p>
          <p class="text-brand-light text-sm font-medium">
            {{ staffWithOverrides }} with extra permissions
          </p>
        </div>
        <div class="w-12 h-12 bg-indigo-50 rounded-[12px] flex items-center justify-center shrink-0">
          <UserCog class="w-6 h-6 text-indigo-600" />
        </div>
      </div>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-base font-medium">Activity Today</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ activityStats.today }}
          </p>
          <p class="text-brand-light text-sm font-medium">{{ activityStats.this_week }} this week</p>
        </div>
        <div class="w-12 h-12 bg-orange-50 rounded-[12px] flex items-center justify-center shrink-0">
          <ShieldAlert class="w-6 h-6 text-orange-600" />
        </div>
      </div>
    </div>
  </div>
</template>
