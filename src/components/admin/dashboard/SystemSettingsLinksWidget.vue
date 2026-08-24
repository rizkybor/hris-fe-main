<script setup>
import { computed } from "vue";
import { ShieldCheck, UserCheck, ListChecks, DatabaseBackup, ChevronRight } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";

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
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
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
      <p v-if="quickLinks.length === 0" class="text-center py-6 text-sm text-gray-400">No quick links available.</p>
    </div>
  </div>
</template>
