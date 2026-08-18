<script setup>
import { computed } from "vue";
import { Users, UsersRound, FolderKanban, Banknote, BarChart3 } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import Statistics from "./Statistics.vue";
import SearchSection from "./SearchSection.vue";
import ProjectsAtRisk from "./ProjectsAtRisk.vue";
import LatestEmployees from "./LatestEmployees.vue";
import LatestTeams from "./LatestTeams.vue";
import DashboardQuickLinks from "./DashboardQuickLinks.vue";
import StickyNotesWidget from "./StickyNotesWidget.vue";

const quickLinks = [
  { to: { name: "admin.employees" }, icon: Users, title: "Employees", permission: "employee-menu" },
  { to: { name: "admin.teams" }, icon: UsersRound, title: "Our Teams", permission: "team-menu" },
  { to: { name: "admin.projects" }, icon: FolderKanban, title: "Projects", permission: "project-menu" },
  { to: { name: "admin.payroll.dashboard" }, icon: Banknote, title: "Payroll", permission: "payroll-menu" },
  { to: { name: "admin.report.dashboard" }, icon: BarChart3, title: "Reports", permission: "report-menu" },
];

const canViewEmployees = computed(() => can("employee-list"));
const canViewTeams = computed(() => can("team-list"));
const canViewProjects = computed(() => can("project-list"));
</script>

<template>
  <div class="space-y-6">
    <StickyNotesWidget />
    <Statistics />
    <SearchSection />
    <ProjectsAtRisk v-if="canViewProjects" />
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div
        v-if="canViewEmployees || canViewTeams"
        class="grid grid-cols-1 gap-4 lg:col-span-2"
        :class="canViewEmployees && canViewTeams ? 'sm:grid-cols-2' : ''"
      >
        <LatestEmployees v-if="canViewEmployees" />
        <LatestTeams v-if="canViewTeams" />
      </div>
      <DashboardQuickLinks title="Company Overview" :links="quickLinks" class="lg:col-span-1" />
    </div>
  </div>
</template>
