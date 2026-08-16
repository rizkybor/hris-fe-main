<script setup lang="ts">
import { onMounted, computed } from "vue";
import {
  TrendingUpIcon,
  UsersIcon,
  CalendarCheckIcon,
  CheckSquareIcon,
  FolderIcon,
  StarIcon,
  BanknoteIcon,
} from "lucide-vue-next";
import QuickActions from "./QuickActions.vue";
import ProjectBudgetChart from "@/components/admin/project/list/BudgetChart.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useDashboardStore } from "@/stores/dashboard";
import { usePayrollStore } from "@/stores/payroll";
import { can } from "@/helpers/permissionHelper";
import { formatRupiah } from "@/utils/formatUtils";

const dashboardStore = useDashboardStore();
const payrollStore = usePayrollStore();

// Finance-only holders (no employee-create) with payroll access get a
// payroll highlight in place of the generic company-wide task metric.
const showPayrollHighlight = computed(
  () => !can("employee-create") && can("payroll-statistics")
);

// Same gate the Projects page itself uses for its stats, so only roles
// that can already see project data get the budget overview here too.
const showProjectBudget = computed(() => can("project-statistic"));

onMounted(() => {
  dashboardStore.fetchStatistics();
  if (showPayrollHighlight.value) {
    payrollStore.fetchStatistics();
  }
});

// Computed properties for statistics
const employees = computed(() => dashboardStore.statistics.employees);
const teams = computed(() => dashboardStore.statistics.teams);
const attendance = computed(() => dashboardStore.statistics.attendance);
const tasks = computed(() => dashboardStore.statistics.tasks);
const projects = computed(() => dashboardStore.statistics.projects);
const loading = computed(() => dashboardStore.loading);
const payrollStats = computed(() => payrollStore.statistics);
</script>

<template>
  <!-- Stats Layout -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
    <!-- Our Employees Card (spans 2 rows on the left) -->
    <div
      class="main-card lg:row-span-2 rounded-[14px] border border-[#0B1042] relative overflow-hidden p-4 sm:p-5"
    >
      <!-- Decorative glow orbs -->
      <div
        class="pointer-events-none absolute -top-10 -right-8 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-14 -left-6 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl"
      ></div>

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
            <Skeleton v-if="loading" dark width="100px" height="2.5rem" rounded="8px" class="my-4" />
            <p
              v-else
              class="text-brand-white text-3xl sm:text-5xl font-extrabold leading-none my-4"
            >
              {{ employees.total.toLocaleString() }}
            </p>
            <p class="text-brand-white-80 text-base font-normal">
              Active team members
            </p>
          </div>
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-[14px] flex items-center justify-center"
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
      class="stats-card bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Total Teams</p>
          <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
          <p v-else class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ teams.total }}
          </p>
          <p class="text-success text-sm font-medium">+{{ teams.new_teams }} new teams</p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <UsersIcon class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        </div>
      </div>
    </div>

    <!-- Attendance Rate -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Attendance Rate</p>
          <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
          <p v-else class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ attendance.rate }}%
          </p>
          <p :class="attendance.change >= 0 ? 'text-success' : 'text-danger'" class="text-sm font-medium">
            {{ attendance.change >= 0 ? '+' : '' }}{{ attendance.change }}% from last week
          </p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-[12px] flex items-center justify-center"
        >
          <CalendarCheckIcon class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
        </div>
      </div>
    </div>

    <!-- Quick Actions Card (spans 2 rows on the right) -->
    <QuickActions />

    <!-- Row 2 Stats Cards -->
    <!-- Payroll highlight for finance-oriented roles, Tasks Completed otherwise -->
    <div
      v-if="showPayrollHighlight"
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Payroll This Month</p>
          <Skeleton v-if="payrollStore.loadingStatistics" width="80px" height="1.75rem" rounded="6px" class="my-2" />
          <p v-else class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ formatRupiah(payrollStats.total_amount) }}
          </p>
          <p class="text-gray-500 text-sm font-medium">
            {{ payrollStats.pending_review || 0 }} pending review
          </p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
        >
          <BanknoteIcon class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        </div>
      </div>
    </div>

    <div
      v-else
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Tasks Completed</p>
          <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
          <p v-else class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ tasks.completed }}
          </p>
          <p :class="tasks.change >= 0 ? 'text-success' : 'text-danger'" class="text-sm font-medium">
            {{ tasks.change >= 0 ? '+' : '' }}{{ tasks.change }} from yesterday
          </p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-[12px] flex items-center justify-center"
        >
          <CheckSquareIcon class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        </div>
      </div>
    </div>

    <!-- Active Projects (below Attendance Rate) -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 p-4 sm:p-5"
    >
      <div class="flex items-center justify-between mb-2">
        <div>
          <p class="text-brand-dark text-sm font-medium">Active Projects</p>
          <Skeleton v-if="loading" width="50px" height="1.75rem" rounded="6px" class="my-2" />
          <p v-else class="text-brand-dark text-2xl sm:text-3xl font-extrabold leading-tight my-2">
            {{ projects.active }}
          </p>
          <p class="text-success text-sm font-medium">+{{ projects.new_projects }} new projects</p>
        </div>
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-[12px] flex items-center justify-center"
        >
          <FolderIcon class="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
        </div>
      </div>
      <div class="pt-2 border-t border-[#F1F1F1]">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-brand-light">Task Completion</span>
          <Skeleton v-if="loading" width="28px" height="12px" rounded="4px" />
          <span v-else class="text-brand-dark font-semibold">
            {{ `${projects.completion_rate ?? 0}%` }}
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div
            class="h-1.5 rounded-full bg-orange-500 transition-all duration-300"
            :style="{ width: `${loading ? 0 : (projects.completion_rate ?? 0)}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>

  <ProjectBudgetChart v-if="showProjectBudget" compact class="mb-6" />
</template>
