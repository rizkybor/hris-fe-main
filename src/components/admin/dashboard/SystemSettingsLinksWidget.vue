<script setup>
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { computed } from "vue";
import { ShieldCheck, UserCheck, ListChecks, DatabaseBackup, ChevronRight } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const allQuickLinks = [
  {
    to: { name: "admin.settings.roles" },
    icon: ShieldCheck,
    titleKey: "dashboard.quickLinks.roles",
    permission: "role-menu",
  },
  {
    to: { name: "admin.settings.staff-permissions" },
    icon: UserCheck,
    titleKey: "dashboard.quickLinks.staffPermissions",
    permission: "staff-permission-menu",
  },
  {
    to: { name: "admin.settings.dropdown-options" },
    icon: ListChecks,
    titleKey: "dashboard.quickLinks.dropdownOptions",
    permission: "option-menu",
  },
  {
    to: { name: "admin.settings.backup" },
    icon: DatabaseBackup,
    titleKey: "dashboard.quickLinks.backup",
    permission: "backup-list",
  },
];

const quickLinks = computed(() =>
  allQuickLinks
    .filter((link) => !link.permission || can(link.permission))
    .map((link) => ({ ...link, title: t(link.titleKey) }))
);
</script>

<template>
  <DashboardWidgetCard :title="$t('dashboard.widgets.systemSettings')" flush>
    <nav v-if="quickLinks.length" class="p-2 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-0.5">
      <RouterLink
        v-for="link in quickLinks"
        :key="link.titleKey"
        :to="link.to"
        class="group flex items-center gap-3 h-10 px-3 rounded-ui-control text-ui-small text-ui-text hover:bg-ui-hover hover:text-ui-ink transition-colors"
      >
        <component :is="link.icon" class="w-4 h-4 text-ui-faint group-hover:text-ui-ink shrink-0" />
        <span class="flex-1 truncate">{{ link.title }}</span>
        <ChevronRight class="w-3.5 h-3.5 text-ui-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </RouterLink>
    </nav>
    <p v-else class="text-ui-small text-ui-muted text-center py-6">{{ $t("dashboard.quickLinks.empty") }}</p>
  </DashboardWidgetCard>
</template>
