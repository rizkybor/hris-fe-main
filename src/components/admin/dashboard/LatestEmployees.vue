<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useEmployeeStore } from "@/stores/employee";
import { useRouter } from "vue-router";
import { getTimeAgo } from "@/utils/dateUtils";
import { getSkillLevelBadgeClass } from "@/utils/badgeUtils";
import { storeToRefs } from "pinia";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import Avatar from "@/components/common/Avatar.vue";

const employeeStore = useEmployeeStore();
const { employees, loading } = storeToRefs(employeeStore);
const { fetchEmployees } = employeeStore;

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
  <!-- Latest Employees -->
  <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-4 sm:p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-brand-dark text-base font-bold">Latest Employees</h3>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3">
        <Skeleton width="48px" height="48px" rounded="9999px" />
        <div class="flex-1 space-y-2">
          <Skeleton width="33%" height="14px" />
          <Skeleton width="50%" height="10px" />
        </div>
        <Skeleton width="70px" height="34px" rounded="10px" class="hidden sm:block" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!employees || employees.length === 0"
      class="text-center py-8"
    >
      <p class="text-gray-500 text-xs">No employees found</p>
    </div>

    <!-- Employee List -->
    <div v-else class="space-y-4">
      <div
        v-for="employee in employees"
        :key="employee.id"
        class="flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <Avatar
          :src="employee.user?.profile_photo"
          :alt="employee.user?.name"
          size="w-10 h-10 sm:w-12 sm:h-12"
          icon-size="w-4 h-4"
        />
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-brand-dark text-sm sm:text-base font-bold">
              {{ employee.user?.name || "Unknown" }}
            </p>
            <span
              v-if="employee.job_information?.skill_level"
              :class="
                getSkillLevelBadgeClass(employee.job_information.skill_level)
              "
              class="px-1.5 py-0.5 rounded-md text-[11px] font-semibold capitalize"
            >
              {{ employee.job_information.skill_level }}
            </span>
          </div>
          <p class="text-brand-dark text-xs font-normal mt-1">
            {{ employee.job_information?.job_title || "N/A" }} •
            {{ getTimeAgo(employee.created_at) }}
          </p>
        </div>
        <button
          @click="goToEmployeeDetail(employee.id)"
          class="btn-details w-full sm:w-auto border border-[#DCDEDD] rounded-xl hover:ring-2 hover:ring-[#0C51D9] hover:text-[#0C51D9] transition-all duration-300 py-2 sm:py-2.5 px-3 sm:px-4 flex items-center justify-center"
        >
          <span class="text-brand-dark text-xs sm:text-sm font-medium">Details</span>
        </button>
      </div>
    </div>
  </div>
</template>
