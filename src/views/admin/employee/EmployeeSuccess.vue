<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { Users, UserPlus, Plus, Check } from "lucide-vue-next";
import { UiButton, UiStat } from "@/components/ui";
import { useRouter } from "vue-router";
import { useEmployeeStore } from "@/stores/employee";

const router = useRouter();

const employeeStore = useEmployeeStore();
const { statistics, loadingStatistics } = storeToRefs(employeeStore);

onMounted(() => {
  employeeStore.fetchStatistics();
});

const goToEmployees = () => {
  router.push({ name: "admin.employees" });
};

const addAnotherEmployee = () => {
  router.push({ name: "admin.employees.create" });
};
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <div class="max-w-md mx-auto py-6 sm:py-12 space-y-4 ui-anim-fade-up">
      <!-- Success Card -->
      <div class="bg-ui-surface border border-ui-line rounded-ui-card px-6 py-8 sm:px-8 text-center">
        <div class="w-16 h-16 mx-auto rounded-full bg-ui-ok-soft flex items-center justify-center">
          <div class="w-11 h-11 rounded-full bg-ui-ok flex items-center justify-center">
            <Check class="w-6 h-6 text-white" stroke-width="3" />
          </div>
        </div>

        <h1 class="text-ui-h1 text-ui-ink mt-5">{{ $t("employees.success.title") }}</h1>
        <p class="text-ui-body text-ui-muted mt-2">
          {{ $t("employees.success.message") }}
        </p>

        <div class="flex flex-col gap-2.5 mt-7">
          <UiButton size="lg" block :icon-right="Users" @click="goToEmployees">
            {{ $t("employees.success.viewAll") }}
          </UiButton>
          <UiButton variant="secondary" size="lg" block :icon-right="Plus" @click="addAnotherEmployee">
            {{ $t("employees.success.addAnother") }}
          </UiButton>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 ui-stagger">
        <UiStat :label="$t('employees.success.totalEmployees')" :icon="Users" :value="statistics.total" :loading="loadingStatistics" />
        <UiStat :label="$t('employees.success.addedThisMonth')" :icon="UserPlus" :value="statistics.added_this_month" :loading="loadingStatistics" />
      </div>
    </div>
  </div>
</template>
