<script setup>
import { onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoleStore } from "@/stores/role";
import { useStaffPermissionStore } from "@/stores/staffPermission";
import { useActivityLogStore } from "@/stores/activityLog";
import { can } from "@/helpers/permissionHelper";
import { getTimeAgo } from "@/utils/dateUtils";
import {
  ShieldCheck,
  KeyRound,
  UserCog,
  UserCheck,
  ListChecks,
  DatabaseBackup,
  ChevronRight,
  History,
  ShieldAlert,
} from "lucide-vue-next";

const roleStore = useRoleStore();
const { roles, permissionGroups } = storeToRefs(roleStore);

const staffStore = useStaffPermissionStore();
const { staffAccounts } = storeToRefs(staffStore);

const activityLogStore = useActivityLogStore();
const { activities, statistics: activityStats } = storeToRefs(activityLogStore);

onMounted(() => {
  roleStore.fetchRoles();
  roleStore.fetchPermissions();
  staffStore.fetchStaffAccounts();
  activityLogStore.fetchStatistics();
  activityLogStore.fetchActivities({ row_per_page: 6 });
});

const totalPermissions = computed(() =>
  permissionGroups.value.reduce((sum, g) => sum + g.permissions.length, 0)
);

const staffWithOverrides = computed(
  () => staffAccounts.value.filter((s) => s.direct_permissions_count > 0).length
);

const allQuickLinks = [
  {
    to: { name: "admin.settings.roles" },
    icon: ShieldCheck,
    title: "Roles & Permissions",
    permission: "role-menu",
  },
  {
    to: { name: "admin.settings.staff-permissions" },
    icon: UserCheck,
    title: "Staff Account Permissions",
    permission: "staff-permission-menu",
  },
  {
    to: { name: "admin.settings.dropdown-options" },
    icon: ListChecks,
    title: "Dropdown Options",
    permission: "option-menu",
  },
  {
    to: { name: "admin.settings.backup" },
    icon: DatabaseBackup,
    title: "Backup Database",
    permission: "backup-list",
  },
];

const quickLinks = computed(() =>
  allQuickLinks.filter((link) => !link.permission || can(link.permission))
);
</script>

<template>
  <div class="space-y-6">
    <!-- System Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Quick Access -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 lg:col-span-1">
        <h3 class="text-brand-dark text-lg font-bold mb-4">System Settings</h3>
        <div class="space-y-2">
          <RouterLink
            v-for="link in quickLinks"
            :key="link.title"
            :to="link.to"
            class="flex items-center gap-3 p-3 rounded-[12px] border border-[#DCDEDD] hover:border-[#0C51D9] hover:shadow-sm transition-all"
          >
            <div class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
              <component :is="link.icon" class="w-5 h-5 text-[#0C51D9]" />
            </div>
            <span class="text-brand-dark text-sm font-semibold flex-1">{{ link.title }}</span>
            <ChevronRight class="w-4 h-4 text-gray-400 shrink-0" />
          </RouterLink>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 bg-gray-50 rounded-[12px] flex items-center justify-center shrink-0">
              <History class="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <h3 class="text-brand-dark text-lg font-bold">Recent Activity</h3>
              <p class="text-brand-light text-sm">Latest changes across the system</p>
            </div>
          </div>
          <RouterLink
            v-if="can('history-menu') || can('history-view')"
            :to="{ name: 'admin.history.dashboard' }"
            class="text-[#0C51D9] text-sm font-medium hover:underline shrink-0"
          >
            View All
          </RouterLink>
        </div>

        <div v-if="activities.length === 0" class="text-center py-10 text-sm text-gray-400">
          No activity recorded yet.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="activity in activities"
            :key="activity.id"
            class="flex items-start gap-3 border border-[#DCDEDD] rounded-[12px] p-3"
          >
            <div class="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert class="w-4 h-4 text-red-500" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-brand-dark text-sm font-medium truncate">
                {{ activity.description }}
              </p>
              <p class="text-brand-light text-xs mt-0.5">
                {{ activity.causer?.name || "System" }} &middot; {{ getTimeAgo(activity.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
