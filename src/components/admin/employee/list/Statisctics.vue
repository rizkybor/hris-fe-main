<script setup lang="ts">
import { ref, computed } from "vue";
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
import { useStaleFetch } from "@/composables/useStaleFetch";

const employeeStore = useEmployeeStore();

// Cached between visits; refreshed quietly (its own flags, not the store's
// loadingStatistics, which the detail page also toggles).
const { loading } = useStaleFetch(() => employeeStore.fetchStatistics(), {
  key: () => "adm-employees:stats",
  hasData: () => employeeStore.statisticsLoaded,
  maxAge: 60_000,
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
      :label="$t('employees.stats.totalEmployees')"
      :icon="Users"
      :value="total.toLocaleString()"
      :hint="$t('employees.stats.addedThisMonth', { n: addedThisMonth.toLocaleString() })"
      class="col-span-2 lg:col-span-1"
    />
    <UiStat
      :label="$t('employees.stats.activeEmployees')"
      :icon="UserCheck"
      :value="active.toLocaleString()"
      :hint="$t('employees.stats.thisWeek', { n: `${activeChange >= 0 ? '+' : ''}${activeChange}` })"
    />
    <UiStat
      :label="$t('employees.stats.newHires')"
      :icon="UserPlus"
      :value="newEmployees.toLocaleString()"
      :hint="$t('employees.stats.thisMonth')"
    />
    <UiStat :label="$t('employees.stats.averageSalary')" :icon="Trophy">
      <span v-if="isSalaryVisible">Rp {{ averageSalary.toLocaleString() }}</span>
      <span v-else class="tracking-widest">Rp ••••••</span>
      <template #hint>
        <button
          type="button"
          @click="toggleSalaryVisibility"
          class="inline-flex items-center gap-1 text-ui-accent hover:underline focus:outline-none focus-visible:shadow-ui-focus rounded"
          :title="isSalaryVisible ? $t('employees.stats.hideSalary') : $t('employees.stats.showSalary')"
          :aria-label="isSalaryVisible ? $t('employees.stats.hideSalary') : $t('employees.stats.showSalary')"
        >
          <Eye v-if="!isSalaryVisible" class="w-3.5 h-3.5" />
          <EyeOff v-else class="w-3.5 h-3.5" />
          {{ $t("employees.stats.companyAverage") }}
        </button>
      </template>
    </UiStat>
    <UiStat
      :label="$t('employees.stats.onLeave')"
      :icon="CalendarX"
      :value="onLeave.toLocaleString()"
      :tone="onLeave > 0 ? 'warn' : ''"
      :hint="$t('employees.stats.fromLastWeek', { n: `${onLeaveChange >= 0 ? '+' : ''}${onLeaveChange}` })"
    />
  </div>
</template>
