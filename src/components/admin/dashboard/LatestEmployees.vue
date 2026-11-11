<script setup lang="ts">
import DashboardWidgetCard from "./DashboardWidgetCard.vue";
import { UiBadge, UiEmpty } from "@/components/ui";
import SkeletonList from "@/components/common/skeleton/SkeletonList.vue";
import { onMounted, computed } from "vue";
import { useEmployeeStore } from "@/stores/employee";
import { useRouter } from "vue-router";
import { can } from "@/helpers/permissionHelper";
import { getTimeAgo } from "@/utils/dateUtils";
import { storeToRefs } from "pinia";
import Avatar from "@/components/common/Avatar.vue";

const employeeStore = useEmployeeStore();
const { loading } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

// employeeStore is a plain (untyped) JS store, so its `employees` state
// infers as `never[]` when consumed from this <script setup lang="ts">
// block -- cast to `any[]` here rather than typing the store itself.
const employees = computed(() => employeeStore.employees as any[]);

const router = useRouter();

onMounted(() => {
  fetchEmployees({
    limit: 5,
  });
});

const goToEmployeeDetail = (id: number) => {
  router.push({ name: "admin.employees.detail", params: { id } });
};
</script>

<template>
  <DashboardWidgetCard :title="$t('dashboard.widgets.latestEmployees')" :to="can('employee-menu') ? { name: 'admin.employees' } : null" flush>
    <SkeletonList v-if="loading" :rows="5" class="p-3" />
    <UiEmpty v-else-if="!employees || employees.length === 0" :title="$t('dashboard.latestEmployees.empty')" compact />
    <ul v-else class="divide-y divide-ui-line">
      <li v-for="employee in employees" :key="employee.id">
        <button
          type="button"
          @click="goToEmployeeDetail(employee.id)"
          class="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-ui-hover transition-colors"
        >
          <Avatar :src="employee.user?.profile_photo" :alt="employee.user?.name" size="w-9 h-9" icon-size="w-4 h-4" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <p class="text-ui-body font-medium text-ui-ink truncate">{{ employee.user?.name || $t("dashboard.latestEmployees.unknown") }}</p>
              <UiBadge v-if="employee.job_information?.skill_level" tone="outline" class="capitalize shrink-0">{{ employee.job_information.skill_level }}</UiBadge>
            </div>
            <p class="text-ui-cap text-ui-muted mt-0.5 truncate">{{ employee.job_information?.job_title || $t("dashboard.latestEmployees.noJobTitle") }}</p>
          </div>
          <span class="text-ui-cap text-ui-faint shrink-0">{{ getTimeAgo(employee.created_at) }}</span>
        </button>
      </li>
    </ul>
  </DashboardWidgetCard>
</template>
