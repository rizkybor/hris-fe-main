<script setup>
import { computed } from "vue";
import { Users, UsersRound, CalendarCheck, ClipboardList } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import Statistics from "./Statistics.vue";
import ProjectsAtRisk from "./ProjectsAtRisk.vue";
import LatestEmployees from "./LatestEmployees.vue";
import LatestTeams from "./LatestTeams.vue";
import DashboardQuickLinks from "./DashboardQuickLinks.vue";
import StickyNotesWidget from "./StickyNotesWidget.vue";

const quickLinks = [
  { to: { name: "admin.employees" }, icon: Users, title: "Employees", permission: "employee-menu" },
  { to: { name: "admin.teams" }, icon: UsersRound, title: "Our Teams", permission: "team-menu" },
  { to: { name: "admin.attendances" }, icon: CalendarCheck, title: "Attendance", permission: "attendance-menu" },
  {
    to: { name: "admin.leave-requests.dashboard" },
    icon: ClipboardList,
    title: "Leave Requests",
    permission: "leave-request-menu",
  },
];

const canViewEmployees = computed(() => can("employee-list"));
const canViewTeams = computed(() => can("team-list"));
const canViewProjects = computed(() => can("project-list"));
</script>

<template>
  <div class="space-y-6">
    <Statistics />
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div
        v-if="canViewEmployees || canViewTeams"
        class="grid grid-cols-1 gap-4 lg:col-span-2"
        :class="canViewEmployees && canViewTeams ? 'sm:grid-cols-2' : ''"
      >
        <LatestEmployees v-if="canViewEmployees" />
        <LatestTeams v-if="canViewTeams" />
      </div>
      <DashboardQuickLinks title="Operations" :links="quickLinks" class="lg:col-span-1" />
    </div>
    <ProjectsAtRisk v-if="canViewProjects" />
    <StickyNotesWidget />
  </div>
</template>
