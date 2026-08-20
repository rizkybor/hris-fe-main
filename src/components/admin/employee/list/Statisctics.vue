<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  TrendingUp,
  Users,
  UserPlus,
  Star,
  UserCheck,
  CalendarX,
  Trophy,
  Eye,
  EyeOff,
} from "lucide-vue-next";
import { useEmployeeStore } from "@/stores/employee";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";

const employeeStore = useEmployeeStore();

onMounted(() => {
  employeeStore.fetchStatistics();
});

// Computed properties for statistics
const total = computed(() => employeeStore.statistics.total);
const addedThisMonth = computed(
  () => employeeStore.statistics.added_this_month
);
const active = computed(() => employeeStore.statistics.active);
const activeChange = computed(() => employeeStore.statistics.active_change);
const onLeave = computed(() => employeeStore.statistics.on_leave);
const onLeaveChange = computed(() => employeeStore.statistics.on_leave_change);
const averageSalary = computed(() => employeeStore.statistics.average_salary);
const newEmployees = computed(() => employeeStore.statistics.new_employees);
const loading = computed(() => employeeStore.loadingStatistics);

// Hidden by default -- salary is sensitive, revealed only on demand.
const isSalaryVisible = ref(false);
const toggleSalaryVisibility = () => {
  isSalaryVisible.value = !isSalaryVisible.value;
};
</script>

<template>
  <!-- Stats Layout -->
  <SkeletonStatCards
    v-if="loading"
    :count="5"
    cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    class="mb-5"
  />
  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
    <!-- Total Employees Card (spans 2 rows on the left) -->
    <div
      class="lg:row-span-2 rounded-[14px] border border-[#0B1042] relative overflow-hidden main-card p-4"
    >
      <div class="flex flex-col justify-center h-full relative z-10">
        <!-- Trending Badge -->
        <div class="flex items-center gap-1.5 mb-2.5">
          <div
            class="flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full backdrop-blur-sm"
          >
            <TrendingUp class="w-3 h-3 text-white" />
            <span class="text-brand-white text-xs font-semibold"
              >+{{ addedThisMonth.toLocaleString() }} this month</span
            >
          </div>
        </div>

        <div class="flex items-center justify-between mb-3.5">
          <div>
            <p class="text-brand-white-90 text-sm font-medium">
              Total Employees
            </p>
            <p
              class="text-brand-white text-3xl font-extrabold leading-none my-3.5"
            >
              {{ loading ? "..." : total.toLocaleString() }}
            </p>
            <p class="text-brand-white-80 text-sm font-normal">
              Company workforce
            </p>
          </div>
          <div
            class="w-9 h-9 bg-white/20 rounded-[14px] flex items-center justify-center"
          >
            <Users class="w-8 h-8 text-white" />
          </div>
        </div>

        <!-- Additional Info -->
        <div class="flex items-center gap-2.5 mt-auto">
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-brand-white-70 text-xs font-normal"
              >All Departments</span
            >
          </div>
          <div class="flex items-center gap-1">
            <Star class="w-3 h-3 text-white opacity-70" />
            <span class="text-brand-white-70 text-xs font-normal"
              >Growing Team</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Row 1 Stats Cards -->
    <!-- Active Employees -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Active Employees</p>
          <p class="text-brand-dark text-xl font-extrabold leading-none my-1.5">
            {{ loading ? "..." : active.toLocaleString() }}
          </p>
          <p
            :class="activeChange >= 0 ? 'text-success' : 'text-danger'"
            class="text-sm font-medium"
          >
            {{ activeChange >= 0 ? "+" : "" }}{{ activeChange }} this week
          </p>
        </div>
        <div
          class="w-10 h-10 bg-green-50 rounded-[12px] flex items-center justify-center"
        >
          <UserCheck class="w-6 h-6 text-green-600" />
        </div>
      </div>
    </div>

    <!-- New Hires -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">New Hires</p>
          <p class="text-brand-dark text-xl font-extrabold leading-none my-1.5">
            {{ loading ? "..." : newEmployees.toLocaleString() }}
          </p>
          <p class="text-success text-sm font-medium">This month</p>
        </div>
        <div
          class="w-10 h-10 bg-blue-50 rounded-[12px] flex items-center justify-center"
        >
          <UserPlus class="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>

    <!-- Row 2 Stats Cards -->
    <!-- Average Salary -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">Average Salary</p>
          <p
            v-if="isSalaryVisible"
            class="text-brand-dark text-xl font-extrabold leading-none my-1.5"
          >
            {{ loading ? "..." : `Rp ${averageSalary.toLocaleString()}` }}
          </p>
          <p v-else class="text-brand-dark text-xl font-extrabold leading-none my-1.5 tracking-widest">
            Rp ••••••••
          </p>
          <p class="text-success text-sm font-medium">Company average</p>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            @click="toggleSalaryVisibility"
            class="w-7 h-7 rounded-full flex items-center justify-center text-yellow-600 hover:bg-yellow-100 transition-colors shrink-0"
            :title="isSalaryVisible ? 'Hide salary' : 'Show salary'"
          >
            <Eye v-if="!isSalaryVisible" class="w-3.5 h-3.5" />
            <EyeOff v-else class="w-3.5 h-3.5" />
          </button>
          <div
            class="w-10 h-10 bg-yellow-50 rounded-[12px] flex items-center justify-center shrink-0"
          >
            <Trophy class="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- On Leave -->
    <div
      class="bg-white border border-[#DCDEDD] rounded-[14px] hover:border-[#0C51D9] hover:border-2 transition-all duration-300 p-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-brand-dark text-sm font-medium">On Leave</p>
          <p class="text-brand-dark text-xl font-extrabold leading-none my-1.5">
            {{ loading ? "..." : onLeave.toLocaleString() }}
          </p>
          <p
            :class="onLeaveChange >= 0 ? 'text-danger' : 'text-success'"
            class="text-sm font-medium"
          >
            {{ onLeaveChange >= 0 ? "+" : "" }}{{ onLeaveChange }} from last
            week
          </p>
        </div>
        <div
          class="w-10 h-10 bg-red-50 rounded-[12px] flex items-center justify-center"
        >
          <CalendarX class="w-6 h-6 text-red-600" />
        </div>
      </div>
    </div>
  </div>
</template>
