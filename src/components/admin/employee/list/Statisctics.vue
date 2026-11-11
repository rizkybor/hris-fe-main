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
import { UiStat } from "@/components/ui";

const employeeStore = useEmployeeStore();

onMounted(() => {
  employeeStore.fetchStatistics();
});

// Computed properties for statistics
const total = computed(() => employeeStore.statistics.total);
const addedThisMonth = computed(
  () => employeeStore.statistics.added_this_month,
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
    cols="grid-cols-2 lg:grid-cols-5"
  />
  <div v-else class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 ui-stagger">
    <UiStat
      label="Total Employees"
      :icon="Users"
      :value="total.toLocaleString()"
      :hint="`+${addedThisMonth.toLocaleString()} this month`"
      class="col-span-2 lg:col-span-1"
    />
    <UiStat
      label="Active Employees"
      :icon="UserCheck"
      :value="active.toLocaleString()"
      :hint="`${activeChange >= 0 ? '+' : ''}${activeChange} this week`"
    />
    <UiStat
      label="New Hires"
      :icon="UserPlus"
      :value="newEmployees.toLocaleString()"
      hint="This month"
    />
    <UiStat label="Average Salary" :icon="Trophy">
      <span v-if="isSalaryVisible">Rp {{ averageSalary.toLocaleString() }}</span>
      <span v-else class="tracking-widest">Rp ••••••</span>
      <template #hint>
        <button
          type="button"
          @click="toggleSalaryVisibility"
          class="inline-flex items-center gap-1 text-ui-accent hover:underline focus:outline-none focus-visible:shadow-ui-focus rounded"
          :title="isSalaryVisible ? 'Hide salary' : 'Show salary'"
          :aria-label="isSalaryVisible ? 'Hide salary' : 'Show salary'"
        >
          <Eye v-if="!isSalaryVisible" class="w-3.5 h-3.5" />
          <EyeOff v-else class="w-3.5 h-3.5" />
          Company average
        </button>
      </template>
    </UiStat>
    <UiStat
      label="On Leave"
      :icon="CalendarX"
      :value="onLeave.toLocaleString()"
      :tone="onLeave > 0 ? 'warn' : ''"
      :hint="`${onLeaveChange >= 0 ? '+' : ''}${onLeaveChange} from last week`"
    />
  </div>
</template>
