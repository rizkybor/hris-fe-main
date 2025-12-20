<script setup lang="ts">
import { onMounted, computed } from "vue";
import {
  TrendingUpIcon,
  UsersIcon,
  CalendarCheckIcon,
  CheckSquareIcon,
  FolderIcon,
  StarIcon,
} from "lucide-vue-next";
import QuickActions from "./QuickActions.vue";
import { useDashboardStore } from "@/stores/dashboard";

const dashboardStore = useDashboardStore();

onMounted(() => {
  dashboardStore.fetchStatistics();
});

// Computed properties for statistics
const employees = computed(() => dashboardStore.statistics.employees);
const teams = computed(() => dashboardStore.statistics.teams);
const attendance = computed(() => dashboardStore.statistics.attendance);
const tasks = computed(() => dashboardStore.statistics.tasks);
const projects = computed(() => dashboardStore.statistics.projects);
const loading = computed(() => dashboardStore.loading);
</script>

<template>
  <!-- Stats Layout -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
    <!-- Our Employees Card (spans 2 rows on the left) -->
    <div
      class="main-card lg:row-span-2 rounded-[20px] border border-[#0B1042] relative overflow-hidden p-4 sm:p-5"
    >
      <div class="flex flex-col justify-center h-full relative z-10">
        <!-- Trending Badge -->
        <div class="flex items-center gap-2 mb-3">
          <div
            class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm"
          >
            <TrendingUpIcon class="w-3 h-3 text-white" />
            <span class="text-brand-white text-xs font-semibold"
              >+{{ employees.added_this_month }} this month</span
            >
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div>
            <p class="text-brand-white-90 text-sm font-medium">Our Employees</p>
            <p
              class="text-brand-white text-3xl sm:text-5xl font-extrabold leading-none my-4"
            >
              {{ loading ? '...' : employees.total.toLocaleString() }}
            </p>
            <p class="text-brand-white-80 text-base font-normal">
              Active team members
            </p>
          </div>
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-[20px] flex items-center justify-center"
          >
            <UsersIcon class="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
        </div>

        <!-- Additional Info -->
        <div class="flex items-center gap-3 mt-auto">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-brand-white-70 text-xs font-normal"
              >Active Status</span
            >
          </div>
          <div class="flex items-center gap-1">
            <StarIcon class="w-3 h-3 text-white opacity-70" />
            <span class="text-brand-white-70 text-xs font-normal"
              >Top Performers</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Row 1 Stats Cards -->
    <!-- Total Teams -->
    <div
      class="stats-card bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Total Teams</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ loading ? '...' : teams.total }}
          </p>
          <p class="text-success text-sm font-medium">+{{ teams.new_teams }} new teams</p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-[16px] flex items-center justify-center"
        >
          <UsersIcon class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        </div>
      </div>
    </div>

    <!-- Attendance Rate -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Attendance Rate</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ loading ? '...' : attendance.rate }}%
          </p>
          <p :class="attendance.change >= 0 ? 'text-success' : 'text-danger'" class="text-sm font-medium">
            {{ attendance.change >= 0 ? '+' : '' }}{{ attendance.change }}% from last week
          </p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-[16px] flex items-center justify-center"
        >
          <CalendarCheckIcon class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
        </div>
      </div>
    </div>

    <!-- Quick Actions Card (spans 2 rows on the right) -->
    <QuickActions />

    <!-- Row 2 Stats Cards -->
    <!-- Tasks Completed (below Total Employees) -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Tasks Completed</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ loading ? '...' : tasks.completed }}
          </p>
          <p :class="tasks.change >= 0 ? 'text-success' : 'text-danger'" class="text-sm font-medium">
            {{ tasks.change >= 0 ? '+' : '' }}{{ tasks.change }} from yesterday
          </p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-[16px] flex items-center justify-center"
        >
          <CheckSquareIcon class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        </div>
      </div>
    </div>

    <!-- Active Projects (below Attendance Rate) -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[20px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Active Projects</p>
          <p class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ loading ? '...' : projects.active }}
          </p>
          <p class="text-success text-sm font-medium">+{{ projects.new_projects }} new projects</p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-[16px] flex items-center justify-center"
        >
          <FolderIcon class="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
        </div>
      </div>
    </div>
  </div>
</template>
